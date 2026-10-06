"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { type MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { projects, textos, type Project } from "@/content";
import {
  Bokeh,
  createUniforms,
  Helix,
  HELIX_RADIUS,
  helixT,
  PointScale,
  SPACING,
  TWIST,
  type HelixUniforms,
} from "@/components/ui/dna-helix";

const N = projects.length;
const CARD_RADIUS = HELIX_RADIUS + 1.5;
// Each card sits on the opposite strand of the previous one, so the camera only needs this small orbit between them.
const STEP = Math.atan2(Math.sin(Math.PI - TWIST * SPACING), Math.cos(Math.PI - TWIST * SPACING));
const PALETTE = ["#5b5bff", "#2fd3ff", "#ffae45"].map((c) => new THREE.Color(c));
const FOV = 42;

type Rig = { k: number; build: number; lateral: number; drop: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

// Holds the camera on each project for a stretch of scroll before travelling on, so cards can actually be read.
function dwell(u: number) {
  if (N < 2) return 0;
  const i = Math.min(Math.floor(u), N - 2);
  return i + smooth(clamp01((u - i - 0.2) / 0.6));
}

const cardAngle = (i: number) => i * STEP;
const sideOf = (k: number) => Math.cos(k * Math.PI);

function Rig({
  progress,
  rigRef,
  uniformsRef,
  reduced,
  finePointer,
}: {
  progress: MotionValue<number>;
  rigRef: RefObject<Rig>;
  uniformsRef: RefObject<HelixUniforms>;
  reduced: boolean;
  finePointer: boolean;
}) {
  const cam = useRef<{ phi: number; y: number; dist: number; pan: number; px: number; py: number } | null>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const accent = useMemo(() => new THREE.Color(), []);

  useFrame((state, rawDelta) => {
    // The loop pauses off-screen; the first frame back would otherwise see a delta of several seconds.
    const delta = Math.min(rawDelta, 0.1);
    const { camera, size, pointer } = state;
    const rig = rigRef.current;
    const uniforms = uniformsRef.current;
    const aspect = size.width / size.height;
    const wide = aspect > 1.1;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const cardDist = Math.max(11, 4.9 / (2 * halfTan * aspect));
    rig.lateral = wide ? Math.min(6.2, 2.6 + aspect * 1.6) : 0;
    rig.drop = wide ? 0 : 2.4;

    const k = dwell(clamp01(progress.get()) * (N - 1));
    const phi = k * STEP;
    const y = -k * SPACING;
    const dist = CARD_RADIUS + cardDist;
    const pan = sideOf(k) * rig.lateral * 0.5;

    if (!cam.current) {
      // Start pulled back and above so the first frames read as the camera arriving, not a cut.
      cam.current = { phi: phi - 0.9, y: y + 7, dist: dist + 12, pan, px: 0, py: 0 };
      uniforms.uFocus.value = helixT(y, N);
    }
    const c = cam.current;

    rig.build = Math.min(1, rig.build + delta / (reduced ? 0.5 : 2.6));
    uniforms.uBuild.value = rig.build;
    if (!reduced) uniforms.uTime.value += delta;

    const lambda = reduced ? 12 : 1.4 + 2.4 * rig.build;
    c.phi = THREE.MathUtils.damp(c.phi, phi, lambda, delta);
    c.y = THREE.MathUtils.damp(c.y, y, lambda, delta);
    c.dist = THREE.MathUtils.damp(c.dist, dist, lambda, delta);
    c.pan = THREE.MathUtils.damp(c.pan, pan, lambda, delta);
    c.px = THREE.MathUtils.damp(c.px, finePointer && !reduced ? pointer.x : 0, 3, delta);
    c.py = THREE.MathUtils.damp(c.py, finePointer && !reduced ? pointer.y : 0, 3, delta);
    rig.k = (0 - c.y) / SPACING;

    const a = c.phi - c.px * 0.07;
    const rx = Math.sin(a);
    const rz = -Math.cos(a);
    const cy = c.y - rig.drop * 0.35;
    target.set(rx * c.pan, cy, rz * c.pan);
    camera.position.set(Math.cos(a) * c.dist + rx * c.pan, cy + 0.8 + c.py * 0.6, Math.sin(a) * c.dist + rz * c.pan);
    camera.lookAt(target);

    // Accent drifts indigo → cyan → amber over the whole section.
    const t = clamp01(rig.k / Math.max(1, N - 1)) * (PALETTE.length - 1);
    const i = Math.min(Math.floor(t), PALETTE.length - 2);
    accent.lerpColors(PALETTE[i], PALETTE[i + 1], t - i);
    uniforms.uAccent.value.copy(accent);
  });

  return null;
}

function ProjectCard({
  project,
  index,
  rigRef,
  onOpen,
  onFocusCard,
}: {
  project: Project;
  index: number;
  rigRef: RefObject<Rig>;
  onOpen: (p: Project) => void;
  onFocusCard: (i: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<HTMLDivElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const [line, node] = useMemo(() => {
    const geo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: "#ffa04a",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodeMat = new THREE.MeshBasicMaterial({
      color: "#ff9a3c",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return [new THREE.Line(geo, lineMat), new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), nodeMat)] as const;
  }, []);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    },
    [line, node],
  );
  const lineRef = useRef(line);
  const nodeRef = useRef(node);

  useFrame(({ camera, clock }) => {
    const g = group.current;
    if (!g) return;
    const rig = rigRef.current;
    const line = lineRef.current;
    const node = nodeRef.current;
    const phi = cardAngle(index);
    const y = -index * SPACING;
    const ox = Math.cos(phi);
    const oz = Math.sin(phi);
    const side = sideOf(index) * rig.lateral;
    const enter = smooth(clamp01((rig.build * 1.6 - 0.45 - Math.abs(index - rig.k) * 0.12) / 0.7));
    const away = 1 - enter;
    const focus = smooth(1 - clamp01(Math.abs(rig.k - index) * 1.25));

    g.position.set(
      ox * (CARD_RADIUS + away * 5) + Math.sin(phi) * side,
      y - rig.drop - away * 3,
      oz * (CARD_RADIUS + away * 5) - Math.cos(phi) * side,
    );
    g.scale.setScalar(0.84 + 0.16 * focus);
    g.lookAt(camera.position);

    const opacity = enter * (0.16 + 0.84 * focus);
    const el = shell.current;
    if (el) {
      el.style.opacity = opacity.toFixed(3);
      el.style.pointerEvents = opacity > 0.4 ? "auto" : "none";
    }

    // Tether from the strand to the card, so the project reads as hanging off the helix.
    const pos = line.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, ox * (HELIX_RADIUS + 0.35), y, oz * (HELIX_RADIUS + 0.35));
    pos.setXYZ(1, g.position.x, g.position.y, g.position.z);
    pos.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    (line.material as THREE.LineBasicMaterial).opacity = enter * focus * 0.7;
    node.position.set(ox * (HELIX_RADIUS + 0.35), y, oz * (HELIX_RADIUS + 0.35));
    node.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.4) * 0.15);
    (node.material as THREE.MeshBasicMaterial).opacity = enter * (0.35 + 0.65 * focus);
  });

  // The card itself is the hit area (not an invisible plane), so hover and click match exactly what you see.
  // A press that turns into a drag (e.g. selecting text or a touch scroll) doesn't count as a click.
  return (
    <>
      <primitive object={line} />
      <primitive object={node} />
      <group ref={group}>
        <Html transform distanceFactor={7.5}>
          <div ref={shell} style={{ opacity: 0 }}>
            <button
              type="button"
              aria-label={`${textos.proyectos.verCaso}: ${project.title}`}
              onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
              onClick={(e) => {
                const start = down.current;
                if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
                onOpen(project);
              }}
              onFocus={(e) => e.currentTarget.matches(":focus-visible") && onFocusCard(index)}
              className="group block w-56 cursor-pointer select-none rounded-xl border border-[#8fa2ff]/20 bg-[#0e1430]/85 p-3 text-left text-mist shadow-[0_14px_40px_rgba(2,4,20,0.7)] outline-none transition-[transform,border-color,box-shadow] duration-300 ease-out hover:scale-[1.07] hover:border-[#ffb866]/60 hover:shadow-[0_20px_50px_rgba(2,4,20,0.75),0_0_36px_rgba(255,150,60,0.28)] focus-visible:border-[#ffb866]/70"
            >
              <div
                className="relative h-32 overflow-hidden rounded-lg"
                style={{ backgroundColor: project.accent }}
              >
                {project.cover[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.cover[0].src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                )}
              </div>
              <p className="mt-2 font-serif text-lg leading-tight">{project.title}</p>
              <p className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-haze">
                <span>
                  {project.year} · {project.tags[0]}
                </span>
                <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">Ver →</span>
              </p>
            </button>
          </div>
        </Html>
      </group>
    </>
  );
}

