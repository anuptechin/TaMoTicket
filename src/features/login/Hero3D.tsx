import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Login hero: traffic on a night road → the camera settles on a truck → its body turns to
 * X-ray and the parts float out with their catalogue numbers → it reassembles and drives off.
 * All motion runs in useFrame on refs (no React renders per frame) for a steady 60 fps.
 */

export const LOOP = 24;
export type HeroPhase = 'road' | 'parts' | 'hub';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeIn = (x: number) => x * x * x;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Hero truck x position over the loop. */
function heroX(t: number) {
  if (t < 8) return -38 + 38 * easeOut(t / 8);
  if (t < 18.5) return 0;
  return 42 * easeIn(range(t, 18.5, LOOP));
}
/** 0 = solid body, 1 = full X-ray. */
const xray = (t: number) => smooth(range(t, 8.8, 10.2)) * (1 - smooth(range(t, 17.6, 18.6)));
/** Per-part explode amount with a stagger. */
const explode = (t: number, i: number) => easeInOut(range(t, 9.6 + i * 0.12, 11.8 + i * 0.12)) * (1 - easeInOut(range(t, 15.8 + i * 0.06, 17.8 + i * 0.06)));

export function phaseAt(t: number): HeroPhase {
  if (t >= 9 && t < 17) return 'parts';
  if (t >= 17) return 'hub';
  return 'road';
}

interface Clock {
  t: number;
  abs: number;
}

// ───────────────────────── shared look ─────────────────────────

const TEAL = '#2DD4BF';

function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function BlobShadow({ w, d, tex }: { w: number; d: number; tex: THREE.Texture }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.02} renderOrder={1}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/** A wheel whose spin is driven from outside via the returned group ref. */
function Wheel({ r, w, spinRef, position }: { r: number; w: number; spinRef: (g: THREE.Group | null) => void; position: [number, number, number] }) {
  return (
    <group position={position}>
      <group ref={spinRef}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[r, r, w, 28]} />
          <meshStandardMaterial color="#0d0f13" roughness={0.92} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position-z={position[2] > 0 ? w / 2 + 0.005 : -w / 2 - 0.005}>
          <cylinderGeometry args={[r * 0.55, r * 0.55, 0.02, 20]} />
          <meshStandardMaterial color="#9aa3af" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* a spoke so rotation is visible */}
        <mesh position-z={position[2] > 0 ? w / 2 + 0.012 : -w / 2 - 0.012}>
          <boxGeometry args={[r * 1.0, r * 0.12, 0.012]} />
          <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function useWheels() {
  const list = useRef<THREE.Group[]>([]);
  const add = (g: THREE.Group | null) => {
    if (g && !list.current.includes(g)) list.current.push(g);
  };
  const spin = (by: number) => list.current.forEach((g) => (g.rotation.z -= by));
  return { add, spin };
}

function Lights({ color = '#fff7d6' }: { color?: string }) {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </>
  );
}

// ───────────────────────── traffic vehicles ─────────────────────────

