// Mayuff : les deux puffs du fond, en vrai volume 3D (WebGL, sans bibliothèque).
// Chaque puff = un corps et un embout, deux boîtes aux arêtes arrondies, fermées :
// aucun trou quel que soit l'angle. La photo de la puff est projetée sur la face avant
// et, retournée pour se lire à l'endroit, sur la face arrière ; les flancs sont d'une
// couleur unie en dégradé (tirée du bord de la photo), le tout cerné de noir comme un dessin.
// Textures : assets/mayuff/<puff>-corps|embout.webp
import { prefersReducedMotion } from './utils.js';

const PUFF_H = 640;    // hauteur de référence en px CSS, réduite ensuite selon l'écran
const DEPTH = 0.58;    // épaisseur rapportée à la largeur
const CAMERA = 1700;   // distance de la caméra, comme une perspective CSS de 1700px
// Mesures tirées des photos : demi-largeur du corps (r), de l'embout (rc), hauteur de l'embout,
// arrondi du corps, largeur réelle de l'embout en bas et en haut (part de sa texture),
// couleurs des flancs (haut, bas) du corps et de l'embout.
const PUFFS = [
  {
    name: 'rose', side: -1, r: 100, rc: 62.6, capH: 89.6, corner: 36, cap: [0.94, 0.87], spin: 24, tilt: 7, phase: 0,
    flanc: { corps: ['#F25AB8', '#9A62E0'], embout: ['#F470B2', '#E04E98'] },
  },
  {
    name: 'rouge', side: 1, r: 115.9, rc: 55.4, capH: 85.7, corner: 39, cap: [0.95, 0.92], spin: -28, tilt: -6, phase: 4,
    flanc: { corps: ['#A61C22', '#6E0E13'], embout: ['#CC444B', '#A3282F'] },
  },
];
const OUTLINE = 3.2;   // épaisseur du contour noir, en px à l'écran
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

let canvas = null;
let gl = null;
let prog = null;
let meshes = [];
let raf = 0;
let t0 = 0;
let staticDrawn = '';

export function setPuffs(on) {
  if (!on) { destroy(); return; }
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'puffs';
  canvas.setAttribute('aria-hidden', 'true');
  gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) { canvas = null; return; }   // pas de WebGL : pas de puffs, le reste du thème reste
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); destroy(); });
  document.body.prepend(canvas);
  setup();
  t0 = performance.now();
  raf = requestAnimationFrame(frame);
}

function destroy() {
  cancelAnimationFrame(raf);
  raf = 0;
  if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
  canvas?.remove();
  canvas = null; gl = null; prog = null; meshes = []; staticDrawn = '';
}

/* ------------------------------------------------------------ Géométrie */
/** Coordonnées le long d'un axe : serrées dans les arrondis, rien à plat (la texture y est linéaire). */
function axis(h, rad, n = 8) {
  const a = [];
  for (let i = 0; i <= n; i++) a.push(-h + (rad * i) / n);
  for (let i = n; i >= 0; i--) a.push(h - (rad * i) / n);
  return a;
}

/**
 * Boîte aux arêtes arrondies, centrée sur l'origine.
 * half : demi-dimensions [x, y, z] ; rad : arrondi ; taper : rétrécissement vers le haut (0 à 1) ;
 * uvOf(x, y, front) : coordonnées de texture d'un point, front = moitié avant (z > 0).
 * Les faces latérales sont coupées en z = 0 pour que l'avant et l'arrière aient chacun leur texture.
 */
