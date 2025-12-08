// SceneCanvas.jsx (this is your src/.../index.jsx file)
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { Suspense, useState, useCallback } from 'react';
import BitmapTextProvider from '../bitmapText/bitmapTextProvider';
import Keyboard from '../../packages/KeyBoard';
import Deck from '../../packages/Deck';
import { store } from '../xr/xrStore';
import { useToneJS } from '../../hooks/useToneJS';
import { useLooperTone } from '../../hooks/useLooperTone';
import * as Tone from 'tone';

function SceneRoot() {
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [lastNote, setLastNote] = useState(null);

  const [currentPanel, setCurrentPanel] = useState(0);
  const totalPanels = 3;

  const [currentAdsr, setCurrentAdsr] = useState({
    attack: 0.02,
    decay: 0.03,
    sustain: 0.8,
    release: 0.03,
    duration: 0.14,
    gain: 1,
  });

  const [instruments, setInstruments] = useState([]);
  const [waveType, setWaveType] = useState('sine');

  // store all added 8-step sequences here
  const [sequences, setSequences] = useState([]);

  // event object used to feed notes into the Looper
  const [looperNoteEvent, setLooperNoteEvent] = useState(null);

  const { playNote } = useToneJS({
    waveType,
    adsr: currentAdsr,
  });

  const { playLoop, stopLoop, setBpm: setLoopBpm } = useLooperTone();

  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);

  const handleOctaveChange = useCallback((offset) => {
    setOctaveOffset(offset);
  }, []);

  const handleKeyPressed = useCallback(
    (midi, label) => {
      // Store what was pressed + current dial offset if you want it for UI
      setLastNote({ midi, label, octaveOffset });

      // Keyboard already applied octaveOffset, so use midi directly
      const freq = Tone.Frequency(midi, 'midi').toFrequency();

      // play immediate note
      playNote(freq);

      // send note event to Looper for recording, if active
      setLooperNoteEvent({
        id: Date.now(), // ensures a new object even for same note
        note: midi,     // ✅ NO extra octaveOffset here
      });
    },
    [octaveOffset, playNote]
  );

  const handlePrevPanel = useCallback(() => {
    setCurrentPanel((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNextPanel = useCallback(() => {
    setCurrentPanel((prev) => Math.min(prev + 1, totalPanels - 1));
  }, [totalPanels]);

  const handleAdsrChange = useCallback((partial) => {
    setCurrentAdsr((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleAddInstrument = useCallback(() => {
    setInstruments((prev) => {
      const index = prev.length;
      const id = `inst${index.toString().padStart(2, '0')}`;
      return [
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
          waveType,
        },
      ];
    });
  }, [currentAdsr, waveType]);

  const handleSelectInstrumentPreset = useCallback((inst) => {
    if (!inst) return;
    setSelectedInstrumentId(inst.id);
    setCurrentAdsr((prev) => ({
      ...prev,
      ...inst.adsr,
      duration: inst.duration,
      gain: inst.gain,
    }));
    setWaveType(inst.waveType || 'sine');
  }, []);

  // When Looper hits "Add"
  const handleAddSequence = useCallback((sequence) => {
    // sequence is { notes: [...], bpm }
    setSequences((prev) => [...prev, sequence]);
    console.log('Sequences in SceneCanvas:', [...sequences, sequence]);
  }, [sequences]);

  /**
   * This is called by Looper (via LoopSequencer -> Deck)
   * when Play/Pause toggles or BPM changes.
   *
   * payload:
   *   null                => stop
   *   { notes, bpm }      => play these 8 steps as a loop
   */
  const handlePatternChange = useCallback(
    (payload) => {
      if (!payload) {
        stopLoop();
        return;
      }

      const { notes, bpm = 86 } = payload;

      // update looper BPM
      setLoopBpm(bpm);

      // start / update the loop
      playLoop(notes, bpm);
    },
    [playLoop, stopLoop, setLoopBpm]
  );

  // const blockPosition = [0, -0.1, -0.5];
  // const blockRotation = [Math.PI / 2, 0, 0];
  // const blockScale = 1;

  const blockPosition = [0, 0.4, -0.5];
  const blockRotation = [0, 0, 0];
  const blockScale = 1;

  return (
    <>
      <ambientLight intensity={1.5} />

      <group
        position={blockPosition}
        rotation={blockRotation}
        scale={[blockScale, blockScale, blockScale]}
      >
        <Keyboard
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          onKeyPressed={handleKeyPressed}
          onOctaveChange={handleOctaveChange}
        />

        <Deck
          position={[0, -0.015, 0]}
          rotation={[0.3, 0, 0]}
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
          instruments={instruments}
          selectedInstrumentId={selectedInstrumentId}
          onSelectInstrumentPreset={handleSelectInstrumentPreset}
          onPatternChange={handlePatternChange}
          onAddSequence={handleAddSequence}
          noteEvent={looperNoteEvent}
        />
      </group>
    </>
  );
}

export default function SceneCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 0.6], fov: 60 }}>
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