function Car({ color, glass = '#0f172a' }: { color: string; glass?: string }) {
  return (
    <group>
      <RoundedBox args={[4.2, 0.72, 1.8]} radius={0.22} smoothness={3} position={[0, 0.68, 0]}>
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.32} />
      </RoundedBox>
      <RoundedBox args={[2.3, 0.62, 1.62]} radius={0.25} smoothness={3} position={[-0.25, 1.28, 0]}>
        <meshStandardMaterial color={glass} metalness={0.4} roughness={0.08} />
      </RoundedBox>
      <group position={[2.11, 0.75, 0.62]}>
        <Lights />
      </group>
      <group position={[2.11, 0.75, -0.62]}>
        <Lights />
      </group>
      <mesh position={[-2.11, 0.78, 0]}>
        <boxGeometry args={[0.04, 0.12, 1.5]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Pickup({ color }: { color: string }) {
  return (
    <group>
      <RoundedBox args={[4.8, 0.7, 1.9]} radius={0.15} smoothness={3} position={[0, 0.78, 0]}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[1.9, 0.75, 1.82]} radius={0.22} smoothness={3} position={[0.95, 1.45, 0]}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
      </RoundedBox>
      <mesh position={[1.55, 1.5, 0]}>
        <boxGeometry args={[0.62, 0.5, 1.7]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.08} />
      </mesh>
      {[-0.9, 0.9].map((z) => (
        <mesh key={z} position={[-1.15, 1.32, z]}>
          <boxGeometry args={[2.4, 0.38, 0.08]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <group position={[2.41, 0.85, 0.65]}>
        <Lights />
      </group>
      <group position={[2.41, 0.85, -0.65]}>
        <Lights />
      </group>
    </group>
  );
}

function TrafficTruck({ cab, box }: { cab: string; box: string }) {
  return (
    <group>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[7.2, 0.22, 1.5]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.5} />
      </mesh>
      <RoundedBox args={[2.0, 2.3, 2.3]} radius={0.18} smoothness={3} position={[2.5, 1.95, 0]}>
        <meshStandardMaterial color={cab} metalness={0.45} roughness={0.35} />
      </RoundedBox>
      <mesh position={[3.48, 2.35, 0]}>
        <boxGeometry args={[0.06, 0.9, 2.0]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.08} />
      </mesh>
      <RoundedBox args={[4.8, 2.6, 2.4]} radius={0.08} smoothness={2} position={[-1.1, 2.2, 0]}>
        <meshStandardMaterial color={box} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <group position={[3.52, 1.2, 0.85]}>
        <Lights />
      </group>
      <group position={[3.52, 1.2, -0.85]}>
        <Lights />
      </group>
    </group>
  );
}

type Kind = 'car' | 'pickup' | 'truck';
const TRAFFIC: { kind: Kind; lane: number; speed: number; offset: number; color: string; color2?: string }[] = [
  { kind: 'car', lane: -1.7, speed: 9, offset: 0, color: '#e5e7eb' },
  { kind: 'truck', lane: -1.7, speed: 9, offset: 19, color: '#f8fafc', color2: '#64748b' },
  { kind: 'pickup', lane: -1.7, speed: 9, offset: 40, color: '#1e3a8a' },
  { kind: 'car', lane: -1.7, speed: 9, offset: 58, color: '#475569' },
  { kind: 'car', lane: -5.0, speed: -11, offset: 6, color: '#9f1239' },
  { kind: 'truck', lane: -5.0, speed: -11, offset: 26, color: '#e2e8f0', color2: '#0e7c86' },
  { kind: 'car', lane: -5.0, speed: -11, offset: 47, color: '#cbd5e1' },
  { kind: 'pickup', lane: -5.0, speed: -11, offset: 64, color: '#b45309' },
];
const SPAN = 80;

function TrafficVehicle({ cfg, clock, tex }: { cfg: (typeof TRAFFIC)[number]; clock: MutableRefObject<Clock>; tex: THREE.Texture }) {
  const g = useRef<THREE.Group>(null);
  const wheels = useWheels();
  const prev = useRef<number | null>(null);
  const r = cfg.kind === 'car' ? 0.36 : cfg.kind === 'pickup' ? 0.42 : 0.5;
  useFrame(() => {
    if (!g.current) return;
    const raw = cfg.offset + cfg.speed * clock.current.abs;
    const x = ((((raw + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2;
    if (prev.current != null && Math.abs(x - prev.current) < 5) wheels.spin(Math.abs(x - prev.current) / r); // always rolling forward in its own frame
    prev.current = x;
    g.current.position.x = x;
  });
  const wheelPos: [number, number][] =
    cfg.kind === 'car' ? [[1.35, 0.86], [-1.35, 0.86]] : cfg.kind === 'pickup' ? [[1.6, 0.92], [-1.5, 0.92]] : [[2.5, 1.05], [-1.6, 1.05], [-2.8, 1.05]];
  return (
    <group ref={g} position={[0, 0, cfg.lane]} rotation-y={cfg.speed < 0 ? Math.PI : 0}>
      <BlobShadow w={cfg.kind === 'truck' ? 8.4 : 5.4} d={cfg.kind === 'truck' ? 3.6 : 2.8} tex={tex} />
      {cfg.kind === 'car' && <Car color={cfg.color} />}
      {cfg.kind === 'pickup' && <Pickup color={cfg.color} />}
      {cfg.kind === 'truck' && <TrafficTruck cab={cfg.color} box={cfg.color2 ?? '#64748b'} />}
      {wheelPos.flatMap(([x, z]) =>
        [z, -z].map((zz) => <Wheel key={`${x}${zz}`} r={r} w={cfg.kind === 'car' ? 0.26 : 0.34} position={[x, r, zz]} spinRef={wheels.add} />),
      )}
    </group>
  );
}

// ───────────────────────── the hero truck ─────────────────────────

const steel = { color: '#b6c0cc', metalness: 0.85, roughness: 0.28 };
const darkSteel = { color: '#4b5563', metalness: 0.75, roughness: 0.4 };

interface PartDef {
  key: string;
  label?: string;
  partNo?: string;
  pos: [number, number, number];
  out: [number, number, number];
  spin?: [number, number, number];
  build: () => ReactNode;
}

const PARTS: PartDef[] = [
  {
    key: 'radiator',
    label: 'Radiator core',
    partNo: 'PRT-52310-RAD',
    pos: [3.25, 1.35, 0],
    out: [3.2, 0.9, -0.6],
    build: () => (
      <group>
        <mesh>
          <boxGeometry args={[0.14, 1.0, 1.5]} />
          <meshStandardMaterial {...darkSteel} />
        </mesh>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[0.075, -0.4 + i * 0.1, 0]}>
            <boxGeometry args={[0.02, 0.03, 1.38]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
      </group>
    ),
  },
  {
    key: 'engine',
    label: 'Engine assembly',
    partNo: '6-cyl · BS-VI',
    pos: [2.35, 1.25, 0],
    out: [0.9, 3.4, -0.4],
    spin: [0, 0.25, 0],
    build: () => (
      <group>
        <mesh>
          <boxGeometry args={[1.25, 0.72, 0.82]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.38} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[1.18, 0.24, 0.62]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        {[-0.45, -0.27, -0.09, 0.09, 0.27, 0.45].map((x) => (
          <mesh key={x} position={[x, 0.66, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.14, 14]} />
            <meshStandardMaterial color={TEAL} metalness={0.5} roughness={0.3} emissive={TEAL} emissiveIntensity={0.25} />
          </mesh>
        ))}
        <mesh position={[0.66, 0.05, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.22, 0.22, 0.08, 24]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'alternator',
    label: 'Alternator 24V',
    partNo: 'PRT-44102-ALT',
    pos: [2.75, 1.45, 0.52],
    out: [2.4, 1.9, 2.2],
    spin: [0, 0, 1.2],
    build: () => (
      <group rotation-x={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[0.17, 0.17, 0.3, 20]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh position-y={0.18}>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 16]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'starter',
        pos: [1.95, 0.98, -0.48],
    out: [0.6, 0.5, -2.4],
    build: () => (
      <group rotation-z={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 0.5, 18]} />
          <meshStandardMaterial {...darkSteel} />
        </mesh>
        <mesh position-y={0.3}>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'clutch',
    label: 'Clutch plate',
    partNo: 'PRT-31208-CLT',
    pos: [1.62, 1.12, 0],
    out: [-1.2, 2.6, 1.6],
    spin: [1.4, 0, 0],
    build: () => (
      <group rotation-z={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, 0.06, 32]} />
          <meshStandardMaterial color="#c2410c" metalness={0.2} roughness={0.7} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 20]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'gearbox',
        pos: [1.02, 1.05, 0],
    out: [-1.3, 2.5, 0.2],
    build: () => (
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.3, 0.4, 0.95, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.35} />
      </mesh>
    ),
  },
  {
    key: 'shaft',
    pos: [-0.75, 0.82, 0],
    out: [0, 0.9, 0],
    build: () => (
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.07, 2.6, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    ),
  },
  {
    key: 'brake',
    label: 'Brake disc rotor',
    partNo: 'PRT-29507-DSC',
    pos: [2.5, 0.5, 0.72],
    out: [2.6, 0.2, 3.0],
    spin: [0, 0, 1.8],
    build: () => (
      <group rotation-x={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[0.36, 0.36, 0.05, 32]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh position={[0.26, 0, 0]}>
          <boxGeometry args={[0.16, 0.12, 0.22]} />
          <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'shock',
    label: 'Shock absorber',
    partNo: 'PRT-38811-SHK',
    pos: [2.5, 1.05, 0.72],
    out: [0.2, 1.2, 3.6],
    build: () => (
      <group>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.72, 14]} />
          <meshStandardMaterial {...darkSteel} />
        </mesh>
        <mesh>
          <torusKnotGeometry args={[0.11, 0.018, 90, 6, 7, 1]} />
          <meshStandardMaterial color="#facc15" metalness={0.5} roughness={0.35} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'spring',
    label: 'Leaf spring',
    partNo: 'PRT-39020-LSP',
    pos: [-2.2, 0.98, 0.9],
    out: [-2.2, 1.6, 2.6],
    build: () => (
      <group>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, -i * 0.045, 0]}>
            <boxGeometry args={[1.7 - i * 0.32, 0.035, 0.16]} />
            <meshStandardMaterial {...darkSteel} />
          </mesh>
        ))}
      </group>
    ),
  },
  {
    key: 'fuel',
        pos: [0.0, 0.72, 0.95],
    out: [0.1, 0.25, 2.3],
    build: () => (
      <group>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.32, 0.32, 1.3, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0.3, 0.36, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 14]} />
          <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.4} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'filter',
        pos: [1.35, 2.15, -0.95],
    out: [-0.2, 1.5, -1.6],
    build: () => (
      <group>
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.55, 20]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.205, 0.205, 0.4, 20, 1, true]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
        </mesh>
      </group>
    ),
  },
  {
    key: 'diff',
    pos: [-2.2, 0.5, 0],
    out: [-0.4, 0.45, 0],
    build: () => (
      <group>
        <mesh>
          <sphereGeometry args={[0.3, 20, 14]} />
          <meshStandardMaterial {...darkSteel} />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.08, 0.08, 1.9, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
    ),
  },
];

function PartLabel({ name, partNo, labelRef }: { name: string; partNo?: string; labelRef: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={labelRef}
      style={{ opacity: 0, transform: 'translate(-50%, -125%)', pointerEvents: 'none', whiteSpace: 'nowrap', transition: 'none' }}
      className="rounded-lg border border-[#2DD4BF]/40 bg-[#0B1220]/85 px-2.5 py-1 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white leading-tight">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2DD4BF]" />
        {name}
      </div>
      {partNo && <div className="font-mono text-[13px] text-[#5EEAD4] leading-tight">{partNo}</div>}
    </div>
  );
}

