import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Environment, PresentationControls, Float, ContactShadows } from "@react-three/drei";

const PALETTE = {
  bg: "#0f1722",      // slightly darker looks cleaner when zoomed out
  node: "#DFD0B8",
  seaweed: "#c7b8a7", // a hair lighter
  link: "#DFD0B8",
  linkDim: "#9aa2a6",
  base: "#5a6478",    // slightly lighter base so it separates from bg
};

function fibonacciSpherePoints(count: number, radius: number) {
  const pts: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius));
  }
  return pts;
}

function toFlat(pts: THREE.Vector3[]) {
  const arr = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const v = pts[i];
    arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z;
  }
  return arr;
}

/* ---------- Seaweed ---------- */
function AnimatedSeaweed({
  strands = 6,
  height = 1.05,              // was 1.2 → slightly shorter
  radius = 0.40,              // was 0.45 → slimmer
  tipRefs,
}: {
  strands?: number; height?: number; radius?: number;
  tipRefs: React.MutableRefObject<THREE.Vector3[]>;
}) {
  const seeds = React.useMemo(() => new Array(strands).fill(0).map((_, i) => Math.random() * 1000 + i * 13.37), [strands]);
  return (
    <group>
      {seeds.map((seed, i) => (
        <SeaweedStrand
          key={i}
          seed={seed}
          height={height * (0.85 + Math.random() * 0.35)}
          radius={radius * (0.75 + Math.random() * 0.5)}
          tipRefIndex={i}
          tipRefs={tipRefs}
        />
      ))}
    </group>
  );
}

function SeaweedStrand({
  seed, height, radius, tipRefIndex, tipRefs,
}: {
  seed: number; height: number; radius: number;
  tipRefIndex: number; tipRefs: React.MutableRefObject<THREE.Vector3[]>;
}) {
  const ref = React.useRef<any>(null);
  const ptsRef = React.useRef(new Array(36).fill(0).map(() => new THREE.Vector3()));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pts = ptsRef.current;
    for (let i = 0; i < pts.length; i++) {
      const y = (i / (pts.length - 1)) * height;
      const sway = Math.sin((y * 2.3 + t * 1.1 + seed) * 0.9) * 0.22 + Math.sin((t * 0.6 + seed) * 0.7) * 0.12;
      const taper = radius * (0.55 + 0.45 * (1 - i / (pts.length - 1)));
      pts[i].set(Math.sin(sway) * taper, y, Math.cos(sway) * taper);
    }
    const geo = ref.current?.geometry;
    if (geo && typeof geo.setPositions === "function") geo.setPositions(toFlat(pts));
    tipRefs.current[tipRefIndex].copy(pts[pts.length - 1]);
  });

  return <Line ref={ref} points={ptsRef.current} color={PALETTE.seaweed} lineWidth={2.6} transparent opacity={0.95} />;
}

/* ---------- Constellation ---------- */
function Constellation({
  count = 95,
  radius = 1.65,                // was 1.8 → tighter cluster (reads smaller)
  neighborLinks = 2,
  groupRef,
  outPositionsRef,
}: {
  count?: number; radius?: number; neighborLinks?: number;
  groupRef: React.RefObject<THREE.Group>;
  outPositionsRef: React.MutableRefObject<THREE.Vector3[]>;
}) {
  const instRef = React.useRef<THREE.InstancedMesh>(null!);
  const points = React.useMemo(() => fibonacciSpherePoints(count, radius), [count, radius]);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  const edges = React.useMemo(() => {
    const links: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const nearest = points.map((q, idx) => ({ idx, d: p.distanceTo(q) }))
        .filter((o) => o.idx !== i).sort((a, b) => a.d - b.d).slice(0, neighborLinks);
      nearest.forEach((o) => { if (o.idx > i) links.push([p, points[o.idx]]); });
    }
    return links;
  }, [points, neighborLinks]);

  React.useEffect(() => {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      dummy.position.copy(p);
      dummy.scale.setScalar(0.026 + Math.random() * 0.045);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    }
    instRef.current.instanceMatrix.needsUpdate = true;
    outPositionsRef.current = points;
  }, [points, dummy, outPositionsRef]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.45;
      groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instRef} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={PALETTE.node} roughness={0.4} metalness={0.05} />
      </instancedMesh>
      {edges.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={PALETTE.linkDim} lineWidth={0.9} transparent opacity={0.2} />
      ))}
    </group>
  );
}

