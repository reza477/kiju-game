// Keeps the detail level at the best one the device can hold.
//
// The game was tuned on a desktop graphics card. On a laptop, High detail
// draws the whole valley at Retina resolution and can fall to a slideshow, so
// the first minute is lost unless the player finds the Detail button. This
// watches real frame times. It steps the detail down once the average over a
// few seconds is too slow, and steps it back up, one level at a time, once a
// level has run at the display's full rate for a while: a laptop is several
// times faster off its battery saver than on it, and should not be left on
// the lowest level because it was slow once.
//
// A level that proved too slow is not tried again for a day, so a device that
// cannot hold it is not made to stutter on every visit. Stalls such as a
// hidden tab or a shader compile are ignored, the device's own starting level
// is never exceeded, and the governor is switched off as soon as the player
// chooses a level.
export const AUTOMATIC_QUALITY_KEY = 'colossus-quality-auto-v1';
export const TOO_SLOW_KEY = 'colossus-quality-too-slow-v1';
const ORDER = ['high', 'balanced', 'performance'];
// Average milliseconds per frame above which a level is too slow to keep:
// below about 38 frames a second on High and 33 on Balanced.
const TOO_SLOW = {high: 26, balanced: 30};
// At or below this average a level is running at a 60 Hz display's full rate.
const FULL_RATE = 17.5;
// A level reached by stepping up replaced one that ran at full rate, so it is
// kept only while it holds about 45 frames a second.
const RAISED_TOO_SLOW = 22;

// The stored record of levels that were too slow, as {level: time in ms}.
export function readTooSlow(text) {
  try {
    const record = JSON.parse(text ?? '{}'), result = {};
    for (const level of ORDER) if (Number.isFinite(record?.[level])) result[level] = record[level];
    return result;
  } catch {return {};}
}

export function createDetailGovernor({windowMs = 3000, settleMs = 2500, stallMs = 250, minimumFrames = 30, raiseWindowMs = 10000, retryAfterMs = 86400000, ceiling = 'high', tooSlow = {}, wallClock = () => Date.now()} = {}) {
  let enabled = true, level = null, raised = null, last = null, settleUntil = 0, elapsed = 0, frames = 0, raiseElapsed = 0, raiseFrames = 0;
  const slow = {...tooSlow};
  const restart = (now, settle) => {elapsed = 0; frames = 0; raiseElapsed = 0; raiseFrames = 0; if (settle) settleUntil = now + settleMs;};
  const mayRaiseTo = higher => higher !== undefined && ORDER.indexOf(higher) >= ORDER.indexOf(ceiling) && !(wallClock() - slow[higher] < retryAfterMs);
  return {
    get enabled() {return enabled;},
    disable() {enabled = false;},
    // Levels that were too slow and when, to store with the level.
    tooSlow() {return {...slow};},
    // `now` is the frame timestamp in milliseconds and `current` the level in
    // use. Returns the level to switch to, or null.
    frame(now, current, {hidden = false} = {}) {
      if (!enabled || !Number.isFinite(now)) return null;
      const delta = last === null ? null : now - last; last = now;
      // A new level, or a new scene under the same one, compiles shaders and
      // uploads geometry first. Do not judge it by those frames.
      if (current !== level) {level = current; restart(now, true); return null;}
      if (hidden || delta === null || delta <= 0 || delta > stallMs) {restart(now, false); return null;}
      if (now < settleUntil) return null;
      elapsed += delta; frames++; raiseElapsed += delta; raiseFrames++;
      if (current in TOO_SLOW && elapsed >= windowMs) {
        const average = elapsed / frames, enough = frames >= minimumFrames; elapsed = 0; frames = 0;
        if (enough && average > (current === raised ? Math.min(RAISED_TOO_SLOW, TOO_SLOW[current]) : TOO_SLOW[current])) {
          slow[current] = wallClock();
          level = ORDER[ORDER.indexOf(current) + 1]; restart(now, true);
          return level;
        }
      }
      if (raiseElapsed >= raiseWindowMs) {
        const average = raiseElapsed / raiseFrames, higher = ORDER[ORDER.indexOf(current) - 1]; raiseElapsed = 0; raiseFrames = 0;
        if (average <= FULL_RATE && mayRaiseTo(higher)) {level = raised = higher; restart(now, true); return higher;}
      }
      return null;
    },
    // A new game replaces the scene's actors; give it the same grace.
    settle(now) {if (Number.isFinite(now)) restart(now, true);},
  };
}
