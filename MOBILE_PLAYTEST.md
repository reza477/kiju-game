# Colossus Wake on iPhone

The mobile version uses the same game and saves as the PC version. The intended installation is a **Home Screen web app**: open its protected HTTPS link in Safari, add the icon, and download the complete game for offline play. After that, the PC does not need to stay on. This supports the owner's 10 November request to play and test away from home.

**Current status: Configured but blocked.** No playable hosted game or physical-iPhone result is currently verified. The designated address is `https://colossus-wake-playtest.vercel.app`; it must not be presented as a working game link until a matching release is verified. The existing failed art/geometry gate remains in force. See [private delivery](docs/PRIVATE_DELIVERY.md) and [the current iPhone delivery audit](docs/IPHONE_DELIVERY_AUDIT_2026-11-10.md).

## Install after the playable release is verified

1. Open the verified game link in **Safari** on the iPhone and sign in with the authorized account.
2. Tap **Share → Add to Home Screen**. Turn on **Open as Web App** if shown, then tap **Add**.
3. Open the new **Colossus Wake** icon while online. Keep it open until the complete game download finishes. In **Menu → Playtest, offline & save transfer**, use **Prepare offline play** if needed and check its status.
4. Save the expedition, close the app, turn on Airplane Mode, and reopen its icon once. Confirm **Continue**, movement and construction work before relying on it away from home.

Apple documents the Home Screen installation steps in [Turn a website into an app in Safari on iPhone](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios). WebKit supports offline storage but may evict website data under storage pressure; offline preparation is not a permanent-storage guarantee. Keep exported saves. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).

## Controls and testing

Use one finger to orbit, two fingers to zoom, and the arrow pad to move. **City**, **Build** and **Map** open their respective panels. Landscape gives the world more room; portrait remains supported. Touch devices initially select **Performance** detail, which can be changed in the menu.

Resource destinations show supply, distance, travel time and gathering rate. **Stop course** cancels automatic travel. **Districts** lists every built district and its level or construction timer. These controls preserve the same carrier choices, economy and progression as the PC version.

For a useful first iPhone report:

- Include the iPhone model and iOS version, the in-game build ID, orientation and detail setting.
- Try moving, orbiting, pinching, building, selecting a district, gathering and one battle.
- Save, lock and unlock the phone, switch apps, then return and resume.
- Test the installed icon offline after the complete download. Export a save before testing updates.
- Use **Play sample** for a two-minute active-play frame sample, then **Save feedback file**. This records measurements on that phone; desktop emulation does not establish them.

No feedback is sent automatically. The game currently requires WebGL2. Actual iPhone rendering, memory pressure, battery use, sustained performance, authentication and Home Screen behavior remain unverified until tested on the physical phone.

## Saves and updates

Each device and origin keeps its own expedition. **Export save** downloads a JSON file to keep in Files; transfer it to the other device and use **Import save** there. Import validates the file and requests confirmation before replacing that device's expedition. **Recover previous save** restores the copy retained before the last import. There is no automatic cloud synchronization.

Updates download as complete, verified builds. Use **Save and update** when available outside combat; a failed save prevents the reload. Keep using the same installed icon and origin. Do not clear website data to update: that can remove both the offline copy and saves.

## What the downloadable files mean

A mobile **hosting bundle ZIP** contains the complete web runtime, assets, manifest and offline worker for the authorized HTTPS host. It is not an iPhone installer: opening that ZIP or a loose `index.html` in Files does not perform the game's HTTPS/service-worker installation.

The portable **save JSON** contains progress, not the game. A native **`.ipa`** would require a separate signed iOS build and an Apple provisioning/distribution path; this Windows web build does not produce one. Apple describes device testing through Xcode in [Developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account) and signed ad hoc distribution in [Create an ad hoc provisioning profile](https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/).

## Local build and verification

Build an isolated candidate without rewriting the PC working copy's build metadata:

```powershell
node scripts/build-mobile-release.mjs --isolated --output-root artifacts/nov10-improvements/iphone/runtime
```

The content-addressed output contains playable runtime files only; source history, credentials, tests, desktop launcher and review evidence are excluded. It is prepared for the root of the existing protected HTTPS origin. The normal PC server remains loopback-only and is not an away-from-home phone installation route.

Run browser checks serially against a frozen candidate. The existing mobile/offline tests cover touch controls, save transfer, complete-cache verification, offline reopening and repair. Record the exact candidate, command and outcomes. Chrome phone emulation and desktop Playwright WebKit must be labelled separately from physical iPhone/Safari evidence.

On 10 November, Windows WebKit phone emulation passed the programmatic flesh/crawler control, dimension, save and reload assertions, but inspection found blank game canvases in both immediate landscape captures after rotation. That unresolved visual issue means it is not a full mobile pass. See [the audit](docs/IPHONE_DELIVERY_AUDIT_2026-11-10.md). Physical Safari, hosted authentication, Home Screen installation and offline caching were not tested by that run; it also does not certify subsequent game changes.

Historical September mobile checks and later delivery repairs remain in [Alpha 1 verification](ALPHA1_VERIFICATION.md), [the installer repair report](docs/INSTALLER_THREAD_REPAIR_2026-09-27.md) and [private delivery](docs/PRIVATE_DELIVERY.md). They do not certify the current November runtime or clear its release gate.
