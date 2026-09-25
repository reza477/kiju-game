# Playing Colossus Wake

[Project overview](../README.md) · [Mobile playtest status](../MOBILE_PLAYTEST.md)

## Launch

On the owner's Windows PC, double-click **Colossus Wake - Kaiju Game** on the desktop or **Colossus Wake.exe** in the game folder. **Play.cmd** is the fallback. The launcher verifies this folder's game and opens a local app window at `http://127.0.0.1:4178`. It preserves the normal browser profile and does not replace an unrelated service using that port. See [desktop launcher details](../DESKTOP_APP.md) and [server support](../SERVER-NOTES.md).

For manual launch, run `node server.mjs` in the game folder, then open [127.0.0.1:4178](http://127.0.0.1:4178). Chrome or Edge with WebGL2 and hardware acceleration is recommended. Runtime assets and the renderer are included locally. A fresh checkout requires an available Node.js runtime; the owner's launcher can also use the existing bundled Codex runtime.

## First expedition

1. Choose **Thornbound** (kaiju), **Commonwealth** (crawler), or **Saffron Courts** (airship), then choose one of its two carrier versions. The title screen previews a developed city; a new expedition starts with three districts.
2. Build a **Timber guild** from the bottom bar. Gothic cities use **Add above castle**; crawler and airship cities use an empty deck plot or numbered district.
3. Open **Resource destinations**, choose **The Sunken Grove**, and wait for arrival. Crews gather wood automatically while stopped near the deposit.
4. Add **Hanging gardens** for food, an **Ironworks** for faster iron collection near ruins, and **Dwellings** for population growth. Select a built district to upgrade it, up to level 3.
5. Every Gothic district becomes a new storey directly above the previous top. Upgrading a lower storey lifts everything above it. **Reinforce castle harness** raises capacity from seven to twenty storeys for 90 wood, 65 iron and 12 seconds; it does not create empty floors. **Inspect castle storey** selects a district for inspection or upgrade in Streets view.
6. Build **Gun batteries** and **Bulwarks** before battle. Choose each battery's facing. Gothic batteries fire through their storey's outward portal; horizontal cities can use perimeter plots for clearer firing lines. Select a rival on the minimap, approach, then engage. Rivals only attack after you choose to engage.
7. Repair between battles. Defeat all five rivals to secure the region. New expeditions include your selected carrier version and the five other versions as opponents; existing saves retain their original opponents.

The cyborg castle has half-height storeys and crown relative to its attachment deck, with its footprint, robot, body weapons and residents retaining their scale. The flesh titan keeps its full-height castle. Both continue to build upward in existing saves.

## Controls

| Control | Action |
| --- | --- |
| WASD / Arrow keys | Move the city relative to the camera |
| Click ground | Set a travel destination |
| Click minimap marker | Select a resource or rival |
| Drag | Orbit the camera |
| Mouse wheel | Zoom |
| 1 / 2 | City view / world map |
| 3 | Titan view, for kaiju carriers |
| 4 | Streets view, close to citizens |
| P | Pause / resume |
| Space | Fire in battle |
| E | Special ability |
| Escape | Cancel a building selection / close a dialog |

Touch layouts have movement buttons, tap targets, one-finger orbit and two-finger pinch zoom. Phone panels use **City**, **Build**, and **Map** controls; landscape is recommended. Touch devices initially use Performance detail. Physical Apple-device validation remains pending; see [mobile playtesting](../MOBILE_PLAYTEST.md).

## Combat and construction

Battle buttons provide **Approach**, **Hold position**, and **Keep distance**. Weapons auto-fire in range by default; this can be switched off. A punch starts pursuit, while Hold position remains available. Melee spacing follows the target hull, including the drill crawler's longer nose. Titan rush closes a gap of up to 70 metres into striking range. Crawlers have more hull and mid-range cannons. Airships fire farther and use Missile storm while keeping their distance.

Completed batteries add damage when the target is in range and within their firing arc. Cannons sweep 150 degrees and can be blocked by buildings, castle masonry or the titan's body. Airship missiles sweep 240 degrees and arc over buildings. Castle guns use open ports with clearance for their barrels. Select a battery between battles to change its facing. Weapons track, recoil and launch projectiles from their actual muzzles; damage lands with visible contact or impact.

Cities support twenty district positions: occupied vertical storeys for Gothic castles and horizontal plots for crawlers and airships. Construction takes time, districts have three upgrade levels, and population depends on food and housing. Upgrading a district retains its existing benefits until completion. Deposits are finite. Ground carriers follow terrain, leave temporary tracks or footprints, and crush ambient trees and rocks; resource sites are protected. Scenery damage persists separately for expeditions and battles, while temporary ground marks are capped at 400.

## Camera, graphics and sound

**Detail** cycles High, Balanced and Performance. High uses sharper shadows, contact shading, bloom and higher resolution; Performance reduces resolution and disables dynamic shadows and postprocessing. **Light** previews day, dusk and night without changing resource production or combat.

**Camera: steady** disables cinematic travel and battle motion. System reduced-motion preferences select it initially, and the choice is saved. Manual orbit takes precedence; close building and Streets views stay steady. Environmental animation freezes when paused.

Sound begins after **Begin expedition** or **Continue**. Each carrier has its own engine, servo, breathing or propeller sound, supported by local music, construction and combat effects, wildlife, wind and water. **Sound** toggles mute. **Audio mix** saves overall, music, ambience and effects levels on the device. Pausing or hiding the game silences the world; a brief result cue may finish over a paused victory/defeat dialog. No audio is streamed.

## Saves and device transfer

The browser stores one expedition under `colossus-wake-save-v1`. Autosave runs every 30 seconds and when the game is hidden or closed; **Save** writes manually. Returning to the title preserves progress. Starting a new expedition replaces it after the next save. Different browsers and origins have separate storage, and clearing site data deletes the save.

In **Play on your devices & saves**, **Export save** creates a portable JSON file. **Import save** validates a file and asks before replacing the current expedition. **Recover previous save** offers the save retained before the last import. Keep an exported backup, particularly before clearing storage or changing devices. Transfer is manual; there is no cloud synchronization.

**Copy feedback** and **Save feedback file** include notes, build ID, browser, screen size and graphics settings. Nothing is submitted automatically. Detailed offline installation and repair instructions are in [the mobile guide](../MOBILE_PLAYTEST.md), for use after private hosting is configured and approved. There is currently no hosted mobile link.

## Current scope

This is a browser-based, single-player PC prototype with one region and five rivals. Citizens animate, circulate and work on supported floors, but have no individual inventories or complete building navigation and do not travel between floors. Battles use simplified horizontal movement; hills do not block shots and airship altitude is visual. Destruction affects ambient scenery, not resource deposits or individual city buildings. Variants share their faction's economy and base combat statistics.

Multiplayer, diplomacy, a tech tree, procedural campaigns and offline time progression are not implemented. Native iOS distribution is not part of this build; it would require macOS/Xcode and real-device testing. See [planned validation and improvement areas](ROADMAP.md).
