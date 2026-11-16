/* Preview UI — shared foundation: state, router, small components, and the
   domain helpers every page uses (names, dates, entries, timetable renderer).
   All scheduling logic lives in core.js (generated from the stable app). */
(function(){
  'use strict';
  var S=window.SWAP, STORE=S.STORE;
  var A=window.APP={S:S, STORE:STORE, pages:{}, acts:{}, chgs:{}, inps:{}};
  var h=A.h=S.esc;

  /* ───────── icons ───────── */
  var ICONS={
    plan:'M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
    list:'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
    table:'M4 5h16v14H4zM4 10h16M4 15h16M9 5v14M15 5v14',
    doc:'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
    data:'M4 7h10M18 7h2M4 17h4M12 17h8M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM8 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z',
    search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    print:'M7 8V4h10v4M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
    phone:'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
    back:'M15 5l-7 7 7 7', plus:'M12 5v14M5 12h14', x:'M6 6l12 12M18 6L6 18',
    warn:'M12 4l9 16H3zM12 10v4M12 17h.01', swap:'M7 7h11l-3-3M17 17H6l3 3',
    user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', check:'M5 12l5 5 9-10',
    copy:'M9 9h10v11H9zM5 15V4h10', edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', chev:'M9 6l6 6-6 6',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    down:'M12 4v12M6 11l6 6 6-6M5 20h14', up:'M12 20V8M6 13l6-6 6 6M5 4h14', trash:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13'
  };
  var icon=A.icon=function(n){ return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(ICONS[n]||'')+'"/></svg>'; };

  /* ───────── state ───────── */
  var ui=A.ui={ meId:null, roundId:null, date:null, pref:null, dateProposed:null };
  function loadPrefs(){ try{ var p=JSON.parse(localStorage.getItem('swap_preview_ui')||'{}'); if(p.meId) ui.meId=p.meId; }catch(_){} }
  A.savePrefs=function(){ try{ localStorage.setItem('swap_preview_ui', JSON.stringify({meId:ui.meId})); }catch(_){} };
  loadPrefs();

  A.sem=function(){ return STORE.activeSemester(); };
  A.log=function(){ var s=A.sem(); if(!s) return []; if(!s.log) s.log=[]; return s.log; };
  A.readOnly=function(){ return S.isReadOnly(); };
  var _eng=null,_engSem=null,_teachers=null;
  A.invalidate=function(){ _eng=null; _engSem=null; _teachers=null; };
  A.eng=function(){
    var s=A.sem(); if(!s||!s.schedule) return null;
    if(_eng && _engSem===s && _eng.log===(s.log||(s.log=[]))) return _eng;
    _engSem=s; _eng=new S.Engine(s.schedule, STORE.data.settings, s.log||(s.log=[])); return _eng;
  };
  A.teachers=function(){
    var s=A.sem(); if(!s) return [];
    if(_teachers && _teachers.sem===s) return _teachers.list;
    var list=S.teacherList(), map=Object.create(null);
    list.forEach(function(t){ map[t.id]=t; });
    _teachers={sem:s, list:list, map:map}; return list;
  };
  A.teacher=function(id){ A.teachers(); return (_teachers&&_teachers.map[id])||null; };
  A.tName=function(id){ var t=A.teacher(id); return t?t.name:(id||''); };

  /* ───────── formatting ───────── */
  var DAB={'จันทร์':'จ.','อังคาร':'อ.','พุธ':'พ.','พฤหัสฯ':'พฤ.','ศุกร์':'ศ.'};
  A.short=function(name){ var n=S.stripTitle(name||''); return n?('ครู'+n):''; };
  A.cls=function(g){ return S.groupToClass(g)||'—'; };
  function dayOf(iso){ return S.weekdayThai(String(iso).slice(0,10)); }
  A.dayOf=dayOf;
  A.dShort=function(iso){ if(!iso) return '—'; iso=String(iso).slice(0,10); var b=S._bd(iso), d=dayOf(iso);
    return (d?DAB[d]+' ':'')+b.d+' '+S.TH_MON[b.m-1]; };
  A.dMid=function(iso){ if(!iso) return '—'; iso=String(iso).slice(0,10); return A.dShort(iso)+' '+String(S._bd(iso).y).slice(-2); };
  A.dLong=function(iso){ if(!iso) return '—'; iso=String(iso).slice(0,10); var d=dayOf(iso);
    return (d?'วัน'+d+' ':'')+S.formatBE(iso,false); };
  A.span=function(a,b){ if(a===b) return S.formatBE(a,false);
    var x=S._bd(a), y=S._bd(b);
    if(x.y===y.y && x.m===y.m) return x.d+'–'+y.d+' '+S.TH_MON[y.m-1]+' '+y.y;
    return x.d+' '+S.TH_MON[x.m-1]+' – '+S.formatBE(b,false); };
  A.phoneLink=function(ph){ if(!ph) return '<span class="muted">ไม่มีเบอร์ติดต่อ</span>';
    return '<a class="tel" href="tel:'+h(String(ph).replace(/[^0-9+]/g,''))+'">'+icon('phone')+h(S.displayPhone(ph))+'</a>'; };

  var ST={'เสนอ':{c:'prop',t:'เสนอ',d:'กำลังคุยกับครูปลายทาง'},'รออนุมัติ':{c:'wait',t:'รออนุมัติ',d:'ตกลงกันแล้ว รอผู้บริหารอนุมัติ'},
          'อนุมัติแล้ว':{c:'done',t:'อนุมัติแล้ว',d:'มีผลในตารางสอนจริง'},'ยกเลิก':{c:'cancel',t:'ยกเลิก',d:'ไม่จองคาบอีกต่อไป'}};
  A.ST=ST; A.STATUSES=['เสนอ','รออนุมัติ','อนุมัติแล้ว','ยกเลิก'];
  A.chip=function(st, extra){ var m=ST[st]||{c:'none',t:st}; return '<span class="chip st-'+m.c+'">'+h(m.t)+(extra?' '+extra:'')+'</span>'; };
  A.statusSelect=function(e){
    return '<select class="sel st-sel st-'+(ST[e.status]||{}).c+'" data-chg="setStatus" data-id="'+h(e.id)+'" aria-label="สถานะ"'+(A.readOnly()?' disabled':'')+'>'+
      A.STATUSES.map(function(s){ return '<option value="'+s+'"'+(s===e.status?' selected':'')+'>'+s+'</option>'; }).join('')+'</select>';
  };

  /* ───────── entries ───────── */
  A.live=function(){ return A.log().filter(function(e){ return e && e.status!=='ยกเลิก'; }); };
  A.entryAt=function(me, dateISO, per){
    var log=A.log(), d=String(dateISO).slice(0,10), best=null, cancelled=0;
    for(var i=0;i<log.length;i++){ var e=log[i];
      if(e.me_id===me && String(e.date_absent).slice(0,10)===d && String(e.per_give)===String(per)){
        if(e.status==='ยกเลิก') cancelled++; else best=e; } }
    return {entry:best, cancelled:cancelled};
  };
  // the partner key used in routes: teacher id, or "~name" for an off-roster substitute
  A.partnerKey=function(e){ return e.y_id ? e.y_id : '~'+(e.y_name||''); };
  A.partnerLabel=function(e){ return e.y_name||e.y_id||'—'; };

  // plain-Thai sentences describing what one entry changes (time swap: each
  // teacher keeps their own subject and room — BLUEPRINT stage 20)
  A.entryLines=function(e){
    var me=A.short(e.me_name)||e.me_id, y=S.isExternalSub(e)?(e.y_name||'ผู้สอนแทน'):(A.short(e.y_name)||e.y_id), c=A.cls(e.group_give), out=[];
    if(S.isSubOnly(e)){
      out.push({date:e.date_absent, per:e.per_give, who:y,
        text:y+' สอนแทน '+(e.subject_give||'')+' '+c+(e.room_give?' ห้อง '+e.room_give:''), sub:'คาบของ'+me+' · ไม่มีการสอนคืน'+(S.isExternalSub(e)?' · ผู้สอนแทนนอกระบบ':'')});
      return out;
    }
    var yr=e.y_room||e.room_back||'';
    out.push({date:e.date_absent, per:e.per_give, who:y,
      text:y+' เข้าสอน '+(e.y_sub||'วิชาของตน')+' '+c+(yr?' ห้อง '+yr:''), sub:'ใช้เวลาคาบ '+(e.subject_give||'')+' ของ'+me});
    out.push({date:e.date_back, per:e.per_back, who:me,
      text:me+' สอน '+(e.subject_give||'')+' '+c+(e.room_give?' ห้อง '+e.room_give:''), sub:'สอนคืนในเวลาคาบ '+(e.y_sub||'')+' ของ'+y});
    return out;
  };
  // engine tags still say "Me / Y" inside stored rows — translate for display only
  A.humanWarn=function(t, e){
    var me=A.short(e.me_name)||'ผู้ลา', y=A.short(e.y_name)||'ครูคู่แลก';
    return String(t||'').replace(/⚠️\s*/g,'').replace(/ครู Me/g,me).replace(/ครู Y/g,y)
      .replace(/ประชุม Me/g,me+'ต้องงดประชุม').replace(/ประชุม Y/g,y+'ต้องงดประชุม').trim();
  };

  /* write-gates: the same three checks the stable app runs, in the same order */
  A.commitEntry=function(entry){
    var sem=A.sem(); if(!sem) return {ok:false, error:'ยังไม่มีภาคเรียน'};
    if(A.readOnly()) return {ok:false, error:S.readOnlyText()};
    var log=A.log();
    for(var i=0;i<log.length;i++){ var ex=log[i];
      if(ex && ex.status!=='ยกเลิก' && ex.me_id===entry.me_id && ex.date_absent===entry.date_absent && String(ex.per_give)===String(entry.per_give))
        return {ok:false, error:'คาบนี้มีผู้สอนแทนอยู่แล้ว — '+(ex.y_name||ex.y_id)+' (สถานะ: '+ex.status+') หากต้องการเปลี่ยน ให้ยกเลิกรายการเดิมก่อน'}; }
    var cf=S.ledgerConflicts(log, entry);
    if(cf.length) return {ok:false, error:'ชนกับรายการที่มีอยู่ — '+S.ledgerConflictText(cf[0])};
    log.push(entry);
    var r=STORE.save();
    if(!r.ok){ log.pop(); return {ok:false, error:r.error}; }
    return {ok:true, id:entry.id};
  };
  A.setStatus=function(id, st){
    if(A.readOnly()) return {ok:false, error:S.readOnlyText()};
    var f=S.findLogEntry(id); if(!f) return {ok:false, error:'ไม่พบรายการ'};
    var blk=S.statusChangeBlocked(f, st); if(blk) return {ok:false, error:blk};
    var old=f.e.status; if(old===st) return {ok:true};
    f.e.status=st; S.bumpApprovalIfNeeded(old, st);
    var r=STORE.save(); if(!r.ok){ f.e.status=old; return r; }
    return {ok:true};
  };
  A.deleteEntry=function(id){
    if(A.readOnly()) return {ok:false, error:S.readOnlyText()};
    var f=S.findLogEntry(id); if(!f) return {ok:false, error:'ไม่พบรายการ'};
    if(f.e.status!=='เสนอ') return {ok:false, error:'ลบได้เฉพาะรายการที่ยัง “เสนอ” — รายการอื่นให้เปลี่ยนเป็น “ยกเลิก”'};
    var keep=f.log.splice(f.i,1)[0], r=STORE.save();
    if(!r.ok){ f.log.splice(f.i,0,keep); return r; }
    return {ok:true};
  };

  /* ───────── timetable renderer (approved base + optional overlay) ─────────
     `entries` is the list applied on top of the base timetable. A row that is
     not yet อนุมัติแล้ว renders as a draft, so a simulation can never be
     mistaken for the real thing. */
  function parts(subject, group, room){ var b=[]; if(subject) b.push(subject); if(group) b.push(A.cls(group)); if(room) b.push('ห้อง '+room); return b.join(' · ')||'—'; }
  function ttMatches(tid, dateISO, per, entries){
    var out=[], p=String(per);
    for(var i=0;i<entries.length;i++){ var e=entries[i], da=String(e.date_absent||'').slice(0,10), db=String(e.date_back||'').slice(0,10);
      if(e.me_id===tid && da===dateISO && String(e.per_give)===p) out.push({e:e, role:'meOut'});
      else if(e.y_id && e.y_id===tid && da===dateISO && String(e.per_give)===p) out.push({e:e, role:'yIn'});
      else if(e.y_id && e.y_id===tid && db && db===dateISO && String(e.per_back)===p) out.push({e:e, role:'yOut'});
      else if(e.me_id===tid && db && db===dateISO && String(e.per_back)===p) out.push({e:e, role:'meIn'});
    }
    return out;
  }
  function ttBase(eng, tid, day, per){
    var row=eng?eng.row(tid, day, per):null;
    if(!row){
      if(eng && String(eng.displayLunch(tid, day))===String(per)) return {cls:'tt-lunch', html:'<div class="tt-cell tt-dim">พักกลางวัน</div>'};
      return {cls:'', html:'<div class="tt-cell tt-blank">—</div>'};
    }
    if(row.status==='NON_TEACHING') return {cls:'tt-nt', html:'<div class="tt-cell tt-dim">'+h(row.raw_cell||row.room||row.subject||'กิจกรรม')+'</div>'};
    return {cls:'', html:'<div class="tt-cell"><div class="tt-main">'+h(row.subject||'—')+'</div><div class="tt-sub">'+h(A.cls(row.group))+'</div><div class="tt-sub">ห้อง '+h(row.room||'—')+'</div></div>'};
  }
  function ttSwap(m, day, per, notes){
    var e=m.e, draft=e.status!=='อนุมัติแล้ว', tag='', dr=draft?'ร่าง · ':'';
    var meClass=parts(e.subject_give, e.group_give, e.room_give), yRoom=e.y_room||e.room_back||'';
    var yClass=parts(e.y_sub, e.group_give, yRoom), me=e.me_name||e.me_id, y=e.y_name||e.y_id;
    var stamp=(draft?'ข้อเสนอ (ยังไม่อนุมัติ)':'ตามบันทึก')+' ลงวันที่ '+S.beShort(e.date_proposed||e.created_at||'');
    var pre='คาบ '+per+' วัน'+day+': ', cls=(draft?' tt-draft':'');
    function mv(d,p,dt){ return (dt?A.dShort(dt):'วัน'+d)+' คาบ '+p; }
    if(m.role==='meOut'){
      if(S.isSubOnly(e)){
        var who=h(y)+(S.isExternalSub(e)?' (นอกระบบ'+(e.y_note?' · '+h(e.y_note):'')+')':'');
        notes.push(pre+'มีผู้มาสอนแทน — '+y+(S.isExternalSub(e)?' (นอกระบบ)':'')+'; ไม่มีการสอนคืน '+stamp);
        return {cls:'tt-out'+cls, html:'<div class="tt-cell"><div class="tt-mark">'+dr+'มีคนแทน</div><div class="tt-sub">'+h(meClass)+'</div><div class="tt-by">ผู้สอนแทน: '+who+'</div></div>'};
      }
      notes.push(pre+'คาบของครูคนนี้ ('+meClass+') ย้ายไป '+mv(e.day_back,e.per_back,e.date_back)+'; '+y+' ใช้เวลานี้สอน '+yClass+' — '+stamp);
      return {cls:'tt-out'+cls, html:'<div class="tt-cell"><div class="tt-mark">'+dr+'ย้ายออก</div><div class="tt-main">→ '+h(mv(e.day_back,e.per_back,e.date_back))+'</div><div class="tt-sub">'+h(meClass)+'</div><div class="tt-by">คู่แลก: '+h(y)+'</div></div>'};
    }
    if(m.role==='yIn'){
      if(S.isSubOnly(e)){
        notes.push(pre+'สอนแทน '+me+' — '+meClass+'; ไม่มีการสอนคืน '+stamp);
        return {cls:'tt-in'+cls, html:'<div class="tt-cell"><div class="tt-mark">'+dr+'สอนแทน</div><div class="tt-main">'+h(e.subject_give||'—')+'</div><div class="tt-sub">'+h(A.cls(e.group_give))+' · ห้อง '+h(e.room_give||'—')+'</div><div class="tt-by">แทน '+h(me)+'</div></div>'};
      }
      notes.push(pre+'คาบของครูคนนี้ ('+yClass+') ย้ายมาจาก '+mv(e.day_back,e.per_back,e.date_back)+'; ใช้เวลาแทน '+me+' — '+stamp);
      return {cls:'tt-in'+cls, html:'<div class="tt-cell"><div class="tt-mark">'+dr+'ย้ายเข้า</div><div class="tt-main">'+h(e.y_sub||'—')+'</div><div class="tt-sub">'+h(A.cls(e.group_give))+' · ห้อง '+h(yRoom||'—')+'</div><div class="tt-by">จาก '+h(mv(e.day_back,e.per_back,e.date_back))+'</div></div>'};
    }
    if(m.role==='yOut'){
      notes.push(pre+'คาบของครูคนนี้ ('+yClass+') ย้ายไป '+mv(e.day_give,e.per_give,e.date_absent)+'; '+me+' ใช้เวลานี้สอน '+meClass+' — '+stamp);
      return {cls:'tt-out'+cls, html:'<div class="tt-cell"><div class="tt-mark">'+dr+'ย้ายออก</div><div class="tt-main">→ '+h(mv(e.day_give,e.per_give,e.date_absent))+'</div><div class="tt-sub">'+h(yClass)+'</div><div class="tt-by">คู่แลก: '+h(me)+'</div></div>'};
    }
    notes.push(pre+'คาบของครูคนนี้ ('+meClass+') ย้ายมาจาก '+mv(e.day_give,e.per_give,e.date_absent)+'; ใช้เวลาแทน '+y+' — '+stamp);
    return {cls:'tt-in'+cls, html:'<div class="tt-cell"><div class="tt-mark">'+dr+'ย้ายเข้า</div><div class="tt-main">'+h(e.subject_give||'—')+'</div><div class="tt-sub">'+h(A.cls(e.group_give))+' · ห้อง '+h(e.room_give||'—')+'</div><div class="tt-by">จาก '+h(mv(e.day_give,e.per_give,e.date_absent))+'</div></div>'};
  }
  A.ttWeek=function(tid, weekStart, entries, opt){
    opt=opt||{};
    var eng=A.eng(), notes=[], meta=(A.sem()||{}).meta||{}, t=A.teacher(tid), anyDraft=false, changed=0;
    var body='';
    S.DAYS.forEach(function(dy){
      var dateISO=S.ttDateForDay(weekStart, dy);
      body+='<tr><th class="tt-day" scope="row">'+h(dy)+'<span>'+h(A.dShort(dateISO).replace(/^\S+\s/,''))+'</span></th>';
      for(var per=1;per<=9;per++){
        var ms=ttMatches(tid, dateISO, per, entries), cell;
        if(ms.length>1){
          notes.push('คาบ '+per+' วัน'+dy+': มี '+ms.length+' รายการซ้อนกันในคาบเดียว — ต้องแก้รายการแลกคาบก่อนใช้ตารางนี้');
          cell={cls:'tt-clash', html:'<div class="tt-cell"><div class="tt-mark">สอนซ้อน '+ms.length+' รายการ</div><div class="tt-by">ตารางนี้ยังใช้ไม่ได้จนกว่าจะแก้</div></div>'};
          changed++;
        } else if(ms.length===1){ cell=ttSwap(ms[0], dy, per, notes); changed++; if(ms[0].e.status!=='อนุมัติแล้ว') anyDraft=true; }
        else cell=ttBase(eng, tid, dy, String(per));
        body+='<td class="'+cell.cls+'">'+cell.html+'</td>';
      }
      body+='</tr>';
    });
    var head='<tr><th class="tt-corner">วัน</th>'; for(var p=1;p<=9;p++) head+='<th>คาบ '+p+'</th>'; head+='</tr>';
    return '<section class="tt-week'+(anyDraft?' is-draft':'')+'">'+
      '<header class="tt-head"><div><h3 class="tt-title">'+h(opt.title||('ตารางสอน '+(t?t.name:tid)))+'</h3>'+
        '<p class="tt-subtitle">สัปดาห์ '+h(A.span(weekStart, S.ttAddDays(weekStart,4)))+(opt.note?' · '+h(opt.note):'')+'</p></div>'+
        '<div class="tt-meta">'+(anyDraft?'<span class="tt-stamp">ตารางจำลอง — มีข้อเสนอที่ยังไม่อนุมัติ</span>':'')+
          '<span>รหัสครู '+h(tid)+' · ภาคเรียน '+h(meta.label||'—')+'</span></div></header>'+
      '<div class="tt-scroll"><table class="tt-table"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'+
      (notes.length?'<ol class="tt-foot">'+notes.map(function(n){ return '<li>'+h(n)+'</li>'; }).join('')+'</ol>':
        (opt.quietEmpty?'':'<p class="tt-foot-none">สัปดาห์นี้ไม่มีคาบที่เปลี่ยนแปลง</p>'))+
    '</section>';
  };
  A.ttLegend='<div class="tt-legend"><span><i class="lg in"></i>ย้ายเข้า / สอนแทน</span><span><i class="lg out"></i>ย้ายออก / มีคนสอนแทน</span><span><i class="lg draft"></i>กรอบประ = ข้อเสนอที่ยังไม่อนุมัติ</span></div>';
  A.weeksOf=function(entries, tid){
    var set=Object.create(null);
    entries.forEach(function(e){ if(tid && e.me_id!==tid && e.y_id!==tid) return;
      var a=S.ttWeekStart(e.date_absent), b=e.date_back?S.ttWeekStart(e.date_back):''; if(a) set[a]=1; if(b) set[b]=1; });
    return Object.keys(set).sort();
  };

  /* ───────── dialog / toast / teacher picker ───────── */
  var dlg;
  A.dialog=function(html, opt){
    opt=opt||{};
    dlg=document.getElementById('dlg');
    dlg.className='dlg '+(opt.cls||'');
    dlg.innerHTML='<div class="dlg-box">'+html+'</div>';
    if(!dlg.open) dlg.showModal();
    // a late close event from the previous dialog must not tear down the one just opened
    dlg.onclose=function(){ if(dlg.open) return; dlg.innerHTML=''; if(opt.onClose) opt.onClose(); };
    var f=dlg.querySelector('[autofocus]'); if(f) f.focus();
    return dlg;
  };
  A.closeDialog=function(){ var d=document.getElementById('dlg'); if(d&&d.open) d.close(); };
  A.acts.dlgClose=A.closeDialog;
  A.ask=function(o){
    return new Promise(function(res){
      var done=false;
      A.dialog('<h2 class="dlg-h">'+h(o.title)+'</h2>'+(o.body?'<div class="dlg-body">'+o.body+'</div>':'')+
        '<div class="dlg-acts"><button class="btn" data-act="dlgClose">'+h(o.cancel||'ยกเลิก')+'</button>'+
        '<button class="btn '+(o.danger?'btn-danger':'btn-primary')+'" id="askOk" autofocus>'+h(o.ok||'ตกลง')+'</button></div>',
        {cls:'dlg-sm', onClose:function(){ if(!done) res(false); }});
      document.getElementById('askOk').onclick=function(){ done=true; A.closeDialog(); res(true); };
    });
  };
  A.tell=function(title, body){ A.dialog('<h2 class="dlg-h">'+h(title)+'</h2><div class="dlg-body">'+body+'</div><div class="dlg-acts"><button class="btn btn-primary" data-act="dlgClose" autofocus>รับทราบ</button></div>',{cls:'dlg-sm'}); };
  var toastT;
  A.toast=function(msg, o){
    o=o||{}; var t=document.getElementById('toast');
    t.innerHTML='<span>'+h(msg)+'</span>'+(o.go?'<a class="toast-go" href="'+h(o.go)+'">'+h(o.label||'ดู')+'</a>':'');
    t.className='toast show'+(o.bad?' bad':''); clearTimeout(toastT);
    toastT=setTimeout(function(){ t.className='toast'; }, o.bad?7000:4200);
  };

  // A committed teacher only ever changes by picking from the list (audit F06).
  A.pickTeacher=function(cur, onPick, opt){
    opt=opt||{};
    var list=A.teachers(), first=opt.first||[];
    A.dialog('<h2 class="dlg-h">'+h(opt.title||'เลือกครู')+'</h2>'+
      '<div class="pick-search">'+icon('search')+'<input id="tpQ" class="inp" type="search" placeholder="พิมพ์ชื่อหรือรหัสครู" autocomplete="off" autofocus></div>'+
      '<ul class="pick-list" id="tpL" role="listbox"></ul>'+
      '<div class="dlg-acts"><button class="btn" data-act="dlgClose">ปิด</button></div>', {cls:'dlg-pick'});
    var q=document.getElementById('tpQ'), ul=document.getElementById('tpL'), act=0, shown=[];
    function draw(){
      var s=q.value.trim().toLowerCase();
      var base=s?list.filter(function(t){ return (t.id+' '+t.name).toLowerCase().indexOf(s)>=0; }):
        first.map(function(id){ return A.teacher(id); }).filter(Boolean).concat(list.filter(function(t){ return first.indexOf(t.id)<0; }));
      shown=base.slice(0,80); if(act>=shown.length) act=0;
      ul.innerHTML=shown.length?shown.map(function(t,i){
        return '<li role="option" data-id="'+h(t.id)+'" class="'+(i===act?'on ':'')+(t.id===cur?'cur':'')+'"><b>'+h(t.name)+'</b><span>'+h(t.id)+'</span></li>'; }).join('')+
        (base.length>80?'<li class="more">… พิมพ์เพื่อค้นหาเพิ่ม ('+base.length+' คน)</li>':'')
        :'<li class="more">ไม่พบครูที่ตรงกับคำค้น</li>';
    }
    function choose(id){ if(!id) return; A.closeDialog(); onPick(id); }
    q.oninput=function(){ act=0; draw(); };
    q.onkeydown=function(ev){
      if(ev.key==='ArrowDown'){ ev.preventDefault(); act=Math.min(act+1, shown.length-1); draw(); }
      else if(ev.key==='ArrowUp'){ ev.preventDefault(); act=Math.max(act-1,0); draw(); }
      else if(ev.key==='Enter'){ ev.preventDefault(); if(shown[act]) choose(shown[act].id); }
      var on=ul.querySelector('.on'); if(on) on.scrollIntoView({block:'nearest'});
    };
    ul.onclick=function(ev){ var li=ev.target.closest('li[data-id]'); if(li) choose(li.getAttribute('data-id')); };
    draw();
  };
  A.whoButton=function(id, act, label){
    var t=A.teacher(id);
    return '<button class="who" data-act="'+act+'" title="เปลี่ยนครู">'+icon('user')+
      '<span class="who-l">'+h(label||'ครู')+'</span><span class="who-n">'+(t?h(t.name)+' <i>'+h(t.id)+'</i>':'เลือกครู…')+'</span>'+icon('chev')+'</button>';
  };

  /* ───────── downloads / lazy assets ───────── */
  A.download=function(blob, name){
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1500);
  };
  var loaded={};
  A.loadScript=function(src){
    if(loaded[src]) return loaded[src];
    loaded[src]=new Promise(function(res, rej){
      var s=document.createElement('script'); s.src=src;
      s.onload=function(){ res(); }; s.onerror=function(){ delete loaded[src]; rej(new Error('โหลด '+src+' ไม่สำเร็จ')); };
      document.head.appendChild(s);
    });
    return loaded[src];
  };
  A.needXLSX=function(){ return (typeof XLSX!=='undefined') ? Promise.resolve() : A.loadScript('assets/xlsx.js'); };

  /* ───────── audit banners (ledger reports, recomputed every render) ───────── */
  A.auditHTML=function(opt){
    opt=opt||{};
    if(!A.sem()) return '';
    var a=S.auditActive(), out='', today=S.todayISO();
    if(a.collisions.length){
      out+='<div class="banner bad">'+icon('warn')+'<div><b>พบการสอนซ้อน '+a.collisions.length+' จุด — ต้องแก้ก่อนใช้ตารางหรือเอกสาร</b><ul>'+
        a.collisions.map(function(c){
          var e0=c.claims[0].entry, who=(c.claims[0].tid===e0.me_id)?(e0.me_name||e0.me_id):(e0.y_name||e0.y_id);
          return '<li>'+h(who)+(c.kind==='BUSY'?' ถูกจองให้สอน ':' ยกคาบ ')+h(A.dMid(c.date))+' คาบ '+h(c.period)+(c.kind==='BUSY'?' พร้อมกัน ':' ให้คนอื่น ')+c.claims.length+' รายการ</li>'; }).join('')+
        '</ul>'+(opt.link!==false?'<a href="#list">เปิดรายการแลกคาบเพื่อยกเลิกรายการที่ซ้อน</a>':'')+'</div></div>';
    }
    if(opt.collisionsOnly) return out;
    var unc=opt.futureOnly?a.uncovered.filter(function(u){ return u.date>=today; }):a.uncovered;
    if(opt.skip) unc=unc.filter(function(u){ return !opt.skip(u); });
    if(unc.length){
      out+='<div class="banner warn">'+icon('warn')+'<div><b>มี '+unc.length+' คาบที่ลาแล้วยังไม่มีคนสอนแทน</b><ul>'+
        unc.slice(0,8).map(function(u){ return '<li>'+h(A.tName(u.teacher_id))+' · '+h(A.dMid(u.date))+' คาบ '+h(u.period)+
          (u.subject?' · '+h(u.subject)+' '+h(A.cls(u.group)):'')+(u.cancelled?' <span class="muted">(ยกเลิกไป '+u.cancelled+' รายการ)</span>':'')+'</li>'; }).join('')+
        (unc.length>8?'<li class="muted">… และอีก '+(unc.length-8)+' คาบ</li>':'')+'</ul></div></div>';
    }
    return out;
  };

  /* ───────── router + delegation ───────── */
  A.route={name:'plan', args:[]};
  A.go=function(hash){ if(location.hash===hash) A.render(); else location.hash=hash; };
  function parse(){ var p=decodeURIComponent((location.hash||'#plan').slice(1)).split('/'); var n=p.shift()||'plan';
    if(!A.pages[n]) n='plan'; A.route={name:n, args:p}; }
  A.render=function(){
    parse();
    var view=document.getElementById('view'), form=document.getElementById('formView'), r=A.route;
    var nav=(A.pages[r.name].nav)||r.name;
    document.querySelectorAll('.nav a').forEach(function(a){ a.classList.toggle('on', a.getAttribute('data-nav')===nav); });
    document.body.setAttribute('data-route', r.name);
    A.renderShell();
    var isForm=(r.name==='form');
    view.hidden=isForm; form.hidden=!isForm;
    try{
      if(isForm) A.pages.form.render(form, r.args);
      else { view.innerHTML=A.pages[r.name].render(r.args)||''; if(A.pages[r.name].after) A.pages[r.name].after(view, r.args); }
    }catch(err){
      console.error(err);
      view.hidden=false; form.hidden=true;
      view.innerHTML='<div class="banner bad">'+icon('warn')+'<div><b>หน้านี้แสดงผลไม่สำเร็จ</b><p>'+h(err&&err.message||err)+'</p><p class="muted">ข้อมูลของคุณไม่ถูกแก้ไข — ลองกลับไปหน้าแผน หรือโหลดหน้าใหม่</p></div></div>';
    }
  };
  A.rerender=function(keepScroll){ var y=window.scrollY; A.render(); if(keepScroll!==false) window.scrollTo(0,y); };
  window.addEventListener('hashchange', function(){ A.render(); window.scrollTo(0,0); });
  document.addEventListener('click', function(ev){
    var el=ev.target.closest('[data-act]'); if(!el) return;
    var fn=A.acts[el.getAttribute('data-act')]; if(fn){ fn(el, ev); }
  });
  document.addEventListener('change', function(ev){
    var el=ev.target.closest('[data-chg]'); if(!el) return;
    var fn=A.chgs[el.getAttribute('data-chg')]; if(fn) fn(el, ev);
  });
  document.addEventListener('input', function(ev){
    var el=ev.target.closest('[data-inp]'); if(!el) return;
    var fn=A.inps[el.getAttribute('data-inp')]; if(fn) fn(el, ev);
  });
  document.addEventListener('click', function(ev){   // backdrop click closes a dialog
    var d=document.getElementById('dlg'); if(d && ev.target===d) d.close();
  });

  /* shared status handlers (used by plan, list and packet views) */
  A.chgs.setStatus=function(el){
    var r=A.setStatus(el.getAttribute('data-id'), el.value);
    if(!r.ok) A.tell('เปลี่ยนสถานะไม่ได้', '<p>'+h(r.error).replace(/\n/g,'<br>')+'</p>');
    A.rerender();
  };
  A.acts.delEntry=function(el){
    var id=el.getAttribute('data-id');
    A.ask({title:'ลบข้อเสนอนี้?', body:'<p>ลบได้เฉพาะรายการที่ยัง “เสนอ” และลบแล้วกู้คืนไม่ได้</p>', ok:'ลบ', danger:true}).then(function(y){
      if(!y) return; var r=A.deleteEntry(id);
      if(!r.ok) A.toast(r.error,{bad:true}); else A.toast('ลบข้อเสนอแล้ว');
      A.rerender();
    });
  };
  A.acts.go=function(el){ A.go(el.getAttribute('data-go')); };
  A.acts.print=function(){ window.print(); };
})();
