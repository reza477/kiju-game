# Open Colossus Wake

Double-click **Colossus Wake - Kaiju Game** on the Windows Desktop. The same shortcut is available in the Start menu. The executable is `Colossus Wake.exe` in this game folder.

The launcher starts this folder's game server automatically and opens Colossus Wake in its own maximized game window using the existing Edge or Chrome installation. It does not open the Codex browser or depend on Codex remaining open. No engine editor, downloads, administrator access or manual terminal command is needed.

Keep the executable beside `Play.ps1` and `server.mjs`; use the shortcut on the Desktop. If the entire game folder is moved again, run `desktop/Build-DesktopApp.ps1 -CreateShortcuts` from its new location to rebuild the shortcut targets.

The app retains `http://127.0.0.1:4178/` and the normal default-browser profile. It does not create a guest/private profile or change the game's save code. Existing saves in that browser/origin remain available through Continue. Saves held by a different browser, including the Codex browser, remain there and are not silently copied or overwritten.

The launcher checks the game's health signature and this folder's identity before opening. If another app or an older game copy occupies port 4178, it shows an error and opens nothing. It never terminates that other app or switches to a different save origin. The background game server stays available for reopening; after a PC restart, the next click starts it again.

## On a Mac

Double-click **Play.command** in this game folder. Terminal opens briefly, the launcher starts this folder's game server if it is not already running, and the game opens at `http://127.0.0.1:4178/` in its own Chrome window. Without Chrome it opens in Edge or the default browser. Node.js must already be installed; the launcher installs nothing.

The launcher follows the same rules as the Windows one. It checks the server's health signature and this folder's identity before opening anything. If another app or an older game copy holds port 4178 it says so and stops; it never ends that other app or moves to a different address, because saves belong to the browser and address they were made in. The server keeps running in the background so the game reopens quickly. `./Play.command --stop` in Terminal stops the server this launcher started, and `./Play.command --server-only` starts it without opening a window. Server output goes to the ignored `logs/` folder.

The first time, macOS may ask whether Terminal may run the file. If double-clicking does nothing, run `chmod +x Play.command` once in Terminal from this folder.

## Local verification, September 12, 2026

- Compiled with the existing Windows .NET Framework compiler; the executable uses the GUI subsystem and launches its PowerShell helper without a console window.
- Desktop and Start-menu shortcuts resolve to this folder's executable, including the spaces in the path.
- Cold launch from the actual Desktop shortcut started the correct server and opened an Edge app window titled **Colossus Wake**. Browser inspection confirmed the 3D game and faction-selection screen.
- Closing the game window and launching again reused the same verified server. A separate server-only launch check also reused its process.
- Six local integration fixtures rejected unrelated HTML, an older game checkout, ambiguous legacy health, a missing health endpoint, a server error and a redirect without opening a window or stopping the unrelated listener.
- The game renderer, simulation, controls and save format are unchanged. No full art-review cycle was needed for this launcher-only change.

The icon reproduces the existing `assets/icon.svg` locally with Windows drawing primitives. Launcher source is `desktop/Launcher.cs`; the reproducible build and shortcut script is `desktop/Build-DesktopApp.ps1`. Nothing was downloaded or published. Original launcher/server files are preserved at Git tag `checkpoint/before-desktop-launcher-20260912`.
