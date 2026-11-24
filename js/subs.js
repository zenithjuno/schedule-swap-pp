/* หน้า “จัดคนสอนแทนทั้งวัน” (#subs/<date>) — every period the absent teacher
   leaves that day on one screen; pick a substitute per period, save them all
   at once as proposals (สอนแทน ไม่ต้องคืน). Logic lives in js/modes.js
   (S.activeModes().planSubstitutes / S.commitMode('substitute')). */
(function(){
  'use strict';
  var A=window.APP, S=A.S, STORE=A.STORE, h=A.h, ui=A.ui, icon=A.icon;
  var sb={key:null, assign:{}, dept:'all', q:'', more:{}};
  var SHOW=5;

  // subject groups come from every subject a teacher teaches (S.deptSets in dynamic.js)
  function opts(){ return {}; }
  function request(date){
    var a={}; Object.keys(sb.assign).forEach(function(p){ if(sb.assign[p]) a[p]=sb.assign[p]; });
    return {teacherId:ui.meId, date:date, dateProposed:ui.dateProposed||S.todayISO(), assignments:a,
            scope:sb.dept==='all'?'all':(sb.dept==='lesson'?'lesson-department':'department'), department:(sb.dept!=='all'&&sb.dept!=='lesson')?sb.dept:undefined, query:sb.q, semesterLabel:(A.sem().meta||{}).label, recordLeave:false};
  }
  var ISSUE={
    'absent-teacher-booked':'ผู้ลามีนัดสอนแทน/สอนคืนในคาบนี้อยู่แล้ว',
    'invalid-substitute':'เลือกครูคนนี้ไม่ได้',
    'lesson-already-covered':'คาบนี้มีคนแทนอยู่แล้ว',
    'group-slot-conflict':'ห้องนี้มีการแลกคาบอื่นในเวลาเดียวกัน',
    'teacher-on-leave':'ครูคนนี้ลาในคาบนั้น',
    'teacher-booked':'ครูคนนี้มีนัดสอนแทน/สอนคืนในคาบนั้นแล้ว',
    'teacher-busy':'ครูคนนี้มีคาบสอนในเวลานั้น',
    'invalid-absence-period':'คาบที่ระบุว่าลาไม่ใช่คาบสอน'
  };
  function issueText(x){ return 'คาบ '+(x.period||'?')+': '+(ISSUE[x.code]||x.code)+(x.teacherId && x.code!=='absent-teacher-booked'?' ('+A.tName(x.teacherId)+')':''); }

  function candTags(c){
    var st=STORE.data.settings, t=[];
    if(c.familiarGroup) t.push('<span class="tag good">สอนห้องนี้อยู่แล้ว</span>');
    if(c.sameDept) t.push('<span class="tag good">กลุ่มสาระเดียวกัน</span>');
    if(c.meeting) t.push('<span class="tag info">ต้องงดประชุม</span>');
    if(c.lunch) t.push('<span class="tag warn">ตรงพักกลางวัน</span>');
    if(c.consecutive) t.push('<span class="tag warn">ติด '+c.dayAfter.run+' คาบ</span>');
    if(c.overload) t.push('<span class="tag warn">เกิน '+st.DAY_OVERLOAD_THRESHOLD+' คาบ/วัน</span>');
    return t.join('');
  }
  function scoreBadge(c){
    var st=STORE.data.settings, band=c.score>=+st.SCORE_COLOR_GREEN_MIN?'g':(c.score>=+st.SCORE_COLOR_YELLOW_MIN?'y':'r');
    var why=c.scoreParts.filter(function(x,i){ return i===0||x.value; }).map(function(x){ return x.label+' '+(x.value>=0&&x.label!=='คะแนนเริ่มต้น'?'+':'')+x.value; }).join(' · ');
    return '<span class="sb-s"><span class="score '+band+'" title="'+h(why)+'">'+c.score+'</span></span>';
  }
  function candRow(slot, c, picked){
    var p=slot.lesson.period, on=(picked===c.teacherId), ro=A.readOnly();
    return '<label class="sb-c'+(on?' on':'')+'"><input type="radio" name="sb_'+p+'" value="'+h(c.teacherId)+'" data-chg="sbPick" data-per="'+p+'"'+(on?' checked':'')+(ro?' disabled':'')+'>'+
      '<span class="sb-n"><b>'+h(c.teacherName)+'</b><span class="sub">'+h(c.teacherId)+'</span></span>'+
      '<span class="sb-l">วันนั้น '+c.dayBefore.count+' → <b>'+c.dayAfter.count+'</b> คาบ<span class="sub">สัปดาห์นี้ '+c.week.count+' → '+(c.week.count+1)+' คาบ</span></span>'+
      '<span class="sb-t">'+candTags(c)+'</span>'+scoreBadge(c)+'</label>';
  }
  function slotCard(slot){
    var L=slot.lesson, p=L.period, head='<div class="sb-h"><span class="slot-p">คาบ '+h(p)+'</span><span><b>'+h(L.subject||'—')+'</b> '+h(A.cls(L.group))+' <span class="muted">ห้อง '+h(L.room||'—')+'</span></span>';
    if(slot.state==='covered'){
      var e=slot.existing[0];
      return '<li class="sb-slot done">'+head+A.chip(e.status)+'</div>'+
        '<p class="sb-i">'+(S.isSubOnly(e)?'<b>'+h(A.partnerLabel(e))+'</b> สอนแทน':'แลกกับ <b>'+h(A.partnerLabel(e))+'</b> · สอนคืน '+h(A.dMid(e.date_back))+' คาบ '+h(e.per_back))+'</p></li>';
    }
    if(slot.state==='conflict')
      return '<li class="sb-slot bad">'+head+'<span class="chip st-todo">ชนกัน</span></div><p class="sb-i">'+icon('warn')+'ห้องนี้มีการแลกคาบอื่นในเวลาเดียวกัน — แก้ที่หน้ารายการก่อน</p></li>';
    var picked=sb.assign[p]||'', list=slot.candidates, more=!!sb.more[p];
    var chip=picked?'<span class="chip st-done">เลือกแล้ว</span>':'<span class="chip st-todo">ยังไม่มีคนแทน</span>';
    var rows=(more?list:list.slice(0,SHOW)).map(function(c){ return candRow(slot, c, picked); });
    // the picked teacher stays visible even when a filter or "show fewer" hides them
    if(picked && !(more?list:list.slice(0,SHOW)).some(function(c){ return c.teacherId===picked; })){
      var pc=list.filter(function(c){ return c.teacherId===picked; })[0];
      rows.unshift(pc?candRow(slot, pc, picked)
        :'<label class="sb-c on"><input type="radio" name="sb_'+p+'" checked data-chg="sbPick" data-per="'+p+'" value="'+h(picked)+'"><span class="sb-n"><b>'+h(A.tName(picked))+'</b><span class="sub">ไม่อยู่ในตัวกรองที่เลือก</span></span></label>');
    }
    var none='<label class="sb-c sb-none'+(picked?'':' on')+'"><input type="radio" name="sb_'+p+'" value="" data-chg="sbPick" data-per="'+p+'"'+(picked?'':' checked')+'><span class="sb-n">ยังไม่เลือก</span></label>';
    var tail=list.length>SHOW?'<button class="btn btn-sm btn-ghost" data-act="sbMore" data-per="'+p+'">'+(more?'แสดงน้อยลง':'ดูอีก '+(list.length-SHOW)+' คน')+'</button>':'';
    return '<li class="sb-slot">'+head+chip+'</div>'+
      (list.length||picked?'<div class="sb-list">'+rows.join('')+none+'</div>'+tail
        :'<p class="sb-i muted">ไม่มีครูว่างในคาบนี้'+(sb.dept!=='all'||sb.q?' ตามตัวกรองที่เลือก — เลือก “ทุกกลุ่มสาระ” หรือพิมพ์ชื่อครู':'')+'</p>')+'</li>';
  }

  A.pages.subs={
    nav:'plan',
    render:function(args){
      var date=args[0], back='<a class="backlink" href="#plan">'+icon('back')+'กลับไปแผน</a>';
      if(!A.eng() || !ui.meId || !date) return back+'<p class="empty">ยังไม่ได้เลือกผู้ลาหรือวันที่</p>';
      A.ensureContext();
      var key=ui.meId+'|'+date; if(sb.key!==key){ sb={key:key, assign:{}, dept:sb.dept, q:'', more:{}}; }
      var M=S.activeModes(opts()); if(!M) return back+'<p class="empty">ยังไม่มีข้อมูลภาคเรียน</p>';
      var plan=M.planSubstitutes(request(date)), meName=A.tName(ui.meId);
      var head=back+'<header class="page-head"><div><h1>จัดคนสอนแทนทั้งวัน <span class="h1-sub">'+h(A.dLong(date))+'</span></h1>'+
        '<p>ผู้ลา '+h(meName)+' · เลือกครูสอนแทนทีละคาบ แล้วบันทึกครั้งเดียว — ครูสอนแทนไม่ต้องรับคาบคืน</p></div></header>';
      if(!plan.slots && plan.code)
        return head+'<div class="banner warn">'+icon('warn')+'<div><b>จัดวันนี้ไม่ได้</b><p>'+h(plan.code==='date-excluded'?'วันนี้เป็นวันงดกิจกรรม':plan.code==='invalid-absence'?'วันที่อยู่นอกภาคเรียน หรือไม่ใช่วันจันทร์–ศุกร์':plan.code)+'</p></div></div>';
      var shown=plan.slots.filter(function(s){ return s.requested || s.state==='covered'; });
      var open=shown.filter(function(s){ return s.state==='uncovered' || s.state==='assigned'; });
      var nPick=plan.entries.length, ro=A.readOnly();
      var lv=plan.leave||{};
      var lds={}; plan.slots.forEach(function(s){ var d=S.deptOf(s.lesson.subject); if(d) lds[d]=1; });
      var one=Object.keys(lds).length===1?Object.keys(lds)[0]:null;
      var bar='<div class="sb-bar"><select class="sel" data-chg="sbDept" aria-label="กลุ่มสาระ">'+A.subDeptOptions(sb.dept, one, !one && Object.keys(lds).length>1)+'</select>'+
        '<input class="inp sb-q" type="search" placeholder="ค้นชื่อหรือรหัสครู (ค้นจากครูทุกคน)" value="'+h(sb.q)+'" data-chg="sbQ">'+
        '<span class="muted sm">ลา'+h(lv.mode||'')+' · '+shown.length+' คาบ · มีคนแทนแล้ว '+(shown.length-open.length)+'</span></div>';
      var issues=plan.issues||[];
      var warn=issues.length?'<div class="banner warn">'+icon('warn')+'<div><b>ต้องแก้ก่อนบันทึก</b><ul>'+issues.map(function(x){ return '<li>'+h(issueText(x))+'</li>'; }).join('')+'</ul></div></div>':'';
      var body=shown.length?'<ul class="sb-slots">'+shown.map(slotCard).join('')+'</ul>':'<p class="empty">วันนี้ไม่มีคาบที่ต้องหาคนแทน</p>';
      var save='<div class="sb-save"><span>เลือกแล้ว <b>'+nPick+'</b> จาก '+open.length+' คาบที่ยังไม่มีคนแทน</span>'+
        '<button class="btn btn-primary" data-act="sbSave"'+((!nPick||issues.length||ro)?' disabled':'')+'>'+icon('check')+'บันทึก '+nPick+' คาบเป็นข้อเสนอ</button>'+
        (ro?'<p class="hint">'+h(S.readOnlyText())+'</p>':'<p class="hint">บันทึกเป็นสถานะ “เสนอ” ไว้คุยกับครูสอนแทนก่อน คาบที่ยังไม่เลือกกลับมาเติมทีหลังได้</p>')+'</div>';
      var dm=plan.departmentMissing?'<p class="hint">ไม่ทราบกลุ่มสาระของผู้ลา — แสดงครูทุกคนแทน</p>':'';
      return head+bar+dm+warn+body+(open.length?save:'');
    }
  };

  A.chgs.sbPick=function(el){ sb.assign[el.getAttribute('data-per')]=el.value; A.rerender(); };
  A.chgs.sbDept=function(el){ sb.dept=el.value; A.rerender(); };
  A.chgs.sbQ=function(el){ sb.q=el.value; A.rerender(); };
  A.acts.sbMore=function(el){ var p=el.getAttribute('data-per'); sb.more[p]=!sb.more[p]; A.rerender(); };
  A.acts.sbSave=function(){
    var date=A.route.args[0], r=S.commitMode('substitute', request(date), opts());
    if(!r.ok){
      var msg=r.issues?r.issues.map(issueText).join(' · '):(r.error||ISSUE[r.code]||r.code);
      A.toast('บันทึกไม่สำเร็จ — '+msg,{bad:true}); A.rerender(); return;
    }
    A.toast('บันทึกข้อเสนอสอนแทนแล้ว '+r.entries.length+' คาบ');
    sb.assign={}; if(!ui.roundId) ui.date=date; A.go('#plan');
  };
})();
