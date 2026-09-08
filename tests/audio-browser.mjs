import { createRequire } from 'node:module';
import fs from 'node:fs/promises'; import path from 'node:path'; import os from 'node:os'; import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output = path.resolve('artifacts/prototype07-builder-01/audio'); await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--mute-audio'] });
const page = await browser.newPage(), errors = [], external = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
await page.route('**/*', route => { const u = new URL(route.request().url()); if (u.pathname === '/audio-audit') return route.fulfill({ contentType: 'text/html', body: '<html><body><button id="unlock">Unlock local audio</button></body></html>' }); if (u.origin === 'http://127.0.0.1:4178') return route.continue(); external.push(u.href); return route.abort(); });
try {
  await page.goto('http://127.0.0.1:4178/audio-audit');
  const locked = await page.evaluate(async () => {
    const mod = await import('/src/audio.js'), { createGame } = await import('/src/simulation.js'); window.audioModule = mod; window.audioState = createGame('kaiju', 'cyborg');
    window.testAudio = new mod.GameAudio({ storage: null }); window.testAudio.update(window.audioState);
    document.getElementById('unlock').onclick = async () => { window.unlocked = await window.testAudio.unlock(); };
    return window.testAudio.getDiagnostics();
  });
  assert.equal(locked.contextState, 'uncreated'); assert.equal(locked.voices, 0);
  await page.click('#unlock'); await page.waitForFunction(() => window.unlocked);
  const live = await page.evaluate(() => {
    const a = window.testAudio, s = window.audioState; a.update(s); const initial = a.getDiagnostics();
    s.mode = 'battle'; s.battle = { enemyId: 'rival1', enemyFaction: 'crawler', enemyVariant: 'standard', time: 1, events: [], player: { x: -40, z: 0 } }; a.update(s);
    s.battle.events.push({ id: 1, kind: 'shot', time: 1, impactAt: 1.55, source: 'player', damage: 30 });
    a.update(s); const launch = a.getDiagnostics().played; a.update(s); const duplicate = a.getDiagnostics().played;
    s.battle.time = 1.56; s.time = 1.56; a.update(s); const impact = a.getDiagnostics().played; a.update(s); const impactDuplicate = a.getDiagnostics().played;
    s.time = 2; s.battle = { enemyId: 'first-salvo', enemyFaction: 'airship', enemyVariant: 'horizontal', time: 0, player: { x: -40, z: 0 }, events: [{ id: 1, kind: 'enemyShot', time: 0, impactAt: .55, source: 'enemy', damage: 25 }] };
    const beforeFirstShot = a.getDiagnostics().played; a.update(s); const firstShotPlays = a.getDiagnostics().played === beforeFirstShot + 1;
    s.battle = JSON.parse(JSON.stringify(s.battle)); const beforeClone = a.getDiagnostics().played; a.update(s); const battleCloneDoesNotReplay = a.getDiagnostics().played === beforeClone;
    const once = a.play('confirm', { id: 'single-ui-cue' }), twice = a.play('confirm', { id: 'single-ui-cue' });
    const restored = JSON.parse(JSON.stringify(s)); a.reset(restored); const beforeLoad = a.getDiagnostics().played; a.update(restored);
    const loadOnlyCreatedLoops = a.getDiagnostics().played - beforeLoad === a.getDiagnostics().loops;
    for (let i = 0; i < 150; i++) a.play('impact', { id: `stress-${i}` }); const stress = a.getDiagnostics();
    a.setMuted(true); const blocked = a.play('cannon');
    return { initial, launch, duplicate, impact, impactDuplicate, firstShotPlays, battleCloneDoesNotReplay, once, twice, loadOnlyCreatedLoops, stress, blocked };
  });
  assert.equal(live.launch, live.duplicate); assert.equal(live.impact, live.launch + 1); assert.equal(live.impact, live.impactDuplicate);
  assert.ok(live.once && !live.twice && live.loadOnlyCreatedLoops && !live.blocked && live.firstShotPlays && live.battleCloneDoesNotReplay);
  assert.ok(live.stress.voices <= 24 && live.stress.loops <= 6 && live.stress.liveNodes <= 83);
  await page.waitForTimeout(190);
  const muted = await page.evaluate(() => window.testAudio.getDiagnostics()); assert.equal(muted.contextState, 'suspended'); assert.equal(muted.voices, 0);
  await page.evaluate(() => { const a = window.testAudio; a.setMuted(false); a.setPaused(true); });
  await page.waitForTimeout(160);
  const paused = await page.evaluate(async () => { const a = window.testAudio; await a.unlock(); return a.getDiagnostics(); }); assert.equal(paused.contextState, 'suspended'); assert.equal(paused.paused, true);
  await page.evaluate(() => { const a = window.testAudio; a.setPaused(false); a.update(window.audioState); a.setHidden(true); }); await page.waitForTimeout(170);
  const hidden = await page.evaluate(async () => { await window.testAudio.unlock(); return window.testAudio.getDiagnostics(); }); assert.equal(hidden.contextState, 'suspended'); assert.equal(hidden.hidden, true);
  const disposed = await page.evaluate(async () => { await window.testAudio.dispose(); return window.testAudio.getDiagnostics(); }); assert.equal(disposed.contextState, 'closed'); assert.equal(disposed.voices, 0);
  const offline = await page.evaluate(async () => {
    const { GameAudio } = window.audioModule, rate = 24000;
    async function render(muted = false) {
      const context = new OfflineAudioContext(2, rate * 14, rate), audio = new GameAudio({ context, storage: null, document: null });
      audio.setMuted(muted); await audio.unlock(); audio.update({ faction: 'crawler', variant: 'drill', mode: 'expedition', time: 0, paused: false, x: -20, z: 30, moving: true, buildings: [], battle: null }, { riverDistance: 8, wind: .5 });
      for (const [name, delay, intensity] of [['metalStep', .7, .7], ['cannon', 2.2, 1], ['impact', 2.8, .9], ['roar', 5, .7], ['fleshStep', 7.6, .8], ['missile', 9, .7], ['complete', 11, .7]]) audio.play(name, { delay, intensity });
      const mix = await context.startRendering(); let peak = 0, energy = 0, invalid = 0;
      for (let c = 0; c < 2; c++) for (const value of mix.getChannelData(c)) { if (!Number.isFinite(value)) invalid++; peak = Math.max(peak, Math.abs(value)); energy += value * value; }
      const rms = Math.sqrt(energy / (mix.length * 2));
      const pcm = new Uint8Array(mix.length * 4), view = new DataView(pcm.buffer); for (let i = 0; i < mix.length; i++) for (let c = 0; c < 2; c++) view.setInt16((i * 2 + c) * 2, Math.round(Math.max(-1, Math.min(1, mix.getChannelData(c)[i])) * 32767), true);
      let binary = ''; for (let i = 0; i < pcm.length; i += 8192) binary += String.fromCharCode(...pcm.subarray(i, i + 8192));
      return { peak, rms, invalid, sampleRate: rate, frames: mix.length, channels: 2, pcm: muted ? null : btoa(binary) };
    }
    return { mix: await render(), muted: await render(true) };
  });
  assert.equal(offline.mix.invalid, 0); assert.ok(offline.mix.peak < .84 && offline.mix.rms > .001); assert.equal(offline.muted.peak, 0);
  const pcm = Buffer.from(offline.mix.pcm, 'base64'), header = Buffer.alloc(44); header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22); header.writeUInt32LE(24000, 24); header.writeUInt32LE(96000, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  await fs.writeFile(path.join(output, 'local-sound-design-sample.wav'), Buffer.concat([header, pcm])); delete offline.mix.pcm;
  const report = { locked, live, muted, paused, hidden, disposed, offline, errors, external };
  await fs.writeFile(path.join(output, 'audio-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ offline, peakVoices: live.stress.peakVoices, maxLiveNodes: live.stress.liveNodes, eventDeduplication: true, loadPriming: true, mutedSuspended: true, pausedSuspended: true, hiddenSuspended: true, errors, external }, null, 2));
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
} finally { await browser.close(); }
