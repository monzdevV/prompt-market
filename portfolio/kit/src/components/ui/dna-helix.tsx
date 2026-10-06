"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";

export const HELIX_RADIUS = 2.6;
export const TWIST = (Math.PI * 2) / 13;
export const SPACING = 8;
export const TOP = 9;
export const bottomFor = (count: number) => -(count - 1) * SPACING - 9;
// Normalised position along the helix, top = 0; the build-in radiates from wherever the camera is.
export const helixT = (y: number, count: number) => (TOP - y) / (TOP - bottomFor(count));

export const rand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

export function createUniforms() {
  return {
    uTime: { value: 0 },
    uBuild: { value: 0 },
    uFocus: { value: 0 },
    uPx: { value: 600 },
    uBase: { value: new THREE.Color("#1d2767") },
    uAccent: { value: new THREE.Color("#5b5bff") },
    uHot: { value: new THREE.Color("#ff8a2a") },
    uFogColor: { value: new THREE.Color("#0b1233") },
    uFogNear: { value: 12 },
    uFogFar: { value: 40 },
  };
}

export type HelixUniforms = ReturnType<typeof createUniforms>;

const BEAD_VERT = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  uniform float uBuild;
  uniform float uFocus;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vN;
  varying vec3 vView;
  varying vec3 vLocal;
  varying float vT;
  varying float vSeed;
  varying float vFog;

  void main() {
    float start = abs(aT - uFocus) * 0.9 + aSeed * 0.12;
    float g = smoothstep(start, start + 0.35, uBuild * 1.45);
    // A small overshoot mid-growth makes each bead swell into place instead of scaling linearly.
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position * (g + sin(g * 3.14159) * 0.18), 1.0);
    vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vView = -mv.xyz;
    vLocal = position;
    vT = aT;
    vSeed = aSeed;
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAD_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform vec3 uHot;
  uniform vec3 uFogColor;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vView;
  varying vec3 vLocal;
  varying float vT;
  varying float vSeed;
  varying float vFog;

  void main() {
    vec3 N = normalize(vN);
    float fres = pow(1.0 - clamp(dot(N, normalize(vView)), 0.0, 1.0), 2.0);
    float diff = clamp(dot(N, normalize(vec3(-0.35, 0.75, 0.55))), 0.0, 1.0);
    float wave = pow(0.5 + 0.5 * sin(vT * 48.0 - uTime * 1.4), 8.0);
    float flick = step(0.8, vSeed) * (0.55 + 0.45 * sin(uTime * 2.3 + vSeed * 60.0));
    vec3 n = normalize(vLocal);
  #ifdef RUNG
    float side = step(0.0, vLocal.y);
    vec3 col = mix(uAccent, uHot, side) * (0.1 + 0.22 * diff) + uAccent * fres * 0.35;
    col += uHot * wave * 0.9 * side;
  #else
    vec2 grid = vec2(atan(n.z, n.x) * (11.0 / 3.14159265), acos(clamp(n.y, -1.0, 1.0)) * 7.0);
    float dots = smoothstep(0.34, 0.12, length(fract(grid) - 0.5));
    // Beads are stretched along local z, so |z| near 1 is the seam where neighbours touch.
    float seam = smoothstep(0.6, 0.98, abs(n.z));
    vec3 col = uBase * (0.3 + 0.8 * diff) + uAccent * fres * 1.1 + uAccent * dots * 0.2 * (0.4 + diff);
    col += uHot * (seam * (0.45 + 1.8 * wave) + dots * (wave * 1.3 + flick * 0.8) * (0.3 + fres));
  #endif
    gl_FragColor = vec4(mix(col, uFogColor, vFog), 1.0);
    #include <colorspace_fragment>
  }
