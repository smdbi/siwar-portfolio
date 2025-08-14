import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Float, Environment, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

/** Palette close to the mock */
const C = {
  bg: "#0f1722",
  node: "#DFD0B8",
  link: "#C7C9CC",
  seaweed: "#DFD0B8",
  pedestal: "#5c6a80",
  orbit: "#DFD0B8",
};

const toFlat = (vs: THREE.Vector3[]) => {
  const a = new Float32Array(vs.length * 3);
  for (let i = 0; i < vs.length; i++) {
    a[i * 3] = vs[i].x;
    a[i * 3 + 1] = vs[i].y;
    a[i * 3 + 2] = vs[i].z;
  }
  return a;
};

// Fibonacci sphere (slightly pole-offset for better uniformity)
function fibSphere(count: number, r: number) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2; // offset to avoid pole clustering
    const rad = Math.sqrt(1 - y * y);
    const theta = ga * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * rad * r, y * r, Math.sin(theta) * rad * r));
  }
  return pts;
}

/* -------- Camera fitter (keeps scene nicely framed) -------- */
function FitCamera({ radius = 2.7, target = new THREE.Vector3(0, 0.5, 0) }) {
  const { camera, size } = useThree();
  React.useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const fov = THREE.MathUtils.degToRad(cam.fov);
    const dist = (radius * 1.12) / Math.tan(fov / 2); // 1.12=margin
    cam.position.set(0, 1.55, dist);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, radius, target]);
  return null;
}

/* ---------------- Seaweed ---------------- */
function Seaweed({ stems = 5, height = 1.25, radius = 0.44, tips }: {
  stems?: number; height?: number; radius?: number; tips: React.MutableRefObject<THREE.Vector3[]>;
}) {
  const seeds = React.useMemo(() => [...Array(stems)].map((_, i) => 400 + i * 11.17 + Math.random()), [stems]);
  return (
    <group>
      {seeds.map((s, i) => (
        <SeaweedStem key={i} seed={s} height={height * (0.92 + Math.random() * 0.3)} radius={radius * (0.85 + Math.random() * 0.35)} index={i} tips={tips} />
      ))}
    </group>
  );
}
function SeaweedStem({ seed, height, radius, index, tips }: {
  seed: number; height: number; radius: number; index: number; tips: React.MutableRefObject<THREE.Vector3[]>;
}) {
  const ref = React.useRef<any>(null);
  const pts = React.useRef([...Array(46)].map(() => new THREE.Vector3())).current;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < pts.length; i++) {
      const y = (i / (pts.length - 1)) * height;
      const sway = Math.sin((y * 2.0 + t * 1.05 + seed) * 0.9) * 0.20 + Math.sin(t * 0.5 + seed) * 0.10;
      const taper = radius * (0.6 + 0.4 * (1 - i / (pts.length - 1)));
      pts[i].set(Math.sin(sway) * taper, y, Math.cos(sway) * taper);
    }
    const g = ref.current?.geometry;
    if (g?.setPositions) g.setPositions(toFlat(pts));
    tips.current[index].copy(pts[pts.length - 1]);
  });

  return (
    <Line
      ref={ref}
      points={pts}
      color={C.seaweed}
      lineWidth={3.2}
      transparent
      opacity={0.9}
      toneMapped={false}
    />
  );
}

/* ---------------- Constellation ---------------- */
function Constellation({ count = 38, radius = 1.55, neighbors = 2, outPositions, groupRef }: {
  count?: number; radius?: number; neighbors?: number;
  outPositions: React.MutableRefObject<THREE.Vector3[]>; groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const inst = React.useRef<THREE.InstancedMesh>(null!);
  const pts = React.useMemo(() => fibSphere(count, radius), [count, radius]);

  React.useEffect(() => { outPositions.current = pts.map((p) => p.clone()); }, [pts, outPositions]);

  const edges = React.useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < pts.length; i++) {
      const d = pts.map((p, j) => [j, pts[i].distanceTo(p)] as const).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, neighbors);
      for (const [j] of d) lines.push([pts[i], pts[j]]);
    }
    return lines;
  }, [pts, neighbors]);

  React.useEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pts.length; i++) { dummy.position.copy(pts[i]); dummy.updateMatrix(); inst.current.setMatrixAt(i, dummy.matrix); }
    inst.current.instanceMatrix.needsUpdate = true;
  }, [pts]);

  // Gentle idle rotate
  useFrame((s) => { if (groupRef.current) groupRef.current.rotation.y = s.clock.getElapsedTime() * 0.05; });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={inst} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[0.042, 0]} />
        <meshStandardMaterial
          color={C.node}
          emissive={C.node}
          emissiveIntensity={0.5}
          roughness={0.45}
          metalness={0.05}
          toneMapped={false}
        />
      </instancedMesh>

      {edges.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={C.link} lineWidth={0.8} transparent opacity={0.12} toneMapped={false} />
      ))}
    </group>
  );
}

