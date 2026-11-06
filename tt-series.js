/* CCC Timekeeper — 2026/27 series calendar.
   Loaded by index.html and results.html. Also require()-able from node tests.
   Poster dates are the authority for this season. Historical Triple S
   (generic 5 Nov–4 Feb in every other season) is unchanged.
   This file does not score points and does not name any paddler. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TTSeries = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SERIES_ID = "2026-27";
  // Poster nights use the existing Triple S league. They are not a new season.
  var SEASON = "Triple S";
  var K1_YEAR = 2027;
  // First and last Thursday of the old generic window for THIS season, extended
  // through the poster final (11 Feb), which sits after the old 4 Feb cutoff.
  var WINDOW_START = "2026-11-05";
  var WINDOW_END = "2027-02-11";
  var PFD = "PFDs compulsory, no exceptions";
  var START_NOTE = "Start time is the club's existing summer time trial time, 17:15 SAST. The poster does not state a time.";
  // Existing league scoring still applies. What the poster does not settle is
  // called out here and is not turned into a new rule.
  var SCORING_NOTE = "These nights are the Triple S league and use the existing points: 10 to 1 within each course, +3 for a season-best unless a buoy was missing, and +10 per 10 trials. Long (SSS / Vat-die-Krok) and short (Splash & Dash / Vat-die-Likkewaan) are separate groups on the same night. There is no separate Splash & Dash points table. The poster does not say whether the 4 Feb dry run counts. 4 Feb stays Triple S, which is what the old 4 Feb rule already did, so no dry-run score was added or removed.";
  var SCORING_SHORT = "Scored in the Triple S league with the existing points. Long and short are separate. The 4 Feb dry run is not given its own score.";

  // Exact poster nights. kind distinguishes a normal series night from the dry run and the final.
  var NIGHTS = [
    {date:"2026-11-12", kind:"standard"},
    {date:"2026-11-19", kind:"standard"},
    {date:"2026-11-26", kind:"standard"},
    {date:"2026-12-03", kind:"standard"},
    {date:"2027-01-14", kind:"standard"},
    {date:"2027-01-21", kind:"standard"},
    {date:"2027-01-28", kind:"standard"},
    {date:"2027-02-04", kind:"dry-run"},
    {date:"2027-02-11", kind:"final"}
  ];

  // Thursdays inside the window that the poster leaves out. Reasons are calendar
  // facts, not a general holiday engine. The rule is still "exact dates only".
  var OFF_REASONS = {
    "2026-11-05": "Off-week. The series starts on 12 November.",
    "2026-12-10": "Off-week. Not listed on the poster.",
    "2026-12-17": "Holiday week. Day of Reconciliation is Wednesday 16 December; this Thursday is not a series night.",
    "2026-12-24": "Holiday week. Christmas Day is Friday 25 December; this Thursday is not a series night.",
    "2026-12-31": "Holiday week. New Year's Day is Friday 1 January 2027; this Thursday is not a series night.",
    "2027-01-07": "Off-week. The series resumes on 14 January."
  };

  var LONG = {
    km: 9.3,
    laps: 3,
    seriesName: "Super Serious Series (SSS)",
    leagueName: "Vat-die-Krok",
    style: "The original Dusi style club league",
    structure: "2 time trial laps + run with boat + 1 time trial lap",
    label: "SSS · Vat-die-Krok"
  };
  var SHORT = {
    km: 5.3,
    laps: 3,
    seriesName: "Splash & Dash Series",
    leagueName: "Vat-die-Likkewaan",
    style: "The shorter Dusi style league",
    structure: "2 short time trial laps + run without boat + 1 short time trial lap",
    label: "Splash & Dash · Vat-die-Likkewaan"
  };

  function pad(n){return String(n).padStart(2,"0");}
  function asDate(v){
    if (v instanceof Date) return new Date(v.getTime());
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T12:00:00");
    return new Date(s);
  }
  function ymd(v){
    var d = asDate(v);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function addDays(dateStr, n){
    var d = asDate(dateStr);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function thursdaysFrom(start, end){
    var out = [], cur = start;
    while (cur <= end) { out.push(cur); cur = addDays(cur, 7); }
    return out;
  }

  var BY_DATE = Object.create(null);
  NIGHTS.forEach(function (n) { BY_DATE[n.date] = n; });

  // Fail at load if a poster night is not a Thursday or an off-week reason drifts.
  (function checkCalendar(){
    if (asDate(WINDOW_START).getDay() !== 4 || asDate(WINDOW_END).getDay() !== 4)
      throw new Error("2026/27 series window must start and end on a Thursday");
    NIGHTS.forEach(function (n) {
      if (asDate(n.date).getDay() !== 4) throw new Error("series night is not a Thursday: " + n.date);
      if (n.date < WINDOW_START || n.date > WINDOW_END) throw new Error("series night outside window: " + n.date);
    });
    var derived = thursdaysFrom(WINDOW_START, WINDOW_END).filter(function (d) { return !BY_DATE[d]; });
    derived.forEach(function (d) {
      if (!OFF_REASONS[d]) throw new Error("missing off-week reason for " + d);
    });
    Object.keys(OFF_REASONS).forEach(function (d) {
      if (derived.indexOf(d) < 0) throw new Error("off-week reason is not an off Thursday: " + d);
    });
  })();

  function inSeasonWindow(date){
    var key = ymd(date);
    return key >= WINDOW_START && key <= WINDOW_END;
  }
  function specFor(date){
    var night = BY_DATE[ymd(date)];
    if (!night) return null;
    return {
      id: SERIES_ID,
      season: SEASON,
      date: night.date,
      kind: night.kind,
      k1Year: K1_YEAR,
      pfd: PFD,
      long: LONG,
      short: SHORT
    };
  }
  function seasonFor(date){
    var spec = specFor(date);
    if (spec) return SEASON;
    var d = asDate(date), m = d.getMonth(), day = d.getDate();
    // Winter window: 16 Apr – 31 Aug (unchanged).
    if ((m === 3 && day >= 16) || m === 4 || m === 5 || m === 6 || m === 7) return "Winter";
    // This season's poster replaces the generic 5 Nov–4 Feb rule. Off-weeks stay ordinary summer nights.
    if (inSeasonWindow(d)) return "Summer";
    // Historical (and later seasons until a new poster is added): generic Triple S.
    if ((m === 10 && day >= 5) || m === 11 || m === 0 || (m === 1 && day <= 4)) return "Triple S";
    return "Summer";
  }
  // Existing summer/winter clock. The poster does not set a start time.
  function startTimeFor(date){
    var m = asDate(date).getMonth();
    return (m >= 3 && m <= 8) ? "17:00" : "17:15";
  }
  function isSeriesTrial(trial){ return !!(trial && trial.series && trial.series.id === SERIES_ID); }
  function kindTitle(kind){
    if (kind === "dry-run") return "Dry run";
    if (kind === "final") return "Final";
    return "Series night";
  }
  function offWeekThursdays(){
    return thursdaysFrom(WINDOW_START, WINDOW_END).filter(function (d) { return !BY_DATE[d]; });
  }
  function offWeekReason(date){
    return OFF_REASONS[ymd(date)] || "Not listed on the 2026/27 poster.";
  }
  function nights(){
    return NIGHTS.map(function (n) { return {date:n.date, kind:n.kind}; });
  }
  function calendarRows(){
    return NIGHTS.map(function (n) {
      var detail = n.kind === "dry-run" ? "Dry run for Vat-die-Krok and Vat-die-Likkewaan"
        : n.kind === "final" ? "Final for Vat-die-Krok and Vat-die-Likkewaan"
        : "SSS / Vat-die-Krok and Splash & Dash / Vat-die-Likkewaan";
      return {date:n.date, kind:n.kind, title:kindTitle(n.kind), detail:detail};
    });
  }
  function trialSeries(spec){
    return {
      id: spec.id,
      kind: spec.kind,
      k1Year: spec.k1Year,
      longKm: spec.long.km,
      shortKm: spec.short.km,
      longLabel: spec.long.label,
      shortLabel: spec.short.label
    };
  }
  // Fields for a trial the timekeeper has not created yet. Does not attach entries or results.
  // Ordinary nights return season + start only, so the sunset lap planner still owns the laps.
  function stampNewTrial(date){
    var spec = specFor(date);
    var base = {season:seasonFor(date), start:startTimeFor(date)};
    if (!spec) return base;
    return {
      season: SEASON,
      start: base.start,
      lapsLong: LONG.laps,
      longShortLaps: 0,
      lapsShort: SHORT.laps,
      series: trialSeries(spec)
    };
  }
  // Fixed poster distance, or null so the caller keeps ordinary lap × km maths.
  function seriesCourseKm(trial, course){
    if (!isSeriesTrial(trial)) return null;
    var km = course === "short" ? +trial.series.shortKm : +trial.series.longKm;
    return isFinite(km) ? km : null;
  }
  function reminderLine(spec){
    var head = spec.kind === "dry-run" ? "Dry run — " : spec.kind === "final" ? "Final — " : "";
    return head + "Super Serious Series / Vat-die-Krok 9.3 km and Splash & Dash / Vat-die-Likkewaan 5.3 km. " + PFD + ".";
  }

  return {
    SERIES_ID: SERIES_ID,
    SEASON: SEASON,
    K1_YEAR: K1_YEAR,
    WINDOW_START: WINDOW_START,
    WINDOW_END: WINDOW_END,
    PFD: PFD,
    START_NOTE: START_NOTE,
    SCORING_NOTE: SCORING_NOTE,
    SCORING_GAP: SCORING_NOTE,
    SCORING_SHORT: SCORING_SHORT,
    LONG: LONG,
    SHORT: SHORT,
    ymd: ymd,
    inSeasonWindow: inSeasonWindow,
    specFor: specFor,
    seasonFor: seasonFor,
    startTimeFor: startTimeFor,
    isSeriesTrial: isSeriesTrial,
    kindTitle: kindTitle,
    offWeekThursdays: offWeekThursdays,
    offWeekReason: offWeekReason,
    nights: nights,
    calendarRows: calendarRows,
    stampNewTrial: stampNewTrial,
    seriesCourseKm: seriesCourseKm,
    reminderLine: reminderLine
  };
});