export default function ProjectGallery3D({
  progress,
  active,
  onOpen,
  onFocusCard,
  onReady,
}: {
  progress: MotionValue<number>;
  active: boolean;
  onOpen: (p: Project) => void;
  onFocusCard: (i: number) => void;
  onReady?: () => void;
}) {
  const [reduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [finePointer] = useState(() => matchMedia("(pointer: fine)").matches);
  const uniforms = useMemo(() => createUniforms(), []);
  // Per-frame state lives behind refs: the render loop mutates it, React never renders from it.
  const uniformsRef = useRef(uniforms);
  const rigRef = useRef<Rig>({ k: 0, build: 0, lateral: 0, drop: 0 });

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 18], fov: FOV, near: 0.1, far: 120 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop={active ? "always" : "never"}
        onCreated={() => onReady?.()}
      >
        <PointScale uniformsRef={uniformsRef} />
        <Rig progress={progress} rigRef={rigRef} uniformsRef={uniformsRef} reduced={reduced} finePointer={finePointer} />
        <Bokeh uniforms={uniforms} count={N} />
        <Helix uniforms={uniforms} count={N} />
        {projects.map((project, i) => (
          <ProjectCard key={project.title} project={project} index={i} rigRef={rigRef} onOpen={onOpen} onFocusCard={onFocusCard} />
        ))}
      </Canvas>
    </div>
  );
}
