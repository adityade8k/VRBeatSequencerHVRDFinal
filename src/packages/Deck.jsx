// packages/Deck.jsx
import { forwardRef, useRef } from 'react';
import Button from '../components/Button';

const Deck = forwardRef(function Deck(
  {
    // root transform
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],

    // deck layout
    radius = 0.45,
    rotateStep = Math.PI / 3,
  },
  ref
) {
  const localRef = useRef();
  const rootRef = ref ?? localRef;
  const ringRef = useRef();

  const rotateLeft = () => {
    if (!ringRef.current) return;
    ringRef.current.rotation.y += rotateStep;
  };

  const rotateRight = () => {
    if (!ringRef.current) return;
    ringRef.current.rotation.y -= rotateStep;
  };

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={scale}>
      {/* Rotating ring of panels (all positions relative to deck root) */}
      <group ref={ringRef}>
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

      {/* Stationary arrow buttons at the deck's origin */}
      <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <Button
          position={[0.22, 0, -0.0120]}
          label="Prev Panel"
          onPressed={rotateLeft}
        />
        <Button
          position={[0.22, 0, -0.060]}
          label="Next Panel"
          onPressed={rotateRight}
        />
      </group>
    </group>
  );
});

export default Deck;
