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

   Not dynamic (kept from the engine): weekly workload term, student walking
   between buildings. */
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
    var score=(+st.BASE_SCORE)+c.wk_term-(+st.DAY_OVERLOAD_PENALTY)*overload-(+st.CONSECUTIVE_PENALTY)*overrun+c.walk_term;
    var extra={me1:b.me1.count-this.baseCount(me,d1), me2:b.me2.count-this.baseCount(me,d2), y1:b.y1.count-this.baseCount(y,d1), y2:b.y2.count-this.baseCount(y,d2)};
    return {date2:d2, after:a, before:b, extra:extra, overload:overload, overrun:overrun, score:score};
  };

  // write the evaluation into the candidate so every existing reader (tags, receipts, saved record) sees it
  Dyn.prototype.apply=function(c, p, ev){
    var CONS=+this.set.CONSECUTIVE_THRESHOLD, a=ev.after;
    c.aMe_d1=a.me1.count; c.aMe_d2=a.me2.count; c.aY_d1=a.y1.count; c.aY_d2=a.y2.count;
    c.runMeD1=a.me1.run; c.runMeD2=a.me2.run; c.runYD1=a.y1.run; c.runYD2=a.y2.run;
    c.overload_n=ev.overload; c.overrun_n=ev.overrun; c.SCORE=ev.score;
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
})(window);
