// Keep the real game renderer enabled in delivery tests. Windows headless
// Chromium otherwise falls back to SwiftShader even on a GPU-equipped PC;
// multi-second software frames can starve fetch/body tasks past their deadlines.
// Other platforms retain Chromium's existing backend selection by default.
// llvmpipe is an opt-in Linux differential diagnosis using existing Mesa/Xvfb,
// not a hardware GPU or a claim that it performs better than SwiftShader.
function selectedBackend(platform, env) {
  return env.PLAYTEST_GRAPHICS_BACKEND || (platform === 'win32' ? 'd3d11' : 'auto');
}
export function deliveryBrowserOptions({platform = process.platform, env = process.env} = {}) {
  const backend = selectedBackend(platform, env);
  if (!['auto', 'd3d11', 'swiftshader', 'llvmpipe'].includes(backend)) throw new Error('Unsupported PLAYTEST_GRAPHICS_BACKEND. Use auto, d3d11, swiftshader or llvmpipe.');
  if (backend === 'llvmpipe' && (platform !== 'linux' || !env.DISPLAY || env.LIBGL_ALWAYS_SOFTWARE !== 'true' || env.GALLIUM_DRIVER !== 'llvmpipe')) {
    throw new Error('The llvmpipe experiment requires Linux, an existing X DISPLAY, LIBGL_ALWAYS_SOFTWARE=true and GALLIUM_DRIVER=llvmpipe.');
  }
  // Chromium's Linux software-rendering list blocks llvmpipe (entry 3).
  // Override that policy only for this explicitly selected isolated test driver;
  // the real WebGL2 pixel/renderer preflight below still has to succeed.
  const graphicsArgs = backend === 'llvmpipe'
    ? ['--enable-gpu', '--use-gl=angle', '--use-angle=gl', '--use-cmd-decoder=passthrough', '--ignore-gpu-blocklist']
    : ['--enable-unsafe-swiftshader', ...(backend === 'auto' ? [] : [`--use-angle=${backend}`])];
  return {headless: true, ...(env.PLAYWRIGHT_CHANNEL ? {channel: env.PLAYWRIGHT_CHANNEL} : {}), args: ['--mute-audio', ...graphicsArgs]};
}

export async function browserGraphicsInfo(browser, {platform = process.platform, env = process.env} = {}) {
  const session = await browser.newBrowserCDPSession();
  let info;
  try {
    const {gpu} = await session.send('SystemInfo.getInfo');
    info = {platform, requestedBackend: selectedBackend(platform, env),
      renderer: gpu.auxAttributes?.glRenderer || null, vendor: gpu.auxAttributes?.glVendor || null,
      webgl: gpu.featureStatus?.webgl || null, webgl2: gpu.featureStatus?.webgl2 || null};
  } finally {await session.detach();}
  if (info.requestedBackend !== 'llvmpipe') return info;
  let probe, timer;
  try {
    probe = await browser.newPage();
    info.webgl2Probe = await Promise.race([probe.evaluate(() => {
      const began = performance.now(), canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2;
      let contextError = null;
      canvas.addEventListener('webglcontextcreationerror', event => {contextError = event.statusMessage;});
      const gl = canvas.getContext('webgl2');
      if (!gl) return {available: false, contextError, elapsedMs: performance.now() - began};
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      gl.clearColor(.25, .5, .75, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      const pixel = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const result = {available: true, renderer: gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
        version: gl.getParameter(gl.VERSION), pixel: [...pixel], error: gl.getError(), elapsedMs: performance.now() - began};
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return result;
    }), new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('WebGL2 backend probe exceeded 10 seconds.')), 10000);})]);
    // Read CDP again after a real context initialized the selected GL backend.
    const verifiedSession = await browser.newBrowserCDPSession();
    try {
      const {gpu} = await verifiedSession.send('SystemInfo.getInfo');
      info.renderer = gpu.auxAttributes?.glRenderer || null;
      info.vendor = gpu.auxAttributes?.glVendor || null;
      info.webgl = gpu.featureStatus?.webgl || null;
      info.webgl2 = gpu.featureStatus?.webgl2 || null;
    } finally {await verifiedSession.detach();}
    const actual = info.webgl2Probe;
    if (![info.renderer, actual.renderer].every(renderer => /llvmpipe/i.test(renderer || '') && !/swiftshader/i.test(renderer || ''))
        || !actual.available || !/^WebGL 2\.0/.test(actual.version || '') || actual.error !== 0
        || ![64, 128, 191, 255].every((expected, index) => Math.abs((actual.pixel?.[index] ?? -100) - expected) <= 1)) {
      throw new Error('The requested llvmpipe backend did not provide verified WebGL2 rendering.');
    }
    return info;
  } catch (error) {
    // Callers collect graphics before creating their gameplay context. Close on
    // preflight failure so a rejected backend cannot leak a browser or run tests.
    await browser.close();
    throw new Error(`${error.message} Backend evidence: ${JSON.stringify(info)}`);
  } finally {clearTimeout(timer); await probe?.close().catch(() => {});}
}
