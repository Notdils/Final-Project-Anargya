"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, Center, ContactShadows, Environment, Lightformer, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export function reportProgress(value: number) {
  (window as unknown as { __anargyaProgress?: number }).__anargyaProgress = value;
  window.dispatchEvent(new CustomEvent("anargya:progress", { detail: value }));
}

const TEAL = new THREE.Color("#006f66");
// Glow is light, not UI ink: same hue, pushed brighter and kept out of tone mapping.
const GLOW = TEAL.clone().multiplyScalar(1.9);

function E21({ onSize }: { onSize: (s: THREE.Vector3) => void }) {
  const { scene } = useGLTF("/models/e21.glb");
  const model = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.45; // low reflections: the car reads as a silhouette with lit edges
      }
    });
    return s;
  }, [scene]);
  useEffect(() => onSize(new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())), [model, onSize]);
  return (
    <Center top>
      <primitive object={model} />
    </Center>
  );
}

/** Radial halo drawn once into a canvas: brightest at the rim, fading both ways. */
function useHalo() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    const t = `${Math.round(GLOW.r * 255)}, ${Math.round(GLOW.g * 255)}, ${Math.round(GLOW.b * 255)}`;
    r.addColorStop(0, `rgba(${t}, 0.10)`);
    r.addColorStop(0.55, `rgba(${t}, 0.04)`);
    r.addColorStop(0.7, `rgba(${t}, 0.55)`);
    r.addColorStop(0.76, `rgba(${t}, 0.18)`);
    r.addColorStop(1, `rgba(${t}, 0)`);
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Display plinth under the car: dark disc, lit teal rim, soft floor glow. */
function Platform({ radius }: { radius: number }) {
  const halo = useHalo();
  const h = radius * 0.035;
  return (
    <group>
      <mesh position={[0, -h / 2, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.01, h, 96]} />
        <meshStandardMaterial color="#070707" metalness={0.3} roughness={0.75} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.002, 0]}>
        <torusGeometry args={[radius * 0.995, radius * 0.006, 12, 160]} />
        <meshBasicMaterial color={GLOW} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -h - 0.002, 0]}>
        <planeGeometry args={[radius * 2.7, radius * 2.7]} />
        <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
        <ringGeometry args={[radius * 0.9, radius * 0.995, 128]} />
        <meshBasicMaterial color={GLOW} transparent opacity={0.08} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Fades every material inside to `show` (0 or 1) and hides the group once invisible. */
function FadeGroup({ show, children }: { show: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const level = useRef(show ? 1 : 0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [show, invalidate]);
  useFrame((_, dt) => {
    const g = ref.current;
    const target = show ? 1 : 0;
    if (!g || Math.abs(level.current - target) < 0.002) return;
    level.current = THREE.MathUtils.damp(level.current, target, 6, dt);
    if (Math.abs(level.current - target) < 0.002) level.current = target;
    g.visible = level.current > 0;
    g.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!mat) return;
      mat.userData.baseOpacity ??= mat.opacity;
      mat.transparent = true;
      mat.opacity = mat.userData.baseOpacity * level.current;
    });
    invalidate();
  });
  return <group ref={ref}>{children}</group>;
}

/** Tighter framing on wide screens; portrait screens need room so the nose and wing stay in view.
 *  Immersive mode frames the car alone, larger, in the middle of the full screen. */
function Framed({ immersive, children }: { immersive: boolean; children: React.ReactNode }) {
  const aspect = useThree((st) => st.size.width / st.size.height);
  const margin = immersive ? (aspect < 1.2 ? 1.2 : 0.8) : aspect < 1.2 ? 1.02 : 0.9; // card on About (4:3): keep the wings inside
  return (
    <Bounds fit observe margin={margin} maxDuration={0.8}>
      {children}
    </Bounds>
  );
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
    invalidate(); // keep easing while on demand
  });
  return null;
}

export default function HeroScene({
  rotating,
  zoom = 1,
  active = true,
  immersive = false,
}: {
  rotating: boolean;
  zoom?: number;
  active?: boolean;
  immersive?: boolean;
}) {
  useEffect(() => () => useGLTF.clear("/models/e21.glb"), []);
  const [size, setSize] = useState<THREE.Vector3 | null>(null);
  // Real download progress for the splash preloader; 100 only once the car is actually in the scene.
  const progress = useProgress((s) => s.progress);
  useEffect(() => reportProgress(size ? 100 : Math.min(progress, 99)), [progress, size]);
  return (
    <Canvas
      dpr={[1, 1.5]}
      // Render continuously only while auto-rotating on screen; otherwise only on interaction.
      frameloop={!active ? "never" : rotating ? "always" : "demand"}
      camera={{ position: [5.5, 1.8, 6.5], fov: 26 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
      }}
    >
      <ambientLight intensity={0.08} />
      <spotLight position={[4, 8, 4]} angle={0.35} penumbra={1} intensity={45} castShadow />
      {/* faint teal underglow from the plinth rim */}
      <pointLight position={[0, 0.25, 0]} color="#006f66" intensity={6} distance={6} decay={2} />
      <Suspense fallback={null}>
        {/* platform sits outside Bounds so the camera frames the car, not the plinth */}
        <Framed immersive={immersive}>
          <E21 onSize={setSize} />
        </Framed>
        {size && (
          <FadeGroup show={!immersive}>
            <Platform radius={Math.max(size.x, size.z) * 0.56} />
          </FadeGroup>
        )}
        <ContactShadows frames={1} position={[0, 0.004, 0]} opacity={0.7} scale={14} blur={2.6} far={4} resolution={512} color="#000000" />
        {/* dark studio: softboxes only, no external HDR download */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={1.3} form="rect" position={[0, 5, -2]} scale={[10, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={0.45} form="rect" position={[-5, 1.5, 1]} scale={[6, 2, 1]} rotation-y={Math.PI / 2} />
          <Lightformer intensity={0.45} form="rect" position={[5, 1.5, -1]} scale={[6, 2, 1]} rotation-y={-Math.PI / 2} />
          <Lightformer intensity={0.9} form="ring" color="#006f66" position={[0, 2, 6]} scale={3} />
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