/* ---------- Links with pulses ---------- */
function LinksWithPulses({
  tipRefs, nodePositionsRef, linksPerTip = 1,
}: {
  tipRefs: React.MutableRefObject<THREE.Vector3[]>;
  nodePositionsRef: React.MutableRefObject<THREE.Vector3[]>;
  linksPerTip?: number;
}) {
  const lineRefs = React.useRef<any[]>([]);
  const pulseRefs = React.useRef<THREE.Mesh[]>([]);
  const targetIndices = React.useRef<number[]>([]);
  const speeds = React.useRef<number[]>([]);
  const tVals = React.useRef<number[]>([]);
  const curve = React.useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
  ), []);
  const pts = React.useMemo(() => new Array(40).fill(0).map(() => new THREE.Vector3()), []);
  const p0 = React.useMemo(() => new THREE.Vector3(), []),
        p1 = React.useMemo(() => new THREE.Vector3(), []),
        pc = React.useMemo(() => new THREE.Vector3(), []),
        tmp = React.useMemo(() => new THREE.Vector3(), []);

  const tipCount = tipRefs.current.length || 6;
  const linkCount = tipCount * linksPerTip;

  React.useEffect(() => {
    const tips = tipRefs.current, nodes = nodePositionsRef.current;
    if (!tips.length || !nodes.length) return;

    lineRefs.current = new Array(linkCount);
    pulseRefs.current = new Array(linkCount);
    targetIndices.current = new Array(linkCount);
    speeds.current = new Array(linkCount);
    tVals.current = new Array(linkCount);

    let k = 0;
    for (let i = 0; i < tips.length; i++) {
      const nearest = nodes.map((p, idx) => ({ idx, d: p.distanceTo(tips[i]) }))
        .sort((a, b) => a.d - b.d).slice(0, linksPerTip);
      for (let j = 0; j < linksPerTip; j++, k++) {
        targetIndices.current[k] = nearest[j]?.idx ?? Math.floor(Math.random() * nodes.length);
        speeds.current[k] = 0.45 + Math.random() * 0.45;
        tVals.current[k] = Math.random();
      }
    }
  }, [linkCount, linksPerTip, nodePositionsRef, tipRefs]);

  useFrame((state) => {
    const tips = tipRefs.current, nodes = nodePositionsRef.current;
    if (!tips.length || !nodes.length) return;

    let k = 0;
    for (let i = 0; i < tips.length; i++) {
      for (let j = 0; j < linksPerTip; j++, k++) {
        const tip = tips[i], target = nodes[targetIndices.current[k] ?? 0];
        p0.copy(tip); p1.copy(target); pc.copy(p0).add(p1).multiplyScalar(0.5); pc.y += 0.6;
        curve.v0.copy(p0); curve.v1.copy(pc); curve.v2.copy(p1);

        for (let n = 0; n < pts.length; n++) {
          const t = n / (pts.length - 1);
          curve.getPoint(t, pts[n]);
        }

        const line = lineRefs.current[k] as any;
        const geo = line?.geometry;
        if (geo && typeof geo.setPositions === "function") geo.setPositions(toFlat(pts));

        tVals.current[k] += speeds.current[k] * state.clock.getDelta() * 0.35;
        if (tVals.current[k] > 1) tVals.current[k] -= 1;
        const pulse = pulseRefs.current[k];
        if (pulse) { curve.getPoint(tVals.current[k], tmp); pulse.position.copy(tmp); }
      }
    }
  });

  return (
    <group>
      {new Array(linkCount).fill(0).map((_, k) => (
        <group key={k}>
          <Line
            ref={(r: any) => (lineRefs.current[k] = r)}
            points={[new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]}
            color={PALETTE.link}
            lineWidth={1.8}
            transparent
            opacity={0.7}
          />
          <mesh ref={(m) => (pulseRefs.current[k] = m!)} scale={0.045}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial emissive={PALETTE.node} emissiveIntensity={1.0} color={PALETTE.node} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- Base ---------- */
function Base() {
  return (
    <mesh position={[0, -0.6, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.4, 64]} />  {/* smaller base */}
      <meshStandardMaterial color={PALETTE.base} roughness={0.9} />
    </mesh>
  );
}

/* ---------- Scene ---------- */
function Scene({ scale = 0.6, offsetY = -0.12 }: { scale?: number; offsetY?: number }) {
  const root = React.useRef<THREE.Group>(null!);
  const constellationRef = React.useRef<THREE.Group>(null!);
  const tipRefs = React.useRef<THREE.Vector3[]>(new Array(6).fill(0).map(() => new THREE.Vector3()));
  const nodePositionsRef = React.useRef<THREE.Vector3[]>([]);
  const jitter = React.useRef(0);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    root.current.position.y = offsetY + Math.sin(t * 0.9) * 0.035;
    if (jitter.current > 0.0001) {
      const j = jitter.current;
      root.current.rotation.x += (Math.random() - 0.5) * j;
      root.current.rotation.z += (Math.random() - 0.5) * j;
      jitter.current *= 0.9;
    }
  });

  return (
    <PresentationControls global azimuth={[-0.7, 0.7]} polar={[-0.2, 0.5]} snap>
      <group ref={root} scale={scale} onClick={() => (jitter.current = 0.07)}>
        <Float floatIntensity={0.7} rotationIntensity={0.35} speed={1.1}>
          <Base />
          <AnimatedSeaweed tipRefs={tipRefs} />
        </Float>
        <group position={[0, 0.7, 0]}>
          <Constellation groupRef={constellationRef} outPositionsRef={nodePositionsRef} count={95} radius={1.65} neighborLinks={2} />
          <LinksWithPulses tipRefs={tipRefs} nodePositionsRef={nodePositionsRef} linksPerTip={1} />
        </group>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.0} castShadow />
        <Environment preset="city" />
        <ContactShadows position={[0, -0.7, 0]} opacity={0.25} scale={4} blur={2.5} far={2.5} />
      </group>
    </PresentationControls>
  );
}

export default function SeaweedDataGarden({
  height = 520,
  rounded = true,
  background = PALETTE.bg,
  scale = 0.6,
  offsetY = -0.12,
  camera,
}: {
  height?: number;
  rounded?: boolean;
  background?: string;
  scale?: number;
  offsetY?: number;
  camera?: { position?: [number, number, number]; fov?: number };
}) {
  const camPos = camera?.position ?? ([6.0, 2.7, 6.0] as [number, number, number]);
  const fov = camera?.fov ?? 66;

  return (
    <div style={{ width: "100%", height, background, borderRadius: rounded ? 16 : 0 }}>
      <Canvas shadows camera={{ position: camPos, fov }}>
        <color attach="background" args={[background]} />
        <Scene scale={scale} offsetY={offsetY} />
      </Canvas>
    </div>
  );
}
