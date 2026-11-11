"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, Center, ContactShadows, Environment, Lightformer, OrbitControls, useBounds, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";

function Model({ url, onReady }: { url: string; onReady?: () => void }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        // carbon and anodised parts are near-black: a little more reflection than the hero car so edges read
        if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 1.6;
      }
    });
    return s;
  }, [scene]);
  useEffect(() => onReady?.(), [model, onReady]);
  return (
    <Center top>
      <primitive object={model} />
    </Center>
  );
}

/** Re-frames the model whenever resetKey changes (Reset view button). */
function Refit({ resetKey }: { resetKey: number }) {
  const api = useBounds();
  useEffect(() => {
    if (resetKey) api.refresh().clip().fit();
  }, [resetKey, api]);
  return null;
}

/** Zoom by narrowing the lens (camera.zoom), eased, so Bounds' framing stays intact. */
function ZoomRig({ zoom }: { zoom: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [zoom, invalidate]);
  useFrame(({ camera }, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.zoom - zoom) < 0.001) return;
    cam.zoom = THREE.MathUtils.damp(cam.zoom, zoom, 10, dt);
    cam.updateProjectionMatrix();
    invalidate();
  });
  return null;
}

export default function PartScene({
  url, zoom = 1, resetKey = 0, rotating = true, interactive = true, active = true, onReady,
}: { url: string; zoom?: number; resetKey?: number; rotating?: boolean; interactive?: boolean; active?: boolean; onReady?: () => void }) {
  useEffect(() => () => useGLTF.clear(url), [url]);
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={!active ? "never" : rotating ? "always" : "demand"}
      style={interactive ? undefined : { pointerEvents: "none" }}
      camera={{ position: [4, 2.2, 5], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.3;
      }}
    >
      <hemisphereLight args={["#ffffff", "#1a1a1a", 0.9]} />
      <spotLight position={[4, 8, 4]} angle={0.4} penumbra={1} intensity={60} castShadow />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={interactive ? 0.9 : 1.15}>
          <Model url={url} onReady={onReady} />
          <Refit resetKey={resetKey} />
        </Bounds>
        <ContactShadows frames={1} position={[0, 0.002, 0]} opacity={0.6} scale={30} blur={2.4} far={10} resolution={512} color="#000000" />
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={3} form="rect" position={[0, 5, 0]} scale={[10, 6, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={1.6} form="rect" position={[-5, 1.5, 1]} scale={[6, 3, 1]} rotation-y={Math.PI / 2} />
          <Lightformer intensity={1.6} form="rect" position={[5, 1.5, -1]} scale={[6, 3, 1]} rotation-y={-Math.PI / 2} />
          <Lightformer intensity={1.2} form="rect" position={[0, 1.5, 6]} scale={[8, 3, 1]} />
          <Lightformer intensity={1} form="ring" color="#006f66" position={[0, 2, 6]} scale={3} />
        </Environment>
      </Suspense>
      <ZoomRig zoom={zoom} />
      <OrbitControls makeDefault enablePan={false} enableZoom={false} enableRotate={interactive} autoRotate={rotating} autoRotateSpeed={0.8} />
    </Canvas>
  );
}