function HeroTruck({ clock, tex }: { clock: MutableRefObject<Clock>; tex: THREE.Texture }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const partRefs = useRef<(THREE.Group | null)[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const edgeMats = useRef<THREE.LineBasicMaterial[]>([]);
  const wheels = useWheels();
  const prevX = useRef<number | null>(null);

  const edges = useMemo(
    () => [
      { geo: new THREE.EdgesGeometry(new THREE.BoxGeometry(2.1, 2.4, 2.4)), pos: [2.45, 2.05, 0] as [number, number, number] },
      { geo: new THREE.EdgesGeometry(new THREE.BoxGeometry(5.0, 2.7, 2.5)), pos: [-1.25, 2.25, 0] as [number, number, number] },
    ],
    [],
  );

  useFrame((_, dt) => {
    const t = clock.current.t;
    const x = heroX(t);
    if (root.current) root.current.position.x = x;
    if (prevX.current != null && Math.abs(x - prevX.current) < 5) wheels.spin((x - prevX.current) / 0.5);
    prevX.current = x;

    const xr = xray(t);
    bodyMats.current.forEach((m) => {
      m.opacity = 1 - 0.88 * xr;
      m.transparent = xr > 0.001;
      m.depthWrite = xr < 0.5;
    });
    edgeMats.current.forEach((m) => (m.opacity = xr * 0.9));
    if (body.current) body.current.position.y = xr * 0.25;

    PARTS.forEach((p, i) => {
      const g = partRefs.current[i];
      if (!g) return;
      const e = explode(t, i);
      g.position.set(p.pos[0] + p.out[0] * e, p.pos[1] + p.out[1] * e, p.pos[2] + p.out[2] * e);
      if (p.spin) {
        g.rotation.x += p.spin[0] * dt * e;
        g.rotation.y += p.spin[1] * dt * e;
        g.rotation.z += p.spin[2] * dt * e;
        if (e < 0.01) g.rotation.set(0, 0, 0);
      }
      const el = labelRefs.current[i];
      if (el) {
        const show = smooth(range(e, 0.75, 1));
        el.style.opacity = String(show);
        el.style.transform = `translate(-50%, ${-125 + (1 - show) * 30}%)`;
      }
    });
  });

  const regMat = (m: THREE.MeshStandardMaterial | null) => {
    if (m && !bodyMats.current.includes(m)) bodyMats.current.push(m);
  };
  const regEdge = (m: THREE.LineBasicMaterial | null) => {
    if (m && !edgeMats.current.includes(m)) edgeMats.current.push(m);
  };

  return (
    <group ref={root} position={[-38, 0, 1.7]}>
      <BlobShadow w={9} d={3.8} tex={tex} />
      {/* chassis */}
      <mesh position={[0, 0.78, 0.55]}>
        <boxGeometry args={[7.4, 0.2, 0.14]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.78, -0.55]}>
        <boxGeometry args={[7.4, 0.2, 0.14]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.45} />
      </mesh>
      {/* body: fades to X-ray */}
      <group ref={body}>
        <RoundedBox args={[2.1, 2.4, 2.4]} radius={0.2} smoothness={4} position={[2.45, 2.05, 0]}>
          <meshStandardMaterial ref={regMat} color="#f1f5f9" metalness={0.4} roughness={0.3} />
        </RoundedBox>
        <mesh position={[3.48, 2.45, 0]}>
          <boxGeometry args={[0.08, 0.95, 2.1]} />
          <meshStandardMaterial ref={regMat} color="#0b1220" metalness={0.5} roughness={0.05} />
        </mesh>
        <mesh position={[3.49, 1.45, 0]}>
          <boxGeometry args={[0.06, 0.18, 2.36]} />
          <meshStandardMaterial ref={regMat} color="#0E7C86" metalness={0.5} roughness={0.3} />
        </mesh>
        <RoundedBox args={[5.0, 2.7, 2.5]} radius={0.1} smoothness={2} position={[-1.25, 2.25, 0]}>
          <meshStandardMaterial ref={regMat} color="#0E7C86" metalness={0.35} roughness={0.45} />
        </RoundedBox>
        <mesh position={[-1.25, 2.25, 1.256]}>
          <planeGeometry args={[3.4, 0.5]} />
          <meshStandardMaterial ref={regMat} color="#ffffff" metalness={0.1} roughness={0.6} />
        </mesh>
        {edges.map((e, i) => (
          <lineSegments key={i} geometry={e.geo} position={e.pos}>
            <lineBasicMaterial ref={regEdge} color={TEAL} transparent opacity={0} toneMapped={false} />
          </lineSegments>
        ))}
        <group position={[3.52, 1.2, 0.92]}>
          <Lights />
        </group>
        <group position={[3.52, 1.2, -0.92]}>
          <Lights />
        </group>
      </group>

      {PARTS.map((p, i) => (
        <group key={p.key} ref={(g) => (partRefs.current[i] = g)} position={p.pos}>
          {p.build()}
          {p.label && (
            <Html center={false} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
              <PartLabel name={p.label} partNo={p.partNo} labelRef={(el) => (labelRefs.current[i] = el)} />
            </Html>
          )}
        </group>
      ))}

      {[2.5, -1.6, -2.8].flatMap((wx) => [1.08, -1.08].map((wz) => <Wheel key={`${wx}${wz}`} r={0.5} w={0.36} position={[wx, 0.5, wz]} spinRef={wheels.add} />))}
    </group>
  );
}

