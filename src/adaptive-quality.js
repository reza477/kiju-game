// Lowers the detail level when the device cannot hold a playable frame rate.
//
// The game was tuned on a desktop graphics card. On a laptop, High detail
// draws the whole valley at Retina resolution and falls to about 25 frames a
// second, so the first minute is spent in a slideshow unless the player finds
// the Detail button. This watches real frame times and steps down once the
// average over a few seconds is too slow. It never steps up, it ignores
// stalls such as a hidden tab or a shader compile, and it is switched off as
// soon as the player chooses a level.
export const AUTOMATIC_QUALITY_KEY = 'colossus-quality-auto-v1';
const ORDER = ['high', 'balanced', 'performance'];
// Average milliseconds per frame above which a level is too slow to keep:
// below about 38 frames a second on High and 33 on Balanced.
const TOO_SLOW = {high: 26, balanced: 30};

export function createDetailGovernor({windowMs = 3000, settleMs = 2500, stallMs = 250, minimumFrames = 30} = {}) {
  let enabled = true, level = null, last = null, settleUntil = 0, elapsed = 0, frames = 0;
  const restart = (now, settle) => {elapsed = 0; frames = 0; if (settle) settleUntil = now + settleMs;};
  return {
    get enabled() {return enabled;},
    disable() {enabled = false;},
    // `now` is the frame timestamp in milliseconds and `current` the level in
    // use. Returns the level to switch to, or null.
    frame(now, current, {hidden = false} = {}) {
      if (!enabled || !Number.isFinite(now)) return null;
      const delta = last === null ? null : now - last; last = now;
      // A new level, or a new scene under the same one, compiles shaders and
      // uploads geometry first. Do not judge it by those frames.
      if (current !== level) {level = current; restart(now, true); return null;}
      if (!(current in TOO_SLOW)) return null;
      if (hidden || delta === null || delta <= 0 || delta > stallMs) {restart(now, false); return null;}
      if (now < settleUntil) return null;
      elapsed += delta; frames++;
      if (elapsed < windowMs) return null;
      const average = elapsed / frames, enough = frames >= minimumFrames; restart(now, false);
      if (!enough || average <= TOO_SLOW[current]) return null;
      const next = ORDER[ORDER.indexOf(current) + 1];
      level = next; restart(now, true);
      return next;
    },
    // A new game replaces the scene's actors; give it the same grace.
    settle(now) {if (Number.isFinite(now)) restart(now, true);},
  };
}
