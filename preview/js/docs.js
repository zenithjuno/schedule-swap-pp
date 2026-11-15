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

  /* ───────── ใบขอแลกคาบ (พพ.1-1) ───────── */
  var fm=A.fm={tid:'', built:false, args:'', inc:{'อนุมัติแล้ว':true,'รออนุมัติ':true,'เสนอ':true}, off:{}, autoName:''};
  var TH_MON=S.TH_MON, _bd=S._bd;
  function $(id){ return document.getElementById(id); }
  function formSwaps(){
    var f=$('formFrom').value, t=$('formTo').value;
    return A.log().filter(function(e){
      var d=String(e.date_absent).slice(0,10);
      return e.me_id===fm.tid && fm.inc[e.status] && (!f||d>=f) && (!t||d<=t);
    }).sort(function(a,b){ var da=String(a.date_absent), db=String(b.date_absent); return da!==db?(da<db?-1:1):(+a.per_give)-(+b.per_give); });
  }
  function formChecked(){ return formSwaps().filter(function(e){ return !fm.off[e.id]; }); }
  function tableShell(){
    var w=[4.5,9.5,5,8,9,6,9.5,5,9,6,15,13.5];
    return '<table class="swap-form-table"><colgroup>'+w.map(function(x){ return '<col style="width:'+x+'%">'; }).join('')+'</colgroup><thead>'+
      '<tr><th rowspan="2">ลำดับที่</th><th colspan="5">คาบสอนปกติ</th><th colspan="4">คาบที่ขอแลก</th><th colspan="2">ลงชื่อผู้รับแลก/ผู้สอนแทน</th></tr>'+
      '<tr><th>ว/ด/ป</th><th>คาบที่</th><th>ม...../.....</th><th>รหัสวิชา</th><th>สถานที่</th><th>ว/ด/ป</th><th>คาบที่</th><th>รหัสวิชา</th><th>สถานที่</th><th>ตัวบรรจง</th><th>ลายเซ็น</th></tr>'+
      '</thead><tbody id="formTableBody"></tbody></table>';
  }
  function build(host){
    host.innerHTML=
    '<header class="page-head no-print"><div><h1>ใบขอแลกคาบ</h1><p>แบบ พพ.1-1 สำหรับขออนุญาต — ใช้ได้ตั้งแต่ยังเป็นข้อเสนอ ไม่ต้องอนุมัติก่อน</p></div></header>'+
    '<div class="no-print" id="formAudit"></div>'+
    '<section class="card no-print form-ctl">'+
      '<div class="tools"><span id="formWho"></span><span id="formRoundWrap"></span>'+
        '<label class="fld inline"><span>วันที่ลา ตั้งแต่</span><input type="date" class="inp" id="formFrom" data-chg="fmRange"></label>'+
        '<label class="fld inline"><span>ถึง</span><input type="date" class="inp" id="formTo" data-chg="fmRange"></label></div>'+
      '<div class="tools"><span class="lab">รวมสถานะ</span>'+['อนุมัติแล้ว','รออนุมัติ','เสนอ'].map(function(s){
          return '<label class="check"><input type="checkbox" data-chg="fmInc" value="'+s+'" checked> '+s+'</label>'; }).join('')+'</div>'+
      '<div id="formSwapList" class="fsw"></div>'+
      '<div class="tools"><button class="btn btn-primary" id="formPrint" data-act="print">'+icon('print')+'พิมพ์ / บันทึก PDF</button>'+
        '<button class="btn" data-act="fmCopy">'+icon('copy')+'คัดลอกตาราง (วางใน Word)</button>'+
        '<span class="hint" id="formHint"></span></div>'+
      '<p class="hint">ทุกช่องว่างในแบบฟอร์มพิมพ์แก้ได้เอง (ชื่อ ตำแหน่ง เหตุผล เวลา ฯลฯ) — ช่องที่กรอกอยู่จนกว่าจะโหลดหน้าใหม่ ยังไม่ถูกเก็บถาวร</p>'+
    '</section>'+
    '<div id="formPaper" class="paper">'+
      '<div class="pp-formno">พพ. 1-1</div>'+
      '<div class="pp-logo no-print">(ตราโรงเรียน)</div>'+
      '<h2 class="pp-title">แบบบันทึกการขอแลกเปลี่ยนคาบสอน/มอบหมายหน้าที่</h2>'+
      '<p class="pp-center">วันที่ <input class="fin w2" id="hdrDay"> เดือน <input class="fin w5" id="hdrMon"> พ.ศ. <input class="fin w3" id="hdrYear"></p>'+
      '<p class="pp-line"><b>เรื่อง</b>&nbsp;&nbsp;ขออนุญาตแลกเปลี่ยนคาบสอน/มอบหมายหน้าที่</p>'+
      '<p class="pp-line"><b>เรียน</b>&nbsp;&nbsp;ผู้อำนวยการโรงเรียนพิษณุโลกพิทยาคม</p>'+
      '<p class="pp-body">&emsp;เนื่องด้วยข้าพเจ้า <input class="fin w-name" id="reqName" data-inp="fmName"> '+
        'ตำแหน่ง <input class="fin w6" id="reqPos"> สังกัดกลุ่มสาระการเรียนรู้ <input class="fin w7" id="reqDept"> '+
        'มีความจำเป็น <textarea class="fin-reason" id="reqReason" rows="1" wrap="soft" data-inp="fmReason"></textarea> '+
        'จึงขอแลกเปลี่ยนคาบสอนและมอบหมายงานอื่น ๆ <span id="bodyDates"></span> '+
        'ระหว่างเวลา <input class="fin w3" id="reqT1"> น. ถึง <input class="fin w3" id="reqT2"> น. ดังนี้</p>'+
      '<p class="pp-sec"><b>1. งานสอน</b>&emsp;<span id="noClassBox">&#9744;</span> ไม่มีคาบสอน&emsp;'+
        '<span id="hasClassBox">&#9744;</span> มีคาบสอน <span id="periodCount" class="cnt"></span> คาบ แลกเปลี่ยนคาบดังนี้</p>'+
      tableShell()+
      '<p class="pp-sec"><b>2. งานหน้าที่อื่น ๆ</b></p>'+
      '<p class="pp-line">โฮมรูม ชั้น ม.<input class="fin w2" id="hrClass">/<input class="fin w2" id="hrRoom">&emsp;<span class="ck" data-act="fmCk" data-g="hr">&#9746;</span> ไม่มี&emsp;<span class="ck" data-act="fmCk" data-g="hr">&#9744;</span> มี มอบหมายให้ <input class="fin w8"> ผู้รับมอบ <input class="fin w4"></p>'+
      '<p class="pp-line">เวรประจำวัน&emsp;<span class="ck" data-act="fmCk" data-g="du">&#9746;</span> ไม่มี&emsp;<span class="ck" data-act="fmCk" data-g="du">&#9744;</span> มี มอบหมายให้ <input class="fin w8"> ผู้รับมอบ <input class="fin w4"></p>'+
      '<p class="pp-line">การประชุม&emsp;<span class="ck" data-act="fmCk" data-g="mt">&#9746;</span> ไม่มี&emsp;<span class="ck" data-act="fmCk" data-g="mt">&#9744;</span> มี มอบหมายให้ <input class="fin w8"> ผู้รับมอบ <input class="fin w4"></p>'+
      '<p class="pp-line">&emsp;จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต</p>'+
      '<p class="pp-sign">ลงชื่อ ............................................ ผู้ขออนุญาต</p>'+
      '<p class="pp-sign">( <input class="fin w-name2" id="signName"> )</p>'+
      '<div class="pp-approve"><table class="approve-tbl"><tbody>'+
        '<tr><td>ความเห็นหัวหน้ากลุ่มสาระการเรียนรู้ฯ<br>.............................................................<br><br>ลงชื่อ ...................................<br>( <input class="fin-appr"> )<br>หัวหน้ากลุ่มสาระ <input class="fin-appr fin-appr-dept"><br>........./.................../...........</td>'+
            '<td>ความเห็นผู้ช่วยผู้อำนวยการกลุ่มวิชาการ<br>.............................................................<br><br>ลงชื่อ ...................................<br>( <input class="fin-appr"> )<br>........./.................../...........</td></tr>'+
        '<tr><td>ความเห็นรองผู้อำนวยการกลุ่มวิชาการ<br>.............................................................<br><br>( <input class="fin-appr"> )<br>........./.................../...........</td>'+
            '<td>ความเห็นผู้อำนวยการโรงเรียน<br>&#9744; อนุญาต&emsp;&#9744; ไม่อนุญาต&emsp;&#9744; อื่น ๆ ............<br><br>ลงชื่อ ...................................<br>( <input class="fin-appr"> )<br>ผู้อำนวยการโรงเรียนพิษณุโลกพิทยาคม</td></tr>'+
      '</tbody></table></div>'+
    '</div>';
    var t=_bd(S.todayISO());
    $('hdrDay').value=t.d; $('hdrMon').value=TH_MON[t.m-1]; $('hdrYear').value=t.y;
    fm.built=true;
  }
  function setTeacher(tid){
    fm.tid=tid; fm.off={};
    var nm=A.tName(tid), rn=$('reqName'), sn=$('signName');
    if(!rn.value || rn.value===fm.autoName) rn.value=nm;
    if(!sn.value || sn.value===fm.autoName) sn.value=nm;
    fm.autoName=nm;
  }
  function setRange(a,b){ $('formFrom').value=a; $('formTo').value=b; }
  function defaultRange(){
    var t=S.todayISO(), ds=A.live().filter(function(e){ return e.me_id===fm.tid; }).map(function(e){ return String(e.date_absent).slice(0,10); }).sort();
    var pick=ds.filter(function(d){ return d>=t; })[0] || ds[ds.length-1] || t;
    var f=S.leaveRoundFor(fm.tid, pick);
    if(f){ var days=f.round.days.map(function(d){ return d.date; }).sort(); setRange(days[0], days[days.length-1]); }
    else setRange(pick, pick);
  }
  function refresh(){
    $('formAudit').innerHTML=A.auditHTML({collisionsOnly:true});
    $('formWho').innerHTML=A.whoButton(fm.tid,'fmPick','ผู้ขอ');
    var rounds=A.myRounds(fm.tid);
    $('formRoundWrap').innerHTML=rounds.length?'<select class="sel" data-chg="fmRound" aria-label="รอบการลา"><option value="">เลือกช่วงจากรอบการลา…</option>'+
      rounds.map(function(r){ return '<option value="'+h(r.id)+'">รอบ '+h(A.roundSpan(r))+(r.note?' · '+h(r.note):'')+'</option>'; }).join('')+'</select>':'';
    var rows=formSwaps(), host=$('formSwapList');
    host.innerHTML=rows.length?'<p class="lab">รายการที่จะใส่ในแบบฟอร์ม (ติ๊กออกเพื่อไม่รวม)</p>'+rows.map(function(e){
      return '<label class="check fsw-item"><input type="checkbox" data-chg="fmTick" data-id="'+h(e.id)+'"'+(fm.off[e.id]?'':' checked')+'> '+
        '<span>'+h(A.dMid(e.date_absent))+' คาบ '+h(e.per_give)+' · '+h(e.subject_give)+' '+h(A.cls(e.group_give))+' ↔ '+h(S.stripTitle(e.y_name))+
        (S.isSubOnly(e)?' (สอนแทน ไม่รับคืน)':' · คืน '+h(A.dMid(e.date_back))+' คาบ '+h(e.per_back))+'</span> '+A.chip(e.status)+'</label>'; }).join('')
      :'<p class="empty">ไม่มีรายการของครูคนนี้ในช่วงวันที่และสถานะที่เลือก</p>';
    table();
  }
  function table(){
    var rows=formChecked(), body=$('formTableBody'), html='';
    for(var i=0;i<Math.max(rows.length,5);i++){
      var e=rows[i];
      if(e) html+='<tr><td class="c-num">'+(i+1)+'.</td><td>'+h(S.beShort2(e.date_absent))+'</td><td>'+h(e.per_give)+'</td><td>'+h(S.groupToClass(e.group_give))+'</td><td>'+h(e.subject_give||'')+'</td><td>'+h(e.room_give||'')+'</td>'+
        (S.isSubOnly(e)?'<td></td><td></td><td></td><td></td>':'<td>'+h(S.beShort2(e.date_back))+'</td><td>'+h(e.per_back)+'</td><td>'+h(e.y_sub||'')+'</td><td>'+h(e.room_back||e.y_room||'')+'</td>')+
        '<td>'+h(S.stripTitle(e.y_name))+'</td><td></td></tr>';
      else html+='<tr><td class="c-num">'+(i+1)+'.</td>'+Array(12).join('<td></td>')+'</tr>';
    }
    body.innerHTML=html;
    var dates=rows.map(function(e){ return String(e.date_absent).slice(0,10); }).sort(), d1=dates[0], d2=dates[dates.length-1], span=$('bodyDates');
    if(!d1) span.innerHTML='ในวันที่ <input class="fin w2"> เดือน <input class="fin w5"> พ.ศ. <input class="fin w3">';
    else if(d1===d2){ var b=_bd(d1); span.textContent='ในวันที่ '+b.d+' เดือน '+TH_MON[b.m-1]+' พ.ศ. '+b.y; }
    else { var x=_bd(d1), y=_bd(d2); span.textContent='ระหว่างวันที่ '+x.d+' เดือน '+TH_MON[x.m-1]+' พ.ศ. '+x.y+' ถึงวันที่ '+y.d+' เดือน '+TH_MON[y.m-1]+' พ.ศ. '+y.y; }
    $('periodCount').textContent=rows.length||'';
    $('noClassBox').innerHTML=rows.length?'&#9744;':'&#9746;'; $('hasClassBox').innerHTML=rows.length?'&#9746;':'&#9744;';
    var pend=rows.filter(function(e){ return e.status!=='อนุมัติแล้ว'; }).length;
    $('formHint').textContent = rows.length ? (rows.length+' รายการ'+(pend?' · '+pend+' รายการยังไม่อนุมัติ (ใช้ยื่นขออนุญาตได้)':'')) : 'ยังไม่มีรายการ — ถ้าพิมพ์ตอนนี้จะได้ใบเปล่าที่ทำเครื่องหมาย “ไม่มีคาบสอน”';
    $('formPrint').innerHTML=icon('print')+(rows.length?'พิมพ์ / บันทึก PDF':'พิมพ์ใบเปล่า');
    $('formPrint').className='btn '+(rows.length?'btn-primary':'');
    var fn='ใบแลกคาบ', nm=S.stripTitle($('reqName').value||A.tName(fm.tid));
    if(nm) fn+='_'+nm;
    if(d1) fn+=(d1===d2)?('_ลา'+S.fnTag(d1)):(_bd(d1).m===_bd(d2).m?('_ลา'+_bd(d1).d+'-'+S.fnTag(d2)):('_ลา'+S.fnTag(d1)+'-'+S.fnTag(d2)));
    document.title=fn;
    grow();
  }
  function grow(){ var r=$('reqReason'); if(!r||!r.offsetParent) return; r.style.height='auto'; var sh=r.scrollHeight; if(sh>8) r.style.height=sh+'px'; }
  A.pages.form={
    render:function(host, args){
      var sem=A.sem();
      if(!sem){ host.innerHTML='<header class="page-head"><div><h1>ใบขอแลกคาบ</h1></div></header><p class="empty">ยังไม่มีภาคเรียน — เริ่มที่ <a href="#data">ข้อมูลและตั้งค่า</a></p>'; fm.built=false; return; }
      A.ensureContext();
      if(!fm.built || !$('formPaper')) build(host);
      var ak=args.join('/'), fresh=false;
      if(ak && ak!==fm.args){
        fm.args=ak;
        if(A.teacher(args[0])){ setTeacher(args[0]); fresh=true; }
        var r=args[1]?A.roundById(args[1]):null;
        if(r){ var days=r.days.map(function(d){ return d.date; }).sort(); setRange(days[0], days[days.length-1]); fresh=false; }
      }
      if(!fm.tid || !A.teacher(fm.tid)){ setTeacher(ui.meId || (A.teachers()[0]||{}).id || ''); fresh=true; }
      if(fresh || !$('formFrom').value) defaultRange();
      refresh();
    }
  };
  A.acts.fmPick=function(){ A.pickTeacher(fm.tid, function(id){ setTeacher(id); defaultRange(); refresh(); }, {title:'ผู้ขอแลกคาบ'}); };
  A.chgs.fmRange=function(){ refresh(); };
  A.chgs.fmInc=function(el){ fm.inc[el.value]=el.checked; refresh(); };
  A.chgs.fmTick=function(el){ fm.off[el.getAttribute('data-id')]=!el.checked; table(); };
  A.chgs.fmRound=function(el){ var r=A.roundById(el.value); if(!r) return; var days=r.days.map(function(d){ return d.date; }).sort(); setRange(days[0], days[days.length-1]); refresh(); };
  A.inps.fmName=function(){ table(); };
  A.inps.fmReason=grow;
  A.acts.fmCk=function(el){
    document.querySelectorAll('#formPaper .ck[data-g="'+el.getAttribute('data-g')+'"]').forEach(function(o){ o.innerHTML=(o===el)?'&#9746;':'&#9744;'; });
  };
  A.acts.fmCopy=function(){
    var tbl=document.querySelector('#formPaper .swap-form-table'); if(!tbl) return;
    function done(ok){ A.toast(ok?'คัดลอกตารางแล้ว — วางใน Word ได้เลย':'คัดลอกไม่สำเร็จ ลองใช้พิมพ์ / บันทึก PDF แทน', {bad:!ok}); }
    var htmlP='<meta charset="utf-8"><table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse">'+tbl.innerHTML+'</table>';
    var tsv=[]; tbl.querySelectorAll('tr').forEach(function(tr){ var c=[]; tr.querySelectorAll('th,td').forEach(function(x){ c.push(String(x.textContent||'').replace(/\n/g,' ').trim()); }); tsv.push(c.join('\t')); });
    function legacy(){ var d=document.createElement('div'); d.style.cssText='position:fixed;left:-9999px'; d.contentEditable='true'; d.innerHTML=htmlP; document.body.appendChild(d);
      var ok=false; try{ var r=document.createRange(); r.selectNodeContents(d); var s=getSelection(); s.removeAllRanges(); s.addRange(r); ok=document.execCommand('copy'); s.removeAllRanges(); }catch(_){}
      document.body.removeChild(d); done(ok); }
    if(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write){
      try{ navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([htmlP],{type:'text/html'}),'text/plain':new Blob([tsv.join('\n')],{type:'text/plain'})})]).then(function(){ done(true); }, legacy); return; }catch(_){}
    }
    legacy();
  };
})();