function roundedBox(half, rad, taper, uvOf) {
  const pos = [], nrm = [], uv = [], idx = [];
  const inner = half.map((h) => h - rad);
  const lists = half.map((h) => axis(h, rad));
  const split = (L) => [[...L.filter((v) => v < 0), 0], [0, ...L.filter((v) => v > 0)]];
  for (let a = 0; a < 3; a++) {
    for (const s of [-1, 1]) {
      const [b, c] = [0, 1, 2].filter((k) => k !== a);
      const Bs = b === 2 ? split(lists[b]) : [lists[b]];
      const Cs = c === 2 ? split(lists[c]) : [lists[c]];
      for (const B of Bs) {
        for (const C of Cs) {
          const zs = b === 2 ? B : c === 2 ? C : null;
          const front = zs ? zs[zs.length - 1] > 0 : s > 0;
          const base = pos.length / 3;
          for (const vb of B) {
            for (const vc of C) {
              const p = [0, 0, 0];
              p[a] = s * half[a]; p[b] = vb; p[c] = vc;
              const core = p.map((v, k) => Math.max(-inner[k], Math.min(inner[k], v)));
              const d = p.map((v, k) => v - core[k]);
              const len = Math.hypot(d[0], d[1], d[2]);
              const n = d.map((v) => v / len);
              const q = core.map((v, k) => v + n[k] * rad);
              const shrink = 1 - taper * ((q[1] + half[1]) / (2 * half[1]));
              q[0] *= shrink; q[2] *= shrink;
              pos.push(q[0], q[1], q[2]);
              nrm.push(n[0], n[1], n[2]);
              uv.push(...uvOf(q[0], q[1], front));
            }
          }
          const nc = C.length;
          const tris = [];
          for (let i = 0; i < B.length - 1; i++) {
            for (let j = 0; j < nc - 1; j++) {
              const v = base + i * nc + j;
              tris.push(v, v + nc, v + 1, v + 1, v + nc, v + nc + 1);
            }
          }
          // triangles tournés vers l'extérieur : sens inverse si besoin, pour tout le morceau
          for (let t = 0; t < tris.length; t += 3) {
            const [A, B2, C2] = [tris[t], tris[t + 1], tris[t + 2]].map((k) => pos.slice(k * 3, k * 3 + 3));
            const u = [B2[0] - A[0], B2[1] - A[1], B2[2] - A[2]], w = [C2[0] - A[0], C2[1] - A[1], C2[2] - A[2]];
            const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
            const area = Math.hypot(...cr);
            if (area < 1e-3) continue;
            const nk = tris[t] * 3;
            if (cr[0] * nrm[nk] + cr[1] * nrm[nk + 1] + cr[2] * nrm[nk + 2] < 0) {
              for (let k = 0; k < tris.length; k += 3) [tris[k + 1], tris[k + 2]] = [tris[k + 2], tris[k + 1]];
            }
            break;
          }
          idx.push(...tris);
        }
      }
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
}

/** Projection de face : la photo devant, la même retournée derrière (pour qu'elle se lise à l'endroit). */
const planar = (halfW, y0, texH) => (x, y, front) => {
  const u = (x / halfW + 1) / 2;
  return [front ? u : 1 - u, (y - y0) / texH];
};

function puffParts(P) {
  const bodyH = PUFF_H - P.capH + 3;   // 3 px sous l'embout, pour qu'ils se touchent
  const capRad = 12;
  const capBot = P.rc * P.cap[0];
  const capHH = (P.capH + capRad) / 2; // l'embout descend dans le corps : pas de creux à la jonction
  const body = roundedBox([P.r, bodyH / 2, P.r * DEPTH], P.corner, 0, planar(P.r, -bodyH / 2, bodyH));
  const cap = roundedBox([capBot, capHH, capBot * DEPTH], capRad, 1 - P.cap[1] / P.cap[0], planar(P.rc, capHH - P.capH, P.capH));
  return [
    { geo: body, y: -PUFF_H / 2 + bodyH / 2, url: `assets/mayuff/${P.name}-corps.webp`, flanc: P.flanc.corps },
    { geo: cap, y: PUFF_H / 2 - capHH, url: `assets/mayuff/${P.name}-embout.webp`, flanc: P.flanc.embout },
  ];
}

/* --------------------------------------------------------------- WebGL */
const VS = `
attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUv;
uniform mat4 uMvp; uniform mat4 uRot; uniform float uGrow;
varying vec3 vN; varying vec3 vO; varying vec2 vUv;
void main() {
  vO = aNrm;
  vN = (uRot * vec4(aNrm, 0.0)).xyz;
  vUv = aUv;
  gl_Position = uMvp * vec4(aPos + aNrm * uGrow, 1.0);
}`;
// précédé de AA(x) : largeur d'un pixel (fwidth si la carte graphique le permet)
const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec3 uLight; uniform vec3 uTop; uniform vec3 uBot; uniform float uInk;
varying vec3 vN; varying vec3 vO; varying vec2 vUv;
void main() {
  if (uInk > 0.5) { gl_FragColor = vec4(0.08, 0.02, 0.06, 1.0); return; }   // contour
  vec3 n = normalize(vN);
  // face avant / arrière : la photo ; flancs et dessus : dégradé uni ; trait noir à la jonction
  float m = max(abs(vO.x), abs(vO.y));
  float aa = AA(m);
  float side = smoothstep(0.69 - aa, 0.69 + aa, m);
  vec3 flat_ = mix(uBot, uTop, clamp(vUv.y, 0.0, 1.0));
  vec3 c = mix(texture2D(uTex, vUv).rgb, flat_, side);
  float line = 1.0 - smoothstep(aa * 0.8, aa * 2.2, abs(m - 0.69));
  float d = max(dot(n, uLight), 0.0);
  float spec = pow(max(dot(n, normalize(uLight + vec3(0.0, 0.0, 1.0))), 0.0), 48.0) * 0.32;
  vec3 col = c * (0.6 + 0.5 * d) + spec;
  gl_FragColor = vec4(mix(col, vec3(0.08, 0.02, 0.06), line), 1.0);
}`;

function setup() {
  const deriv = gl.getExtension('OES_standard_derivatives');   // avant de compiler les shaders
  const fs = (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define AA(x) fwidth(x)\n' : '#define AA(x) 0.015\n') + FS;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
    return s;
  };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  prog.loc = Object.fromEntries([
    ...['aPos', 'aNrm', 'aUv'].map((n) => [n, gl.getAttribLocation(prog, n)]),
    ...['uMvp', 'uRot', 'uGrow', 'uTex', 'uLight', 'uTop', 'uBot', 'uInk'].map((n) => [n, gl.getUniformLocation(prog, n)]),
  ]);
  const L = [-0.45, 0.55, 0.85];
  const l = Math.hypot(...L);
  gl.uniform3f(prog.loc.uLight, L[0] / l, L[1] / l, L[2] / l);
  gl.uniform1i(prog.loc.uTex, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

  meshes = PUFFS.map((P) => ({
    P,
    parts: puffParts(P).map(({ geo, y, url, flanc }) => {
      const buf = (data, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
      const part = {
        y, top: rgb(flanc[0]), bot: rgb(flanc[1]),
        pos: buf(geo.pos), nrm: buf(geo.nrm), uv: buf(geo.uv), idx: buf(geo.idx, gl.ELEMENT_ARRAY_BUFFER), count: geo.idx.length, tex: null,
      };
      const mine = gl;
      const img = new Image();
      img.onload = () => {
        if (gl !== mine) return;   // thème changé entre-temps
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);   // textures en puissances de 2
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
        part.tex = t;
        staticDrawn = '';
      };
      img.src = url;
      return part;
    }),
  }));
}

/* -------------------------------------------------------------- Matrices (colonnes) */
const mul = (a, b) => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
};
const T = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const S = (k) => new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
const perspective = (fovy, aspect, near, far) => {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
};
const DEG = Math.PI / 180;

/* --------------------------------------------------------------- Rendu */
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!gl) return;
  const W = window.innerWidth, H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const reduced = prefersReducedMotion();
  const key = `${W}x${H}@${dpr}`;
  if (reduced && staticDrawn === key) return;   // image fixe déjà dessinée
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 1 unité = 1 px CSS dans le plan des puffs
  const proj = mul(perspective(2 * Math.atan(H / 2 / CAMERA), W / H, 200, 4000), T(0, 0, -CAMERA));
  const k = Math.max(0.45, Math.min(1.05, (H * 0.78) / PUFF_H));
  const margin = W <= 760 ? 40 : Math.max(112, Math.min(256, W * 0.15));
  const t = (now - t0) / 1000;
  const L = prog.loc;

  for (const { P, parts } of meshes) {
    // flottement lent (8 s aller, 8 s retour) et rotation continue
    const s = reduced ? 0.5 : (1 - Math.cos(((t + P.phase) / 8) * Math.PI)) / 2;
    const spin = reduced ? -28 * DEG : ((t / P.spin) * 360 + (P.side > 0 ? 160 : 0)) * DEG;
    const x = P.side * (W / 2 - margin);
    const y = (0.03 - 0.06 * s) * PUFF_H * k;
    const rot = mul(RX((9 + 4 * s) * DEG), mul(RZ((P.tilt + (-0.4 * P.tilt - P.tilt) * s) * DEG), RY(spin)));
    const model = mul(T(x, y, 0), mul(S(k), rot));
    gl.uniformMatrix4fv(L.uRot, false, rot);
    for (const part of parts) {
      if (!part.tex) continue;
      gl.uniformMatrix4fv(L.uMvp, false, mul(proj, mul(model, T(0, part.y, 0))));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, part.tex);
      gl.uniform3fv(L.uTop, part.top);
      gl.uniform3fv(L.uBot, part.bot);
      [['aPos', part.pos, 3], ['aNrm', part.nrm, 3], ['aUv', part.uv, 2]].forEach(([name, b, n]) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.enableVertexAttribArray(L[name]);
        gl.vertexAttribPointer(L[name], n, gl.FLOAT, false, 0, 0);
      });
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.idx);
      // 1. contour : la même forme gonflée, dont on ne garde que l'arrière, en noir
      gl.cullFace(gl.FRONT);
      gl.uniform1f(L.uGrow, OUTLINE / k);
      gl.uniform1f(L.uInk, 1);
      gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_SHORT, 0);
      // 2. la puff elle-même
      gl.cullFace(gl.BACK);
      gl.uniform1f(L.uGrow, 0);
      gl.uniform1f(L.uInk, 0);
      gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_SHORT, 0);
    }
  }
  if (reduced && meshes.every((m) => m.parts.every((p) => p.tex))) staticDrawn = key;
}
