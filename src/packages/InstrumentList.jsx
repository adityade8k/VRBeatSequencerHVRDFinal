// packages/InstrumentList.jsx
import { useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Button from '../components/Button';
import BitmapText from '../components/bitmapText';
import { useDisposable } from '../hooks/useDisposable.js';

export default function InstrumentList({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],

  instruments = [],          // [{ id, adsr, duration, gain, waveType }]
  selectedId = null,
  visibleCount = 4,
  onSelectInstrument,        // (instrument) => void
}) {
  const [scrollIndex, setScrollIndex] = useState(0);

  const clampedScrollIndex = useMemo(() => {
    if (instruments.length <= visibleCount) return 0;
    return Math.min(
      Math.max(0, scrollIndex),
      Math.max(0, instruments.length - visibleCount)
    );
  }, [scrollIndex, instruments.length, visibleCount]);

  const handleScrollUp = useCallback(() => {
    setScrollIndex((prev) => {
      const next = Math.max(0, prev - 1);
      console.log('scroll up ->', next);
      return next;
    });
  }, []);

  const handleScrollDown = useCallback(() => {
    setScrollIndex((prev) => {
      const maxIndex = Math.max(0, instruments.length - visibleCount);
      const next = Math.min(prev + 1, maxIndex);
      console.log('scroll down ->', next);
      return next;
    });
  }, [instruments.length, visibleCount]);

  const visibleInstruments = useMemo(() => {
    return instruments.slice(
      clampedScrollIndex,
      clampedScrollIndex + visibleCount
    );
  }, [instruments, clampedScrollIndex, visibleCount]);

  // Background plate behind the list (disposable)
  const plateWidth = 0.14;
  const plateHeight = 0.12;

  const plateGeo = useDisposable(
    () => new THREE.PlaneGeometry(plateWidth, plateHeight),
    [plateWidth, plateHeight]
  );

  const plateMat = useDisposable(
    () =>
      new THREE.MeshStandardMaterial({
        color: 'rgba(188, 193, 250, 1)',
        roughness: 0.9,
        metalness: 0.0,
      }),
    []
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* background plate */}
      <mesh
        geometry={plateGeo}
        material={plateMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.01, 0, 0]}
        receiveShadow
      />

      {/* title */}
      <BitmapText
        text="INSTRUMENTS"
        position={[-0.072, 0.002, -0.0455]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.012, 0.012, 0.012]}
        color="#000000"
        align="left"
        anchorY="middle"
        maxWidth={0.14 / 0.012}
        quadWidth={1}
        quadHeight={1}
        letterSpacing={-0.3}
      />

      {/* Scroll buttons - moved OUTSIDE the list z-range to avoid overlap */}
      <group position={[0.035, 0.002, -0.028]}>
        <Button
          scale={[0.7, 0.7, 0.7]}
          label="up"
          length={0.02}
          width={0.04}
          onPressed={handleScrollUp}
        />
      </group>

      <group position={[0.035, 0.002, 0.043]}>
        <Button
          scale={[0.7, 0.7, 0.7]}
          label="down"
          length={0.02}
          width={0.04}
          onPressed={handleScrollDown}
        />
      </group>

      {/* Instrument rows */}
      {/* Keep the rows closer to the center so they don't overlap scroll buttons */}
      <group position={[-0.026, 0.001, -0.026]}>
        {visibleInstruments.map((inst, idx) => {
          const isSelected = inst.id === selectedId;
          const zOffset = idx * 0.022;

          return (
            <group key={inst.id} position={[0, 0, zOffset]}>
              <Button
                label={inst.id}
                length={0.02}
                width={0.08}
                baseColor={isSelected ? '#a09bfe' : '#fdb689'}
                keyColor={isSelected ? '#a09bfe' : '#38bdf8'}
                position={[0, 0, 0]}
                onPressed={() => onSelectInstrument?.(inst)}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
}
