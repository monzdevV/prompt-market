"use client";

import type { MotionValue } from "motion/react";
import { useEffect, useRef } from "react";

// Shared by both passes so the nebula, the motes and the helix drift through the same hues.
const PALETTE = /* glsl */ `
vec3 palette(float t) {
  vec3 indigo = vec3(0.29, 0.25, 0.92);
  vec3 cyan = vec3(0.1, 0.72, 1.0);
  vec3 amber = vec3(1.0, 0.56, 0.16);
  t = fract(t) * 3.0;
  if (t < 1.0) return mix(indigo, cyan, smoothstep(0.0, 1.0, t));
  if (t < 2.0) return mix(cyan, amber, smoothstep(1.0, 2.0, t));
  return mix(amber, indigo, smoothstep(2.0, 3.0, t));
}
float phaseOf(float time, float prog) {
  return time * 0.018 + prog * 0.9;
}
`;

const QUAD_VS = /* glsl */ `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const NEBULA_FS = /* glsl */ `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_prog;
uniform vec2 u_mouse;
varying vec2 v_uv;
${PALETTE}
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 uv = v_uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y + u_mouse * 0.035;
  float t = u_time * 0.045;
  // Scrolling pulls the field upward, so the fall reads against the background too.
  p.y -= u_prog * 1.4;

  vec2 q = vec2(fbm(p * 1.5 + vec2(0.0, t)), fbm(p * 1.5 + vec2(5.2, 1.3 - t * 0.8)));
  vec2 r = vec2(fbm(p * 1.3 + 3.2 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p * 1.3 + 3.2 * q + vec2(8.3, 2.8) - t * 0.5));
  float f = fbm(p * 1.2 + 2.4 * r);

  float phase = phaseOf(u_time, u_prog);
  vec3 a = palette(phase + length(q) * 0.35);
  vec3 b = palette(phase + 0.4 + r.x * 0.45);

  vec3 col = mix(vec3(0.012, 0.018, 0.06), vec3(0.07, 0.09, 0.32), smoothstep(0.15, 0.85, f));
  col += a * pow(smoothstep(0.38, 0.95, f), 2.0) * 0.95;
  col += b * pow(r.y, 2.6) * 0.55;
  // Thin amber filaments where the warped layers overlap, like the glints on the reference helix.
  float ridge = smoothstep(0.035, 0.0, abs(f - 0.55 + 0.1 * sin(phase * 6.2831))) * smoothstep(0.3, 0.7, r.x);
  col += vec3(1.0, 0.55, 0.18) * ridge * (0.35 + 0.35 * smoothstep(0.2, 0.8, u_prog));

  // Cool light spilling from the top opening, warm pool at the landing floor.
  col += vec3(0.3, 0.5, 1.0) * exp(-pow((1.0 - uv.y) * 2.8, 2.0)) * exp(-pow((uv.x - 0.5) * 2.4, 2.0)) * 0.22;
  float floorGlow = exp(-pow(uv.y * 3.4, 2.0)) * exp(-pow((uv.x - 0.5) * 1.8, 2.0));
  col += vec3(1.0, 0.48, 0.14) * floorGlow * (0.08 + 0.4 * smoothstep(0.35, 0.8, u_prog));

  vec2 v = (uv - 0.5) * vec2(1.1, 1.0);
  col *= 1.0 - 0.9 * dot(v, v);
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

