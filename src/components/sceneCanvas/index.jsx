// SceneCanvas.jsx
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { Suspense, useState, useCallback } from 'react';
import BitmapTextProvider from '../bitmapText/bitmapTextProvider';
import Keyboard from '../../packages/KeyBoard';
import Deck from '../../packages/Deck';
import { store } from '../xr/xrStore';
import { useToneJS } from '../../hooks/useToneJS';
import * as Tone from 'tone';

function SceneRoot() {
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [lastNote, setLastNote] = useState(null);

  const [currentPanel, setCurrentPanel] = useState(0); // panel 0 in front by default
  const totalPanels = 3;

  // ADSR + duration/gain state
  const [currentAdsr, setCurrentAdsr] = useState({
    attack: 0.02,
    decay: 0.03,
    sustain: 0.8,
    release: 0.03,
    duration: 0.14,
    gain: 1,
  });

  // instruments presets
  const [instruments, setInstruments] = useState([]);

  // wave type state
  const [waveType, setWaveType] = useState('sine'); // 'sine' | 'square' | 'triangle' | 'sawtooth'

  const { playNote } = useToneJS({
    waveType,
    adsr: currentAdsr,
  });

   const handleOctaveChange = useCallback((offset) => {
    setOctaveOffset(offset);
    console.log('Octave offset changed:', offset);
  }, []);

  const handleKeyPressed = useCallback(
    (midi, label) => {
      setLastNote({ midi, label, octaveOffset });
      console.log(`Note played: ${label} (MIDI ${midi}), octaveOffset=${octaveOffset}`);

      // convert MIDI + octave offset to frequency (or note string)
      const midiWithOffset = midi + octaveOffset * 12;
      const freq = Tone.Frequency(midiWithOffset, 'midi').toFrequency();

      // use your hook to play the note
      playNote(freq);
    },
    [octaveOffset, playNote]
  );

  // panel change handlers
  const handlePrevPanel = useCallback(() => {
    setCurrentPanel((prev) => {
      const next = Math.max(prev - 1, 0);
      console.log('Current panel:', next);
      return next;
    });
  }, []);

  const handleNextPanel = useCallback(() => {
    setCurrentPanel((prev) => {
      const next = Math.min(prev + 1, totalPanels - 1);
      console.log('Current panel:', next);
      return next;
    });
  }, [totalPanels]);

  // ADSR change handler
  const handleAdsrChange = useCallback((partial) => {
    setCurrentAdsr((prev) => ({ ...prev, ...partial }));
  }, []);

  // add instrument preset
  const handleAddInstrument = useCallback(() => {
    setInstruments((prev) => {
      const index = prev.length;
      const id = `instrument${index.toString().padStart(2, '0')}`;
      const next = [
        ...prev,
        {
          id,
          adsr: {
            attack: currentAdsr.attack,
            decay: currentAdsr.decay,
            sustain: currentAdsr.sustain,
            release: currentAdsr.release,
          },
          duration: currentAdsr.duration,
          gain: currentAdsr.gain,
          waveType, // store wave type with the preset
        },
      ];
      console.log('Added instrument preset:', id, next);
      return next;
    });
  }, [currentAdsr, waveType]);

  // const blockPosition = [0, -0.1, -0.5];
  // const blockRotation = [Math.PI/2, 0, 0];
  // const blockScale = 1

  const blockPosition = [0, 0.3, -0.5];
  const blockRotation = [0, 0, 0];
  const blockScale = 1

  return (
    <>
      <ambientLight intensity={1.5} />

      <group position={blockPosition} rotation={blockRotation} scale={[blockScale, blockScale, blockScale]}>
        <Keyboard
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          onKeyPressed={handleKeyPressed}
          onOctaveChange={handleOctaveChange}
        />

        <Deck
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          radius={0.15}
          currentPanel={currentPanel}
          onPrevPanel={handlePrevPanel}
          onNextPanel={handleNextPanel}
          totalPanels={totalPanels}
          adsr={currentAdsr}
          onAdsrChange={handleAdsrChange}
          onAddInstrument={handleAddInstrument}
          waveType={waveType}
          onWaveTypeChange={setWaveType}
        />
      </group>
    </>
  );
}

export default function SceneCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 0], fov: 60 }}>
      <BitmapTextProvider
        fontFamily='"futura-100", sans-serif'
        useMipmaps={false}
        toneMapped={false}
      >
        <color attach="background" args={['#ffffff']} />
        <XR store={store}>
          <Suspense fallback={null}>
            <SceneRoot />
          </Suspense>
        </XR>
      </BitmapTextProvider>
    </Canvas>
  );
}