`;

const SPARK_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aStrand;
  attribute float aOff;
  uniform float uTime;
  uniform float uBuild;
  uniform float uPx;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uTop;
  uniform float uSpan;
  varying float vAlpha;
  varying float vHot;

  void main() {
    float t = fract(aSeed + uTime * aSpeed);
    float y = uTop - t * uSpan;
    float a = ${TWIST.toFixed(6)} * y + aStrand * 3.14159265 + (aOff - 0.5) * 0.5;
    float r = ${(HELIX_RADIUS + 0.28).toFixed(3)} + aOff * 0.2;
    vec4 mv = modelViewMatrix * vec4(r * cos(a), y, r * sin(a), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min((0.3 + aOff * 0.45) * uPx / -mv.z, 64.0);
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, -mv.z);
    vAlpha = smoothstep(0.55, 1.0, uBuild) * smoothstep(0.0, 0.04, t) * smoothstep(1.0, 0.96, t) * fog;
    vHot = step(0.22, aSeed);
  }
`;

const GLOW_FRAG = /* glsl */ `
  uniform vec3 uHot;
  uniform vec3 uAccent;
  varying float vAlpha;
  varying float vHot;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 c = mix(uAccent, uHot, vHot) * (1.0 + 2.5 * smoothstep(0.16, 0.0, d));
    gl_FragColor = vec4(c, a * a * vAlpha);
    #include <colorspace_fragment>
  }
`;

const BOKEH_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  attribute float aWarm;
  uniform float uTime;
  uniform float uBuild;
  uniform float uPx;
  varying float vAlpha;
  varying float vWarm;

  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.15 + aSeed * 6.28) * 0.7;
    p.x += cos(uTime * 0.11 + aSeed * 12.0) * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = min(aSize * uPx / depth, 220.0);
    // Sprites right in front of the lens would fill the screen, and far ones read as noise.
    vAlpha = smoothstep(2.0, 6.0, depth) * (1.0 - 0.75 * smoothstep(18.0, 50.0, depth)) * smoothstep(0.1, 0.7, uBuild);
    vWarm = aWarm;
  }
`;

const BOKEH_FRAG = /* glsl */ `
  uniform vec3 uAccent;
  varying float vAlpha;
  varying float vWarm;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disk = smoothstep(0.5, 0.42, d);
    float rim = smoothstep(0.28, 0.46, d) * disk;
    vec3 cool = mix(vec3(0.16, 0.24, 0.85), uAccent, 0.35);
    vec3 c = mix(cool, vec3(1.0, 0.45, 0.12), vWarm);
    gl_FragColor = vec4(c, (disk * 0.22 + rim * 0.22) * vAlpha);
    #include <colorspace_fragment>
  }
