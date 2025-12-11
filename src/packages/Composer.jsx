// src/packages/Composer.jsx
import React, { useState, useMemo, useCallback } from 'react';
import Button from '../components/Button';
import BitmapText from '../components/bitmapText';
import Dial from '../components/Dial';

/**
 * Try to read the loop stored at (channelIndex, slotIndex).
 */
function getSlotLoop(channels, channelIndex, slotIndex) {
  const ch = channels[channelIndex];
  if (!ch) return null;

  const candidates = [ch.slots, ch.blocks, ch.loops];
  for (const arr of candidates) {
    if (Array.isArray(arr) && slotIndex >= 0 && slotIndex < arr.length) {
      return arr[slotIndex] ?? null;
    }
  }
  return null;
}

export default function Composer({
  position = [0, 0.02, 0],
  rotation = [Math.PI / 2, 0, 0],
  scale = [1.2, 1.2, 1.2],

  loops = [],
  channels = [],
  onPlaceLoopAtSlot,
  onDeleteBlockAtSlot,

  isPlaying = false,
  onTogglePlay,

  // Notify SceneRoot which slot & channel are currently selected
  onViewSlotChange,
  onViewChannelChange,

  // 🔥 Controlled values from parent (SceneRoot)
  selectedSlotIndex: controlledSlotIndex,
  selectedChannelIndex: controlledChannelIndex,
}) {
  const [selectedLoopId, setSelectedLoopId] = useState(null);

  const channelCount = Math.max(channels.length, 1);
  const maxChannelIndex = channelCount - 1;

  const inferredMaxSlots = channels.reduce((max, ch) => {
    const slotsArr = ch?.slots || ch?.blocks || ch?.loops;
    if (Array.isArray(slotsArr)) {
      return Math.max(max, slotsArr.length);
    }
    return max;
  }, 0);
  const totalSlots = Math.max(inferredMaxSlots || 0, 16);
  const maxSlotIndex = totalSlots - 1;

  // Local state used only if parent does NOT control indices
  const [localChannelIndex, setLocalChannelIndex] = useState(0);
  const [localSlotIndex, setLocalSlotIndex] = useState(0);

  // Effective indices: controlled (from parent) OR internal fallback
  const effectiveChannelIndex =
    typeof controlledChannelIndex === 'number'
      ? controlledChannelIndex
      : localChannelIndex;

  const effectiveSlotIndex =
    typeof controlledSlotIndex === 'number'
      ? controlledSlotIndex
      : localSlotIndex;

  const [panelWidth, panelHeight] = [0.35, 0.12];

  const currentSlotLoop = getSlotLoop(
    channels,
    effectiveChannelIndex,
    effectiveSlotIndex
  );

  // =========================
  // CHANNEL / SLOT DIAL HANDLERS
  // =========================

  const handleChannelDialChange = useCallback(
    (value) => {
      const idx = Math.round(value);
      const clamped = Math.min(Math.max(idx, 0), maxChannelIndex);

      // update internal only if parent is NOT controlling
      if (typeof controlledChannelIndex !== 'number') {
        setLocalChannelIndex(clamped);
      }

      if (typeof onViewChannelChange === 'function') {
        onViewChannelChange(clamped);
      }
    },
    [maxChannelIndex, controlledChannelIndex, onViewChannelChange]
  );

  const handleSlotDialChange = useCallback(
    (value) => {
      const idx = Math.round(value);
      const clamped = Math.min(Math.max(idx, 0), maxSlotIndex);

      if (typeof controlledSlotIndex !== 'number') {
        setLocalSlotIndex(clamped);
      }

      if (typeof onViewSlotChange === 'function') {
        onViewSlotChange(clamped);
      }
    },
    [maxSlotIndex, controlledSlotIndex, onViewSlotChange]
  );

  // =========================
  // LOOP LIST SCROLLING (like InstrumentList)
  // =========================

  const visibleCount = 4;
  const [scrollIndex, setScrollIndex] = useState(0);

  const clampedScrollIndex = useMemo(() => {
    if (loops.length <= visibleCount) return 0;
    return Math.min(
      Math.max(0, scrollIndex),
      Math.max(0, loops.length - visibleCount)
    );
  }, [scrollIndex, loops.length]);

  const handleScrollUp = useCallback(() => {
    setScrollIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleScrollDown = useCallback(() => {
    setScrollIndex((prev) => {
      const maxIndex = Math.max(0, loops.length - visibleCount);
      return Math.min(prev + 1, maxIndex);
    });
  }, [loops.length]);

  const visibleLoops = useMemo(
    () =>
      loops.slice(
        clampedScrollIndex,
        clampedScrollIndex + visibleCount
      ),
    [loops, clampedScrollIndex]
  );

  // =========================
  // PLACE / DELETE
  // =========================

  const handlePlaceLoopFromList = (loop) => {
    setSelectedLoopId(loop.id);

    if (typeof onPlaceLoopAtSlot === 'function') {
      onPlaceLoopAtSlot(effectiveChannelIndex, effectiveSlotIndex, loop.id);
    }

    const next = effectiveSlotIndex + 1;
    const wrapped = next > maxSlotIndex ? 0 : next;

    // Move selection forward:
    if (typeof controlledSlotIndex !== 'number') {
      setLocalSlotIndex(wrapped);
    }
    if (typeof onViewSlotChange === 'function') {
      onViewSlotChange(wrapped);
    }
  };

  const handleDeleteAtSelection = () => {
    if (typeof onDeleteBlockAtSlot === 'function') {
      onDeleteBlockAtSlot(effectiveChannelIndex, effectiveSlotIndex);
    }
  };

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Left: Loops list */}
      <group position={[-0.13, 0, 0.001]}>
        <BitmapText
          text="LOOPS"
          position={[-0.07, 0.002, -0.04]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[0.009, 0.009, 0.009]}
          color="#000000"
          align="left"
          anchorY="middle"
          maxWidth={0.14 / 0.009}
          quadWidth={1}
          quadHeight={1}
          letterSpacing={-0.2}
        />

        <group position={[-0.02, 0.001, -0.025]}>
          {/* Scroll buttons */}
          <group position={[0.055, 0.0, -0.028]}>
            <Button
              scale={[0.7, 0.7, 0.7]}
              label="up"
              length={0.02}
              width={0.04}
              onPressed={handleScrollUp}
            />
          </group>

          <group position={[0.055, 0.0, 0.043]}>
            <Button
              scale={[0.7, 0.7, 0.7]}
              label="down"
              length={0.02}
              width={0.04}
              onPressed={handleScrollDown}
            />
          </group>

          {/* Visible loop rows */}
          <group position={[0, 0, -0.004]}>
            {loops.length === 0 ? (
              <BitmapText
                text="No loops yet"
                position={[0, 0, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[0.007, 0.007, 0.007]}
                color="#000000"
                align="left"
                anchorY="middle"
                maxWidth={0.15 / 0.007}
                quadWidth={1}
                quadHeight={1}
                letterSpacing={-0.2}
              />
            ) : (
              visibleLoops.map((loop, idx) => {
                const isSelected = loop.id === selectedLoopId;
                const zOffset = idx * 0.022;

                return (
                  <group key={loop.id} position={[0, 0, zOffset]}>
                    <Button
                      label={loop.id}
                      length={0.02}
                      width={0.08}
                      baseColor={isSelected ? '#facc15' : '#fdb689'}
                      keyColor={isSelected ? '#f97316' : '#38bdf8'}
                      onPressed={() => handlePlaceLoopFromList(loop)}
                    />
                  </group>
                );
              })
            )}
          </group>
        </group>
      </group>

      {/* Right: Channel/Slot dials + Play/Delete */}
      <group position={[0.09, 0, 0.001]}>
        <group position={[0, 0.001, -0.015]}>
          {/* Channel Dial */}
          <group position={[-0.06, 0, 0]}>
            <Dial
              name="CH"
              position={[0, 0, 0]}
              min={0}
              max={maxChannelIndex}
              step={1}
              controlledValue={effectiveChannelIndex}
              onChange={handleChannelDialChange}
              scale={[0.6, 0.6, 0.6]}
            />
            <BitmapText
              text={`Ch: ${effectiveChannelIndex + 1}`}
              position={[0, 0.002, 0.03]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[0.007, 0.007, 0.007]}
              color="#000000"
              align="center"
              anchorY="middle"
              maxWidth={0.15 / 0.007}
              quadWidth={1}
              quadHeight={1}
              letterSpacing={-0.2}
            />
          </group>

          {/* Slot Dial */}
          <group position={[0.04, 0, 0]}>
            <Dial
              name="SLOT"
              position={[0, 0, 0]}
              min={0}
              max={maxSlotIndex}
              step={1}
              controlledValue={effectiveSlotIndex}
              onChange={handleSlotDialChange}
              scale={[0.6, 0.6, 0.6]}
            />
            <BitmapText
              text={`Slot: ${effectiveSlotIndex + 1}`}
              position={[0, 0.002, 0.03]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[0.007, 0.007, 0.007]}
              color="#000000"
              align="center"
              anchorY="middle"
              maxWidth={0.15 / 0.007}
              quadWidth={1}
              quadHeight={1}
              letterSpacing={-0.2}
            />
          </group>
        </group>

        <BitmapText
          text={currentSlotLoop ? 'Has loop' : 'Empty'}
          position={[-0.07, 0.002, 0.02]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[0.007, 0.007, 0.007]}
          color={currentSlotLoop ? '#16a34a' : '#000000'}
          align="left"
          anchorY="middle"
          maxWidth={0.18 / 0.007}
          quadWidth={1}
          quadHeight={1}
          letterSpacing={-0.2}
        />

        <group position={[0.03, 0.001, 0.045]}>
          <Button
            position={[-0.04, 0, 0]}
            label={isPlaying ? 'Pause' : 'Play'}
            length={0.02}
            width={0.06}
            onPressed={onTogglePlay}
          />
          <Button
            position={[0.04, 0, 0]}
            label="Delete"
            length={0.02}
            width={0.06}
            onPressed={handleDeleteAtSelection}
          />
        </group>
      </group>
    </group>
  );
}
