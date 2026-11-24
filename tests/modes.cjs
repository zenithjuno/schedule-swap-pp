const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
let rejectSave = false;
const context = {
  console,
  localStorage: {
    getItem: key => storage.get(key) || null,
    setItem(key, value) {
      if (rejectSave) throw Error('full');
      storage.set(key, value);
    }
  },
  document: {getElementById: () => null}
};
context.window = context;
vm.createContext(context);
for (const name of ['core', 'dynamic', 'modes']) {
  const file = path.join(__dirname, '..', 'js', name + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
}
const S = context.SWAP;
// pinned: the hand-worked substitute scores below use weekly baseline 20 at +1 per period under it
const settings = Object.assign(S.cloneSettings(S.DEFAULT_SETTINGS), {WORKLOAD_WEEKLY_BASELINE: 20, WORKLOAD_WEEKLY_BONUS_PER_PERIOD: 1, WORKLOAD_WEEKLY_PENALTY_PER_PERIOD: 2, DAY_OVERLOAD_PENALTY: 10, DAY_OVERLOAD_THRESHOLD: 5, CONSECUTIVE_PENALTY: 15});
const teacher = {me: '0001', social: '0002', language: '0003', cover: '0004', leave: '0005', subgroup: '0006'};
const date = {wed: '2026-11-25', sport: '2026-11-26', next: '2026-12-03'};
const meta = {label: 'test', startDate: '2026-11-01', endDate: '2026-12-31'};
const row = (teacher_id, day, period, group, subject, room = '321') =>
  ({teacher_id, teacher_name: 'ครูทดสอบ ' + teacher_id, day, period: String(period), group, subject, room, status: 'VERIFIED'});
const rows = [
  row(teacher.me, 'พุธ', 3, '4.2', 'ค1'),
  row(teacher.me, 'พุธ', 6, '4.7', 'ค2'),
  row(teacher.me, 'พฤหัสฯ', 1, '4.2', 'ค1', '323'),
  row(teacher.me, 'พฤหัสฯ', 4, '4.7', 'ค2', '328'),
  row(teacher.social, 'พุธ', 4, '4.2', 'ส1', '421'),
  row(teacher.language, 'พุธ', 7, '4.7', 'ญ1', '522'),
  row(teacher.social, 'ศุกร์', 9, '3.1', 'ส2'),
  row(teacher.cover, 'ศุกร์', 9, '4.2', 'ค3'),
  row(teacher.leave, 'ศุกร์', 9, '3.1', 'ค4')
];
S.deriveRows(rows, settings);
const leaves = [{teacherId: teacher.leave, days: [{date: date.wed, mode: 'ทั้งวัน', periods: []}]}];
const departments = {[teacher.me]: 'math', [teacher.cover]: 'math', [teacher.leave]: 'math', [teacher.social]: 'social'};
const make = (log = [], extra = {}, schedule = rows) => new S.ModeEngine(new S.Engine(schedule, settings, log),
  {meta, leaves, departments, skipDates: [date.sport], ...extra});
const request = {teacherId: teacher.me, date: date.wed, group: 'ม.4/2', period: 4, dateProposed: '2026-11-23'};
const result = make().findTargetSwaps(request);
assert.equal(result.ok, true);
assert.equal(result.target.teacherId, teacher.social);
assert.equal(result.options.some(x => x.offer.date === date.sport), false);
const swap = {...result.options.find(x => x.offer.date === date.next).entry, id: 'swap-42'};
assert.equal(swap.date_absent, date.next);
assert.equal(swap.date_back, date.wed);
assert.equal(swap.per_give, '1');
assert.equal(swap.week_offset, -1);
assert.equal(S.entryEndDate(swap), date.next);
assert.equal(context.__SWAP_LEDGER__.uncovered([{...swap, status: 'ยกเลิก'}]).length, 0);
assert.equal(make().teacherPreview([swap]).tables.length, 4);
const other = make().findTargetSwaps({...request, group: '4.7', period: 7});
assert.equal(other.options.find(x => x.offer.date === date.next).offer.period, '4');
assert.equal(make([swap]).findTargetSwaps(request).code, 'teacher-booked');
assert.equal(make([{...swap, status: 'ยกเลิก'}]).findTargetSwaps(request).options.some(x => x.offer.date === date.next), true);
assert.equal(make().findTargetSwaps({...request, date: '2026-11-31'}).code, 'invalid-target');
assert.equal(make().findTargetSwaps({...request, from: date.sport, to: date.sport}).options.length, 0);

const sameDayRows = rows.concat(row(teacher.me, 'พุธ', 2, '4.2', 'ค1'));
S.deriveRows(sameDayRows, settings);
const sameDay = make([], {}, sameDayRows).findTargetSwaps(request).options.find(x => x.offer.date === date.wed && x.offer.period === '2');
assert.equal(sameDay.impact.after.me1.count, sameDay.impact.before.me1.count);
assert.equal(sameDay.entry.per_give, '2');
const subgroupRows = rows.concat(row(teacher.subgroup, 'พุธ', 4, '4.2A', 'ศ1'));
S.deriveRows(subgroupRows, settings);
assert.equal(make([], {}, subgroupRows).findTargetSwaps(request).code, 'ambiguous-target');
assert.equal(make([], {}, subgroupRows).findTargetSwaps({...request, targetGroup: '4.2', targetTeacherId: teacher.social}).ok, true);

const coverage = {teacherId: teacher.me, date: date.wed, scope: 'same-department', query: teacher.cover,
  assignments: {3: teacher.cover}, leaveMode: 'ทั้งวัน'};
const plan = make().planSubstitutes(coverage);
assert.equal(plan.ok, true);
assert.equal(plan.entries[0].date_back, '');
assert.equal(plan.slots[0].candidates.length, 1);
assert.equal(plan.slots[0].candidates[0].teacherId, teacher.cover);
assert.equal(make().planSubstitutes({...coverage, query: ''}).slots[0].candidates.some(c => c.teacherId === teacher.leave), false);
assert.equal(make().planSubstitutes({...coverage, scope: 'all', query: '', assignments: {3: teacher.leave}}).issues[0].code, 'teacher-on-leave');
assert.equal(plan.uncovered[0].lesson.period, '6');
assert.equal(plan.leave.mode, 'ทั้งวัน');
assert.equal(make([], {departments: {}}).planSubstitutes(coverage).departmentMissing, true);
assert.equal(make().planSubstitutes({...coverage, assignments: {3:teacher.cover, 6:teacher.cover}})
  .slots[0].candidates[0].dayAfter.count, 2);

// Substitute score, worked out by hand (BASE 100, weekly baseline 20 at +1 per period under it,
// same class +10, same subject group +5). Wed p3 is ค1 for 4.2. Groups come from the subjects taught.
const derived = () => new S.ModeEngine(new S.Engine(rows, settings, []), {meta, leaves, skipDates: [date.sport]});
const p3 = q => derived().planSubstitutes({teacherId: teacher.me, date: date.wed, leaveMode: 'ทั้งวัน', scope: 'all', query: '', ...q}).slots[0];
const ranked = JSON.parse(JSON.stringify(p3().candidates.map(c => [c.teacherId, c.score])));
// cover: 1 → 2 periods that week (+18), teaches 4.2 (+10), teaches ค (+5) = 133
// social: 2 → 3 (+17), teaches 4.2 (+10) = 127 · language: 1 → 2 (+18) = 118 · leave: on leave, not listed
assert.deepEqual(ranked, [[teacher.cover, 133], [teacher.social, 127], [teacher.language, 118]]);
assert.equal(p3().candidates[0].scoreParts.reduce((n, x) => n + x.value, 0), 133);
// the subject filter narrows the list …
assert.equal(p3({scope: 'lesson-department'}).candidates.map(c => c.teacherId).join(), teacher.cover);
assert.equal(p3({scope: 'department', department: 'ส'}).candidates.map(c => c.teacherId).join(), teacher.social);
// … but a name search still reaches everyone
assert.equal(p3({scope: 'lesson-department', query: teacher.language}).candidates.map(c => c.teacherId).join(), teacher.language);
// a teacher picked through search keeps a score after the search is cleared (live test 2026-11-25: score was null)
const pickedOut = p3({scope: 'lesson-department', assignments: {3: teacher.language}});
assert.equal(pickedOut.entry.score, 118);
assert.equal(pickedOut.candidates.map(c => c.teacherId).join(), [teacher.cover, teacher.language].join());
// weights come from settings
const heavier = S.subScore({...settings, SUB_BONUS_SAME_CLASS: 30}, {dayAfter: {count: 1, run: 1}, weekAfter: 2, sameClass: true, sameDept: false, meeting: false, lunch: true});
assert.equal(heavier.score, 100 + 18 + 30 - 15);

const coverEntry = {...plan.entries[0], id: 'cover', status: 'อนุมัติแล้ว'};
const approved = {...swap, status: 'อนุมัติแล้ว'};
const tableRequest = {group: '4.2', from: date.wed, to: date.next,
  annotations: [{group: '4.2', date: date.wed, period: 4, label: 'สอบ'}]};
const table = make([approved, coverEntry]).studentTimetable(tableRequest);
assert.equal(table.weeks.length, 2);
const cell = (model, d, p) => model.weeks.flatMap(w => w.days).find(x => x.date === d).cells[p - 1];
assert.equal(cell(table, date.wed, 4).lessons[0].subject, 'ค1');
assert.equal(cell(table, date.wed, 4).lessons[0].room, '323');
assert.equal(cell(table, date.wed, 4).notes[0].label, 'สอบ');
assert.equal(cell(table, date.next, 1).lessons[0].subject, 'ส1');
assert.equal(cell(table, date.next, 1).lessons[0].room, '421');
assert.equal(cell(table, date.wed, 3).lessons[0].teacherId, teacher.cover);
assert.equal(cell(table, date.wed, 3).lessons[0].subject, 'ค1');
assert.equal(cell(make([swap]).studentTimetable(tableRequest), date.wed, 4).lessons[0].subject, 'ส1');
assert.equal(cell(make([{...approved, status: 'ยกเลิก'}]).studentTimetable(tableRequest), date.wed, 4).lessons[0].subject, 'ส1');
assert.equal(cell(make([], {}, subgroupRows).studentTimetable({...tableRequest, group:'4.2A'}), date.wed, 3).lessons[0].subject, 'ค1');
assert.equal(make([approved, {...approved, id: 'conflict'}]).studentTimetable(tableRequest).canExport, false);

const sem = {meta, schedule: rows, log: [], leaves, phones: {}};
S.STORE.data = {schemaVersion: 1, activeSemester: meta.label, settings, semesters: {[meta.label]: sem}};
const pick = {...request, targetTeacherId: teacher.social, targetGroup: '4.2', offerDate: date.next, offerPeriod: 1};
assert.equal(S.commitMode('target-swap', pick, {skipDates: [date.next]}).code, 'offer-unavailable');
assert.equal(sem.log.length, 0);
const saved = S.commitMode('target-swap', pick, {skipDates: [date.sport]});
assert.equal(saved.ok, true);
assert.equal(S.commitMode('target-swap', pick).ok, false);
const sub = {...coverage, assignments: {3: teacher.cover, 6: teacher.cover}};
assert.equal(S.commitMode('substitute', sub).issues[0].code, 'absent-teacher-booked');
sem.log[0].status = 'ยกเลิก';
rejectSave = true;
assert.equal(S.commitMode('substitute', sub).code, 'save-failed');
assert.equal(sem.log.length, 1);
assert.equal(sem.leaves.length, 1);
rejectSave = false;
assert.equal(S.commitMode('substitute', sub).entries.length, 2);
assert.equal(sem.log.length, 3);
assert.equal(sem.leaves.find(x => x.teacherId === teacher.me).days[0].mode, 'ทั้งวัน');
assert.equal(S.activeModes().planSubstitutes({...coverage, assignments: {}}).uncovered.length, 0);
const partial = S.commitMode('substitute', {teacherId: teacher.me, date: date.next,
  selectedPeriods: [1], assignments: {1: teacher.cover}});
assert.equal(partial.ok, true);
const reopened = S.activeModes().planSubstitutes({teacherId: teacher.me, date: date.next});
assert.equal(reopened.slots.find(s => s.lesson.period === '4').state, 'unselected');
assert.equal(reopened.leave.mode, 'บางคาบ');
sem.meta.archived = true;
assert.equal(S.commitMode('substitute', sub).code, 'read-only');
console.log('Schedule modes passed');
