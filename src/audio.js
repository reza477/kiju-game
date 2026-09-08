// Original local sound design. No network assets, microphone or telemetry.
export const AUDIO_SETTINGS_KEY = 'colossus-audio-v1';
export const AUDIO_DEFAULTS = Object.freeze({ muted: false, master: .58, music: .20, ambience: .42, effects: .62 });
export const AUDIO_LIMITS = Object.freeze({ voices: 24, loops: 6, history: 384, impacts: 48 });
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(Number(n)) ? Number(n) : a));
const TAU = Math.PI * 2;
const definitions = {
  wind: [9, true], river: [7, true], crawler: [6, true], cyborg: [6, true], flesh: [8, true], airship: [7, true], drill: [5, true], music: [28, true],
  metalStep: [1.6], fleshStep: [1.5], servo: [.8], roar: [3.6], bird: [1.1], creak: [2.2], construction: [.65], complete: [2.7],
  cannon: [2.8], missile: [1.8], impact: [2.5], melee: [1.7], confirm: [.28], travel: [.30], repair: [1.1], victory: [4.2], defeat: [3.8]
};
export const SOUND_NAMES = Object.freeze(Object.keys(definitions));
function rng(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const hit = (t, start, decay) => t < start ? 0 : Math.exp(-(t - start) / decay);

/** Deterministic mono sample data, also usable with OfflineAudioContext. */
export function synthesizeSound(name, sampleRate = 24000, seed = 701) {
  if (!definitions[name]) throw new RangeError(`Unknown sound: ${name}`);
  sampleRate = Math.round(clamp(sampleRate, 8000, 96000));
  const [duration, loop] = definitions[name], frames = Math.ceil(duration * sampleRate), data = new Float32Array(frames);
  const random = rng(seed + [...name].reduce((n, c) => n + c.charCodeAt(0) * 31, 0));
  let low = 0, body = 0, air = 0;
  const lowAlpha = 1 - Math.exp(-TAU * 680 / sampleRate), bodyAlpha = 1 - Math.exp(-TAU * 95 / sampleRate);
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate, white = random() * 2 - 1;
    low += lowAlpha * (white - low); body += bodyAlpha * (white - body); air += .018 * (white - air);
    const high = white - low, rumble = body * 2.1, grain = low * 1.1 + white * .12;
    let v = 0;
    switch (name) {
      case 'wind': v = (low * .22 + air * .8) * (.65 + .19 * Math.sin(t * .83) + .12 * Math.sin(t * 1.7)); break;
      case 'river': v = grain * .19 + body * .14 + Math.sin(t * 670 + Math.sin(t * 21) * 2) * .007 * Math.sin(t * 3.1) ** 8; break;
      case 'crawler': {
        const pulse = .64 + .20 * Math.sin(TAU * 7 * t) + .10 * Math.sin(TAU * 14 * t);
        v = (Math.sin(TAU * 43 * t + Math.sin(t * 5.3) * .22) * .10 + Math.sin(TAU * 86 * t) * .035 + rumble * .38) * pulse;
        v += high * .021 * Math.max(0, Math.sin(TAU * 19 * t)) ** 10; break;
      }
      case 'cyborg': v = rumble * .18 + Math.sin(TAU * 61 * t) * .027 + Math.sin(TAU * 183 * t + Math.sin(t * .9) * 1.3) * .019 + low * .038; break;
      case 'flesh': {
        const breath = Math.sin(t * TAU / 4) * .5 + .5;
        v = (low * .19 + rumble * .19) * (.08 + breath ** 3) + Math.sin(TAU * 39 * t + Math.sin(t * 2) * .6) * .012 * breath; break;
      }
      case 'airship': v = (rumble * .14 + low * .11) * (.76 + .22 * Math.sin(TAU * 13 * t)) + Math.sin(TAU * 73 * t) * .019; break;
      case 'drill': v = (low * .16 + high * .035) * (.76 + .23 * Math.sin(TAU * 27 * t)) + Math.sin(TAU * 92 * t + Math.sin(TAU * 3 * t) * .42) * .04; break;
      case 'music': {
        const chords = [[110, 130.8128, 164.8138], [98, 130.8128, 146.8324], [87.3071, 110, 130.8128], [98, 123.4708, 146.8324]];
        for (let c = 0; c < 4; c++) {
          const local = (t - c * 7 + 28) % 28, e = smooth(local / 2.8) * (1 - smooth((local - 6.2) / 3.6));
          if (local > 10) continue;
          for (const f of chords[c]) v += (Math.sin(TAU * f * t + Math.sin(t * .23) * .07) * .028 + Math.sin(TAU * f * 2.003 * t) * .008 + Math.sin(TAU * f * .5 * t) * .014) * e;
        }
        v += air * .022; break;
      }
      case 'metalStep':
        v = (rumble * 1.7 + Math.sin(TAU * (47 * t + 7 * (1 - Math.exp(-t * 9)))) * .42) * hit(t, 0, .29);
        for (const [f, a, d] of [[153, .09, .55], [271, .065, .34], [419, .028, .18]]) v += Math.sin(TAU * f * t) * a * hit(t, .022, d);
        v += grain * .39 * hit(t, .055, .11) + high * .12 * hit(t, .17, .09); break;
      case 'fleshStep': v = (rumble * 2.2 + Math.sin(TAU * (39 * t + 5 * (1 - Math.exp(-t * 13)))) * .43) * hit(t, 0, .32) + grain * .35 * hit(t, .036, .17) + low * .20 * hit(t, .15, .30); break;
      case 'servo': v = (Math.sin(TAU * (167 * t + 27 * t * t)) * .08 + low * .30 + Math.sin(TAU * 339 * t) * .035) * Math.sin(Math.PI * clamp(t / .8)) ** 1.2; break;
      case 'roar': {
        const e = smooth(t / .24) * (1 - smooth((t - 1.4) / 2.1)), phase = TAU * (41 * t + 8 * Math.sin(t * 1.3));
        v = (Math.sin(phase) * .22 + Math.sin(phase * 2.01) * .13 + Math.sin(phase * 3.02) * .07 + low * .57) * e * (.8 + .15 * Math.sin(t * 29)); break;
      }
      case 'bird': {
        for (const start of [.04, .28, .63]) { const q = t - start; if (q > 0 && q < .19) v += Math.sin(TAU * (1770 * q + 1780 * q * q) + Math.sin(q * 83) * 1.2) * .065 * Math.sin(Math.PI * q / .19) ** 2; } break;
      }
      case 'creak': v = (Math.sin(TAU * (139 * t + 9 * Math.sin(t * 4))) * .047 + low * .14 + Math.sin(TAU * 287 * t) * .018) * Math.sin(Math.PI * t / 2.2) ** 2; break;
      case 'construction': v = (grain * .4 + Math.sin(TAU * 253 * t) * .12 + Math.sin(TAU * 487 * t) * .05) * hit(t, 0, .075) + low * .2 * hit(t, .17, .08); break;
      case 'complete': case 'victory': {
        const notes = name === 'complete' ? [220, 329.6276, 440] : [164.8138, 220, 329.6276, 440];
        for (let k = 0; k < notes.length; k++) { const q = t - k * .22; if (q >= 0) v += (Math.sin(TAU * notes[k] * q) * .08 + Math.sin(TAU * notes[k] * 2.002 * q) * .026) * smooth(q / .028) * Math.exp(-q / 1.2); } break;
      }
      case 'defeat': v = (Math.sin(TAU * 65.406 * t) * .15 + Math.sin(TAU * 97.999 * t) * .045 + rumble * .18) * smooth(t / .12) * Math.exp(-t / 1.3); break;
      case 'cannon':
        v = (Math.sin(TAU * (42 * t + 9 * (1 - Math.exp(-t * 18)))) * .53 + rumble * 2.2) * hit(t, 0, .33);
        v += high * .65 * hit(t, 0, .023) + grain * .85 * hit(t, .016, .13) + low * .28 * hit(t, .21, .68); break;
      case 'missile': v = (grain * .62 + high * .20) * smooth(t / .022) * (1 - smooth((t - .4) / 1.3)) + Math.sin(TAU * (120 * t + 73 * t * t)) * .025 * Math.exp(-t * 3); break;
      case 'impact': v = (rumble * 2.0 + Math.sin(TAU * 34 * t) * .48) * hit(t, 0, .39) + grain * .85 * hit(t, .012, .17) + high * .20 * hit(t, .08, .20) + low * .32 * hit(t, .27, .68); break;
      case 'melee': v = (rumble * 2.1 + Math.sin(TAU * (43 * t + 4 * (1 - Math.exp(-t * 17)))) * .45) * hit(t, 0, .24) + grain * .70 * hit(t, .027, .17); break;
      case 'repair': v = low * .16 * smooth(t / .025) * (1 - smooth(t / 1.1)) + (Math.sin(TAU * 227 * t) * .055 + high * .16) * hit(t, .12, .07) + Math.sin(TAU * 361 * t) * .04 * hit(t, .30, .1); break;
      case 'confirm': case 'travel': v = (Math.sin(TAU * 247 * t) * .09 + Math.sin(TAU * 493 * t) * .021 + low * .12) * hit(t, 0, name === 'travel' ? .044 : .065); break;
    }
    data[i] = Math.tanh(v * 1.1) * .8;
  }
  if (loop) {
    // Crossfade the tail into the beginning, then omit the duplicated overlap.
    const overlap = Math.floor(sampleRate * .24);
    for (let i = 0; i < overlap; i++) data[frames - overlap + i] = data[frames - overlap + i] * (1 - smooth(i / overlap)) + data[i] * smooth(i / overlap);
    return data.slice(overlap);
  }
  const fade = Math.min(Math.round(sampleRate * .008), frames / 4);
  for (let i = 0; i < fade; i++) { data[i] *= i / fade; data[frames - 1 - i] *= i / fade; }
  return data;
}

