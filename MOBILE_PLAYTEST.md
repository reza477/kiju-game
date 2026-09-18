# Playing on iPad and iPhone

The same browser game can be installed as a Home Screen app. It does not need an engine migration, App Store build, or a running PC after the complete game has been downloaded. The current work is local preparation: **there is no hosted mobile link yet**.

## First installation, after private hosting is approved

1. Open the private game link in **Safari** and sign in.
2. Tap **Share → Add to Home Screen → Add**. If Safari shows **Open as Web App**, enable it.
3. Open the new **Colossus Wake** icon. Choose **Play on your devices & saves**, then **Prepare offline play**. Keep the app connected until it confirms that the complete game is stored.
4. Close the game and its Safari tabs, then reopen the icon once. Test it in Airplane Mode before relying on it away from your PC.

Drag with one finger to orbit, pinch with two to zoom, and use the arrow pad to move. Phones have **City**, **Build**, and **Map** buttons that open and close their panels. Landscape is recommended on phones. Touch devices start in the existing Performance graphics mode; **Detail** changes and remembers the setting on that device.

The exact iPad model and iPadOS version still need confirming. Desktop touch emulation is not a test of an actual iPad's Safari, memory limits, battery usage, or sustained frame rate. This game currently requires WebGL2 and modern browser features. Large scenes may need further optimization after the first real-device playtest.

## Progress and feedback

Each device keeps its own save. Builds do not automatically synchronize progress. In the game menu, open **Play on your devices & saves**:

- **Export save** downloads a JSON file. Keep it in Files and transfer it to your other device, where **Import save** validates it and asks before replacing the current expedition.
- **Recover previous save** offers the expedition saved immediately before the last import. Keep an exported backup too: the operating system can clear browser storage.
- **Copy feedback** or **Save feedback file** includes your notes, build ID, browser, screen size and graphics setting. Paste the report into our chat. Nothing is submitted automatically.
- **Check for update** downloads a complete new build while online. Save, close **every** game window/tab, and reopen to activate it. A running expedition is never forcibly reloaded.

If the device clears part of an offline copy, the app's recovery screen can download a complete verified copy again while online. It preserves the save keys. Whole-origin storage deletion may also delete saves, which is why exported backups matter.

## Local build and privacy boundary

The original mobile-preparation checkpoint is `checkpoint/before-ipad-playtest-20260914`, based on `7fc56f5`. Current Alpha 1 work is on `codex/alpha1-environment-20260917`, with its own checkpoint at `aef1f02`. See [Alpha 1 verification](ALPHA1_VERIFICATION.md) for the current package and checks.

Run `npm run build:mobile`. The script creates `artifacts/mobile-release/<build-id>/` and writes the same ID to `src/build-info.js` in the PC working copy. Rebuild after changing runtime files. Only the playable runtime, local assets, browser libraries, icons, manifest and offline worker enter the release. Git history, desktop launcher, credentials, tests and review captures are excluded. The output supports hosting at the root of one stable HTTPS origin.

The Windows desktop shortcut and its loopback origin remain unchanged. The normal PC server does not register an offline worker or serve the release descriptor; it continues loading the working copy directly.

Recommended next step is private static hosting behind Cloudflare Access with an email allowlist and one-time code sign-in. **This requires the owner's approval before any upload.** The hosting provider would receive the playable JavaScript and game assets. Source repository history need not be uploaded. Establish access protection using an empty placeholder first, then verify signed-out denial on production, preview and any alternate hostnames before uploading the game. A secret URL alone is not access control. Offline copies remain on authorized devices after download.

Relevant official guidance: [Apple Home Screen web apps](https://support.apple.com/en-ae/guide/ipad/ipad8f1f7a29/ipados), [WebKit storage and persistence](https://webkit.org/blog/14403/updates-to-storage-policy/), [Cloudflare protection for production and preview addresses](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain).

## Reproducing local checks

- `npm test`: simulation, variants, vertical growth, camera gestures, external save validation, release packaging and offline lifecycle unit tests.
- Start a separate local server with `PORT=4186`, then `npm run test:mobile`: actual game rendering and touch input in an isolated desktop Chromium profile at tablet and phone sizes. Results are in `artifacts/mobile-playtest/`.
- `npm run test:offline-browser`: builds the real release and serves it on a temporary loopback port, installs it through the game UI, stops the server, disables the test browser's network and reopens it to check offline rendering and save resume. Results are in `artifacts/mobile-offline/`.

Run browser checks serially. They use the existing local Playwright runtime and installed Chrome; no browser downloads or software installation are required. These checks do not establish physical Apple device performance or test real Home Screen installation, hosted sign-in, or remote deployment. Those remain the next playtest after approval.

## Verification record

The earlier mobile-preparation checks completed September 17, 2026 are recorded below. The [Alpha 1 report](ALPHA1_VERIFICATION.md) contains the newer environment, performance and final release verification. Both remain local, with no hosted mobile link or physical Apple-device validation.

- 106 unit tests passed across the existing game and new camera, save-transfer and offline code. The final recovery icon change also passed all 20 offline tests.
- 13 touch-browser checks passed, including pinch, movement, portrait and landscape construction, travel, export/import, damaged-save rejection, rollback after failed scene initialization, and feedback export. No browser errors or third-party requests.
- 13 existing PC browser checks passed, including faction previews, construction, gathering, combat, withdrawal, save reload and pause. No browser errors or third-party requests.
- The real release was reopened with the test server stopped and the browser offline, continued its saved expedition and moved via touch. A deliberately deleted boot module produced the independent repair screen; explicit complete-cache repair preserved the save and restored the game. The exact tested release ID and eight offline checks are recorded in `artifacts/mobile-offline/results.json`.

The touch test sampled 120 running frames in desktop Chromium, but it is not an Apple-device performance benchmark. No claim of an iPad/iPhone frame rate, long-session memory stability, Safari installation success, hosted login success, or automatic cross-device save sync is made. All hosting remains unconfigured and unpublished.
