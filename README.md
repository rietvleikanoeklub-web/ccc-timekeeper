# CCC Timekeeper — prototype

Single-file PWA for Centurion Canoe Club Thursday time trials. Mirrors the CCC Bar Tab
pattern (one `index.html`, deploy to GitHub Pages, cloud sync via Google Apps Script + Drive JSON).

**Status:** v0.5.0. **LIVE:** https://rietvleikanoeklub-web.github.io/ccc-timekeeper/
Installable PWA (offline app shell). Works offline (localStorage) and syncs to Google Drive once the
Apps Script backend below is connected.

**Remaining manual step:** deploy the Apps Script backend (needs the rietvleikanoeklub@gmail.com login)
and paste its /exec URL into the app's Members → Cloud sync. Until then the app is fully usable but
single-device (local only).

## Deploy (mirrors the Bar Tab)

### Frontend — DONE
Repo `rietvleikanoeklub-web/ccc-timekeeper`, GitHub Pages on `main`/root →
https://rietvleikanoeklub-web.github.io/ccc-timekeeper/ . Redeploy = commit + push `index.html`.

### 1. Backend — Google Apps Script (still to do)
1. Sign in to script.google.com as **rietvleikanoeklub@gmail.com** (owns the Bar Tab Drive data).
2. New project → paste `CCC_TT_AppsScript.gs`. (Optional: set `SHARED_TOKEN`.)
3. Deploy → New deployment → **Web app**, Execute as **Me**, Access **Anyone** → copy the `/exec` URL.
4. First call auto-creates `CCC_TT_Data.json` in Drive; `?action=members` reads the Bar Tab file.

### 2. Frontend — GitHub Pages
1. New repo **`rietvleikanoeklub-web/ccc-timekeeper`** (push with the org-write GitHub account, NOT EDP business).
2. Commit `index.html` to the repo root → Settings → Pages → deploy from `main` / root.
3. Live at `https://rietvleikanoeklub-web.github.io/ccc-timekeeper/`.

### 3. Connect
Open the app → **Members → Cloud sync** → paste the `/exec` URL → **Save & connect** →
**Pull members from Bar Tab**. Done. Every device that opens the app and pastes the same URL stays in sync.

## Run locally
```
python3 -m http.server 8765 --directory .
# open http://localhost:8765
```

## What works
- **Tonight** — auto-computes the next Thursday's season, start time (17:00 winter / 17:15 summer),
  and distance/laps; shows assigned timekeeper + sunset; builds a WhatsApp announcement.
- **Roster** — 2026 schedule preloaded; per-person reminder + "request swap" via WhatsApp; reassign.
- **Capture** — live **lap timer**: one screen, race clock, colour-coded LONG/SHORT tags. Tap a boat
  each time it crosses to record a lap split; finished boats sink to a Finished section. "Use last
  week's list" suggestion to start a race fast. Per-night editable lap counts (Long/Short).
  **Crew boats**: K2/S2 = 2 paddlers, K3/S3 = 3 (the Add-boat form shows N paddler pickers by boat
  type); standings credit every crew member with the boat's position points. Per-class filter (K1/K2/…).
  Data model: `S.entries` = {id, trialId, memberIds[], boat, course, splits[], lastTap}.
- **Standings** — combined league (Summer / Winter / Triple S); 10-9-…-1 scoring, +3 season-best,
  +10 per 10 trials; optional per-boat-class filter (future-proofing).
- **Members** — editable; import from CCC Bar Tab JSON (paste/upload), matched by name.

## Verified
- JS syntax-checked (JavaScriptCore). Tonight/Roster render correctly for 2026-06-25 (John Cato, 17:00, Winter ~5km).
- Scoring engine unit-checked: position points, season-best +3 bonus, tie-break by best time.

## Done
- ✅ **Cloud sync** — `CCC_TT_AppsScript.gs` (GET data/members/ping, POST save + daily backup).
  Client does last-write-wins by `updatedAt`, debounced push, startup pull. POSTs use `text/plain`
  to avoid a CORS preflight Apps Script can't answer.
- ✅ **Live member feed** — `Pull members from Bar Tab` reads the Bar Tab's `CCC_BarTab_Data.json`
  server-side and merges by name (adds new, fills missing phone/reg).

## Next steps (not yet built)
0. **Two-device (collaborative) timekeeping** — requires switching cloud sync from whole-doc LWW to
   per-entry merge (each boat's laps sync independently), a shared race start time, and a few-second
   auto-refresh while a race is running. One keeper takes Long, the other Short. NOT built yet.
   (Two people on ONE device already works: one calls, one taps.)
1. **WhatsApp sending** — prototype uses share-sheet / `wa.me` links (manual send). For automated
   group posts choose: WhatsApp Business Cloud API, Twilio, or reuse the Bar Tab **Telegram** bot.
2. **Scheduled reminders** — Apps Script time-driven trigger to auto-DM the rostered timekeeper
   a few days before their duty.
3. **Triple S separate-league + Mixed-K2 team scoring** (standard league done).
4. **Strava backup** — optional per-paddler time verification + season-best (PR) auto-detect.

## Sync model note
Whole-document **last-write-wins by `updatedAt`** — simple and predictable for a club where one
device captures a given night. If two devices edit the *same* document concurrently, the later
save wins the whole doc. If concurrent multi-device editing becomes common, move to per-record
timestamps / tombstones.

## Open product decisions
- Money pool (R20 lucky draw) tracking — include?
- Exact Summer long-vs-short scheduling rule (who/when decides 10km vs 5km).
- Triple S separate-league scoring + Mixed-K2 team league (designed in rules digest, not yet coded).
