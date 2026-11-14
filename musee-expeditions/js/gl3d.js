/* Musée & Expéditions — gl3d.js
 * Petit moteur 3D WebGL sans dépendance : maths, construction de maillages,
 * éclairage « ombré BD » en aplats, ombres portées, contours encrés,
 * transparence (vitrines), sprites (objets illustrés), caméra orbitale et sélection.
 */
(function (G) {
  'use strict';
  const ME = G.ME;
  const GL3D = (ME.GL3D = {});

  /* ================= Maths (matrices colonne-major) ================= */
  const M = (GL3D.M4 = {
    ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return o;
    },
    chain(...ms) { return ms.reduce((a, b) => M.mul(a, b)); },
    T(x, y, z) { const m = M.ident(); m[12] = x; m[13] = y; m[14] = z; return m; },
    S(x, y, z) { const m = M.ident(); m[0] = x; m[5] = y == null ? x : y; m[10] = z == null ? x : z; return m; },
    RX(a) { const m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
    RY(a) { const m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
    RZ(a) { const m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
    persp(fovy, aspect, n, f) {
      const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
      m[0] = t / aspect; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f);
      return m;
    },
    ortho(l, r, b, t, n, f) {
      const m = M.ident();
      m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
      m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n);
      return m;
    },
    lookAt(e, c, up) {
      let z = V.norm(V.sub(e, c)), x = V.norm(V.cross(up || [0, 1, 0], z)), y = V.cross(z, x);
      const m = M.ident();
      m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
      m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
      m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
      m[12] = -V.dot(x, e); m[13] = -V.dot(y, e); m[14] = -V.dot(z, e);
      return m;
    },
    invert(a) {
      const o = new Float32Array(16);
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return M.ident();
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return o;
    },
    apply(m, p) {
      const x = p[0], y = p[1], z = p[2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
      return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w];
    },
    project(m, p) { // renvoie [x, y, z, w] en coordonnées de découpe
      const x = p[0], y = p[1], z = p[2];
      return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
    },
  });
  const V = (GL3D.V3 = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  });

  GL3D.hex = function (h) {
    if (Array.isArray(h)) return h;
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  GL3D.mix = (a, b, t) => { a = GL3D.hex(a); b = GL3D.hex(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

  /* ================= Primitives (triangles en espace local, centrés) ================= */
  const P = (GL3D.Prims = {});
  function quad(out, a, b, c, d) { out.push([a, b, c], [a, c, d]); }
  P.box = function () {
    const h = 0.5, t = [];
    const v = [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]];
    quad(t, v[4], v[5], v[6], v[7]); quad(t, v[1], v[0], v[3], v[2]);
    quad(t, v[5], v[1], v[2], v[6]); quad(t, v[0], v[4], v[7], v[3]);
    quad(t, v[7], v[6], v[2], v[3]); quad(t, v[0], v[1], v[5], v[4]);
    return t;
  };
  /** Cylindre (ou cône) de hauteur 1 centré, rayons haut/bas. */
  P.cyl = function (seg, rTop, rBot, caps) {
    seg = seg || 12; rTop = rTop == null ? 0.5 : rTop; rBot = rBot == null ? 0.5 : rBot;
    const t = [];
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const b0 = [Math.cos(a0) * rBot, -0.5, Math.sin(a0) * rBot], b1 = [Math.cos(a1) * rBot, -0.5, Math.sin(a1) * rBot];
      const u0 = [Math.cos(a0) * rTop, 0.5, Math.sin(a0) * rTop], u1 = [Math.cos(a1) * rTop, 0.5, Math.sin(a1) * rTop];
      if (rTop > 0) quad(t, b0, b1, u1, u0); else t.push([b0, b1, u0]);
      if (caps !== false) {
        if (rTop > 0) t.push([[0, 0.5, 0], u0, u1]);
        if (rBot > 0) t.push([[0, -0.5, 0], b1, b0]);
      }
    }
    return t;
  };
  P.sphere = function (lat, lon) {
    lat = lat || 6; lon = lon || 10;
    const t = [], pt = (i, j) => { const th = i / lat * Math.PI, ph = j / lon * Math.PI * 2; return [Math.sin(th) * Math.cos(ph) * 0.5, Math.cos(th) * 0.5, Math.sin(th) * Math.sin(ph) * 0.5]; };
    for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      if (i === 0) t.push([a, b, c]); else if (i === lat - 1) t.push([a, b, d]); else quad(t, a, b, c, d);
    }
    return t;
  };
  /** Tour de potier : profil [[r, y], ...] de bas en haut. */
  P.lathe = function (profile, seg) {
    seg = seg || 14;
    const t = [];
    for (let k = 0; k < profile.length - 1; k++) {
      const [r0, y0] = profile[k], [r1, y1] = profile[k + 1];
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        const p00 = [Math.cos(a0) * r0, y0, Math.sin(a0) * r0], p01 = [Math.cos(a1) * r0, y0, Math.sin(a1) * r0];
        const p10 = [Math.cos(a0) * r1, y1, Math.sin(a0) * r1], p11 = [Math.cos(a1) * r1, y1, Math.sin(a1) * r1];
        if (r0 === 0) t.push([p00, p11, p10]); else if (r1 === 0) t.push([p00, p01, p10]); else quad(t, p00, p01, p11, p10);
      }
    }
    return t;
  };
  /** Prisme triangulaire (tente, toit) : section dans le plan XY, profondeur Z = 1. */
  P.prism = function () {
    const a = [-0.5, -0.5], b = [0.5, -0.5], c = [0, 0.5], t = [];
    const f = (p, z) => [p[0], p[1], z];
    t.push([f(a, 0.5), f(b, 0.5), f(c, 0.5)], [f(a, -0.5), f(c, -0.5), f(b, -0.5)]);
    quad(t, f(a, -0.5), f(b, -0.5), f(b, 0.5), f(a, 0.5));
    quad(t, f(b, -0.5), f(c, -0.5), f(c, 0.5), f(b, 0.5));
    quad(t, f(c, -0.5), f(a, -0.5), f(a, 0.5), f(c, 0.5));
    return t;
  };
  P.plane = function () { const h = 0.5; return [[[-h, 0, h], [h, 0, h], [h, 0, -h]], [[-h, 0, h], [h, 0, -h], [-h, 0, -h]]]; };

  const CACHE = {};
  function prim(name, ...args) { const k = name + args.join(','); return CACHE[k] || (CACHE[k] = P[name](...args)); }
  GL3D.prim = prim;

  /* ================= Constructeur de maillage ================= */
  /** Accumule des triangles transformés, colorés, avec normale plate (lumière)
   *  et normale lissée (contour encré). Orientation corrigée par rapport au centre local. */
  class Builder {
    constructor() { this.data = []; this.count = 0; }
    add(tris, color, m, opt) {
      opt = opt || {};
      const col = GL3D.hex(color);
      const center = opt.center || 'origin';
      const out = [];
      const smooth = new Map();
      const key = (p) => Math.round(p[0] * 500) + ',' + Math.round(p[1] * 500) + ',' + Math.round(p[2] * 500);
      for (const tri of tris) {
        let [a, b, c] = tri;
        if (center !== 'none') {
          const fc = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
          const ref = center === 'axis' ? [0, fc[1], 0] : [0, 0, 0];
          const n = V.cross(V.sub(b, a), V.sub(c, a));
          if (V.dot(n, V.sub(fc, ref)) < 0) { const tmp = b; b = c; c = tmp; }
        }
        const A = M.apply(m, a), B = M.apply(m, b), C = M.apply(m, c);
        const n = V.norm(V.cross(V.sub(B, A), V.sub(C, A)));
        out.push([A, B, C, n]);
        if (opt.outline !== false) for (const p of [A, B, C]) { const k = key(p); const s = smooth.get(k); if (s) { s[0] += n[0]; s[1] += n[1]; s[2] += n[2]; } else smooth.set(k, n.slice()); }
      }
      for (const [A, B, C, n] of out) {
        for (const p of [A, B, C]) {
          const o = opt.outline === false ? [0, 0, 0] : V.norm(smooth.get(key(p)));
          this.data.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], o[0], o[1], o[2]);
          this.count++;
        }
      }
      return this;
    }
    box(m, color, opt) { return this.add(prim('box'), color, m, opt); }
    cyl(m, color, seg, rTop, rBot, opt) { return this.add(prim('cyl', seg || 12, rTop == null ? 0.5 : rTop, rBot == null ? 0.5 : rBot), color, m, opt); }
    sphere(m, color, lat, lon, opt) { return this.add(prim('sphere', lat || 6, lon || 10), color, m, opt); }
    lathe(m, color, profile, seg, opt) { return this.add(P.lathe(profile, seg), color, m, Object.assign({ center: 'axis' }, opt)); }
    prism(m, color, opt) { return this.add(prim('prism'), color, m, opt); }
    plane(m, color, opt) { return this.add(prim('plane'), color, m, Object.assign({ center: 'none', outline: false }, opt)); }
    /** Boîte posée au sol : x, z = centre, y = base. */
    block(x, y, z, w, h, d, color, opt) { return this.box(M.chain(M.T(x, y + h / 2, z), M.S(w, h, d)), color, opt); }
  }
  GL3D.Builder = Builder;

  /* ================= Rendu ================= */
  const VS_MAIN = `
attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol; attribute vec3 aOut;
uniform mat4 uModel, uVP, uLightVP; uniform vec3 uEye; uniform float uOutline;
varying vec3 vN; varying vec3 vCol; varying vec4 vLP; varying vec3 vW;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  if (uOutline > 0.0) { vec3 o = mat3(uModel) * aOut; float d = length(w.xyz - uEye); w.xyz += o * d * uOutline; }
  vW = w.xyz; vN = mat3(uModel) * aNrm; vCol = aCol; vLP = uLightVP * w;
  gl_Position = uVP * w;
}`;
  const FS_MAIN = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uLightDir; uniform sampler2D uShadow; uniform float uUseShadow; uniform float uTexel;
