// src/packages/LoopSequencer.jsx
import React, { useMemo } from 'react';
import InstrumentList from './InstrumentList';
import Looper from './Looper';
import BitmapText from '../components/bitmapText';

export default function LoopSequencer({
  position = [0, 0.02, 0],
  rotation = [Math.PI / 2, 0, 0],
  scale = [1.2, 1.2, 1.2],
  instruments,
  selectedInstrumentId,
  onSelectInstrumentPreset,
  onAddSequence,
  onPatternChange,
  noteEvent,

  // NEW
  bpm,
  onBpmChange,
}) {
  const [panelWidth, panelHeight] = [0.35, 0.12];

  const selectedInstrument = useMemo(
    () => instruments.find((inst) => inst.id === selectedInstrumentId) || null,
    [instruments, selectedInstrumentId]
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* background panel */}
      <mesh>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>

      {/* left: instrument list */}
      <group position={[-0.13, 0, 0.001]}>
        <InstrumentList
          position={[0, -0.005, 0]}
          instruments={instruments}
          selectedId={selectedInstrumentId}
          onSelectInstrument={onSelectInstrumentPreset}
        />
      </group>

      {/* right: looper */}
      <group position={[0.09, 0, 0.001]}>
        <Looper
          onAddSequence={onAddSequence}
          onPatternChange={onPatternChange}
          noteEvent={noteEvent}
          selectedInstrument={selectedInstrument}
          bpm={bpm}
          onBpmChange={onBpmChange}
        />
      </group>
    </group>
  );
}