const POINTS_VS = /* glsl */ `
attribute vec4 a_seed;
attribute float a_kind;
uniform vec2 u_res;
uniform float u_time;
uniform float u_prog;
uniform float u_scale;
uniform float u_max;
uniform float u_intro;
uniform vec2 u_mouse;
varying vec3 v_col;
varying float v_alpha;
varying float v_soft;
${PALETTE}
void main() {
  float aspect = u_res.x / u_res.y;
  float phase = phaseOf(u_time, u_prog);
  vec2 pos;
  float size;
  float alpha;

  if (a_kind < 0.5) {
    // Floating motes and out-of-focus bokeh; nearer ones rise faster with scroll (parallax fall).
    float depth = a_seed.z;
    float y = fract(a_seed.y + u_time * (0.004 + 0.01 * depth) + u_prog * (0.35 + 1.5 * depth));
    pos = vec2((a_seed.x * 2.0 - 1.0) * aspect * 1.05 + sin(u_time * 0.2 + a_seed.w * 6.28) * 0.03, y * 2.5 - 1.25);
    pos += u_mouse * (0.02 + 0.07 * depth);
    bool big = a_seed.w > 0.84;
    size = big ? mix(22.0, 74.0, fract(a_seed.w * 13.0)) * (0.55 + depth * 0.6) : mix(1.4, 4.6, depth);
    alpha = big ? 0.1 + 0.18 * depth : 0.4 + 0.6 * depth;
    alpha *= 0.6 + 0.4 * sin(u_time * (0.5 + a_seed.x) + a_seed.w * 20.0);
    vec3 warm = vec3(1.0, 0.6, 0.24);
    v_col = mix(palette(phase + a_seed.x * 0.6), warm, step(0.5, fract(a_seed.w * 7.0)) * 0.75);
    v_soft = big ? 0.0 : 1.0;
  } else {
    // The double helix runs across the screen behind the name, and unzips into loose sparks as the fall begins.
    float s = a_seed.x;
    float rung = a_seed.z;
    float turns = 4.5;
    float ang = s * 6.28318 * turns - u_time * 0.55 - u_prog * 9.0 + a_seed.y * 3.14159;
    float y;
    float z;
    if (rung < 0.0) {
      y = cos(ang);
      z = sin(ang);
    } else {
      y = mix(cos(ang), -cos(ang), rung);
      z = mix(sin(ang), -sin(ang), rung);
    }
    float depth = z * 0.5 + 0.5;
    float unzip = smoothstep(0.015, 0.16, u_prog);
    float side = rung < 0.0 ? (a_seed.y < 0.5 ? 1.0 : -1.0) : (rung - 0.5) * 2.0;
    float amp = 0.27 * (0.85 + 0.15 * sin(s * 9.0 + u_time * 0.4));
    pos = vec2((s * 2.0 - 1.0) * aspect * 1.12, y * amp + sin(s * 3.1 + u_time * 0.25) * 0.05);
    // Unzipping: strands peel apart, drift up and scatter by their own seed.
    pos.y += side * unzip * (0.35 + a_seed.w * 0.5) + unzip * unzip * (0.6 + a_seed.w);
    pos.x += (a_seed.w - 0.5) * unzip * 0.6;
    float tilt = -0.12;
    pos = vec2(pos.x * cos(tilt) - pos.y * sin(tilt), pos.x * sin(tilt) + pos.y * cos(tilt));
    pos.y += 0.02;
    pos += u_mouse * (0.02 + 0.05 * depth);

    // Built left to right on load, like a strand being sequenced.
    float build = smoothstep(s - 0.08, s, u_intro * 1.15 - 0.05);
    float ends = smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.94, 1.0, s));
    // Amber light travels along the strands, the glints in the reference image.
    float pulse = pow(0.5 + 0.5 * sin(s * 38.0 - u_time * 2.2 + a_seed.y * 2.0), 6.0);
    float spark = pow(fract(s * 3.0 - u_time * 0.12 + a_seed.y * 0.5), 18.0);
    vec3 strandCol = mix(vec3(0.26, 0.3, 0.95), palette(phase + s * 0.35), 0.45);
    vec3 amber = vec3(1.0, 0.58, 0.2);
    if (rung < 0.0) {
      size = mix(8.0, 24.0, depth);
      alpha = mix(0.12, 0.62, depth);
      v_col = mix(strandCol, amber, clamp(pulse * 0.7 + spark * 1.5, 0.0, 1.0));
      size *= 1.0 + spark * 0.8;
    } else {
      size = mix(4.0, 9.0, depth);
      alpha = mix(0.1, 0.5, depth);
      v_col = mix(palette(phase + 0.3 + s * 0.4), amber, step(0.5, fract(s * 13.0)) * 0.8);
    }
    alpha *= ends * build * (1.0 - smoothstep(0.1, 0.26, u_prog) * 0.92);
    // Strand beads are shaded spheres; once unzipped they soften into sparks.
    v_soft = rung < 0.0 ? 2.0 - unzip : 1.0;
  }

  v_alpha = alpha;
  gl_PointSize = min(size * u_scale, u_max);
  gl_Position = vec4(pos.x / aspect, pos.y, 0.0, 1.0);
}
`;

const POINTS_FS = /* glsl */ `
precision mediump float;
varying vec3 v_col;
varying float v_alpha;
varying float v_soft;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = exp(-d * d * 5.0);
  float disk = (1.0 - smoothstep(0.78, 1.0, d)) * (0.7 + 0.3 * smoothstep(0.4, 0.95, d));
  // Bead: a lit sphere with a dotted surface and a soft halo, like the reference strands.
  vec2 c = gl_PointCoord - 0.5;
  float lit = 0.55 + 0.45 * clamp(1.0 - length(c - vec2(-0.14, -0.14)) * 2.2, 0.0, 1.0);
  float dots = 0.8 + 0.2 * step(0.5, fract((c.x + c.y) * 9.0) * fract((c.x - c.y) * 9.0) * 4.0);
  float bead = (1.0 - smoothstep(0.5, 0.62, d)) * lit * dots + exp(-d * d * 4.0) * 0.35;
  float a = (v_soft > 1.0 ? mix(core, bead, v_soft - 1.0) : mix(disk, core, v_soft)) * v_alpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(v_col * a, a);
}
`;

const MAX_PIXELS = 2_000_000;

function compile(gl: WebGLRenderingContext, vs: string, fs: string) {
  const program = gl.createProgram();
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  return program;
}

