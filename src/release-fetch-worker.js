// Classic, self-contained worker: metadata transport must not share the game's
// rendering thread. No imports, remote assets, credentials in messages or writes.
let requested = false;
self.addEventListener('message', async ({data}) => {
  if (requested || data?.type !== 'fetch-release') return;
  requested = true;
  const abort = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => {abort.abort(); reject(Object.assign(new Error('Release request timed out'), {kind: 'timeout'}));}, 8000);
  });
  try {
    const release = await Promise.race([expired, (async () => {
      const response = await fetch('/release.json', {cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: abort.signal});
      if (response.status === 404) throw Object.assign(new Error('Release unavailable'), {kind: 'unavailable'});
      if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('application/json')) throw Object.assign(new Error('Unverified response'), {kind: 'unverified'});
      let result;
      try {result = await response.json();} catch (error) {
        if (abort.signal.aborted) throw Object.assign(new Error('Release request timed out'), {kind: 'timeout'});
        throw Object.assign(new Error('Invalid release JSON'), {kind: 'invalid'});
      }
      if (!result || result.app !== 'colossus-wake' || result.schemaVersion !== 1 || !/^[a-f0-9]{20}$/.test(result.buildId) || !Array.isArray(result.files) || !result.files.some(file => file?.url === '/index.html') || !result.files.some(file => file?.url === '/src/build-info.js')) throw Object.assign(new Error('Invalid release descriptor'), {kind: 'invalid'});
      return result;
    })()]);
    clearTimeout(timer);
    self.postMessage({type: 'release-result', release});
  } catch (error) {
    self.postMessage({type: 'release-error', kind: abort.signal.aborted ? 'timeout' : error.kind || 'network'});
  } finally {clearTimeout(timer);}
});
self.postMessage({type: 'release-ready'});
