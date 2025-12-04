// Keyboard.jsx
import { useMemo, useState, useCallback } from 'react';
import PianoKey from '../components/PianoKey';
import Dial from '../components/Dial';

// Helper: convert MIDI note number to label like "C4"
function midiToLabel(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[note]}${octave}`;
}

export default function Keyboard({
  // center of the keyboard group
  position = [0, 0, -0.2],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],

  // key layout
  baseOctave = 4,      // C4–B4 by default
  keySpacing = 0.05,  // spacing along X
  keyOffsetX = -0.135, // shift so keys are roughly centered (7 keys * spacing)

  // dial layout (to the right of keys)
  dialOffset = [-0.22, -0.005, 0.02],
  dialMin = -2,
  dialMax = 2,
  dialStep = 1,
  dialSensitivity = 1.0,
  dialOptimizeDelta = 0.001,

  // callbacks
  onKeyPressed,        // (midi, label) => void
  onOctaveChange,      // (octaveOffset) => void
}) {
  // octave offset from dial, integer in [-2, +2]
  const [octaveOffset, setOctaveOffset] = useState(0);

  // MIDI numbers for C..B in baseOctave
  const baseMidiNotes = useMemo(() => {
    const baseC = (baseOctave + 1) * 12; // Cn in MIDI
    return [0, 2, 4, 5, 7, 9, 11].map(s => baseC + s); // C D E F G A B
  }, [baseOctave]);

  const handleDialChange = useCallback(
    (v) => {
      const offset = Math.round(v); // ensure we snap to integer steps
      setOctaveOffset(offset);
      onOctaveChange?.(offset);
    },
    [onOctaveChange]
  );

  const handleKeyPress = useCallback(
    (midi) => {
      const label = midiToLabel(midi);
      onKeyPressed?.(midi, label);
      // For now, also log
      console.log('Key pressed:', midi, label);
    },
    [onKeyPressed]
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 7 white keys */}
      {baseMidiNotes.map((baseMidi, index) => {
        const noteMidi = baseMidi + octaveOffset * 12;
        const label = midiToLabel(noteMidi);

        return (
          <PianoKey
            key={noteMidi}
            position={[keyOffsetX + index * keySpacing, 0, 0]}
            label={label}
            labelColor="#000000"
            onPressed={() => handleKeyPress(noteMidi)}
          />
        );
      })}

      {/* Octave dial on the right */}
      <Dial
        position={dialOffset}
        min={dialMin}
        max={dialMax}
        step={dialStep}
        sensitivity={dialSensitivity}
        optimizeDelta={dialOptimizeDelta}
        value={octaveOffset}
        onChange={handleDialChange}
        name={"Octave"}
      />
    </group>
  );
}
