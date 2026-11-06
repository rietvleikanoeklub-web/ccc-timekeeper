/* CCC Timekeeper league scoring — the same rules index.html has used.
   A trial counts only in the league stored on trial.season.
   Triple S is not added to Summer. The +3 season-best bonus applies
   on Triple S unless the trial is buoy-short. This file adds no
   Splash & Dash table and no dry-run modifier. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TTScore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function pointsForPosition(pos) { return pos <= 9 ? (11 - pos) : 1; }
  function boatMatch(boat, f) {
    return f === "ALL" || boat === f || (f === "K*" && (boat || "")[0] === "K") || (f === "S*" && (boat || "")[0] === "S");
  }
  function lapTarget(t, course) {
    if (course === "short") return t.lapsShort || 2;
    if (t.special && +t.special.laps) return +t.special.laps;
    return (t.lapsLong || 2) + (t.longShortLaps || 0);
  }
  function entryTotal(e) {
    return (e.total != null) ? e.total : (e.splits && e.splits.length ? e.splits[e.splits.length - 1] : null);
  }
  function entryDone(e, t) {
    return e.done === true || (e.splits ? e.splits.length : 0) >= lapTarget(t, e.course);
  }
  function partialRank(e) { return e && e.partial ? 1 : 0; }
  function cmpEntry(a, b) { return partialRank(a) - partialRank(b) || entryTotal(a) - entryTotal(b); }
  function cmpET(a, b) { return partialRank(a.e) - partialRank(b.e) || a.total - b.total; }

  // Positions are scored within each course group. Same formula for Summer,
  // Winter and Triple S. boatFilter/courseFilter default to ALL.
  function scoreLeague(trials, entries, season, boatFilter, courseFilter, nameOf) {
    boatFilter = boatFilter || "ALL";
    courseFilter = courseFilter || "ALL";
    nameOf = nameOf || function (id) { return id; };
    var tally = {};
    (trials || []).filter(function (t) { return t.season === season; }).forEach(function (t) {
      ["long", "short"].forEach(function (course) {
        if (courseFilter !== "ALL" && course !== courseFilter) return;
        var group = (entries || []).filter(function (e) {
          return e.trialId === t.id && e.course === course && entryDone(e, t);
        }).map(function (e) { return { e: e, total: entryTotal(e) }; }).sort(cmpET);
        group.forEach(function (g, i) {
          var r = g.e;
          if (!boatMatch(r.boat, boatFilter)) return;
          var pts = pointsForPosition(i + 1);
          (r.memberIds || []).forEach(function (id) {
            var row = tally[id] = tally[id] || { pts: 0, best: null, count: 0, name: nameOf(id), courseBest: {} };
            row.pts += pts;
            row.count++;
            var cb = row.courseBest[course];
            if (!t.buoyShort && cb != null && g.total < cb) row.pts += 3;
            if (cb == null || g.total < cb) row.courseBest[course] = g.total;
            if (row.best == null || g.total < row.best) row.best = g.total;
          });
        });
      });
    });
    Object.keys(tally).forEach(function (id) {
      tally[id].pts += Math.floor(tally[id].count / 10) * 10;
    });
    return Object.keys(tally).map(function (id) {
      var row = tally[id];
      return { id: id, pts: row.pts, best: row.best, count: row.count, name: row.name, courseBest: row.courseBest };
    }).sort(function (a, b) { return b.pts - a.pts || (a.best || 9e9) - (b.best || 9e9); });
  }

  return {
    pointsForPosition: pointsForPosition,
    boatMatch: boatMatch,
    lapTarget: lapTarget,
    entryTotal: entryTotal,
    entryDone: entryDone,
    cmpEntry: cmpEntry,
    cmpET: cmpET,
    scoreLeague: scoreLeague
  };
});