function storageOrNull() { try { return globalThis.localStorage ?? null; } catch { return null; } }
function impulse(context) {
  const length = Math.ceil(context.sampleRate * 1.35), buffer = context.createBuffer(2, length, context.sampleRate), random = rng(7901);
  for (let channel = 0; channel < 2; channel++) { const d = buffer.getChannelData(channel); let low = 0; for (let i = 0; i < length; i++) { low += .16 * (random() * 2 - 1 - low); const t = i / context.sampleRate; d[i] = low * Math.exp(-t * 5.2) * .17 * (t < .022 ? 0 : 1); } }
  return buffer;
}

export class GameAudio {
  constructor({ context = null, contextFactory = null, storage = storageOrNull(), document = globalThis.document ?? null } = {}) {
    this.context = context; this.contextFactory = contextFactory; this.storage = storage; this.document = document;
    this.settings = { ...AUDIO_DEFAULTS };
    try { const saved = JSON.parse(storage?.getItem(AUDIO_SETTINGS_KEY) || 'null'); if (saved) { if (typeof saved.muted === 'boolean') this.settings.muted = saved.muted; for (const bus of ['master', 'music', 'ambience', 'effects']) if (Number.isFinite(saved[bus])) this.settings[bus] = clamp(saved[bus]); } } catch { /* Local audio preferences are optional. */ }
    this.unlocked = false; this.paused = false; this.hidden = !!document?.hidden; this.active = false; this.disposed = false;
    this.voices = new Map(); this.loops = new Map(); this.buffers = new Map(); this.seen = new Set(); this.pending = new Map(); this.buildings = new Map();
    this.sequence = 0; this.epoch = 0; this.stats = { played: 0, deduplicated: 0, dropped: 0, peakVoices: 0, nodesCreated: 0 };
    this.lastState = null; this.lastTime = null; this.battle = null; this.next = {}; this.suspendTimer = null; this.cueTimer = null; this.cueUntil = 0; this.lastStepIndex = null;
    this.visibilityHandler = () => this.setHidden(!!document.hidden);
    document?.addEventListener('visibilitychange', this.visibilityHandler);
  }
  getSettings() { return { ...this.settings }; }
  _persist() { try { this.storage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* Storage failure cannot interrupt a game. */ } }
  _ramp(param, value, duration = .065) {
    const t = this.context.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(value, t + duration);
  }
  _graph() {
    if (this.master) return;
    const c = this.context; this.master = c.createGain(); this.master.gain.value = 0;
    this.compressor = c.createDynamicsCompressor(); Object.assign(this.compressor.threshold, { value: -19 }); this.compressor.knee.value = 16; this.compressor.ratio.value = 3; this.compressor.attack.value = .006; this.compressor.release.value = .26;
    this.limiter = c.createWaveShaper(); const curve = new Float32Array(2048); for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1) * 2 - 1) * 1.4) * .83; this.limiter.curve = curve; this.limiter.oversample = '2x';
    this.master.connect(this.compressor); this.compressor.connect(this.limiter); this.limiter.connect(c.destination);
    this.buses = {}; for (const bus of ['music', 'ambience', 'effects']) { this.buses[bus] = c.createGain(); this.buses[bus].gain.value = this.settings[bus]; this.buses[bus].connect(this.master); }
    this.space = c.createConvolver(); this.space.normalize = false; this.space.buffer = impulse(c); this.spaceGain = c.createGain(); this.spaceGain.gain.value = .23; this.space.connect(this.spaceGain); this.spaceGain.connect(this.master);
    this.sends = [];
    for (const bus of ['music', 'ambience', 'effects']) { const send = c.createGain(); send.gain.value = bus === 'effects' ? .10 : .035; this.buses[bus].connect(send); send.connect(this.space); this.sends.push(send); }
    this.stats.nodesCreated += 11;
  }
  async unlock() {
    if (this.disposed) return false;
    try {
      if (!this.context) { const C = globalThis.AudioContext || globalThis.webkitAudioContext; this.context = this.contextFactory ? this.contextFactory() : C ? new C({ latencyHint: 'interactive' }) : null; }
      if (!this.context) return false;
      this._graph(); this.unlocked = true;
      if (!this.paused && !this.hidden && !this.settings.muted && this.context.state === 'suspended' && !this._offline()) await this.context.resume();
      this._applyState(); return true;
    } catch { this.unlocked = false; return false; }
  }
  _offline() { return typeof this.context?.startRendering === 'function'; }
  _allowed() { return !!(this.unlocked && this.active && !this.paused && !this.hidden && !this.settings.muted && !this.disposed); }
  _cueAllowed() { return !!(this.unlocked && this.active && !this.hidden && !this.settings.muted && !this.disposed); }
  _audible() { return this._allowed() || this._cueAllowed() && this.context.currentTime < this.cueUntil; }
  _clearCue() { clearTimeout(this.cueTimer); this.cueTimer = null; this.cueUntil = 0; }
  _applyState() {
    if (!this.master) return;
    clearTimeout(this.suspendTimer); this.suspendTimer = null;
    this._ramp(this.master.gain, this._audible() ? this.settings.master : 0, .10);
    if (!this._audible()) {
      this._stopAll();
      if (!this._offline() && this.context.state === 'running') this.suspendTimer = setTimeout(() => { this.suspendTimer = null; if (!this._audible()) this.context.suspend().catch(() => {}); }, 115);
    } else {
      if (!this._allowed()) for (const voice of this.voices.values()) if (!voice.allowPaused) this._stop(voice);
      if (!this._offline() && this.context.state === 'suspended') this.context.resume().then(() => { if (!this._audible() && !this.disposed) this._applyState(); }).catch(() => {});
    }
  }
  setMuted(muted) { this.settings.muted = !!muted; if (this.settings.muted) this._clearCue(); this._persist(); this._applyState(); return this.settings.muted; }
  setVolume(bus, value) { if (!['master', 'music', 'ambience', 'effects'].includes(bus)) return false; this.settings[bus] = clamp(value); this._persist(); if (bus === 'master') this._applyState(); else if (this.buses) this._ramp(this.buses[bus].gain, this.settings[bus]); return true; }
  setPaused(paused) { if (this.paused === !!paused) return; this.paused = !!paused; this.next = {}; this._applyState(); }
  setHidden(hidden) { if (this.hidden === !!hidden) return; this.hidden = !!hidden; if (this.hidden) this._clearCue(); this.pending.clear(); this.next = {}; this._applyState(); }
  reset(state = null) {
    this._clearCue(); this._stopAll(); this.epoch++; this.seen.clear(); this.pending.clear(); this.buildings.clear(); this.next = {}; this.lastStepIndex = null;
    this.lastState = state; this.lastTime = Number.isFinite(state?.time) ? state.time : null; this.lastVariant = state?.variant; this.battle = state?.battle ?? null; this.lastPosition = null;
    this.battleKey = this.battle ? `${this.battle.enemyId}:${Math.round(((state.time || 0) - (this.battle.time || 0)) * 1000)}` : null;
    for (const event of this.battle?.events || []) this._remember(`battle:${event.id}`);
    for (let i = 0; i < (state?.buildings?.length || 0); i++) { const b = state.buildings[i]; if (b) this.buildings.set(i, { type: b.type, level: b.level, remaining: b.remaining }); }
    if (state) this.paused = !!state.paused;
    this.active = false; this._applyState();
  }
  _remember(id) { if (this.seen.has(id)) return false; this.seen.add(id); if (this.seen.size > AUDIO_LIMITS.history) this.seen.delete(this.seen.values().next().value); return true; }
  _buffer(name) {
    if (!this.buffers.has(name)) { const rate = Math.min(this.context.sampleRate, 24000), data = synthesizeSound(name, rate), buffer = this.context.createBuffer(1, data.length, rate); buffer.copyToChannel(data, 0); this.buffers.set(name, buffer); }
    return this.buffers.get(name);
  }
  _finish(voice) { if (!this.voices.has(voice.id)) return; for (const n of voice.nodes) try { n.disconnect(); } catch { /* Already disconnected. */ } this.voices.delete(voice.id); if (voice.slot && this.loops.get(voice.slot) === voice) this.loops.delete(voice.slot); }
  _stop(voice, fade = .04) { if (!this.voices.has(voice.id) || voice.stopping && fade > 0) return; voice.stopping = true; if (voice.slot && this.loops.get(voice.slot) === voice) this.loops.delete(voice.slot); const t = this.context.currentTime; try { voice.gain.gain.cancelScheduledValues(t); voice.gain.gain.setValueAtTime(voice.gain.gain.value, t); voice.gain.gain.linearRampToValueAtTime(0, t + fade); voice.source.stop(t + fade + .005); } catch { /* Source has already ended. */ } if (!fade) this._finish(voice); }
  _stopAll() { for (const voice of [...this.voices.values()]) this._stop(voice); this.loops.clear(); }
  _voice(name, { bus = 'effects', volume = .6, pan = 0, rate = 1, delay = 0, loop = false, slot = null, allowPaused = false } = {}) {
    if (!(this._allowed() || allowPaused && this._cueAllowed()) || !definitions[name] || !this.buses[bus]) return null;
    while (this.voices.size >= AUDIO_LIMITS.voices) { const old = [...this.voices.values()].find(v => v.stopping || !v.slot); if (!old) { this.stats.dropped++; return null; } this._stop(old, 0); this.stats.dropped++; }
    const c = this.context, start = c.currentTime + clamp(delay, 0, 60), source = c.createBufferSource(), gain = c.createGain(), panner = c.createStereoPanner();
    source.buffer = this._buffer(name); source.loop = loop; source.playbackRate.value = clamp(rate, .5, 1.6); panner.pan.value = clamp(pan, -1, 1);
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(clamp(volume, 0, 1.2), start + (loop ? .30 : .007));
    source.connect(gain); gain.connect(panner); panner.connect(this.buses[bus]);
    const voice = { id: ++this.sequence, source, gain, panner, nodes: [source, gain, panner], slot, name, allowPaused, targetVolume: clamp(volume, 0, 1.2), targetRate: clamp(rate, .5, 1.6) };
    this.voices.set(voice.id, voice); if (slot) this.loops.set(slot, voice); source.onended = () => this._finish(voice); source.start(start);
    if (!loop) source.stop(start + source.buffer.duration / source.playbackRate.value + .025);
    this.stats.played++; this.stats.nodesCreated += 3; this.stats.peakVoices = Math.max(this.stats.peakVoices, this.voices.size); return voice;
  }
  play(name, options = {}) {
    if (!definitions[name]) return false;
    if (options.id != null && !this._remember(`manual:${options.id}`)) { this.stats.deduplicated++; return false; }
    const allowPaused = !!(options.allowPaused && ['victory', 'defeat'].includes(name));
    if (allowPaused && this.paused && this._cueAllowed()) {
      this.cueUntil = this.context.currentTime + this._buffer(name).duration + .12; clearTimeout(this.cueTimer);
      if (!this._offline()) this.cueTimer = setTimeout(() => { this._clearCue(); this._applyState(); }, (this._buffer(name).duration + .18) * 1000);
      this._applyState();
    }
    return !!this._voice(name, { volume: .56 * clamp(options.intensity ?? 1, .1, 1.7), ...options, allowPaused });
  }
  _loop(slot, name, volume, rate = 1, bus = 'ambience') {
    let voice = this.loops.get(slot);
    if (voice?.name !== name) { if (voice) this._stop(voice, .15); voice = null; }
    if (volume < .002) { if (voice) this._stop(voice, .20); return; }
    if (!voice && this.loops.size < AUDIO_LIMITS.loops) voice = this._voice(name, { bus, volume, rate, loop: true, slot });
    if (voice) {
      if (Math.abs(voice.targetVolume - volume) > .008) { this._ramp(voice.gain.gain, volume, .3); voice.targetVolume = volume; }
      if (Math.abs(voice.targetRate - rate) > .005) { this._ramp(voice.source.playbackRate, rate, .28); voice.targetRate = rate; }
    }
  }
  _due(name, time, interval) { if (!(name in this.next)) { this.next[name] = time + interval; return false; } if (time < this.next[name]) return false; this.next[name] = time + interval; return true; }
  _eventSound(event, state, impact = false) {
    const enemy = event.source === 'enemy', faction = enemy ? state.battle.enemyFaction : state.faction, variant = enemy ? state.battle.enemyVariant : state.variant;
    const pan = enemy ? .35 : -.22, strength = clamp((event.damage || 25) / 70, .5, 1.25);
    if (impact) this.play(event.kind === 'impact' ? 'melee' : 'impact', { pan: -pan, intensity: strength, variant });
    else if (event.kind === 'impact') { if (faction === 'kaiju') this.play(variant === 'flesh' ? 'roar' : 'servo', { pan, intensity: .75 }); else this.play(variant === 'drill' ? 'servo' : 'metalStep', { pan, intensity: .7 }); }
    else this.play(faction === 'airship' || event.kind === 'salvo' ? 'missile' : 'cannon', { pan, intensity: strength });
  }
  update(state, scene = {}) {
    if (!state || this.disposed) return;
    const time = Number.isFinite(state.time) ? state.time : 0;
    if (this.lastState !== state || this.lastVariant !== state.variant || this.lastTime != null && time < this.lastTime - .02) this.reset(state);
    this.lastTime = time; this.lastState = state; this.lastVariant = state.variant;
    if (this.paused !== !!state.paused) this.setPaused(!!state.paused);
    if (!this.active) { this.active = true; this._applyState(); }
    if (this.battle !== state.battle) {
      const key = state.battle ? `${state.battle.enemyId}:${Math.round((time - (state.battle.time || 0)) * 1000)}` : null;
      if (key !== this.battleKey) { this.pending.clear(); this.seen.clear(); }
      // A fresh battle can already contain its first auto-fired shot. Restored
      // games were primed by reset(); cloned active battle objects retain IDs.
      this.battle = state.battle ?? null; this.battleKey = key;
    }
    const b = state.battle;
    for (const event of b?.events || []) {
      if (!this._remember(`battle:${event.id}`)) continue;
      if (this._allowed() && b.time - event.time < .85) { this._eventSound(event, state); if (this.pending.size < AUDIO_LIMITS.impacts && event.impactAt > b.time) this.pending.set(event.id, event); else if (event.impactAt >= b.time - .2) this._eventSound(event, state, true); }
    }
    for (const [id, event] of this.pending) if (b && event.impactAt <= b.time) { if (this._allowed() && b.time - event.impactAt < .4) this._eventSound(event, state, true); this.pending.delete(id); }
    let constructing = 0;
    for (let slot = 0; slot < (state.buildings?.length || 0); slot++) {
      const building = state.buildings[slot], previous = this.buildings.get(slot);
      if (!building) { this.buildings.delete(slot); continue; }
      if (building.remaining > 0) constructing++;
      if (previous?.remaining > 0 && building.remaining <= 0) this.play('complete', { intensity: .66 });
      else if ((!previous || previous.remaining <= 0) && building.remaining > 0) this.play('construction', { intensity: .55 });
      this.buildings.set(slot, { type: building.type, level: building.level, remaining: building.remaining });
    }
    if (!this._allowed()) { this.lastPosition = null; return; }
    const position = state.mode === 'battle' && b ? b.player : state;
    const moved = this.lastPosition ? Math.hypot(position.x - this.lastPosition.x, position.z - this.lastPosition.z) : 0;
    const moving = !!(state.mode === 'battle' ? moved > .002 : state.moving), faction = state.faction, variant = state.variant;
    this.lastPosition = { x: position.x, z: position.z };
    const wind = clamp(typeof scene.wind === 'number' ? scene.wind : scene.wind?.gust ?? scene.landscape?.stats?.wind?.gust ?? .5), riverCentre = 5 + 22 * Math.sin(position.z * .009) + 7 * Math.sin(position.z * .020);
    const riverDistance = Number.isFinite(scene.riverDistance) ? scene.riverDistance : Math.abs(position.x - riverCentre), river = clamp(1 - riverDistance / 62);
    this._loop('wind', 'wind', .44 + wind * .27);
    this._loop('river', 'river', (state.mode === 'battle' ? .15 : .58) * river);
    const carrier = faction === 'crawler' ? 'crawler' : faction === 'airship' ? 'airship' : variant === 'flesh' ? 'flesh' : 'cyborg';
    this._loop('carrier', carrier, moving ? .69 : .29, moving ? 1.04 : .84, 'effects');
    this._loop('detail', 'drill', variant === 'drill' && moving ? .37 : 0, .93, 'effects');
    this._loop('music', 'music', b && !b.result ? .35 : .52, 1, 'music');
    const gait = scene.city?.gaitDistance, stepIndex = Number.isFinite(gait) ? Math.floor(gait / 8) : null;
    const landed = stepIndex == null ? this._due('step', time, variant === 'flesh' ? .91 : .83) : this.lastStepIndex != null && stepIndex > this.lastStepIndex && stepIndex - this.lastStepIndex <= 2;
    this.lastStepIndex = stepIndex;
    if (faction === 'kaiju' && moving && landed) { this.play(variant === 'flesh' ? 'fleshStep' : 'metalStep', { intensity: .65, pan: stepIndex == null ? Math.sin(time * 3) * .18 : stepIndex % 2 ? -.16 : .16 }); if (variant !== 'flesh') this.play('servo', { intensity: .31 }); }
    if (!moving) delete this.next.step;
    if (this._due('birds', time, 8.7 + wind * 8) && state.mode !== 'battle') this.play('bird', { bus: 'ambience', volume: .25, pan: Math.sin(time * .37) * .8 });
    if (faction === 'airship' && this._due('creak', time, 12.6)) this.play('creak', { bus: 'ambience', volume: .26, pan: -.3 });
    if (constructing && this._due('construction', time, 2.5)) this.play('construction', { intensity: .30, pan: Math.sin(time) * .35 });
  }
  getDiagnostics() { return { ...this.stats, unlocked: this.unlocked, muted: this.settings.muted, paused: this.paused, hidden: this.hidden, active: this.active, contextState: this.context?.state ?? 'uncreated', voices: this.voices.size, loops: this.loops.size, liveNodes: (this.master && !this.disposed ? 11 : 0) + this.voices.size * 3, history: this.seen.size, pendingImpacts: this.pending.size, buffers: this.buffers.size, settings: this.getSettings() }; }
  async dispose() { if (this.disposed) return; this.disposed = true; this._clearCue(); clearTimeout(this.suspendTimer); this.document?.removeEventListener('visibilitychange', this.visibilityHandler); for (const voice of [...this.voices.values()]) this._stop(voice, 0); for (const node of [this.master, this.compressor, this.limiter, this.space, this.spaceGain, ...Object.values(this.buses || {}), ...(this.sends || [])]) try { node?.disconnect(); } catch { /* Already disconnected. */ } if (this.context && !this._offline() && this.context.state !== 'closed') await this.context.close().catch(() => {}); this.buffers.clear(); }
}
