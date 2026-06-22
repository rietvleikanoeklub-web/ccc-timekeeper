/**
 * CCC Timekeeper — Google Apps Script backend
 * =================================================================
 * Mirrors the CCC Bar Tab backend pattern. Stores the timekeeping app's
 * data as a single JSON file on Google Drive, and serves the live member
 * list straight from the Bar Tab's own data file (same Google account, so
 * no cross-origin / sharing needed).
 *
 * ENDPOINTS (Web App URL ends in /exec)
 *   GET  ?action=data        -> returns the timekeeping document JSON
 *   GET  ?action=members     -> returns [{name,first,last,phone,email,reg}] from the Bar Tab
 *   GET  ?action=ping        -> { ok:true }
 *   POST  body = {token, data}  -> saves the timekeeping document, returns {ok,updatedAt}
 *
 * SETUP (one-time)
 *   1. script.google.com -> New project -> paste this file. Sign in as
 *      rietvleikanoeklub@gmail.com (the account that owns the Bar Tab Drive data).
 *   2. (optional) set a shared secret in SHARED_TOKEN below and the same value
 *      in index.html (CLOUD_TOKEN). Leave both "" to run open like the Bar Tab.
 *   3. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me (rietvleikanoeklub@gmail.com)
 *        Who has access: Anyone
 *      Copy the /exec URL -> paste into the app's Settings (or CLOUD_URL in index.html).
 *   4. First call auto-creates CCC_TT_Data.json in My Drive.
 *
 * EMAIL DUTY REMINDERS (optional automation)
 *   - Project Settings -> set time zone to Africa/Johannesburg.
 *   - Triggers (clock icon) -> Add Trigger -> function sendReminders,
 *     Time-driven -> Day timer -> 6am-7am. It emails each rostered timekeeper
 *     REMIND_DAYS before their duty (needs the member's email, synced from the app /
 *     Bar Tab). Already-sent reminders are tracked in Script Properties so nobody
 *     gets a duplicate. Run testReminders() once to authorise the Gmail scope.
 *
 * NOTE: A public "Anyone" web app URL can be read/written by anyone who has it,
 * exactly like the Bar Tab. Set SHARED_TOKEN for a light guard if you want.
 */

var DATA_FILE     = 'CCC_TT_Data.json';
var BARTAB_FILE   = 'CCC_BarTab_Data.json';   // the Bar Tab's existing Drive data file
var BACKUP_PREFIX = 'CCC_TT_Backup_';
var SHARED_TOKEN  = '';   // '' = open. Otherwise must match CLOUD_TOKEN in index.html.
var REMIND_DAYS   = 3;    // email the timekeeper this many days before their duty
var ADMIN_CC      = 'elton@edp.co.za';  // CC'd on every reminder (organiser visibility)

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'data';
  if (!tokenOk(e)) return json({ error: 'unauthorized' });
  if (action === 'ping')    return json({ ok: true, ts: new Date().toISOString() });
  if (action === 'members') return json(getBarTabMembers());
  return json(readData());
}

function doPost(e) {
  if (!tokenOk(e)) return json({ error: 'unauthorized' });
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ error: 'bad json' }); }
  if (SHARED_TOKEN && body.token !== SHARED_TOKEN) return json({ error: 'unauthorized' });
  var data = body.data || {};
  data.updatedAt = data.updatedAt || Date.now();
  writeFile(DATA_FILE, JSON.stringify(data));
  maybeDailyBackup(data);
  return json({ ok: true, updatedAt: data.updatedAt });
}

/* -------------------- token guard (token may come via ?token= or POST body) -------------------- */
function tokenOk(e) {
  if (!SHARED_TOKEN) return true;
  var t = e && e.parameter && e.parameter.token;
  return t === SHARED_TOKEN || (e && e.postData); // POST body token checked in doPost
}

