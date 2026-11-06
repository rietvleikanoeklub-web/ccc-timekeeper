"use strict";
/* Date, course and historical-series checks for the 2026/27 poster.
   Run: node tests/series2026.test.js
   No network. No cloud. No paddler data. */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const TT = require("../tt-series.js");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const html = read("index.html");
const sw = read("sw.js");
const gs = read("CCC_TT_AppsScript.gs");
const results = read("results.html");

function day(iso) { return new Date(iso + "T12:00:00").getDay(); }

const expected = [
  "2026-11-12 standard",
  "2026-11-19 standard",
  "2026-11-26 standard",
  "2026-12-03 standard",
  "2027-01-14 standard",
  "2027-01-21 standard",
  "2027-01-28 standard",
  "2027-02-04 dry-run",
  "2027-02-11 final"
];
assert.deepStrictEqual(TT.nights().map((n) => n.date + " " + n.kind), expected);
TT.nights().forEach((n) => assert.strictEqual(day(n.date), 4, n.date + " must be Thursday"));

const off = [
  "2026-11-05",
  "2026-12-10",
  "2026-12-17",
  "2026-12-24",
  "2026-12-31",
  "2027-01-07"
];
assert.deepStrictEqual(TT.offWeekThursdays(), off);
off.forEach((iso) => {
  assert.strictEqual(day(iso), 4, iso);
  assert.strictEqual(TT.specFor(iso), null, iso);
  assert.strictEqual(TT.seasonFor(iso), "Summer", iso + " must not be tagged SSS");
  assert.ok(TT.offWeekReason(iso).length > 10, iso);
});

// Holiday weekdays next to the off Thursdays (poster season, Africa/Johannesburg calendar dates).
assert.strictEqual(day("2026-12-16"), 3, "Day of Reconciliation 2026 is a Wednesday");
assert.strictEqual(day("2026-12-25"), 5, "Christmas 2026 is a Friday");
assert.strictEqual(day("2026-12-26"), 6, "Day of Goodwill 2026 is a Saturday");
assert.strictEqual(day("2027-01-01"), 5, "New Year 2027 is a Friday");
assert.match(TT.offWeekReason("2026-12-17"), /Reconciliation/);
assert.match(TT.offWeekReason("2026-12-24"), /Christmas/);
assert.match(TT.offWeekReason("2026-12-31"), /New Year/);

// Exact dates supersede the generic 5 Nov–4 Feb rule inside this season only.
assert.strictEqual(TT.seasonFor("2026-11-04"), "Summer");
assert.strictEqual(TT.seasonFor("2026-11-05"), "Summer");
assert.strictEqual(TT.seasonFor("2026-11-12"), TT.SEASON);
assert.strictEqual(TT.specFor("2026-11-12").kind, "standard");
assert.strictEqual(TT.seasonFor("2026-12-03"), TT.SEASON);
assert.strictEqual(TT.seasonFor("2027-01-14"), TT.SEASON);
assert.strictEqual(TT.seasonFor("2027-01-07"), "Summer");
assert.strictEqual(TT.seasonFor("2027-02-04"), TT.SEASON);
assert.strictEqual(TT.specFor("2027-02-04").kind, "dry-run");
assert.strictEqual(TT.seasonFor("2027-02-05"), "Summer");
assert.strictEqual(TT.seasonFor("2027-02-11"), TT.SEASON);
assert.strictEqual(TT.specFor("2027-02-11").kind, "final");
assert.strictEqual(TT.seasonFor("2027-02-12"), "Summer");
assert.strictEqual(TT.seasonFor("2027-02-18"), "Summer");
assert.strictEqual(TT.inSeasonWindow("2026-11-05"), true);
assert.strictEqual(TT.inSeasonWindow("2026-11-04"), false);
assert.strictEqual(TT.inSeasonWindow("2027-02-11"), true);
assert.strictEqual(TT.inSeasonWindow("2027-02-12"), false);
assert.strictEqual(TT.inSeasonWindow("2025-11-13"), false);

// Cross-year: December 2026 and January 2027 are one series, one K1 year.
const dec = TT.specFor("2026-12-03");
const jan = TT.specFor("2027-01-14");
assert.strictEqual(dec.id, "2026-27");
assert.strictEqual(dec.id, jan.id);
assert.strictEqual(dec.k1Year, 2027);
assert.strictEqual(jan.k1Year, 2027);
assert.strictEqual(dec.season, jan.season);