`;

function useDisposable<T extends { dispose: () => void }>(items: T[]) {
  useEffect(() => () => items.forEach((i) => i.dispose()), [items]);
}

function Strands({ uniforms, count }: { uniforms: HelixUniforms; count: number }) {
  const [mesh, geometry, material] = useMemo(() => {
    const bottom = bottomFor(count);
    const step = 0.31;
    const perStrand = Math.floor((TOP - bottom) / step) + 1;
    const total = perStrand * 2;
    const geo = new THREE.SphereGeometry(1, 20, 14);
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: BEAD_VERT, fragmentShader: BEAD_FRAG });
    const inst = new THREE.InstancedMesh(geo, mat, total);
    const aT = new Float32Array(total);
    const aSeed = new Float32Array(total);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const scale = new THREE.Vector3(0.36, 0.36, 0.36);
    const z = new THREE.Vector3(0, 0, 1);
    let k = 0;
    for (let s = 0; s < 2; s++) {
      for (let j = 0; j < perStrand; j++) {
        const y = TOP - j * step;
        const a = TWIST * y + s * Math.PI;
        p.set(HELIX_RADIUS * Math.cos(a), y, HELIX_RADIUS * Math.sin(a));
        tangent.set(-HELIX_RADIUS * Math.sin(a) * TWIST, 1, HELIX_RADIUS * Math.cos(a) * TWIST).normalize();
        q.setFromUnitVectors(z, tangent);
        inst.setMatrixAt(k, m.compose(p, q, scale));
        aT[k] = j / (perStrand - 1);
        aSeed[k] = rand(k + 7);
        k++;
      }
    }
    geo.setAttribute("aT", new THREE.InstancedBufferAttribute(aT, 1));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
    inst.computeBoundingSphere();
    return [inst, geo, mat] as const;
  }, [uniforms, count]);

  useDisposable(useMemo(() => [geometry, material, mesh], [geometry, material, mesh]));
  return <primitive object={mesh} />;
}

function Rungs({ uniforms, count }: { uniforms: HelixUniforms; count: number }) {
  const [mesh, geometry, material] = useMemo(() => {
    const bottom = bottomFor(count);
    const step = 0.93;
    const total = Math.floor((TOP - bottom) / step);
    const geo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: BEAD_VERT,
      fragmentShader: BEAD_FRAG,
      defines: { RUNG: "" },
      side: THREE.DoubleSide,
    });
    const inst = new THREE.InstancedMesh(geo, mat, total);
    const aT = new Float32Array(total);
    const aSeed = new Float32Array(total);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const scale = new THREE.Vector3(0.085, HELIX_RADIUS * 2 - 0.5, 0.085);
    const up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < total; k++) {
      const y = TOP - 0.4 - k * step;
      const a = TWIST * y;
      p.set(0, y, 0);
      q.setFromUnitVectors(up, dir.set(-Math.cos(a), 0, -Math.sin(a)));
      inst.setMatrixAt(k, m.compose(p, q, scale));
      aT[k] = helixT(y, count);
      aSeed[k] = rand(k + 501);
    }
    geo.setAttribute("aT", new THREE.InstancedBufferAttribute(aT, 1));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
    inst.computeBoundingSphere();
    return [inst, geo, mat] as const;
  }, [uniforms, count]);

  useDisposable(useMemo(() => [geometry, material, mesh], [geometry, material, mesh]));
  return <primitive object={mesh} />;
}

function Sparks({ uniforms, count }: { uniforms: HelixUniforms; count: number }) {
  const [geometry, material] = useMemo(() => {
    const n = 150;
    const geo = new THREE.BufferGeometry();
    const attr = (fn: (i: number) => number) => new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => fn(i)), 1);
    // Positions are computed in the shader; this only sizes the draw call.
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("aSeed", attr((i) => rand(i + 900)));
    geo.setAttribute("aSpeed", attr((i) => (0.004 + rand(i + 1200) * 0.012) * (rand(i + 77) > 0.5 ? 1 : -1)));
    geo.setAttribute("aStrand", attr((i) => i % 2));
    geo.setAttribute("aOff", attr((i) => rand(i + 1500)));
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uTop: { value: TOP }, uSpan: { value: TOP - bottomFor(count) } },
      vertexShader: SPARK_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return [geo, mat] as const;
  }, [uniforms, count]);

  useDisposable(useMemo(() => [geometry, material], [geometry, material]));
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export function Helix({ uniforms, count }: { uniforms: HelixUniforms; count: number }) {
  return (
    <>
      <Strands uniforms={uniforms} count={count} />
      <Rungs uniforms={uniforms} count={count} />
      <Sparks uniforms={uniforms} count={count} />
    </>
  );
}

export function Bokeh({ uniforms, count }: { uniforms: HelixUniforms; count: number }) {
  const [geometry, material] = useMemo(() => {
    const n = 220;
    const top = TOP + 10;
    const span = top - (bottomFor(count) - 10);
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const size = new Float32Array(n);
    const warm = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = 6 + rand(i + 3) * 26;
      const a = rand(i + 41) * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = top - rand(i + 83) * span;
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = rand(i + 131);
      size[i] = 0.25 + Math.pow(rand(i + 177), 2.5) * 2.4;
      warm[i] = rand(i + 219) > 0.62 ? 1 : 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aWarm", new THREE.BufferAttribute(warm, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: BOKEH_VERT,
      fragmentShader: BOKEH_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return [geo, mat] as const;
  }, [uniforms, count]);

  useDisposable(useMemo(() => [geometry, material], [geometry, material]));
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

// Point sprites are sized in device pixels, so their world size depends on viewport height, dpr and fov.
export function PointScale({ uniformsRef }: { uniformsRef: RefObject<HelixUniforms> }) {
  useFrame(({ size, gl, camera }) => {
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 50;
    uniformsRef.current.uPx.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  });
  return null;
}
