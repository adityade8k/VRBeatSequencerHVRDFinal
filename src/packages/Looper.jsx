// src/packages/Looper.jsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';

import Button from '../components/Button';
import Dial from '../components/Dial';
import BitmapText from '../components/bitmapText';

// Helper: MIDI -> "C4" style label
function midiToLabel(midi) {
  if (typeof midi !== 'number') return '';
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[note]}${octave}`;
}

export default function Looper({
  onAddSequence,
  onPatternChange,
  noteEvent,          // { id, note } from SceneCanvas when a key is played
  selectedInstrument, // snapshot of current instrument
}) {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(86);

  // Each step: null (silence) or { midi, instrument }
  const [notes, setNotes] = useState(Array(8).fill(null));
  const [currentStep, setCurrentStep] = useState(0);

  // Visual playhead index while loop is playing
  const [activeStep, setActiveStep] = useState(null);
  const playheadTimerRef = useRef(null);

  // Track last processed noteEvent.id so we don't re-record old events
  const lastNoteIdRef = useRef(null);

  // --- Playhead control ------------------------------------------------------

  const stopPlayhead = useCallback(() => {
    if (playheadTimerRef.current) {
      clearInterval(playheadTimerRef.current);
      playheadTimerRef.current = null;
    }
    setActiveStep(null);
  }, []);

  const startPlayhead = useCallback(
    (bpmValue) => {
      // Clear any existing timer
      stopPlayhead();
      if (!bpmValue || bpmValue <= 0) return;

      // 8th note duration in ms: quarter = 60000 / bpm, so 8n = / 2
      const stepMs = 30000 / bpmValue;

      let step = 0;
      setActiveStep(0);
      playheadTimerRef.current = setInterval(() => {
        step = (step + 1) % 8;
        setActiveStep(step);
      }, stepMs);
    },
    [stopPlayhead]
  );

  useEffect(() => {
    return () => {
      stopPlayhead();
    };
  }, [stopPlayhead]);

  // --- CORE: record a single note into current step --------------------------

  const handleRecordNote = useCallback(
    (midi) => {
      if (!recording || currentStep >= 8) return;

      const stepPayload = {
        midi,
        instrument: selectedInstrument ? { ...selectedInstrument } : null,
      };

      setNotes((prev) => {
        const next = [...prev];
        next[currentStep] = stepPayload;
        return next;
      });

      // Advance to next tile (one note → one slot)
      setCurrentStep((prev) => Math.min(prev + 1, 8));
    },
    [recording, currentStep, selectedInstrument]
  );

  // When we receive a keyboard note event from parent, try to record it
  useEffect(() => {
    if (!noteEvent || !recording) return;

    // Only record if this noteEvent is new (id changed)
    const { id, note } = noteEvent;
    if (id == null) return; // if no id, bail to avoid weirdness

    if (lastNoteIdRef.current === id) return; // already processed
    lastNoteIdRef.current = id;

    handleRecordNote(note);
  }, [noteEvent, recording, handleRecordNote]);

  // --- Play / Pause ----------------------------------------------------------

  const handlePlayPause = useCallback(() => {
    // If we start/stop playback, recording should be off
    setRecording(false);

    setPlaying((prev) => {
      const next = !prev;

      if (next) {
        // going from stopped -> playing
        onPatternChange?.({
          notes: [...notes], // 8-step pattern, null = silence
          bpm,
        });
        // start visual playhead
        startPlayhead(bpm);
      } else {
        // going from playing -> stopped (pause)
        onPatternChange?.(null);
        stopPlayhead();
      }

      return next;
    });
  }, [notes, bpm, onPatternChange, startPlayhead, stopPlayhead]);

  // --- Record toggle ---------------------------------------------------------

  const handleRecordToggle = useCallback(() => {
    setRecording((prev) => {
      const next = !prev;
      if (next) {
        // starting a recording session – start from first slot
        setCurrentStep(0);
        // "consume" whatever the current noteEvent was,
        // so only *future* key presses get recorded
        if (noteEvent && noteEvent.id != null) {
          lastNoteIdRef.current = noteEvent.id;
        } else {
          lastNoteIdRef.current = null;
        }
      }
      return next;
    });
  }, [noteEvent]);

  // --- Skip: move forward, leave silence (null) ------------------------------

  const handleSkipNote = useCallback(() => {
    if (!recording || currentStep >= 8) return;
    setCurrentStep((prev) => Math.min(prev + 1, 8));
  }, [recording, currentStep]);

  // --- Delete last: remove previous note, make that slot ready again ---------

  const handleDeleteLast = useCallback(() => {
    if (currentStep === 0) return;

    const newStep = Math.max(currentStep - 1, 0);
    setCurrentStep(newStep);
    setNotes((prev) => {
      const next = [...prev];
      next[newStep] = null;
      return next;
    });
  }, [currentStep]);

  // --- Delete all: clear and start recording from the beginning --------------

  const handleDeleteAll = useCallback(() => {
    setNotes(Array(8).fill(null));
    setCurrentStep(0);
    setRecording(true); // "sets the first to be recorded again"
    setPlaying(false);
    stopPlayhead();
    onPatternChange?.(null); // ensure loop stops
  }, [onPatternChange, stopPlayhead]);

  // --- Add current sequence to SceneCanvas state + reset looper --------------

  const handleAddSequence = useCallback(() => {
    // Send current sequence up
    onAddSequence?.({
      notes: [...notes], // 8-step pattern, null = silence
    });

    // Reset internal state so tiles are empty and slot 0 is ready
    setNotes(Array(8).fill(null));
    setCurrentStep(0);
    setRecording(true); // first tile "armed" (yellow)
    setPlaying(false);
    stopPlayhead();
    onPatternChange?.(null); // stop preview loop if it was playing
  }, [notes, bpm, onAddSequence, onPatternChange, stopPlayhead]);

  // --- BPM dial: update bpm and inform parent if currently playing -----------

  const handleBpmChange = useCallback(
    (value) => {
      setBpm(value);
      // live-update playing loop to new preview BPM
      if (playing && onPatternChange) {
        onPatternChange({
          notes: [...notes],
          bpm: value,
        });
        // restart playhead at new tempo
        startPlayhead(value);
      }
    },
    [playing, notes, onPatternChange, startPlayhead]
  );

  return (
    <group>
      {/* 8 tiles */}
      <group position={[-0.075, 0, -0.025]}>
        {Array.from({ length: 8 }, (_, i) => {
          const step = notes[i];
          const hasNote = !!step;
          const isCurrent = i === currentStep;
          const isActive = playing && i === activeStep;
          const label = hasNote ? midiToLabel(step.midi) : '';
          const x = i * 0.035 - 0.07;

          // Color priority:
          // 1. active playhead (looping)
          // 2. recorded note
          // 3. current recording slot
          // 4. base
          let color;
          if (isActive) {
            color = 0xf97316; // orange for currently playing step
          } else if (hasNote) {
            color = 0x22c55e; // green if note recorded
          } else if (isCurrent && recording) {
            color = 0xfacc15; // yellow-ish for ready to record
          } else {
            color = 0xb4cafe; // base
          }

          return (
            <group key={i} position={[x, 0, 0]}>
              {/* tile */}
              <mesh
                scale={[0.018, 0.004, 0.018]}
                geometry={new THREE.BoxGeometry(1, 1, 1)}
                material={
                  new THREE.MeshStandardMaterial({
                    color,
                    metalness: 0.2,
                    roughness: 0.4,
                  })
                }
              />
              {/* note label above tile */}
              {label && (
                <BitmapText
                  text={label}
                  position={[0, 0.006, 0]}
                  rotation={[Math.PI / 2, 0, 0]} // a bit above the tile
                  scale={[0.008, 0.008, 0.008]}
                  color={0x000000}
                  align="center"
                  anchorY="bottom"
                  maxWidth={0.1}
                  quadWidth={1}
                  quadHeight={1}
                  letterSpacing={-0.2}
                />
              )}
            </group>
          );
        })}
      </group>

      {/* Controls */}
      <group position={[-0.035, 0, 0.04]} scale={[0.8, 0.8, 0.8]}>
        <Button
          position={[-0.13, 0, 0]}
          label={playing ? 'Pause' : 'Play'}
          onPressed={handlePlayPause}
        />
        <Button
          position={[-0.06, 0, 0]}
          label={recording ? 'Stop Rec' : 'Record'}
          onPressed={handleRecordToggle}
        />
        <Button position={[-0.01, 0, 0]} label="Skip" onPressed={handleSkipNote} />
        <Button position={[0.04, 0, 0]} label="Del" onPressed={handleDeleteLast} />
        <Button position={[0.09, 0, 0]} label="Del All" onPressed={handleDeleteAll} />
        <Button position={[0.161, 0, 0]} label="Add" onPressed={handleAddSequence} />
      </group>

      {/* BPM Dial */}
      <Dial
        position={[0.17, -0.06, 0.049]}
        scale={[0.7, 0.7, 0.7]}
        name="BPM"
        min={86}
        max={200}
        step={1}
        controlledValue={bpm}
        onChange={handleBpmChange}
      />
    </group>
  );
}