// Poster distances and labels. The run is inside the total, not 3 × lap length.
assert.strictEqual(dec.long.km, 9.3);
assert.strictEqual(dec.short.km, 5.3);
assert.notStrictEqual(dec.long.km, +(3 * 2.3).toFixed(1));
assert.notStrictEqual(dec.short.km, +(3 * 1.4).toFixed(1));
assert.strictEqual(dec.long.laps, 3);
assert.strictEqual(dec.short.laps, 3);
assert.strictEqual(dec.long.seriesName, "Super Serious Series (SSS)");
assert.strictEqual(dec.short.seriesName, "Splash & Dash Series");
assert.strictEqual(dec.long.leagueName, "Vat-die-Krok");
assert.strictEqual(dec.short.leagueName, "Vat-die-Likkewaan");
assert.strictEqual(dec.long.style, "The original Dusi style club league");
assert.strictEqual(dec.short.style, "The shorter Dusi style league");
assert.strictEqual(dec.long.structure, "2 time trial laps + run with boat + 1 time trial lap");
assert.strictEqual(dec.short.structure, "2 short time trial laps + run without boat + 1 short time trial lap");
assert.strictEqual(dec.long.label, "SSS · Vat-die-Krok");
assert.strictEqual(dec.short.label, "Splash & Dash · Vat-die-Likkewaan");
assert.strictEqual(TT.PFD, "PFDs compulsory, no exceptions");

// Historical generic window, including the season that ended in Feb 2026.
assert.strictEqual(TT.seasonFor("2024-11-07"), "Triple S");
assert.strictEqual(TT.seasonFor("2025-11-04"), "Summer");
assert.strictEqual(TT.seasonFor("2025-11-05"), "Triple S");
assert.strictEqual(TT.seasonFor("2025-11-13"), "Triple S");
assert.strictEqual(TT.seasonFor("2025-12-25"), "Triple S");
assert.strictEqual(TT.seasonFor("2026-01-01"), "Triple S");
assert.strictEqual(TT.seasonFor("2026-02-04"), "Triple S");
assert.strictEqual(TT.seasonFor("2026-02-05"), "Summer");
assert.strictEqual(TT.seasonFor("2026-02-11"), "Summer");
assert.strictEqual(TT.specFor("2026-02-04"), null);
assert.strictEqual(TT.specFor("2025-11-13"), null);
// Later seasons keep the generic rule until a poster replaces them.
assert.strictEqual(TT.seasonFor("2027-11-04"), "Summer");
assert.strictEqual(TT.seasonFor("2027-11-05"), "Triple S");
assert.strictEqual(TT.seasonFor("2028-02-04"), "Triple S");
assert.strictEqual(TT.seasonFor("2028-02-05"), "Summer");

// Winter boundaries stay put.
assert.strictEqual(TT.seasonFor("2026-04-15"), "Summer");
assert.strictEqual(TT.seasonFor("2026-04-16"), "Winter");
assert.strictEqual(TT.seasonFor("2026-08-31"), "Winter");
assert.strictEqual(TT.seasonFor("2026-09-01"), "Summer");
assert.strictEqual(TT.seasonFor("2027-04-16"), "Winter");

// Start time is the existing club clock, including on poster nights.
assert.strictEqual(TT.startTimeFor("2026-11-12"), "17:15");
assert.strictEqual(TT.startTimeFor("2026-12-24"), "17:15");
assert.strictEqual(TT.startTimeFor("2027-02-04"), "17:15");
assert.strictEqual(TT.startTimeFor("2027-02-11"), "17:15");
assert.strictEqual(TT.startTimeFor("2026-04-01"), "17:00");
assert.strictEqual(TT.startTimeFor("2026-06-25"), "17:00");
assert.strictEqual(TT.startTimeFor("2026-09-30"), "17:00");
assert.strictEqual(TT.startTimeFor("2026-10-01"), "17:15");
assert.match(TT.START_NOTE, /17:15/);
assert.match(TT.START_NOTE, /does not state a time/i);
assert.strictEqual(TT.SEASON, "Triple S");
assert.match(TT.SCORING_NOTE, /Triple S league/);
assert.match(TT.SCORING_NOTE, /no separate Splash & Dash points table/i);
assert.match(TT.SCORING_NOTE, /no dry-run score/i);
assert.doesNotMatch(TT.SCORING_NOTE, /kept out of the Summer|no series points table|not given a points table/i);
assert.strictEqual(TT.pointsForPosition, undefined);

// New-trial stamp carries course metadata only. It does not invent a field of boats.
const stamped = TT.stampNewTrial("2026-11-12");
assert.strictEqual(stamped.season, TT.SEASON);
assert.strictEqual(stamped.start, "17:15");
assert.strictEqual(stamped.lapsLong, 3);
assert.strictEqual(stamped.longShortLaps, 0);
assert.strictEqual(stamped.lapsShort, 3);
assert.strictEqual(stamped.series.kind, "standard");
assert.strictEqual(stamped.series.longKm, 9.3);
assert.strictEqual(stamped.series.shortKm, 5.3);
assert.strictEqual(stamped.series.k1Year, 2027);
assert.strictEqual(stamped.entries, undefined);
assert.strictEqual(stamped.results, undefined);
assert.strictEqual(stamped.members, undefined);
assert.strictEqual(TT.stampNewTrial("2027-02-04").season, "Triple S");
assert.strictEqual(TT.stampNewTrial("2027-02-04").series.kind, "dry-run");
assert.strictEqual(TT.stampNewTrial("2027-02-11").season, "Triple S");
assert.strictEqual(TT.stampNewTrial("2027-02-11").series.kind, "final");

