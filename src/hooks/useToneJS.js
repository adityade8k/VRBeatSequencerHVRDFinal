// useToneJS.js
import { useMemo, useCallback } from 'react';
import * as Tone from 'tone';

export function useToneJS({ waveType, adsr }) {
  // adsr = { attack, decay, sustain, release, duration, gain }

  // Create the audio graph once
  const { osc, env, gain } = useMemo(() => {
    const gainNode = new Tone.Gain(adsr.gain).toDestination();
    const envelope = new Tone.AmplitudeEnvelope({
      attack: adsr.attack,
      decay: adsr.decay,
      sustain: adsr.sustain,
      release: adsr.release,
    }).connect(gainNode);
    const oscillator = new Tone.Oscillator({
      type: waveType,
    }).connect(envelope).start();
    return { osc: oscillator, env: envelope, gain: gainNode };
  }, []); // graph is created once

  // Update params when state changes
  const updateParams = useCallback(() => {
    osc.type = waveType;
    gain.gain.value = adsr.gain;
    env.attack = adsr.attack;
    env.decay = adsr.decay;
    env.sustain = adsr.sustain;
    env.release = adsr.release;
  }, [waveType, adsr, osc, env, gain]);

  // Call this to play a note (frequency in Hz or Tone note like "C4")
  const playNote = useCallback(
    async (frequencyOrNote) => {
      await Tone.start();
      updateParams();
      const now = Tone.now();
      env.triggerAttackRelease(adsr.duration, now); // ADSR envelope controls amplitude
      osc.frequency.setValueAtTime(
        Tone.Frequency(frequencyOrNote),
        now
      );
    },
    [env, osc, adsr.duration, updateParams]
  );

  return { playNote };
}
