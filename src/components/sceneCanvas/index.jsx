// SceneCanvas.jsx (src/.../index.jsx)
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { Suspense, useState, useCallback, useEffect } from 'react';
import BitmapTextProvider from '../bitmapText/bitmapTextProvider';
import Keyboard from '../../packages/KeyBoard';
import Deck from '../../packages/Deck';
import { store } from '../xr/xrStore';
import { useToneJS } from '../../hooks/useToneJS';
import { useLooperTone } from '../../hooks/useLooperTone';
import { useComposerTone } from '../../hooks/useComposerTone';
import * as Tone from 'tone';
import Visualizer from '../../packages/Visualizer';

// 🔥 Pre-added instrument presets
const INITIAL_INSTRUMENTS = [
  {
    id: 'Kick',
    kind: 'kick', // uses MembraneSynth in useComposerTone
    adsr: {
      attack: 0.001,
      decay: 0.08,
      sustain: 0.0,
      release: 0.02,
    },
    duration: 0.14,
    gain: 3.0,
    waveType: 'sine',
  },
];

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

  // 👇 Start with preset instruments
  const [instruments, setInstruments] = useState(() => INITIAL_INSTRUMENTS);
  const [waveType, setWaveType] = useState('sine');

  // 🔁 All 8-step loops recorded from the Looper
  const [loops, setLoops] = useState([]);

  // 🎚️ 5 channels for the Composer, each holds an array of "slots"
  // Each slot will be either:
  //   null
  //   { loopId }       (reference to a loop in `loops`)
  //   or a full loop object { id, notes, bpm } (old behavior still works)
  const [channels, setChannels] = useState(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `ch${i}`,
      loops: [],
    }))
  );

  // Global play/pause for the composer
  const [isCompositionPlaying, setIsCompositionPlaying] = useState(false);

  const [playheadStep, setPlayheadStep] = useState(0);
  const [viewSlotIndex, setViewSlotIndex] = useState(0);

  // event object used to feed notes into the Looper
  const [looperNoteEvent, setLooperNoteEvent] = useState(null);

  // 🔁 Global BPM (shared by Looper + Composition)
  const [bpm, setBpm] = useState(86);

  const { playNote } = useToneJS({
    waveType,
    adsr: currentAdsr,
  });

  const { playLoop, stopLoop, setBpm: setLoopBpm } = useLooperTone();
  const { playComposition, stopComposition } = useComposerTone();

  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);

  // Keep Tone.Transport + looper engine in sync with global BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
    setLoopBpm(bpm);
  }, [bpm, setLoopBpm]);

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
  // `notes` already carry per-step instrument snapshots from Looper
  const handleAddSequence = useCallback(({ notes, bpm: loopBpm }) => {
    setLoops((prev) => {
      const id = `Loop${prev.length + 1}`;
      const loop = { id, notes: [...notes], bpm: loopBpm };
      console.log('Added loop:', loop);
      return [...prev, loop];
    });
  }, []);

  /**
   * This is called by Looper (via LoopSequencer -> Deck)
   * when Play/Pause toggles or BPM changes.
   *
   * payload:
   *   null                => stop preview loop
   *   { notes, bpm }      => play these 8 steps as a loop
   */
  const handlePatternChange = useCallback(
    (payload) => {
      if (!payload) {
        stopLoop();
        return;
      }

      const { notes, bpm: payloadBpm } = payload;

      // Ensure global BPM and loop BPM are in sync
      if (typeof payloadBpm === 'number' && payloadBpm !== bpm) {
        console.log('Syncing BPM from Looper payload:', payloadBpm);
        setBpm(payloadBpm);
      }

      // Always play using the current global BPM
      playLoop(notes, bpm);
    },
    [bpm, playLoop, stopLoop]
  );

  // Place a loopId into a specific channel/slot
  const handlePlaceLoopAtSlot = useCallback(
    (channelIndex, slotIndex, loopId) => {
      setChannels((prev) =>
        prev.map((ch, idx) => {
          if (idx !== channelIndex) return ch;

          const loopsArr = [...(ch.loops || [])];

          // Ensure array is long enough
          if (slotIndex >= loopsArr.length) {
            loopsArr.length = slotIndex + 1;
          }

          loopsArr[slotIndex] = { loopId };
          return { ...ch, loops: loopsArr };
        })
      );
    },
    []
  );

  // Delete a loop (if any) from a specific channel/slot
  const handleDeleteBlockAtSlot = useCallback((channelIndex, slotIndex) => {
    setChannels((prev) =>
      prev.map((ch, idx) => {
        if (idx !== channelIndex) return ch;

        const loopsArr = [...(ch.loops || [])];
        if (slotIndex < loopsArr.length) {
          loopsArr[slotIndex] = null;
        }
        return { ...ch, loops: loopsArr };
      })
    );
  }, []);

  // 🔁 Called on every 8n from useComposerTone
  const handleCompositionStep = useCallback((globalStep) => {
    setPlayheadStep(globalStep);
    const slotIdx = Math.floor(globalStep / 8);

    // Always move the visual needle
    setViewSlotIndex(slotIdx);

    // 🔥 Keep the SLOT DIAL synced during playback
    setSelectedSlotIndex(slotIdx);
  }, []);

  // When user turns the slot dial:
  const handleViewSlotChange = useCallback(
    (slotIdx) => {
      setSelectedSlotIndex(slotIdx);
      // When not playing, also center the needle on that slot
      if (!isCompositionPlaying) {
        setViewSlotIndex(slotIdx);
      }
    },
    [isCompositionPlaying]
  );

  // When user turns the channel dial:
  const handleViewChannelChange = useCallback((channelIdx) => {
    setSelectedChannelIndex(channelIdx);
  }, []);

  const handleToggleCompositionPlay = useCallback(() => {
    setIsCompositionPlaying((prev) => {
      const next = !prev;

      if (next) {
        const hasContent = channels.some((ch) =>
          (ch.loops || []).some((slot) => !!slot)
        );
        if (!hasContent) {
          return prev;
        }

        const resolvedChannels = channels.map((ch) => {
          const resolvedLoops = (ch.loops || []).map((slot) => {
            if (!slot) return null;
            if (slot.notes && Array.isArray(slot.notes)) {
              return slot;
            }
            const loopId = slot.loopId || slot.id;
            const loopObj = loops.find((l) => l.id === loopId);
            return loopObj || null;
          });
          return { ...ch, loops: resolvedLoops };
        });

        Tone.Transport.bpm.value = bpm;

        playComposition(resolvedChannels, bpm, {
          onStep: handleCompositionStep,
        });
      } else {
        stopComposition();
      }

      return next;
    });
  }, [
    bpm,
    channels,
    loops,
    playComposition,
    stopComposition,
    handleCompositionStep,
  ]);

  const blockPosition = [0, -0.5, -0.5];
  const blockRotation = [-Math.PI/2, 0, 0];
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
          position={[0, -0.02, 0]}
          rotation={[0.4, 0, 0]}
          radius={0.14}
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
          bpm={bpm}
          onBpmChange={setBpm}
          composerLoops={loops}
          composerChannels={channels}
          onPlaceLoopAtSlot={handlePlaceLoopAtSlot}
          onDeleteBlockAtSlot={handleDeleteBlockAtSlot}
          isCompositionPlaying={isCompositionPlaying}
          onToggleCompositionPlay={handleToggleCompositionPlay}
          onComposerViewSlotChange={handleViewSlotChange}
          onComposerViewChannelChange={handleViewChannelChange}
          // 🔥 Controlled indices for Composer dials
          composerSelectedSlotIndex={selectedSlotIndex}
          composerSelectedChannelIndex={selectedChannelIndex}
        />

        <Visualizer
          position={[0, 0.23, -0.3]}
          rotation={[0, 0, 0]}
          scale={[1.5, 1.5, 1.5]}
          channels={channels}
          loops={loops}
          viewSlotIndex={viewSlotIndex}
          selectedSlotIndex={selectedSlotIndex}
          selectedChannelIndex={selectedChannelIndex}
          isPlaying={isCompositionPlaying}
          playingStep={playheadStep}
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
