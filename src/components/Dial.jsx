// components/Dial.jsx
import { useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDisposable } from '../hooks/useDisposable.js';
import BitmapText from './bitmapText';

export default function Dial({
  // transform
  position = [0, 1, -0.6],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],

  // value space
  min = 0,
  max = 1,
  step = 0.01,

  // interaction
  sensitivity = 1.0,
  optimizeDelta = 0.0001,

  // dial visuals
  radius = 0.03,
  baseThickness = 0.01,
  knobThickness = 0.01,
  segments = 32,
  minAngle = -Math.PI * 0.75,
  maxAngle = Math.PI * 0.75,
  wrap = false,
  baseColor = '#fdb689',
  knobColor = '#9e9cfe',

  // label plane + text
  labelOffset = [0, 0, -0.07],
  labelSize = [0.06, 0.06],
  labelColor = '#fc837c',
  labelTextColor = '#000000',

  // NEW: static name displayed on the plane
  name,

  // external control
  value: controlledValue,
  onChange,
}) {
  const [internalValue, setInternalValue] = useState(
    typeof controlledValue === 'number' ? controlledValue : min
  );
  const isControlled = typeof controlledValue === 'number';
  const value = isControlled ? controlledValue : internalValue;

  const groupRef = useRef();
  const knobRef = useRef();
  const tmpVec = useRef(new THREE.Vector3());

  const [minV, maxV] = useMemo(() => [min, max], [min, max]);
  const spanV = maxV - minV || 1;
  const spanA = maxAngle - minAngle || 1;

  const clampV = (x) => Math.min(maxV, Math.max(minV, x));

  const quantize = (v) => {
    if (step <= 0) return v;
    const steps = Math.round((v - minV) / step);
    return minV + steps * step;
  };

  const formatValue = (v) => {
    const decimals = step >= 1 ? 0 : Math.min(4, Math.max(0, -Math.log10(step)));
    return v.toFixed(decimals);
  };

  const wrapA = (a) => {
    if (!wrap) return Math.min(maxAngle, Math.max(minAngle, a));
    let n = a - minAngle;
    n = ((n % spanA) + spanA) % spanA;
    return minAngle + n;
  };

  const v2a = (v) => {
    const t = (v - minV) / spanV;
    return wrapA(minAngle + t * spanA);
  };

  const a2v = (a) => {
    const aa = wrapA(a);
    const t = (aa - minAngle) / spanA;
    const raw = minV + t * spanV;
    if (!wrap) return clampV(raw);
    return raw;
  };

  const baseGeo = useDisposable(
    () => new THREE.CylinderGeometry(radius * 1.15, radius * 1.15, baseThickness, segments),
    [radius, baseThickness, segments]
  );
  const knobGeo = useDisposable(
    () => new THREE.CylinderGeometry(radius, radius, knobThickness, segments),
    [radius, knobThickness, segments]
  );
  const labelGeo = useDisposable(
    () => new THREE.PlaneGeometry(labelSize[0], labelSize[1]),
    [labelSize[0], labelSize[1]]
  );

  const isActive = useRef(false);
  const startAngle = useRef(0);
  const startPointer = useRef(0);

  const localAngleFromWorldPoint = (worldPoint) => {
    const v = tmpVec.current.copy(worldPoint);
    groupRef.current?.worldToLocal(v);
    return -Math.atan2(v.x, v.z);
  };

  const shortestAngularDelta = (to, from) => {
    let d = to - from;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return d;
  };

  const handleChangeValue = (nextAngle) => {
    const rawV = a2v(nextAngle);
    const amplified = minV + (rawV - minV) * sensitivity;
    const clamped = clampV(amplified);
    const stepped = quantize(clamped);

    if (Math.abs(stepped - value) < optimizeDelta) return;

    if (!isControlled) setInternalValue(stepped);
    onChange?.(stepped);
  };

  const onDown = (e) => {
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);

    isActive.current = true;

    const current = knobRef.current?.rotation.y ?? v2a(value);
    startAngle.current = wrapA(current);
    startPointer.current = localAngleFromWorldPoint(e.point);
  };

  const onUpOrOut = (e) => {
    e.stopPropagation();
    e.target?.releasePointerCapture?.(e.pointerId);
    isActive.current = false;
  };

  const onMove = (e) => {
    if (!isActive.current) return;
    e.stopPropagation();

    const curPointer = localAngleFromWorldPoint(e.point);
    const dA = shortestAngularDelta(curPointer, startPointer.current);
    const newAngle = wrapA(startAngle.current - dA);

    if (knobRef.current) knobRef.current.rotation.y = newAngle;
    handleChangeValue(newAngle);
  };

  const labelText = formatValue(value);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUpOrOut}
      onPointerOut={onUpOrOut}
      onPointerCancel={onUpOrOut}
    >
      {/* Flat base on XZ, stationary */}
      <mesh
        geometry={baseGeo}
        rotation={[0, 0, 0]}
        position={[0, baseThickness * 0.5, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={baseColor} />
      </mesh>

      {/* Flat knob on XZ, rotates around Y */}
      <mesh
        ref={knobRef}
        geometry={knobGeo}
        rotation={[0, v2a(value), 0]}
        position={[0, baseThickness + knobThickness * 0.5, 0]}
        castShadow
      >
        <meshStandardMaterial color={knobColor} />
      </mesh>

      {/* Label plane on XZ, facing +Y, next to dial */}
      <group position={labelOffset}>
        <mesh
          geometry={labelGeo}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color={labelColor} />
        </mesh>

        {/* Value text (bottom) */}
        <BitmapText
          text={labelText}
          position={[-0.025, 0.001, 0.015]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[0.02, 0.02, 0.02]}
          color={labelTextColor}
          align="left"
          anchorY="middle"
          maxWidth={labelSize[0] / 0.02}
          quadWidth={1}
          quadHeight={1}
          letterSpacing={-0.4}
        />

        {/* Name text (top), if provided */}
        {name && (
          <BitmapText
            text={name}
            position={[-0.03, 0.001, -0.02]}      // opposite side on the plane
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.012, 0.012, 0.012]}
            color={labelTextColor}
            align="left"
            anchorY="middle"
            maxWidth={labelSize[0] / 0.018}
            quadWidth={1}
            quadHeight={1}
            letterSpacing={-0.4}
          />
        )}
      </group>
    </group>
  );
}
