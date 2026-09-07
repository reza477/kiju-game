# Local launch support

Double-click **Play.cmd**. It uses Node.js already on PATH, falling back to the bundled Codex runtime under your Windows user profile. It starts a hidden server if needed, verifies its application marker, and opens your default browser at `http://127.0.0.1:4178/`. It installs nothing and makes no external requests.

The server binds only to `127.0.0.1`. To use another port, set the `PORT` environment variable before launching. An unrecognized service on the chosen port will not be opened or stopped.

To run with a visible terminal, run `node server.mjs` from this folder and use Ctrl+C to stop it. The hidden launcher writes timestamped output/error logs and `server-<port>.pid` into `logs/`. Closing the browser leaves the server running for reloads. Stop its Node.js process in Task Manager when finished; the PID appears in the log and PID file. A PID file is informational and can become stale after shutdown.

## HTTP boundaries

- Only GET and HEAD are accepted. `/health` returns `{"app":"colossus-wake-local","version":1}`.
- Public files are `/index.html` (also `/`) and supported files under `/src/`, `/vendor/`, or `/assets/`. Directories are never listed. Server code, launchers, notes, logs, dotfiles, and other root files are unavailable over HTTP.
- Malformed encoding, traversal, Windows alternate data stream paths, double-encoded paths, and symlinks resolving outside the public folders are rejected.
- JavaScript, ES modules, JSON, CSS, HTML, common images, WOFF fonts, and common audio/video files have explicit MIME types. Unknown extensions are unavailable.
- Content Security Policy allows scripts, resources, and connections from this same local origin only. Inline styles are allowed for canvas sizing and dynamic UI positioning; inline scripts and external resources are blocked.
- The server has no package dependencies, telemetry, external network calls, authentication, file-writing endpoints, or publish/deploy functionality.

## Limits

This is a local static preview server. It does not provide HTTPS, compression, byte-range streaming, hot reload, or automatic updates. Keep the folder on a trusted local filesystem; it is not a hardened multi-user hosting service. The launcher's known bundled-runtime fallback path may need updating if a future Codex installation relocates its runtime.

The launchers do not install or vendor game dependencies. The game must supply its own local public files. Launch verification checks the application marker before opening the browser; it does not verify gameplay or identify individual copies of this folder.
