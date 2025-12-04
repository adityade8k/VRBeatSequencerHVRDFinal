// packages/ADSRController.jsx

import Dial from '../components/Dial';
import Button from '../components/Button';

export default function AdsrPanel({
  adsr,
  onAdsrChange,
  onAdd,
  waveType,             // NEW
  onWaveTypeChange,     // NEW
}) {
  const {
    attack = 0.02,
    decay = 0.03,
    sustain = 0.8,
    release = 0.03,
    duration = 0.14,
    gain = 1,
  } = adsr;

  const makeWaveButtonProps = (type) => ({
    onPressed: () => onWaveTypeChange?.(type),
    baseColor: waveType === type ? '#22c55e' : '#fdb689', // active vs inactive
    keyColor: waveType === type ? '#22c55e' : '#38bdf8',
  });

  return (
    <group>
      {/* top row of dials */}
      <Dial
        position={[-0.12+0.01, 0.12, 0]}
        rotation={[Math.PI/2, 0, 0]}
        name="Attack"
        value={attack}
        min={0}
        max={0.2}
        step={0.01}
        onChange={(v) => onAdsrChange({ attack: v })}
      />
      <Dial
        position={[0+0.01, 0.12, 0]}
        rotation={[Math.PI/2, 0, 0]}
        name="Decay"
        value={decay}
        min={0}
        max={0.2}
        step={0.01}
        onChange={(v) => onAdsrChange({ decay: v })}
      />
      <Dial
        position={[0.12+0.01, 0.12, 0]}
        rotation={[Math.PI/2, 0, 0]}
        name="Sustain"
        value={sustain}
        min={0}
        max={1}
        step={0.5}
        onChange={(v) => onAdsrChange({ sustain: v })}
      />

      {/* bottom row of dials */}
      <Dial
        position={[-0.12+0.01, -0.03, 0]}
        rotation={[Math.PI/2, 0, 0]}
        name="Release"
        value={release}
        min={0}
        max={0.2}
        step={0.01}
        onChange={(v) => onAdsrChange({ release: v })}
      />
      <Dial
        position={[0+0.01, -0.03, 0]}
        rotation={[Math.PI/2, 0, 0]}
        name="Duration"
        value={duration}
        min={0}
        max={0.3}
        step={0.01}
        onChange={(v) => onAdsrChange({ duration: v })}
      />
      <Dial
        position={[0.12+0.01, -0.03, 0]}
        rotation={[Math.PI/2, 0, 0]}
        name="Gain"
        value={gain}
        min={0}
        max={5}
        step={0.1}
        onChange={(v) => onAdsrChange({ gain: v })}
      />

      {/* wave type buttons row */}
      <group position={[0, -0.14, 0]} rotation={[Math.PI/2, 0, 0]}>
        <Button
          position={[-0.225, 0, -0.338]}
          label="Sine"
          {...makeWaveButtonProps('sine')}
        />
        <Button
          position={[-0.225, 0, -0.34 + 0.055]}
          label="Square"
          {...makeWaveButtonProps('square')}
        />
        <Button
          position={[-0.225, 0, -0.34 + 0.11]}
          label="Tri"
          {...makeWaveButtonProps('triangle')}
        />
        <Button
          position={[-0.225, 0, -0.34 + 0.165]}
          label="Saw"
          {...makeWaveButtonProps('sawtooth')}
        />
      </group>

      {/* Add preset button below */}
      <Button
        position={[0.222, 0.03, 0]}
        rotation={[Math.PI/2, 0, 0]}
        label="Add"
        onPressed={onAdd}
      />
    </group>
  );
}
