/* หน้า “ตารางสอน” (real timetable, optionally with pending proposals as a
   simulation) and “ใบขอแลกคาบ” (พพ.1-1, usable BEFORE approval — it is a
   request form). Paper layout is the stable app's, unchanged. */
(function(){
  'use strict';
  var A=window.APP, S=A.S, h=A.h, ui=A.ui, icon=A.icon;

  /* ───────── ตารางสอน ───────── */
  var tt=A.tt={tid:'', scope:'approved', roundId:'', weeks:null, key:'', args:''};
  function ttEntries(){ return tt.scope==='sim' ? A.live() : A.log().filter(function(e){ return e.status==='อนุมัติแล้ว'; }); }
  function touched(){
    var m={}, out=[];
    A.live().forEach(function(e){ [e.me_id, e.y_id].forEach(function(id){ if(id) m[id]=(m[id]||0)+1; }); });
    Object.keys(m).forEach(function(id){ out.push(id); });
    return out.sort(function(a,b){ return m[b]-m[a] || (a<b?-1:1); });
  }
  function roundWeeks(tid, round){
    var set={}, dates={};
    (round.days||[]).forEach(function(d){ dates[d.date]=1; var w=S.ttWeekStart(d.date); if(w) set[w]=1; });
    A.live().forEach(function(e){ if(e.me_id===tid && dates[String(e.date_absent).slice(0,10)] && e.date_back){ var w=S.ttWeekStart(e.date_back); if(w) set[w]=1; } });
    return set;
  }
  A.pages.timetable={
    render:function(args){
      var sem=A.sem();
      if(!sem) return '<header class="page-head"><div><h1>ตารางสอน</h1></div></header><p class="empty">ยังไม่มีภาคเรียน — เริ่มที่ <a href="#data">ข้อมูลและตั้งค่า</a></p>';
      A.ensureContext();
      var ak=args.join('/');
      if(ak && ak!==tt.args){ tt.args=ak; if(A.teacher(args[0])) tt.tid=args[0]; tt.roundId=args[1]||''; if(args[1]) tt.scope='sim'; }
      if(!tt.tid || !A.teacher(tt.tid)) tt.tid=ui.meId || touched()[0] || (A.teachers()[0]||{}).id || '';
      var round=tt.roundId?A.roundById(tt.roundId):null; if(round && round.teacherId!==tt.tid){ round=null; tt.roundId=''; }
      var entries=ttEntries(), cur=S.ttWeekStart(S.todayISO());
      var changed=A.weeksOf(entries, tt.tid), set={}; changed.forEach(function(w){ set[w]=1; });
      var weeks;
      if(round){ var want=roundWeeks(tt.tid, round); weeks=Object.keys(want).sort(); }
      else { set[cur]=1; weeks=Object.keys(set).sort(); }
      var key=tt.tid+'|'+tt.roundId+'|'+tt.scope;
      if(tt.key!==key || !tt.weeks){
        tt.key=key; tt.weeks={};
        weeks.forEach(function(w){ tt.weeks[w]= round ? true : (w>=cur && changed.indexOf(w)>=0); });
        if(!weeks.some(function(w){ return tt.weeks[w]; }) && weeks.length) tt.weeks[weeks.indexOf(cur)>=0?cur:weeks[0]]=true;
      }
      var sel=weeks.filter(function(w){ return tt.weeks[w]; });
      var rounds=A.myRounds(tt.tid);
      var nPending=A.live().filter(function(e){ return e.status!=='อนุมัติแล้ว' && (e.me_id===tt.tid||e.y_id===tt.tid); }).length;
      document.title='ตารางสอน_'+tt.tid+'_'+S.todayISO();
      var ctl='<section class="card no-print"><div class="tools">'+A.whoButton(tt.tid,'ttPick','ครู')+
          '<div class="seg"><label><input type="radio" name="ttS" value="approved" data-chg="ttScope"'+(tt.scope==='approved'?' checked':'')+'><span>ตามที่อนุมัติแล้ว</span></label>'+
          '<label><input type="radio" name="ttS" value="sim" data-chg="ttScope"'+(tt.scope==='sim'?' checked':'')+'><span>รวมข้อเสนอ (จำลอง)'+(nPending?' <i class="dot">'+nPending+'</i>':'')+'</span></label></div>'+
          (rounds.length?'<select class="sel" data-chg="ttRound" aria-label="รอบการลา"><option value="">ทุกสัปดาห์ที่มีการเปลี่ยน</option>'+
            rounds.map(function(r){ return '<option value="'+h(r.id)+'"'+(r.id===tt.roundId?' selected':'')+'>รอบ '+h(A.roundSpan(r))+(r.note?' · '+h(r.note):'')+'</option>'; }).join('')+'</select>':'')+
          '<span class="grow"></span><button class="btn btn-primary" data-act="print"'+(sel.length?'':' disabled')+'>'+icon('print')+'พิมพ์ / บันทึก PDF</button></div>'+
        '<div class="wkchecks"><span class="lab">สัปดาห์</span>'+weeks.map(function(w){
            var n=changed.indexOf(w)>=0;
            return '<label class="wkc'+(n?' has':'')+'"><input type="checkbox" data-chg="ttWeek" data-week="'+w+'"'+(tt.weeks[w]?' checked':'')+'><span>'+h(A.span(w, S.ttAddDays(w,4)))+(w===cur?' · สัปดาห์นี้':'')+(n?'':' · ไม่มีการเปลี่ยน')+'</span></label>'; }).join('')+
          (weeks.length>1?'<button class="btn btn-sm btn-ghost" data-act="ttAll" data-on="1">เลือกทั้งหมด</button><button class="btn btn-sm btn-ghost" data-act="ttAll" data-on="0">ไม่เลือก</button>':'')+'</div>'+
        (tt.scope==='approved' && nPending?'<p class="hint">ครูคนนี้มีข้อเสนอที่ยังไม่อนุมัติ '+nPending+' รายการ ซึ่งยังไม่แสดงในตารางนี้ — เลือก “รวมข้อเสนอ (จำลอง)” เพื่อดูตารางก่อนอนุมัติ</p>':'')+
        '</section>';
      var out=sel.length?sel.map(function(w){ return A.ttWeek(tt.tid, w, entries); }).join(''):'<p class="empty">เลือกอย่างน้อยหนึ่งสัปดาห์เพื่อแสดงตารางสอน</p>';
      return '<header class="page-head no-print"><div><h1>ตารางสอน</h1><p>ตารางรายสัปดาห์หลังปรับตามการแลกคาบ สำหรับใช้งานจริงและแจกครูที่มาสอนแทน</p></div></header>'+
        '<div class="no-print">'+A.auditHTML({collisionsOnly:true})+'</div>'+ctl+A.ttLegend+'<div class="tt-out-wrap">'+out+'</div>';
    }
  };
  A.acts.ttPick=function(){ A.pickTeacher(tt.tid, function(id){ tt.tid=id; tt.roundId=''; A.rerender(false); }, {first:touched(), title:'ดูตารางสอนของครู'}); };
  A.chgs.ttScope=function(el){ tt.scope=el.value; A.rerender(); };
  A.chgs.ttRound=function(el){ tt.roundId=el.value; A.rerender(); };
  A.chgs.ttWeek=function(el){ tt.weeks[el.getAttribute('data-week')]=el.checked; A.rerender(); };
  A.acts.ttAll=function(el){ var on=el.getAttribute('data-on')==='1'; Object.keys(tt.weeks).forEach(function(w){ tt.weeks[w]=on; }); A.rerender(); };

  /* ───────── ใบขอแลกคาบ (พพ.1-1) ─────────
     One page per leave day, drawn by FORMDOC exactly as the PDF will be. The
     fields on the left are remembered per teacher (in the local store), so
     ตำแหน่ง / กลุ่มสาระ / ชื่อผู้ลงนาม are typed once. */
  var STORE=A.STORE, FD=window.FORMDOC;
  var fm=A.fm={tid:'', built:false, args:'', inc:{'อนุมัติแล้ว':true,'รออนุมัติ':true,'เสนอ':true}, off:{}, logoImg:null, timer:0, saveT:0};
  var FIELDS=[['docDate','วันที่ทำเอกสาร','date'],['reqName','ชื่อผู้ขอ'],['pos','ตำแหน่ง','','เช่น ครู คศ.1'],['dept','กลุ่มสาระการเรียนรู้','','เช่น คณิตศาสตร์'],
    ['reason','มีความจำเป็น (เหตุผล)','wide','เช่น ไปราชการ'],['t1','ตั้งแต่เวลา','','08.30'],['t2','ถึงเวลา','','16.00'],
    ['headName','หัวหน้ากลุ่มสาระ'],['deputyName','รองผู้อำนวยการกลุ่มบริหารวิชาการ'],['asstName','ผู้ช่วยผู้อำนวยการ (เว้นว่างได้)'],
    ['dirName','ชื่อผู้อำนวยการ']];
  var DUTY=[['hr','โฮมรูม'],['du','เวรประจำวัน'],['mt','การประชุม']];
  function $(id){ return document.getElementById(id); }
  function profiles(){ if(!STORE.data.formProfiles) STORE.data.formProfiles={}; return STORE.data.formProfiles; }
  function prof(){
    var P=profiles(), p=P[fm.tid];
    if(!p){ // start a new teacher from the last-used signatories: they are usually the same people
      var last=STORE.data.formLast||{}; p=P[fm.tid]={t1:'08.30', t2:'16.00', headName:last.headName||'', deputyName:last.deputyName||'', asstName:last.asstName||'', dirName:last.dirName||'', dept:last.dept||''};
    }
    if(!p.reqName) p.reqName=A.tName(fm.tid);
    return p;
  }
  function fields(){ var p=prof(), f={}; for(var k in p) f[k]=p[k]; f.docDate=fm.docDate||S.todayISO(); f.reason=fm.reason||''; f.signName=p.reqName; return f; }
  function formSwaps(){
    var f=$('formFrom').value, t=$('formTo').value;
    return A.log().filter(function(e){ var d=String(e.date_absent).slice(0,10); return e.me_id===fm.tid && fm.inc[e.status] && (!f||d>=f) && (!t||d<=t); })
      .sort(function(a,b){ var da=String(a.date_absent), db=String(b.date_absent); return da!==db?(da<db?-1:1):(+a.per_give)-(+b.per_give); });
  }
  function formChecked(){ return formSwaps().filter(function(e){ return !fm.off[e.id]; }); }
  function fileBase(m){
    var ds=m.pages.filter(function(p){ return !p.blank; }).map(function(p){ return p.date; }), nm=S.stripTitle(prof().reqName||''), a=ds[0], b=ds[ds.length-1];
    return 'แลกคาบ'+(fm.reason?' '+fm.reason.slice(0,40):'')+(nm?' '+nm:'')+(a?' '+(a===b?FD.dTag(a):S._bd(a).d+'-'+FD.dTag(b)):'');
  }
  function build(host){
    host.innerHTML=
    '<header class="page-head no-print"><div><h1>ใบขอแลกคาบ</h1><p>แบบ พพ.1-1 หนึ่งหน้าต่อหนึ่งวันลา — ใช้ได้ตั้งแต่ยังเป็นข้อเสนอ ดาวน์โหลดเป็น PDF หรือ Word ได้</p></div></header>'+
    '<div class="no-print" id="formAudit"></div>'+
    '<div class="formgrid"><div class="no-print">'+
      '<section class="card form-ctl"><h2 class="card-h">รายการที่จะใส่ในใบ</h2>'+
        '<div class="tools"><span id="formWho"></span><span id="formRoundWrap"></span></div>'+
        '<div class="tools"><label class="fld inline"><span>วันที่ลา</span><input type="date" class="inp" id="formFrom" data-chg="fmRange"></label>'+
          '<label class="fld inline"><span>ถึง</span><input type="date" class="inp" id="formTo" data-chg="fmRange"></label></div>'+
        '<div class="tools"><span class="lab">รวมสถานะ</span>'+['อนุมัติแล้ว','รออนุมัติ','เสนอ'].map(function(s){ return '<label class="check"><input type="checkbox" data-chg="fmInc" value="'+s+'" checked> '+s+'</label>'; }).join('')+'</div>'+
        '<div id="formSwapList" class="fsw"></div></section>'+
      '<section class="card"><h2 class="card-h">ข้อมูลในใบ</h2><div class="ffields">'+
        FIELDS.map(function(x){ return '<label class="fld'+(x[2]==='wide'?' wide':'')+'"><span>'+x[1]+'</span><input class="inp" id="ff_'+x[0]+'" data-inp="fmField" data-k="'+x[0]+'"'+(x[2]==='date'?' type="date"':'')+(x[3]?' placeholder="'+x[3]+'"':'')+' autocomplete="off"></label>'; }).join('')+'</div>'+
        '<div class="fduty"><span class="lab">งานหน้าที่อื่น</span>'+DUTY.map(function(d){
          return '<div class="rowline"><label class="check"><input type="checkbox" data-chg="fmDuty" data-k="'+d[0]+'" id="fd_'+d[0]+'"> มี'+d[1]+'</label><input class="inp" id="fd_'+d[0]+'To" data-inp="fmField" data-k="'+d[0]+'To" placeholder="มอบหมายให้"></div>'; }).join('')+
          '<div class="rowline"><span class="muted sm">โฮมรูม ชั้น ม.</span><input class="inp num" id="ff_hrClass" data-inp="fmField" data-k="hrClass"><span class="muted">/</span><input class="inp num" id="ff_hrRoom" data-inp="fmField" data-k="hrRoom"></div></div>'+
        '<div class="tools"><label class="btn btn-sm" for="logoInput">'+icon('up')+'เลือกรูปตราโรงเรียน…</label><input id="logoInput" type="file" accept="image/*" hidden data-chg="fmLogo">'+
          '<button class="btn btn-sm btn-ghost" data-act="fmLogoDel" id="logoDel" hidden>เอาตราออก</button><span class="hint" id="logoHint"></span></div>'+
        '<p class="hint">ตำแหน่ง กลุ่มสาระ ชื่อผู้ลงนาม และตรา ถูกจำไว้ในเครื่องนี้ (รวมอยู่ในไฟล์สำรอง) · วันที่ทำเอกสารและเหตุผลกรอกใหม่ทุกครั้ง</p></section>'+
    '</div><div>'+
      '<div class="tools no-print fbar"><button class="btn btn-primary" data-act="fmPdf">'+icon('down')+'ดาวน์โหลด PDF</button>'+
        '<button class="btn btn-primary" data-act="fmDocx">'+icon('down')+'ดาวน์โหลด Word (.docx)</button>'+
        '<button class="btn" data-act="print">'+icon('print')+'พิมพ์</button><span class="hint" id="formHint"></span></div>'+
      '<div id="formPages" class="fpages"></div></div></div>';
    fm.built=true;
  }
  function setTeacher(tid){ fm.tid=tid; fm.off={}; }
  function setRange(a,b){ $('formFrom').value=a; $('formTo').value=b; }
  function defaultRange(){
    var t=S.todayISO(), ds=A.live().filter(function(e){ return e.me_id===fm.tid; }).map(function(e){ return String(e.date_absent).slice(0,10); }).sort();
    var pick=ds.filter(function(d){ return d>=t; })[0] || ds[ds.length-1] || t, f=S.leaveRoundFor(fm.tid, pick);
    if(f){ var days=f.round.days.map(function(d){ return d.date; }).sort(); setRange(days[0], days[days.length-1]); if(f.round.note && !fm.reason) fm.reason=f.round.note; }
    else setRange(pick, pick);
  }
  function loadLogo(){
    var src=STORE.data.formLogo; fm.logoImg=null;
    $('logoDel').hidden=!src; $('logoHint').textContent=src?'ใช้ตราที่เลือกไว้':'ยังไม่มีตรา — ใบจะเว้นที่ไว้';
    if(!src) return Promise.resolve();
    return new Promise(function(res){ var im=new Image(); im.onload=function(){ fm.logoImg=im; res(); }; im.onerror=function(){ res(); }; im.src=src; });
  }
  function fillInputs(){
    var p=prof(); if(!fm.docDate) fm.docDate=S.todayISO();
    FIELDS.forEach(function(x){ var el=$('ff_'+x[0]); el.value = x[0]==='docDate'?fm.docDate:(x[0]==='reason'?(fm.reason||''):(p[x[0]]||'')); });
    DUTY.forEach(function(d){ $('fd_'+d[0]).checked=!!p[d[0]]; $('fd_'+d[0]+'To').value=p[d[0]+'To']||''; });
    $('ff_hrClass').value=p.hrClass||''; $('ff_hrRoom').value=p.hrRoom||'';
  }
  function fontsReady(){ return (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('16px "TH Sarabun New"'), document.fonts.load('700 16px "TH Sarabun New"')]).catch(function(){}) : Promise.resolve(); }
  function model(){ return FD.model(formChecked(), fields()); }
  function drawAll(dpi){ var m=model(); return fontsReady().then(function(){ return m.pages.map(function(pg){ return FD.draw(document.createElement('canvas'), pg, m.f, dpi, fm.logoImg); }); }); }
  function preview(){
    clearTimeout(fm.timer);
    fm.timer=setTimeout(function(){
      var m=model(), host=$('formPages'); if(!host) return;
      drawAll(150).then(function(cvs){ host.innerHTML=''; cvs.forEach(function(c){ c.className='fpage'; host.appendChild(c); }); });
      var rows=formChecked(), pend=rows.filter(function(e){ return e.status!=='อนุมัติแล้ว'; }).length;
      $('formHint').textContent=rows.length?(m.pages.length+' หน้า · '+rows.length+' คาบ'+(pend?' · '+pend+' รายการยังไม่อนุมัติ':'')):'ยังไม่มีรายการ — จะได้ใบเปล่าที่ทำเครื่องหมาย “ไม่มีคาบสอน”';
      document.title=fileBase(m);
    }, 120);
  }
  function refresh(){
    $('formAudit').innerHTML=A.auditHTML({collisionsOnly:true});
    $('formWho').innerHTML=A.whoButton(fm.tid,'fmPick','ผู้ขอ');
    var rounds=A.myRounds(fm.tid);
    $('formRoundWrap').innerHTML=rounds.length?'<select class="sel" data-chg="fmRound" aria-label="รอบการลา"><option value="">เลือกช่วงจากรอบการลา…</option>'+
      rounds.map(function(r){ return '<option value="'+h(r.id)+'">รอบ '+h(A.roundSpan(r))+(r.note?' · '+h(r.note):'')+'</option>'; }).join('')+'</select>':'';
    var rows=formSwaps();
    $('formSwapList').innerHTML=rows.length?rows.map(function(e){
      return '<label class="check fsw-item"><input type="checkbox" data-chg="fmTick" data-id="'+h(e.id)+'"'+(fm.off[e.id]?'':' checked')+'> '+
        '<span>'+h(A.dMid(e.date_absent))+' คาบ '+h(e.per_give)+' · '+h(e.subject_give)+' '+h(A.cls(e.group_give))+' ↔ '+h(S.stripTitle(e.y_name))+
        (S.isSubOnly(e)?' (สอนแทน)':' · คืน '+h(A.dMid(e.date_back))+' คาบ '+h(e.per_back))+'</span> '+A.chip(e.status)+'</label>'; }).join('')
      :'<p class="empty">ไม่มีรายการของครูคนนี้ในช่วงวันที่และสถานะที่เลือก</p>';
    preview();
  }
  A.pages.form={
    render:function(host, args){
      var sem=A.sem();
      if(!sem){ host.innerHTML='<header class="page-head"><div><h1>ใบขอแลกคาบ</h1></div></header><p class="empty">ยังไม่มีภาคเรียน — เริ่มที่ <a href="#data">ข้อมูลและตั้งค่า</a></p>'; fm.built=false; return; }
      A.ensureContext();
      if(!fm.built || !$('formPages')) build(host);
      var ak=args.join('/'), fresh=false, ranged=false;
      if(ak && ak!==fm.args){
        fm.args=ak;
        if(A.teacher(args[0])){ setTeacher(args[0]); fresh=true; }
        var r=args[1]?A.roundById(args[1]):null;
        if(r){ var days=r.days.map(function(d){ return d.date; }).sort(); setRange(days[0], days[days.length-1]); if(r.note) fm.reason=r.note; ranged=true; }
      }
      if(!fm.tid || !A.teacher(fm.tid)){ setTeacher(ui.meId || (A.teachers()[0]||{}).id || ''); fresh=true; }
      if((fresh && !ranged) || !$('formFrom').value) defaultRange();
      fillInputs();
      loadLogo().then(refresh);
    }
  };
  function persist(){ clearTimeout(fm.saveT); fm.saveT=setTimeout(function(){
    var p=prof(); STORE.data.formLast={headName:p.headName, deputyName:p.deputyName, asstName:p.asstName, dirName:p.dirName, dept:p.dept}; STORE.save(); }, 500); }
  A.acts.fmPick=function(){ A.pickTeacher(fm.tid, function(id){ setTeacher(id); defaultRange(); fillInputs(); refresh(); }, {title:'ผู้ขอแลกคาบ'}); };
  A.chgs.fmRange=function(){ refresh(); };
  A.chgs.fmInc=function(el){ fm.inc[el.value]=el.checked; refresh(); };
  A.chgs.fmTick=function(el){ fm.off[el.getAttribute('data-id')]=!el.checked; preview(); };
  A.chgs.fmRound=function(el){ var r=A.roundById(el.value); if(!r) return; var days=r.days.map(function(d){ return d.date; }).sort(); setRange(days[0], days[days.length-1]);
    if(r.note){ fm.reason=r.note; $('ff_reason').value=r.note; } refresh(); };
  A.inps.fmField=function(el){
    var k=el.getAttribute('data-k'), v=el.value;
    if(k==='docDate'){ if(v) fm.docDate=v; } else if(k==='reason') fm.reason=v; else { prof()[k]=v; persist(); }
    preview();
  };
  A.chgs.fmDuty=function(el){ prof()[el.getAttribute('data-k')]=el.checked; persist(); preview(); };
  A.chgs.fmLogo=function(el){
    var f=el.files && el.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(){ var im=new Image(); im.onload=function(){
      var hh=Math.min(360, im.height), ww=Math.round(hh*im.width/im.height), c=document.createElement('canvas'); c.width=ww; c.height=hh;
      c.getContext('2d').drawImage(im,0,0,ww,hh);
      STORE.data.formLogo=c.toDataURL('image/png'); var r=STORE.save();
      if(!r.ok){ delete STORE.data.formLogo; A.toast('เก็บรูปตราไม่สำเร็จ: '+r.error,{bad:true}); }
      loadLogo().then(preview); }; im.onerror=function(){ A.toast('ไฟล์นี้ไม่ใช่รูปภาพที่อ่านได้',{bad:true}); }; im.src=rd.result; };
    rd.readAsDataURL(f); el.value='';
  };
  A.acts.fmLogoDel=function(){ delete STORE.data.formLogo; STORE.save(); loadLogo().then(preview); };
  A.acts.fmPdf=function(){
    var m=model();
    drawAll(220).then(function(cvs){ return FD.pdf(cvs, fileBase(m)); }).then(function(bytes){
      A.download(new Blob([bytes],{type:'application/pdf'}), fileBase(m)+'.pdf'); A.toast('สร้างไฟล์ PDF แล้ว ('+m.pages.length+' หน้า)');
    }).catch(function(e){ A.toast('สร้าง PDF ไม่สำเร็จ: '+(e&&e.message||e),{bad:true}); });
  };
  A.acts.fmDocx=function(){
    var m=model(), logo=null, src=STORE.data.formLogo;
    try{
      if(src && fm.logoImg){ var b=atob(src.split(',')[1]), u=new Uint8Array(b.length); for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i); logo={bytes:u, w:fm.logoImg.width, h:fm.logoImg.height, ext:'png'}; }
      A.download(new Blob([FD.docx(m, logo)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}), fileBase(m)+'.docx');
      A.toast('สร้างไฟล์ Word แล้ว ('+m.pages.length+' หน้า)');
    }catch(e){ A.toast('สร้างไฟล์ Word ไม่สำเร็จ: '+(e&&e.message||e),{bad:true}); }
  };
})();
