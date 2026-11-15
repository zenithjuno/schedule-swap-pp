/* หน้า “ข้อมูลและตั้งค่า” — semester data, phones, backup/restore, the copy
   from the stable site, ranking settings, admin tools and the short guide. */
(function(){
  'use strict';
  var A=window.APP, S=A.S, STORE=A.STORE, h=A.h, ui=A.ui, icon=A.icon;
  var SOURCE_KEY='swapApp.v1';
  var imp=null, flash={};      // staged import; one-shot result messages per section
  function advOpen(){ try{ return localStorage.getItem('swap_preview_adv_view')==='1'; }catch(_){ return false; } }
  function afterDataChange(){ A.invalidate(); ui.roundId=null; ui.date=null; if(ui.meId && !A.teacher(ui.meId)) ui.meId=null; }
  function deriveAll(){ for(var l in STORE.data.semesters){ var s=STORE.data.semesters[l]; if(s && s.schedule) S.deriveRows(s.schedule, STORE.data.settings); } }
  A.deriveMissing=function(){ for(var l in STORE.data.semesters) S.ensureSemesterDerived(STORE.data.semesters[l], STORE.data.settings); };
  function note(k){ var m=flash[k]; delete flash[k]; return m?'<p class="'+(m.bad?'err':'okline')+'">'+(m.bad?'':icon('check'))+m.html+'</p>':''; }
  function say(k, html, bad){ flash[k]={html:html, bad:!!bad}; }
  function count(sem){ var t={}; sem.schedule.forEach(function(d){ t[d.teacher_id]=1; }); return Object.keys(t).length; }

  /* ---------- sections ---------- */
  function secSemester(){
    var sem=A.sem(), labels=STORE.semesterLabels(), out='<section class="card" id="sec-sem"><h2 class="card-h">ภาคเรียน</h2>';
    if(!sem) return out+'<p class="empty">ยังไม่มีข้อมูลในรุ่นทดลองนี้ — เลือกวิธีเริ่มด้านล่าง</p></section>';
    var mb=S.storageUsedMB(), cp=STORE.data.previewCopy;
    out+='<dl class="stats"><div><dt>ภาคเรียนที่ใช้งาน</dt><dd>'+h(sem.meta.label)+(sem.meta.archived?' <span class="tag warn">อ่านอย่างเดียว</span>':'')+'</dd></div>'+
      '<div><dt>ช่วงเวลา</dt><dd>'+h(S.thaiDate(sem.meta.startDate))+' – '+h(S.thaiDate(sem.meta.endDate))+'</dd></div>'+
      '<div><dt>ครู</dt><dd>'+count(sem)+' คน</dd></div><div><dt>คาบในตาราง</dt><dd>'+sem.schedule.length.toLocaleString()+' แถว</dd></div>'+
      '<div><dt>รายการแลกคาบ</dt><dd>'+(sem.log||[]).length+' รายการ</dd></div><div><dt>รอบการลา</dt><dd>'+(sem.leaves||[]).length+' รอบ</dd></div>'+
      '<div><dt>พื้นที่ที่ใช้ในเครื่อง</dt><dd>'+mb.toFixed(2)+' MB <span class="muted">(เก็บแบบย่อ)</span></dd></div></dl>';
    if(labels.length>1) out+='<label class="fld inline"><span>สลับภาคเรียน</span><select class="sel" data-chg="semSwitch">'+labels.map(function(l){
      var ro=STORE.data.semesters[l].meta.archived; return '<option value="'+h(l)+'"'+(l===STORE.data.activeSemester?' selected':'')+'>'+h(l+(ro?' (เก็บไว้ อ่านอย่างเดียว)':' (ใช้งาน)'))+'</option>'; }).join('')+'</select></label>';
    if(cp) out+='<p class="hint">คัดลอกจากเว็บเดิมเมื่อ '+h(new Date(cp.copiedAt).toLocaleString('th-TH'))+' (ภาคเรียน '+h(cp.sourceSemester||'—')+') — หลังจากนั้นข้อมูลสองฝั่งแยกกัน ไม่ซิงก์ถึงกัน</p>';
    return out+note('sem')+'</section>';
  }
  function sourceSummary(){
    var raw=null; try{ raw=localStorage.getItem(SOURCE_KEY); }catch(_){}
    if(!raw) return null;
    try{
      var d=JSON.parse(raw); if(!d || !d.semesters) return {error:'ข้อมูลของเว็บเดิมมีรูปแบบที่ไม่รู้จัก'};
      var labels=Object.keys(d.semesters), rows=0, logs=0, leaves=0;
      labels.forEach(function(l){ var s=d.semesters[l]; rows+=(s.schedule||[]).length; logs+=(s.log||[]).length; leaves+=(s.leaves||[]).length; });
      return {raw:raw, active:d.activeSemester, labels:labels, rows:rows, logs:logs, leaves:leaves, phones:Object.keys((d.phonebook&&d.phonebook.map)||{}).length};
    }catch(e){ return {error:'อ่านข้อมูลของเว็บเดิมไม่สำเร็จ ('+(e.message||e)+')'}; }
  }
  function secCopy(){
    var s=sourceSummary(), has=Object.keys(STORE.data.semesters||{}).length>0;
    var out='<section class="card" id="sec-copy"><h2 class="card-h">คัดลอกข้อมูลจากเว็บเดิม</h2>';
    if(!s) out+='<p class="muted">ไม่พบข้อมูลของเว็บเดิมในเบราว์เซอร์นี้ — ต้องเปิดจากที่อยู่เว็บเดียวกันและเบราว์เซอร์เดียวกับที่ใช้เว็บเดิม หรือใช้ “กู้คืนจากไฟล์สำรอง” ด้านล่างแทน</p>';
    else if(s.error) out+='<p class="err">'+h(s.error)+'</p>';
    else out+='<p>พบข้อมูลของเว็บเดิมในเบราว์เซอร์นี้ การคัดลอกเป็นการอ่านอย่างเดียว เว็บเดิมไม่ถูกแก้ไข</p>'+
      '<dl class="stats"><div><dt>ภาคเรียน</dt><dd>'+h(s.labels.join(', '))+' <span class="muted">(ใช้งาน: '+h(s.active||'—')+')</span></dd></div>'+
      '<div><dt>ตาราง</dt><dd>'+s.rows.toLocaleString()+' แถว</dd></div><div><dt>รายการแลกคาบ</dt><dd>'+s.logs+'</dd></div><div><dt>รอบการลา</dt><dd>'+s.leaves+'</dd></div><div><dt>เบอร์ติดต่อ</dt><dd>'+s.phones+'</dd></div></dl>'+
      '<button class="btn '+(has?'':'btn-primary')+'" data-act="copyOld">'+icon('down')+(has?'คัดลอกทับข้อมูลรุ่นทดลอง…':'คัดลอกเข้ารุ่นทดลอง')+'</button>'+
      (has?'<p class="hint">รุ่นทดลองมีข้อมูลอยู่แล้ว การคัดลอกจะแทนที่ทั้งหมด — สำรองข้อมูลรุ่นทดลองก่อนถ้าต้องการเก็บไว้</p>':'');
    return out+note('copy')+'</section>';
  }
  function secBackup(){
    var ds=S.daysSince(STORE.data.lastBackupAt);
    return '<section class="card" id="sec-backup"><h2 class="card-h">สำรองและกู้คืน</h2>'+
      '<p class="muted">ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ไฟล์สำรองเป็น .json รูปแบบเดียวกับเว็บเดิม ใช้ข้ามกันได้ · สำรองล่าสุด: '+(ds==null?'ยังไม่เคย':ds+' วันที่แล้ว')+'</p>'+
      '<div class="tools"><button class="btn btn-primary" data-act="backup">'+icon('down')+'สำรองข้อมูล (.json)</button>'+
      '<label class="btn" for="restoreInput">'+icon('up')+'กู้คืนจากไฟล์สำรอง…</label><input id="restoreInput" type="file" accept=".json,application/json" hidden data-chg="restore">'+
      '<button class="btn" data-act="exportReady">สร้างไฟล์พร้อมใช้ (.html)</button></div>'+
      '<p class="hint">“ไฟล์พร้อมใช้” คือโปรแกรมทั้งตัวในไฟล์เดียวพร้อมตารางสอนและเบอร์ติดต่อ (ไม่รวมรายการแลกคาบ) เปิดได้โดยไม่ต้องต่ออินเทอร์เน็ต — ไฟล์นี้มีข้อมูลส่วนบุคคล อย่าอัปโหลดขึ้นที่สาธารณะ</p>'+
      note('backup')+'</section>';
  }
  function secImport(){
    return '<section class="card" id="sec-import"><h2 class="card-h">นำเข้าตารางสอนภาคเรียนใหม่</h2>'+
      '<p class="muted">ไฟล์ .xlsx ที่มีชีต <code>VERIFIED_DATA</code> — ตรวจรูปแบบแบบทั้งหมดหรือไม่เลย ภาคเรียนที่ใช้อยู่จะถูกเก็บเป็นอ่านอย่างเดียว</p>'+
      '<div class="tools"><label class="btn" for="fileInput">เลือกไฟล์ตารางสอน .xlsx…</label><input id="fileInput" type="file" accept=".xlsx" hidden data-chg="impFile">'+
      '<button class="btn btn-sm btn-ghost" data-act="tmplSchedule">แม่แบบตารางสอน</button></div>'+
      '<div id="impReport">'+(imp?impReport():'')+'</div>'+note('import')+'</section>';
  }
  function secPhones(){
    var pb=S.phonebook(), n=Object.keys(pb.map||{}).length, stale=S.phoneIsStale(), has=!!pb.lastImportedAt||n>0;
    return '<section class="card" id="sec-phones"><h2 class="card-h">เบอร์ติดต่อครู <span class="muted">(ไม่บังคับ)</span></h2>'+
      '<p class="muted">'+(has?(n+' เบอร์ · อัปเดตล่าสุด '+h(S.phoneDateBE(pb.lastImportedAt))+' ('+h(S.phoneAgeText(pb.lastImportedAt))+')'+(stale?' — <span class="warn-t">เป็นข้อมูลก่อนเปิดภาคเรียนนี้ ควรนำเข้าใหม่</span>':'')):'ยังไม่มีเบอร์ติดต่อ')+'</p>'+
      '<div class="tools"><label class="btn" for="phoneInput">เลือกไฟล์เบอร์ .xlsx…</label><input id="phoneInput" type="file" accept=".xlsx" hidden data-chg="phoneFile">'+
      '<button class="btn btn-sm btn-ghost" data-act="tmplPhone">แม่แบบเบอร์ติดต่อ</button></div>'+
      '<p class="hint">คอลัมน์ <code>teacher_id | teacher_name | phone</code> — ครูที่ยังไม่มีเบอร์ให้เว้นว่าง</p>'+note('phones')+'</section>';
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
    return '<section class="card" id="sec-admin"><h2 class="card-h">เครื่องมือผู้ดูแล</h2>'+
      '<details><summary>ตรวจสอบระบบคำนวณ</summary><p class="hint">รันชุดทดสอบมาตรฐานกับกลไกคำนวณ (ไม่ใช้ข้อมูลภาคเรียน) เพื่อยืนยันว่าผลยังถูกต้อง</p>'+
        '<button class="btn btn-sm" data-act="selfTest">เริ่มตรวจสอบ</button><div id="selfTestResult"></div></details>'+
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
      '<li><b>ตกลงแล้ว</b> — เปลี่ยนเป็น “รออนุมัติ” แล้วพิมพ์ใบขอแลกคาบ (พพ.1-1) ได้เลย</li>'+
      '<li><b>อนุมัติแล้ว</b> — เปลี่ยนสถานะ ตารางสอนจริงจะปรับตาม</li></ol>'+
      '<p class="hint">สถานะ “เสนอ” และ “รออนุมัติ” จองคาบไว้เพื่อกันการนัดซ้อน · “ยกเลิก” คืนคาบทันที · ข้อมูลอยู่ในเครื่องนี้เท่านั้น ไม่ถูกส่งออกไปที่ใด</p></section>';
  }
  A.pages.data={
    render:function(){
      return '<header class="page-head"><div><h1>ข้อมูลและตั้งค่า</h1><p>รุ่นทดลองเก็บข้อมูลแยกจากเว็บเดิม — งานที่ทำที่นี่ไม่กระทบเว็บเดิม</p></div></header>'+
        (STORE.loadError?'<div class="banner bad">'+icon('warn')+'<div><b>อ่านข้อมูลเดิมในเครื่องไม่สำเร็จ</b><p>'+h(STORE.loadError)+'</p><p>โปรแกรมจะไม่บันทึกทับข้อมูลเดิม — กู้คืนจากไฟล์สำรองเพื่อเริ่มใหม่</p></div></div>':'')+
        '<div class="data-grid"><div>'+secSemester()+secCopy()+secBackup()+secImport()+secPhones()+'</div><div>'+secSettings()+secAdmin()+secGuide()+'</div></div>';
    },
    after:function(view, args){
      if(args[0]){ var el=document.getElementById('sec-'+args[0]); if(el){ el.scrollIntoView({block:'start'}); el.classList.add('flash'); } }
      var adv=view.querySelector('[data-adv]');
      if(adv) adv.addEventListener('toggle', function(){ try{ localStorage.setItem('swap_preview_adv_view', adv.open?'1':'0'); }catch(_){} });
    }
  };

  /* ---------- semester / copy / backup ---------- */
  A.chgs.semSwitch=function(el){
    var r=STORE.setActiveSemester(el.value);
    if(!r.ok){ A.toast(r.error||'สลับภาคเรียนไม่สำเร็จ',{bad:true}); } else { afterDataChange(); A.toast('สลับไปภาคเรียน '+el.value); }
    A.rerender();
  };
  function replaceStore(obj, stamp){
    var prev=STORE.data, prevErr=STORE.loadError;
    STORE.loadError=null;
    var r=STORE.restoreFromObject(obj);
    if(r.ok && stamp){ stamp(); r=STORE.save(); if(r.ok) r.kind='store'; }
    if(!r.ok){ STORE.data=prev; STORE.loadError=prevErr; return r; }
    afterDataChange(); return r;
  }
  A.acts.copyOld=function(){
    var s=sourceSummary(); if(!s || s.error) { A.rerender(); return; }
    var has=Object.keys(STORE.data.semesters||{}).length>0;
    function run(){
      var obj; try{ obj=JSON.parse(localStorage.getItem(SOURCE_KEY)); }catch(e){ say('copy','อ่านข้อมูลของเว็บเดิมไม่สำเร็จ',true); A.rerender(); return; }
      var r=replaceStore(obj, function(){
        STORE.data.previewCopy={copiedAt:new Date().toISOString(), sourceSemester:STORE.data.activeSemester};
        STORE.data.lastBackupAt=null; STORE.data.approvedSinceBackup=0; });
      if(!r.ok) say('copy', 'คัดลอกไม่สำเร็จ: '+h(r.error)+' — ข้อมูลรุ่นทดลองเดิมไม่ถูกแก้ไข', true);
      else { A.toast('คัดลอกข้อมูลจากเว็บเดิมแล้ว'); A.go('#plan'); return; }
      A.rerender();
    }
    if(!has) run();
    else A.ask({title:'คัดลอกทับข้อมูลรุ่นทดลอง?', body:'<p>ข้อมูลทั้งหมดในรุ่นทดลอง (ตาราง รายการแลกคาบ รอบการลา) จะถูกแทนที่ด้วยสำเนาจากเว็บเดิม เว็บเดิมไม่ถูกแก้ไข</p>', ok:'คัดลอกทับ', danger:true}).then(function(y){ if(y) run(); });
  };
  A.acts.backup=function(){
    if(!STORE.data.activeSemester){ say('backup','ยังไม่มีข้อมูลให้สำรอง',true); A.rerender(); return; }
    A.download(STORE.backupBlob(), 'swap_preview_backup_'+STORE.data.activeSemester.replace(/[\/\\]/g,'-')+'_'+new Date().toISOString().slice(0,10)+'.json');
    STORE.markBackedUp(); say('backup','ดาวน์โหลดไฟล์สำรองแล้ว'); A.rerender();
  };
  A.chgs.restore=function(el){
    var f=el.files && el.files[0]; if(!f) return;
    var rd=new FileReader();
    rd.onload=function(ev){
      var obj; try{ obj=JSON.parse(ev.target.result); }catch(_){ say('backup','ไฟล์ไม่ใช่ JSON ที่ถูกต้อง — ข้อมูลเดิมไม่ถูกแก้ไข',true); A.rerender(); return; }
      var full=!!(obj && obj.schemaVersion && obj.semesters);
      A.ask({title:'กู้คืนจากไฟล์นี้?', body:'<p>'+h(f.name)+'</p><p>'+(full?'ข้อมูลทั้งหมดในรุ่นทดลองจะถูกแทนที่ด้วยข้อมูลในไฟล์':'ภาคเรียนในไฟล์จะถูกเพิ่มเป็นภาคเรียนที่เก็บไว้ (อ่านอย่างเดียว)')+'</p>', ok:'กู้คืน', danger:full}).then(function(y){
        if(!y) return;
        var r=replaceStore(obj);
        if(!r.ok) say('backup','กู้คืนไม่สำเร็จ: '+h(r.error)+' — ข้อมูลเดิมไม่ถูกแก้ไข',true);
        else { A.toast('กู้คืนสำเร็จ ('+(r.kind==='store'?'ทั้งคลังข้อมูล':'ภาคเรียน '+r.label)+')'); if(r.kind==='store'){ A.go('#plan'); return; } }
        A.rerender();
      });
    };
    rd.readAsText(f);
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
      A.download(new Blob([html],{type:'text/html;charset=utf-8'}), 'แลกคาบ-รุ่นทดลอง_'+String(a.meta.label||'semester').replace(/[\/\\]/g,'-')+'_พร้อมใช้.html');
      say('backup','สร้างไฟล์พร้อมใช้แล้ว ('+(html.length/1048576).toFixed(1)+' MB · ไม่รวมรายการแลกคาบ)'); A.rerender();
    }).catch(function(){
      say('backup','สร้างไฟล์พร้อมใช้ไม่สำเร็จ — ต้องเปิดโปรแกรมผ่านที่อยู่เว็บ (https) จึงจะรวมไฟล์ประกอบได้',true); A.rerender();
    });
  };

  /* ---------- schedule import ---------- */
  function impReport(){
    if(imp.fail) return '<div class="report bad"><b>ไฟล์ไม่ผ่าน — ไม่นำเข้าข้อมูลใด ๆ</b><p>'+h(imp.fail)+'</p><p class="hint">แก้ไขจุดที่แจ้งแล้วเลือกไฟล์ใหม่ ข้อมูลเดิมไม่ถูกแก้ไข</p></div>';
    var rows=imp.rows, w=imp.warnings, c=S.statusCounts(rows), hard=(w.room.length||w.fourdig.length||w.subj.length||w.drift);
    var tc={}; rows.forEach(function(d){ tc[d.teacher_id]=1; });
    function ws(title, items, render){
      if(!items.length) return '<p class="okline">'+icon('check')+h(title)+': ไม่พบปัญหา</p>';
      return '<details><summary>'+h(title)+' ('+items.length+')</summary><ul class="rlist">'+items.slice(0,40).map(function(it){ return '<li><span class="rn">แถว '+it.row+'</span>'+render(it)+'</li>'; }).join('')+
        (items.length>40?'<li class="muted">… และอีก '+(items.length-40)+' รายการ</li>':'')+'</ul></details>';
    }
    var guess=(imp.fileName.match(/(\d{4})[_\/-]?(\d)/)||[]);
    return '<div class="report '+(hard?'warn':'ok')+'"><b>'+h(imp.fileName)+' — ตรวจรูปแบบผ่าน โปรดยืนยันก่อนใช้งาน</b>'+
      '<dl class="stats"><div><dt>แถว</dt><dd>'+rows.length.toLocaleString()+'</dd></div><div><dt>ครู</dt><dd>'+Object.keys(tc).length+'</dd></div>'+
      '<div><dt>คาบรวมห้อง</dt><dd>'+rows.filter(function(d){ return d.group.indexOf(',')!==-1; }).length+'</dd></div><div><dt>ซ่อมเสริม</dt><dd>'+imp.changed.length+'</dd></div>'+
      '<div><dt>สถานะ</dt><dd class="sm">'+Object.keys(c).map(function(k){ return c[k]+' '+h(k); }).join(' · ')+'</dd></div></dl>'+
      (imp.changed.length?'<details><summary>คาบซ่อมเสริมที่แปลงเป็นคาบสอน ('+imp.changed.length+')</summary><ul class="rlist">'+imp.changed.slice(0,60).map(function(ch){
        return '<li><span class="rn">'+h(ch.before.teacher_id)+'</span>'+h(ch.before.day)+' คาบ '+h(ch.before.period)+': <code>'+h(ch.before.raw)+'</code> → '+h(ch.after.group)+' ห้อง '+h(ch.after.room)+(ch.ambiguous?' <span class="tag warn">ตีความได้ 2 แบบ</span>':'')+'</li>'; }).join('')+'</ul></details>':'')+
      ws('ความสอดคล้องกับข้อความต้นฉบับ', w.recon, function(it){ return 'สร้างกลับได้ “'+h(it.subject+it.group+it.room)+'” แต่ต้นฉบับคือ “'+h(it.raw)+'”'; })+
      ws('ห้องที่ไม่รู้จัก', w.room, function(it){ return 'ห้อง “'+h(it.room)+'”'; })+
      ws('ห้อง 4 หลักที่ไม่ขึ้นต้นด้วย 1', w.fourdig, function(it){ return 'ห้อง “'+h(it.room)+'”'; })+
      ws('รหัสวิชาผิดรูปแบบ', w.subj, function(it){ return 'รหัสวิชา “'+h(it.subject)+'”'; })+
      (w.drift?'<p class="err">จำนวนแถวต่างจากภาคเรียนก่อนมาก: '+w.drift.prev+' → '+w.drift.now+' ('+(w.drift.pct>0?'+':'')+w.drift.pct+'%)</p>':'')+
      '<div class="row3"><label class="fld"><span>ชื่อภาคเรียน</span><input class="inp" id="semLabelInput" placeholder="เช่น 2570/1" value="'+h(guess[1]?guess[1]+'/'+guess[2]:'')+'" autocomplete="off"></label>'+
      '<label class="fld"><span>วันเปิดภาคเรียน</span><input type="date" class="inp" id="semStartInput"></label>'+
      '<label class="fld"><span>วันปิดภาคเรียน</span><input type="date" class="inp" id="semEndInput"></label></div>'+
      '<p class="err" id="semHint" hidden></p>'+
      '<div class="tools"><button class="btn btn-primary" data-act="impConfirm">บันทึกเป็นภาคเรียนนี้</button><button class="btn" data-act="impCancel">ยกเลิก</button></div></div>';
  }
  A.chgs.impFile=function(el){
    var f=el.files && el.files[0]; if(!f) return;
    var host=document.getElementById('impReport'); host.innerHTML='<p class="muted">กำลังอ่านไฟล์…</p>';
    A.needXLSX().then(function(){
      var rd=new FileReader();
      rd.onload=function(e){
        try{
          var read=S.readVerifiedSheet(e.target.result), v=read.blocker?{ok:false, blocker:read.blocker}:S.validateBlockers(read.rows);
          if(!v.ok) imp={fail:v.blocker.msg};
          else {
            var work=v.rows.map(function(d){ var o={}; for(var k in d) o[k]=d[k]; return o; });
            var changed=S.reparseSomserm(work), act=A.sem();
            imp={rows:work, changed:changed, warnings:S.scanWarnings(work, act&&act.schedule?act.schedule.length:null), fileName:f.name};
          }
        }catch(err){ imp={fail:'อ่านไฟล์ไม่สำเร็จ: '+(err&&err.message||err)+' — ไฟล์อาจไม่ใช่ .xlsx ที่ถูกต้อง'}; }
        host.innerHTML=impReport();
      };
      rd.onerror=function(){ imp={fail:'ไม่สามารถอ่านไฟล์นี้ได้'}; host.innerHTML=impReport(); };
      rd.readAsArrayBuffer(f);
    }).catch(function(err){ imp={fail:'โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ ('+err.message+') — ตรวจการเชื่อมต่อแล้วลองใหม่'}; host.innerHTML=impReport(); });
  };
  A.acts.impCancel=function(){ imp=null; A.rerender(); };
  A.acts.impConfirm=function(){
    var label=(document.getElementById('semLabelInput').value||'').trim(), start=document.getElementById('semStartInput').value, end=document.getElementById('semEndInput').value;
    var hint=document.getElementById('semHint'); function bad(t){ hint.hidden=false; hint.textContent=t; }
    if(!label) return bad('กรุณากรอกชื่อภาคเรียน');
    if(!start || !end) return bad('กรุณากรอกวันเปิดและวันปิดภาคเรียน');
    if(end<start) return bad('วันปิดต้องไม่มาก่อนวันเปิด');
    if(STORE.semesterExists(label)) return bad('มีภาคเรียน “'+label+'” อยู่แล้ว — ใช้ชื่ออื่น');
    var res=STORE.commitSemester(label, start, end, imp.fileName, imp.rows);
    if(!res.ok) return bad('บันทึกไม่สำเร็จ: '+res.error);
    imp=null; afterDataChange();
    A.toast('บันทึกภาคเรียน '+label+' แล้ว'+(res.archived?' — ภาคเรียน '+res.archived+' ถูกเก็บเป็นอ่านอย่างเดียว':''));
    A.go('#plan');
  };
  A.chgs.phoneFile=function(el){
    var f=el.files && el.files[0]; if(!f) return;
    if(!A.sem()){ say('phones','นำเข้าตารางสอนก่อน จึงจะจับคู่เบอร์กับรหัสครูได้',true); A.rerender(); return; }
    if(A.readOnly()){ say('phones',h(S.readOnlyText()),true); A.rerender(); return; }
    A.needXLSX().then(function(){
      var rd=new FileReader();
      rd.onload=function(ev){
        try{
          var res=S.parsePhoneWorkbook(ev.target.result);
          if(!res.ok) say('phones','นำเข้าเบอร์ไม่สำเร็จ: '+h(res.error),true);
          else {
            var pb=S.phonebook(); pb.map=res.phones; pb.lastImportedAt=new Date().toISOString(); pb.sourceFilename=f.name; STORE.save();
            say('phones','นำเข้าแล้ว '+res.total+' เบอร์'+(res.teacherCount!=null?' · ครูที่ยังไม่มีเบอร์ '+(res.teacherCount-res.total)+' คน':'')+
              (res.unknownIds.length?' · ข้ามรหัสที่ไม่อยู่ในตาราง '+res.unknownIds.length+' รายการ':'')+(res.badRows.length?' · อ่านไม่ได้ '+res.badRows.length+' แถว (แถว '+res.badRows.slice(0,8).map(function(b){ return b.row; }).join(', ')+')':''), !!res.badRows.length);
          }
        }catch(err){ say('phones','อ่านไฟล์ไม่สำเร็จ: '+h(err&&err.message||err),true); }
        A.rerender();
      };
      rd.readAsArrayBuffer(f);
    }).catch(function(err){ say('phones',h(err.message),true); A.rerender(); });
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
    A.ask({title:'ล้างข้อมูลทั้งหมดในรุ่นทดลอง?', body:'<p>ตารางสอน รายการแลกคาบ รอบการลา และภาคเรียนที่เก็บไว้จะถูกลบ เบอร์ติดต่อและการตั้งค่ายังอยู่ เว็บเดิมไม่ถูกแตะ</p>', ok:'ล้างทั้งหมด', danger:true}).then(function(y){
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