uniform vec3 uTint; uniform float uBright; uniform float uAlpha; uniform float uMode;
varying vec3 vN; varying vec3 vCol; varying vec4 vLP; varying vec3 vW;
float shadowAt(){
  vec3 p = vLP.xyz / vLP.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float s = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    float d = texture2D(uShadow, p.xy + vec2(float(x), float(y)) * uTexel).r;
    s += (p.z - 0.0035 > d) ? 0.0 : 1.0;
  }
  return s / 9.0;
}
void main(){
  if (uMode > 1.5) { gl_FragColor = vec4(0.169, 0.129, 0.094, 1.0); return; }
  vec3 n = normalize(vN);
  float l = max(dot(n, -uLightDir), 0.0);
  if (uUseShadow > 0.5) l *= mix(0.45, 1.0, shadowAt());
  float t = l > 0.62 ? 1.0 : (l > 0.22 ? 0.78 : 0.58);
  float hemi = 0.92 + 0.08 * n.y;
  vec3 c = vCol * uTint * t * hemi * uBright;
  gl_FragColor = vec4(c, uAlpha);
}`;
  const VS_DEPTH = `attribute vec3 aPos; uniform mat4 uModel, uLightVP; void main(){ gl_Position = uLightVP * uModel * vec4(aPos, 1.0); }`;
  const FS_DEPTH = `precision mediump float; void main(){ gl_FragColor = vec4(1.0); }`;
  const VS_SPR = `attribute vec2 aUV; uniform mat4 uModel, uVP; varying vec2 vUV;
