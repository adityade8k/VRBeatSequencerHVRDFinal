// src/hooks/useComposerTone.js
import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

export function useComposerTone() {
  const loopRef = useRef(null);
  const synthCacheRef = useRef(new Map());

  const transportRef = useRef(
    typeof Tone.getTransport === 'function'
      ? Tone.getTransport()
      : Tone.Transport
  );

  // Master bus: masterGain -> limiter -> destination
  const masterGainRef = useRef(null);
  const limiterRef = useRef(null);

  // Create master bus once
  useEffect(() => {
    const limiter = new Tone.Limiter(-3).toDestination();
    const masterGain = new Tone.Gain(2).connect(limiter);

    masterGainRef.current = masterGain;
    limiterRef.current = limiter;

    return () => {
      if (masterGain) masterGain.dispose();
      if (limiter) limiter.dispose();
    };
  }, []);

  // Build/reuse synths by ADSR + wave type
  const getSynthForInstrument = useCallback((instrument) => {
    const inst = instrument || {};
    const adsr = inst.adsr || {};
    const waveType = inst.waveType || 'sine';

    // we still read inst.gain, but clamp it aggressively
    const gainValueRaw =
      typeof inst.gain === 'number' && !Number.isNaN(inst.gain)
        ? inst.gain
        : 0.7;
    const gainValue = Math.min(gainValueRaw, 0.2); // keep voices quiet

    const key = JSON.stringify({
      waveType,
      attack: adsr.attack ?? 0.02,
      decay: adsr.decay ?? 0.2,
      sustain: adsr.sustain ?? 0.8,
      // cap release so long tails don't stack too much
      release: Math.min(adsr.release ?? 0.3, 0.3),
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
        release: Math.min(adsr.release ?? 0.3, 0.3),
      },
    });

    const masterGain = masterGainRef.current;
    const dest = masterGain ?? Tone.Destination;

    const gain = new Tone.Gain(gainValue).connect(dest);
    synth.connect(gain);

    synthCacheRef.current.set(key, synth);
    return synth;
  }, []);

  /**
   * playComposition(channels, bpmFromRoot, options?)
   * - channels: [{ id, loops: [loop or null, ...] }]
   * - each loop: { notes: [step0, step1, ... step7] }
   * - options.onStep(globalStep) is called every 8n tick BEFORE we increment.
   */
  const playComposition = useCallback(
    (channels, bpmFromRoot = 86, options = {}) => {
      const { onStep } = options || {};
      const transport = transportRef.current;

      if (!Array.isArray(channels) || channels.length === 0) return;

      // Kill any existing loop
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }

      // Hard reset the transport timeline to avoid Tone's "start time" errors
      transport.stop();
      transport.cancel(0);

      const effectiveBpm =
        typeof bpmFromRoot === 'number' && !Number.isNaN(bpmFromRoot)
          ? bpmFromRoot
          : 86;

      // No rampTo here; just set the value
      transport.bpm.value = effectiveBpm;

      // Build simple metadata for each channel
      let longestSteps = 0;
      const channelMeta = channels.map((ch) => {
        const loops = ch?.loops || [];
        const totalLoops = loops.length;
        const totalSteps = totalLoops * 8;

        if (totalSteps > longestSteps) {
          longestSteps = totalSteps;
        }

        return {
          id: ch.id,
          loops,
          totalLoops,
          totalSteps,
        };
      });

      if (longestSteps === 0) {
        return;
      }

      let globalStep = 0;

      const loop = new Tone.Loop((time) => {
        // Notify visualizer BEFORE increment
        if (typeof onStep === 'function') {
          onStep(globalStep);
        }

        channelMeta.forEach((meta) => {
          const { loops, totalSteps } = meta;
          if (!loops || totalSteps === 0) return;
          if (globalStep >= totalSteps) return;

          const loopIndex = Math.floor(globalStep / 8);
          const stepIndex = globalStep % 8;

          const loopObj = loops[loopIndex];
          if (!loopObj || !Array.isArray(loopObj.notes)) return;

          const rawStep = loopObj.notes[stepIndex];
          if (!rawStep) return; // null/undefined => silence

          let midi = null;
          let instrument = null;
          let noteDurationOverride = null;

          if (typeof rawStep === 'object') {
            midi = rawStep.midi ?? rawStep.note ?? null;
            instrument = rawStep.instrument || null;
            if (
              typeof rawStep.duration === 'number' &&
              !Number.isNaN(rawStep.duration)
            ) {
              noteDurationOverride = rawStep.duration;
            }
          } else if (typeof rawStep === 'number') {
            midi = rawStep;
          }

          if (midi == null) return;

          const synth = getSynthForInstrument(instrument);
          const freq = Tone.Frequency(midi, 'midi');

          // Priority: per-note duration > instrument.duration > fallback
          const durSeconds =
            noteDurationOverride ??
            (instrument && typeof instrument.duration === 'number'
              ? instrument.duration
              : 0.14);

          // Use the callback-provided time (monotonic) to avoid timing errors.
          synth.triggerAttackRelease(freq, durSeconds, time);
        });

        // Advance global step, looping at longestSteps
        globalStep = (globalStep + 1) % longestSteps;
      }, '8n');

      loopRef.current = loop;
      loopRef.current.start(0);
      transport.start();
    },
    [getSynthForInstrument]
  );

  const stopComposition = useCallback(() => {
    const transport = transportRef.current;

    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current.dispose();
      loopRef.current = null;
    }

    transport.stop();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }

      synthCacheRef.current.forEach((synth) => synth.dispose());
      synthCacheRef.current.clear();
    };
  }, []);

  return { playComposition, stopComposition };
}
