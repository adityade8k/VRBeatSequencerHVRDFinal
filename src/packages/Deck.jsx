// packages/Deck.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXRStore } from '@react-three/xr';

export default function Deck({
  radius = 0.4,
  height = 0,
  sensitivity = 1.8,
}) {
  const groupRef = useRef();
  const xrStore = useXRStore(); // provided by <XR store={store}>

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g || !xrStore) return;

    const state = xrStore.getState?.();
    if (!state || !state.session || !Array.isArray(state.inputSources)) return;

    const right = state.inputSources.find(
      (s) => s.handedness === 'right' && s.inputSource?.gamepad
    );
    const gamepad = right?.inputSource?.gamepad;
    if (!gamepad) return;

    const axes = gamepad.axes || [];
    const x = axes[2] ?? 0;

    if (Math.abs(x) < 0.05) return;

    g.rotation.y -= x * sensitivity * dt;
  });

  return (
    <group ref={groupRef} position={[0, height, 0]}>
      <mesh position={[0, 0, -radius]}>
        <planeGeometry args={[0.35, 0.12]} />
        <meshStandardMaterial color="#4f46e5" />
      </mesh>

      <mesh
        position={[
          radius * Math.cos((2 * Math.PI) / 3),
          0,
          -radius * Math.sin((2 * Math.PI) / 3),
        ]}
        rotation={[0, (2 * Math.PI) / 3, 0]}
      >
        <planeGeometry args={[0.35, 0.12]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>

      <mesh
        position={[
          radius * Math.cos((-2 * Math.PI) / 3),
          0,
          -radius * Math.sin((-2 * Math.PI) / 3),
        ]}
        rotation={[0, (-2 * Math.PI) / 3, 0]}
      >
        <planeGeometry args={[0.35, 0.12]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </group>
  );
}
