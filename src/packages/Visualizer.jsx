// src/packages/Visualizer.jsx
import React, { useMemo } from 'react';

/**
 * Resolve the loop object for a given channel/slot.
 */
function resolveSlotLoop(channels, loops, channelIndex, slotIndex) {
  const ch = channels[channelIndex];
  if (!ch) return null;

  const slotsArr = ch.slots || ch.blocks || ch.loops || [];
  const slot = Array.isArray(slotsArr) ? slotsArr[slotIndex] : null;
  if (!slot) return null;

  if (slot.notes && Array.isArray(slot.notes)) {
    return slot;
  }

  const loopId = slot.loopId || slot.id;
  if (!loopId) return null;

  return loops.find((l) => l.id === loopId) || null;
}

export default function Visualizer({
  position = [0, -0.08, 0.08],
  rotation = [Math.PI / 2, 0, 0],
  scale = [1, 1, 1],

  channels = [],
  loops = [],
  viewSlotIndex = 0,        // slot under the needle (scroll target)
  selectedSlotIndex = 0,    // slot selected via dial
  selectedChannelIndex = 0, // channel selected via dial
  isPlaying = false,
  playingStep = null,       // global step index from playComposition
}) {
  const channelCount = Math.max(channels.length, 1);

  const totalSlots = useMemo(() => {
    return (
      channels.reduce((max, ch) => {
        const slotsArr = ch?.slots || ch?.blocks || ch?.loops;
        if (Array.isArray(slotsArr)) {
          return Math.max(max, slotsArr.length);
        }
        return max;
      }, 0) || 16
    );
  }, [channels]);

  // Layout constants (in world units)
  const slotWidth = 0.02;
  const slotGap = 0.004;
  const rowGap = 0.028;

  const stepGap = 0.001;
  const stepWidth = (slotWidth - stepGap * 7) / 8;
  const stepHeight = 0.01;

  const centerOffsetX = viewSlotIndex * (slotWidth + slotGap);
  const totalHeight = channelCount * rowGap + 0.02;

  // Current playhead slot & step (during playback)
  const currentSlotIdx =
    isPlaying && typeof playingStep === 'number'
      ? Math.floor(playingStep / 8)
      : -1;
  const currentStepIdx =
    isPlaying && typeof playingStep === 'number' ? playingStep % 8 : -1;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Needle (fixed) */}
      <group>
        <mesh position={[0, 0.002, -(totalHeight * 0.25)]}>
          <planeGeometry args={[0.003, totalHeight]} />
          <meshStandardMaterial color="#f97373" />
        </mesh>
      </group>

      {/* Moving grid: channels & slots */}
      <group>
        {channels.map((ch, chIdx) => {
          const rowZ = -0.02 - chIdx * rowGap;

          return (
            <group key={ch.id || chIdx} position={[0, 0.065 + rowZ, 0]}>
              {Array.from({ length: totalSlots }).map((_, slotIdx) => {
                const slotLoop = resolveSlotLoop(
                  channels,
                  loops,
                  chIdx,
                  slotIdx
                );

                const baseX =
                  slotIdx * (slotWidth + slotGap) - centerOffsetX;

                const hasLoop = !!slotLoop;
                const loopNotes = (slotLoop && slotLoop.notes) || [];

                // Only the *exact* (channel, slot) pair should highlight when stopped
                const isSelectedWhileStopped =
                  !isPlaying &&
                  slotIdx === selectedSlotIndex &&
                  chIdx === selectedChannelIndex;

                // Are we in the same column as the playhead?
                const isPlayheadColumn =
                  isPlaying && slotIdx === currentSlotIdx;

                // For THIS channel+slot, is there an actual note at the current step?
                let slotHasActiveNote = false;
                if (
                  isPlayheadColumn &&
                  hasLoop &&
                  currentStepIdx >= 0 &&
                  currentStepIdx < loopNotes.length
                ) {
                  const currentRaw = loopNotes[currentStepIdx];
                  if (Array.isArray(currentRaw)) {
                    slotHasActiveNote = currentRaw.length > 0;
                  } else if (typeof currentRaw === 'object') {
                    slotHasActiveNote =
                      currentRaw &&
                      (currentRaw.midi != null ||
                        currentRaw.note != null ||
                        currentRaw.velocity != null);
                  } else if (typeof currentRaw === 'number') {
                    slotHasActiveNote = true;
                  }
                }

                let slotColor;
                if (slotHasActiveNote) {
                  slotColor = '#f97316'; // orange: this channel's slot is actually playing now
                } else if (isSelectedWhileStopped) {
                  slotColor = '#facc15'; // yellow: selected via dial while stopped
                } else {
                  slotColor = hasLoop ? '#38bdf8' : '#9e9cfe';
                }

                return (
                  <group key={slotIdx} position={[baseX, 0, 0]}>
                    {/* Slot frame */}
                    <mesh>
                      <planeGeometry args={[slotWidth, stepHeight + 0.012]} />
                      <meshStandardMaterial color={slotColor} />
                    </mesh>

                    {/* 8 steps inside the slot */}
                    {Array.from({ length: 8 }).map((_, stepIdx) => {
                      const raw = loopNotes[stepIdx];
                      let hasNote = false;

                      if (Array.isArray(raw)) {
                        hasNote = raw.length > 0;
                      } else if (typeof raw === 'object') {
                        hasNote =
                          raw &&
                          (raw.midi != null ||
                            raw.note != null ||
                            raw.velocity != null);
                      } else if (typeof raw === 'number') {
                        hasNote = true;
                      }

                      const stepX =
                        -slotWidth / 2 +
                        stepWidth / 2 +
                        stepIdx * (stepWidth + stepGap);

                      const isActiveStep =
                        slotHasActiveNote && stepIdx === currentStepIdx;

                      let stepColor;
                      if (isActiveStep && hasNote) {
                        stepColor = '#22c55e'; // green: note currently playing in this channel+slot
                      } else if (hasNote) {
                        stepColor = '#2563eb'; // blue: note present
                      } else {
                        stepColor = '#ffffff'; // empty
                      }

                      return (
                        <mesh
                          key={stepIdx}
                          position={[stepX, 0.001, 0]}
                        >
                          <planeGeometry args={[stepWidth, stepHeight]} />
                          <meshStandardMaterial color={stepColor} />
                        </mesh>
                      );
                    })}
                  </group>
                );
              })}
            </group>
          );
        })}
      </group>
    </group>
  );
}
