import { readFile } from 'node:fs/promises';
const record = JSON.parse(await readFile('artifacts/delivery/build.json', 'utf8'));
process.env.GAME_RELEASE_DIR = record.runtime;
process.env.GAME_NEXT_RELEASE_DIR = record.fixture.runtime;
await import('../tests/release-fetch-browser.mjs');
await import('../tests/delivery-browser.mjs');
await import('../tests/host-credentials-browser.mjs');
