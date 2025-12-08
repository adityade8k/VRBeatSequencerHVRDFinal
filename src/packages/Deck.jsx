// packages/Deck.jsx
import { forwardRef, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import Button from '../components/Button';
import AdsrPanel from './ADSRController';
import LoopSequencer from './LoopSequencer.jsx';
import Composer from './Composer.jsx'; // ⬅️ new

const Deck = forwardRef(function Deck(
  {
    // root transform
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],

    // deck layout
    radius = 0.45,
    currentPanel = 0,
    totalPanels = 3,
    onPrevPanel,
    onNextPanel,

    // ADSR + presets
    adsr,
    onAdsrChange,
    onAddInstrument,

    // wave type
    waveType,
    onWaveTypeChange,

    // loop sequencer props
    instruments,
    selectedInstrumentId,
    onSelectInstrumentPreset,
    onPatternChange,
    onAddSequence,
    noteEvent,

    composerLoops,
    composerChannels,
    onAssignLoopToChannel,
    isCompositionPlaying,
    onToggleCompositionPlay,
  },
  ref
) {
  const localRef = useRef();
  const rootRef = ref ?? localRef;
  const ringRef = useRef();

  const rotateStep = Math.PI / 3; // 60°
  const targetRotationRef = useRef(0);

  useEffect(() => {
    targetRotationRef.current = currentPanel * rotateStep;
  }, [currentPanel]);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    const current = ringRef.current.rotation.y;
    const target = targetRotationRef.current;
    const speed = 6;
    const next = current + (target - current) * Math.min(1, speed * delta);
    ringRef.current.rotation.y = next;
  });

  const angles = [0, (2 * Math.PI) / 6, (4 * Math.PI) / 6];
  const isFirst = currentPanel === 0;
  const isLast = currentPanel === totalPanels - 1;

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={scale}>
      {/* origin marker */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* rotating ring */}
      <group ref={ringRef}>
        {angles.map((angle, idx) => {
          const isActive = idx === currentPanel;
          const baseOpacity = isActive ? 1 : 0;

          return (
            <group
              key={idx}
              position={[
                radius * Math.sin(angle),
                -idx * 0.01,
                -radius * Math.cos(angle),
              ]}
              rotation={[-Math.PI / 2, 0, idx * (-Math.PI / 3)]}
            >
              {idx === 0 ? (
                <group visible={baseOpacity > 0}>
                  <AdsrPanel
                    adsr={adsr}
                    onAdsrChange={onAdsrChange}
                    onAdd={onAddInstrument}
                    waveType={waveType}
                    onWaveTypeChange={onWaveTypeChange}
                  />
                </group>
              ) : idx === 1 ? (
                <group visible={baseOpacity > 0}>
                  <LoopSequencer
                    instruments={instruments}
                    selectedInstrumentId={selectedInstrumentId}
                    onSelectInstrumentPreset={onSelectInstrumentPreset}
                    onAddSequence={onAddSequence}
                    onPatternChange={onPatternChange}
                    noteEvent={noteEvent}
                  />
                </group>
              ) : idx === 2 ? (
                <group visible={baseOpacity > 0}>
                  <Composer
                    loops={composerLoops}
                    channels={composerChannels}
                    onAssignLoopToChannel={onAssignLoopToChannel}
                    isPlaying={isCompositionPlaying}
                    onTogglePlay={onToggleCompositionPlay}
                  />
                </group>
              ) : null}
            </group>
          );
        })}
      </group>

      {/* navigation buttons */}
      <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <Button
          position={[0.22, 0, -0.012]}
          label="Prev Panel"
          onPressed={isFirst ? undefined : onPrevPanel}
        />
        <Button
          position={[0.22, 0, -0.06]}
          label="Next Panel"
          onPressed={isLast ? undefined : onNextPanel}
        />
      </group>
    </group>
  );
});

export default Deck;
