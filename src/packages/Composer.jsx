// src/packages/Composer.jsx
import React, { useState, useMemo } from 'react';
import Button from '../components/Button';
import BitmapText from '../components/bitmapText';

export default function Composer({
  position = [0, 0.02, 0],
  rotation = [Math.PI / 2, 0, 0],
  scale = [1.2, 1.2, 1.2],

  loops = [],        // [{ id, notes, bpm }]
  channels = [],     // [{ id, loops: [...] }, ...]
  onAssignLoopToChannel, // (channelIndex, loopId) => void

  isPlaying = false,
  onTogglePlay,      // () => void
}) {
  const [selectedLoopId, setSelectedLoopId] = useState(null);

  const selectedLoop = useMemo(
    () => loops.find((l) => l.id === selectedLoopId) || null,
    [loops, selectedLoopId]
  );

  const [panelWidth, panelHeight] = [0.35, 0.12];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* background panel */}
      <mesh>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>

      {/* Title */}
      <BitmapText
        text="COMPOSER"
        position={[-0.16, 0.002, -0.05]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.012, 0.012, 0.012]}
        color="#000000"
        align="left"
        anchorY="middle"
        maxWidth={panelWidth / 0.012}
        quadWidth={1}
        quadHeight={1}
        letterSpacing={-0.3}
      />

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
            loops.map((loop, idx) => {
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
                    onPressed={() => setSelectedLoopId(loop.id)}
                  />
                </group>
              );
            })
          )}
        </group>

        {/* Small label with selected loop info */}
        {selectedLoop && (
          <BitmapText
            text={`Selected: ${selectedLoop.id}`}
            position={[-0.07, 0.002, 0.045]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.007, 0.007, 0.007]}
            color="#000000"
            align="left"
            anchorY="middle"
            maxWidth={0.18 / 0.007}
            quadWidth={1}
            quadHeight={1}
            letterSpacing={-0.2}
          />
        )}
      </group>

      {/* Right: Channels + Play/Pause */}
      <group position={[0.09, 0, 0.001]}>
        <BitmapText
          text="CHANNELS"
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

        {/* 5 channel buttons (or however many you pass) */}
        <group position={[-0.02, 0.001, -0.025]}>
          {channels.map((ch, index) => {
            const zOffset = index * 0.022;
            const loopCount = ch.loops?.length ?? 0;
            const label = `CH${index + 1}`;

            return (
              <group key={ch.id ?? index} position={[0, 0, zOffset]}>
                <Button
                  label={label}
                  length={0.02}
                  width={0.09}
                  onPressed={() => {
                    if (selectedLoopId && onAssignLoopToChannel) {
                      onAssignLoopToChannel(index, selectedLoopId);
                    }
                  }}
                />
              </group>
            );
          })}
        </group>

        {/* Play / Pause button for the whole composition */}
        <group position={[0.1, 0.001, 0.05]}>
          <Button
            label={isPlaying ? 'Pause' : 'Play'}
            length={0.02}
            width={0.08}
            onPressed={onTogglePlay}
          />
        </group>
      </group>
    </group>
  );
}
