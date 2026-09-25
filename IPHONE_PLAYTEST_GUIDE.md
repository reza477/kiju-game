# Colossus Wake — iPhone playtest and private hosting

Prepared 24 September 2026 for Implementation Pass 1. This is an unexecuted hosting proposal and physical-device checklist. No game has been uploaded, no host/account has been created, and no access permissions have been changed by this pass. The final release identity and local test results belong in the accompanying implementation report.

## Proposed host and exact approval

Use **one dedicated Cloudflare Pages Direct Upload project**, with the stable production origin **`https://cw-playtest.pages.dev/`**, protected by **Cloudflare Access with an explicit email allowlist and email one-time PIN sign-in**. This name is a proposal, not a registered or verified-available address. The existing local project has no Pages/Wrangler, Vercel, Netlify or other deployment configuration. Its Git origin references `reza477/kiju-game`; repository visibility was not reverified for this pass. Even a private repository does not protect a web deployment. Existing project documentation already proposes Cloudflare Access, but no hosting credentials, account entitlement or deployed hostname were verified. The Website workspace was not inspected or used.

Pages supports uploading a prebuilt folder or ZIP without connecting GitHub. Only the final runtime would be sent: executable browser JavaScript, local art/materials, icons, manifest and service worker. Source history, development tools, saved expeditions and review evidence would stay out. The proposed origin has no project subpath, matching this game's `/manifest.webmanifest`, `/sw.js`, `/release.json`, `start_url: /` and service-worker `scope: /`. Keep that origin stable; changing it creates a different browser storage location. [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

Before any upload, the owner must approve **the Cloudflare account to use, creation of this separate Pages project and its Access application/policies, the exact allowed email address(es), and upload of this runtime to Cloudflare**. If the proposed name is unavailable, confirm the replacement stable hostname. No paid plan, purchase or installation is authorized; stop for a separate decision if one is required. Account/plan eligibility is still unverified.

After approval, establish access using a harmless placeholder first. Protect **both** `cw-playtest.pages.dev` and `*.cw-playtest.pages.dev` (preview hashes and aliases), with a whole-host application rather than protection of `/` alone. Verify signed-out denial for HTML, a direct source-module URL, a material URL, `/sw.js` and `/release.json` on production and every preview/alias. No custom domain or additional hostname is proposed. Pages' default preview-protection toggle does **not** protect the production hostname; Cloudflare documents configuring both. [Production and preview protection](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain). Email PIN sign-in must be explicitly configured and restricted by the allowlist. [Cloudflare one-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/).

Only after those checks should the approved runtime replace the placeholder. Preserve its bytes and verify correct MIME types, the complete release manifest and downloaded build identity. A private repository, unlisted address or password embedded in JavaScript is not access protection. This is a proposal, not a claim that protected hosting or Apple sign-in has already passed.

## Offline and authentication boundaries

Once the **complete** runtime is stored and verified on the device, gameplay does not require the PC, a home-network connection or a tunnel. The hosted copy is needed for first installation, updates and storage repair. The runtime ZIP alone is not an iPhone app installer; it must be served at the approved HTTPS origin first.

Access authenticates network requests. It cannot retract files already downloaded into an authorized device's offline cache, and an authorized player can inspect or copy client-side JavaScript and assets. Signing out or removing an allowlist entry therefore does not remotely erase a downloaded game. There is no DRM or client-side secret.

Expired login during preparation, update or repair may produce a redirect/login document. Existing release integrity validation deliberately rejects that response; it must not mark a partial or login-page download as ready. Reconnect and sign in, then retry. Verify initial sign-in and reauthentication **inside the Home Screen app on the real iPhone**; do not assume its session shares Safari's cookies. Hosted authentication, session expiration and Home Screen behavior are untested until a protected host is approved.

Browser/OS storage can be evicted. The game's persistence request is best effort, and deleting site data can also delete saves. Keep exported backups outside the app. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).

## First iPhone launch, after hosting is approved

