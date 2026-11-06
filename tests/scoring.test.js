"use strict";
/* Regression for the league scoring that was already in the app.
   In-memory trials only. No network, no localStorage, no cloud.
   Run: node tests/scoring.test.js */
const assert = require("assert");
const TT = require("../tt-series.js");
const Score = require("../tt-score.js");

function fin(trialId, id, course, memberIds, total, extra) {
  return Object.assign({
    id: id, trialId: trialId, course: course, memberIds: memberIds,
    boat: "K1", done: true, total: total
  }, extra || {});
}
function byId(rows) {
  const o = {};
  rows.forEach((r) => { o[r.id] = r; });
  return o;
}
function night(id, date, kind) {
  const stamped = TT.stampNewTrial(date);
  return {
    id: id, date: date, season: stamped.season, buoyShort: false,
    lapsLong: stamped.lapsLong != null ? stamped.lapsLong : 3,
    longShortLaps: stamped.longShortLaps != null ? stamped.longShortLaps : 0,
    lapsShort: stamped.lapsShort != null ? stamped.lapsShort : 3,
    series: stamped.series || null,
    kind: kind || (stamped.series && stamped.series.kind) || null
  };
}

assert.strictEqual(Score.pointsForPosition(1), 10);
assert.strictEqual(Score.pointsForPosition(9), 2);
assert.strictEqual(Score.pointsForPosition(10), 1);
assert.strictEqual(Score.pointsForPosition(15), 1);

// Poster nights and the old generic window are the same league name.
assert.strictEqual(TT.seasonFor("2025-11-13"), "Triple S");
assert.strictEqual(TT.seasonFor("2026-11-12"), "Triple S");
assert.strictEqual(TT.seasonFor("2027-02-04"), "Triple S");
assert.strictEqual(TT.seasonFor("2027-02-11"), "Triple S");
assert.strictEqual(TT.seasonFor("2026-12-24"), "Summer");

const hist = { id: "hist", date: "2025-11-13", season: "Triple S", buoyShort: false, lapsLong: 3, lapsShort: 3 };
const summer = { id: "sum", date: "2026-10-01", season: "Summer", buoyShort: false, lapsLong: 3, lapsShort: 2 };
const poster = night("p12", "2026-11-12");
const poster2 = night("p19", "2026-11-19");
const dry = night("dry", "2027-02-04");
const finNight = night("fin", "2027-02-11");
const off = night("off", "2026-12-24");
assert.strictEqual(poster.season, "Triple S");
assert.strictEqual(poster.series.kind, "standard");
assert.strictEqual(dry.series.kind, "dry-run");
assert.strictEqual(finNight.series.kind, "final");
assert.strictEqual(off.season, "Summer");
assert.strictEqual(off.series, null);

// Historical Triple S and a 2026 poster night both score in Triple S.
// Neither is copied into Summer. Summer inclusion is not in this app.
const split = [
  hist, summer, poster,
];
const splitEntries = [
  fin("hist", "h1", "long", ["ada"], 1000),
  fin("sum", "s1", "long", ["bea"], 900),
  fin("p12", "p1", "long", ["ada"], 1100)
];
const triple = byId(Score.scoreLeague(split, splitEntries, "Triple S"));
const summerRows = byId(Score.scoreLeague(split, splitEntries, "Summer"));
assert.strictEqual(triple.ada.pts, 20); // 10 + 10, two firsts
assert.strictEqual(triple.ada.count, 2);
assert.strictEqual(triple.bea, undefined);
assert.strictEqual(summerRows.bea.pts, 10);
assert.strictEqual(summerRows.ada, undefined);

// Both routes on one poster night: long and short are separate groups,
// and both groups' points land in the same Triple S table.
const bothEntries = [
  fin("p12", "L1", "long", ["ada"], 2000),
  fin("p12", "L2", "long", ["bea"], 2100),
  fin("p12", "S1", "short", ["cio"], 1500),
  fin("p12", "S2", "short", ["dee"], 1600, { boat: "K2", memberIds: ["dee", "eli"] })
];
const both = byId(Score.scoreLeague([poster], bothEntries, "Triple S"));
assert.strictEqual(both.ada.pts, 10);
assert.strictEqual(both.bea.pts, 9);
assert.strictEqual(both.cio.pts, 10);
assert.strictEqual(both.dee.pts, 9);
assert.strictEqual(both.eli.pts, 9); // crew member gets the boat's points
const longOnly = byId(Score.scoreLeague([poster], bothEntries, "Triple S", "ALL", "long"));
const shortOnly = byId(Score.scoreLeague([poster], bothEntries, "Triple S", "ALL", "short"));
assert.strictEqual(longOnly.ada.pts, 10);
assert.strictEqual(longOnly.cio, undefined);
assert.strictEqual(shortOnly.cio.pts, 10);
assert.strictEqual(shortOnly.ada, undefined);
assert.strictEqual(byId(Score.scoreLeague([poster], bothEntries, "Summer")).ada, undefined);