// Ordinary and historical nights are not stamped as this series.
const ordinary = TT.stampNewTrial("2026-06-25");
assert.strictEqual(ordinary.season, "Winter");
assert.strictEqual(ordinary.start, "17:00");
assert.strictEqual(ordinary.series, undefined);
assert.strictEqual(ordinary.lapsLong, undefined);
const historical = TT.stampNewTrial("2025-11-13");
assert.strictEqual(historical.season, "Triple S");
assert.strictEqual(historical.series, undefined);
const offStamp = TT.stampNewTrial("2026-12-24");
assert.strictEqual(offStamp.season, "Summer");
assert.strictEqual(offStamp.series, undefined);

// A stored historical trial keeps its own season field. Classification of the
// date is only the default for a new trial. stampNewTrial does not mutate input.
const stored = {id:"t-old", date:"2025-11-13", season:"Triple S", lapsLong:3, longShortLaps:1, lapsShort:3};
const before = JSON.stringify(stored);
assert.strictEqual(TT.specFor(stored.date), null);
assert.strictEqual(TT.seasonFor(stored.date), "Triple S");
assert.strictEqual(stored.season, "Triple S");
assert.strictEqual(JSON.stringify(stored), before);
assert.strictEqual(TT.seriesCourseKm(stored, "long"), null);
assert.strictEqual(TT.isSeriesTrial(stored), false);

const seriesTrial = TT.stampNewTrial("2026-11-19");
assert.strictEqual(TT.seriesCourseKm(seriesTrial, "long"), 9.3);
assert.strictEqual(TT.seriesCourseKm(seriesTrial, "short"), 5.3);
assert.strictEqual(TT.isSeriesTrial(seriesTrial), true);
// Lap-triangle distance for an ordinary long course stays 2 long × 2.3 + 1 short × 1.4.
assert.strictEqual(+(2 * 2.3 + 1 * 1.4).toFixed(1), 6.0);

// Dry run and final are different nights. Both are still Triple S. Scoring is tested in scoring.test.js.
assert.notStrictEqual(TT.specFor("2027-02-04").kind, TT.specFor("2027-02-11").kind);
assert.strictEqual(TT.kindTitle("dry-run"), "Dry run");
assert.strictEqual(TT.kindTitle("final"), "Final");
assert.strictEqual(TT.kindTitle("standard"), "Series night");
assert.match(TT.reminderLine(TT.specFor("2027-02-04")), /^Dry run/);
assert.match(TT.reminderLine(TT.specFor("2027-02-11")), /^Final/);
assert.match(TT.reminderLine(TT.specFor("2026-11-12")), /9\.3 km/);
assert.match(TT.reminderLine(TT.specFor("2026-11-12")), /PFDs compulsory, no exceptions/);

// Apps Script briefing dates stay locked to the same poster list.
const gsDates = [...gs.matchAll(/'(202[67]-\d{2}-\d{2})'\s*:\s*'(standard|dry-run|final)'/g)]
  .map((m) => m[1] + " " + m[2]);
assert.deepStrictEqual(gsDates, expected);

// App shell version, cache, preserved scoring, preserved lap fix, sanitised-sync guard.
assert.match(html, /const APP_VERSION = "0\.46\.1"/);
assert.match(sw, /const CACHE = "ccc-tk-v0\.46\.1"/);
assert.match(sw, /tt-series\.js/);
assert.match(sw, /tt-score\.js/);
assert.match(html, /src="tt-series\.js"/);
assert.match(html, /src="tt-score\.js"/);
assert.match(results, /src="tt-series\.js"/);
assert.match(results, /src="tt-score\.js"/);
assert.match(read("tt-score.js"), /function pointsForPosition\(pos\) \{ return pos <= 9 \? \(11 - pos\) : 1; \}/);
assert.match(html, /function pointsForPosition\(pos\)\{return TTScore\.pointsForPosition\(pos\);\}/);
assert.match(html, /if\(remote\.sanitised\)/);
assert.match(html, /longShortLapKm=1\.4/);
assert.match(html, /Math\.abs\(km-2\.1\)<1e-6\) d\.settings\.longShortLapKm=1\.4/);
assert.match(read("tt-score.js"), /return t\.season === season/);
assert.doesNotMatch(html, /isSeriesSeason/);
assert.doesNotMatch(results, /isSeriesSeason/);

const courseFn = html.slice(html.indexOf("function courseKm"), html.indexOf("function courseName"));
const iSpecial = courseFn.indexOf("t.special");
const iSeries = courseFn.indexOf("seriesCourseKm");
const iLap = courseFn.indexOf("longKmVal()");
assert.ok(iSpecial >= 0 && iSpecial < iSeries && iSeries < iLap, "course km order: special, then series, then laps");

// No series results and no contact fields are seeded by the calendar module.
const seriesSrc = read("tt-series.js");
assert.doesNotMatch(seriesSrc, /@|phone|email|\bPIN\b|appPin/i);
assert.doesNotMatch(seriesSrc, /S\.trials|localStorage|fetch\(/);
assert.doesNotMatch(seriesSrc, /google\.com|cloudPost/);

console.log("series 2026/27 tests ok (" + expected.length + " nights, " + off.length + " off-weeks)");
