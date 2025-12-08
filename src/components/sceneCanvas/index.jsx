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
import { useComposerTone } from '../../hooks/useComposerTone'; // 🆕
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

  // 🔁 All 8-step loops recorded from the Looper
  const [loops, setLoops] = useState([]);

  // 🎚️ 5 channels for the Composer, each holds a list of loops
  const [channels, setChannels] = useState(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `ch${i}`,
      loops: [],
    }))
  );

  // Global play/pause for the composer
  const [isCompositionPlaying, setIsCompositionPlaying] = useState(false);

  // event object used to feed notes into the Looper
  const [looperNoteEvent, setLooperNoteEvent] = useState(null);

  const { playNote } = useToneJS({
    waveType,
    adsr: currentAdsr,
  });

  const { playLoop, stopLoop, setBpm: setLoopBpm } = useLooperTone();
  const { playComposition, stopComposition } = useComposerTone(); // 🆕

  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);

  const handleOctaveChange = useCallback((offset) => {
    setOctaveOffset(offset);
  }, []);

  const handleKeyPressed = useCallback(
    (midi, label) => {
      setLastNote({ midi, label, octaveOffset });

      const freq = Tone.Frequency(midi, 'midi').toFrequency();
      playNote(freq);

      // send note event to Looper for recording, if active
      setLooperNoteEvent({
        id: Date.now(),
        note: midi,
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

  // When Looper hits "Add": store as a named loop for the Composer
  const handleAddSequence = useCallback(({ notes, bpm }) => {
    setLoops((prev) => {
      const id = `Loop ${prev.length + 1}`;
      const loop = { id, notes: [...notes], bpm };
      console.log('Added loop:', loop);
      return [...prev, loop];
    });
  }, []);

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

  // Assign a selected loop to a channel (called from Composer)
  const handleAssignLoopToChannel = useCallback(
    (channelIndex, loopId) => {
      setChannels((prev) => {
        const loopToAdd = loops.find((l) => l.id === loopId);
        if (!loopToAdd) return prev;

        return prev.map((ch, idx) => {
          if (idx !== channelIndex) return ch;
          return {
            ...ch,
            loops: [...(ch.loops || []), loopToAdd],
          };
        });
      });
    },
    [loops]
  );

  // Play / pause the whole composition from Composer
  const handleToggleCompositionPlay = useCallback(() => {
    setIsCompositionPlaying((prev) => {
      const next = !prev;

      if (next) {
        // only start if there is at least one loop in any channel
        const hasContent = channels.some(
          (ch) => ch.loops && ch.loops.length > 0
        );
        if (!hasContent) {
          return prev; // keep as it was, nothing to play
        }
        playComposition(channels);
      } else {
        stopComposition();
      }

      return next;
    });
  }, [channels, playComposition, stopComposition]);

  const blockPosition = [0, -0.1, 0];
  const blockRotation = [Math.PI / 2, 0, 0];
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
          // 🆕 Composer wiring
          composerLoops={loops}
          composerChannels={channels}
          onAssignLoopToChannel={handleAssignLoopToChannel}
          isCompositionPlaying={isCompositionPlaying}
          onToggleCompositionPlay={handleToggleCompositionPlay}
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
