import { requireValue, safeOrigin, digest } from './delivery-lib.mjs';
import {deliveryBrowserOptions, browserGraphicsInfo} from './browser-runtime.mjs';

export async function privateFetch(origin, pathname, secret) {
  origin = safeOrigin(origin);
  const url = new URL(pathname, origin);
  requireValue(url.origin === origin, 'Automation credentials cannot leave the exact game host.');
  return fetch(url, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(30000),
    headers: secret ? { 'x-vercel-protection-bypass': secret } : {} });
}
export async function assertDenied(origin, pathname) {
  const response = await privateFetch(origin, pathname);
  const redirect = response.headers.get('location');
  const login = redirect && new URL(redirect, origin);
  requireValue([401, 403].includes(response.status) || ([302, 303, 307, 308].includes(response.status) && login?.protocol === 'https:' && login.hostname === 'vercel.com' && /sso|login/.test(login.pathname)), `Unauthenticated protection was not proven for ${pathname}.`);
}
export async function hostedSmoke(origin, descriptor, secret, { records, allFiles = true } = {}) {
  requireValue(secret, 'A project automation bypass secret is required.');
  requireValue(Array.isArray(records) && records.length === descriptor.files.length + 2, 'The complete tested artifact records are required.');
  const expected = new Map(records.map(record => [record.path, record]));
  requireValue(expected.size === records.length && expected.has('/release.json') && expected.has('/sw.js'), 'Artifact records omit or duplicate runtime files.');
  for (const file of descriptor.files) {
    const record = expected.get(file.url);
    requireValue(record?.bytes === file.bytes && record?.sha256 === file.sha256, 'Artifact records disagree with the tested descriptor.');
  }
  const assertBytes = (pathname, bytes) => {
    const record = expected.get(pathname);
    requireValue(record && bytes.length === record.bytes && digest(bytes) === record.sha256, `Hosted artifact mismatch: ${pathname}`);
  };
  for (const pathname of ['/', '/release.json', '/sw.js', '/src/main.js']) await assertDenied(origin, pathname);
  const manifestResponse = await privateFetch(origin, '/release.json', secret);
  requireValue(manifestResponse.status === 200 && manifestResponse.headers.get('content-type')?.includes('application/json'), 'Authorized release metadata unavailable.');
  requireValue(/no-store|no-cache|max-age=0/.test(manifestResponse.headers.get('cache-control') || ''), 'Release metadata is not revalidated.');
  const manifestBytes = Buffer.from(await manifestResponse.arrayBuffer());
  assertBytes('/release.json', manifestBytes);
  const actual = JSON.parse(manifestBytes.toString('utf8'));
  requireValue(JSON.stringify(actual) === JSON.stringify(descriptor), 'Hosted descriptor differs from tested artifact.');
  const checkedFiles = allFiles ? descriptor.files : descriptor.files.filter(file => ['/index.html','/src/main.js','/src/build-info.js','/manifest.webmanifest'].includes(file.url));
  for (const file of checkedFiles) {
    const response = await privateFetch(origin, file.url, secret);
    requireValue(response.status === 200 && response.headers.get('content-type')?.split(';')[0] === file.type.split(';')[0], `Hosted asset type/status mismatch: ${file.url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assertBytes(file.url, bytes);
  }
  const worker = await privateFetch(origin, '/sw.js', secret);
  requireValue(worker.status === 200 && /javascript/.test(worker.headers.get('content-type') || '') && /no-store|no-cache|max-age=0/.test(worker.headers.get('cache-control') || ''), 'Worker unavailable or stale-cacheable.');
  const workerBytes = Buffer.from(await worker.arrayBuffer());
  assertBytes('/sw.js', workerBytes);
  requireValue(workerBytes.toString('utf8').includes(descriptor.buildId), 'Worker build identity mismatch.');
  return { origin: safeOrigin(origin), buildId: descriptor.buildId, gitCommit: descriptor.gitCommit, protected: true, authorized: true, verifiedFiles: checkedFiles.length + 2 };
}

// Override headers on route.continue also follow redirects. Fetch each response
// without following redirects, then fulfill only redirects within this origin.
export async function installHostAuthorization(context, origin, secret, { allowLoopbackForTest = false } = {}) {
  const parsed = new URL(origin);
  if (allowLoopbackForTest && parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1') {
    requireValue(!parsed.username && !parsed.password && !parsed.search && !parsed.hash && parsed.pathname === '/', 'Loopback tests require a plain root origin.');
    origin = parsed.origin;
  } else origin = safeOrigin(origin);
  requireValue(typeof secret === 'string' && secret.length > 0, 'A project automation bypass secret is required.');
  const statistics = { authorizedRequests: 0, blockedRequests: 0, blockedRedirects: 0, failedRequests: 0 };
  await context.route('**/*', async route => {
    try {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { statistics.blockedRequests++; return await route.abort(); }
      const response = await route.fetch({ maxRedirects: 0, timeout: 30000,
        headers: { ...route.request().headers(), 'x-vercel-protection-bypass': secret, 'x-vercel-set-bypass-cookie': 'true' } });
      statistics.authorizedRequests++;
      const location = response.headers().location;
      if (location && [301, 302, 303, 307, 308].includes(response.status())) {
        const target = new URL(location, url);
        if (target.origin !== origin || target.username || target.password) {
          statistics.blockedRedirects++; return await route.abort();
        }
      }
      await route.fulfill({ response });
    } catch {
      // Playwright fetch exceptions can contain request headers. Do not propagate
      // those errors or include them in diagnostics, traces, or build artifacts.
      statistics.failedRequests++;
      try { await route.abort(); } catch { /* Request/page already closed. */ }
    }
  });
  return { getStatistics: () => ({ ...statistics }) };
}

export async function waitForHostedWorker(page, buildId, { timeoutMs = 180000, pollingMs = 500 } = {}) {
  requireValue(Number.isFinite(timeoutMs) && timeoutMs > 0 && Number.isFinite(pollingMs) && pollingMs > 0, 'Invalid hosted worker verification timeout.');
  const deadline = performance.now() + timeoutMs;
  const timeoutMessage = 'Hosted worker installation verification timed out.';
  while (performance.now() < deadline) {
    let timer;
    let timedOut = false;
    try {
      // Await the evaluated Boolean in Node. An async waitForFunction predicate
      // can otherwise be accepted as a truthy Promise before it has completed.
      const ready = await Promise.race([
        page.evaluate(async expected => {
          const status = (await import('/src/offline.js')).getOfflineStatus();
          const registration = await navigator.serviceWorker.getRegistration('/');
          const controller = navigator.serviceWorker.controller;
          return status.buildId === expected && status.installedBuildId === expected
            && status.canPlayOffline && !status.canApplyUpdate && !status.needsReopen && !!status.checkedAt
            && registration?.active?.state === 'activated' && registration.scope === `${location.origin}/`
            && controller?.scriptURL === `${location.origin}/sw.js`;
        }, buildId),
        new Promise((_, reject) => {
          timer = setTimeout(() => { timedOut = true; reject(new Error(timeoutMessage)); }, Math.max(1, deadline - performance.now()));
        }),
      ]);
      if (ready === true && performance.now() < deadline) return;
    } catch (error) {
      if (timedOut) throw new Error(timeoutMessage);
      // The updater may reopen the page once its release is installed. Retry
      // only that known navigation interruption; never hide arbitrary errors or
      // propagate browser exception text that could contain sensitive details.
      if (!/Execution context was destroyed, most likely because of a navigation\.?($|\n)/.test(String(error?.message || ''))) {
        throw new Error('Hosted worker installation verification failed.');
      }
    } finally {
      clearTimeout(timer);
    }
    const remaining = deadline - performance.now();
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.min(pollingMs, remaining)));
  }
  throw new Error(timeoutMessage);
}

// Browser uses origin-scoped authorization, not global secret headers or URLs.
// No traces, request/header dumps, recordings, or auth screenshots are captured.
export async function hostedBrowserSmoke(origin, secret, buildId) {
  origin = safeOrigin(origin);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch(deliveryBrowserOptions());
  try {
    const graphics = await browserGraphicsInfo(browser);
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const errors = [];
    const authorization = await installHostAuthorization(context, origin, secret);
    const page = await context.newPage(); page.on('pageerror', () => errors.push('Runtime error'));
    await page.goto(`${origin}/`, { timeout: 90000 });
    await page.locator('#begin').waitFor({ state: 'visible', timeout: 90000 });
    requireValue(await page.evaluate(async () => (await import('/src/build-info.js')).BUILD_ID) === buildId, 'Browser loaded wrong build.');
    requireValue(await page.evaluate(() => 'serviceWorker' in navigator && isSecureContext), 'Service worker unavailable on hosted origin.');
    // Let the actual title-screen updater perform its authenticated installation
    // and safe reopen. API presence alone does not prove offline/update support.
    await waitForHostedWorker(page, buildId);
    const workerStatus = await page.evaluate(expected => new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Hosted worker status timed out.')); }, 8000);
      channel.port1.onmessage = ({ data }) => { clearTimeout(timer); channel.port1.close(); resolve(data); };
      navigator.serviceWorker.controller.postMessage({ type: 'COLOSSUS_OFFLINE_STATUS', buildId: expected }, [channel.port2]);
    }), buildId);
    requireValue(workerStatus?.protocol === 2 && workerStatus.buildId === buildId && workerStatus.complete === true
      && workerStatus.clientBuildId === buildId && workerStatus.clientComplete === true, 'Hosted worker did not validate the complete current release.');
    const requests = authorization.getStatistics();
    requireValue(requests.blockedRequests === 0 && requests.blockedRedirects === 0 && requests.failedRequests === 0, 'Hosted browser encountered blocked or failed authorization requests.');
    requireValue(!errors.length, 'Hosted startup runtime error.');
    return { browser: browser.version(), graphics, titleReady: true, serviceWorkerAvailable: true, workerActivated: true,
      workerControlsPage: true, verifiedOfflineComplete: true, installedBuildId: buildId, authenticatedUpdaterChecked: true,
      evidence: 'Desktop Chromium; not physical iPhone.' };
  } finally { await browser.close(); }
}
