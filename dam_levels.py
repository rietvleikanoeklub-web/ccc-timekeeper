#!/usr/bin/env python3
"""
dam_levels.py - Fetch DWS weekly reservoir levels for one or more stations.

EDP Communications CC
Source: Department of Water and Sanitation, Weekly State of Reservoirs.
Data is UNAUDITED and updates on Mondays. Rietvlei (A2R004) is operated by
City of Tshwane and reported to DWS weekly, so there is no daily feed.

Usage:
    python3 dam_levels.py                          # default: A2R004 Rietvlei
    python3 dam_levels.py --stations A2R004 A2R009 C8R004
    python3 dam_levels.py --json                   # machine-readable to stdout
    python3 dam_levels.py --db levels.sqlite       # append to history
    python3 dam_levels.py --webhook https://...    # POST result
    python3 dam_levels.py --debug                  # dump tables when parsing fails
"""

import argparse
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone

import requests

HTML_SOURCES = [
    "https://www.dws.gov.za/hydrology/Weekly/ProvinceWeek.aspx?region={region}",
    "https://www.dws.gov.za/Hydrology/Weekly/ProvinceWeek.aspx?region={region}",
]
PDF_SOURCE = "https://www.dws.gov.za/Hydrology/Weekly/Weekly.pdf"

# Station -> province region code used by ProvinceWeek.aspx
STATION_REGION = {
    "A2R004": "G",   # Rietvlei, Hennops, City of Tshwane
    "A2R009": "G",   # Roodeplaat, Pienaars
    "A2R002": "G",   # Bon Accord, Apies
    "C1R001": "FS",  # Vaal Dam
    "C8R004": "FS",  # Saulspoort / Sol Plaatje, Liebenbergsvlei
}
DEFAULT_REGION = "G"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/pdf",
}
TIMEOUT = 30

# A weekly row looks like:  A2R004  Rietvlei  Hennops  1  G  CW  TSH  12.25  12.23  99.5  99.7  98.9
NUM = r"(-?\d+(?:[.,]\d+)?)"
ROW_RE = re.compile(
    r"\b(?P<station>[A-Z]\d[A-Z]\d{3})\b"          # station code
    r".*?"                                          # reservoir, river, WMA, prov, WSS, district
    r"(?P<fsc>\d+(?:\.\d+)?)\s+"                    # full supply capacity 10^6 m3
    r"#?(?P<vol>\d+(?:\.\d+)?)\s+"                  # water in dam 10^6 m3
    r"#?(?P<last_year>\d+(?:\.\d+)?)\s+"            # last year % full
    r"#?(?P<last_week>\d+(?:\.\d+)?)\s+"            # last week % full
    r"#?(?P<today>\d+(?:\.\d+)?)",                  # today % full
    re.DOTALL,
)
DATE_RE = re.compile(r"(20\d{2})[-/]?(\d{2})[-/]?(\d{2})")


def fetch(url):
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    r.raise_for_status()
    return r


def text_from_html(html):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text(" ", strip=True)


def text_from_pdf(content):
    import io
    import pdfplumber
    out = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            out.append(page.extract_text() or "")
    return "\n".join(out)


def parse_station(text, station):
    """Pull one station's row out of the report text."""
    window = None
    for m in re.finditer(re.escape(station), text):
        window = text[m.start(): m.start() + 400]
        break
    if not window:
        return None
    m = ROW_RE.search(window)
    if not m:
        return None
    d = m.groupdict()
    if d["station"] != station:
        return None
    return {
        "station": station,
        "fsc_mcm": float(d["fsc"]),
        "volume_mcm": float(d["vol"]),
        "pct_last_year": float(d["last_year"]),
        "pct_last_week": float(d["last_week"]),
        "pct_full": float(d["today"]),
    }


def parse_report_date(text):
    m = re.search(r"Weekly State of the Reservoirs on\s*(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return "-".join(m.groups())
    m = DATE_RE.search(text)
    return "-".join(m.groups()) if m else None


def collect(stations, debug=False):
    results, errors = [], []
    regions = {}
    for s in stations:
        regions.setdefault(STATION_REGION.get(s, DEFAULT_REGION), []).append(s)

    for region, group in regions.items():
        text, source = None, None
        for tmpl in HTML_SOURCES:
            url = tmpl.format(region=region)
            try:
                text, source = text_from_html(fetch(url).text), url
                break
            except Exception as e:
                errors.append(f"{url}: {e}")
        if text is None:
            try:
                text, source = text_from_pdf(fetch(PDF_SOURCE).content), PDF_SOURCE
            except Exception as e:
                errors.append(f"{PDF_SOURCE}: {e}")
                continue

        report_date = parse_report_date(text)
        for s in group:
            row = parse_station(text, s)
            if row is None:
                errors.append(f"{s}: not found in {source}")
                if debug:
                    idx = text.find(s)
                    print(f"--- debug {s} ---\n{text[max(0,idx-200): idx+400]}\n",
                          file=sys.stderr)
                continue
            row["report_date"] = report_date
            row["source"] = source
            row["fetched_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            results.append(row)
    return results, errors


DDL = """
CREATE TABLE IF NOT EXISTS dam_level (
    station      TEXT NOT NULL,
    report_date  TEXT NOT NULL,
    pct_full     REAL,
    volume_mcm   REAL,
    fsc_mcm      REAL,
    pct_last_week REAL,
    pct_last_year REAL,
    source       TEXT,
    fetched_utc  TEXT,
    PRIMARY KEY (station, report_date)
);
"""


def store(rows, path):
    con = sqlite3.connect(path)
    con.execute(DDL)
    new = 0
    for r in rows:
        cur = con.execute(
            "INSERT OR IGNORE INTO dam_level (station, report_date, pct_full, volume_mcm,"
            " fsc_mcm, pct_last_week, pct_last_year, source, fetched_utc)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (r["station"], r["report_date"], r["pct_full"], r["volume_mcm"], r["fsc_mcm"],
             r["pct_last_week"], r["pct_last_year"], r["source"], r["fetched_utc"]),
        )
        new += cur.rowcount
    con.commit()
    con.close()
    return new


def main():
    p = argparse.ArgumentParser(description="DWS weekly dam levels")
    p.add_argument("--stations", nargs="+", default=["A2R004"])
    p.add_argument("--json", action="store_true")
    p.add_argument("--db")
    p.add_argument("--webhook")
    p.add_argument("--debug", action="store_true")
    a = p.parse_args()

    rows, errors = collect(a.stations, debug=a.debug)

    if a.db and rows:
        n = store(rows, a.db)
        if not a.json:
            print(f"{n} new row(s) stored in {a.db}")

    if a.webhook and rows:
        try:
            requests.post(a.webhook, json={"dams": rows}, timeout=TIMEOUT)
        except Exception as e:
            errors.append(f"webhook: {e}")

    if a.json:
        print(json.dumps({"dams": rows, "errors": errors}, indent=2))
    else:
        for r in rows:
            delta = r["pct_full"] - r["pct_last_week"]
            print(f"{r['station']}  {r['report_date']}  {r['pct_full']:.1f}% full  "
                  f"({r['volume_mcm']:.2f} of {r['fsc_mcm']:.2f} Mm3)  "
                  f"week-on-week {delta:+.1f}%")
        for e in errors:
            print(f"WARN {e}", file=sys.stderr)

    return 0 if rows else 1


if __name__ == "__main__":
    sys.exit(main())