// +3 season-best still applies on Triple S. The repo has no rule that
// turns that bonus off during SSS. buoyShort is the existing switch.
const bonusEntries = [
  fin("p12", "b1", "long", ["ada"], 2000),
  fin("p19", "b2", "long", ["ada"], 1900)
];
const withBonus = byId(Score.scoreLeague([poster, poster2], bonusEntries, "Triple S"));
assert.strictEqual(withBonus.ada.pts, 23); // 10 + 10 + 3
const buoy = Object.assign({}, poster2, { buoyShort: true });
const noBonus = byId(Score.scoreLeague([poster, buoy], bonusEntries, "Triple S"));
assert.strictEqual(noBonus.ada.pts, 20);

// Dry run uses the same formula as any other Triple S night.
// No penalty, exclusion, or extra bonus is applied because kind === "dry-run".
const sameOrder = [
  fin("p12", "d1", "long", ["ada"], 2000),
  fin("p12", "d2", "long", ["bea"], 2100),
  fin("p12", "d3", "short", ["cio"], 1500)
];
const dryOrder = sameOrder.map((e) => Object.assign({}, e, { trialId: "dry", id: "x" + e.id }));
function sig(rows) {
  return rows.slice().sort((a, b) => a.id.localeCompare(b.id)).map((r) => r.id + ":" + r.pts).join(",");
}
const standardPts = sig(Score.scoreLeague([poster], sameOrder, "Triple S"));
const dryPts = sig(Score.scoreLeague([dry], dryOrder, "Triple S"));
assert.strictEqual(dryPts, standardPts);
assert.strictEqual(dryPts, "ada:10,bea:9,cio:10");
// The final, which the old 4 Feb cutoff would have called Summer, is Triple S too.
const finalPts = Score.scoreLeague([finNight], dryOrder.map((e) => Object.assign({}, e, { trialId: "fin" })), "Triple S");
assert.strictEqual(finalPts.map((r) => r.pts).sort((a, b) => b - a).join(","), "10,10,9");
assert.strictEqual(Score.scoreLeague([finNight], dryOrder, "Summer").length, 0);

// An off-week Thursday stays a Summer time trial and scores only there.
const offEntries = [fin("off", "o1", "long", ["bea"], 1800)];
assert.strictEqual(byId(Score.scoreLeague([off], offEntries, "Summer")).bea.pts, 10);
assert.strictEqual(Score.scoreLeague([off], offEntries, "Triple S").length, 0);

// A partial boat keeps its time but ranks after every full finisher.
const partials = [
  fin("p12", "full", "long", ["ada"], 3000),
  fin("p12", "part", "long", ["bea"], 1000, { partial: true })
];
const ranked = Score.scoreLeague([poster], partials, "Triple S");
assert.deepStrictEqual(ranked.map((r) => r.id), ["ada", "bea"]);
assert.strictEqual(ranked[0].pts, 10);
assert.strictEqual(ranked[1].pts, 9);

// +10 after every 10 counted results, including Triple S results.
const manyTrials = [];
const manyEntries = [];
for (let n = 0; n < 10; n++) {
  const id = "m" + n;
  manyTrials.push({ id: id, date: "2025-11-13", season: "Triple S", buoyShort: false, lapsLong: 3, lapsShort: 3 });
  manyEntries.push(fin(id, "e" + n, "long", ["ada"], 2000 - n));
}
const ten = byId(Score.scoreLeague(manyTrials, manyEntries, "Triple S"));
assert.strictEqual(ten.ada.count, 10);
assert.strictEqual(ten.ada.pts, 10 * 10 + 3 * 9 + 10); // places, nine season-best bonuses, attendance

// Nothing in the scorer names a dry-run or Splash & Dash points rule.
const src = require("fs").readFileSync(require("path").join(__dirname, "../tt-score.js"), "utf8");
const fn = src.slice(src.indexOf("function scoreLeague"), src.lastIndexOf("return {"));
assert.doesNotMatch(fn, /series\.kind|dry-run|Splash|Likkewaan/);
assert.doesNotMatch(src, /fetch\(|localStorage/);

console.log("scoring regression ok");