/* ---------------- Curved links + pulses ---------------- */
function CurvedLinks({ tips, nodes, perTip = 1 }: {
  tips: React.MutableRefObject<THREE.Vector3[]>; nodes: React.MutableRefObject<THREE.Vector3[]>; perTip?: number;
}) {
  const lineRefs = React.useRef<any[]>([]);
  const pulseRefs = React.useRef<THREE.Mesh[]>([]);
  const targetIdx = React.useRef<number[]>([]);
  const speeds = React.useRef<number[]>([]);
  const tVals = React.useRef<number[]>([]);
  const curve = React.useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()), []);
  const tmpPts = React.useMemo(() => [...Array(38)].map(() => new THREE.Vector3()), []);
  const N = React.useMemo(() => tips.current.length * perTip, [tips, perTip]);

  React.useEffect(() => {
    const arr = nodes.current;
    targetIdx.current = Array.from({ length: N }, () => Math.floor(Math.random() * arr.length));
    speeds.current = Array.from({ length: N }, () => 0.35 + Math.random() * 0.5);
    tVals.current = Array.from({ length: N }, () => Math.random());
  }, [N, nodes]);

  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), pc = new THREE.Vector3(), tmp = new THREE.Vector3();

  useFrame((st) => {
    const T = st.clock.getDelta() * 0.32;
    let k = 0;
    for (let i = 0; i < tips.current.length; i++) {
      for (let j = 0; j < perTip; j++, k++) {
        const a = tips.current[i];
        const b = nodes.current[targetIdx.current[k] ?? 0];

        p0.copy(a); p1.copy(b);
        pc.copy(p0).add(p1).multiplyScalar(0.5); pc.y += 0.6;

        curve.v0.copy(p0); curve.v1.copy(pc); curve.v2.copy(p1);
        for (let n = 0; n < tmpPts.length; n++) curve.getPoint(n / (tmpPts.length - 1), tmpPts[n]);

        const line = lineRefs.current[k] as any;
        const g = line?.geometry; if (g?.setPositions) g.setPositions(toFlat(tmpPts));

        tVals.current[k] = (tVals.current[k] + speeds.current[k] * T) % 1;
        const pulse = pulseRefs.current[k];
        if (pulse) { curve.getPoint(tVals.current[k], tmp); pulse.position.copy(tmp); }
      }
    }
  });

  return (
    <group>
      {[...Array(N)].map((_, k) => (
        <group key={k}>
          <Line ref={(r: any) => (lineRefs.current[k] = r)} points={[new THREE.Vector3(), new THREE.Vector3()]} color={C.link} lineWidth={0.9} transparent opacity={0.28} toneMapped={false} />
          <mesh ref={(r) => r && (pulseRefs.current[k] = r)}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshStandardMaterial color={C.node} emissive={C.node} emissiveIntensity={0.8} roughness={0.3} metalness={0.1} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------------- Orbit rings ---------------- */
function Orbits({ radii = [2.0, 2.3, 2.6], tilt = 0.46, n = 200 }: { radii?: number[]; tilt?: number; n?: number; }) {
  const grp = React.useRef<THREE.Group>(null!);
  const rings = React.useMemo(() =>
    radii.map((r, i) => {
      const a = r, b = r * (i % 2 === 0 ? 0.78 : 0.92);
      const euler = new THREE.Euler(tilt + i * 0.07, 0, (i % 2 ? 0.35 : -0.25));
      return [...Array(n)].map((_, k) => {
        const t = (k / n) * Math.PI * 2;
        return new THREE.Vector3(a * Math.cos(t), 0, b * Math.sin(t)).applyEuler(euler);
      });
    }), [radii, tilt, n]
  );
  useFrame((s) => { if (grp.current) grp.current.rotation.y = s.clock.getElapsedTime() * 0.04; });
  return (
    <group ref={grp}>
      {rings.map((pts, i) => (
        <Line key={i} points={pts} color={C.orbit} lineWidth={0.8} transparent opacity={0.09} toneMapped={false} />
      ))}
    </group>
  );
}

/* ---------------- Plinth ---------------- */
function Pedestal() {
  return (
    <mesh position={[0, -0.7, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.28, 1.28, 0.18, 80]} />
      <meshStandardMaterial color={C.pedestal} roughness={0.8} metalness={0.08} />
    </mesh>
  );
}

/* ---------------- Scene ---------------- */
function Scene() {
  const tipsRef = React.useRef([...Array(5)].map(() => new THREE.Vector3()));
  const nodePositions = React.useRef<THREE.Vector3[]>([]);
  const constelRef = React.useRef<THREE.Group | null>(null);

  return (
    <>
      <FitCamera radius={2.7} />
      {/* No user controls -> static hero composition like the mock */}
      <group position-y={0.1} scale={1.0}>
        <Float floatIntensity={0.6} rotationIntensity={0.25} speed={1.0}>
          <Pedestal />
          <Seaweed tips={tipsRef} />
        </Float>

        <group position={[0, 0.72, 0]}>
          <Constellation groupRef={constelRef as any} outPositions={nodePositions} count={38} radius={1.55} neighbors={2} />
          <Orbits />
          <CurvedLinks tips={tipsRef} nodes={nodePositions} perTip={1} />
        </group>

        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 3, 2]} intensity={0.95} castShadow />
        <Environment preset="city" />
        <ContactShadows position={[0, -0.7, 0]} opacity={0.22} scale={4.2} blur={2.6} far={2.6} />
      </group>
    </>
  );
}

/* ---------------- Card wrapper ---------------- */
export default function SeaweedDataGarden({
  height = 560,
  background = C.bg,
  caption = "Seaweed Data Garden — modern optimized look",
  showLive = true,
}: {
  height?: number; background?: string; caption?: string; showLive?: boolean;
}) {
  return (
    <div style={{
      position: "relative", width: "100%", height,
      background, borderRadius: 18, overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.06)",
      boxShadow: "0 10px 40px rgba(0,0,0,0.35) inset, 0 10px 30px rgba(0,0,0,0.25)",
      isolation: "isolate",
    }}>
      {showLive && (
        <div style={{
          position: "absolute", left: 18, top: 16, padding: "6px 12px",
          fontSize: 12, letterSpacing: 1, borderRadius: 999,
          background: "rgba(0,255,200,0.12)", color: "rgba(160,255,235,0.95)",
          border: "1px solid rgba(140,240,220,0.25)", zIndex: 2, userSelect: "none",
        }}>LIVE</div>
      )}
      <div style={{ position: "absolute", right: 18, top: 16, display: "flex", gap: 6, zIndex: 2 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(200,210,220,0.28)" }} />)}
      </div>

      {/* radial vignette for depth */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(80% 60% at 50% 45%, rgba(12,20,28,0) 0%, rgba(12,20,28,0) 60%, rgba(0,0,0,0.35) 100%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      <Canvas
        dpr={[1, 1.75]}
        shadows
        // default camera; FitCamera computes a good distance from FOV
        camera={{ fov: 38, near: 0.1, far: 100 }}
      >
        <color attach="background" args={[background]} />
        <Scene />
        <EffectComposer>
          <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.35} luminanceSmoothing={0.2} />
        </EffectComposer>
      </Canvas>

      {caption && (
        <div style={{
          position: "absolute", left: 20, right: 20, bottom: 18,
          color: "rgba(230,235,240,0.92)", fontSize: 18, fontWeight: 600,
          textShadow: "0 2px 8px rgba(0,0,0,0.6)", userSelect: "none",
        }}>{caption}</div>
      )}
    </div>
  );
}
