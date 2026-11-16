/* หน้า “ข้อมูล” and the single way data gets into the app.
   ONE entry point: drop (or choose) any file, anywhere. The app works out what
   it is — school data file, personal backup, timetable .xlsx, phone .xlsx — says
   so in plain words, and asks before changing anything.
   Two things go out: the school data file (for other teachers; no swap
   records) and the personal backup (everything; for moving machines). */
(function(){
  'use strict';
  var A=window.APP, S=A.S, STORE=A.STORE, h=A.h, ui=A.ui, icon=A.icon;
  var SOURCE_KEY='swapApp.v1', PACK_KIND='swap-data-pack';
  var imp=null, flash={};
  function advOpen(){ try{ return localStorage.getItem('swap_preview_adv_view')==='1'; }catch(_){ return false; } }
  function afterDataChange(){ A.invalidate(); ui.roundId=null; ui.date=null; if(ui.meId && !A.teacher(ui.meId)) ui.meId=null; }
  function deriveAll(){ for(var l in STORE.data.semesters){ var s=STORE.data.semesters[l]; if(s && s.schedule) S.deriveRows(s.schedule, STORE.data.settings); } }
  A.deriveMissing=function(){ for(var l in STORE.data.semesters) S.ensureSemesterDerived(STORE.data.semesters[l], STORE.data.settings); };
  function note(k){ var m=flash[k]; delete flash[k]; return m?'<p class="'+(m.bad?'err':'okline')+'">'+(m.bad?'':icon('check'))+m.html+'</p>':''; }
  function say(k, html, bad){ flash[k]={html:html, bad:!!bad}; }
  function teacherCount(rows){ var t={}; rows.forEach(function(d){ t[d.teacher_id]=1; }); return Object.keys(t).length; }
  function hasData(){ return Object.keys(STORE.data.semesters||{}).length>0; }
  function fileTag(label){ return String(label||'').replace(/[\/\\]/g,'-'); }

  /* ───────── the drop zone (used on the first-run screen and the data page) ───────── */
  A.intakeHTML=function(big){
    return '<label class="drop'+(big?' big':'')+'" for="intakeInput">'+icon('up')+
      '<b>ลากไฟล์มาวางที่นี่</b><span>หรือกดเพื่อเลือกไฟล์ — วางตรงไหนของหน้าเว็บก็ได้</span>'+
      '<input id="intakeInput" type="file" multiple accept=".json,.xlsx,application/json" hidden data-chg="intake"></label>';
  };
  var ACCEPTS='<ul class="accepts"><li><b>ไฟล์ข้อมูลโรงเรียน</b> (.json) ที่ได้จากผู้ดูแล — ตารางสอนและเบอร์ติดต่อ</li>'+
    '<li><b>ไฟล์สำรองของฉัน</b> (.json) — ย้ายงานมาจากเครื่องอื่นหรือจากเว็บเดิม (legacy)</li>'+
    '<li><b>ไฟล์ Excel</b> ตารางสอนหรือเบอร์ติดต่อ (.xlsx) — สำหรับผู้ดูแลที่เตรียมภาคเรียนใหม่</li></ul>';
  A.chgs.intake=function(el){ var f=[].slice.call(el.files||[]); el.value=''; A.intake(f); };

  // whole-window drag & drop
  var veil=null, depth=0;
  function isFiles(ev){ var t=ev.dataTransfer&&ev.dataTransfer.types; if(!t) return false; for(var i=0;i<t.length;i++) if(t[i]==='Files') return true; return false; }
  function showVeil(on){
    if(on && !veil){ veil=document.createElement('div'); veil.className='veil'; veil.innerHTML='<div>'+icon('up')+'<b>ปล่อยไฟล์เพื่อนำเข้า</b><span>ไฟล์ข้อมูลโรงเรียน · ไฟล์สำรอง · Excel ตารางสอน/เบอร์ติดต่อ</span></div>'; document.body.appendChild(veil); }
    if(veil) veil.hidden=!on;
  }
  window.addEventListener('dragenter', function(ev){ if(!isFiles(ev)) return; depth++; showVeil(true); });
  window.addEventListener('dragleave', function(ev){ if(!isFiles(ev)) return; depth=Math.max(0,depth-1); if(!depth) showVeil(false); });
  window.addEventListener('dragover', function(ev){ if(isFiles(ev)) ev.preventDefault(); });
  window.addEventListener('drop', function(ev){ if(!isFiles(ev)) return; ev.preventDefault(); depth=0; showVeil(false); A.intake([].slice.call(ev.dataTransfer.files||[])); });

  /* ───────── intake: classify → explain → confirm → apply ───────── */
  function readText(f){ return new Promise(function(res, rej){ var r=new FileReader(); r.onload=function(){ res(r.result); }; r.onerror=function(){ rej(new Error('อ่านไฟล์ไม่ได้')); }; r.readAsText(f); }); }
  function readBuf(f){ return new Promise(function(res, rej){ var r=new FileReader(); r.onload=function(){ res(r.result); }; r.onerror=function(){ rej(new Error('อ่านไฟล์ไม่ได้')); }; r.readAsArrayBuffer(f); }); }
  function classify(f){
    var name=f.name||'', low=name.toLowerCase();
    if(/\.json$/.test(low) || f.type==='application/json') return readText(f).then(function(t){
      var o; try{ o=JSON.parse(t); }catch(_){ return {kind:'bad', name:name, why:'ไฟล์ .json นี้เสียหายหรือไม่ใช่ไฟล์ของโปรแกรม'}; }
      if(o && o.semester && typeof o.semester.packed==='string'){
        try{ o.semester.rows=S.CODEC.decode(o.semester.packed).semesters.x.schedule; delete o.semester.packed; }
        catch(_){ return {kind:'bad', name:name, why:'ไฟล์ข้อมูลโรงเรียนนี้เสียหาย — ขอไฟล์ใหม่จากผู้ดูแล'}; } }
      if(o && (o.kind===PACK_KIND || (o.semester && Array.isArray(o.semester.rows)))) return {kind:'pack', name:name, obj:o};
      if(o && o.schemaVersion && o.semesters) return {kind:'backup', name:name, obj:o};
      if(o && o.meta && Array.isArray(o.schedule)) return {kind:'bundle', name:name, obj:o};
      return {kind:'bad', name:name, why:'ไฟล์ .json นี้ไม่ใช่ไฟล์ข้อมูลโรงเรียนหรือไฟล์สำรองของโปรแกรม'};
    });
    if(/\.xlsx$/.test(low)) return Promise.all([readBuf(f), A.needXLSX()]).then(function(r){
      var wb=XLSX.read(r[0], {type:'array'});
      if(wb.SheetNames.indexOf('VERIFIED_DATA')!==-1) return {kind:'schedule', name:name, buf:r[0]};
      for(var i=0;i<wb.SheetNames.length;i++){ var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[i]], {header:1, raw:false, defval:''});
        if(rows.length && /teacher_id/i.test(String(rows[0][0]||'')) && rows[0].map(function(x){ return String(x).trim(); }).indexOf('phone')!==-1) return {kind:'phones', name:name, buf:r[0]}; }
      return {kind:'bad', name:name, why:'ไฟล์ Excel นี้ไม่มีชีต VERIFIED_DATA (ตารางสอน) และไม่ใช่ไฟล์เบอร์ติดต่อ (teacher_id | phone)'};
    }, function(e){ return {kind:'bad', name:name, why:'เปิดไฟล์ Excel ไม่ได้ ('+(e&&e.message||e)+')'}; });
    return Promise.resolve({kind:'bad', name:name, why:'รับเฉพาะไฟล์ .json และ .xlsx'});
  }
  // a dialog step that resolves only after the dialog has really closed
  function step(html, cls, mount){
    return new Promise(function(res){ var val=null, d=A.dialog(html, {cls:cls||'', onClose:function(){ res(val); }});
      mount(d, function(v){ val=v; A.closeDialog(); }); });
  }
  function fileLine(name){ return '<p class="fname">'+icon('doc')+h(name)+'</p>'; }
  function okCancel(okLabel, danger){ return '<p class="err" id="stMsg" hidden></p><div class="dlg-acts"><button class="btn" data-act="dlgClose">ยกเลิก</button><button class="btn '+(danger?'btn-danger':'btn-primary')+'" id="stOk" autofocus>'+h(okLabel)+'</button></div>'; }

  A.intake=function(files){
    if(!files || !files.length) return;
    if(STORE.loadError){ A.tell('ยังนำเข้าไม่ได้', '<p>อ่านข้อมูลเดิมในเครื่องไม่สำเร็จ โปรแกรมจึงไม่บันทึกทับ — ไปที่หน้า “ข้อมูล” เพื่อดูรายละเอียด</p>'); return; }
    A.toast('กำลังอ่านไฟล์…');
    Promise.all(files.map(classify)).then(function(items){
      var done=[], order={backup:0, bundle:1, pack:2, schedule:3, phones:4, bad:5}, changed=false;
      items.sort(function(a,b){ return order[a.kind]-order[b.kind]; });
      var chain=Promise.resolve();
      items.forEach(function(it){ chain=chain.then(function(){ return FLOW[it.kind](it); }).then(function(msg){ if(msg){ done.push(msg); changed=true; } }); });
      return chain.then(function(){
        if(done.length){ A.toast(done.join(' · ')); if(A.route.name==='plan' || A.route.name==='data') A.rerender(); else A.go('#plan'); }
        else A.rerender();
      });
    }).catch(function(e){ A.toast('นำเข้าไม่สำเร็จ: '+(e&&e.message||e), {bad:true}); });
  };

  function replaceStore(obj, stamp){
    var prev=STORE.data, prevErr=STORE.loadError; STORE.loadError=null;
    var r=STORE.restoreFromObject(obj);
    if(r.ok && stamp){ stamp(); var r2=STORE.save(); if(!r2.ok) r=r2; }
    if(!r.ok){ STORE.data=prev; STORE.loadError=prevErr; return r; }
    afterDataChange(); return r;
  }
  function packRowsOK(rows){
    for(var i=0;i<rows.length;i++){ var r=rows[i];
      if(!r || !/^\d{4}$/.test(String(r.teacher_id)) || S.DAYS.indexOf(r.day)<0 || !/^[1-9]$/.test(String(r.period)) || typeof r.status!=='string') return false; }
    return rows.length>0;
  }
  function installPack(pay, name){
    var s=pay.semester, label=String(s.label||'').trim(), first=!hasData();
    var rows=s.rows.map(function(d){ var o={}; for(var k in d) o[k]=d[k]; return o; });
    if(STORE.semesterExists(label)){
      var sem=STORE.data.semesters[label], keep={sch:sem.schedule, st:sem.meta.startDate, en:sem.meta.endDate, src:sem.meta.sourceFilename};
      S.deriveRows(rows, STORE.data.settings);
      sem.schedule=rows; sem.meta.startDate=s.startDate||keep.st; sem.meta.endDate=s.endDate||keep.en; sem.meta.sourceFilename=s.sourceFilename||name;
      var r=STORE.save();
      if(!r.ok){ sem.schedule=keep.sch; sem.meta.startDate=keep.st; sem.meta.endDate=keep.en; sem.meta.sourceFilename=keep.src; return r; }
    } else {
      var res=STORE.commitSemester(label, s.startDate, s.endDate, s.sourceFilename||name, rows);
      if(!res.ok) return res;
    }
    if(pay.phones && Object.keys(pay.phones).length){ var pb=S.phonebook(); pb.map=pay.phones; pb.lastImportedAt=pay.createdAt||new Date().toISOString(); pb.sourceFilename=name; }
    if(first && pay.settings){ for(var k in pay.settings) if(Object.prototype.hasOwnProperty.call(STORE.data.settings,k)) STORE.data.settings[k]=pay.settings[k]; deriveAll(); }
    STORE.save(); afterDataChange();
    return {ok:true};
  }
  var FLOW={
    bad:function(it){ return step('<h2 class="dlg-h">ไฟล์นี้ใช้ไม่ได้</h2>'+fileLine(it.name)+'<p>'+h(it.why)+'</p><p class="muted">ไฟล์ที่รับได้:</p>'+ACCEPTS+
      '<div class="dlg-acts"><button class="btn btn-primary" data-act="dlgClose" autofocus>รับทราบ</button></div>', 'dlg-sm', function(){}).then(function(){ return null; }); },
    pack:function(it){
      var p=it.obj, s=p.semester||{}, rows=s.rows||[], label=String(s.label||'').trim();
      if(!label || !packRowsOK(rows)) return FLOW.bad({name:it.name, why:'ไฟล์ข้อมูลโรงเรียนนี้ไม่ครบหรือเสียหาย — ขอไฟล์ใหม่จากผู้ดูแล'});
      var exists=STORE.semesterExists(label), act=A.sem(), nPh=Object.keys(p.phones||{}).length;
      var effect = exists ? 'ในเครื่องนี้มีภาคเรียน '+h(label)+' อยู่แล้ว — จะ<b>อัปเดตตารางสอนและเบอร์ติดต่อ</b> โดยเก็บรายการแลกคาบและรอบการลาของคุณไว้ครบ'
        : (act ? 'จะเพิ่มเป็นภาคเรียนที่ใช้งาน ภาคเรียน '+h(act.meta.label)+' เดิมจะถูกเก็บไว้ดูย้อนหลังแบบอ่านอย่างเดียว' : 'จะเริ่มใช้งานด้วยข้อมูลชุดนี้');
      return step('<h2 class="dlg-h">ไฟล์ข้อมูลโรงเรียน</h2>'+fileLine(it.name)+
        '<dl class="stats"><div><dt>ภาคเรียน</dt><dd>'+h(label)+'</dd></div><div><dt>ช่วงเวลา</dt><dd>'+h(S.thaiDate(s.startDate))+' – '+h(S.thaiDate(s.endDate))+'</dd></div>'+
        '<div><dt>ครู</dt><dd>'+teacherCount(rows)+' คน</dd></div><div><dt>เบอร์ติดต่อ</dt><dd>'+nPh+' เบอร์</dd></div>'+(p.createdAt?'<div><dt>สร้างเมื่อ</dt><dd>'+h(S.thaiDate(String(p.createdAt).slice(0,10)))+'</dd></div>':'')+'</dl>'+
        '<p>'+effect+'</p>'+okCancel(exists?'อัปเดตข้อมูล':'ใช้ข้อมูลนี้'), '', function(d, finish){
          d.querySelector('#stOk').onclick=function(){ var r=installPack(p, it.name);
            if(!r.ok){ var m=d.querySelector('#stMsg'); m.hidden=false; m.textContent='ไม่สำเร็จ: '+r.error; return; }
            finish((exists?'อัปเดต':'ใช้')+'ข้อมูลภาคเรียน '+label+' แล้ว'); };
        });
    },
    backup:function(it){
      var o=it.obj, labels=Object.keys(o.semesters||{}), logs=0, leaves=0;
      labels.forEach(function(l){ var s=o.semesters[l]||{}; logs+=(s.log||[]).length; leaves+=(s.leaves||[]).length; });
      var mine=hasData();
      return step('<h2 class="dlg-h">ไฟล์สำรองของฉัน</h2>'+fileLine(it.name)+
        '<dl class="stats"><div><dt>ภาคเรียน</dt><dd>'+h(labels.join(', ')||'—')+'</dd></div><div><dt>รายการแลกคาบ</dt><dd>'+logs+'</dd></div><div><dt>รอบการลา</dt><dd>'+leaves+'</dd></div>'+
        '<div><dt>เบอร์ติดต่อ</dt><dd>'+Object.keys((o.phonebook&&o.phonebook.map)||{}).length+'</dd></div></dl>'+
        (mine?'<div class="banner warn">'+icon('warn')+'<div><b>ข้อมูลทั้งหมดในเครื่องนี้จะถูกแทนที่</b> ด้วยข้อมูลในไฟล์ — ถ้ามีงานที่ยังไม่ได้สำรอง ให้ยกเลิกแล้วสำรองก่อน</div></div>':'<p>จะนำข้อมูลทั้งหมดในไฟล์มาใช้ในเครื่องนี้</p>')+
        okCancel(mine?'แทนที่ด้วยไฟล์นี้':'กู้คืน', mine), '', function(d, finish){
          d.querySelector('#stOk').onclick=function(){ var r=replaceStore(o);
            if(!r.ok){ var m=d.querySelector('#stMsg'); m.hidden=false; m.textContent='ไม่สำเร็จ: '+r.error+' — ข้อมูลเดิมไม่ถูกแก้ไข'; return; }
            finish('กู้คืนจากไฟล์สำรองแล้ว'); };
        });
    },
    bundle:function(it){
      var o=it.obj, label=(o.meta&&o.meta.label)||'';
      return step('<h2 class="dlg-h">ภาคเรียนที่เก็บไว้</h2>'+fileLine(it.name)+'<p>ไฟล์นี้คือภาคเรียน <b>'+h(label)+'</b> ที่ส่งออกไว้ จะถูกเพิ่มกลับเข้ามาเป็นภาคเรียนสำหรับดูย้อนหลัง (อ่านอย่างเดียว)</p>'+okCancel('เพิ่มภาคเรียนนี้'), 'dlg-sm', function(d, finish){
        d.querySelector('#stOk').onclick=function(){ var r=replaceStore(o);
          if(!r.ok){ var m=d.querySelector('#stMsg'); m.hidden=false; m.textContent='ไม่สำเร็จ: '+r.error; return; } finish('เพิ่มภาคเรียน '+label+' แล้ว'); };
      });
    },
    schedule:function(it){
      try{
        var read=S.readVerifiedSheet(it.buf), v=read.blocker?{ok:false, blocker:read.blocker}:S.validateBlockers(read.rows);
        if(!v.ok) imp={fail:v.blocker.msg, fileName:it.name};
        else { var work=v.rows.map(function(d){ var o={}; for(var k in d) o[k]=d[k]; return o; }), changed=S.reparseSomserm(work), act=A.sem();
          imp={rows:work, changed:changed, warnings:S.scanWarnings(work, act&&act.schedule?act.schedule.length:null), fileName:it.name}; }
      }catch(err){ imp={fail:'อ่านไฟล์ไม่สำเร็จ: '+(err&&err.message||err), fileName:it.name}; }
      return step('<h2 class="dlg-h">ตารางสอนจาก Excel</h2>'+fileLine(it.name)+impReport(), 'dlg-wide', function(d, finish){
        var ok=d.querySelector('#impOk'); if(!ok) return;
        ok.onclick=function(){
          var label=(d.querySelector('#semLabelInput').value||'').trim(), start=d.querySelector('#semStartInput').value, end=d.querySelector('#semEndInput').value, hint=d.querySelector('#semHint');
          function bad(t){ hint.hidden=false; hint.textContent=t; }
          if(!label) return bad('กรุณากรอกชื่อภาคเรียน');
          if(!start || !end) return bad('กรุณากรอกวันเปิดและวันปิดภาคเรียน');
          if(end<start) return bad('วันปิดต้องไม่มาก่อนวันเปิด');
          if(STORE.semesterExists(label)) return bad('มีภาคเรียน “'+label+'” อยู่แล้ว — ใช้ชื่ออื่น');
          var res=STORE.commitSemester(label, start, end, imp.fileName, imp.rows);
          if(!res.ok) return bad('บันทึกไม่สำเร็จ: '+res.error);
          imp=null; afterDataChange(); finish('บันทึกภาคเรียน '+label+' แล้ว');
        };
      }).then(function(msg){ imp=null; return msg; });
    },
    phones:function(it){
      if(!A.sem()) return FLOW.bad({name:it.name, why:'ต้องมีตารางสอนในเครื่องก่อน จึงจะจับคู่เบอร์กับรหัสครูได้ — นำเข้าตารางสอนหรือไฟล์ข้อมูลโรงเรียนก่อน'});
      if(A.readOnly()) return FLOW.bad({name:it.name, why:S.readOnlyText()});
      var res; try{ res=S.parsePhoneWorkbook(it.buf); }catch(e){ res={ok:false, error:String(e&&e.message||e)}; }
      if(!res.ok) return FLOW.bad({name:it.name, why:'นำเข้าเบอร์ไม่สำเร็จ: '+res.error});
      var extra=(res.unknownIds.length?'<p class="muted">ข้ามรหัสครูที่ไม่อยู่ในตารางสอน '+res.unknownIds.length+' รายการ</p>':'')+
        (res.badRows.length?'<p class="err">อ่านไม่ได้ '+res.badRows.length+' แถว: '+res.badRows.slice(0,6).map(function(b){ return 'แถว '+b.row; }).join(', ')+'</p>':'');
      return step('<h2 class="dlg-h">เบอร์ติดต่อจาก Excel</h2>'+fileLine(it.name)+
        '<dl class="stats"><div><dt>ครูที่มีเบอร์</dt><dd>'+res.total+' คน</dd></div>'+(res.teacherCount!=null?'<div><dt>ยังไม่มีเบอร์</dt><dd>'+(res.teacherCount-res.total)+' คน</dd></div>':'')+'</dl>'+extra+
        '<p>จะใช้เบอร์ชุดนี้แทนเบอร์ติดต่อที่มีอยู่ในเครื่อง</p>'+okCancel('ใช้เบอร์ชุดนี้'), 'dlg-sm', function(d, finish){
          d.querySelector('#stOk').onclick=function(){ var pb=S.phonebook(); pb.map=res.phones; pb.lastImportedAt=new Date().toISOString(); pb.sourceFilename=it.name; STORE.save(); finish('นำเข้าเบอร์ติดต่อ '+res.total+' เบอร์แล้ว'); };
        });
    }
  };
  function impReport(){
    if(imp.fail) return '<div class="report bad"><b>ไฟล์ไม่ผ่าน — ไม่นำเข้าข้อมูลใด ๆ</b><p>'+h(imp.fail)+'</p><p class="hint">แก้ไขจุดที่แจ้งแล้วลากไฟล์มาใหม่ ข้อมูลเดิมไม่ถูกแก้ไข</p></div>'+
      '<div class="dlg-acts"><button class="btn btn-primary" data-act="dlgClose" autofocus>รับทราบ</button></div>';
    var rows=imp.rows, w=imp.warnings, c=S.statusCounts(rows), hard=(w.room.length||w.fourdig.length||w.subj.length||w.drift), act=A.sem();
    function ws(title, items, render){
      if(!items.length) return '';
      return '<details><summary>'+h(title)+' ('+items.length+')</summary><ul class="rlist">'+items.slice(0,40).map(function(it){ return '<li><span class="rn">แถว '+it.row+'</span>'+render(it)+'</li>'; }).join('')+
        (items.length>40?'<li class="muted">… และอีก '+(items.length-40)+' รายการ</li>':'')+'</ul></details>';
    }
    var guess=(imp.fileName.match(/(\d{4})[_\/-]?(\d)/)||[]);
    var checks=ws('ข้อความไม่ตรงกับต้นฉบับ', w.recon, function(it){ return 'ได้ “'+h(it.subject+it.group+it.room)+'” แต่ต้นฉบับคือ “'+h(it.raw)+'”'; })+
      ws('ห้องที่ไม่รู้จัก', w.room, function(it){ return 'ห้อง “'+h(it.room)+'”'; })+ws('ห้อง 4 หลักที่ไม่ขึ้นต้นด้วย 1', w.fourdig, function(it){ return 'ห้อง “'+h(it.room)+'”'; })+
      ws('รหัสวิชาผิดรูปแบบ', w.subj, function(it){ return 'รหัสวิชา “'+h(it.subject)+'”'; })+
      (imp.changed.length?'<details><summary>คาบซ่อมเสริมที่แปลงเป็นคาบสอน ('+imp.changed.length+')</summary><ul class="rlist">'+imp.changed.slice(0,60).map(function(ch){
        return '<li><span class="rn">'+h(ch.before.teacher_id)+'</span>'+h(ch.before.day)+' คาบ '+h(ch.before.period)+': <code>'+h(ch.before.raw)+'</code> → '+h(ch.after.group)+' ห้อง '+h(ch.after.room)+(ch.ambiguous?' <span class="tag warn">ตีความได้ 2 แบบ</span>':'')+'</li>'; }).join('')+'</ul></details>':'');
    return '<div class="report '+(hard?'warn':'ok')+'"><b>'+(hard?'รูปแบบถูกต้อง แต่มีจุดที่ควรดูก่อนใช้':'รูปแบบถูกต้อง พร้อมใช้งาน')+'</b>'+
      '<dl class="stats"><div><dt>ครู</dt><dd>'+teacherCount(rows)+' คน</dd></div><div><dt>แถว</dt><dd>'+rows.length.toLocaleString()+'</dd></div>'+
      '<div><dt>คาบรวมห้อง</dt><dd>'+rows.filter(function(d){ return d.group.indexOf(',')!==-1; }).length+'</dd></div><div><dt>ซ่อมเสริม</dt><dd>'+imp.changed.length+'</dd></div>'+
      '<div><dt>สถานะ</dt><dd class="sm">'+Object.keys(c).map(function(k){ return c[k]+' '+h(k); }).join(' · ')+'</dd></div></dl>'+
      (w.drift?'<p class="err">จำนวนแถวต่างจากภาคเรียนก่อนมาก: '+w.drift.prev+' → '+w.drift.now+' ('+(w.drift.pct>0?'+':'')+w.drift.pct+'%)</p>':'')+checks+'</div>'+
      '<h3 class="dlg-sub">ตั้งชื่อภาคเรียน</h3>'+
      '<div class="row3"><label class="fld"><span>ชื่อภาคเรียน</span><input class="inp" id="semLabelInput" placeholder="เช่น 2570/1" value="'+h(guess[1]?guess[1]+'/'+guess[2]:'')+'" autocomplete="off"></label>'+
      '<label class="fld"><span>วันเปิดภาคเรียน</span><input type="date" class="inp" id="semStartInput"></label>'+
      '<label class="fld"><span>วันปิดภาคเรียน</span><input type="date" class="inp" id="semEndInput"></label></div>'+
      (act?'<p class="hint">ภาคเรียน '+h(act.meta.label)+' ที่ใช้อยู่จะถูกเก็บไว้ดูย้อนหลังแบบอ่านอย่างเดียว</p>':'')+
      '<p class="err" id="semHint" hidden></p>'+
      '<div class="dlg-acts"><button class="btn" data-act="dlgClose">ยกเลิก</button><button class="btn btn-primary" id="impOk">บันทึกเป็นภาคเรียนนี้</button></div>';
  }

  /* ───────── what goes out ───────── */
  A.acts.exportPack=function(){
    var a=A.sem();
    if(!a || !a.schedule || !a.schedule.length){ say('out','ยังไม่มีตารางสอนให้ส่งออก',true); A.rerender(); return; }
    var pay={kind:PACK_KIND, version:1, createdAt:new Date().toISOString(),
      semester:{label:a.meta.label, startDate:a.meta.startDate, endDate:a.meta.endDate, sourceFilename:a.meta.sourceFilename||'',
        packed:S.CODEC.encode({semesters:{x:{schedule:a.schedule}}})},      // same lossless compact table the local store uses
      phones:(STORE.data.phonebook&&STORE.data.phonebook.map)||{}, settings:STORE.data.settings};
    A.download(new Blob([JSON.stringify(pay)],{type:'application/json'}), 'ข้อมูลตารางสอน_'+fileTag(a.meta.label)+'.json');
    say('out','ดาวน์โหลดไฟล์ข้อมูลโรงเรียนแล้ว — ส่งไฟล์นี้ให้ครูคนอื่นทาง LINE หรือ Google Drive ได้เลย'); A.rerender();
  };
  A.acts.backup=function(){
    if(!STORE.data.activeSemester){ say('out','ยังไม่มีข้อมูลให้สำรอง',true); A.rerender(); return; }
    A.download(STORE.backupBlob(), 'swap_preview_backup_'+fileTag(STORE.data.activeSemester)+'_'+new Date().toISOString().slice(0,10)+'.json');
    STORE.markBackedUp(); say('out','ดาวน์โหลดไฟล์สำรองแล้ว'); A.rerender();
  };
  A.chgs.semSwitch=function(el){
    var r=STORE.setActiveSemester(el.value);
    if(!r.ok) A.toast(r.error||'สลับภาคเรียนไม่สำเร็จ',{bad:true}); else { afterDataChange(); A.toast('สลับไปภาคเรียน '+el.value); }
    A.rerender();
  };
  A.acts.copyOld=function(){
    function run(){
      var obj; try{ obj=JSON.parse(localStorage.getItem(SOURCE_KEY)); }catch(e){ A.toast('อ่านข้อมูลของเว็บเดิม (legacy)ไม่สำเร็จ',{bad:true}); return; }
      var r=replaceStore(obj, function(){ STORE.data.previewCopy={copiedAt:new Date().toISOString(), sourceSemester:STORE.data.activeSemester}; STORE.data.lastBackupAt=null; STORE.data.approvedSinceBackup=0; });
      if(!r.ok){ A.toast('คัดลอกไม่สำเร็จ: '+r.error,{bad:true}); return; }
      A.toast('คัดลอกข้อมูลจากเว็บเดิม (legacy)แล้ว'); if(A.route.name==='plan') A.rerender(); else A.go('#plan');
    }
    if(!hasData()) run();
    else A.ask({title:'คัดลอกทับข้อมูลในเครื่องนี้?', body:'<p>ตาราง รายการแลกคาบ และรอบการลาในเว็บนี้จะถูกแทนที่ด้วยสำเนาจากเว็บเดิม (legacy) เว็บเดิมไม่ถูกแก้ไข</p>', ok:'คัดลอกทับ', danger:true}).then(function(y){ if(y) run(); });
  };
  function oldSiteInfo(){
    var raw=null; try{ raw=localStorage.getItem(SOURCE_KEY); }catch(_){}
    if(!raw) return null;
    try{ var d=JSON.parse(raw); if(!d || !d.semesters || !Object.keys(d.semesters).length) return null;
      var logs=0; Object.keys(d.semesters).forEach(function(l){ logs+=((d.semesters[l]||{}).log||[]).length; });
      return {active:d.activeSemester, logs:logs}; }catch(_){ return null; }
  }
  A.oldSiteHTML=function(){
    var o=oldSiteInfo(); if(!o) return '';
    return '<div class="oldsite"><div><b>พบข้อมูลของเว็บเดิม (legacy)ในเบราว์เซอร์นี้</b><span class="muted"> ภาคเรียน '+h(o.active||'—')+' · รายการแลกคาบ '+o.logs+' รายการ</span></div>'+
      '<button class="btn btn-sm" data-act="copyOld">'+icon('down')+'คัดลอกมาใช้</button></div>';
  };

  /* ───────── page ───────── */
  function secSemester(){
    var sem=A.sem(), labels=STORE.semesterLabels();
    if(!sem) return '';
    var pb=S.phonebook(), nPh=Object.keys(pb.map||{}).length, stale=S.phoneIsStale(), cp=STORE.data.previewCopy;
    return '<section class="card" id="sec-sem"><h2 class="card-h">ข้อมูลในเครื่องนี้</h2>'+
      '<dl class="stats"><div><dt>ภาคเรียน</dt><dd>'+h(sem.meta.label)+(sem.meta.archived?' <span class="tag warn">อ่านอย่างเดียว</span>':'')+'</dd></div>'+
      '<div><dt>ช่วงเวลา</dt><dd>'+h(S.thaiDate(sem.meta.startDate))+' – '+h(S.thaiDate(sem.meta.endDate))+'</dd></div>'+
      '<div><dt>ครู</dt><dd>'+teacherCount(sem.schedule)+' คน</dd></div>'+
      '<div><dt>เบอร์ติดต่อ</dt><dd>'+nPh+' เบอร์'+(nPh&&stale?' <span class="tag warn">ก่อนเปิดเทอมนี้</span>':'')+'</dd></div>'+
      '<div><dt>รายการแลกคาบ</dt><dd>'+(sem.log||[]).length+'</dd></div><div><dt>รอบการลา</dt><dd>'+(sem.leaves||[]).length+'</dd></div>'+
      '<div><dt>พื้นที่ที่ใช้</dt><dd>'+S.storageUsedMB().toFixed(2)+' MB</dd></div></dl>'+
      (labels.length>1?'<label class="fld inline"><span>สลับภาคเรียน</span><select class="sel" data-chg="semSwitch">'+labels.map(function(l){
        var ro=STORE.data.semesters[l].meta.archived; return '<option value="'+h(l)+'"'+(l===STORE.data.activeSemester?' selected':'')+'>'+h(l+(ro?' (เก็บไว้ อ่านอย่างเดียว)':' (ใช้งาน)'))+'</option>'; }).join('')+'</select></label>':'')+
      (cp?'<p class="hint">คัดลอกจากเว็บเดิม (legacy)เมื่อ '+h(new Date(cp.copiedAt).toLocaleString('th-TH'))+' — หลังจากนั้นข้อมูลสองฝั่งแยกกัน</p>':'')+'</section>';
  }
  function secIn(){
    return '<section class="card" id="sec-in"><h2 class="card-h">'+(hasData()?'นำข้อมูลเข้า':'เริ่มใช้งาน')+'</h2>'+A.intakeHTML(!hasData())+
      '<p class="muted sm">ไม่ต้องเลือกว่าเป็นไฟล์ชนิดไหน โปรแกรมจะบอกเองว่าไฟล์คืออะไรและถามก่อนเปลี่ยนข้อมูล</p>'+ACCEPTS+A.oldSiteHTML()+'</section>';
  }
  function secOut(){
    var ds=S.daysSince(STORE.data.lastBackupAt), sem=A.sem();
    if(!sem) return '';
    return '<section class="card" id="sec-out"><h2 class="card-h">ส่งข้อมูลออก</h2><div class="outs">'+
      '<div class="out"><h3>'+icon('user')+'ให้ครูคนอื่นใช้</h3><p>ตารางสอนและเบอร์ติดต่อของภาคเรียน '+h(sem.meta.label)+' ในไฟล์เดียว <b>ไม่มี</b>รายการแลกคาบหรือรอบการลาของคุณ ผู้รับแค่ลากไฟล์มาวางบนเว็บ</p>'+
        '<button class="btn btn-primary" data-act="exportPack">'+icon('down')+'ไฟล์ข้อมูลโรงเรียน</button></div>'+
      '<div class="out"><h3>'+icon('copy')+'ของฉันเอง: ย้ายเครื่อง / กันหาย</h3><p>ทุกอย่างในเครื่องนี้ รวมรายการแลกคาบ รอบการลา และข้อมูลในใบขอแลก · สำรองล่าสุด: '+(ds==null?'ยังไม่เคย':(ds===0?'วันนี้':ds+' วันที่แล้ว'))+'</p>'+
        '<button class="btn" data-act="backup">'+icon('down')+'ไฟล์สำรองของฉัน</button></div></div>'+
      '<p class="hint">ทั้งสองไฟล์มีชื่อและเบอร์โทรของครู — ส่งให้เฉพาะคนในโรงเรียน อย่าอัปโหลดขึ้นที่สาธารณะ</p>'+note('out')+note('backup')+'</section>';
  }
  function secPrep(){
    return '<section class="card" id="sec-prep"><h2 class="card-h">สำหรับผู้ดูแล: เตรียมภาคเรียนใหม่</h2><ol class="guide">'+
      '<li>ลากไฟล์ <b>ตารางสอน .xlsx</b> (ชีต <code>VERIFIED_DATA</code>) มาวาง แล้วตั้งชื่อภาคเรียน</li>'+
      '<li>ลากไฟล์ <b>เบอร์ติดต่อ .xlsx</b> มาวาง (ไม่บังคับ) — ลากพร้อมกันสองไฟล์ก็ได้</li>'+
      '<li>กด <b>ไฟล์ข้อมูลโรงเรียน</b> ในหัวข้อ “ส่งข้อมูลออก” แล้วส่งไฟล์นั้นให้ครูคนอื่น</li></ol>'+
      '<div class="tools"><button class="btn btn-sm btn-ghost" data-act="tmplSchedule">ดาวน์โหลดแม่แบบตารางสอน</button><button class="btn btn-sm btn-ghost" data-act="tmplPhone">ดาวน์โหลดแม่แบบเบอร์ติดต่อ</button></div></section>';
  }
  function settingRow(m, st, defs){
    var val=(st[m.key]!=null)?st[m.key]:defs[m.key], chg=String(val)!==String(defs[m.key]);
    return '<div class="set'+(chg?' chg':'')+'"><div><label for="set_'+m.key+'">'+h(m.label)+'</label><p class="hint">'+h(m.help)+'</p></div><div class="set-i">'+
      (m.type==='choice'?'<select class="sel" id="set_'+m.key+'" data-chg="setting" data-key="'+m.key+'">'+m.choices.map(function(c){ return '<option'+(String(c)===String(val)?' selected':'')+'>'+h(c)+'</option>'; }).join('')+'</select>'
        :'<input class="inp num" type="number" id="set_'+m.key+'" data-chg="setting" data-key="'+m.key+'" value="'+h(val)+'" min="'+m.min+'" max="'+m.max+'" step="1">')+
      '<span class="hint">ค่าเริ่มต้น '+h(defs[m.key])+'</span></div></div>';
  }
  function secSettings(){
    var st=STORE.data.settings, defs=S.settingsDefaults(), basic='', groups={}, order=[];
    S.SETTINGS_META.forEach(function(m){
      if(!m.adv){ basic+=settingRow(m, st, defs); return; }
      if(!groups[m.group]){ groups[m.group]=''; order.push(m.group); }
      groups[m.group]+=settingRow(m, st, defs);
    });
    return '<section class="card" id="sec-settings"><h2 class="card-h">การจัดอันดับคู่แลก</h2>'+basic+
      '<details class="adv" data-adv'+(advOpen()?' open':'')+'><summary>น้ำหนักคะแนนและเกณฑ์ (ขั้นสูง)</summary>'+
      '<p class="hint">ค่าพวกนี้เปลี่ยนลำดับของผลค้นหา ไม่เปลี่ยนว่าใครแลกได้หรือไม่ได้</p>'+
      order.map(function(g){ return '<h3 class="set-g">'+h(g)+'</h3>'+groups[g]; }).join('')+
      '<button class="btn btn-sm" data-act="resetSettings">คืนค่าการจัดอันดับเป็นค่าเริ่มต้นทั้งหมด</button></details>'+note('settings')+'</section>';
  }
  function secAdmin(){
    var arch=STORE.semesterLabels().filter(function(l){ var m=STORE.data.semesters[l].meta; return m && m.archived; });
    return '<section class="card" id="sec-admin"><h2 class="card-h">เครื่องมืออื่น</h2>'+
      '<details><summary>ตรวจสอบระบบคำนวณ</summary><p class="hint">รันชุดทดสอบมาตรฐานกับกลไกคำนวณ (ไม่ใช้ข้อมูลภาคเรียน) เพื่อยืนยันว่าผลยังถูกต้อง</p>'+
        '<button class="btn btn-sm" data-act="selfTest">เริ่มตรวจสอบ</button><div id="selfTestResult"></div></details>'+
      '<details><summary>ไฟล์โปรแกรมแบบเปิดได้ไม่ต้องต่อเน็ต (.html)</summary><p class="hint">โปรแกรมทั้งตัวพร้อมตารางสอนและเบอร์ติดต่อในไฟล์เดียว ใช้เมื่อต้องเปิดในที่ที่ไม่มีอินเทอร์เน็ต — ปกติใช้ “ไฟล์ข้อมูลโรงเรียน” สะดวกกว่า</p>'+
        '<button class="btn btn-sm" data-act="exportReady">สร้างไฟล์ .html</button></details>'+
      '<details><summary>ภาคเรียนที่เก็บไว้</summary>'+(arch.length?arch.map(function(l){
          return '<div class="rowline"><b>'+h(l)+'</b><button class="btn btn-sm" data-act="archExport" data-label="'+h(l)+'">ส่งออก .json แล้วลบออกจากเครื่อง</button></div>'; }).join('')
          :'<p class="muted">ยังไม่มีภาคเรียนที่เก็บไว้</p>')+'</details>'+
      '<details><summary>ล้างข้อมูล</summary><p class="hint">ล้างแล้วกู้คืนไม่ได้ — สำรองข้อมูลก่อน เบอร์ติดต่อและการตั้งค่าไม่ถูกลบ</p>'+
        '<div class="rowline"><span>ล้างเฉพาะรายการแลกคาบของภาคเรียนนี้</span><input class="inp" id="clrLog" placeholder="พิมพ์คำว่า ล้าง" autocomplete="off"><button class="btn btn-sm btn-danger-ghost" data-act="clearLog">ล้างรายการ</button></div>'+
        '<div class="rowline"><span>ล้างทั้งหมด เริ่มจากศูนย์</span><input class="inp" id="clrAll" placeholder="พิมพ์คำว่า ล้าง" autocomplete="off"><button class="btn btn-sm btn-danger-ghost" data-act="clearAll">ล้างทั้งหมด</button></div></details>'+
      note('admin')+'</section>';
  }
  function secGuide(){
    return '<section class="card" id="sec-guide"><h2 class="card-h">ใช้งานอย่างไร</h2><ol class="guide">'+
      '<li><b>จัดคาบที่ลา</b> — เลือกผู้ลา สร้างรอบการลา แล้วกด “หาคนแทน” ทีละคาบ</li>'+
      '<li><b>เลือกคู่</b> — เทียบวันสอนคืนและข้อควรรู้ ดูตารางจำลองสองฝ่ายได้ก่อนบันทึก</li>'+
      '<li><b>เอาไปคุย</b> — เปิด “ตารางไปคุย” พิมพ์หรือคัดลอกข้อความสรุปส่งให้ครูปลายทาง</li>'+
      '<li><b>ตกลงแล้ว</b> — เปลี่ยนเป็น “รออนุมัติ” แล้วดาวน์โหลดใบขอแลกคาบ (พพ.1-1)</li>'+
      '<li><b>อนุมัติแล้ว</b> — เปลี่ยนสถานะ ตารางสอนจริงจะปรับตาม</li></ol>'+
      '<p class="hint">ข้อมูลอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ไม่ถูกส่งไปที่ใด · เปลี่ยนเครื่องหรือเบราว์เซอร์ต้องนำไฟล์สำรองไปวางที่เครื่องใหม่</p></section>';
  }
  A.pages.data={
    render:function(){
      return '<header class="page-head"><div><h1>ข้อมูล</h1><p>นำข้อมูลเข้า ส่งออก และตั้งค่า — ข้อมูลของเว็บนี้แยกจากเว็บเดิม (legacy)</p></div></header>'+
        (STORE.loadError?'<div class="banner bad">'+icon('warn')+'<div><b>อ่านข้อมูลเดิมในเครื่องไม่สำเร็จ</b><p>'+h(STORE.loadError)+'</p><p>โปรแกรมจะไม่บันทึกทับข้อมูลเดิม — ใช้ “ล้างทั้งหมด” ในเครื่องมืออื่น แล้วนำไฟล์สำรองมาวางใหม่</p></div></div>':'')+
        '<div class="data-grid"><div>'+secSemester()+secIn()+secOut()+secPrep()+'</div><div>'+secSettings()+secAdmin()+secGuide()+'</div></div>';
    },
    after:function(view, args){
      if(args[0]){ var el=document.getElementById('sec-'+args[0]); if(el){ el.scrollIntoView({block:'start'}); el.classList.add('flash'); } }
      var adv=view.querySelector('[data-adv]');
      if(adv) adv.addEventListener('toggle', function(){ try{ localStorage.setItem('swap_preview_adv_view', adv.open?'1':'0'); }catch(_){} });
    }
  };

  /* ---------- ready file (single self-contained .html) ---------- */
  function b64(buf){ var s='', u=new Uint8Array(buf); for(var i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null, u.subarray(i,i+0x8000)); return btoa(s); }
  function inlineJS(t){ return t.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--'); }
  A.acts.exportReady=function(){
    var a=A.sem();
    if(!a || !a.schedule || !a.schedule.length){ say('backup','ยังไม่มีตารางสอนให้ส่งออก',true); A.rerender(); return; }
    var pay={ semester:{label:a.meta.label, startDate:a.meta.startDate, endDate:a.meta.endDate, sourceFilename:a.meta.sourceFilename||'', rows:a.schedule},
              phones:(STORE.data.phonebook&&STORE.data.phonebook.map)||{}, settings:STORE.data.settings };
    var json=JSON.stringify(pay, S.leanReplacer).replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\u0021--'), html=A.pristine;
    function get(u, bin){ return fetch(u).then(function(r){ if(!r.ok) throw new Error(u); return bin?r.arrayBuffer():r.text(); }); }
    var jobs=[], srcs=[], m, re=/<script src="([^"]+)"><\/script>/g;
    while((m=re.exec(html))) srcs.push(m[1]);
    var css=/<link rel="stylesheet" href="([^"]+)">/.exec(html), parts={};
    srcs.forEach(function(s){ jobs.push(get(s).then(function(t){ parts[s]=t; })); });
    if(srcs.length) jobs.push(get('assets/xlsx.js').then(function(t){ parts.__xlsx=t; }));
    if(css) jobs.push(get(css[1]).then(function(t){
      var fonts=[], fm, fr=/url\(\.\.\/assets\/([\w.-]+\.woff2)\)/g; while((fm=fr.exec(t))) fonts.push(fm[1]);
      return Promise.all(fonts.map(function(f){ return get('assets/'+f, true).then(function(buf){ parts['font:'+f]=b64(buf); }); })).then(function(){
        parts.__css=t.replace(/url\(\.\.\/assets\/([\w.-]+\.woff2)\)/g, function(_, f){ return 'url(data:font/woff2;base64,'+parts['font:'+f]+')'; }); });
    }));
    Promise.all(jobs).then(function(){
      if(css) html=html.replace(css[0], function(){ return '<style>'+parts.__css+'</style>'; });
      var first=true;
      html=html.replace(/<script src="([^"]+)"><\/script>/g, function(_, s){
        var pre=first?'<script>'+inlineJS(parts.__xlsx)+'</script>\n':''; first=false;
        return pre+'<script>'+inlineJS(parts[s])+'</script>'; });
      html=html.replace(/(<script type="application\/json" id="embedded-data">)[\s\S]*?(<\/script>)/, function(_, a1, a2){ return a1+json+a2; });
      A.download(new Blob([html],{type:'text/html;charset=utf-8'}), 'แลกคาบ_'+String(a.meta.label||'semester').replace(/[\/\\]/g,'-')+'_พร้อมใช้.html');
      say('backup','สร้างไฟล์พร้อมใช้แล้ว ('+(html.length/1048576).toFixed(1)+' MB · ไม่รวมรายการแลกคาบ)'); A.rerender();
    }).catch(function(){
      say('backup','สร้างไฟล์พร้อมใช้ไม่สำเร็จ — ต้องเปิดโปรแกรมผ่านที่อยู่เว็บ (https) จึงจะรวมไฟล์ประกอบได้',true); A.rerender();
    });
  };

  A.acts.tmplSchedule=function(){ A.needXLSX().then(function(){ S.buildScheduleTemplate(); }).catch(function(e){ A.toast(e.message,{bad:true}); }); };
  A.acts.tmplPhone=function(){ A.needXLSX().then(function(){
    S.downloadSheet([['teacher_id','teacher_name','phone'],['0101','นายตัวอย่าง หนึ่ง','0812345678'],['0102','นางสาวตัวอย่าง สอง','']], 'phones', 'template_phones.xlsx');
  }).catch(function(e){ A.toast(e.message,{bad:true}); }); };

  /* ---------- settings / admin ---------- */
  A.chgs.setting=function(el){
    var key=el.getAttribute('data-key'), meta=S.SETTINGS_META.filter(function(m){ return m.key===key; })[0], defs=S.settingsDefaults(), v;
    if(meta.type==='choice') v=el.value;
    else { v=parseInt(el.value,10); if(isNaN(v)) v=defs[key]; if(meta.min!=null && v<meta.min) v=meta.min; if(meta.max!=null && v>meta.max) v=meta.max; }
    STORE.data.settings[key]=v;
    if(key==='GIVEBACK_PREFERENCE') ui.pref=v;
    deriveAll(); A.invalidate(); STORE.save(); A.rerender();
  };
  A.acts.resetSettings=function(){
    A.ask({title:'คืนค่าการจัดอันดับทั้งหมด?', body:'<p>น้ำหนักคะแนน เกณฑ์ และคาบพักกลางวันจะกลับเป็นค่าเริ่มต้น ข้อมูลตารางและรายการแลกคาบไม่ถูกแตะ</p>', ok:'คืนค่า'}).then(function(y){
      if(!y) return; STORE.data.settings=S.settingsDefaults(); ui.pref=null; deriveAll(); A.invalidate(); STORE.save(); A.rerender(); });
  };
  A.acts.selfTest=function(){
    var box=document.getElementById('selfTestResult'); box.innerHTML='<p class="muted">กำลังตรวจสอบ…</p>';
    function line(c){ return '<li class="'+(c.ok?'ok':'bad')+'">'+(c.ok?'✓':'✗')+' '+h(c.id)+' <span class="muted">('+h(c.label)+')</span>'+(c.ok?'':' — '+h(c.detail))+'</li>'; }
    function show(res){
      var lt=S.runLedgerTests(), out='';
      if(res && res.ok) out+='<p class="'+(res.allGreen?'okline':'err')+'">กลไกคำนวณ: '+res.passed+'/'+res.total+' กรณี · ตรวจ '+res.fields+' ค่า</p><ul class="tests">'+res.cases.map(line).join('')+'</ul>';
      else out+='<p class="err">ไม่พบชุดทดสอบกลไกคำนวณในไฟล์นี้ (ไฟล์พร้อมใช้ไม่รวมชุดทดสอบ) — เปิดจากเว็บเพื่อตรวจ</p>';
      out+='<p class="'+(lt.allGreen?'okline':'err')+'">การจองคาบ (ledger): '+lt.passed+'/'+lt.total+' กรณี</p><ul class="tests">'+lt.cases.map(line).join('')+'</ul>';
      box.innerHTML=out;
    }
    (window.__SWAP_FIXTURE__?Promise.resolve():A.loadScript('assets/selftest-fixture.js')).then(function(){ show(S.runSelfTest()); }, function(){ show(null); });
  };
  A.acts.archExport=function(el){
    var lbl=el.getAttribute('data-label');
    A.ask({title:'ส่งออกแล้วลบภาคเรียน '+lbl+'?', body:'<p>ไฟล์ .json จะถูกดาวน์โหลดก่อนลบ นำกลับเข้ามาได้ด้วย “กู้คืนจากไฟล์สำรอง”</p>', ok:'ส่งออกแล้วลบ', danger:true}).then(function(y){
      if(!y) return;
      var blob=STORE.bundleBlob(lbl); if(blob) A.download(blob, 'swap_semester_'+lbl.replace(/[\/\\]/g,'-')+'.json');
      var r=STORE.deleteSemester(lbl); say('admin', r.ok?'ลบภาคเรียน '+h(lbl)+' ออกจากเครื่องแล้ว':h(r.error||'ลบไม่สำเร็จ'), !r.ok); A.rerender(); });
  };
  A.acts.clearLog=function(){
    if((document.getElementById('clrLog').value||'').trim()!=='ล้าง'){ A.toast('พิมพ์คำว่า “ล้าง” ในช่องก่อน',{bad:true}); return; }
    if(A.readOnly()){ A.toast(S.readOnlyText(),{bad:true}); return; }
    A.ask({title:'ล้างรายการแลกคาบทั้งหมดของภาคเรียนนี้?', body:'<p>ตารางสอน รอบการลา และเบอร์ติดต่อยังอยู่</p>', ok:'ล้างรายการ', danger:true}).then(function(y){
      if(!y) return; var a=A.sem(); if(a){ a.log=[]; STORE.save(); A.invalidate(); } say('admin','ล้างรายการแลกคาบแล้ว'); A.rerender(); });
  };
  A.acts.clearAll=function(){
    if((document.getElementById('clrAll').value||'').trim()!=='ล้าง'){ A.toast('พิมพ์คำว่า “ล้าง” ในช่องก่อน',{bad:true}); return; }
    A.ask({title:'ล้างข้อมูลทั้งหมดในเว็บนี้?', body:'<p>ตารางสอน รายการแลกคาบ รอบการลา และภาคเรียนที่เก็บไว้จะถูกลบ เบอร์ติดต่อและการตั้งค่ายังอยู่ เว็บเดิมไม่ถูกแตะ</p>', ok:'ล้างทั้งหมด', danger:true}).then(function(y){
      if(!y) return; STORE.loadError=null; STORE.clearAllData(); location.hash='#plan'; location.reload(); });
  };

  /* ---------- ready-file boot: install the embedded payload on an empty store ---------- */
  A.bootEmbedded=function(){
    var el=document.getElementById('embedded-data'); if(!el) return false;
    var txt=(el.textContent||'').trim(); if(!txt) return false;
    if(STORE.loadError || STORE.data.activeSemester || STORE.data.noEmbed) return false;
    var pay; try{ pay=JSON.parse(txt); }catch(_){ return false; }
    if(!pay || !pay.semester || !pay.semester.rows) return false;
    var s=pay.semester, res=STORE.commitSemester(s.label, s.startDate, s.endDate, s.sourceFilename||'', s.rows);
    if(!res.ok) return false;
    var a=A.sem();
    if(pay.phones){ var pb=S.phonebook(); pb.map=pay.phones; pb.lastImportedAt=(a&&a.meta&&a.meta.importedAt)||new Date().toISOString(); pb.sourceFilename=(s.sourceFilename||'')+' (embedded)'; }
    if(pay.settings){ for(var k in pay.settings) if(Object.prototype.hasOwnProperty.call(STORE.data.settings,k)) STORE.data.settings[k]=pay.settings[k]; }
    STORE.save(); return true;
  };
})();
