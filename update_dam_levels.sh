#!/usr/bin/env bash
# Refresh dam_levels.json from the DWS weekly report and push — only if the reading changed.
#
# IMPORTANT: DWS geo-blocks non-SA / cloud IPs (GitHub Actions and AWS eu-west-1 both get HTTP 403),
# so this must run from a South-African connection. On a Mac, a launchd agent fires it Mon/Tue and
# catches up on the next wake. To move it to a SA-based always-on host, install the same script + a
# cron line there (see README).
set -uo pipefail
REPO="${CCC_REPO:-/Users/eltondupreez/Claude/CCC Time keeping/ccc-timekeeper}"
DATA="${CCC_DAM_DATA:-$HOME/.ccc-dam}"
VENV="$DATA/venv"; LOG="$DATA/dam.log"; STATIONS="${CCC_DAM_STATIONS:-A2R004}"
mkdir -p "$DATA"; exec >>"$LOG" 2>&1
echo "=== $(date '+%F %T') dam refresh ==="

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV" && "$VENV/bin/pip" -q install --upgrade pip \
    && "$VENV/bin/pip" -q install beautifulsoup4 lxml pdfplumber requests \
    || { echo "venv/deps setup failed"; exit 1; }
fi
cd "$REPO" || { echo "repo not found: $REPO"; exit 1; }

NEW="$(mktemp)"
"$VENV/bin/python" dam_levels.py --stations $STATIONS --db "$DATA/dam_history.sqlite" --json > "$NEW" 2>>"$LOG"
if ! "$VENV/bin/python" -c "import json,sys;sys.exit(0 if json.load(open('$NEW')).get('dams') else 1)"; then
  echo "no rows — keeping last good file. scraper errors:"
  "$VENV/bin/python" -c "import json;print(json.load(open('$NEW')).get('errors'))" 2>/dev/null
  rm -f "$NEW"; exit 0
fi

CH="$("$VENV/bin/python" - "$NEW" <<'PY'
import json, sys, os
new = json.load(open(sys.argv[1]))
old = json.load(open('dam_levels.json')) if os.path.exists('dam_levels.json') else {'dams': []}
k = lambda d: [(x.get('station'), x.get('report_date'), x.get('pct_full'), x.get('volume_mcm'),
               x.get('pct_last_week'), x.get('pct_last_year'), x.get('fsc_mcm')) for x in d.get('dams', [])]
if k(new) != k(old):
    json.dump(new, open('dam_levels.json', 'w'), indent=2); open('dam_levels.json', 'a').write('\n'); print('changed')
else:
    print('same')
PY
)"
rm -f "$NEW"
[ "$CH" = "changed" ] || { echo "unchanged — no commit"; exit 0; }

git pull --rebase --autostash -q origin main || true
git add dam_levels.json && git commit -q -m "dam level $(date +%F) (auto)" && git push -q origin main \
  && echo "pushed update" || echo "git push failed"
