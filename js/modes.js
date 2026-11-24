/* Headless scheduling workflows. Load after core.js and dynamic.js. */
(function (root) {
  'use strict';
  const S = root.SWAP;
  const periods = Array.from({length: 9}, (_, i) => String(i + 1));
  const approved = 'อนุมัติแล้ว';

  function isoOK(date) {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      && S.ttAddDays(date, 0) === date;
  }
  function dateOK(date) {
    return isoOK(date) && !!S.weekdayThai(date);
  }
  function groupKey(group) {
    return String(group || '').trim().replace(/^ม\.?\s*/, '').replace('/', '.');
  }
  function groupsOf(group) {
    return String(group || '').split(',').map(groupKey).filter(Boolean);
  }
  function groupMatches(query, group) {
    return groupsOf(group).some(key => key === query || key.replace(/^([1-6]\.\d+).*/, '$1') === query);
  }
  function groupOverlaps(a, b) {
    return groupsOf(a).some(x => groupMatches(x, b)) || groupsOf(b).some(x => groupMatches(x, a));
  }
  function error(code, details) {
    return Object.assign({ok: false, code}, details);
  }
  function lesson(row, date) {
    return {
      date, period: String(row.period), group: row.group, subject: row.subject || '', room: row.room || '',
      teacherId: row.teacher_id, teacherName: row.teacher_name || row.teacher_id
    };
  }
  function proposal(source, partner, dateProposed, target) {
    return {
      status: 'เสนอ', kind: target ? 'แลกคาบ' : 'สอนแทน',
      date_proposed: dateProposed, date_absent: source.date, day_give: S.weekdayThai(source.date), per_give: source.period,
      me_id: source.teacherId, me_name: source.teacherName,
      group_give: source.group, subject_give: source.subject, room_give: source.room,
      y_id: partner.teacherId, y_name: partner.teacherName,
      date_back: target ? target.date : '', day_back: target ? S.weekdayThai(target.date) : '', per_back: target ? target.period : '',
      y_sub: target ? target.subject : '', y_room: target ? target.room : '', room_back: target ? target.room : '',
      week_offset: target ? (Date.parse(S.ttWeekStart(target.date)) - Date.parse(S.ttWeekStart(source.date))) / 604800000 : null,
      score: null, warnings: []
    };
  }

  class ModeEngine {
    constructor(engine, {meta = {}, leaves = [], departments = {}, skipDates = [], teachers = []} = {}) {
      this.engine = engine;
      this.meta = meta;
      this.ledger = S.buildLedger(engine.log);
      this.groupClaims = new Map();
      for (const claim of this.ledger.claims) {
        if (claim.kind !== 'HANDOVER' || !claim.entry.group_give) continue;
        const key = claim.date + '|' + claim.per;
        const groups = this.groupClaims.get(key) || [];
        groups.push(claim.entry.group_give);
        this.groupClaims.set(key, groups);
      }
      this.dynamic = new S.Dyn(engine, engine.log);
      this.skipDates = new Set(skipDates);
      this.leaves = new Map();
      this.leaveDays = new Map();
      this.teachers = new Map();
      for (const row of engine.rows) this.teachers.set(row.teacher_id, row.teacher_name || row.teacher_id);
      for (const teacher of teachers) this.teachers.set(teacher.teacherId, teacher.teacherName || teacher.teacherId);
      // teacher id → Set of learning-area groups. Given explicitly, or derived from every subject they teach.
      const given = arguments[1] && arguments[1].departments;
      const sets = given ? Object.fromEntries(Object.entries(given).map(([id, d]) => [id, [].concat(d || [])]))
        : Object.fromEntries(Object.entries(S.deptSets(engine.rows)).map(([id, d]) => [id, Object.keys(d)]));
      this.departments = new Map(Object.entries(sets).map(([id, list]) => [id, new Set(list)]));
      for (const round of leaves) {
        for (const day of round.days || []) {
          const key = round.teacherId + '|' + day.date;
          const blocked = this.leaves.get(key) || new Set();
          this.leaveDays.set(key, day);
          for (const period of periods) {
            if (day.mode === 'ทั้งวัน' || (day.mode === 'ครึ่งเช้า' && +period <= 4)
                || (day.mode === 'ครึ่งบ่าย' && +period >= 5)
                || (day.periods || []).some(p => String(p) === period)) blocked.add(period);
          }
          this.leaves.set(key, blocked);
        }
      }
    }

    inSemester(date) {
      return (!this.meta.startDate || date >= this.meta.startDate) && (!this.meta.endDate || date <= this.meta.endDate);
    }

    leaveAt(teacherId, date, period) {
      return !!this.leaves.get(teacherId + '|' + date)?.has(String(period));
    }

    groupBooked(group, date, period) {
      return (this.groupClaims.get(date + '|' + period) || []).some(existing => groupOverlaps(group, existing));
    }

    // A given-away lesson may free its teacher for covering another class.
    coverAt(teacherId, date, period) {
      const {ledger, engine} = this;
      const day = S.weekdayThai(date);
      if (this.leaveAt(teacherId, date, period)) return error('teacher-on-leave', {teacherId, date, period});
      if (ledger.busyAt(teacherId, date, period).length) return error('teacher-booked', {teacherId, date, period});
      const base = engine.free(teacherId, day, period);
      const handedOver = ledger.handoverAt(teacherId, date, period).some(c => !S.isSubOnly(c.entry));
      if (!base.ok && !handedOver) {
        return error('teacher-busy', {teacherId, date, period});
      }
      return {ok: true, meeting: !!base.warn, lunch: engine.displayLunch(teacherId, day) === +period};
    }

    sourceAt(teacherId, date, period) {
      return this.engine.validateSource(teacherId, S.weekdayThai(date), period);
    }

    findTargetSwaps(request) {
      const {teacherId, date, targetTeacherId, dateProposed = S.todayISO()} = request;
      const period = String(request.period);
      const group = groupKey(request.group);
      if (!dateOK(date) || !isoOK(dateProposed) || !this.inSemester(date) || !periods.includes(period) || !group || !this.teachers.has(teacherId)) {
        return error('invalid-target');
      }
      const skipped = new Set([...this.skipDates, ...(request.skipDates || [])]);
      if (skipped.has(date)) return error('date-excluded', {date});
      const {engine, ledger} = this;
      const targets = engine.rows.filter(row => row.day === S.weekdayThai(date) && String(row.period) === period
        && row.teacher_id !== teacherId && row.is_eligible === 'TRUE' && groupMatches(group, row.group)
        && (!targetTeacherId || row.teacher_id === targetTeacherId)
        && (!request.targetGroup || groupKey(row.group) === groupKey(request.targetGroup)))
        .map(row => lesson(row, date));
      if (targets.length !== 1) return error(targets.length ? 'ambiguous-target' : 'target-not-found', {targets});
      const target = targets[0];
      const receiver = this.coverAt(teacherId, date, period);
      if (!receiver.ok) return receiver;
      if (this.leaveAt(target.teacherId, date, period)) return error('teacher-on-leave', {teacherId: target.teacherId, date, period});
      if (ledger.at(target.teacherId, date, period).length || this.groupBooked(target.group, date, period)) {
        return error('target-booked', {teacherId: target.teacherId, date, period});
      }

      const start = request.from || S.ttWeekStart(date);
      const end = request.to || S.ttAddDays(S.ttWeekStart(date), 11);
      if (!isoOK(start) || !isoOK(end) || start > end) return error('invalid-range');
      const first = this.meta.startDate && start < this.meta.startDate ? this.meta.startDate : start;
      const last = this.meta.endDate && end > this.meta.endDate ? this.meta.endDate : end;
      const rows = engine.rows.filter(row => row.teacher_id === teacherId && row.group === target.group && row.is_eligible === 'TRUE');
      const options = [];
      for (let offerDate = first; offerDate && offerDate <= last; offerDate = S.ttAddDays(offerDate, 1)) {
        if (skipped.has(offerDate)) continue;
        for (const row of rows) {
          if (row.day !== S.weekdayThai(offerDate)) continue;
          const offer = lesson(row, offerDate);
          if (offerDate === date && offer.period === period) continue;
          if (this.leaveAt(teacherId, offerDate, offer.period) || ledger.at(teacherId, offerDate, offer.period).length
              || this.groupBooked(offer.group, offerDate, offer.period)) continue;
          const cover = this.coverAt(target.teacherId, offerDate, offer.period);
          if (!cover.ok) continue;
          const lunchP = +row.lunch_period || +engine.settings.LUNCH_SENIOR_PERIOD;
          const nearOffer = engine.neighbors(target.group, row.day, +offer.period, lunchP);
          const nearTarget = engine.neighbors(target.group, S.weekdayThai(date), +period, lunchP);
          const walking = (neighbors, before, after) =>
            engine.cross(neighbors.prev, after) + engine.cross(after, neighbors.next)
            - engine.cross(neighbors.prev, before) - engine.cross(before, neighbors.next);
          const giveup_d = walking(nearOffer, offer.room, target.room);
          const giveback_d = walking(nearTarget, target.room, offer.room);
          const walk_total = giveup_d + giveback_d;
          const candidate = {
            Yid: target.teacherId, day2: S.weekdayThai(date), per2: period, warnMe: receiver.meeting, warnY: cover.meeting,
            giveup_d, giveback_d, walk_total, walk_x2: giveup_d > 0 && giveback_d > 0,
            walk_term: -engine.settings.WALKING_PENALTY_PER_NEW_CROSSING * Math.max(0, walk_total)
              + engine.settings.WALKING_BONUS_PER_REMOVED_CROSSING * Math.max(0, -walk_total)
          };
          const context = {me: teacherId, date1: offerDate, per1: offer.period, lunchP};
          const impact = this.dynamic.eval(candidate, context, date, true);
          this.dynamic.apply(candidate, context, impact);
          const entry = proposal(offer, target, dateProposed, target);
          entry.workflow = 'target-swap';
          candidate.warn_retro = offerDate < dateProposed || date < dateProposed;
          entry.score = impact.score;
          entry.warnings = S.compactItems(candidate);
          entry.impact_tag = entry.warnings[0] || '—';
          options.push({offer, entry, impact, warnings: entry.warnings, lunch: {requester: receiver.lunch, partner: cover.lunch}});
        }
      }
      options.sort((a, b) => b.impact.score - a.impact.score || a.offer.date.localeCompare(b.offer.date) || +a.offer.period - +b.offer.period);
      return {ok: true, target, options};
    }

    planSubstitutes({teacherId, date = S.todayISO(), dateProposed = S.todayISO(), selectedPeriods, assignments = {},
        scope = 'all', department, query = '', skipDates = [], leaveMode}) {
      if (!dateOK(date) || !isoOK(dateProposed) || !this.inSemester(date) || !this.teachers.has(teacherId)) return error('invalid-absence');
      if (this.skipDates.has(date) || skipDates.includes(date)) return error('date-excluded', {date});
      if (!['all', 'same-department', 'department', 'lesson-department'].includes(scope)) return error('invalid-scope');
      const day = S.weekdayThai(date);
      const knownLeave = this.leaveDays.get(teacherId + '|' + date);
      const inferredMode = selectedPeriods != null ? 'บางคาบ' : knownLeave?.mode || 'ทั้งวัน';
      const mode = leaveMode || inferredMode;
      if (!S.LEAVE_MODES.includes(mode)) return error('invalid-leave-mode');
      const inLeave = period => mode === 'ทั้งวัน' || mode === 'บางคาบ'
        || (mode === 'ครึ่งเช้า' ? +period <= 4 : +period >= 5);
      // same-department: any group the absent teacher teaches; department: one named group;
      // lesson-department: the group of each period's own subject
      const mine = this.departments.get(teacherId);
      const wantedFor = lesson => scope === 'same-department' ? mine
        : scope === 'department' ? (department ? new Set([department]) : null)
          : scope === 'lesson-department' ? (S.deptOf(lesson.subject) ? new Set([S.deptOf(lesson.subject)]) : null) : null;
      const wanted = scope === 'same-department' ? (mine && mine.size ? mine : null) : true;
      const q = query.trim().toLowerCase();
      const selection = selectedPeriods ?? (mode === 'บางคาบ' ? knownLeave?.periods : null);
      const selected = selection == null ? null : new Set(selection.map(String));
      const entries = [];
      const issues = [];
      const slots = [];
      const {engine, ledger} = this;
      const invalidPeriods = new Set(selected || []);
      for (const period of periods) {
        if (inLeave(period) && (mode !== 'บางคาบ' || !selected || selected.has(period))
            && ledger.busyAt(teacherId, date, period).length) {
          issues.push(error('absent-teacher-booked', {teacherId, date, period}));
        }
      }
      for (const period of periods) {
        const {source, valid} = this.sourceAt(teacherId, date, period);
        if (valid !== 'VALID') continue;
        if (inLeave(period)) invalidPeriods.delete(period);
        const original = lesson(source, date);
        const requested = inLeave(period) && (!selected || selected.has(period));
        const previous = ledger.handoverAt(teacherId, date, period);
        const groupBooked = this.groupBooked(original.group, date, period);
        const assignedId = requested && Object.prototype.hasOwnProperty.call(assignments, period) ? assignments[period] : null;
        const slot = {
          lesson: original, requested, state: previous.length ? 'covered' : groupBooked && requested ? 'conflict' : requested ? 'uncovered' : 'unselected',
          existing: previous.map(c => c.entry), candidates: [], entry: null
        };
        slots.push(slot);
        if (assignedId) {
          const check = assignedId === teacherId || !this.teachers.has(assignedId)
            ? error('invalid-substitute', {teacherId: assignedId, date, period})
            : previous.length ? error('lesson-already-covered', {teacherId, date, period})
              : groupBooked ? error('group-slot-conflict', {group: original.group, date, period})
                : this.coverAt(assignedId, date, period);
          if (!check.ok) issues.push(check);
          else {
            slot.entry = proposal(original, {teacherId: assignedId, teacherName: this.teachers.get(assignedId)}, dateProposed);
            slot.entry.workflow = 'substitute';
            slot.entry.impact_tag = 'สอนแทน ไม่ต้องคืน';
            slot.state = 'assigned';
            entries.push(slot.entry);
          }
        }
        if (!requested || previous.length || groupBooked) continue;
        const belongs = new Set(engine.rows.filter(row => row.status !== 'NON_TEACHING' && row.group === original.group).map(row => row.teacher_id));
        const want = wantedFor(original), lessonDept = S.deptOf(original.subject);
        const inScope = depts => scope === 'all' || (!!want && [...want].some(d => depts.has(d)));
        for (const [id, name] of this.teachers) {
          const depts = this.departments.get(id) || new Set();
          // a name search looks through everyone: the subject filter narrows the list, it does not lock it
          // the picked teacher is always listed, so the saved entry gets a score even when found by search
          if (id === teacherId || (id !== assignedId && (!(`${id} ${name}`.toLowerCase().includes(q)) || (!q && !inScope(depts))))) continue;
          const check = this.coverAt(id, date, period);
          if (!check.ok) continue;
          slot.candidates.push({teacherId: id, teacherName: name, department: [...depts][0] || null, departments: [...depts],
            familiarGroup: belongs.has(id), sameDept: !!lessonDept && depts.has(lessonDept), inScope: inScope(depts),
            meeting: check.meeting, lunch: check.lunch});
        }
      }
      for (const period of invalidPeriods) issues.push(error('invalid-absence-period', {teacherId, date, period}));
      // Count other draft assignments in this plan when showing a candidate's workload.
      const draft = new S.Dyn(engine, engine.log.concat(entries));
      for (const slot of slots) {
        const {period} = slot.lesson;
        if (!slot.candidates.length) continue;
        const lunchP = +engine.row(teacherId, day, period).lunch_period || +engine.settings.LUNCH_SENIOR_PERIOD;
        for (const c of slot.candidates) {
          const key = c.teacherId + '|' + date + '|' + period;
          c.dayBefore = draft.day(c.teacherId, date, lunchP, {[key]: 0}, true);
          c.dayAfter = draft.day(c.teacherId, date, lunchP, {[key]: 1}, true);
          c.week = draft.week(c.teacherId, date, true);
          if (slot.entry?.y_id === c.teacherId) c.week.count--;
          c.overload = c.dayAfter.count > +engine.settings.DAY_OVERLOAD_THRESHOLD;
          c.consecutive = c.dayAfter.run >= +engine.settings.CONSECUTIVE_THRESHOLD;
          const sc = S.subScore(engine.settings, {dayAfter: c.dayAfter, weekAfter: c.week.count + 1,
            sameClass: c.familiarGroup, sameDept: c.sameDept, meeting: c.meeting, lunch: c.lunch});
          c.score = sc.score; c.scoreParts = sc.parts;
        }
        const chosen = slot.entry && slot.candidates.find(c => c.teacherId === slot.entry.y_id);
        if (chosen) slot.entry.score = chosen.score;
        slot.candidates.sort((a, b) => b.score - a.score || a.dayBefore.count - b.dayBefore.count
          || a.week.count - b.week.count || a.teacherId.localeCompare(b.teacherId));
      }
      const leave = {date, mode, periods: slots.filter(s => inLeave(s.lesson.period)
        && (mode !== 'บางคาบ' || s.requested)).map(s => s.lesson.period)};
      return {ok: issues.length === 0, slots, issues, entries, leave, uncovered: slots.filter(s => s.state === 'uncovered'),
        departmentMissing: scope === 'same-department' && !wanted};
    }

    studentTimetable({group, from, to = from, annotations = [], updatedAt = new Date().toISOString()}) {
      const key = groupKey(group);
      if (!key || !isoOK(from) || !isoOK(to) || from > to) return error('invalid-timetable-range');
      if (!this.engine.rows.some(row => groupOverlaps(key, row.group))) return error('unknown-group');
      const start = this.meta.startDate && from < this.meta.startDate ? this.meta.startDate : from;
      const end = this.meta.endDate && to > this.meta.endDate ? this.meta.endDate : to;
      if (start > end) return error('outside-semester');
      const firstWeek = S.ttWeekStart(start), lastWeek = S.ttWeekStart(end);
      const changesBySlot = new Map();
      const conflicts = [];
      const weeks = [];
      const lastDay = S.ttAddDays(lastWeek, 4);
      const relevant = (date, period) => dateOK(date) && date >= firstWeek && date <= lastDay
        && this.inSemester(date) && periods.includes(String(period));
      const originalAt = (teacherId, date, period, group, subject, room, name) => {
        const row = this.engine.row(teacherId, S.weekdayThai(date), period);
        const base = row && groupOverlaps(row.group, group) ? row : {};
        return {date, period: String(period), group, subject: subject || base.subject || '',
          room: room || base.room || '', teacherId, teacherName: name || base.teacher_name || teacherId};
      };
      const apply = (entry, before, replacement, type) => {
        if (!relevant(before.date, before.period)) return;
        const slot = before.date + '|' + before.period;
        const changes = changesBySlot.get(slot) || [];
        const after = {...replacement, date: before.date, period: before.period, group: before.group};
        for (const change of changes) {
          if (groupOverlaps(before.group, change.before.group)) {
            conflicts.push({code: 'group-slot-conflict', date: before.date, period: before.period,
              groups: [change.before.group, before.group], entryIds: [change.entryId, entry.id]});
          }
        }
        changes.push({type, entryId: entry.id, before, after,
          movedFrom: type === 'swap' ? {date: replacement.date, period: replacement.period} : null});
        changesBySlot.set(slot, changes);
      };

      for (const entry of this.engine.log) {
        if (!entry || entry.status !== approved || !groupOverlaps(key, entry.group_give)) continue;
        const da = S.ledDate(entry.date_absent);
        const source = originalAt(entry.me_id, da, entry.per_give,
          entry.group_give, entry.subject_give, entry.room_give, entry.me_name);
        if (S.isSubOnly(entry)) {
          apply(entry, source, {...source, teacherId: entry.y_id || null, teacherName: entry.y_name || entry.y_id || ''}, 'substitute');
        } else {
          const db = S.ledDate(entry.date_back);
          const target = originalAt(entry.y_id, db, entry.per_back,
            entry.group_give, entry.y_sub, entry.y_room || entry.room_back, entry.y_name);
          if ((!dateOK(da) || !periods.includes(source.period)) && relevant(db, target.period)
              || (!dateOK(db) || !periods.includes(target.period)) && relevant(da, source.period)) {
            const end = relevant(da, source.period) ? source : target;
            conflicts.push({code: 'invalid-swap-end', date: end.date, period: end.period, entryIds: [entry.id]});
            continue;
          }
          apply(entry, source, target, 'swap');
          apply(entry, target, source, 'swap');
        }
      }

      const schedule = this.engine.rows.filter(row => groupOverlaps(key, row.group));
      for (let week = firstWeek; week && week <= lastWeek; week = S.ttAddDays(week, 7)) {
        const days = [];
        const weekChanges = [];
        for (const day of S.DAYS) {
          const date = S.ttDateForDay(week, day);
          if (!this.inSemester(date)) continue;
          const cells = [];
          for (const period of periods) {
            const base = schedule.filter(row => row.day === day && String(row.period) === period).map(row => lesson(row, date));
            const changes = changesBySlot.get(date + '|' + period) || [];
            for (const change of changes) {
              const matching = base.filter(row => groupOverlaps(row.group, change.before.group));
              if (matching.length && !matching.some(row => row.teacherId === change.before.teacherId)) {
                conflicts.push({code: 'source-lesson-changed', date, period, entryIds: [change.entryId]});
              }
            }
            const hasConflict = conflicts.some(c => c.date === date && c.period === period);
            const lessons = hasConflict ? base : base.filter(row => !changes.some(c =>
              row.teacherId === c.before.teacherId && groupOverlaps(row.group, c.before.group))).concat(changes.map(c => c.after));
            const notes = annotations.filter(note => note.date === date && String(note.period) === period
              && groupOverlaps(key, note.group) && lessons.some(l => groupOverlaps(l.group, note.group))
              && typeof note.label === 'string').map(note => ({group: note.group, label: note.label}));
            cells.push({period, lessons, changes, notes, conflict: hasConflict});
            weekChanges.push(...changes);
          }
          days.push({day, date, cells});
        }
        if (days.length) weeks.push({weekStart: week, weekEnd: S.ttAddDays(week, 4), days, changes: weekChanges});
      }
      return {ok: true, group: key, from, to, updatedAt, weeks, conflicts, canExport: weeks.length > 0 && conflicts.length === 0};
    }

    teacherPreview(entries) {
      const ids = new Set(entries.map(entry => entry.id).filter(Boolean));
      const before = this.engine.log.filter(entry => entry && entry.status === approved && !ids.has(entry.id));
      const after = before.concat(entries.filter(entry => entry.status !== 'ยกเลิก'));
      const weeksByTeacher = new Map();
      for (const entry of entries) {
        if (entry.status === 'ยกเลิก') continue;
        for (const teacherId of [entry.me_id, entry.y_id].filter(Boolean)) {
          const weeks = weeksByTeacher.get(teacherId) || new Set();
          for (const date of [entry.date_absent, entry.date_back].map(S.ledDate).filter(dateOK)) {
            weeks.add(S.ttWeekStart(date));
          }
          weeksByTeacher.set(teacherId, weeks);
        }
      }
      const tables = [];
      for (const [teacherId, weeks] of weeksByTeacher) {
        for (const weekStart of [...weeks].sort()) tables.push({teacherId, weekStart});
      }
      return {before, after, tables};
    }
  }

  function activeModes(options = {}) {
    const sem = S.STORE.activeSemester();
    if (!sem) return null;
    S.ensureSemesterDerived(sem, S.STORE.data.settings);
    const engine = S.engineForActive();
    if (!engine) return null;
    return new ModeEngine(engine, {...options, meta: sem.meta, leaves: sem.leaves});
  }

  // Rebuild from the active semester at commit time so changes since preview are checked.
  function commit(mode, request, options) {
    const sem = S.STORE.activeSemester();
    const modes = activeModes(options);
    if (!modes) return error('no-semester');
    if (S.isReadOnly()) return error('read-only', {error: S.readOnlyText()});
    if (request.semesterLabel && request.semesterLabel !== sem.meta.label) return error('semester-changed');
    let entries, leave;
    if (mode === 'target-swap') {
      const resolved = modes.findTargetSwaps(request);
      if (!resolved.ok) return resolved;
      if (!request.targetTeacherId || !request.targetGroup) return error('target-selection-required');
      const choice = resolved.options.find(x => x.offer.date === request.offerDate
        && x.offer.period === String(request.offerPeriod));
      if (!choice) return error('offer-unavailable', {date: request.offerDate, period: String(request.offerPeriod)});
      entries = [choice.entry];
    } else if (mode === 'substitute') {
      const plan = modes.planSubstitutes(request);
      if (!plan.ok) return plan.code ? plan : error('invalid-assignments', {issues: plan.issues});
      entries = plan.entries;
      leave = plan.leave;
    } else {
      return error('invalid-mode');
    }
    if (!entries.length) return error('no-assignments');

    const log = sem.log || [];
    const next = log.slice();
    const created_at = new Date().toISOString();
    const ids = new Set(next.filter(Boolean).map(entry => entry.id));
    for (const entry of entries) {
      const conflicts = S.ledgerConflicts(next, entry);
      if (conflicts.length) return error('slot-conflict', {conflicts, error: S.ledgerConflictText(conflicts[0])});
      let suffix = ids.size;
      let id;
      do { id = 'log_mode_' + Date.now() + '_' + suffix++; } while (ids.has(id));
      ids.add(id);
      Object.assign(entry, {id, created_at, y_phone: S.phoneFor(entry.y_id) || ''});
      next.push(entry);
    }
    const previous = sem.log, previousLeaves = sem.leaves;
    if (leave && request.recordLeave !== false) {
      const leaves = (sem.leaves || []).slice();
      const i = leaves.findIndex(r => r.teacherId === request.teacherId && r.days.some(d => d.date === leave.date));
      if (i === -1) {
        leaves.push({id: 'lv_' + entries[0].id, teacherId: request.teacherId, createdAt: created_at, note: '', days: [leave]});
      } else {
        const round = leaves[i];
        const days = round.days.map(d => {
          if (d.date !== leave.date) return d;
          const mode = d.mode === leave.mode || leave.mode === 'บางคาบ' ? d.mode
            : d.mode === 'บางคาบ' ? leave.mode : 'ทั้งวัน';
          return {...d, mode, periods: [...new Set((d.periods || []).map(String).concat(leave.periods))].sort()};
        });
        leaves[i] = {...round, days};
      }
      sem.leaves = leaves;
    }
    sem.log = next;
    const saved = S.STORE.save();
    if (!saved.ok) {
      sem.log = previous;
      sem.leaves = previousLeaves;
      return error('save-failed', {error: saved.error});
    }
    return {ok: true, entries};
  }

  S.ModeEngine = ModeEngine;
  S.activeModes = activeModes;
  S.commitMode = commit;
})(window);
