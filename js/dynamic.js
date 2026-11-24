/* Effective-timetable scoring.
   core.js (generated from the legacy engine) scores a candidate against the
   BASE timetable only: a teacher who already has three swapped-in periods on a
   given Monday still looks like they teach their normal Monday. This module
   re-scores a candidate against what each teacher actually teaches on the two
   real calendar dates involved:

       effective(teacher, date, period) =
           base timetable of that weekday
           + every live swap record (เสนอ / รออนุมัติ / อนุมัติแล้ว; ยกเลิก frees)
             BUSY claim     → teaches (a make-up, or covering someone)
             HANDOVER claim → does not teach (their class was given away)
           + this candidate's own two moves

   Same formula as the engine (BASE − overload penalty − consecutive penalty
   + weekly and walking terms, which stay as the engine computed them), so with
   an empty log the result is identical to the engine's.

   Weekly workload term: the covering teacher's load in the WEEK they come in
   (Mon–Fri of the absence date), counting swaps already on the books AND this
   swap. A give-back in the same week leaves that load unchanged (+1 −1); a
   give-back in another week adds one period, so it scores a little lower than
   the engine's plain count (which looks at the base timetable before the swap).
   The absent teacher's load in the give-back week is reported, not scored:
   they teach the make-up whoever covers.
   Not dynamic (kept from the engine): student walking between buildings. */