// ───────────────────────── world ─────────────────────────

function Road() {
  const dashes = useMemo(() => Array.from({ length: 26 }, (_, i) => -50 + i * 4), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, -2]}>
        <planeGeometry args={[200, 120]} />
        <meshStandardMaterial color="#070b14" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -1.65]}>
        <planeGeometry args={[200, 10.4]} />
        <meshStandardMaterial color="#121a2a" roughness={0.75} metalness={0.1} />
      </mesh>
      {[3.45, -6.75].map((z) => (
        <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.012, z]}>
          <planeGeometry args={[200, 0.08]} />
          <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      {[-3.35, -3.15].map((z) => (
        <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.012, z]}>
          <planeGeometry args={[200, 0.06]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {dashes.map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.012, 0]}>
          <planeGeometry args={[2, 0.1]} />
          <meshStandardMaterial color="#e2e8f0" emissive="#e2e8f0" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => -48 + i * 12).map((x) => (
        <group key={x} position={[x, 0, -8.2]}>
          <mesh position-y={2.4}>
            <cylinderGeometry args={[0.05, 0.07, 4.8, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0.5, 4.8, 0.4]}>
            <boxGeometry args={[1.0, 0.08, 0.3]} />
            <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

const TGT_ROAD = new THREE.Vector3(1, 0, -1.2);
const TGT_PARTS = new THREE.Vector3(0.7, 1.7, 1.7);
/** The lower ~45% of the panel is covered by text, so aim below the subject to lift it into view. */
const FRAME_DROP = 0.085;

function CameraRig({ clock, still }: { clock: MutableRefObject<Clock>; still: boolean }) {
  const { camera, pointer, size } = useThree();
  const target = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());
  const far = useRef(new THREE.Vector3());
  const close = useRef(new THREE.Vector3());
  const par = useRef({ x: 0, y: 0 });
  useFrame((_, dt) => {
    const t = clock.current.t;
    // Narrow (portrait-ish) panels need the camera further back to keep the truck in frame.
    const fit = Math.min(1.7, Math.max(1, 1.35 / (size.width / size.height)));
    const f = smooth(range(t, 7.2, 10)) * (1 - smooth(range(t, 17.8, 21.5)));
    const drift = still ? 0 : Math.sin(clock.current.abs * 0.12) * 0.12;
    const aRoad = 0.95 + drift;
    const rRoad = 22 * fit;
    far.current.set(TGT_ROAD.x + Math.cos(aRoad) * rRoad, 8.5 * fit, TGT_ROAD.z + Math.sin(aRoad) * rRoad);
    const a = 0.7 + (still ? 0.15 : range(t, 9, 17.5) * 0.32);
    const rParts = 16.5 * fit;
    close.current.set(TGT_PARTS.x + Math.cos(a) * rParts, 5.2 * fit, TGT_PARTS.z + Math.sin(a) * rParts);
    pos.current.copy(far.current).lerp(close.current, f);
    target.current.copy(TGT_ROAD).lerp(TGT_PARTS, f);
    const dist = pos.current.distanceTo(target.current);
    target.current.y -= dist * FRAME_DROP;
    const k = Math.min(1, dt * 2.5);
    par.current.x += (pointer.x - par.current.x) * k;
    par.current.y += (pointer.y - par.current.y) * k;
    camera.position.set(pos.current.x + par.current.x * 1.2, pos.current.y + par.current.y * 0.6, pos.current.z);
    camera.lookAt(target.current);
  });
  return null;
}

function Ticker({ clock, still, onPhase }: { clock: MutableRefObject<Clock>; still: boolean; onPhase?: (p: HeroPhase) => void }) {
  const last = useRef<HeroPhase | null>(null);
  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 20); // never jump after a hitch or a background tab
    if (!still) {
      clock.current.abs += d;
      clock.current.t = (clock.current.t + d) % LOOP;
    }
    const p = phaseAt(clock.current.t);
    if (p !== last.current) {
      last.current = p;
      onPhase?.(p);
    }
  });
  return null;
}

export default function Hero3D({ onPhase, still = false, startAt }: { onPhase?: (p: HeroPhase) => void; still?: boolean; startAt?: number }) {
  const clock = useRef<Clock>({ t: startAt ?? (still ? 13 : 0), abs: startAt ?? 0 });
  const tex = useShadowTexture();
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 36, near: 0.5, far: 160, position: [15, 8, 25] }}
      frameloop="always"
      aria-hidden
    >
      <color attach="background" args={['#0B1220']} />
      <fog attach="fog" args={['#0B1220', 34, 90]} />
      <Environment />
      <hemisphereLight args={['#bcd7ff', '#0b1220', 0.55]} />
      <directionalLight position={[6, 12, 8]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-8, 5, -6]} intensity={0.9} color={TEAL} />
      <pointLight position={[1, 4, 6]} intensity={30} distance={18} color="#5eead4" />
      <Ticker clock={clock} still={still} onPhase={onPhase} />
      <CameraRig clock={clock} still={still} />
      <Road />
      {!still && TRAFFIC.map((c, i) => <TrafficVehicle key={i} cfg={c} clock={clock} tex={tex} />)}
      <HeroTruck clock={clock} tex={tex} />
    </Canvas>
  );
}