function seeds(mobile: boolean) {
  const out: number[] = [];
  const motes = mobile ? 110 : 220;
  for (let i = 0; i < motes; i++) out.push(Math.random(), Math.random(), Math.random() ** 1.6, Math.random(), 0);
  const perStrand = mobile ? 150 : 260;
  for (let strand = 0; strand < 2; strand++)
    for (let i = 0; i < perStrand; i++) out.push(i / perStrand, strand, -1, Math.random(), 1);
  const rungs = mobile ? 40 : 66;
  for (let i = 0; i < rungs; i++)
    for (let k = 1; k < 8; k++) out.push((i + 0.5) / rungs, 0, k / 8, Math.random(), 1);
  return new Float32Array(out);
}

export function HeroCanvas({ progress }: { progress: MotionValue<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    // Without WebGL the CSS gradient behind the canvas stays as the backdrop.
    if (!gl) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let time = 12;
    let intro = 0;
    let last = 0;
    let raf = 0;
    let visible = true;
    let count = 0;
    let scene: ReturnType<typeof build> | null = null;

    function build(gl: WebGLRenderingContext) {
      const nebula = compile(gl, QUAD_VS, NEBULA_FS);
      const points = compile(gl, POINTS_VS, POINTS_FS);

      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

      const data = seeds(window.innerWidth < 768);
      count = data.length / 5;
      const pts = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pts);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      const u = (p: WebGLProgram, names: string[]) =>
        Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
      return {
        nebula,
        points,
        quad,
        pts,
        aQuad: gl.getAttribLocation(nebula, "a_pos"),
        aSeed: gl.getAttribLocation(points, "a_seed"),
        aKind: gl.getAttribLocation(points, "a_kind"),
        un: u(nebula, ["u_res", "u_time", "u_prog", "u_mouse"]),
        up: u(points, ["u_res", "u_time", "u_prog", "u_scale", "u_max", "u_intro", "u_mouse"]),
        maxPoint: (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1],
      };
    }

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // The nebula is soft, so on big screens trading resolution for frame rate is invisible.
      if (w * h * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (w * h));
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };

    const draw = () => {
      if (!scene) return;
      const s = scene;
      const w = canvas.width;
      const h = canvas.height;
      const prog = progress.get();
      gl.viewport(0, 0, w, h);

      gl.disable(gl.BLEND);
      gl.useProgram(s.nebula);
      gl.bindBuffer(gl.ARRAY_BUFFER, s.quad);
      gl.enableVertexAttribArray(s.aQuad);
      gl.vertexAttribPointer(s.aQuad, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(s.un.u_res, w, h);
      gl.uniform1f(s.un.u_time, time);
      gl.uniform1f(s.un.u_prog, prog);
      gl.uniform2f(s.un.u_mouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(s.aQuad);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(s.points);
      gl.bindBuffer(gl.ARRAY_BUFFER, s.pts);
      gl.enableVertexAttribArray(s.aSeed);
      gl.enableVertexAttribArray(s.aKind);
      gl.vertexAttribPointer(s.aSeed, 4, gl.FLOAT, false, 20, 0);
      gl.vertexAttribPointer(s.aKind, 1, gl.FLOAT, false, 20, 16);
      gl.uniform2f(s.up.u_res, w, h);
      gl.uniform1f(s.up.u_time, time);
      gl.uniform1f(s.up.u_prog, prog);
      const cssH = canvas.clientHeight || h;
      gl.uniform1f(s.up.u_scale, (h / cssH) * Math.min(1.4, Math.max(0.7, cssH / 900)));
      gl.uniform1f(s.up.u_max, s.maxPoint);
      gl.uniform1f(s.up.u_intro, intro);
      gl.uniform2f(s.up.u_mouse, mouse.x, mouse.y);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disableVertexAttribArray(s.aSeed);
      gl.disableVertexAttribArray(s.aKind);
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      intro = Math.min(1, intro + dt / 2.2);
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3);
      mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const running = () => raf !== 0;
    const update = () => {
      const should = visible && !document.hidden && !reduced.matches && !!scene;
      if (should && !running()) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!should && running()) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (reduced.matches) {
        intro = 1;
        draw();
      }
    };

    const init = () => {
      try {
        scene = build(gl);
      } catch (err) {
        console.error(err);
        scene = null;
        return;
      }
      resize();
      draw();
      update();
    };

    const onPointer = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      scene = null;
      update();
    };

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    // Reduced motion still follows the scroll-driven colour shift, one static frame per change.
    const unsubscribe = progress.on("change", () => {
      if (reduced.matches) draw();
    });

    ro.observe(canvas);
    io.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", init);
    init();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      unsubscribe();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", init);
      if (scene) {
        gl.deleteProgram(scene.nebula);
        gl.deleteProgram(scene.points);
        gl.deleteBuffer(scene.quad);
        gl.deleteBuffer(scene.pts);
      }
    };
  }, [progress]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 block size-full" />;
}
