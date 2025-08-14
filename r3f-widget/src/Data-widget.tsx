import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Line,
  Environment,
  PresentationControls,
  Float,
  ContactShadows,
  AdaptiveDpr,
  Html,
  Preload,
} from "@react-three/drei";

/* ------------------------------- Palette ------------------------------- */
const PALETTE = {
  bg: "#0f1722",
  node: "#DFD0B8",
  seaweed: "#c7b8a7",
  link: "#DFD0B8",
  linkDim: "#9aa2a6",
  base: "#5a6478",
} as const;

/* ------------------------------- Utils -------------------------------- */
function fibonacciSpherePoints(count: number, radius: number) {
  const pts: THREE.Vector3[] = new Array(count);
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts[i] = new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius);
  }
  return pts;
}

const toFlat = (pts: THREE.Vector3[], out?: Float32Array) => {
  const arr = out ?? new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const v = pts[i]; const k = i * 3;
    arr[k] = v.x; arr[k + 1] = v.y; arr[k + 2] = v.z;
  }
  return arr;
};

// Shared temp vectors to avoid GC inside frames
const TMP = { v0: new THREE.Vector3(), v1: new THREE.Vector3(), v2: new THREE.Vector3(), v3: new THREE.Vector3() };

function useReducedMotion(): boolean {
  const [pref, setPref] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const on = () => setPref(!!m?.matches); on(); m?.addEventListener?.("change", on);
    return () => m?.removeEventListener?.("change", on);
  }, []);
  return pref;
}

/* ----------------------------- Seaweed ------------------------------- */
const AnimatedSeaweed: React.FC<{
  strands?: number; height?: number; radius?: number;
  tipRefs: React.MutableRefObject<THREE.Vector3[]>;
}> = React.memo(({ strands = 7, height = 1.25, radius = 0.36, tipRefs }) => {
  // slightly more / taller / slimmer than v1
  const seeds = React.useMemo(
    () => new Array(strands).fill(0).map((_, i) => Math.random() * 1000 + i * 13.37),
    [strands]
  );
  return (
    <group>
      {seeds.map((seed, i) => (
        <SeaweedStrand
          key={i}
          seed={seed}
          height={height * (0.9 + Math.random() * 0.25)}
          radius={radius * (0.8 + Math.random() * 0.45)}
          tipRefIndex={i}
          tipRefs={tipRefs}
        />
      ))}
    </group>
  );
});

const SeaweedStrand: React.FC<{
  seed: number; height: number; radius: number;
  tipRefIndex: number; tipRefs: React.MutableRefObject<THREE.Vector3[]>;
}> = ({ seed, height, radius, tipRefIndex, tipRefs }) => {
  const ref = React.useRef<any>(null);
  const ptsRef = React.useRef(new Array(38).fill(0).map(() => new THREE.Vector3()));
  const reduced = useReducedMotion();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pts = ptsRef.current;
    const speed = reduced ? 0.15 : 1;
    for (let i = 0; i < pts.length; i++) {
      const y = (i / (pts.length - 1)) * height;
      const sway = Math.sin((y * 2.2 + t * 1.05 * speed + seed) * 0.9) * 0.22
                 + Math.sin((t * 0.55 * speed + seed) * 0.7) * 0.12;
      const taper = radius * (0.5 + 0.5 * (1 - i / (pts.length - 1)));
      pts[i].set(Math.sin(sway) * taper, y, Math.cos(sway) * taper);
    }
    const geo = ref.current?.geometry;
    if (geo?.setPositions) geo.setPositions(toFlat(pts));
    tipRefs.current[tipRefIndex].copy(pts[pts.length - 1]);
  });

  return <Line ref={ref} points={ptsRef.current} color={PALETTE.seaweed} lineWidth={2.6} transparent opacity={0.96} />;
};

/* --------------------------- Constellation ---------------------------- */
const Constellation: React.FC<{
  count?: number; radius?: number; neighborLinks?: number;
  groupRef: React.RefObject<THREE.Group>;
  outPositionsRef: React.MutableRefObject<THREE.Vector3[]>;
}> = React.memo(({ count = 90, radius = 1.55, neighborLinks = 2, groupRef, outPositionsRef }) => {
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
      dummy.scale.setScalar(0.05); // bigger nodes for mock look (without Bloom)
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    }
    instRef.current.instanceMatrix.needsUpdate = true;
    outPositionsRef.current = points;
  }, [points, dummy, outPositionsRef]);

  const reduced = useReducedMotion();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      const k = reduced ? 0.3 : 0.45;
      groupRef.current.rotation.y = t * k;
      groupRef.current.rotation.x = Math.sin(t * k) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instRef} args={[undefined as any, undefined as any, count]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={PALETTE.node}
          emissive={PALETTE.node}
          emissiveIntensity={0.35}
          roughness={0.4}
          metalness={0.08}
        />
      </instancedMesh>
      {edges.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={PALETTE.linkDim} lineWidth={0.9} transparent opacity={0.18} />
      ))}
    </group>
  );
});

