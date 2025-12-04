// components/XRAxesDebug.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXRStore } from '@react-three/xr';
import BitmapText from '../components/bitmapText';

export default function XRAxesDebug({
  position = [0, 0.1, -0.3],
  scale = [0.02, 0.02, 0.02],
}) {
  const xrStore = useXRStore();
  const textRef = useRef();

  useFrame(() => {
    if (!xrStore || !textRef.current) return;

    const state = xrStore.getState?.();
    if (!state || !state.session || !Array.isArray(state.inputSources)) {
      textRef.current.text = 'no session';
      return;
    }

    const right = state.inputSources.find(
      (s) => s.handedness === 'right' && s.inputSource?.gamepad
    );
    const axes = right?.inputSource?.gamepad?.axes || [];

    textRef.current.text = `axes: ${axes.map(a => a.toFixed(2)).join(', ')}`;
  });

  return (
    <BitmapText
      ref={textRef}
      text="axes: --"
      position={position}
      rotation={[0, 0, 0]}
      scale={scale}
      color="#ffffff"
      align="center"
      anchorY="middle"
      letterSpacing={-0.05}
    />
  );
}
