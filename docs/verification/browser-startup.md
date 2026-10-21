# R155 browser startup evidence

Final follow-up: six focused diagnostic/CLI cases pass on Windows and actual
Linux Docker Node24 (pinned91acba91b842bec0bf7ea6f5e09c644c7ccad72c4996ed9616d861d1c7cd60d4).
R156 real CLI regression first reproduced discarded assertion stdout; four
handoff failure branches now retain both streams. R157 reproduced a corrupted
first PATH entry on Linux; Go path prefix is Windows-only/platform-delimited.
An oversized protocol response is terminal so its reason survives the final
timeout. Full final1491contracts and strictlint0 pass. Hume accepted final source
and independently passed sixWindows tests plus extra size/timeout checks.
One initial normal handoff failed at contracts without detail; a direct full
rerun passed. That unidentified failure is not assigned a guessed cause.

CI-BROWSER-001a / BUG-016 adds diagnostics for the existing probe; Linux root
cause remains unconfirmed until the next actual CI run. No launch/sandbox flag
has changed. Previous39565339360 passed SQL/race/build/forwarding but failed
before browser UI assertions with only a DevTools timeout.

The probe now records its selected executable, drains a4096byte stderr tail,
reports exit/signal/spawn error, elapsed time and last HTTP/error code. Every
fetch and the overall endpoint attempt are bounded; replies cap at64KiB.
No environment variables, browser user data or arbitrary HTTP error bodies are
printed. The test browser uses a disposable local profile and synthetic API
fixtures. Cleanup checks PID/exit/signal and releases diagnostic listeners.

Five committed regressions cover actual process stderr/exit, missing executable,
stalled HTTP, method-preserving successful JSON and bounded oversize reason.
Before the fix the first three failed, including an unhandled ENOENT and an
unbounded request. They now pass. Full Node contracts initially1489pass;
oversize regression adds one, final count recorded in coordination.

Local production React probe: desktop and phone each passed seven existing
browser assertions using .next-forwarding-probe build (frontend unchanged).
Strict lint0, with the existing baseline-browser-mapping age notice only.
Hume independently passed four original regressions plus temporary stalled-body,
oversize, malformed JSON, HTTP403 and signalled-child checks; source accepted
for evidence collection. Follow-up fixed bounded error-code specificity and
added the committed oversize regression. No reviewer live calls or edits.

Next: inspect hosted startup evidence on the diagnostic commit. If process exits,
use bounded stderr/code to select a fix. If alive but target creation fails,
compare bounded /json/version with /json/new. Do not infer sandbox failure or
change sandbox configuration without evidence. UI work follows verified CI.