/* ------------------------------ Orbit rings --------------------------- */
function ellipsePoints(rx: number, ry: number, tiltRad: number, count = 120) {
  const pts: THREE.Vector3[] = [];
  const rot = new THREE.Euler(0, 0, tiltRad);
  const v = new THREE.Vector3();
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * Math.PI * 2;
    v.set(Math.cos(t) * rx, Math.sin(t) * ry, 0).applyEuler(rot);
    pts.push(v.clone());
  }
  return pts;
}

const Orbits: React.FC<{ r?: number }> = ({ r = 1.75 }) => {
  const a = ellipsePoints(r, r * 0.85, 0.25);
  const b = ellipsePoints(r * 0.95, r * 0.75, -0.35);
  const c = ellipsePoints(r * 0.9, r, 0.1);
  return (
    <group>
      {[a, b, c].map((pts, i) => (
        <Line key={i} points={pts} color={PALETTE.linkDim} lineWidth={0.8} transparent opacity={0.12} />
      ))}
    </group>
  );
};

/* ------------------------------- Links -------------------------------- */
const LinksWithPulses: React.FC<{
  tipRefs: React.MutableRefObject<THREE.Vector3[]>;
  nodePositionsRef: React.MutableRefObject<THREE.Vector3[]>;
  linksPerTip?: number;
}> = ({ tipRefs, nodePositionsRef, linksPerTip = 1 }) => {
  const lineRefs = React.useRef<any[]>([]);
  const pulseRefs = React.useRef<THREE.Mesh[]>([]);
  const targetIndices = React.useRef<number[]>([]);
  const speeds = React.useRef<number[]>([]);
  const tVals = React.useRef<number[]>([]);
  const curve = React.useMemo(
    () => new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()),
    []
  );
  const pts = React.useMemo(() => new Array(40).fill(0).map(() => new THREE.Vector3()), []);
  const tipCount = tipRefs.current.length || 7;
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

  const reduced = useReducedMotion();
  useFrame((state) => {
    const tips = tipRefs.current, nodes = nodePositionsRef.current;
    if (!tips.length || !nodes.length) return;
    let k = 0;
    for (let i = 0; i < tips.length; i++) {
      for (let j = 0; j < linksPerTip; j++, k++) {
        const tip = tips[i], target = nodes[targetIndices.current[k] ?? 0];
        TMP.v0.copy(tip);
        TMP.v1.copy(target);
        TMP.v2.copy(TMP.v0).add(TMP.v1).multiplyScalar(0.5);
        TMP.v2.y += 0.6;
        (curve as any).v0.copy(TMP.v0);
        (curve as any).v1.copy(TMP.v2);
        (curve as any).v2.copy(TMP.v1);

        for (let n = 0; n < pts.length; n++) curve.getPoint(n / (pts.length - 1), pts[n]);

        const line = lineRefs.current[k] as any;
        const geo = line?.geometry;
        if (geo?.setPositions) geo.setPositions(toFlat(pts));

        const speed = (reduced ? 0.35 : 1) * speeds.current[k] * state.clock.getDelta() * 0.35;
        tVals.current[k] += speed;
        if (tVals.current[k] > 1) tVals.current[k] -= 1;
        const pulse = pulseRefs.current[k];
        if (pulse) { curve.getPoint(tVals.current[k], TMP.v3); pulse.position.copy(TMP.v3); }
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
            opacity={0.72}
          />
          <mesh ref={(m) => (pulseRefs.current[k] = m!)} scale={0.05}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial emissive={PALETTE.node} emissiveIntensity={1.0} color={PALETTE.node} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/* ------------------------------- Base --------------------------------- */
const Base: React.FC = React.memo(() => (
  <mesh position={[0, -0.6, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[1.05, 64]} /> {/* smaller base than before */}
    <meshStandardMaterial color={PALETTE.base} roughness={0.92} />
  </mesh>
));

/* -------------------------------- Scene ------------------------------- */
const Scene: React.FC<{ scale?: number; offsetY?: number; onJitter?: () => void; }> = ({
  scale = 0.6, offsetY = -0.12, onJitter,
}) => {
  const root = React.useRef<THREE.Group>(null!);
  const constellationRef = React.useRef<THREE.Group>(null!);
  const tipRefs = React.useRef<THREE.Vector3[]>(new Array(7).fill(0).map(() => new THREE.Vector3()));
  const nodePositionsRef = React.useRef<THREE.Vector3[]>([]);
  const jitter = React.useRef(0);
  const reduced = useReducedMotion();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const floatAmp = reduced ? 0.02 : 0.035;
    root.current.position.y = offsetY + Math.sin(t * 0.9) * floatAmp;
    if (jitter.current > 0.0001) {
      const j = jitter.current;
      root.current.rotation.x += (Math.random() - 0.5) * j;
      root.current.rotation.z += (Math.random() - 0.5) * j;
      jitter.current *= 0.9;
    }
  });

  return (
    <PresentationControls global azimuth={[-0.7, 0.7]} polar={[-0.2, 0.5]} snap>
      <group
        ref={root}
        scale={scale}
        onClick={() => { jitter.current = 0.07; onJitter?.(); }}
      >
        <Float floatIntensity={0.7} rotationIntensity={0.35} speed={1.1}>
          <Base />
          <AnimatedSeaweed tipRefs={tipRefs} />
        </Float>
        <group position={[0, 1.05, 0]}> {/* higher sphere to match mock */}
          <Constellation groupRef={constellationRef} outPositionsRef={nodePositionsRef} />
          <Orbits r={1.7} />
          <LinksWithPulses tipRefs={tipRefs} nodePositionsRef={nodePositionsRef} linksPerTip={1} />
        </group>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.0} castShadow />
        <Environment preset="city" />
        <ContactShadows position={[0, -0.7, 0]} opacity={0.25} scale={4} blur={2.5} far={2.5} />
      </group>
    </PresentationControls>
  );
};

/* ------------------------------- UI Card ------------------------------ */
const CardChrome: React.FC<{ title?: string; live?: boolean; rounded?: boolean; }> = ({
  title = "Seaweed Data Garden — modern optimized look", live = true, rounded = true
}) => (
  <div className="sdg-ui" aria-hidden>
    {live && (
      <div className="sdg-live" role="status" aria-label="live">
        <span className="sdg-dot" /> LIVE
      </div>
    )}
    <div className="sdg-menu" aria-hidden>
      <span /><span /><span />
    </div>
    <div className="sdg-caption">{title}</div>
    <style>{`
      .sdg-root { position: relative; width: 100%; height: 100%; }
      .sdg-frame { position: absolute; inset: 0; border-radius: ${rounded ? 16 : 0}px; overflow: hidden; }
      .sdg-bg { position: absolute; inset: 0; pointer-events: none; }
      .sdg-bg::before { content: ""; position: absolute; inset: 0; background:
        radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.04), transparent 45%),
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.12));
      }
      .sdg-ui { position: absolute; inset: 0; pointer-events: none; }
      .sdg-live { position: absolute; top: 12px; left: 12px; padding: 6px 10px; border-radius: 999px;
        background: rgba(102,243,178,0.08); color: #a5f3cf; font: 600 12px/1.2 ui-sans-serif, system-ui, -apple-system;
        letter-spacing: .08em; display: inline-flex; align-items: center; gap: 8px; backdrop-filter: blur(6px);
        border: 1px solid rgba(102,243,178,0.15); }
      .sdg-dot { width: 6px; height: 6px; background: #34d399; border-radius: 999px; box-shadow: 0 0 10px 2px rgba(52,211,153,.6); display: inline-block; }
      .sdg-menu { position: absolute; top: 12px; right: 14px; display: flex; gap: 6px; }
      .sdg-menu span { width: 6px; height: 6px; border-radius: 999px; background: rgba(255,255,255,.15); }
      .sdg-caption { position: absolute; left: 16px; bottom: 12px; color: rgba(255,255,255,0.86);
        font: 500 14px/1.2 ui-sans-serif, system-ui, -apple-system; letter-spacing: .02em;
        text-shadow: 0 2px 18px rgba(0,0,0,.35); }
    `}</style>
  </div>
);

/* --------------------------- Public Component ------------------------- */
export type SeaweedDataGardenProps = {
  height?: number;
  rounded?: boolean;
  background?: string;
  scale?: number;
  offsetY?: number;
  title?: string;
  live?: boolean;
  camera?: { position?: [number, number, number]; fov?: number };
  className?: string;
  style?: React.CSSProperties;
};

const SeaweedDataGarden: React.FC<SeaweedDataGardenProps> = ({
  height = 520,
  rounded = true,
  background = PALETTE.bg,
  scale = 0.6,
  offsetY = -0.12,
  title = "Seaweed Data Garden — modern optimized look",
  live = true,
  camera,
  className,
  style,
}) => {
  // Hard-coded camera defaults for the mock look:
  const camPos = (camera?.position ?? [6.0, 2.7, 6.0]) as [number, number, number];
  const fov = camera?.fov ?? 66;

  return (
    <div className={`sdg-root ${className ?? ""}`} style={{ width: "100%", height, position: "relative", ...style }}>
      <div className="sdg-bg" />
      <div className="sdg-frame" style={{ background, borderRadius: rounded ? 16 : 0 }}>
        <Canvas shadows camera={{ position: camPos, fov }} dpr={[1, 2]}>
          <color attach="background" args={[background]} />
          <AdaptiveDpr pixelated={false} />
          <React.Suspense fallback={<Html center style={{ color: "white", fontFamily: "ui-sans-serif, system-ui" }}>Loading…</Html>}>
            <Scene scale={scale} offsetY={offsetY} onJitter={() => {}} />
            <Preload all />
          </React.Suspense>
        </Canvas>
      </div>
      <CardChrome title={title} live={live} rounded={rounded} />
    </div>
  );
};

export default SeaweedDataGarden;
