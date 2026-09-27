// Keep the real game renderer enabled in delivery tests. Windows headless
// Chromium otherwise falls back to SwiftShader even on a GPU-equipped PC;
// multi-second software frames can starve fetch/body tasks past their deadlines.
// Other platforms retain Chromium's existing backend selection. Report the
// actual renderer so Linux CI/software results cannot masquerade as GPU tests.
export function deliveryBrowserOptions() {
  const backend = process.env.PLAYTEST_GRAPHICS_BACKEND || (process.platform === 'win32' ? 'd3d11' : 'auto');
  if (!['auto', 'd3d11', 'swiftshader'].includes(backend)) throw new Error('Unsupported PLAYTEST_GRAPHICS_BACKEND. Use auto, d3d11 or swiftshader.');
  return {headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {}),
    args: ['--mute-audio', '--enable-unsafe-swiftshader', ...(backend === 'auto' ? [] : [`--use-angle=${backend}`])]};
}

export async function browserGraphicsInfo(browser) {
  const session = await browser.newBrowserCDPSession();
  try {
    const {gpu} = await session.send('SystemInfo.getInfo');
    return {platform: process.platform, requestedBackend: process.env.PLAYTEST_GRAPHICS_BACKEND || (process.platform === 'win32' ? 'd3d11' : 'auto'),
      renderer: gpu.auxAttributes?.glRenderer || null, vendor: gpu.auxAttributes?.glVendor || null,
      webgl: gpu.featureStatus?.webgl || null, webgl2: gpu.featureStatus?.webgl2 || null};
  } finally {await session.detach();}
}
