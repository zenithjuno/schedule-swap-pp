/* หน้า “หาคนแทน” — the selection workspace for ONE absent period.
   Left: every eligible candidate, real dates first. Right: the chosen
   candidate's detail, give-back week, caveats, and the save / simulate actions.
   Candidate generation and scoring are core.js (unchanged engine). */
(function(){
  'use strict';
  var A=window.APP, S=A.S, STORE=A.STORE, h=A.h, ui=A.ui, icon=A.icon;
  var pk=A.pk={slot:'', mode:'swap', sel:null, chosen:{}, q:'', sort:'rank', dept:'all'};
  var cur=null;   // last computed context, read by the handlers

  function ckey(c){ return c.Yid+'|'+(c.day2||'')+'|'+(c.per2||''); }
  function clashOK(me, date, per2){ var lp=S.leavePeriodsFor(me, date); return lp!==null && lp.indexOf(String(per2))<0; }
  function allowed(c, ctx){
    return c.available_offsets.filter(function(off){ var i=c.offset_info[off]; return !i.blocked && inSem(i.giveback) && !(i.clash && !clashOK(ctx.me, ctx.date, c.per2)); });
  }
  // a give-back outside the semester's own dates is not a real option
  function inSem(iso){ var m=(A.sem()||{}).meta||{}; return !(m.startDate && iso<m.startDate) && !(m.endDate && iso>m.endDate); }
  function wkLabel(off){ off=+off;
    return off===0?'สัปดาห์เดียวกับวันลา':off===1?'สัปดาห์ถัดไป':off===-1?'สัปดาห์ก่อนหน้า':off>1?('อีก '+off+' สัปดาห์'):('ก่อนหน้า '+(-off)+' สัปดาห์'); }
  function settle(c, ctx){
    var a=allowed(c, ctx); c._allowed=a;
    if(!a.length){ c._off=null; return; }
    // what each possible week would really look like, counting swaps already on the books
    var ev={}, base={};
    a.forEach(function(o){ var d2=c.offset_info[o].giveback; ev[o]=ctx.dyn.eval(c, ctx.p, d2, true); base[o]=ctx.dyn.eval(c, ctx.p, d2, false); });
    c._ev=ev; c._base=base;
    function worse(o){ return ev[o].score<base[o].score; }       // tighter ONLY because of swaps already made
    var ch=pk.chosen[ckey(c)], off=null;
    if(ch!=null && a.indexOf(ch)>=0) off=ch;
    else {
      // the engine's preferred week first, then the nearest; skip weeks made tighter by existing swaps
      var order=a.slice().sort(function(x,y){ return Math.abs(x-c.default_offset)-Math.abs(y-c.default_offset); }), i;
      for(i=0;i<order.length;i++) if(!worse(order[i])){ off=order[i]; break; }
      if(off===null){ off=order[0]; order.forEach(function(o){ if(ev[o].score>ev[off].score) off=o; }); }
    }
    c._off=off; c._gb=c.offset_info[off].giveback; c._worse=worse(off);
    ctx.dyn.apply(c, ctx.p, ev[off]);
    c.warn_absence_clash=c.offset_info[off].clash?1:0;
    c.warn_retro=(ui.dateProposed && c._gb<ui.dateProposed)?1:0;
    c.warn_self_collision=0;                 // an allowed offset is never held by the absent teacher
  }

  function tags(c, ctx){
    var CONS=+STORE.data.settings.CONSECUTIVE_THRESHOLD, t=[], me=ctx.meShort, y=A.short(c.Yname);
    if(c.warn_absence_clash) t.push({t:'คืนในวันลา', lv:'warn'});
    var mr=Math.max(c.runMeD1,c.runMeD2), yr=Math.max(c.runYD1,c.runYD2);
    if(mr>=CONS) t.push({t:me+' ติด '+mr+' คาบ', lv:'warn'});
    if(yr>=CONS) t.push({t:y+' ติด '+yr+' คาบ', lv:'warn'});
    if(c.overload_n>0) t.push({t:'ภาระเกินเกณฑ์', lv:'warn'});
    if(c._worse) t.push({t:'วันนั้นแน่นขึ้น (มีคาบแลกอยู่แล้ว)', lv:'warn'});
    if(c.warnMe) t.push({t:me+' งดประชุม', lv:'info'});
    if(c.warnY) t.push({t:y+' งดประชุม', lv:'info'});
    if(c.walk_total>0) t.push({t:'นักเรียนเปลี่ยนอาคาร'+(c.walk_x2?' ×2':''), lv:'info'});
    if(c.warn_retro) t.push({t:'ย้อนหลัง', lv:'info'});
    return t;
  }
  function caveats(c, ctx){
    var CONS=+STORE.data.settings.CONSECUTIVE_THRESHOLD, o=[], me=ctx.meShort, y=A.short(c.Yname);
    var d1=A.dMid(ctx.date), d2=A.dMid(c._gb);
    var x=(c._dyn&&c._dyn.extra)||{};
    if(x.me1>0) o.push(me+'มีคาบที่แลกมาลง'+d1+' อยู่แล้ว '+x.me1+' คาบ (นับรวมข้อเสนอและรออนุมัติ)');
    if(x.me2>0) o.push(me+'มีคาบที่แลกมาลง'+d2+' อยู่แล้ว '+x.me2+' คาบ (นับรวมข้อเสนอและรออนุมัติ)');
    if(x.y1>0) o.push(y+'มีคาบที่แลกมาลง'+d1+' อยู่แล้ว '+x.y1+' คาบ');
    if(x.y2>0) o.push(y+'มีคาบที่แลกมาลง'+d2+' อยู่แล้ว '+x.y2+' คาบ');
    if(c.warn_absence_clash) o.push('วันสอนคืนเป็นวันเดียวกับวันลา ('+d1+') — ทำได้เพราะ'+me+'ไม่ได้ลาคาบ '+c.per2+' แต่ควรตรวจอีกครั้ง');
    if(c.runMeD1>=CONS) o.push(me+'จะสอนติดกัน '+c.runMeD1+' คาบ ใน'+d1);
    if(c.runMeD2>=CONS) o.push(me+'จะสอนติดกัน '+c.runMeD2+' คาบ ใน'+d2+' (วันสอนคืน)');
    if(c.runYD1>=CONS) o.push(y+'จะสอนติดกัน '+c.runYD1+' คาบ ใน'+d1+' (วันที่มาสอนแทน)');
    if(c.runYD2>=CONS) o.push(y+'จะสอนติดกัน '+c.runYD2+' คาบ ใน'+d2);
    if(c.overload_n>0) o.push('หลังแลกมี '+c.overload_n+' วัน-ครู ที่สอนเกิน '+STORE.data.settings.DAY_OVERLOAD_THRESHOLD+' คาบต่อวัน');
    if(c.warnMe) o.push(me+'มีประชุมในคาบสอนคืน ('+d2+' คาบ '+c.per2+') — ต้องงดประชุม');
    if(c.warnY) o.push(y+'มีประชุมในคาบที่มาสอนแทน ('+d1+' คาบ '+ctx.per+') — ต้องงดประชุม');
    if(c.giveup_d>0) o.push('นักเรียน '+A.cls(ctx.G)+' ต้องเปลี่ยนอาคารเพิ่มใน'+d1+' (ห้อง '+c.R1+' → '+c.Yroom+')');
    if(c.giveback_d>0) o.push('นักเรียน '+A.cls(ctx.G)+' ต้องเปลี่ยนอาคารเพิ่มใน'+d2+' (ห้อง '+c.Yroom+' → '+c.R1+')');
    if(c.warn_retro) o.push('วันสอนคืนอยู่ก่อนวันที่เสนอ ('+A.dMid(ui.dateProposed)+') — เป็นการบันทึกย้อนหลัง');
    return o;
  }

  function swapEntry(c, ctx, giveAway){
    var off=giveAway?null:c._off, src=ctx.src;
    return { id:'log_'+Date.now()+'_'+c.idx, created_at:new Date().toISOString(), date_proposed:ui.dateProposed||'', status:'เสนอ',
      me_id:ctx.me, me_name:ctx.meName, day_give:ctx.day, per_give:String(ctx.per),
      subject_give:src.subject||'', group_give:ctx.G||'', room_give:c.R1||src.room||'', date_absent:ctx.date,
      kind: giveAway?'สอนแทน':'แลกคาบ',
      y_id:c.Yid, y_name:c.Yname, y_phone:S.phoneFor(c.Yid)||'',
      day_back: giveAway?'':c.day2, per_back: giveAway?'':String(c.per2),
      y_sub: giveAway?'':(c.Ysub||''), y_room: giveAway?'':(c.Yroom||''), room_back: giveAway?'':(c.Yroom||''),
      date_back: giveAway?'':c._gb, week_offset:off,
      score: giveAway?null:c.SCORE,
      impact_tag: giveAway?'ยกคาบให้ (ไม่รับคืน)':(S.compactItems(c).slice(0,1)[0]||'—'),
      warnings: giveAway?[]:S.compactItems(c) };
  }
  function subEntry(s, ctx){
    var src=ctx.src;
    return { id:'log_'+Date.now()+'_s', created_at:new Date().toISOString(), date_proposed:ui.dateProposed||'', status:'เสนอ',
      me_id:ctx.me, me_name:ctx.meName, day_give:ctx.day, per_give:String(ctx.per),
      subject_give:src.subject||'', group_give:src.group||'', room_give:src.room||'', date_absent:ctx.date,
      kind:'สอนแทน', y_id:s.Yid, y_name:s.Yname, y_phone:S.phoneFor(s.Yid)||'',
      day_back:'', per_back:'', y_sub:'', y_room:'', room_back:'', date_back:'', week_offset:null,
      score:null, impact_tag:'ยกคาบให้ (ไม่รับคืน)', warnings:[] };
  }

  /* สอนแทน (no give-back): anyone free in that slot on that date. This is the
     one-way path the two-way search cannot reach (audit F07). Uses the same
     free() rule and the same ledger as the swap search. */
  function findSubs(ctx){
    var eng=A.eng(), st=STORE.data.settings, L=S.buildLedger(A.log()), self=ctx.me+'|'+ctx.date+'|'+ctx.per;
    var CONS=+st.CONSECUTIVE_THRESHOLD, OT=+st.DAY_OVERLOAD_THRESHOLD, p=+ctx.per;
    var lunchP = ctx.src.level==='junior' ? +st.LUNCH_JUNIOR_PERIOD : +st.LUNCH_SENIOR_PERIOD;
    var info=Object.create(null), dept=S.deptOf(ctx.src.subject), sets=S.deptSets(eng.rows), grade=S.gradeOf(ctx.G), log=A.log();
    eng.rows.forEach(function(d){
      var t=info[d.teacher_id]||(info[d.teacher_id]={wk:0, dc:0, grp:false, subj:false, grade:false});
      if(d.status==='NON_TEACHING') return;
      t.wk++; if(d.day===ctx.day) t.dc++;
      if(d.group===ctx.G) t.grp=true;
      else if(d.subject && d.subject===ctx.src.subject) t.subj=true;
      if(grade && S.gradeOf(d.group)===grade) t.grade=true;
    });
    var out=[];
    A.teachers().forEach(function(t){
      if(t.id===ctx.me) return;
      var f=eng.free(t.id, ctx.day, p); if(!f.ok) return;
      if(L.busyAt(t.id, ctx.date, String(p), self).length) return;
      var i=info[t.id]||{wk:0,dc:0}, hy={}; hy[t.id+'|'+ctx.date+'|'+p]=1;
      var bef=ctx.dyn.day(t.id, ctx.date, lunchP, null, true), aft=ctx.dyn.day(t.id, ctx.date, lunchP, hy, true);   // counts swaps already on the books
      var wk=ctx.dyn.week(t.id, ctx.date, true); wk.extra=wk.count-i.wk;
      var ds=sets[t.id]||{}, lunch=(eng.displayLunch(t.id, ctx.day)===p);
      var recent=S.recentCovers(log, t.id, ctx.date, st.SUB_RECENT_DAYS);
      var sc=S.subScore(st, {dayBefore:bef, dayAfter:aft, weekAfter:wk.count+1, sameClass:!!i.grp, sameSubject:!!i.subj, sameGrade:!!i.grade,
        sameDept:!!(dept && ds[dept]), recent:recent, meeting:!!f.warn, lunch:lunch});
      out.push({Yid:t.id, Yname:t.name, weekly:wk.count, wk:wk, dc:bef.count, grp:!!i.grp, subj:!!i.subj, grade:!!i.grade && !i.grp, recent:recent,
        dept:!!(dept && ds[dept]), depts:ds, meet:f.warn,
        lunch:lunch, run:aft.run, over:(aft.count>OT), long:(aft.run>=CONS), extra:bef.count-ctx.dyn.baseCount(t.id, ctx.date),
        SCORE:sc.score, parts:sc.parts});
    });
    out.sort(function(a,b){ return (b.SCORE-a.SCORE) || (a.dc-b.dc) || (a.weekly-b.weekly) || (a.Yid<b.Yid?-1:1); });
    out.forEach(function(s,i){ s.rank=i+1; });
    return out;
  }
  function subTags(s){
    var t=[];
    if(s.grp) t.push({t:'สอนห้องนี้อยู่แล้ว', lv:'good'});
    if(s.subj) t.push({t:'สอนวิชานี้ห้องอื่น', lv:'good'});
    else if(s.grade) t.push({t:'สอนชั้นนี้', lv:'good'});
    if(s.dept) t.push({t:'กลุ่มสาระเดียวกัน', lv:'good'});
    if(s.recent) t.push({t:'สอนแทนไปแล้ว '+s.recent+' ครั้งช่วงนี้', lv:'info'});
    if(s.meet) t.push({t:'ต้องงดประชุม', lv:'info'});
    if(s.lunch) t.push({t:'ตรงพักกลางวัน', lv:'warn'});
    if(s.long) t.push({t:'ติด '+s.run+' คาบ', lv:'warn'});
    if(s.over) t.push({t:'ภาระเกินเกณฑ์', lv:'warn'});
    if(s.extra>0) t.push({t:'มีคาบแลกมาลงวันนั้นแล้ว '+s.extra+' คาบ', lv:'info'});
    return t;
  }
  function tagHTML(ts){ return ts.length?ts.map(function(x){ return '<span class="tag '+x.lv+'">'+h(x.t)+'</span>'; }).join(''):'<span class="muted">—</span>'; }

  /* ---------- detail panels ---------- */
  // One day of the group's route around the swapped period: what the students
  // do normally vs after the swap, and a plain verdict.
  function endBlock(title, p, prev, before, after, next, delta){
    function room(r, edge){ if(!r) return '<td class="none">'+edge+'</td>'; var x=S.buildingOf(r);
      return '<td><b>ห้อง '+h(r)+'</b>'+(x?'<span>อาคาร '+h(x)+'</span>':'')+'</td>'; }
    var verdict = delta>0 ? '<p class="wv bad">'+icon('warn')+'นักเรียนต้องเดินข้ามอาคารเพิ่ม '+delta+' ครั้ง</p>'
                : delta<0 ? '<p class="wv good">'+icon('check')+'นักเรียนเดินข้ามอาคารน้อยลง '+(-delta)+' ครั้ง</p>'
                          : '<p class="wv">'+(before===after?'เรียนห้องเดิม ไม่มีอะไรเปลี่ยน':'เปลี่ยนห้อง แต่ไม่ต้องข้ามอาคารเพิ่ม')+'</p>';
    if(before===after) return '<div class="walk"><h4>'+h(title)+' · คาบ '+p+'</h4>'+verdict+'</div>';
    var a=room(prev,'ไม่มีคาบติดกัน'), z=room(next,'ไม่มีคาบติดกัน');
    return '<div class="walk"><h4>'+h(title)+' · คาบ '+p+'</h4>'+
      '<table class="walk-t"><thead><tr><th></th><th>คาบก่อนหน้า</th><th>คาบ '+p+'</th><th>คาบถัดไป</th></tr></thead><tbody>'+
      '<tr><th>ปกติ</th>'+a+room(before,'')+z+'</tr>'+
      '<tr class="after"><th>หลังแลก</th>'+a+room(after,'').replace('<td>','<td class="chg">')+z+'</tr></tbody></table>'+verdict+'</div>';
  }
  function receipt(c){
    var st=STORE.data.settings, B=+st.WORKLOAD_WEEKLY_BASELINE;
    var ov=-(+st.DAY_OVERLOAD_PENALTY)*c.overload_n, co=-(+st.CONSECUTIVE_PENALTY)*c.overrun_n;
    function r(l,v,n){ return '<tr><td>'+h(l)+'</td><td class="num">'+(v>=0?'+':'')+v+'</td><td class="muted">'+h(n)+'</td></tr>'; }
    return '<table class="receipt"><tr><td>คะแนนเริ่มต้น</td><td class="num">'+(+st.BASE_SCORE)+'</td><td class="muted">ค่าตั้งต้นของทุกคู่</td></tr>'+
      r('ภาระสอนของครูสอนแทน สัปดาห์ '+A.span(c._dyn.yWeek.start, S.ttAddDays(c._dyn.yWeek.start,4)), c.wk_term, 'สอน '+c._dyn.yWeek.count+' → '+c.Y_weekly+' คาบ'+(c._dyn.yWeek.extra?' (รวมแลกแล้ว '+(c._dyn.yWeek.extra>0?'+':'')+c._dyn.yWeek.extra+')':'')+' เทียบเกณฑ์ '+B)+
      r('สอนเกินต่อวัน', ov, c.overload_n+' วัน-ครู × '+(+st.DAY_OVERLOAD_PENALTY))+
      r('สอนติดกันยาว', co, c.overrun_n+' วัน-ครู × '+(+st.CONSECUTIVE_PENALTY))+
      r('การเดินของนักเรียน', c.walk_term, 'ข้ามอาคารสุทธิ '+(c.walk_total>=0?'+':'')+c.walk_total)+
      '<tr class="total"><td>คะแนนจัดอันดับ</td><td class="num">'+c.SCORE+'</td><td class="muted">ใช้เรียงลำดับเท่านั้น ไม่ใช่เปอร์เซ็นต์</td></tr></table>';
  }
  function weekChips(c, ctx){
    var out='';
    for(var off=-S.WEEK_SPAN; off<=S.WEEK_SPAN; off++){
      var i=c.offset_info[off]; if(!i || !inSem(i.giveback)) continue;
      var ok=c._allowed.indexOf(off)>=0, why=i.blocked?(i.hold==='soft'?'มีข้อเสนออื่นจองไว้':'ติดคิวที่อนุมัติแล้ว'):(i.clash?'ตรงกับวันลา':'');
      var tight=ok && c._ev && c._ev[off].score<c._base[off].score, drop=tight?(c._base[off].score-c._ev[off].score):0;
      if(tight) why='วันนั้นมีคาบแลกมาลงแล้ว คะแนนลดลง '+drop;
      var sc=ok && c._ev ? '<i class="sc">คะแนน '+c._ev[off].score+'</i>' : '';
      out+='<button class="wk'+(off===c._off?' on':'')+(tight?' tight':'')+'" data-act="wkPick" data-key="'+h(ckey(c))+'" data-off="'+off+'"'+(ok?'':' disabled')+
        (why?' title="'+h(why)+'"':'')+'><b>'+h(A.dShort(i.giveback))+'</b><span>'+h(ok?(wkLabel(off)+(tight?' · แน่นขึ้น':'')):why)+'</span>'+sc+'</button>';
    }
    return out;
  }
  function loadTable(c, ctx){
    var b=c._dyn.before, a=c._dyn.after, x=c._dyn.extra, more=(x.me1>0||x.me2>0||x.y1>0||x.y2>0);
    function cell(bc,ac,ex){ return '<td>'+bc+' → <b class="'+(ac>bc?'up':(ac<bc?'dn':''))+'">'+ac+'</b> คาบ'+(ex>0?'<span class="sub">รวมแลกมาลงแล้ว '+ex+'</span>':'')+'</td>'; }
    return '<table class="mini"><thead><tr><th></th><th>'+h(A.dShort(ctx.date))+'</th><th>'+h(A.dShort(c._gb))+'</th></tr></thead><tbody>'+
      '<tr><th>'+h(ctx.meShort)+'</th>'+cell(b.me1.count, a.me1.count, x.me1)+cell(b.me2.count, a.me2.count, x.me2)+'</tr>'+
      '<tr><th>'+h(A.short(c.Yname))+'</th>'+cell(b.y1.count, a.y1.count, x.y1)+cell(b.y2.count, a.y2.count, x.y2)+'</tr></tbody></table>'+
      (more?'<p class="hint">ตัวเลข “ก่อน” นับรวมคาบที่แลกมาลงไว้แล้วในวันนั้น (ข้อเสนอ รออนุมัติ และอนุมัติแล้ว)</p>':'');
  }
  // weekly load: the covering teacher in the absence week (scored), the absent teacher in the give-back week (shown only)
  function weekTable(c, ctx){
    var y=c._dyn.yWeek, m=c._dyn.meWeek, same=(y.start===m.start);
    function row(who, w, note){
      var cls=w.after>w.count?'up':(w.after<w.count?'dn':'');
      return '<tr><th>'+h(who)+'</th><td>'+h(A.span(w.start, S.ttAddDays(w.start,4)))+'</td><td>'+w.count+' → <b class="'+cls+'">'+w.after+'</b> คาบ'+
        (w.extra?'<span class="sub">รวมแลกแล้ว '+(w.extra>0?'+':'')+w.extra+'</span>':'')+'</td><td class="muted">'+h(note)+'</td></tr>';
    }
    return '<table class="mini"><thead><tr><th></th><th>สัปดาห์</th><th>ก่อน → หลัง</th><th></th></tr></thead><tbody>'+
      row(A.short(c.Yname), y, 'ใช้คิดคะแนน')+row(ctx.meShort, m, 'แสดงให้ทราบ')+'</tbody></table>'+
      '<p class="hint">'+(same?'คืนในสัปดาห์เดียวกัน ภาระรายสัปดาห์ของทั้งสองคนเท่าเดิม':'คืนคนละสัปดาห์ ครูสอนแทนสอนเพิ่ม 1 คาบในสัปดาห์ที่มาแทน และคุณสอนเพิ่ม 1 คาบในสัปดาห์ที่ไปสอนคืน')+'</p>';
  }
  // wk = {start, count, extra}: the teacher's load in the week of the absence, swaps included
  function detHead(name, id, wk){
    var ex=wk.extra?' (ปกติ '+(wk.count-wk.extra)+', แลกแล้ว '+(wk.extra>0?'+':'')+wk.extra+')':'';
    return '<header class="det-h"><div><h2>'+h(name)+'</h2><p class="muted">รหัส '+h(id)+' · สัปดาห์ '+h(A.span(wk.start, S.ttAddDays(wk.start,4)))+' สอน '+wk.count+' คาบ'+h(ex)+'</p><p>'+A.phoneLink(S.phoneFor(id))+'</p></div>'+
      '<button class="btn btn-ghost det-x" data-act="detClose" aria-label="ปิด">'+icon('x')+'</button></header>';
  }
  function saveBar(ctx, extra){
    var ro=A.readOnly(), dis=(ro||ctx.taken)?' disabled':'';
    return '<div class="det-acts">'+(ctx.taken?'<p class="hint">คาบนี้มีข้อเสนออยู่แล้ว — ยกเลิกรายการเดิมก่อนจึงจะบันทึกคนใหม่ได้</p>':'')+(ro?'<p class="hint">'+h(S.readOnlyText())+'</p>':'')+
      '<button class="btn btn-primary" data-act="candSave"'+dis+'>'+icon('check')+'บันทึกเป็นข้อเสนอ</button>'+
      '<button class="btn" data-act="candSim">'+icon('eye')+'ดูตารางจำลองสองฝ่าย</button>'+(extra||'')+
      '<p class="hint">บันทึกเป็นสถานะ “เสนอ” เพื่อจองคาบไว้คุยกัน — ยังไม่ใช่การอนุมัติ และยกเลิกได้เสมอ</p></div>';
  }
  function swapDetail(c, ctx){
    var lines=A.entryLines(swapEntry(c, ctx, false)), cv=caveats(c, ctx), raw=c.seq_row||{};
    return detHead(c.Yname, c.Yid, c._dyn.yWeek)+
      '<section><h3>วันสอนคืน <span class="muted">— วัน'+h(c.day2)+' คาบ '+h(c.per2)+'</span></h3><div class="wks">'+weekChips(c, ctx)+'</div></section>'+
      '<section><h3>สิ่งที่จะเปลี่ยน</h3><ol class="changes">'+lines.map(function(l){
        return '<li><span class="when">'+h(A.dMid(l.date))+' · คาบ '+h(l.per)+'</span><b>'+h(l.text)+'</b><span class="muted">'+h(l.sub)+'</span></li>'; }).join('')+'</ol></section>'+
      '<section><h3>จำนวนคาบสอนในวันนั้น</h3>'+loadTable(c, ctx)+'</section>'+
      '<section><h3>จำนวนคาบสอนในสัปดาห์</h3>'+weekTable(c, ctx)+'</section>'+
      '<section><h3>ข้อควรรู้ก่อนตกลง</h3>'+(cv.length?'<ul class="cav">'+cv.map(function(t){ return '<li>'+icon('warn')+h(t)+'</li>'; }).join('')+'</ul>':'<p class="okline">'+icon('check')+'ไม่มีข้อควรระวัง</p>')+'</section>'+
      '<details><summary>การเดินเปลี่ยนห้องของนักเรียน</summary><div class="walks">'+
        endBlock(A.dShort(ctx.date)+' (วันที่ลา)', +ctx.per, c.prev_u, c.R1, c.Yroom, c.next_u, c.giveup_d)+
        endBlock(A.dShort(c._gb)+' (วันสอนคืน)', +c.per2, c.prev_b, c.Yroom, c.R1, c.next_b, c.giveback_d)+'</div></details>'+
      '<details><summary>ที่มาของคะแนนจัดอันดับ ('+c.SCORE+')</summary>'+receipt(c)+'</details>'+
      '<details><summary>ข้อมูลดิบของคาบที่รับคืน</summary><dl class="kv"><dt>raw_cell</dt><dd class="mono">'+h(raw.raw_cell||'—')+'</dd><dt>audit_note</dt><dd>'+h(raw.audit_note||'—')+'</dd></dl></details>'+
      saveBar(ctx, '<button class="btn btn-ghost" data-act="candSave" data-ga="1"'+((A.readOnly()||ctx.taken)?' disabled':'')+'>บันทึกแบบยกคาบให้ ไม่รับคืน</button>');
  }
  function subDetail(s, ctx){
    var l=A.entryLines(subEntry(s, ctx))[0], cv=[], y=A.short(s.Yname);
    if(s.meet) cv.push(y+'มีประชุมในคาบนี้ — ต้องงดประชุม');
    if(s.lunch) cv.push('คาบนี้เป็นช่วงพักกลางวันตามปกติของ'+y);
    if(s.long) cv.push(y+'จะสอนติดกัน '+s.run+' คาบในวันนั้น');
    if(s.over) cv.push(y+'จะสอนเกิน '+STORE.data.settings.DAY_OVERLOAD_THRESHOLD+' คาบในวันนั้น');
    return detHead(s.Yname, s.Yid, s.wk)+
      '<section><h3>สิ่งที่จะเปลี่ยน</h3><ol class="changes"><li><span class="when">'+h(A.dMid(l.date))+' · คาบ '+h(l.per)+'</span><b>'+h(l.text)+'</b><span class="muted">'+h(l.sub)+'</span></li></ol></section>'+
      '<section><h3>จำนวนคาบสอนในวันนั้น</h3><p>'+h(y)+': '+s.dc+' → <b class="up">'+(s.dc+1)+'</b> คาบ</p>'+
        '<p class="muted">'+(s.grp?'สอน '+h(A.cls(ctx.G))+' อยู่แล้ว':'ไม่ได้สอน '+h(A.cls(ctx.G))+' ตามปกติ')+(s.dept?' · สอนกลุ่มสาระเดียวกัน':'')+'</p></section>'+
      '<section><h3>ข้อควรรู้ก่อนตกลง</h3>'+(cv.length?'<ul class="cav">'+cv.map(function(t){ return '<li>'+icon('warn')+h(t)+'</li>'; }).join('')+'</ul>':'<p class="okline">'+icon('check')+'ไม่มีข้อควรระวัง</p>')+'</section>'+
      '<details><summary>ที่มาของคะแนนจัดอันดับ ('+s.SCORE+')</summary>'+subReceipt(s)+'</details>'+
      saveBar(ctx);
  }
  function subReceipt(s){
    return '<table class="receipt">'+s.parts.map(function(x,i){
      return '<tr><td>'+h(x.label)+'</td><td class="num">'+(i&&x.value>=0?'+':'')+x.value+'</td><td class="muted">'+h(x.note)+'</td></tr>'; }).join('')+
      '<tr class="total"><td>คะแนนจัดอันดับ</td><td class="num">'+s.SCORE+'</td><td class="muted">ปรับน้ำหนักได้ที่ ข้อมูล › การจัดอันดับครูสอนแทน</td></tr></table>';
  }
  // subject-group filter for "สอนแทน ไม่ต้องคืน": narrows the list, never locks it (a name search looks through everyone)
  A.subDeptOptions=function(cur, lessonDept, perPeriod){
    var have={}; A.eng().rows.forEach(function(r){ var d=S.deptOf(r.subject); if(d && r.status!=='NON_TEACHING') have[d]=1; });
    var o='<option value="all"'+(cur==='all'?' selected':'')+'>ทุกกลุ่มสาระ</option>';
    if(lessonDept) o+='<option value="lesson"'+(cur==='lesson'?' selected':'')+'>กลุ่มสาระเดียวกับวิชาที่ลา ('+h(S.deptName(lessonDept))+')</option>';
    else if(perPeriod) o+='<option value="lesson"'+(cur==='lesson'?' selected':'')+'>กลุ่มสาระเดียวกับวิชาของแต่ละคาบ</option>';
    S.DEPTS.concat(Object.keys(have).filter(function(k){ return !S.DEPTS.some(function(d){ return d.key===k; }); }).map(function(k){ return {key:k}; }))
      .forEach(function(d){ if(have[d.key]) o+='<option value="'+h(d.key)+'"'+(cur===d.key?' selected':'')+'>'+h(S.deptName(d.key))+'</option>'; });
    return o;
  };

  /* ---------- page ---------- */
  A.pages.pick={
    nav:'plan',
    render:function(args){
      var date=args[0], per=args[1], eng=A.eng();
      if(!eng || !ui.meId || !date || !per) return '<p class="empty">ยังไม่ได้เลือกคาบ — <a href="#plan">กลับไปหน้าแผน</a></p>';
      A.ensureContext();
      var slot=ui.meId+'|'+date+'|'+per;
      if(pk.slot!==slot){ pk.slot=slot; pk.sel=null; pk.chosen={}; pk.q=''; pk.sort='rank'; pk.mode=(args[2]==='sub')?'sub':'swap'; }
      var day=S.weekdayThai(date), me=ui.meId, meName=A.tName(me);
      var res=eng.search(me, day, String(per), {dateAbsent:date, preference:ui.pref, dateProposed:ui.dateProposed});
      var back='<a class="backlink" href="#plan">'+icon('back')+'กลับไปแผน</a>';
      if(res.valid!=='VALID')
        return back+'<header class="page-head"><div><h1>หาคนแทน</h1><p>'+h(A.dLong(date))+' · คาบ '+h(per)+'</p></div></header>'+
          '<div class="banner warn">'+icon('warn')+'<div><b>คาบนี้หาคนแทนด้วยโปรแกรมไม่ได้</b><p>'+h(res.message||'ไม่ใช่คาบสอนที่แลกได้')+'</p></div></div>';
      var src=res.source, taken=A.entryAt(me, date, per).entry;
      var ctx=cur={me:me, meName:meName, meShort:A.short(meName), date:date, day:day, per:String(per), src:src, G:res.G, taken:taken, list:[], subs:[],
        dyn:new S.Dyn(eng, A.log(), me+'|'+date+'|'+per), p:{me:me, date1:date, per1:String(per), lunchP:res.lunch_p}};

      var head=back+'<header class="page-head"><div><h1>หาคนแทน <span class="h1-sub">คาบ '+h(per)+' · '+h(A.dLong(date))+'</span></h1>'+
        '<p><b>'+h(src.subject||'—')+'</b> '+h(A.cls(src.group))+' · ห้อง '+h(src.room||'—')+' · ผู้ลา '+h(meName)+'</p></div></header>';
      if(taken) head+='<div class="banner info"><div>คาบนี้มีข้อเสนออยู่แล้ว: <b>'+h(A.partnerLabel(taken))+'</b> '+A.chip(taken.status)+
        ' — <a href="#packet/'+encodeURIComponent(taken.me_id)+'/'+encodeURIComponent(A.partnerKey(taken))+'">เปิดดู</a> หรือยกเลิกรายการเดิมก่อนเลือกคนใหม่</div></div>';

      var q=pk.q.trim().toLowerCase(), table, detail='', n=0, hidden=0;
      if(pk.mode==='swap'){
        var cs=res.candidates.slice();
        cs.forEach(function(c){ settle(c, ctx); });
        hidden=cs.filter(function(c){ return c._off===null; }).length;
        cs=cs.filter(function(c){ return c._off!==null; });
        n=cs.length;
        // the engine ranked on the plain timetable; rank again on what each week really looks like
        cs.slice().sort(function(a,b){
          if(b.SCORE!==a.SCORE) return b.SCORE-a.SCORE;
          var da=S.DAYN[a.day2], db=S.DAYN[b.day2]; if(da!==db) return da-db;
          var pa=+a.per2, pb=+b.per2; if(pa!==pb) return pa-pb;
          return a.Yid<b.Yid?-1:(a.Yid>b.Yid?1:0); }).forEach(function(c,i){ c.rank=i+1; });
        if(q) cs=cs.filter(function(c){ return (c.Yid+' '+c.Yname).toLowerCase().indexOf(q)>=0; });
        if(pk.sort==='date') cs.sort(function(a,b){ return a._gb<b._gb?-1:(a._gb>b._gb?1:(+a.per2)-(+b.per2)); });
        else if(pk.sort==='name') cs.sort(function(a,b){ return a.Yname.localeCompare(b.Yname,'th') || (a._gb<b._gb?-1:1); });
        else cs.sort(function(a,b){ return a.rank-b.rank; });
        ctx.list=cs;
        if(pk.sel===null && cs.length && window.innerWidth>=1080) pk.sel=ckey(cs[0]);
        var GMIN=+STORE.data.settings.SCORE_COLOR_GREEN_MIN, YMIN=+STORE.data.settings.SCORE_COLOR_YELLOW_MIN;
        table='<table class="cands"><thead><tr><th>ครูสอนแทน</th><th>สอนคืนวันที่</th><th>คาบที่คุณไปสอนคืน</th><th>ข้อควรรู้</th><th class="num" title="คะแนนจัดอันดับ ไม่ใช่เปอร์เซ็นต์">อันดับ</th></tr></thead><tbody>'+
          cs.map(function(c){
            var on=(ckey(c)===pk.sel), band=c.SCORE>=GMIN?'g':(c.SCORE>=YMIN?'y':'r');
            return '<tr class="'+(on?'on':'')+'" data-act="candSel" data-key="'+h(ckey(c))+'" tabindex="0">'+
              '<td><b>'+h(c.Yname)+'</b><span class="sub">'+h(c.Yid)+'</span></td>'+
              '<td><b>'+h(A.dShort(c._gb))+'</b> คาบ '+h(c.per2)+'<span class="sub">'+h(wkLabel(c._off))+'</span></td>'+
              '<td>แทน '+h(c.Ysub||'—')+'<span class="sub">ห้อง '+h(c.Yroom||'—')+'</span></td>'+
              '<td class="tags">'+tagHTML(tags(c, ctx))+'</td>'+
              '<td class="num"><span class="score '+band+'" title="คะแนนจัดอันดับ '+c.SCORE+'">'+c.rank+'<i>'+c.SCORE+'</i></span></td></tr>';
          }).join('')+'</tbody></table>';
        if(!cs.length) table=n?'<p class="empty">ไม่พบชื่อที่ค้นหา</p>':
          '<div class="banner warn">'+icon('warn')+'<div><b>ไม่พบครูสอนแทนที่แลกกันแบบสอนคืนได้</b><p>ครูที่สอน '+h(A.cls(res.G))+' ไม่ว่างในคาบนี้ หรือคาบที่เขาสอนตรงกับเวลาที่ผู้ลาไม่ว่าง ลองดู “สอนแทน ไม่ต้องคืน” หรือบันทึกคนนอกสอนแทน</p></div></div>';
        var sel=cs.filter(function(c){ return ckey(c)===pk.sel; })[0];
        detail=sel?swapDetail(sel, ctx):'';
      } else {
        var ss=findSubs(ctx); n=ss.length;
        var lessonDept=S.deptOf(src.subject), want=pk.dept==='lesson'?lessonDept:pk.dept, filtered=0;
        if(q) ss=ss.filter(function(s){ return (s.Yid+' '+s.Yname).toLowerCase().indexOf(q)>=0; });
        else if(want && want!=='all'){ var all=ss.length; ss=ss.filter(function(s){ return !!s.depts[want]; }); filtered=all-ss.length; }
        if(pk.sort==='name') ss.sort(function(a,b){ return a.Yname.localeCompare(b.Yname,'th'); });
        ctx.subs=ss;
        if(pk.sel===null && ss.length && window.innerWidth>=1080) pk.sel=ckey(ss[0]);
        var GM=+STORE.data.settings.SCORE_COLOR_GREEN_MIN, YM=+STORE.data.settings.SCORE_COLOR_YELLOW_MIN;
        table='<table class="cands"><thead><tr><th>ครูที่ว่างคาบนี้</th><th>สอนวันนั้น</th><th>สัปดาห์นี้</th><th>ข้อควรรู้</th><th class="num" title="คะแนนจัดอันดับ ไม่ใช่เปอร์เซ็นต์">อันดับ</th></tr></thead><tbody>'+
          ss.slice(0,120).map(function(s){
            var band=s.SCORE>=GM?'g':(s.SCORE>=YM?'y':'r');
            return '<tr class="'+(ckey(s)===pk.sel?'on':'')+'" data-act="candSel" data-key="'+h(ckey(s))+'" tabindex="0">'+
              '<td><b>'+h(s.Yname)+'</b><span class="sub">'+h(s.Yid)+'</span></td><td>'+s.dc+' → '+(s.dc+1)+' คาบ</td><td>'+s.weekly+' → '+(s.weekly+1)+' คาบ</td>'+
              '<td class="tags">'+tagHTML(subTags(s))+'</td>'+
              '<td class="num"><span class="score '+band+'" title="คะแนนจัดอันดับ '+s.SCORE+'">'+s.rank+'<i>'+s.SCORE+'</i></span></td></tr>'; }).join('')+'</tbody></table>'+
          (ss.length>120?'<p class="muted sm">แสดง 120 คนแรก — พิมพ์ชื่อเพื่อค้นหา</p>':'')+
          (filtered?'<p class="muted sm">ซ่อน '+filtered+' คนจากกลุ่มสาระอื่น — พิมพ์ชื่อเพื่อค้นจากครูทุกคน หรือเลือก “ทุกกลุ่มสาระ”</p>':'');
        if(!ss.length) table='<p class="empty">'+(q?'ไม่พบชื่อที่ค้นหา':(filtered?'ไม่มีครูในกลุ่มสาระนี้ที่ว่าง — เลือก “ทุกกลุ่มสาระ” หรือพิมพ์ชื่อครู':'ไม่มีครูที่ว่างในคาบนี้'))+'</p>';
        var ssel=ss.filter(function(s){ return ckey(s)===pk.sel; })[0];
        detail=ssel?subDetail(ssel, ctx):'';
      }
      var tools='<div class="tools"><div class="seg">'+
          '<label><input type="radio" name="pkMode" value="swap" data-chg="pkMode"'+(pk.mode==='swap'?' checked':'')+'><span>สอนแทน แล้วไปสอนคืน</span></label>'+
          '<label><input type="radio" name="pkMode" value="sub" data-chg="pkMode"'+(pk.mode==='sub'?' checked':'')+'><span>สอนแทน ไม่ต้องคืน</span></label></div>'+
        '<button class="btn btn-sm btn-ghost" data-act="extOpen" data-date="'+h(date)+'" data-per="'+h(per)+'"'+((A.readOnly()||taken)?' disabled':'')+'>'+icon('plus')+'คนนอกสอนแทน</button>'+
        '<span class="grow"></span>'+
        (pk.mode==='sub'?'<select class="sel" data-chg="pkDept" aria-label="กลุ่มสาระ">'+A.subDeptOptions(pk.dept, S.deptOf(src.subject))+'</select>':'')+
        '<label class="search">'+icon('search')+'<input id="pkQ" class="inp" type="search" placeholder="ค้นชื่อครู" value="'+h(pk.q)+'" data-inp="pkQ"></label>'+
        '<select class="sel" data-chg="pkSort" aria-label="เรียงตาม">'+
          (pk.mode==='swap'?'<option value="rank"'+(pk.sort==='rank'?' selected':'')+'>เรียงตามอันดับแนะนำ</option><option value="date"'+(pk.sort==='date'?' selected':'')+'>เรียงตามวันสอนคืน</option>'
                            :'<option value="rank"'+(pk.sort!=='name'?' selected':'')+'>เรียงตามอันดับแนะนำ</option>')+
          '<option value="name"'+(pk.sort==='name'?' selected':'')+'>เรียงตามชื่อ</option></select></div>';
      var opts=pk.mode==='swap'?'<details class="opts"><summary>ตัวเลือกการค้นหา</summary><div class="row2">'+
        '<label class="fld"><span>ให้เสนอวันสอนคืนไปทาง</span><select class="sel" data-chg="pkPref">'+['อนาคต','อดีต','ใกล้ที่สุด'].map(function(p){ return '<option'+(p===ui.pref?' selected':'')+'>'+p+'</option>'; }).join('')+'</select></label>'+
        '<label class="fld"><span>วันที่เสนอ (ใช้เตือนการบันทึกย้อนหลัง)</span><input type="date" class="inp" data-chg="pkProposed" value="'+h(ui.dateProposed)+'"></label></div></details>':'';
      var count='<p class="count">'+(pk.mode==='swap'
        ? 'พบ '+n+' ตัวเลือก — ทุกคนสอน '+h(A.cls(res.G))+' และว่างตรงกันทั้งสองคาบ'+(hidden?' · ซ่อน '+hidden+' ตัวเลือกที่ไม่มีวันสอนคืนที่ใช้ได้':'')
        : 'พบ '+n+' คนที่ว่างในคาบนี้ — ไม่ต้องมีคาบมาแลกคืน เรียงตามคะแนนจัดอันดับสอนแทน')+'</p>';
      return head+tools+opts+count+'<div class="pick'+(detail?' has-det':'')+'"><div class="pick-l">'+table+'</div>'+
        '<aside class="det" id="det">'+(detail||'<p class="empty">เลือกครูจากรายการ เพื่อดูวันสอนคืน ข้อควรรู้ และตารางจำลองสองฝ่าย</p>')+'</aside></div>';
    }
  };

  /* ---------- handlers ---------- */
  function selected(){
    if(!cur) return null;
    if(pk.mode==='swap') return cur.list.filter(function(c){ return ckey(c)===pk.sel; })[0]||null;
    return cur.subs.filter(function(s){ return ckey(s)===pk.sel; })[0]||null;
  }
  function makeEntry(ga){ var s=selected(); if(!s) return null; return pk.mode==='swap' ? swapEntry(s, cur, ga) : subEntry(s, cur); }
  A.acts.candSel=function(el){ pk.sel=el.getAttribute('data-key'); document.body.classList.add('det-open'); A.rerender(); };
  A.acts.detClose=function(){ pk.sel=null; document.body.classList.remove('det-open'); A.rerender(); };
  A.acts.wkPick=function(el){ pk.chosen[el.getAttribute('data-key')]=+el.getAttribute('data-off'); A.rerender(); };
  A.chgs.pkMode=function(el){ pk.mode=el.value; pk.sel=null; pk.sort='rank'; A.rerender(); };
  A.chgs.pkSort=function(el){ pk.sort=el.value; A.rerender(); };
  A.chgs.pkDept=function(el){ pk.dept=el.value; pk.sel=null; A.rerender(); };
  A.chgs.pkPref=function(el){ ui.pref=el.value; pk.chosen={}; A.rerender(); };
  A.chgs.pkProposed=function(el){ if(el.value){ ui.dateProposed=el.value; A.rerender(); } };
  A.inps.pkQ=function(el){ pk.q=el.value; A.rerender(); var q=document.getElementById('pkQ'); if(q){ q.focus(); try{ q.setSelectionRange(q.value.length,q.value.length); }catch(_){} } };
  A.acts.candSave=function(el){
    var e=makeEntry(el.getAttribute('data-ga')==='1'); if(!e) return;
    var r=A.commitEntry(e);
    if(!r.ok){ A.tell('บันทึกไม่ได้', '<p>'+h(r.error)+'</p><p class="muted">เลือกสัปดาห์อื่น หรือยกเลิกรายการเดิมก่อน</p>'); A.rerender(); return; }
    document.body.classList.remove('det-open');
    A.toast('บันทึกข้อเสนอแล้ว — '+A.partnerLabel(e), {go:'#packet/'+encodeURIComponent(e.me_id)+'/'+encodeURIComponent(A.partnerKey(e)), label:'ดูตารางไปคุย'});
    A.go('#plan');
  };
  A.acts.candSim=function(){
    var e=makeEntry(false); if(!e) return;
    A.draft={entry:e, back:location.hash};
    document.body.classList.remove('det-open');
    A.go('#packet/draft');
  };
  document.addEventListener('keydown', function(ev){
    if(ev.key!=='Enter' && ev.key!==' ') return;
    var tr=ev.target.closest && ev.target.closest('tr[data-act="candSel"]');
    if(tr && ev.target===tr){ ev.preventDefault(); A.acts.candSel(tr); }
  });
})();