1. Open the approved game address in Safari while online and sign in using your allowed email and one-time code.
2. In Safari's Share menu, choose **Add to Home Screen**. If shown, enable **Open as Web App**, then tap **Add**. Launch the new Colossus Wake icon. Menu placement varies with iOS version. [Apple's Home Screen instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).
3. On the title screen, choose **Play on your devices & saves**. During play, use **Menu → Playtest, offline & save transfer**. Choose **Prepare offline play** and keep the app open and connected until it confirms the complete game is stored. Record the displayed build ID.
4. Begin an expedition, or continue your existing one, and save it. Close **all** game windows/tabs, and reopen the Home Screen icon. Verify the same build ID and continue the expedition.
5. Enable Airplane Mode, ensure Wi-Fi is off, close and reopen the icon, and continue/move/build. Do this before relying on the app for a commute. If it opens a repair screen, reconnect and use **Repair offline game**. Do not clear site data as a repair step.

Landscape gives the world more room, but portrait remains supported. Drag the clear world area to orbit, pinch with two fingers to zoom, and hold the arrow pad to move. Use City/Build/Map to open contextual panels and their close control to dismiss them. Critical totals, hull and population/capacity remain visible or available through the status details. The menu retains graphics, lighting, audio, saves and playtest controls. Menus retain the game's existing pause behavior.

## Short real-device playtest

- **Touch:** Try travel to a resource and empty ground with sheets closed. A ground travel tap should set a destination without opening City. Check construction/upgrade names, costs and progress, population, combat controls and scrolling panels in both orientations. UI taps must not also move the carrier. Drag and pinch near controls, interrupt a held movement touch, and confirm movement stops.
- **Compare presets:** Keep the same scene/camera and manually compare Performance, Balanced and High. Preserve the setting you find useful; this pass does not force High or add automatic quality changes. Record preset and orientation with each report.
- **Feedback sample:** Start the opt-in active-play sample from the existing Playtest panel, return to play, then stop or let its 120-second active limit finish. Copy feedback and add the visible problem. Reset between comparisons. This measures browser requestAnimationFrame scheduling, not GPU time, native presented FPS or sustained thermal performance. Nothing is uploaded automatically.
- **Lock/background:** While sampling and moving, lock the phone, switch apps, then return. Check that input cleared, no held direction remains, and hidden/paused periods are excluded from the sample. Resume play and verify the save remains usable.
- **Save transfer:** Export save to Files before replacing progress. Transfer that JSON to the PC/other device and import using the existing confirmation flow. Each origin/device has its own save; there is no automatic cloud sync. Check **Recover previous save** after a test import.
- **Offline/update:** Repeat offline reopening from the Home Screen icon with the PC off. When a new build is available, reconnect, check for update, save, close every game window/tab, and reopen. A downloaded update should not force-reload an active game.

Report the build ID, iOS version if known, orientation, preset, visible symptom and copied feedback. Browser-reported identifiers must not be treated as proof of an exact iPhone model. Chromium touch emulation and desktop WebKit do not establish physical iPhone usability, battery/thermal behavior, Safari login or Home Screen/offline success.

## Rebuilding and testing without modifying the PC source

From the full game checkout, use the existing builder in isolated mode:

```powershell
node scripts/build-mobile-release.mjs --isolated --output-root artifacts/iphone-pass1/release
```

The output is `artifacts/iphone-pass1/release/<build-id>/`. It contains the complete runtime and its actual generated build ID, while leaving the working `src/build-info.js` unchanged. `--source-root <directory>` can point to a separately prepared checkout/copy. Omitting `--isolated` retains the old intentional behavior of stamping the PC source build ID. Archive the **contents** of the generated build directory so `index.html`, `sw.js` and `release.json` are at the ZIP root; do not upload an enclosing build-ID folder.

To verify the exact final runtime with the existing offline browser check, set `GAME_RELEASE_DIR` to that build directory and `GAME_TEST_OUTPUT` to an isolated evidence directory, then run `node tests/mobile-offline-browser.mjs`. It owns one loopback server and stops it to test offline reopening; optional `GAME_TEST_PORT` selects that server's port. These loopback addresses are test infrastructure, not the proposed commuting solution. The check creates an isolated browser context and never accesses the normal PC save. Its default build also uses isolated output. Run browser checks serially to avoid competing graphics workloads.
