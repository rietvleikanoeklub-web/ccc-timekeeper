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
  var SCORING_NOTE = "These nights are the Triple S league and use the existing points: 10 to 1 within each course, +3 for a season-best unless a buoy was missing, and +10 per 10 trials. On a normal series night the long group is Triple S and the short group is Splash & Dash. There is no separate Splash & Dash points table. Vat-die-Krok and Vat-die-Likkewaan are only the 4 Feb dry run and the 11 Feb final. The poster does not say whether the dry run scores. 4 Feb stays Triple S, which is what the old 4 Feb rule already did, so no dry-run score was added or removed.";
  var SCORING_SHORT = "Scored in the Triple S league with the existing points. Triple S and Splash & Dash are separate groups. The 4 Feb dry run is not given its own score.";

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

  // Normal Thursday series courses. Vat-die-Krok / Vat-die-Likkewaan are not these.
  var LONG = {
    km: 9.3,
    laps: 3,
    seriesName: "Super Serious Series (SSS)",
    style: "The original Dusi style club league",
    structure: "2 time trial laps + run with boat + 1 time trial lap",
    label: "Triple S"
  };
  var SHORT = {
    km: 5.3,
    laps: 3,
    seriesName: "Splash & Dash Series",
    style: "The shorter Dusi style league",
    structure: "2 short time trial laps + run without boat + 1 short time trial lap",
    label: "Splash & Dash"
  };
  // End-of-series names only. The poster does not give their distance or lap count.
  var END_LONG = { label: "Vat-die-Krok", km: null, laps: null };
  var END_SHORT = { label: "Vat-die-Likkewaan", km: null, laps: null };

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
  function namesForKind(kind){
    if (kind === "dry-run" || kind === "final") {
      return {
        kind: kind,
        longLabel: END_LONG.label,
        shortLabel: END_SHORT.label,
        longKm: null,
        shortKm: null,
        distanceTbc: true,
        prescribeLaps: false
      };
    }
    return {
      kind: "standard",
      longLabel: LONG.label,
      shortLabel: SHORT.label,
      longTitle: LONG.seriesName,
      shortTitle: SHORT.seriesName,
      longStyle: LONG.style,
      shortStyle: SHORT.style,
      longStructure: LONG.structure,
      shortStructure: SHORT.structure,
      longKm: LONG.km,
      shortKm: SHORT.km,
      distanceTbc: false,
      prescribeLaps: true,
      laps: LONG.laps
    };
  }
  // Labels follow the date, so a trial saved with the old combined names still displays correctly.
  function viewFor(trial){
    if (!trial) return null;
    var spec = trial.date ? specFor(trial.date) : null;
    var kind = spec ? spec.kind : (trial.series && trial.series.kind);
    if (!kind) return null;
    if (!spec && !(trial.series && trial.series.id === SERIES_ID)) return null;
    return namesForKind(kind);
  }
  function specFor(date){
    var night = BY_DATE[ymd(date)];
    if (!night) return null;
    var names = namesForKind(night.kind);
    var end = names.distanceTbc;
    return {
      id: SERIES_ID,
      season: SEASON,
      date: night.date,
      kind: night.kind,
      k1Year: K1_YEAR,
      pfd: PFD,
      distanceTbc: end,
      long: end ? END_LONG : LONG,
      short: end ? END_SHORT : SHORT,
      names: names
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
      var names = namesForKind(n.kind);
      var detail = n.kind === "dry-run" ? "Dry run — Vat-die-Krok and Vat-die-Likkewaan. Distance TBC."
        : n.kind === "final" ? "Final — Vat-die-Krok and Vat-die-Likkewaan. Distance TBC."
        : "Triple S (9.3 km) and Splash & Dash (5.3 km)";
      var title = n.kind === "standard" ? "Triple S + Splash & Dash" : kindTitle(n.kind);
      return {date:n.date, kind:n.kind, title:title, detail:detail, km: names.distanceTbc ? "TBC" : "9.3 / 5.3"};
    });
  }
  function pickerLabel(date){
    var spec = specFor(date);
    if (!spec) return null;
    if (spec.kind === "standard") return "Triple S + Splash & Dash";
    var both = "Vat-die-Krok + Vat-die-Likkewaan";
    if (spec.kind === "dry-run") return both + " · dry run";
    if (spec.kind === "final") return both + " · final";
    return both;
  }
  function trialSeries(spec){
    var names = spec.names || namesForKind(spec.kind);
    return {
      id: spec.id,
      kind: spec.kind,
      k1Year: spec.k1Year,
      distanceTbc: !!names.distanceTbc,
      longKm: names.longKm,
      shortKm: names.shortKm,
      longLabel: names.longLabel,
      shortLabel: names.shortLabel
    };
  }
  // Fields for a trial the timekeeper has not created yet. Does not attach entries or results.
  // Ordinary nights return season + start only, so the sunset lap planner still owns the laps.
  function stampNewTrial(date){
    var spec = specFor(date);
    var base = {season:seasonFor(date), start:startTimeFor(date)};
    if (!spec) return base;
    var stamped = { season: SEASON, start: base.start, series: trialSeries(spec) };
    // Only a normal series night has a poster lap count. The Feb races do not.
    if (!spec.distanceTbc) {
      stamped.lapsLong = LONG.laps;
      stamped.longShortLaps = 0;
      stamped.lapsShort = SHORT.laps;
    }
    return stamped;
  }
  // Poster distance for a known course, or null when this is not that course
  // or the poster did not publish a distance (Vat-die-Krok / Vat-die-Likkewaan).
  function seriesCourseKm(trial, course){
    var view = viewFor(trial);
    if (!view || view.distanceTbc) return null;
    var km = course === "short" ? view.shortKm : view.longKm;
    return (km == null || !isFinite(+km)) ? null : +km;
  }
  function reminderLine(spec){
    if (spec.distanceTbc) {
      var head = spec.kind === "dry-run" ? "Dry run — " : "Final — ";
      return head + "Vat-die-Krok and Vat-die-Likkewaan. Distance TBC — set the laps on the night. " + PFD + ".";
    }
    return "Two races: Triple S (Super Serious Series) 9.3 km and Splash & Dash 5.3 km. " + PFD + ".";
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
    namesForKind: namesForKind,
    viewFor: viewFor,
    pickerLabel: pickerLabel,
    offWeekThursdays: offWeekThursdays,
    offWeekReason: offWeekReason,
    nights: nights,
    calendarRows: calendarRows,
    stampNewTrial: stampNewTrial,
    seriesCourseKm: seriesCourseKm,
    reminderLine: reminderLine
  };
});
