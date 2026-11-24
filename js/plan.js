/* หน้า “จัดคาบที่ลา” — one leave round (or one ad-hoc date) at a time:
   every period of the day in a strip, and the periods that need cover as rows. */
(function(){
  'use strict';
  var A=window.APP, S=A.S, STORE=A.STORE, h=A.h, ui=A.ui, icon=A.icon;

  function firstDate(r){ return (r.days||[]).map(function(d){ return d.date; }).sort()[0]||''; }
  function lastDate(r){ var a=(r.days||[]).map(function(d){ return d.date; }).sort(); return a[a.length-1]||''; }
  A.myRounds=function(tid){
    return S.leavesOf().filter(function(r){ return r.teacherId===tid; }).sort(function(a,b){ return firstDate(a)<firstDate(b)?-1:1; });
  };
  A.roundById=function(id){ var L=S.leavesOf(); for(var i=0;i<L.length;i++) if(L[i].id===id) return L[i]; return null; };
  A.roundSpan=function(r){ var a=firstDate(r), b=lastDate(r); return a?A.span(a,b):'(ว่าง)'; };
  function roundProgress(r){
    var tot=0, cov=0;
    (r.days||[]).forEach(function(d){ (d.periods||[]).forEach(function(p){ tot++; if(A.entryAt(r.teacherId, d.date, p).entry) cov++; }); });
    return {tot:tot, cov:cov};
  }
  function defaultDate(){
    var meta=(A.sem()||{}).meta||{}, d=S.todayISO();
    if(meta.startDate && d<meta.startDate) d=meta.startDate;
    if(meta.endDate && d>meta.endDate) d=meta.endDate;
    var n=0; while(!S.weekdayThai(d) && n++<3) d=S.ttAddDays(d,1);
    return d;
  }
  A.ensureContext=function(){
    if(!A.teachers().length) return;
    if(ui.meId && !A.teacher(ui.meId)) ui.meId=null;
    if(!ui.pref) ui.pref=STORE.data.settings.GIVEBACK_PREFERENCE||'อนาคต';
    if(!ui.dateProposed) ui.dateProposed=S.todayISO();
    if(ui.roundId){ var r=A.roundById(ui.roundId); if(!r || r.teacherId!==ui.meId) ui.roundId=null; }
    if(ui.meId && !ui.roundId && !ui.date){
      var rs=A.myRounds(ui.meId), t=S.todayISO();
      var up=rs.filter(function(x){ return lastDate(x)>=t; })[0] || rs[rs.length-1];
      if(up) ui.roundId=up.id; else ui.date=defaultDate();
    }
  };

  /* ---------- reminders ---------- */
  A.remindersHTML=function(){
    var sem=A.sem(), out='';
    if(!sem) return '';
    // periods of the round/date on screen are already shown below — do not repeat them
    var shown={}, rd=ui.roundId?A.roundById(ui.roundId):null;
    if(rd) (rd.days||[]).forEach(function(d){ shown[d.date]=1; }); else if(ui.date) shown[ui.date]=1;
    out+=A.auditHTML({futureOnly:true, skip:function(u){ return u.teacher_id===ui.meId && shown[u.date]; }});
    if(sem.meta && sem.meta.endDate && !A.readOnly()){
      var today=S.todayISO(), end=String(sem.meta.endDate).slice(0,10), left=Math.floor((new Date(end)-new Date(today))/86400000);
      if(today>end) out+='<div class="banner info"><div><b>ภาคเรียน '+h(sem.meta.label)+' สิ้นสุดแล้ว</b> — สำรองข้อมูล แล้วนำเข้าตารางของภาคเรียนใหม่ได้ที่ <a href="#data">ข้อมูลและตั้งค่า</a></div></div>';
      else if(left<=14) out+='<div class="banner info"><div><b>ใกล้สิ้นภาคเรียน</b> (สิ้นสุด '+h(S.formatBE(end,false))+') — อย่าลืมสำรองข้อมูลก่อนปิดเทอม</div></div>';
    }
    var appr=STORE.data.approvedSinceBackup||0, ds=S.daysSince(STORE.data.lastBackupAt);
    if(appr>0 && (ds===null || ds>30)) out+='<div class="banner info"><div>อนุมัติไปแล้ว '+appr+' รายการตั้งแต่สำรองครั้งล่าสุด — <a href="#data">สำรองข้อมูล</a>ไว้กันพลาด</div></div>';
    return out;
  };

  /* ---------- one day ---------- */
  function dayCard(dateISO, rd){
    var eng=A.eng(), me=ui.meId, day=S.weekdayThai(dateISO), meta=(A.sem()||{}).meta||{};
    var warn=[];
    if(meta.startDate && dateISO<meta.startDate) warn.push('อยู่ก่อนวันเปิดภาคเรียน');
    if(meta.endDate && dateISO>meta.endDate) warn.push('อยู่หลังวันปิดภาคเรียน');
    if(!day) return '<article class="day"><header class="day-h"><h3>'+h(S.formatBE(dateISO,false))+'</h3></header><p class="empty">วันนี้เป็นวันเสาร์–อาทิตย์ ไม่มีคาบสอน — เลือกวันจันทร์–ศุกร์</p></article>';
    var hasRound=!!rd, leaveSet={}; if(rd) (rd.periods||[]).forEach(function(p){ leaveSet[String(p)]=1; });
    var cells='', rows='', nLeave=0, nCov=0, nOpen=0, ro=A.readOnly();
    for(var p=1;p<=9;p++){
      var row=eng.row(me, day, String(p)), lunch=(eng.displayLunch(me, day)===p);
      if(!row){ cells+='<div class="cell c-free"><span class="cn">'+p+'</span><span class="cx">'+(lunch?'พักกลางวัน':'ว่าง')+'</span></div>'; continue; }
      if(row.is_teaching!=='TRUE'){ cells+='<div class="cell c-nt"><span class="cn">'+p+'</span><span class="cx">'+h(lunch?'พักกลางวัน':(row.room||row.subject||'กิจกรรม'))+'</span></div>'; continue; }
      var at=A.entryAt(me, dateISO, p), e=at.entry, onLeave=hasRound?!!leaveSet[p]:false;
      var v=eng.validateSource(me, day, String(p)), okSrc=(v.valid==='VALID');
      var state = e ? A.ST[e.status].c : (hasRound ? (onLeave?'todo':'stay') : 'open');
      if(hasRound && onLeave){ nLeave++; if(e) nCov++; }
      cells+='<div class="cell c-teach s-'+state+'"><span class="cn">'+p+'</span>'+
        '<b>'+h(row.subject||'—')+'</b><span class="cx">'+h(A.cls(row.group))+' · '+h(row.room||'—')+'</span>'+
        (hasRound?'<label class="tick"><input type="checkbox" data-chg="leaveTick" data-date="'+dateISO+'" data-per="'+p+'"'+(onLeave?' checked':'')+(ro?' disabled':'')+'><span>ลา</span></label>':'')+
      '</div>';
      if(hasRound && !onLeave && !e) continue;          // taught as usual: nothing to arrange
      if(!e && okSrc) nOpen++;
      var stat, info='';
      if(e){
        stat=A.statusSelect(e);
        info = S.isSubOnly(e)
          ? '<b>'+h(A.partnerLabel(e))+'</b> สอนแทน · ไม่รับคืน'+(S.isExternalSub(e)?' <span class="tag">นอกระบบ</span>':'')
          : '<b>'+h(A.partnerLabel(e))+'</b> · สอนคืน '+h(A.dMid(e.date_back))+' คาบ '+h(e.per_back);
        if(hasRound && !onLeave) info+=' <span class="tag warn">ไม่ได้ติ๊กลาคาบนี้</span>';
      } else if(at.cancelled){ stat='<span class="chip st-cancel">ยกเลิกแล้ว '+at.cancelled+' รายการ</span>'; info='ยังไม่มีคนสอนแทน'; }
      else stat = hasRound ? '<span class="chip st-todo">ยังไม่มีคนแทน</span>' : '<span class="chip st-none">ยังไม่ได้จัด</span>';
      var acts;
      if(e) acts='<a class="btn btn-sm" href="#packet/'+encodeURIComponent(e.me_id)+'/'+encodeURIComponent(A.partnerKey(e))+'">'+icon('eye')+'ตารางไปคุย</a>'+
                 (e.status==='เสนอ'&&!ro?'<button class="btn btn-sm btn-ghost" data-act="delEntry" data-id="'+h(e.id)+'" title="ลบข้อเสนอ">'+icon('trash')+'</button>':'');
      else if(!okSrc) acts='<span class="muted sm">'+h(v.message||'คาบนี้แลกไม่ได้')+'</span>';
      else acts='<a class="btn btn-sm btn-primary" href="#pick/'+dateISO+'/'+p+'">'+icon('search')+'หาคนแทน</a>'+
                '<button class="btn btn-sm btn-ghost" data-act="extOpen" data-date="'+dateISO+'" data-per="'+p+'"'+(ro?' disabled':'')+'>คนนอกสอนแทน</button>';
      rows+='<li class="slot s-'+state+'"><div class="slot-p">คาบ '+p+'</div>'+
        '<div class="slot-c"><b>'+h(row.subject||'—')+'</b> '+h(A.cls(row.group))+' <span class="muted">ห้อง '+h(row.room||'—')+'</span></div>'+
        '<div class="slot-s">'+stat+(info?'<span class="slot-i">'+info+'</span>':'')+'</div>'+
        '<div class="slot-a">'+acts+'</div></li>';
    }
    var sub;
    if(hasRound){
      var need=(rd.mode==='บางคาบ' && !(rd.periods||[]).length);
      sub = need ? '<span class="tag warn">ลาบางคาบ — ติ๊ก “ลา” ในคาบที่ลา</span>'
                 : '<span class="tag">ลา'+h(rd.mode)+'</span> <span class="muted">มีคนแทนแล้ว '+nCov+'/'+nLeave+' คาบ</span>';
    } else sub='<span class="muted">ยังไม่ได้ระบุว่าลาคาบไหน — เลือกจัดได้ทุกคาบสอน</span>';
    return '<article class="day">'+
      '<header class="day-h"><h3>'+h(A.dLong(dateISO))+'</h3><div class="day-sub">'+sub+'</div>'+
        (nOpen>1?'<a class="btn btn-sm" href="#subs/'+dateISO+'">'+icon('user')+'จัดคนสอนแทนทั้งวัน</a>':'')+'</header>'+
      (warn.length?'<p class="day-warn">'+icon('warn')+h(warn.join(' · '))+'</p>':'')+
      '<div class="strip-wrap"><div class="strip">'+cells+'</div></div>'+
      (rows?'<ul class="slots">'+rows+'</ul>':'<p class="empty">'+(hasRound?'วันนี้ไม่มีคาบที่ต้องหาคนแทน':'วันนี้ไม่มีคาบสอน')+'</p>')+
    '</article>';
  }

  /* ---------- page ---------- */
  function emptyNoData(){
    return '<header class="page-head"><div><h1>เริ่มใช้งาน</h1><p>โปรแกรมนี้ยังไม่มีตารางสอนในเครื่องนี้ — ข้อมูลของโรงเรียนไม่ได้อยู่บนเว็บ ต้องนำไฟล์มาวางหนึ่งครั้ง</p></div></header>'+
      '<div class="start"><div class="start-main">'+A.intakeHTML(true)+A.oldSiteHTML()+'</div>'+
      '<div class="start-side"><div class="who-card"><h3>ครูทั่วไป</h3><p>ขอ <b>ไฟล์ข้อมูลโรงเรียน</b> จากผู้ดูแล (ทาง LINE หรือ Google Drive) แล้วลากมาวาง จบในขั้นเดียว</p></div>'+
      '<div class="who-card"><h3>ย้ายมาจากเครื่องอื่น</h3><p>ลาก <b>ไฟล์สำรองของฉัน</b> มาวาง งานเดิมทั้งหมดจะกลับมา</p></div>'+
      '<div class="who-card"><h3>ผู้ดูแล</h3><p>ลากไฟล์ Excel <b>ตารางสอน</b> และ <b>เบอร์ติดต่อ</b> มาวาง แล้วไปหน้า “ข้อมูล” เพื่อสร้างไฟล์ข้อมูลโรงเรียนแจกครูคนอื่น</p></div></div></div>';
  }
  A.pages.plan={
    render:function(){
      var sem=A.sem();
      if(!sem || !sem.schedule || !sem.schedule.length) return emptyNoData();
      A.ensureContext();
      var head='<header class="page-head"><div><h1>จัดคาบที่ลา</h1><p>เลือกรอบการลา แล้วหาคนแทนทีละคาบ — บันทึกเป็นข้อเสนอก่อน ยังไม่ใช่การอนุมัติ</p></div>'+
        A.whoButton(ui.meId,'pickMe','ผู้ลา')+'</header>';
      if(!ui.meId) return head+'<div class="hero"><h2>ใครเป็นผู้ลา?</h2><p>เลือกครูหนึ่งครั้ง ระบบจะจำไว้ในเครื่องนี้</p><div class="hero-acts"><button class="btn btn-primary" data-act="pickMe">'+icon('user')+'เลือกครู</button></div></div>';

      var rounds=A.myRounds(ui.meId), ro=A.readOnly();
      var rail='<aside class="rail"><div class="rail-h"><h2>รอบการลา</h2><button class="btn btn-sm" data-act="roundNew"'+(ro?' disabled':'')+'>'+icon('plus')+'สร้างรอบ</button></div>';
      if(rounds.length) rail+='<ul class="rounds">'+rounds.map(function(r){
        var pg=roundProgress(r), full=(pg.tot>0&&pg.cov===pg.tot), past=lastDate(r)<S.todayISO();
        return '<li><button class="round'+(r.id===ui.roundId?' on':'')+(past?' past':'')+'" data-act="roundSel" data-id="'+h(r.id)+'">'+
          '<b>'+h(A.roundSpan(r))+'</b>'+(r.note?'<span class="round-n">'+h(r.note)+'</span>':'')+
          '<span class="round-p"><i class="bar"><i style="width:'+(pg.tot?Math.round(pg.cov*100/pg.tot):0)+'%" class="'+(full?'full':'')+'"></i></i>'+
          (pg.tot?('มีคนแทน '+pg.cov+'/'+pg.tot+' คาบ'):'ยังไม่ได้เลือกคาบ')+'</span></button></li>'; }).join('')+'</ul>';
      else rail+='<p class="rail-empty">ยังไม่มีรอบการลา สร้างรอบเพื่อระบุวันและคาบที่ลาให้ชัด แล้วติดตามได้ว่าคาบไหนยังไม่มีคนแทน (ไม่บังคับ)</p>';
      rail+='<label class="rail-adhoc"><span>หรือดูทีละวัน ไม่สร้างรอบ</span><input type="date" class="inp" data-chg="adhocDate" value="'+h(ui.roundId?'':(ui.date||''))+'"></label></aside>';

      var main='';
      var round=ui.roundId?A.roundById(ui.roundId):null;
      if(round){
        var pg=roundProgress(round), days=(round.days||[]).slice().sort(function(a,b){ return a.date<b.date?-1:1; });
        main+='<div class="plan-h"><div><h2>'+h(A.roundSpan(round))+(round.note?' <span class="muted">· '+h(round.note)+'</span>':'')+'</h2>'+
          '<p class="muted">'+days.length+' วัน · ลา '+pg.tot+' คาบ · มีคนแทนแล้ว '+pg.cov+' คาบ'+(pg.tot&&pg.cov===pg.tot?' — ครบแล้ว':'')+'</p></div>'+
          '<div class="plan-acts"><button class="btn btn-sm" data-act="roundEdit" data-id="'+h(round.id)+'"'+(ro?' disabled':'')+'>'+icon('edit')+'แก้ไขรอบ</button>'+
          '<a class="btn btn-sm" href="#timetable/'+encodeURIComponent(ui.meId)+'/'+encodeURIComponent(round.id)+'">'+icon('table')+'ตารางของรอบนี้</a>'+
          '<a class="btn btn-sm" href="#form/'+encodeURIComponent(ui.meId)+'/'+encodeURIComponent(round.id)+'">'+icon('doc')+'ใบขอแลกคาบ</a></div></div>';
        main+=days.map(function(d){ return dayCard(d.date, d); }).join('');
      } else if(ui.date){
        var f=S.leaveRoundFor(ui.meId, ui.date);
        main+='<div class="plan-h"><div><h2>ดูทีละวัน</h2><p class="muted">วันที่นี้'+(f?'อยู่ในรอบการลา '+h(A.roundSpan(f.round)):'ยังไม่อยู่ในรอบการลาใด')+'</p></div>'+
          '<div class="plan-acts">'+(f?'<button class="btn btn-sm" data-act="roundSel" data-id="'+h(f.round.id)+'">เปิดรอบนี้</button>'
            :'<button class="btn btn-sm" data-act="roundNew"'+(ro?' disabled':'')+'>'+icon('plus')+'สร้างรอบการลาจากวันนี้</button>')+'</div></div>';
        main+=dayCard(ui.date, f?f.day:null);
      }
      return head+A.remindersHTML()+'<div class="plan">'+rail+'<section class="plan-main">'+main+'</section></div>';
    }
  };

  /* ---------- handlers ---------- */
  A.acts.pickMe=function(){
    A.pickTeacher(ui.meId, function(id){ ui.meId=id; ui.roundId=null; ui.date=null; A.savePrefs(); A.render(); }, {title:'ใครเป็นผู้ลา?'});
  };
  A.acts.roundSel=function(el){ ui.roundId=el.getAttribute('data-id'); ui.date=null; A.render(); };
  A.chgs.adhocDate=function(el){ if(!el.value) return; ui.date=el.value; ui.roundId=null; A.render(); };
  A.chgs.leaveTick=function(el){
    if(A.readOnly()){ A.rerender(); return; }
    var date=el.getAttribute('data-date'), per=el.getAttribute('data-per'), f=S.leaveRoundFor(ui.meId, date); if(!f) return;
    var set={}; (f.day.periods||[]).forEach(function(p){ set[String(p)]=1; });
    if(el.checked) set[per]=1; else delete set[per];
    S.leaveSetPeriods(ui.meId, date, Object.keys(set));
    A.rerender();
  };

  /* ---------- leave round editor ---------- */
  function openRoundEditor(roundId){
    if(A.readOnly()){ A.toast(S.readOnlyText(),{bad:true}); return; }
    var tid=ui.meId, existing=roundId?A.roundById(roundId):null;
    var from=existing?firstDate(existing):(ui.date||defaultDate()), to=existing?lastDate(existing):from;
    var modeOf={}, perOf={};
    if(existing) existing.days.forEach(function(d){ modeOf[d.date]=d.mode; perOf[d.date]=(d.periods||[]).slice(); });
    function dayRows(f,t){
      var ds=S.leaveDatesBetween(f,t,tid);
      if(!ds.length) return '<p class="empty">ไม่มีวันที่มีคาบสอนในช่วงนี้</p>';
      return ds.map(function(iso){
        var m=modeOf[iso]||'ทั้งวัน';
        return '<div class="lv-day"><div class="lv-date"><b>'+h(A.dLong(iso))+'</b><span class="muted">'+S.leaveTeachingCount(tid,iso)+' คาบสอน</span></div><div class="seg seg-sm">'+
          S.LEAVE_MODES.map(function(md){ return '<label><input type="radio" name="lvm_'+iso+'" value="'+md+'"'+(md===m?' checked':'')+'><span>'+md+'</span></label>'; }).join('')+'</div></div>';
      }).join('');
    }
    var d=A.dialog('<h2 class="dlg-h">'+(existing?'แก้ไขรอบการลา':'สร้างรอบการลา')+'</h2>'+
      '<p class="muted">'+h(A.tName(tid))+'</p>'+
      '<div class="row2"><label class="fld"><span>ตั้งแต่</span><input type="date" class="inp" id="lvFrom" value="'+h(from)+'"></label>'+
      '<label class="fld"><span>ถึง</span><input type="date" class="inp" id="lvTo" value="'+h(to)+'"></label></div>'+
      '<div id="lvDays" class="lv-days">'+dayRows(from,to)+'</div>'+
      '<label class="fld"><span>หมายเหตุ (ไม่บังคับ)</span><input class="inp" id="lvNote" value="'+h(existing?(existing.note||''):'')+'" placeholder="เช่น ไปราชการ"></label>'+
      '<p class="hint">เลือก “บางคาบ” แล้วไปติ๊กคาบที่ลาในหน้าแผน · เสาร์–อาทิตย์และวันที่ไม่มีคาบสอนถูกข้ามให้</p>'+
      '<p class="err" id="lvMsg" hidden></p>'+
      '<div class="dlg-acts">'+(existing?'<button class="btn btn-danger-ghost" id="lvDel">ลบรอบนี้</button>':'')+
      '<span class="grow"></span><button class="btn" data-act="dlgClose">ยกเลิก</button><button class="btn btn-primary" id="lvSave">บันทึกรอบการลา</button></div>');
    function g(id){ return d.querySelector('#'+id); }
    function refresh(){
      d.querySelectorAll('input[type=radio]:checked').forEach(function(r){ modeOf[r.name.slice(4)]=r.value; });
      if(g('lvTo').value<g('lvFrom').value) g('lvTo').value=g('lvFrom').value;
      g('lvDays').innerHTML=dayRows(g('lvFrom').value, g('lvTo').value);
    }
    g('lvFrom').onchange=refresh; g('lvTo').onchange=refresh;
    if(existing) g('lvDel').onclick=function(){
      A.closeDialog();
      A.ask({title:'ลบรอบการลานี้?', body:'<p>รายการแลกคาบที่บันทึกไว้แล้วจะไม่ถูกลบ</p>', ok:'ลบรอบ', danger:true}).then(function(y){
        if(!y) return; S.leaveDeleteRound(existing.id); ui.roundId=null; ui.date=null; A.render(); });
    };
    g('lvSave').onclick=function(){
      var f=g('lvFrom').value, t=g('lvTo').value, ds=S.leaveDatesBetween(f,t,tid), days=[], msg=g('lvMsg');
      if(!ds.length){ msg.hidden=false; msg.textContent='ไม่มีวันที่มีคาบสอนในช่วงนี้'; return; }
      ds.forEach(function(iso){
        var picked=d.querySelector('input[name="lvm_'+iso+'"]:checked'), md=picked?picked.value:(modeOf[iso]||'ทั้งวัน');
        days.push({date:iso, mode:md, periods:(md==='บางคาบ' && perOf[iso]) ? perOf[iso] : S.leavePresetPeriods(tid,iso,md)});
      });
      var r=S.leaveSaveRound(tid, g('lvNote').value, days, existing?existing.id:null);
      if(!r.ok){ msg.hidden=false; msg.textContent=r.error; return; }
      ui.roundId=r.id; ui.date=null; A.closeDialog(); A.render();
    };
  }
  A.acts.roundNew=function(){ if(!ui.meId){ A.acts.pickMe(); return; } openRoundEditor(null); };
  A.acts.roundEdit=function(el){ openRoundEditor(el.getAttribute('data-id')); };

  /* ---------- off-roster substitute (F13) ---------- */
  function extNames(){ var seen={}, out=[]; A.log().forEach(function(e){ if(e.y_id==='' && e.y_name && !seen[e.y_name]){ seen[e.y_name]=1; out.push(e.y_name); } }); return out.sort(); }
  function rosterMatch(name){
    var n=S._s(name).toLowerCase(); if(!n) return null; var L=A.teachers();
    for(var i=0;i<L.length;i++){ var tn=S._s(L[i].name).toLowerCase(); if(tn===n || (n.length>=6 && tn.indexOf(n)>=0)) return L[i]; }
    return null;
  }
  A.openExternal=function(dateISO, per){
    if(A.readOnly()){ A.toast(S.readOnlyText(),{bad:true}); return; }
    var eng=A.eng(), day=S.weekdayThai(dateISO), v=eng.validateSource(ui.meId, day, String(per));
    if(v.valid!=='VALID'){ A.toast(v.message||'คาบนี้แลกไม่ได้',{bad:true}); return; }
    var src=v.source;
    var d=A.dialog('<h2 class="dlg-h">ให้คนนอกสอนแทน</h2>'+
      '<p class="slotline">'+h(A.dLong(dateISO))+' · คาบ '+h(per)+' · '+h(src.subject||'')+' '+h(A.cls(src.group))+(src.room?' · ห้อง '+h(src.room):'')+'</p>'+
      '<label class="fld"><span>ชื่อผู้สอนแทน</span><input class="inp" id="extName" list="extNames" autocomplete="off" placeholder="เช่น นายสมชาย ใจดี" autofocus></label>'+
      '<datalist id="extNames">'+extNames().map(function(n){ return '<option value="'+h(n)+'">'; }).join('')+'</datalist>'+
      '<p class="hint" id="extHint" hidden></p>'+
      '<label class="fld"><span>หมายเหตุ (ไม่บังคับ)</span><input class="inp" id="extNote" autocomplete="off" placeholder="เช่น นักศึกษาฝึกสอน"></label>'+
      '<p class="hint">ผู้สอนแทนนอกระบบไม่มีตารางสอนในโปรแกรม จึงตรวจเวลาซ้อนให้ไม่ได้</p>'+
      '<p class="err" id="extMsg" hidden></p>'+
      '<div class="dlg-acts"><button class="btn" data-act="dlgClose">ยกเลิก</button><button class="btn btn-primary" id="extSave">บันทึกเป็นข้อเสนอ</button></div>');
    var nameEl=d.querySelector('#extName'), hint=d.querySelector('#extHint'), msg=d.querySelector('#extMsg');
    nameEl.oninput=function(){
      var t=rosterMatch(nameEl.value); hint.hidden=!t;
      if(t) hint.innerHTML='ชื่อนี้ตรงกับ <b>'+h(t.name)+'</b> ซึ่งอยู่ในระบบ — <a href="#pick/'+dateISO+'/'+per+'/sub" data-act="dlgClose">เลือกจากรายชื่อครูแทน</a> เพื่อให้โปรแกรมตรวจเวลาซ้อนได้';
    };
    d.querySelector('#extSave').onclick=function(){
      var nm=S._s(nameEl.value);
      if(!nm){ msg.hidden=false; msg.textContent='กรุณากรอกชื่อผู้สอนแทน'; nameEl.focus(); return; }
      var r=A.commitEntry({
        id:'log_'+Date.now()+'_x', created_at:new Date().toISOString(), date_proposed:ui.dateProposed||'', status:'เสนอ',
        me_id:ui.meId, me_name:A.tName(ui.meId), day_give:day, per_give:String(per),
        subject_give:src.subject||'', group_give:src.group||'', room_give:src.room||'', date_absent:dateISO,
        kind:'สอนแทน', y_id:'', y_name:nm, y_note:S._s(d.querySelector('#extNote').value), y_phone:'',
        day_back:'', per_back:'', y_sub:'', y_room:'', room_back:'', date_back:'', week_offset:null,
        score:null, impact_tag:'ผู้สอนแทนนอกระบบ', warnings:[] });
      if(!r.ok){ msg.hidden=false; msg.textContent=r.error; return; }
      A.closeDialog(); A.toast('บันทึกข้อเสนอแล้ว (ผู้สอนแทนนอกระบบ)');
      if(A.route.name==='pick') A.go('#plan'); else A.rerender();
    };
  };
  A.acts.extOpen=function(el){ A.openExternal(el.getAttribute('data-date'), el.getAttribute('data-per')); };
})();
