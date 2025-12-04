// SceneCanvas.jsx
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { Suspense, useState, useCallback } from 'react';
import BitmapTextProvider from '../bitmapText/bitmapTextProvider';
import Keyboard from '../../packages/KeyBoard';
import Deck from '../../packages/Deck';
import { store } from '../xr/xrStore';

function SceneRoot() {
  const [octaveOffset, setOctaveOffset] = useState(0); // -2..+2 relative to baseOctave (C4–B4)
  const [lastNote, setLastNote] = useState(null);

  const handleOctaveChange = useCallback((offset) => {
    setOctaveOffset(offset);
    console.log('Octave offset changed:', offset);
  }, []);

  const handleKeyPressed = useCallback((midi, label) => {
    setLastNote({ midi, label, octaveOffset });
    console.log(`Note played: ${label} (MIDI ${midi}), octaveOffset=${octaveOffset}`);
  }, [octaveOffset]);

  return (
    <>
      <ambientLight intensity={1.5} />
     

      <Keyboard
        position={[0, 0, -0.5]}
        rotation={[Math.PI/2, 0, 0]}
        onKeyPressed={handleKeyPressed}
        onOctaveChange={handleOctaveChange}
      />

      <Deck radius={0.45} height={0} sensitivity={2.0} />
    </>
  );
}

export default function SceneCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 0], fov: 60 }}>
      <BitmapTextProvider fontFamily='"futura-100", sans-serif' useMipmaps={false} toneMapped={false}>
        <color attach="background" args={['#050509']} />
        <XR store={store}>
          <Suspense fallback={null}>
            <SceneRoot />
          </Suspense>
        </XR>
      </BitmapTextProvider>
    </Canvas>
  );
}
