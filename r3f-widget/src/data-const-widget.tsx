import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { EffectComposer } from "postprocessing";

/* ---------- switches (set to true if you want them) ---------- */
const USE_GLOW = false;        // set true to re-enable Bloom later
const USE_SHADOW = true;       // set false to remove the ground shadow

/* ---------- read your site's CSS background so it matches exactly ---------- */
function useSiteBg(fallback = "#20262c") {
  const [bg, setBg] = React.useState<string>(fallback);
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const varBg = getComputedStyle(root).getPropertyValue("--bg").trim();
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    setBg(varBg || bodyBg || fallback);
  }, [fallback]);
  return bg;
}

/* ---------------- helpers ---------------- */
function fibSphere(count: number, r: number) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2; // slight pole offset
    const rad = Math.sqrt(1 - y * y);
    const t = ga * i;
    pts.push(new THREE.Vector3(Math.cos(t) * rad * r, y * r, Math.sin(t) * rad * r));
  }
  return pts;
}

/** keep the constellation framed regardless of size/FOV */
function FitCamera({ radius = 2.35, target = new THREE.Vector3(0, 0, 0) }) {
  const { camera, size } = useThree();
  React.useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const fov = THREE.MathUtils.degToRad(cam.fov);
    const dist = (radius * 1.08) / Math.tan(fov / 2);
    cam.position.set(0, 0.6, dist);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, radius, target]);
  return null;
}

/** soft round shadow */
function useRadialShadowTexture(size = 1024, innerAlpha = 0.18) {
  return React.useMemo(() => {
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = size;
    const ctx = cnv.getContext("2d")!;
    const g = ctx.createRadialGradient(size/2, size/2, size*0.12, size/2, size/2, size*0.5);
    g.addColorStop(0, `rgba(0,0,0,${innerAlpha})`);
    g.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
    const tex = new THREE.CanvasTexture(cnv);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 4;
    return tex;
  }, [size, innerAlpha]);
}
function ShadowDisk({ y = -0.85, scale = 3.0 }: { y?: number; scale?: number }) {
  const tex = useRadialShadowTexture(1024, 0.16);
  return (
    <mesh rotation-x={-Math.PI/2} position={[0, y, 0]}>
      <planeGeometry args={[scale, scale]} />
      <meshBasicMaterial map={tex} transparent opacity={1} depthWrite={false} />
    </mesh>
  );
}

/* ---------------- constellation ---------------- */
const NODE_COLOR = "#FFF6E6";
const LINK_COLOR = "#F4F6F9";
const ORBIT_COLOR = "#FFF1DE";

function Constellation({ count = 38, radius = 1.55, neighbors = 2, groupRef }:{
  count?: number; radius?: number; neighbors?: number; groupRef: React.MutableRefObject<THREE.Group|null>;
}) {
  const inst = React.useRef<THREE.InstancedMesh>(null!);
  const pts  = React.useMemo(() => fibSphere(count, radius), [count, radius]);

  const edges = React.useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i=0;i<pts.length;i++) {
      const d = pts.map((p,j) => [j, pts[i].distanceTo(p)] as const)
                   .filter(([j]) => j !== i)
                   .sort((a,b) => a[1]-b[1])
                   .slice(0, neighbors);
      for (const [j] of d) lines.push([pts[i], pts[j]]);
    }
    return lines;
  }, [pts, neighbors]);

  React.useEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i=0;i<pts.length;i++){ dummy.position.copy(pts[i]); dummy.updateMatrix(); inst.current.setMatrixAt(i, dummy.matrix); }
    inst.current.instanceMatrix.needsUpdate = true;
  }, [pts]);

  useFrame((s) => { if (groupRef.current) groupRef.current.rotation.y = s.clock.getElapsedTime() * 0.05; });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={inst} args={[undefined, undefined, count]} castShadow>
        <icosahedronGeometry args={[0.048, 0]} />
        <meshStandardMaterial
          color={NODE_COLOR}
          emissive={NODE_COLOR}
          emissiveIntensity={USE_GLOW ? 1.6 : 0.0} // no glow when false
          roughness={0.15}
          metalness={0.2}
          toneMapped={false}
        />
      </instancedMesh>

      {edges.map(([a,b],i)=>(
        <Line key={i} points={[a,b]} color={LINK_COLOR} lineWidth={1.2} toneMapped={false} />
      ))}
    </group>
  );
}

/* ---------------- orbit rings ---------------- */
function Orbits({ radii=[2.0,2.3,2.6], tilt=0.46, n=240 }:{radii?:number[]; tilt?:number; n?:number;}) {
  const grp = React.useRef<THREE.Group>(null!);
  const rings = React.useMemo(()=>radii.map((r,i)=>{
    const a=r, b=r*(i%2===0?0.78:0.92);
    const euler = new THREE.Euler(tilt + i*0.07, 0, i%2?0.35:-0.25);
    return [...Array(n)].map((_,k)=>{
      const t = (k/n)*Math.PI*2;
      return new THREE.Vector3(a*Math.cos(t), 0, b*Math.sin(t)).applyEuler(euler);
    });
  }),[radii,tilt,n]);
  useFrame((s) => { if (grp.current) grp.current.rotation.y = s.clock.getElapsedTime() * 0.04; });
  return (
    <group ref={grp}>
      {rings.map((pts,i)=>(
        <Line key={i} points={pts} color={ORBIT_COLOR} lineWidth={1.2} toneMapped={false} />
      ))}
    </group>
  );
}

/* ---------------- scene ---------------- */
function Scene() {
  const constelRef = React.useRef<THREE.Group|null>(null);
  return (
    <>
      <FitCamera radius={2.35} />
      <group>
        {USE_SHADOW && <ShadowDisk />}
        <group>
          <Constellation groupRef={constelRef as any} />
          <Orbits />
        </group>
        <ambientLight intensity={0.65}/>
        <directionalLight position={[2,3,2]} intensity={1.2} castShadow />
      </group>
    </>
  );
}

/* ---------------- export ---------------- */
export default function SeaweedDataGarden({ height = 520, dpr = [1,2] }:{height?:number; dpr?:[number,number]|number;}) {
  const pageBg = useSiteBg("#20262c"); // reads --bg (or body), matches your CSS exactly
  return (
    <div style={{ width:"100%", height, background: pageBg }}>
      <Canvas
        dpr={dpr}
        shadows
        gl={{ alpha: false, antialias: true }}       // opaque buffer (no CSS blending)
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace; // color-correct output
          gl.toneMapping = THREE.NoToneMapping;       // keep flat colors exact
          gl.setClearColor(new THREE.Color(pageBg), 1);
        }}
        camera={{ fov: 38, near: 0.1, far: 100 }}
        style={{ width:"100%", height:"100%", display:"block" }}
      >
        {/* solid background drawn by WebGL (matches CSS variable) */}
        <color attach="background" args={[pageBg]} />
        <Scene />

        {/* Optional: turn glow back on by setting USE_GLOW = true above */}
        {USE_GLOW && (
          // If you enable this, keep threshold high to avoid “haze”
          // Bloom is selective when toneMapped=false on the glowing materials.
          // Docs: react-postprocessing Bloom.
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          <EffectComposer>
            {/* @react-three/postprocessing is only needed when USE_GLOW is true */}
            {/* <Bloom mipmapBlur intensity={0.65} luminanceThreshold={0.7} luminanceSmoothing={0.2} /> */}
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
