# Water round 1 — review-origin correction

Author: `/root/carrier_art_critic`, the original reviewer. This addendum corrects the evidence/provenance statement in `2026-10-04-water-round-01.md`; it does not change the original screenshots, visual findings or scores.

The original review incorrectly stated: **"No production/user-origin save was used."** That was not established. The browser tab was new, but it used the existing Chrome browser ID `1` and origin `http://127.0.0.1:4219/`. A new tab does not isolate localStorage. The critic did not create a separate profile/context or back up that origin before beginning round 1.

Actual round-1 actions on that origin were:

1. Open the candidate at port 4219 in a new tab.
2. Click Begin expedition and confirm the visible warning that an existing saved expedition would be replaced; begin a fresh cyborg expedition.
3. Travel using the minimap, open the menu, and choose Save & return to title.
4. Choose the standard armored crawler, click Begin expedition, and confirm replacement again.
5. Travel to the river, inspect and capture water, temporarily emulate a portrait viewport, restore the viewport, then close the tab.

The round-2 visit to port 4219 only continued the resulting crawler save and captured one normal view before the parent identified the origin concern. The critic then preserved current localStorage read-only and closed the tab. There is no critic-created backup of the original pre-round-1 save, and this addendum does not claim it has been recovered.

Post-review storage evidence: `artifacts/critic-round-02/water/4219-storage-after-round1.json`. It is explicitly labelled as the state after the replacements, not an original-save backup. Recovery, if possible from the parent's earlier evidence, is a separate task owned by the parent. The critic will use the dedicated port 4215 for further review and will not open or alter port 4219 again.

The round-1 build and visual evidence remain the reviewed candidate: build `a272f0a3f88b68a3bbf3`, QA-supplied runtime/assets fingerprint `93007269adb014e63355c6046dc9ebd9d7b465a6381444557aab1c806fcbdf94`. The art result remains **7.1 overall / 6.6 water-specific, FAILED**. The provenance error must be included wherever the original report is handed over.
