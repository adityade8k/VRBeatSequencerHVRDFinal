// Button.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import BitmapText from './bitmapText';

export default function Button({
  // callbacks
  onPressed,
  onPressDown,
  onPressUp,
  // transforms
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  // look & feel – tuned for a small square button
  length = 0.04,       // along Z
  width = 0.04,        // along X
  thickness = 0.01,
  keyThickness = 0.005,
  baseColor = '#fdb689',
  keyColor = '#38bdf8',
  highlightColor = '#facc15',
  gap = 0.002,
  speed = 14,
  activationThreshold = 0.5,
  // label
  label,
  labelColor = '#000000',
  letterSpacing= -0.4,
  fontScale = 0.01
}) {
  const baseRef = useRef();
  const keyRef = useRef();
  const baseMatRef = useRef();
  const keyMatRef = useRef();

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

  const labelYOffset = keyThickness * 0.5 + 0.002;

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
      <mesh ref={baseRef} receiveShadow>
        <boxGeometry args={[width, thickness, length]} />
        <meshStandardMaterial
          ref={baseMatRef}
          color={baseColor}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Moving key + label */}
      <mesh ref={keyRef} castShadow>
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
            position={[-0.02, labelYOffset, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[fontScale, fontScale, fontScale]}
            color={labelColor}
            align="left"
            anchorY="middle"
            maxWidth={length * 0.9 / 0.02}
            quadWidth={1}
            quadHeight={1}
            letterSpacing={letterSpacing}   
            lineSpacing={2.0}
          />
        )}
      </mesh>
    </group>
  );
}
