// SceneCanvas.jsx
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { Suspense } from 'react';
import * as THREE from 'three';

import PianoKey from '../PianoKey';        // new component inspired by PressablePlanesButton [file:11]
import { store } from '../xr/xrStore';          // uses CustomHand for both hands [file:12][file:13]

function SceneRoot() {
  const handleKeyPress = () => {
    console.log('Piano key pressed');
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[1.5, 2, 1]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Single piano key, replacing PressablePlanesButton wrapper */}
      <PianoKey
        position={[0, 0.8, -0.7]}
        onPressed={handleKeyPress}
      />
    </>
  );
}

export default function SceneCanvas() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 0], fov: 60 }}
    >
      <color attach="background" args={['#050509']} />
      <XR store={store}>
        {/* <Controllers /> */}
        {/* <Hands /> CustomHand via xrStore [file:12][file:13] */}
        <Suspense fallback={null}>
          <SceneRoot />
        </Suspense>
      </XR>
    </Canvas>
  );
}
