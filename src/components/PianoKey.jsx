// PianoKey.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import BitmapText from './bitmapText'; // path to your BitmapText index.jsx [file:15]
import { useDisposable } from '../hooks/useDisposable';

// Disposable geometries


export default function PianoKey({
  // callbacks
  onPressed,
  onPressDown,
  onPressUp,
  // transforms
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  // look & feel
  length = 0.16,      // along Z
  width = 0.04,       // along X
  thickness = 0.01,
  keyThickness = 0.005,
  baseColor = '#fdb689',
  keyColor = '#e35f6d',
  highlightColor = '#fdae02',
  gap = 0.002,
  speed = 14,
  activationThreshold = 0.9,
  // label
  label,
  labelColor = '#000000',
}) {
  const baseRef = useRef();
  const keyRef = useRef();
  const baseMatRef = useRef();
  const keyMatRef = useRef();

  const baseGeo = useDisposable(
    () => new THREE.BoxGeometry(width, thickness, length),
    [width, thickness, length]
  );

  const keyGeo = useDisposable(
    () => new THREE.BoxGeometry(width * 0.95, keyThickness, length * 0.95),
    [width, keyThickness, length]
  );

  // Disposable materials
  const baseMat = useDisposable(
    () => new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.1,
      roughness: 0.8,
    }),
    [baseColor]
  );

  const keyMat = useDisposable(
    () => new THREE.MeshStandardMaterial({
      color: keyColor,
      metalness: 0.2,
      roughness: 0.3,
    }),
    [keyColor]
  );

  const [isPressed, setIsPressed] = useState(false);
  const [armed, setArmed] = useState(false);
  const committedPressRef = useRef(false);

  const initialY = useRef(thickness * 0.5 + keyThickness * 0.5 + gap);
  const bottomY = useRef(thickness * 0.5 + keyThickness * 0.5);

  const cKeyStart = useMemo(() => new THREE.Color(keyColor), [keyColor]);
  const cKeyTarget = useMemo(() => new THREE.Color(highlightColor), [highlightColor]);
  const cBaseDefault = useMemo(() => new THREE.Color(baseColor), [baseColor]);

  useEffect(() => {
    if (keyRef.current) {
      keyRef.current.position.y = initialY.current;
    }
  }, []);

  useEffect(() => {
    const mat = baseMatRef.current;
    if (!mat) return;
    mat.color.copy(cBaseDefault);
  }, [cBaseDefault]);

  useFrame((_, dt) => {
    const key = keyRef.current;
    const keyMat = keyMatRef.current;
    if (!key || !keyMat) return;

    const from = key.position.y;
    const target = isPressed ? bottomY.current : initialY.current;
    const k = 1 - Math.exp(-speed * dt);
    const next = THREE.MathUtils.lerp(from, target, k);
    key.position.y = next;

    const travel = Math.max(1e-6, initialY.current - bottomY.current);
    const t = THREE.MathUtils.clamp((initialY.current - next) / travel, 0, 1);
    keyMat.color.copy(cKeyStart).lerp(cKeyTarget, t);

    const nearBottom = Math.abs(next - bottomY.current) < 0.0008;
    const activated = nearBottom && t >= activationThreshold;

    if (isPressed && activated && !armed) {
      setArmed(true);
      committedPressRef.current = true;
      onPressed?.();
    }

    if (!isPressed && armed) {
      setArmed(false);
    }
  });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
    committedPressRef.current = false;
    setIsPressed(true);
    onPressDown?.();
  };

  const handlePointerUp = (e) => {
    e.stopPropagation();
    e.target.releasePointerCapture?.(e.pointerId);
    setIsPressed(false);
    onPressUp?.();
    committedPressRef.current = false;
  };

  const handlePointerCancel = handlePointerUp;
  const handlePointerOut = handlePointerUp;

  const labelYOffset = keyThickness * 0.5 + 0.001;

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerOut}
      onPointerCancel={handlePointerCancel}
    >
      {/* Base on XZ */}
      <mesh ref={baseRef} receiveShadow geometry={baseGeo} material={baseMat}>
        <boxGeometry args={[width, thickness, length]} />
        <meshStandardMaterial
          ref={baseMatRef}
          color={baseColor}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Moving key + label */}
      <mesh ref={keyRef} castShadow geometry={keyGeo} material={keyMat}>
        <boxGeometry args={[width * 0.95, keyThickness, length * 0.95]} />
        <meshStandardMaterial
          ref={keyMatRef}
          color={keyColor}
          metalness={0.2}
          roughness={0.3}
        />

        {label && (
          <BitmapText
            text={label}
            position={[0, labelYOffset, labelYOffset * 15]}   // just above the key top
            rotation={[Math.PI / 2, 0, 0]}        // face the camera like other UI text [file:15]
            scale={[0.02, 0.02, 0.02]}        // adjust to fit key size
            color={labelColor}
            align="center"
            anchorY="middle"
            maxWidth={length * 0.9 / 0.02}    // roughly fit within key length
            quadWidth={1}
            quadHeight={1}
          />
        )}
      </mesh>
    </group>
  );
}