void main(){ vUV = vec2(aUV.x, 1.0 - aUV.y); gl_Position = uVP * uModel * vec4(aUV.x - 0.5, aUV.y, 0.0, 1.0); }`;
  const FS_SPR = `precision mediump float; uniform sampler2D uTex; uniform float uBright; varying vec2 vUV;
void main(){ vec4 c = texture2D(uTex, vUV); if (c.a < 0.35) discard; gl_FragColor = vec4(c.rgb * uBright, 1.0); }`;

  GL3D.supported = function () {
    try { const c = G.document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  };

  GL3D.create = function (canvas, opts) {
    opts = opts || {};
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: !!opts.preserve }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const depthExt = gl.getExtension('WEBGL_depth_texture');

    function compile(vs, fs) {
      const p = gl.createProgram();
      [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([type, src]) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader : ' + gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      });
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Programme : ' + gl.getProgramInfoLog(p));
      const u = {}, a = {};
      const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
      for (let i = 0; i < nu; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
      for (let i = 0; i < na; i++) { const info = gl.getActiveAttrib(p, i); a[info.name] = gl.getAttribLocation(p, info.name); }
      return { p, u, a };
    }
    const progMain = compile(VS_MAIN, FS_MAIN);
    const progDepth = compile(VS_DEPTH, FS_DEPTH);
    const progSpr = compile(VS_SPR, FS_SPR);

    const sprBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

    // Carte d'ombres
    const SH = opts.shadowSize || 1536;
    let shadowFB = null, shadowTex = null;
    if (depthExt) {
      shadowTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, shadowTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, SH, SH, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const colorTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, colorTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SH, SH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      shadowFB = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { shadowFB = null; }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    const meshes = new Set();
    const R = {
      gl, hasShadows: !!shadowFB,
      mesh(builder) {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(builder.data), gl.STATIC_DRAW);
        const m = { buf, count: builder.count };
        meshes.add(m);
        return m;
      },
      free(m) { if (m && m.buf) { gl.deleteBuffer(m.buf); meshes.delete(m); m.buf = null; } },
      textures: new Map(),
      /** Texture depuis une image (SVG chargé) : null tant que l'image n'est pas prête. */
      texture(key, img) {
        let t = R.textures.get(key);
        if (t) return t;
        if (!img || !img.complete || img.naturalWidth === 0) return null;
        const cv = G.document.createElement('canvas'); cv.width = cv.height = 256;
        cv.getContext('2d').drawImage(img, 0, 0, 256, 256);
        t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        R.textures.set(key, t);
        return t;
      },
      destroy() {
        meshes.forEach((m) => gl.deleteBuffer(m.buf)); meshes.clear();
        R.textures.forEach((t) => gl.deleteTexture(t)); R.textures.clear();
        const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      },
    };

    function bindMesh(prog, mesh, full) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
      const st = 48;
      gl.enableVertexAttribArray(prog.a.aPos); gl.vertexAttribPointer(prog.a.aPos, 3, gl.FLOAT, false, st, 0);
      if (full) {
        gl.enableVertexAttribArray(prog.a.aNrm); gl.vertexAttribPointer(prog.a.aNrm, 3, gl.FLOAT, false, st, 12);
        gl.enableVertexAttribArray(prog.a.aCol); gl.vertexAttribPointer(prog.a.aCol, 3, gl.FLOAT, false, st, 24);
        gl.enableVertexAttribArray(prog.a.aOut); gl.vertexAttribPointer(prog.a.aOut, 3, gl.FLOAT, false, st, 36);
      }
    }
    function resetAttribs() { for (let i = 0; i < 4; i++) gl.disableVertexAttribArray(i); }

    /** Dessine une image. scene = { eye, target, fov, light:{dir, center, radius}, bg, opaque:[], transparent:[], sprites:[] } */
    R.frame = function (scene) {
      const W = canvas.width, H = canvas.height;
      const view = M.lookAt(scene.eye, scene.target, [0, 1, 0]);
      const proj = M.persp(scene.fov || 0.75, W / H, scene.near || 0.5, scene.far || 300);
      const vp = M.mul(proj, view);
      R.vp = vp; R.eye = scene.eye;
      const L = scene.light;
      const ldir = V.norm(L.dir);
      const lEye = V.sub(L.center, V.scale(ldir, L.radius * 2));
      const lvp = M.mul(M.ortho(-L.radius, L.radius, -L.radius, L.radius, 0.1, L.radius * 4), M.lookAt(lEye, L.center, Math.abs(ldir[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0]));

      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      // 1) ombres
      if (shadowFB) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
        gl.viewport(0, 0, SH, SH);
        gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(progDepth.p);
        gl.uniformMatrix4fv(progDepth.u.uLightVP, false, lvp);
        gl.cullFace(gl.FRONT); // faces arrière dans la carte d'ombres : supprime l'« acné »
        resetAttribs();
        for (const d of scene.opaque) {
          if (d.shadow === false || !d.mesh.buf) continue;
          bindMesh(progDepth, d.mesh, false);
          gl.uniformMatrix4fv(progDepth.u.uModel, false, d.m || IDENT);
          gl.drawArrays(gl.TRIANGLES, 0, d.mesh.count);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      // 2) passe principale
      gl.viewport(0, 0, W, H);
      const bg = scene.bg || [0.81, 0.88, 0.86];
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(progMain.p);
      const u = progMain.u;
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.uniformMatrix4fv(u.uLightVP, false, lvp);
      gl.uniform3fv(u.uLightDir, ldir);
      gl.uniform3fv(u.uEye, scene.eye);
      gl.uniform1f(u.uUseShadow, shadowFB ? 1 : 0);
      gl.uniform1f(u.uTexel, 1 / SH);
      if (shadowFB) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shadowTex); gl.uniform1i(u.uShadow, 0); }
      resetAttribs();
      const drawList = (list, mode) => {
        for (const d of list) {
          if (!d.mesh.buf) continue;
          if (mode === 2 && d.outline === false) continue;
          bindMesh(progMain, d.mesh, true);
          gl.uniformMatrix4fv(u.uModel, false, d.m || IDENT);
          gl.uniform3fv(u.uTint, d.tint || ONE);
          gl.uniform1f(u.uBright, d.bright || 1);
          gl.uniform1f(u.uAlpha, d.alpha == null ? 1 : d.alpha);
          gl.uniform1f(u.uMode, mode);
          gl.uniform1f(u.uOutline, mode === 2 ? (d.outlineW || scene.outline || 0.0028) : 0);
          gl.drawArrays(gl.TRIANGLES, 0, d.mesh.count);
        }
      };
      gl.cullFace(gl.BACK);
      drawList(scene.opaque, 0);
      // 3) contours encrés (faces arrière gonflées)
      gl.cullFace(gl.FRONT);
      drawList(scene.opaque, 2);
      gl.cullFace(gl.BACK);
      // 4) sprites (objets illustrés)
      if (scene.sprites && scene.sprites.length) {
        gl.useProgram(progSpr.p);
        gl.disable(gl.CULL_FACE);
        gl.uniformMatrix4fv(progSpr.u.uVP, false, vp);
        resetAttribs();
        gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf);
        gl.enableVertexAttribArray(progSpr.a.aUV); gl.vertexAttribPointer(progSpr.a.aUV, 2, gl.FLOAT, false, 8, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.uniform1i(progSpr.u.uTex, 1);
        for (const s of scene.sprites) {
          if (!s.tex) continue;
          gl.bindTexture(gl.TEXTURE_2D, s.tex);
          gl.uniform1f(progSpr.u.uBright, s.bright || 1);
          let sm = s.m;
          if (!sm) { const yaw = Math.atan2(scene.eye[0] - s.pos[0], scene.eye[2] - s.pos[2]); sm = M.chain(M.T(s.pos[0], s.pos[1], s.pos[2]), M.RY(yaw), M.S(s.w, s.h, 1)); }
          gl.uniformMatrix4fv(progSpr.u.uModel, false, sm);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.enable(gl.CULL_FACE);
        gl.useProgram(progMain.p);
        resetAttribs();
      }
      // 5) transparents (verre, faisceaux lumineux, eau), du plus loin au plus proche
      if (scene.transparent && scene.transparent.length) {
        const tr = scene.transparent.slice().sort((a, b) => V.len(V.sub(b.c || [0, 0, 0], scene.eye)) - V.len(V.sub(a.c || [0, 0, 0], scene.eye)));
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.uniform1f(u.uUseShadow, 0);
        drawList(tr, 0);
        gl.depthMask(true); gl.disable(gl.BLEND);
      }
    };

    /** Rayon depuis un point de l'écran (pixels CSS) → { o, d } */
    R.ray = function (px, py) {
      const rect = canvas.getBoundingClientRect();
      const x = (px - rect.left) / rect.width * 2 - 1, y = 1 - (py - rect.top) / rect.height * 2;
      const inv = M.invert(R.vp);
      const a = M.apply(inv, [x, y, -1]), b = M.apply(inv, [x, y, 1]);
      return { o: a, d: V.norm(V.sub(b, a)) };
    };
    /** Point du sol (plan y = h) sous un point de l'écran, ou null. */
    R.groundAt = function (px, py, h) {
      if (!R.vp) return null;
      const r = R.ray(px, py);
      if (Math.abs(r.d[1]) < 1e-4) return null;
      const t = ((h || 0) - r.o[1]) / r.d[1];
      if (t <= 0) return null;
      return [r.o[0] + r.d[0] * t, h || 0, r.o[2] + r.d[2] * t];
    };
    /** Coordonnées écran (pixels CSS) d'un point 3D, ou null s'il est derrière la caméra. */
    R.toScreen = function (p) {
      if (!R.vp) return null;
      const c = M.project(R.vp, p);
      if (c[3] <= 0) return null;
      return { x: (c[0] / c[3] * 0.5 + 0.5) * canvas.clientWidth, y: (0.5 - c[1] / c[3] * 0.5) * canvas.clientHeight };
    };
    return R;
  };
  const IDENT = M.ident();
  const ONE = new Float32Array([1, 1, 1]);

  /** Intersection rayon / boîte alignée. Renvoie t ou -1. */
  GL3D.rayBox = function (ray, min, max) {
    let t0 = -Infinity, t1 = Infinity;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(ray.d[i]) < 1e-9) { if (ray.o[i] < min[i] || ray.o[i] > max[i]) return -1; continue; }
      let a = (min[i] - ray.o[i]) / ray.d[i], b = (max[i] - ray.o[i]) / ray.d[i];
      if (a > b) { const t = a; a = b; b = t; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) return -1;
    }
    return t1 < 0 ? -1 : Math.max(t0, 0);
  };

  /* ================= Caméra orbitale (souris, molette, tactile) ================= */
  /** Caméra « carte » : on fait glisser le décor librement, on pivote à deux doigts.
   *  opts.groundAt(x, y) -> point [x, 0, z] du sol sous le pointeur (pour un glissement exact). */
  GL3D.orbit = function (canvas, cam, onTap, opts) {
    opts = opts || {};
    const pts = new Map();
    let moved = 0, gesture = null, mode = 'pan';
    cam.eye = function () {
      const cp = Math.cos(cam.pitch);
      return [cam.target[0] + Math.sin(cam.yaw) * cp * cam.dist, cam.target[1] + Math.sin(cam.pitch) * cam.dist, cam.target[2] + Math.cos(cam.yaw) * cp * cam.dist];
    };
    cam.clamp = function () {
      cam.pitch = ME.clamp(cam.pitch, cam.minPitch || 0.22, cam.maxPitch || 1.45);
      cam.dist = ME.clamp(cam.dist, cam.minDist || 5, cam.maxDist || 80);
      if (cam.bounds) { cam.target[0] = ME.clamp(cam.target[0], cam.bounds[0], cam.bounds[1]); cam.target[2] = ME.clamp(cam.target[2], cam.bounds[2], cam.bounds[3]); }
    };
    const stopTweens = () => { cam.goalTarget = null; cam.goalYaw = null; cam.goalDist = null; cam.goalPitch = null; cam.userMoved = true; };
    /** Déplacement en pixels écran → déplacement du point visé (repli si pas de groundAt). */
    const panPixels = (dx, dy) => {
      const k = cam.dist * 0.0024, c = Math.cos(cam.yaw), sn = Math.sin(cam.yaw);
      cam.target[0] += -c * dx * k - sn * dy * k / Math.max(0.35, Math.sin(cam.pitch));
      cam.target[2] += sn * dx * k - c * dy * k / Math.max(0.35, Math.sin(cam.pitch));
    };
    /** Glissement exact : le point du sol saisi reste sous le doigt. */
    const drag = (x0, y0, x1, y1) => {
      const a = opts.groundAt && opts.groundAt(x0, y0), b = opts.groundAt && opts.groundAt(x1, y1);
      if (a && b && Math.hypot(a[0] - b[0], a[2] - b[2]) < cam.dist) { cam.target[0] += a[0] - b[0]; cam.target[2] += a[2] - b[2]; }
      else panPixels(x1 - x0, y1 - y0);
    };
    const zoomAt = (factor, x, y) => {
      const before = opts.groundAt && x != null ? opts.groundAt(x, y) : null;
      cam.dist = ME.clamp(cam.dist * factor, cam.minDist || 5, cam.maxDist || 80);
      if (before) { // rapproche le point visé de l'endroit pointé
        const t = 1 - factor;
        cam.target[0] += (before[0] - cam.target[0]) * t;
        cam.target[2] += (before[2] - cam.target[2]) * t;
      }
      cam.clamp();
    };
    const twoInfo = () => {
      const [a, b] = Array.from(pts.values());
      return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
    };
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved = 0;
      stopTweens();
      // clic gauche : déplacer · clic droit, Ctrl ou Maj : pivoter / incliner
      mode = opts.dragRotate || e.button === 2 || e.ctrlKey || e.shiftKey || e.altKey ? 'rotate' : 'pan';
      if (pts.size === 2) gesture = twoInfo();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size >= 2 && gesture) {
        const g = twoInfo();
        drag(gesture.mx, gesture.my, g.mx, g.my);
        if (gesture.d > 0) zoomAt(gesture.d / g.d, g.mx, g.my);
        let da = g.ang - gesture.ang;
        if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        cam.yaw += da;
        gesture = g;
      } else if (mode === 'rotate') {
        cam.yaw -= dx * 0.008; cam.pitch += dy * 0.006;
      } else {
        drag(prev[0], prev[1], e.clientX, e.clientY);
      }
      cam.clamp();
      e.preventDefault();
    });
    const up = (e) => {
      if (pts.size === 1 && moved < 8 && onTap) onTap(e.clientX, e.clientY);
      pts.delete(e.pointerId);
      gesture = pts.size === 2 ? twoInfo() : null;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); gesture = null; });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); stopTweens(); zoomAt(Math.exp(e.deltaY * 0.0012), e.clientX, e.clientY); }, { passive: false });
    // clavier : flèches / ZQSD pour se déplacer, A / E pour pivoter, + / - pour zoomer
    canvas.tabIndex = 0;
    const keys = new Set();
    canvas.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'q', 's', 'd', 'w', 'a', 'e', '+', '-', '='].includes(k)) { keys.add(k); e.preventDefault(); stopTweens(); }
    });
    canvas.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    canvas.addEventListener('blur', () => keys.clear());
    cam.keyTick = function (dt) {
      if (!keys.size) return;
      const sp = 260 * dt;
      if (keys.has('arrowup') || keys.has('z') || keys.has('w')) panPixels(0, sp);
      if (keys.has('arrowdown') || keys.has('s')) panPixels(0, -sp);
      if (keys.has('arrowleft') || keys.has('q')) panPixels(sp, 0);
      if (keys.has('arrowright') || keys.has('d')) panPixels(-sp, 0);
      if (keys.has('a')) cam.yaw += 1.4 * dt;
      if (keys.has('e')) cam.yaw -= 1.4 * dt;
      if (keys.has('+') || keys.has('=')) cam.dist *= 1 - 1.2 * dt;
      if (keys.has('-')) cam.dist *= 1 + 1.2 * dt;
      cam.clamp();
    };
    cam.clamp();
    return cam;
  };
})(typeof window !== 'undefined' ? window : globalThis);