(function(root){
  'use strict';
  var S=root.SWAP, own=Object.prototype.hasOwnProperty;

  function Dyn(eng, log, selfSlot){
    this.eng=eng; this.set=eng.settings; this.ov=Object.create(null); this.claims=0; this.wd=Object.create(null);
    var L=S.buildLedger(log||[]), self=this;
    L.claims.forEach(function(c){
      var e=c.entry;
      // the slot being searched is not "already taken" by its own old records
      if(selfSlot && (e.me_id+'|'+S.ledDate(e.date_absent)+'|'+String(e.per_give))===selfSlot) return;
      var k=c.tid+'|'+c.date+'|'+c.per;
      self.ov[k]=(self.ov[k]||0)|(c.kind==='BUSY'?1:2); self.claims++;
    });
  }
  Dyn.prototype.weekday=function(date){ var w=this.wd; return own.call(w,date)?w[date]:(w[date]=S.weekdayThai(date)); };
  // 1 = teaches. hypo wins, then live records, then the base timetable
  Dyn.prototype.mark=function(tid, date, per, hypo, useOv){
    var k=tid+'|'+date+'|'+per;
    if(hypo && own.call(hypo,k)) return hypo[k];
    if(useOv){ var f=this.ov[k]; if(f&1) return 1; if(f&2) return 0; }
    return this.eng.teaches(tid, this.weekday(date), per)?1:0;
  };
  // periods taught that day, and the longest unbroken run (lunch breaks a run, as in the engine)
  Dyn.prototype.day=function(tid, date, lunchP, hypo, useOv){
    var cnt=0, run=0, best=0;
    for(var p=1;p<=9;p++){
      var m=this.mark(tid, date, p, hypo, useOv); cnt+=m;
      run=(p===lunchP||!m)?0:run+1; if(run>best) best=run;
    }
    return {count:cnt, run:best};
  };
  Dyn.prototype.baseCount=function(tid, date){ return this.eng.dayCount(tid, this.weekday(date)); };
  // periods taught Mon–Fri of the week containing `date` (holidays are not modelled: every weekday counts)
  Dyn.prototype.week=function(tid, date, useOv, hypo){
    var ws=S.ttWeekStart(date), n=0, d;
    for(var i=0;i<5;i++){ d=S.ttAddDays(ws,i); for(var p=1;p<=9;p++) n+=this.mark(tid, d, p, hypo||null, useOv); }
    return {start:ws, count:n};
  };
  Dyn.prototype.wkTerm=function(n){
    var st=this.set, B=+st.WORKLOAD_WEEKLY_BASELINE;
    return n>B ? -(n-B)*(+st.WORKLOAD_WEEKLY_PENALTY_PER_PERIOD) : (n<B ? (B-n)*(+st.WORKLOAD_WEEKLY_BONUS_PER_PERIOD) : 0);
  };

  /* Evaluate candidate c if the give-back happens on date2. Pure: returns numbers, mutates nothing.
     p = {me, date1, per1, lunchP}; useOv=false gives the plain-timetable answer for comparison. */
  Dyn.prototype.eval=function(c, p, date2, useOv){
    var st=this.set, CONS=+st.CONSECUTIVE_THRESHOLD, OT=+st.DAY_OVERLOAD_THRESHOLD, me=p.me, y=c.Yid, d1=p.date1, d2=date2;
    var p1=String(p.per1), p2=String(c.per2), hypo={};
    hypo[me+'|'+d1+'|'+p1]=0; hypo[y+'|'+d1+'|'+p1]=1; hypo[me+'|'+d2+'|'+p2]=1; hypo[y+'|'+d2+'|'+p2]=0;
    var L=p.lunchP, same=(d1===d2);
    var a={me1:this.day(me,d1,L,hypo,useOv), me2:this.day(me,d2,L,hypo,useOv), y1:this.day(y,d1,L,hypo,useOv), y2:this.day(y,d2,L,hypo,useOv)};
    var b={me1:this.day(me,d1,L,null,useOv), me2:this.day(me,d2,L,null,useOv), y1:this.day(y,d1,L,null,useOv), y2:this.day(y,d2,L,null,useOv)};
    var days=same?['me1','y1']:['me1','me2','y1','y2'], overload=0, overrun=0;
    days.forEach(function(k){ if(a[k].count>OT) overload++; if(a[k].run>=CONS) overrun++; });
    var yw=this.week(y, d1, useOv), ywA=this.week(y, d1, useOv, hypo), mw=this.week(me, d2, useOv), mwA=this.week(me, d2, useOv, hypo), wk=this.wkTerm(ywA.count);
    var score=(+st.BASE_SCORE)+wk-(+st.DAY_OVERLOAD_PENALTY)*overload-(+st.CONSECUTIVE_PENALTY)*overrun+c.walk_term;
    var extra={me1:b.me1.count-this.baseCount(me,d1), me2:b.me2.count-this.baseCount(me,d2), y1:b.y1.count-this.baseCount(y,d1), y2:b.y2.count-this.baseCount(y,d2)};
    var yBase=this.eng.weekly(y), mBase=this.eng.weekly(me);
    return {date2:d2, after:a, before:b, extra:extra, overload:overload, overrun:overrun, score:score,
            yWeek:{start:yw.start, count:yw.count, after:ywA.count, extra:yw.count-yBase},       // covering teacher, week of the absence
            meWeek:{start:mw.start, count:mw.count, after:mwA.count, extra:mw.count-mBase},      // absent teacher, week of the give-back
            wk_term:wk};
  };

  // write the evaluation into the candidate so every existing reader (tags, receipts, saved record) sees it
  Dyn.prototype.apply=function(c, p, ev){
    var CONS=+this.set.CONSECUTIVE_THRESHOLD, a=ev.after;
    c.aMe_d1=a.me1.count; c.aMe_d2=a.me2.count; c.aY_d1=a.y1.count; c.aY_d2=a.y2.count;
    c.runMeD1=a.me1.run; c.runMeD2=a.me2.run; c.runYD1=a.y1.run; c.runYD2=a.y2.run;
    c.overload_n=ev.overload; c.overrun_n=ev.overrun; c.SCORE=ev.score;
    c.Y_weekly=ev.yWeek.after; c.Me_weekly=ev.meWeek.after; c.wk_term=ev.wk_term;
    var d1=this.weekday(p.date1), d2=this.weekday(ev.date2), mr=Math.max(c.runMeD1,c.runMeD2), yr=Math.max(c.runYD1,c.runYD2), t='';
    if(mr>=CONS) t+='⚠️ ครู Me ติด '+mr+' คาบ ('+((c.runMeD2>c.runMeD1)?d2:d1)+'); ';
    if(yr>=CONS) t+='⚠️ ครู Y ติด '+yr+' คาบ ('+((c.runYD2>c.runYD1)?d2:d1)+'); ';
    if(c.overload_n>0) t+='⚠️ ภาระเกิน; ';
    if(c.warnMe) t+='⚠️ ประชุม Me; ';
    if(c.warnY) t+='⚠️ ประชุม Y; ';
    if(c.walk_total>0) t+=c.walk_x2?'⚠️ เปลี่ยนอาคาร (×2); ':'⚠️ เปลี่ยนอาคาร; ';
    c.CompactWarn=t||'—';
    c._dyn=ev;
  };

  S.Dyn=Dyn;

  /* ---------- สอนแทน ไม่ต้องคืน: score + subject groups ---------- */
  // subject code's first letter → learning-area group (foreign languages share one group)
  var DEPTS=[
    {key:'ท', name:'ภาษาไทย', letters:'ท'}, {key:'ค', name:'คณิตศาสตร์', letters:'ค'},
    {key:'ว', name:'วิทยาศาสตร์และเทคโนโลยี', letters:'ว'}, {key:'ส', name:'สังคมศึกษาฯ', letters:'ส'},
    {key:'พ', name:'สุขศึกษาและพลศึกษา', letters:'พ'}, {key:'ศ', name:'ศิลปะ', letters:'ศ'},
    {key:'ง', name:'การงานอาชีพ', letters:'งก'}, {key:'ต', name:'ภาษาต่างประเทศ', letters:'อจญฝ'},
    {key:'I', name:'IS (การศึกษาค้นคว้า)', letters:'I'}
  ];
  var byLetter={}; DEPTS.forEach(function(d){ d.letters.split('').forEach(function(l){ byLetter[l]=d.key; }); });
  S.DEPTS=DEPTS;
  S.deptOf=function(subject){ var l=String(subject||'').trim().charAt(0); return byLetter[l]||(l?l:null); };
  S.deptName=function(key){ for(var i=0;i<DEPTS.length;i++) if(DEPTS[i].key===key) return DEPTS[i].name; return 'รหัสวิชา '+key; };
  // teacher id → set of groups they teach (any subject counts)
  S.deptSets=function(rows){
    var out=Object.create(null);
    rows.forEach(function(r){ if(r.status==='NON_TEACHING') return; var d=S.deptOf(r.subject); if(!d) return; (out[r.teacher_id]||(out[r.teacher_id]={}))[d]=1; });
    return out;
  };

  /* Substitute (no give-back) weights. Its own formula, not the swap one (v3, 2026-11-25, agreed with the
     school): a sudden sick day needs someone who can look after this class and has a light day, so the
     subject group and the class weigh most, the day's load is counted per period, and the weekly load is
     only a small capped nudge. Filled into stored settings by STORE._migrate. */
  var SUB_DEFAULTS={SUB_BONUS_SAME_DEPT:20, SUB_BONUS_SAME_CLASS:15, SUB_BONUS_SAME_SUBJECT:10, SUB_BONUS_SAME_GRADE:5,
    SUB_PENALTY_PER_DAY_PERIOD:4, SUB_WEEKLY_PER_PERIOD:1, SUB_WEEKLY_CAP:10,
    SUB_PENALTY_PER_RECENT_COVER:5, SUB_RECENT_DAYS:30, SUB_PENALTY_MEETING:5, SUB_PENALTY_LUNCH:15};
  Object.keys(SUB_DEFAULTS).forEach(function(k){ if(S.DEFAULT_SETTINGS[k]==null) S.DEFAULT_SETTINGS[k]=SUB_DEFAULTS[k]; });
  var G='การให้คะแนน — สอนแทนไม่ต้องคืน', at=S.SETTINGS_META.map(function(m){ return m.group; }).indexOf('สีแสดงคะแนน');
  if(!S.SETTINGS_META.some(function(m){ return m.group===G; })) S.SETTINGS_META.splice(at<0?S.SETTINGS_META.length:at, 0,
    {key:'SUB_BONUS_SAME_DEPT', label:'บวกคะแนน ถ้าอยู่กลุ่มสาระเดียวกับวิชาที่ลา', help:'ดูจากอักษรตัวแรกของรหัสวิชาที่ครูสอน (ค ว ส …)', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_BONUS_SAME_CLASS', label:'บวกคะแนน ถ้าครูสอนห้องนี้อยู่แล้ว', help:'ครูที่สอนห้องเดียวกันตามปกติ รู้จักนักเรียนอยู่แล้ว', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_BONUS_SAME_SUBJECT', label:'บวกคะแนน ถ้าสอนวิชาเดียวกัน (ห้องอื่น)', help:'ครูสอนรหัสวิชาเดียวกับคาบที่ลาให้ห้องอื่น รู้เนื้อหาที่ต้องสอน', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_BONUS_SAME_GRADE', label:'บวกคะแนน ถ้าสอนชั้นเดียวกัน (ห้องอื่น)', help:'เช่น ลาคาบ ม.6/10 แล้วครูสอน ม.6 ห้องอื่น — ไม่บวกซ้ำถ้าสอนห้องนี้อยู่แล้ว', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_PENALTY_PER_DAY_PERIOD', label:'หักคะแนน/คาบที่สอนอยู่แล้วในวันนั้น', help:'วันนั้นครูสอนกี่คาบ (รวมที่แลกหรือสอนแทนไว้แล้ว) หักเท่านี้ต่อคาบ', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_WEEKLY_PER_PERIOD', label:'บวก/หักคะแนนต่อคาบ ตามภาระรายสัปดาห์', help:'เทียบกับภาระงานมาตรฐานต่อสัปดาห์ น้อยกว่าได้บวก มากกว่าถูกหัก', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_WEEKLY_CAP', label:'เพดานคะแนนจากภาระรายสัปดาห์', help:'บวกหรือหักจากภาระรายสัปดาห์ได้ไม่เกินเท่านี้ ครูที่สอนน้อยมากจะได้ไม่ล้นจนแซงคนในกลุ่มสาระ', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_PENALTY_PER_RECENT_COVER', label:'หักคะแนน/ครั้งที่สอนแทนไปแล้วช่วงนี้', help:'กระจายงานสอนแทน ไม่ให้ตกอยู่กับคนเดิมทุกครั้ง (นับรายการสอนแทนไม่ต้องคืนที่ยังไม่ยกเลิก)', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_RECENT_DAYS', label:'นับการสอนแทนย้อนหลังกี่วัน', help:'นับครั้งที่สอนแทนในช่วงนี้ก่อนวันที่ลา (ไม่รวมวันเดียวกัน เพราะนับในภาระวันนั้นแล้ว)', type:'int', min:1, max:365, group:G, adv:true},
    {key:'SUB_PENALTY_MEETING', label:'หักคะแนน ถ้าต้องงดประชุม', help:'คาบนั้นครูมีประชุมตามตาราง', type:'int', min:0, max:100, group:G, adv:true},
    {key:'SUB_PENALTY_LUNCH', label:'หักคะแนน ถ้าตรงพักกลางวันของครู', help:'คาบนั้นเป็นคาบพักกลางวันของครูสอนแทน', type:'int', min:0, max:100, group:G, adv:true});

  // grade of a class group: "6.10" → "6"
  S.gradeOf=function(group){ var m=/^\s*([1-6])/.exec(String(group||'')); return m?m[1]:''; };
  // substitutes (no give-back) a teacher took in the days before `date`; same-date ones are in the day load already
  S.recentCovers=function(log, tid, date, days){
    var t=Date.parse(date+'T00:00:00Z'), from=new Date(t-(+days||30)*864e5).toISOString().slice(0,10), n=0;
    (log||[]).forEach(function(e){
      if(e.status==='ยกเลิก' || e.y_id!==tid || e.date_back || e.kind!=='สอนแทน') return;
      if(e.date_absent>=from && e.date_absent<date) n++;
    });
    return n;
  };

  /* Score defaults v2 (2026-11-23, agreed with the school): weekly baseline 16 (the median teacher's real load,
     was 20) with ±2 per period either side (bonus was 1), and a heavy day weighs the same as a long run
     (overload −15, was −10), and a 5-period day already counts as overloaded (threshold 4 = more than 4;
     was 5). The legacy app keeps the old numbers. Stored settings still holding an old
     default are moved to the new one once; a value someone changed on purpose is left alone. */
  var V2_OLD={WORKLOAD_WEEKLY_BASELINE:20, WORKLOAD_WEEKLY_BONUS_PER_PERIOD:1, DAY_OVERLOAD_PENALTY:10, DAY_OVERLOAD_THRESHOLD:5};
  var V2_NEW={WORKLOAD_WEEKLY_BASELINE:16, WORKLOAD_WEEKLY_BONUS_PER_PERIOD:2, DAY_OVERLOAD_PENALTY:15, DAY_OVERLOAD_THRESHOLD:4};
  Object.keys(V2_NEW).forEach(function(k){ S.DEFAULT_SETTINGS[k]=V2_NEW[k]; });
  // v3 (2026-11-25): substitute weights — subject group 5 → 20, this class 10 → 15 (new keys come in as defaults)
  var STEPS=[{v:2, old:V2_OLD, nw:V2_NEW},
    {v:3, old:{SUB_BONUS_SAME_DEPT:5, SUB_BONUS_SAME_CLASS:10}, nw:{SUB_BONUS_SAME_DEPT:20, SUB_BONUS_SAME_CLASS:15}}];
  var LATEST=STEPS[STEPS.length-1].v;
  S.DEFAULT_SETTINGS.SCORE_DEFAULTS_V=LATEST;
  // moves every stored value still at an old default to the new one; values someone changed are kept
  S.upgradeScoreSettings=function(st){
    var cur=st ? (+st.SCORE_DEFAULTS_V||0) : LATEST;
    if(cur>=LATEST) return false;
    STEPS.forEach(function(s){ if(s.v<=cur) return;
      Object.keys(s.old).forEach(function(k){ if(st[k]==null || String(st[k])===String(s.old[k])) st[k]=s.nw[k]; }); });
    st.SCORE_DEFAULTS_V=LATEST; return true;
  };
  // every load and every backup restore goes through _migrate; look at the marker before it fills defaults in
  var mig=S.STORE._migrate;
  S.STORE._migrate=function(){
    var st=this.data && this.data.settings, had=st ? (+st.SCORE_DEFAULTS_V||0) : LATEST;
    mig.apply(this, arguments);
    // _migrate has just copied the latest marker in from the defaults: put the stored one back so the upgrade runs
    if(had<LATEST){ this.data.settings.SCORE_DEFAULTS_V=had; S.upgradeScoreSettings(this.data.settings); }
  };

  /* score a substitute (no give-back).
     x = {dayBefore:{count}, dayAfter:{count,run}, weekAfter, sameDept, sameClass, sameSubject, sameGrade, recent, meeting, lunch}
     → {score, parts:[{label, value, note}]} — parts add up to score */
  S.subScore=function(st, x){
    var B=+st.WORKLOAD_WEEKLY_BASELINE, n=x.weekAfter, OT=+st.DAY_OVERLOAD_THRESHOLD, CT=+st.CONSECUTIVE_THRESHOLD, parts=[];
    var cap=+st.SUB_WEEKLY_CAP, wk=Math.max(-cap, Math.min(cap, (B-n)*(+st.SUB_WEEKLY_PER_PERIOD)))||0;
    var day=x.dayBefore ? x.dayBefore.count : x.dayAfter.count-1, grade=x.sameGrade && !x.sameClass, rc=+x.recent||0;
    var yes=function(b){ return b?'ใช่':'ไม่'; };
    parts.push({label:'คะแนนเริ่มต้น', value:+st.BASE_SCORE, note:'ค่าตั้งต้นของทุกคน'});
    parts.push({label:'กลุ่มสาระเดียวกัน', value:x.sameDept?+st.SUB_BONUS_SAME_DEPT:0, note:yes(x.sameDept)});
    parts.push({label:'สอนห้องนี้อยู่แล้ว', value:x.sameClass?+st.SUB_BONUS_SAME_CLASS:0, note:yes(x.sameClass)});
    parts.push({label:'สอนวิชาเดียวกัน (ห้องอื่น)', value:x.sameSubject?+st.SUB_BONUS_SAME_SUBJECT:0, note:yes(x.sameSubject)});
    parts.push({label:'สอนชั้นเดียวกัน (ห้องอื่น)', value:grade?+st.SUB_BONUS_SAME_GRADE:0, note:x.sameClass&&x.sameGrade?'นับในสอนห้องนี้แล้ว':yes(grade)});
    parts.push({label:'คาบสอนในวันนั้น', value:-day*(+st.SUB_PENALTY_PER_DAY_PERIOD)||0, note:'สอนอยู่แล้ว '+day+' คาบ'});
    parts.push({label:'สอนเกินต่อวัน', value:x.dayAfter.count>OT?-(+st.DAY_OVERLOAD_PENALTY):0, note:'รวมคาบนี้ '+x.dayAfter.count+' คาบ · เกณฑ์ '+OT});
    parts.push({label:'สอนติดกันยาว', value:x.dayAfter.run>=CT?-(+st.CONSECUTIVE_PENALTY):0, note:'ติดกันสูงสุด '+x.dayAfter.run+' คาบ · เกณฑ์ '+CT});
    parts.push({label:'ภาระสอนสัปดาห์นี้', value:wk, note:'สอน '+n+' คาบ (รวมคาบนี้) เทียบเกณฑ์ '+B+' · ไม่เกิน ±'+cap});
    parts.push({label:'สอนแทนไปแล้วช่วงนี้', value:-rc*(+st.SUB_PENALTY_PER_RECENT_COVER)||0, note:rc+' ครั้งใน '+st.SUB_RECENT_DAYS+' วันก่อนหน้า'});
    parts.push({label:'ต้องงดประชุม', value:x.meeting?-(+st.SUB_PENALTY_MEETING):0, note:x.meeting?'ใช่':'ไม่'});
    parts.push({label:'ตรงพักกลางวัน', value:x.lunch?-(+st.SUB_PENALTY_LUNCH):0, note:x.lunch?'ใช่':'ไม่'});
    var score=0; parts.forEach(function(p){ score+=p.value; });
    return {score:score, parts:parts};
  };
})(window);
