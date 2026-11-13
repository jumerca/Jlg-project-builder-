/* Camping Tycoon — sons synthétisés (Web Audio, aucun fichier externe) */
(function (root) {
  'use strict';
  let ctx = null, master = null, amb = null, rainNode = null, rainGain = null, enabled = true, last = {};
  const now = () => (ctx ? ctx.currentTime : 0);

  function init() {
    if (ctx || !enabled) return;
    try {
      const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      amb = ctx.createGain(); amb.gain.value = 0.35; amb.connect(master);
    } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type = 'sine', vol = 0.3, when = 0, slide = 0, dest) {
    if (!ctx) return;
    const t = now() + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2, freq = 1200, when = 0, dest) {
    if (!ctx) return;
    const t = now() + when, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest || master); src.start(t);
  }

  const SFX = {
    click: () => tone(660, 0.06, 'triangle', 0.12),
    build: () => { tone(140, 0.18, 'sine', 0.4, 0, 0.5); noise(0.12, 0.25, 500); tone(520, 0.08, 'triangle', 0.15, 0.12); },
    path: () => noise(0.05, 0.12, 2200),
    plant: () => { tone(880, 0.07, 'sine', 0.12); tone(1320, 0.09, 'sine', 0.1, 0.06); },
    demolish: () => { noise(0.35, 0.35, 300); tone(90, 0.3, 'sawtooth', 0.12, 0, 0.5); },
    error: () => { tone(180, 0.12, 'square', 0.12); tone(140, 0.16, 'square', 0.12, 0.1); },
    coin: () => { tone(988, 0.08, 'square', 0.1); tone(1319, 0.22, 'square', 0.1, 0.07); },
    goal: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.2, i * 0.11)),
    hire: () => { tone(523, 0.1, 'triangle', 0.15); tone(784, 0.18, 'triangle', 0.15, 0.09); },
    bad: () => { tone(330, 0.2, 'triangle', 0.14); tone(262, 0.3, 'triangle', 0.14, 0.15); },
    season: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.13))
  };

  function play(name) {
    if (!enabled) return;
    init(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = performance.now();
    if (last[name] && t - last[name] < (name === 'path' ? 60 : 120)) return;
    last[name] = t;
    try { SFX[name] && SFX[name](); } catch (e) { /* silencieux */ }
  }

  /* Ambiance : oiseaux le jour, grillons la nuit, pluie, musique de scène */
  let nextBird = 0, nextCricket = 0, nextNote = 0;
  function ambience(s, speedOn) {
    if (!enabled || !ctx || !s || s.phase !== 'season') { setRain(0); return; }
    const t = now(), m = s.minute, wx = s.weather.type;
    const day = m > 6 * 60 && m < 21 * 60;
    setRain(wx === 'rain' ? 0.08 : wx === 'storm' ? 0.14 : 0);
    if (!speedOn) return;
    if (day && wx !== 'rain' && wx !== 'storm' && t > nextBird) {
      const base = 2200 + Math.random() * 1600;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(base * (1 + Math.random() * 0.2), 0.07, 'sine', 0.05, i * 0.09, 1.25, amb);
      nextBird = t + 1.5 + Math.random() * 4;
    }
    if (!day && wx !== 'rain' && t > nextCricket) {
      for (let i = 0; i < 6; i++) tone(4300, 0.025, 'square', 0.012, i * 0.05, 1, amb);
      nextCricket = t + 0.8 + Math.random() * 1.2;
    }
    if (m >= 20 * 60 && m < 22 * 60 && root.CT.sim.ofType(s, 'stage').some((b) => root.CT.sim.stageLive(s, b)) && t > nextNote) {
      const scale = [392, 440, 523, 587, 659, 784];
      tone(scale[Math.floor(Math.random() * scale.length)], 0.22, 'triangle', 0.035, 0, 1, amb);
      nextNote = t + 0.25;
    }
  }
  function setRain(v) {
    if (!ctx) return;
    if (!rainNode && v > 0) {
      const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      rainNode = ctx.createBufferSource(); rainNode.buffer = buf; rainNode.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      rainGain = ctx.createGain(); rainGain.gain.value = 0;
      rainNode.connect(f); f.connect(rainGain); rainGain.connect(amb); rainNode.start();
    }
    if (rainGain) rainGain.gain.setTargetAtTime(v, now(), 0.5);
  }
  function setEnabled(v) {
    enabled = !!v;
    if (!enabled && rainGain) rainGain.gain.setTargetAtTime(0, now(), 0.1);
    if (master) master.gain.value = enabled ? 0.5 : 0;
  }

  root.CT = root.CT || {};
  root.CT.sfx = { play, init, ambience, setEnabled, get enabled() { return enabled; } };
})(typeof window !== 'undefined' ? window : globalThis);
