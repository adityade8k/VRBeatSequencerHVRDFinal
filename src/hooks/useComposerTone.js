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

  // Reuse the same idea as useLooperTone: build/reuse synths by ADSR + wave type
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

  /**
   * channels: [
   *   { id, loops: [ { id, notes: [...8], bpm }, ... ] },
   *   ...
   * ]
   *
   * - All channels step in lock-step.
   * - Each loop is 8 steps.
   * - If a channel has fewer total steps than the longest one, it's silent
   *   after its last note.
   * - After "last note in longest channel" => globalStep wraps to 0 (loop back).
   *
   * bpmFromRoot: the GLOBAL bpm from SceneRoot — single source of truth.
   */
  const playComposition = useCallback(
    (channels, bpmFromRoot = 86) => {
      const transport = transportRef.current;
      if (!Array.isArray(channels) || channels.length === 0) return;

      // Stop & dispose any previous loop
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }

      transport.cancel(0);

      // 👉 IMPORTANT: use the BPM given by SceneRoot, NOT the loops.
      const effectiveBpm =
        typeof bpmFromRoot === 'number' && !Number.isNaN(bpmFromRoot)
          ? bpmFromRoot
          : 86;

      transport.bpm.rampTo(effectiveBpm, 0.01);

      // Precompute per-channel metadata & longest channel length in steps
      let longestSteps = 0;
      const channelMeta = channels.map((ch) => {
        const loops = ch?.loops || [];
        const totalLoops = loops.length;
        const totalSteps = totalLoops * 8; // each loop = 8 steps

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
        // Nothing to play
        return;
      }

      let globalStep = 0;

      loopRef.current = new Tone.Loop((time) => {
        // For each channel, figure out what note (if any) should play on this step
        channelMeta.forEach((meta) => {
          const { loops, totalSteps } = meta;
          if (!loops || totalSteps === 0) return;

          // If this channel is "shorter" than the longest, it’s silent
          if (globalStep >= totalSteps) return;

          const loopIndex = Math.floor(globalStep / 8);
          const stepIndex = globalStep % 8;

          const loop = loops[loopIndex];
          if (!loop || !Array.isArray(loop.notes)) return;

          const rawStep = loop.notes[stepIndex];
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
          const durSeconds =
            instrument && typeof instrument.duration === 'number'
              ? instrument.duration
              : 0.14;

          synth.triggerAttackRelease(freq, durSeconds, time);
        });

        // 🔁 Loop back after the last step of the longest channel
        globalStep = (globalStep + 1) % longestSteps;
      }, '8n').start(0);

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
