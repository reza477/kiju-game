import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeSound, SOUND_NAMES, GameAudio, AUDIO_SETTINGS_KEY, AUDIO_LIMITS } from '../src/audio.js';

test('every original procedural sound is finite, audible, bounded and deterministic', () => {
  for (const name of SOUND_NAMES) {
    const data = synthesizeSound(name, 8000), again = synthesizeSound(name, 8000);
    let peak = 0, sum = 0;
    for (const value of data) { assert.ok(Number.isFinite(value), name); peak = Math.max(peak, Math.abs(value)); sum += value * value; }
    assert.ok(peak <= .801, `${name}: peak ${peak}`);
    assert.ok(Math.sqrt(sum / data.length) > .001, `${name} is audible`);
    assert.deepEqual(data, again, `${name} generation is stable`);
  }
});

test('preferences clamp safely and mute persists without creating an audio context', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const audio = new GameAudio({ storage, document: null });
  assert.equal(audio.getSettings().muted, false);
  audio.setMuted(true); audio.setVolume('music', 4); audio.setVolume('effects', -9);
  assert.equal(audio.getSettings().music, 1); assert.equal(audio.getSettings().effects, 0);
  const restored = new GameAudio({ storage, document: null });
  assert.equal(restored.getSettings().muted, true); assert.equal(restored.getDiagnostics().contextState, 'uncreated');
  assert.ok(values.has(AUDIO_SETTINGS_KEY));
  for (let i = 0; i < 2000; i++) audio.play('confirm', { id: `muted-${i}` });
  assert.equal(audio.getDiagnostics().history, AUDIO_LIMITS.history); assert.equal(audio.getDiagnostics().voices, 0);
});
