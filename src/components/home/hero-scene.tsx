"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Center, ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";

function E21() {
  const { scene } = useGLTF("/models/e21.glb");
  const model = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 1.1;
      }
    });
    return s;
  }, [scene]);
  return (
    <Center top>
      <primitive object={model} />
    </Center>
  );
}

/** Zoom by narrowing the lens (camera.zoom), eased, so Bounds' framing stays intact. */
function ZoomRig({ zoom }: { zoom: number }) {
  useFrame(({ camera }, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.zoom - zoom) < 0.001) return;
    cam.zoom = THREE.MathUtils.damp(cam.zoom, zoom, 10, dt);
    cam.updateProjectionMatrix();
  });
  return null;
}

export default function HeroScene({ rotating, zoom = 1 }: { rotating: boolean; zoom?: number }) {
  useEffect(() => () => useGLTF.clear("/models/e21.glb"), []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [5.5, 1.8, 6.5], fov: 26 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <ambientLight intensity={0.15} />
      <spotLight position={[4, 8, 4]} angle={0.35} penumbra={1} intensity={60} castShadow />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={0.92}>
          <E21 />
        </Bounds>
        <ContactShadows position={[0, 0, 0]} opacity={0.7} scale={14} blur={2.6} far={4} resolution={512} color="#000000" />
        {/* dark studio: softboxes only, no external HDR download */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.2} form="rect" position={[0, 5, -2]} scale={[10, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={1.2} form="rect" position={[-5, 1.5, 1]} scale={[6, 2, 1]} rotation-y={Math.PI / 2} />
          <Lightformer intensity={1.2} form="rect" position={[5, 1.5, -1]} scale={[6, 2, 1]} rotation-y={-Math.PI / 2} />
          <Lightformer intensity={0.6} form="ring" color="#d08d24" position={[0, 2, 6]} scale={3} />
        </Environment>
      </Suspense>
      <ZoomRig zoom={zoom} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        autoRotate={rotating}
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}

useGLTF.preload("/models/e21.glb");
