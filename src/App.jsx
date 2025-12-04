// App.jsx
import { useState } from 'react'
import SceneCanvas from './components/sceneCanvas/index.jsx'
import { store } from './components/xr/xrStore.js'

export default function App() {
  return (
    <>
      <div style={{ position: 'fixed', zIndex: 10, padding: 12 }}>
        <button onClick={() => store.enterVR()}>Enter VR</button>
      </div>
      <SceneCanvas store={store} />
    </>
  )
}
