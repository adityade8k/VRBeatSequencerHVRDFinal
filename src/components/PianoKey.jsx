// PianoKey.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PianoKey({
  // callbacks
  onPressed,
  onPressDown,
  onPressUp,
  // transforms
  position = [0, 1, -0.6],
  rotation = [0, Math.PI/2, 0],
  scale = [1, 1, 1],
  // look & feel
  length = 0.16,      // along X
  width = 0.04,       // along Y
  depth = 0.08,       // visual hint (Z)
  hingeEnd = 'back',  // 'back' or 'front' visual orientation only
  baseColor = '#222222',
  keyColor = '#ffffff',
  highlightColor = '#ffd400',
  gap = 0.008,        // travel distance
  speed = 14,
  activationThreshold = 0.9,
}) {
  const baseRef = useRef();
  const keyRef = useRef();
  const baseMatRef = useRef();
  const keyMatRef = useRef();

  const [isPressed, setIsPressed] = useState(false);
  const [armed, setArmed] = useState(false);
  const committedPressRef = useRef(false);

  // initial & bottom positions along local Y
  const initialY = useRef(gap);
  const bottomY = useRef(0.0005);

  // colors
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

  // hinge visual orientation (Z offset only visual)
  const hingeSign = hingeEnd === 'back' ? -1 : 1;
  const keyZOffset = (depth * 0.5 - 0.001) * hingeSign;

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
      {/* Base plate */}
      <mesh
        ref={baseRef}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <boxGeometry args={[length, width * 0.4, depth]} />
        <meshStandardMaterial
          ref={baseMatRef}
          color={baseColor}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Piano key – moves along local Y like a hinged plate */}
      <mesh
        ref={keyRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, initialY.current, keyZOffset]}
        castShadow
      >
        <boxGeometry args={[length * 0.95, width * 0.6, depth * 0.9]} />
        <meshStandardMaterial
          ref={keyMatRef}
          color={keyColor}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