/* -------------------- timekeeping document -------------------- */
function readData() {
  var f = fileByName(DATA_FILE);
  if (!f) return { members: [], trials: [], results: [], roster: [], courseChoice: {}, updatedAt: 0, rev: 0 };
  try { return JSON.parse(f.getBlob().getDataAsString()); }
  catch (err) { return { error: 'corrupt data', members: [], trials: [], results: [], roster: [] }; }
}

/* -------------------- live member feed from the Bar Tab -------------------- */
function getBarTabMembers() {
  var f = fileByName(BARTAB_FILE);
  if (!f) return [];
  var raw;
  try { raw = JSON.parse(f.getBlob().getDataAsString()); } catch (err) { return []; }
  var arr = raw.members || (raw.S && raw.S.members) || (Array.isArray(raw) ? raw : []);
  if (!Array.isArray(arr)) return [];
  return arr.map(function (o) {
    var first = o.first || o.firstName || '';
    var last  = o.last  || o.surname || o.lastName || '';
    var name  = (o.name || (first + ' ' + last)).trim();
    if (!first && name) { var p = name.split(' '); first = p[0]; last = p.slice(1).join(' '); }
    return {
      name:  name,
      first: first,
      last:  last,
      phone: o.phone || o.cell || o.mobile || o.number || '',
      email: o.email || o.mail || o.emailAddress || '',
      reg:   o.reg || o.registration || o.regNo || o.regNumber || ''
    };
  }).filter(function (m) { return m.name; });
}

/* -------------------- email duty reminders (time-driven trigger) -------------------- */
function sendReminders() {
  var data = readData();
  var roster = data.roster || [], members = data.members || [];
  var props = PropertiesService.getScriptProperties();
  var now = new Date(); now.setHours(0, 0, 0, 0);
  var sent = 0;
  roster.forEach(function (r) {
    var d = new Date(r.date + 'T12:00:00');
    var days = Math.round((d - now) / 86400000);
    if (days < 0 || days > REMIND_DAYS) return;
    var key = 'rem_' + r.date + '_' + r.who;
    if (props.getProperty(key)) return;
    var m = findMember(members, r.who);
    if (!m || !m.email) return;
    var start = startTimeForDate(d);
    MailApp.sendEmail({
      to: m.email, cc: ADMIN_CC,
      subject: 'CCC timekeeping duty — ' + fmtDateZA(d),
      body: 'Hi ' + (m.first || r.who) + ',\n\n'
        + 'Reminder: you are on TIMEKEEPING DUTY for the CCC time trial on '
        + fmtDateZA(d) + ' (start ' + start + ').\n\n'
        + 'Please be at the dam 10 minutes early with a stopwatch.\n'
        + 'If you cannot make it, arrange a swap WELL in advance — a timekeeper who '
        + 'paddles makes the trial unofficial and no points are earned.\n\n'
        + 'Thanks for keeping time!\nCCC Timekeeper'
    });
    props.setProperty(key, new Date().toISOString());
    sent++;
  });
  return sent;
}
function testReminders() { Logger.log('reminders sent: ' + sendReminders()); }
function findMember(members, who) {
  who = (who || '').toLowerCase().trim();
  return members.filter(Boolean).find(function (m) {
    var full = ((m.first || '') + ' ' + (m.last || '')).trim().toLowerCase();
    return full === who || (m.first || '').toLowerCase() === who;
  });
}
function startTimeForDate(d) { var mo = d.getMonth(); return (mo >= 3 && mo <= 8) ? '17:00' : '17:15'; }
function fmtDateZA(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'EEE d MMM'); }

/* -------------------- Drive helpers -------------------- */
function fileByName(name) {
  var it = DriveApp.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
function writeFile(name, content) {
  var f = fileByName(name);
  if (f) f.setContent(content);
  else DriveApp.createFile(name, content, MimeType.PLAIN_TEXT);
}
function maybeDailyBackup(data) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var name = BACKUP_PREFIX + today + '.json';
  if (!fileByName(name)) DriveApp.createFile(name, JSON.stringify(data), MimeType.PLAIN_TEXT);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
