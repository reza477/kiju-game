import {BUILD_ID} from './build-info.js';
import {getOfflineStatus, refreshOfflineStatus, prepareOffline, checkForUpdate, applyUpdate} from './offline.js';
import {serialize, SAVE_KEY} from './simulation.js';
import {readTransfer, writeTransfer, storeTransferredSave, IMPORT_BACKUP_KEY, MAX_SAVE_BYTES} from './save-transfer.js';
import {createFrameSample, formatFrameSample} from './playtest-sample.js';

export function createPlaytestTools({showDialog, closeDialog, getGame, loadGame, save, getQuality, getPlayState, getRenderInfo, toast}) {
  const $ = id => document.getElementById(id);
  let pending = null, busy = false, generation = 0, readId = 0;
  const sampler = createFrameSample();
  let statusAt = -Infinity, metadataKey = '';
  const eligibility = () => ({...getPlayState(), hidden: document.hidden});
  function samplingMetadata() {
    const buffer = getRenderInfo();
    return {build: BUILD_ID, quality: getQuality(), viewport: {width: innerWidth, height: innerHeight}, renderBuffer: {width: buffer.width, height: buffer.height}, devicePixelRatio,
      browserReportedUserAgent: navigator.userAgent, displayMode: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true ? 'standalone' : 'browser'};
  }
  function recordMetadata() {
    const metadata = samplingMetadata(), key = JSON.stringify(metadata);
    if (key !== metadataKey) { sampler.noteMetadata(metadata); metadataKey = key; }
  }
  function updateSampleStatus() {
    const status = $('sample-status'); if (!status) return;
    const sample = sampler.progress();
    const reason = {hidden: 'page hidden', paused: 'game paused or menu open', notStarted: 'expedition not started'}[sample.pauseReason];
    status.textContent = sample.status === 'idle' ? 'No sample yet. Start a sample, then return to the game.' : `${sample.status === 'running' ? reason ? `Waiting: ${reason}` : 'Sampling active play' : sample.status === 'complete' ? 'Sample complete' : 'Sample stopped'} · ${(sample.activeMs / 1000).toFixed(1)} / 120 active seconds · ${sample.count} intervals${sample.stopReason ? ` · ${sample.stopReason}` : ''}.`;
    $('sample-start').disabled = sampler.active || !getPlayState().started;
    $('sample-stop').disabled = !sampler.active;
    $('sample-reset').disabled = sample.status === 'idle';
  }
  function frame(now) {
    if (!sampler.active) return;
    recordMetadata(); sampler.frame(now, eligibility());
    if (now - statusAt > 500 || !sampler.active) { updateSampleStatus(); statusAt = now; }
  }
  document.addEventListener('visibilitychange', () => {
    if (!sampler.active) return;
    sampler.setEligibility(performance.now(), eligibility()); updateSampleStatus();
  });
  window.addEventListener('pagehide', () => {
    if (sampler.active) sampler.setEligibility(performance.now(), {...eligibility(), hidden: true});
  });
  window.addEventListener('pageshow', () => {
    if (sampler.active) sampler.setEligibility(performance.now(), eligibility());
  });
  $('dialog').addEventListener('close', () => { if (!$('dialog').open) { generation++; pending = null; } });
  function download(text, name, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function updateStatus(status = getOfflineStatus()) {
    if (!$('offline-status')) return;
    $('offline-status').textContent = status.message;
    for (const id of ['offline-prepare', 'offline-check', 'offline-apply']) $(id).disabled = busy;
    $('offline-apply').classList.toggle('hidden', !status.canApplyUpdate);
  }
  async function offlineAction(action) {
    if (busy) return;
    busy = true; updateStatus();
    try { updateStatus(await action({onStatus: updateStatus})); }
    catch (error) { if ($('offline-status')) $('offline-status').textContent = error.message; }
    finally { busy = false; updateStatus(); }
  }
  function exportSave() {
    const game = getGame();
    if (!game) return toast('Begin or continue an expedition before exporting.');
    download(writeTransfer(game, BUILD_ID), `Colossus-Wake-${new Date().toISOString().slice(0,10)}.json`);
    toast('Save file prepared. Keep it in Files to transfer or back up your expedition.');
  }
  function stageImport(text) {
    pending = readTransfer(text);
    $('import-confirm').classList.remove('hidden');
    $('import-description').textContent = `Ready to load ${pending.variant}, day ${Math.floor(pending.time / 90) + 1}. This replaces the expedition on this device. A recovery copy of the current save will be kept here.`;
  }
  function open() {
    const panelGeneration = ++generation;
    const currentPanel = () => panelGeneration === generation && !!$('import-save') && $('dialog').open;
    pending = null;
    showDialog(`<span class="eyebrow">PLAY ON YOUR DEVICES</span><h2>Your expedition, to go.</h2>
      <p class="build-label">Build <strong id="playtest-build"></strong> · <span id="playtest-quality"></span></p>
      <nav class="playtest-shortcuts" aria-label="Playtest sections"><button data-playtest-section="playtest-offline">Offline play</button><button data-playtest-section="playtest-saves">Save transfer</button><button data-playtest-section="playtest-feedback">Play sample</button></nav>
      <section id="playtest-offline" class="playtest-section"><h3>iPad & iPhone</h3>
      <p>Open the game link in Safari. Tap Share → Add to Home Screen → Add. If shown, turn on Open as Web App. Launch the new game icon, then prepare offline play below while connected.</p>
      <p>Use two fingers to zoom, one finger to orbit, and the arrow pad to move. Landscape gives the world more room.</p>
      <p id="offline-status" role="status"></p><div class="playtest-actions"><button id="offline-prepare">Prepare offline play</button><button id="offline-check">Check for update</button><button id="offline-apply" class="hidden">Save before update</button></div>
      <p class="playtest-note">Once ready, this device can play without your PC. Device storage can be cleared by the system; keep a save backup. The PC working copy needs a hosted release before it can be installed on another device.</p></section>
      <section id="playtest-saves" class="playtest-section"><h3>Move or back up your save</h3><p>Each device keeps its own progress. Export a save to Files, transfer it to another device, then import it there. Saves do not sync automatically.</p>
      <div class="playtest-actions"><button id="export-save">Export save</button><label class="file-button">Import save<input id="import-save" type="file" accept=".json,application/json" /></label><button id="recover-import">Recover previous save</button></div>
      <div id="import-confirm" class="hidden"><p id="import-description"></p><button id="confirm-import" class="primary">Replace & load expedition</button><button id="cancel-import">Cancel</button></div><p id="import-status" role="status"></p></section>
      <section id="playtest-feedback" class="playtest-section"><h3>Playtest feedback</h3><p>Describe what happened, then copy this report into our chat. Nothing is sent automatically.</p>
      <h4>Optional 120-second play sample</h4><p>Begin an expedition first. Start a sample here, then return to the game. Hidden pages, paused play and menus are excluded. Stop or reset here at any time; results stay only in this tab until you copy or save feedback.</p>
      <p id="sample-status" role="status"></p><div class="playtest-actions"><button id="sample-start">Start 120-second sample</button><button id="sample-stop">Stop sample</button><button id="sample-reset">Reset sample</button></div>
      <p class="playtest-note">These are browser frame-scheduling observations, not GPU timings, native presented FPS or proof of sustained performance. Compare the existing detail presets manually, resetting before each sample.</p>
      <label for="feedback-notes">What worked, or what went wrong?</label><textarea id="feedback-notes" rows="3" placeholder="For example: the game slowed down when two cities fought…"></textarea><div class="playtest-actions"><button id="copy-feedback">Copy feedback</button><button id="download-feedback">Save feedback file</button></div><textarea id="feedback-report" rows="5" readonly class="hidden" aria-label="Feedback report to copy"></textarea></section>
      <button class="primary" data-dialog-action="close">Back to game</button>`);
    document.querySelectorAll('[data-playtest-section]').forEach(button => { button.onclick = () => $(button.dataset.playtestSection).scrollIntoView({block: 'start'}); });
    $('playtest-build').textContent = BUILD_ID;
    $('playtest-quality').textContent = `${getQuality()} detail`;
    updateSampleStatus();
    $('sample-start').onclick = () => { if (!getPlayState().started || sampler.active) return; const metadata = samplingMetadata(); sampler.start(performance.now(), eligibility(), metadata); metadataKey = JSON.stringify(metadata); updateSampleStatus(); toast('Sample armed. Return to the game to record up to 120 seconds of active play.'); };
    $('sample-stop').onclick = () => { recordMetadata(); sampler.stop(performance.now(), eligibility()); updateSampleStatus(); };
    $('sample-reset').onclick = () => { sampler.reset(); metadataKey = ''; updateSampleStatus(); };
    updateStatus(); void refreshOfflineStatus({onStatus: updateStatus}).then(updateStatus).catch(() => {});
    $('offline-prepare').onclick = () => offlineAction(prepareOffline);
    $('offline-check').onclick = () => offlineAction(checkForUpdate);
    $('offline-apply').onclick = () => { if (getGame() && !save()) return; void offlineAction(applyUpdate); };
    $('export-save').onclick = exportSave;
    let backup = null; try { backup = localStorage.getItem(IMPORT_BACKUP_KEY); } catch {}
    $('recover-import').disabled = !backup;
    $('recover-import').onclick = () => { try { stageImport(backup); } catch (e) { $('import-status').textContent = e.message; } };
    $('import-save').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      const thisRead = ++readId;
      pending = null; $('import-confirm').classList.add('hidden'); $('import-status').textContent = '';
      try { if (file.size > MAX_SAVE_BYTES) throw new Error('Choose a game save smaller than 1 MB.'); const text = await file.text(); if (currentPanel() && thisRead === readId) stageImport(text); }
      catch (error) { if (currentPanel() && thisRead === readId) $('import-status').textContent = error.message; }
      if (currentPanel() && thisRead === readId) e.target.value = '';
    };
    $('cancel-import').onclick = () => { pending = null; $('import-confirm').classList.add('hidden'); };
    $('confirm-import').onclick = () => {
      if (!pending) return;
      let originalRaw, stored = false;
      try {
        originalRaw = localStorage.getItem(SAVE_KEY);
        const current = getGame();
        const imported = storeTransferredSave(localStorage, pending, current ? serialize(current) : null);
        stored = true; loadGame(imported); pending = null; closeDialog(); toast('Imported expedition loaded. The previous save is available under Recover previous save.');
      } catch {
        if (!stored) { $('import-status').textContent = 'Could not store the imported save. Your current expedition is unchanged. Export a backup and check available device storage.'; return; }
        try { if (originalRaw === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, originalRaw); } catch {}
        $('import-status').textContent = 'The imported expedition could not open. Reload the game to recover your saved expedition; a recovery copy is also available here.';
      }
    };
    const report = () => {
      if (sampler.active) { recordMetadata(); sampler.setEligibility(performance.now(), eligibility()); }
      const metadata = samplingMetadata();
      return `Colossus Wake playtest\nBuild: ${metadata.build}\nDetail: ${metadata.quality}\nViewport: ${metadata.viewport.width} × ${metadata.viewport.height} CSS pixels\nRender buffer: ${metadata.renderBuffer.width} × ${metadata.renderBuffer.height} pixels\nDevice pixel ratio: ${metadata.devicePixelRatio}\nBrowser-reported user agent: ${metadata.browserReportedUserAgent}\nDisplay mode: ${metadata.displayMode}\nOffline status: ${getOfflineStatus().message}\n\n${formatFrameSample(sampler.snapshot())}\n\nFeedback:\n${$('feedback-notes').value.trim() || '(Add your notes here.)'}`;
    };
    $('copy-feedback').onclick = async () => {
      const text = report();
      try { await navigator.clipboard.writeText(text); toast('Feedback copied. Paste it into our chat.'); }
      catch { if (currentPanel()) { $('feedback-report').value = text; $('feedback-report').classList.remove('hidden'); $('feedback-report').focus(); $('feedback-report').select(); toast('Select and copy the report below.'); } }
    };
    $('download-feedback').onclick = () => download(report(), `Colossus-Wake-feedback-${BUILD_ID}.txt`, 'text/plain');
  }
  return {open, frame};
}
