// src/hooks/useLooperTone.js
import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

export function useLooperTone() {
  const loopRef = useRef(null);
  const synthCacheRef = useRef(new Map());

  const transportRef = useRef(
    typeof Tone.getTransport === 'function'
      ? Tone.getTransport()
      : Tone.Transport
  );

  // Build / reuse a synth for a given instrument snapshot
  const getSynthForInstrument = useCallback((instrument) => {
    const inst = instrument || {};
    const adsr = inst.adsr || {};
    const waveType = inst.waveType || 'sine';
    const gainValue =
      typeof inst.gain === 'number' && !Number.isNaN(inst.gain)
        ? inst.gain
        : 0.7;

    const key = JSON.stringify({
      waveType,
      attack: adsr.attack ?? 0.02,
      decay: adsr.decay ?? 0.2,
      sustain: adsr.sustain ?? 0.8,
      release: adsr.release ?? 0.3,
      gain: gainValue,
    });

    if (synthCacheRef.current.has(key)) {
      return synthCacheRef.current.get(key);
    }

    const synth = new Tone.Synth({
      oscillator: { type: waveType },
      envelope: {
        attack: adsr.attack ?? 0.02,
        decay: adsr.decay ?? 0.2,
        sustain: adsr.sustain ?? 0.8,
        release: adsr.release ?? 0.3,
      },
    });

    const gain = new Tone.Gain(gainValue).toDestination();
    synth.connect(gain);

    synthCacheRef.current.set(key, synth);
    return synth;
  }, []);

  // Play an 8-step loop at current BPM
  const playLoop = useCallback(
    (pattern, bpm = 86) => {
      const transport = transportRef.current;
      if (!pattern || !Array.isArray(pattern) || pattern.length === 0) return;

      // Stop & dispose previous loop
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }

      // Reset scheduled events and set BPM
      transport.cancel(0);
      transport.bpm.rampTo(bpm, 0.01);

      let stepIndex = 0;
      const steps = pattern.slice(0, 8); // ensure 8 steps max

      loopRef.current = new Tone.Loop((time) => {
        const rawStep = steps[stepIndex % 8];
        stepIndex = (stepIndex + 1) % 8;

        if (!rawStep) return; // null/undefined => silence

        let midi = null;
        let instrument = null;

        if (typeof rawStep === 'object') {
          midi = rawStep.midi ?? rawStep.note ?? null;
          instrument = rawStep.instrument || null;
        } else if (typeof rawStep === 'number') {
          midi = rawStep;
        }

        if (midi == null) return;

        const synth = getSynthForInstrument(instrument);
        const freq = Tone.Frequency(midi, 'midi');

        // duration from instrument, fallback to a short default
        const durSeconds =
          instrument && typeof instrument.duration === 'number'
            ? instrument.duration
            : 0.14;

        synth.triggerAttackRelease(freq, durSeconds, time);
      }, '8n').start(0);

      transport.start();
    },
    [getSynthForInstrument]
  );

  const stopLoop = useCallback(() => {
    const transport = transportRef.current;

    if (loopRef.current) {
      loopRef.current.stop();
    }
    transport.stop();
  }, []);

  const setBpm = useCallback((bpm) => {
    const transport = transportRef.current;
    transport.bpm.rampTo(bpm, 0.01);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }

      synthCacheRef.current.forEach((synth) => {
        synth.dispose();
      });
      synthCacheRef.current.clear();
    };
  }, []);

  return { playLoop, stopLoop, setBpm };
}
