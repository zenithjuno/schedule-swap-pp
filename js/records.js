/* หน้า “รายการแลกคาบ” (the register, grouped by partner) and
   “ตารางไปคุย” (the communication packet: both teachers' full-week tables,
   before/after, as a clearly-labelled simulation until approved). */
(function(){
  'use strict';
  var A=window.APP, S=A.S, h=A.h, ui=A.ui, icon=A.icon;
  var ls=A.ls={who:'me', st:'open'};
  var pv=A.pv={after:true, past:false, key:''};

  function inScope(e){ return ls.who!=='me' || !ui.meId || e.me_id===ui.meId || e.y_id===ui.meId; }
  function matchSt(e, st){
    if(st==='all') return true;
    if(st==='open') return e.status!=='ยกเลิก' && !S.isFinished(e);
    return e.status===st;
  }
  function pairKey(e){ return e.me_id+'→'+A.partnerKey(e); }
  function packetHref(e){ return '#packet/'+encodeURIComponent(e.me_id)+'/'+encodeURIComponent(A.partnerKey(e)); }

  A.pages.list={
    render:function(){
      var sem=A.sem();
      if(!sem) return '<header class="page-head"><div><h1>รายการแลกคาบ</h1></div></header><p class="empty">ยังไม่มีภาคเรียน — เริ่มที่ <a href="#data">ข้อมูลและตั้งค่า</a></p>';
      A.ensureContext();
      var all=S.logEntries().filter(inScope), ro=A.readOnly();
      var cnt={open:0,'เสนอ':0,'รออนุมัติ':0,'อนุมัติแล้ว':0,'ยกเลิก':0,all:all.length};
      all.forEach(function(e){ if(cnt[e.status]!=null) cnt[e.status]++; if(matchSt(e,'open')) cnt.open++; });
      var rows=all.filter(function(e){ return matchSt(e, ls.st); });
      var bad={}; S.auditActive().collisions.forEach(function(c){ c.entries.forEach(function(e){ bad[e.id]=1; }); });

      var groups=[], idx={};
      rows.forEach(function(e){ var k=pairKey(e); if(!idx[k]){ idx[k]={key:k, first:e, items:[]}; groups.push(idx[k]); } idx[k].items.push(e); });
      var body=groups.map(function(g){
        var f=g.first, ph=f.y_id?(S.phoneFor(f.y_id)||f.y_phone):'';
        return '<article class="pair"><header class="pair-h"><div><h3>'+h(f.me_name||f.me_id)+' <span class="arrow">'+icon('swap')+'</span> '+h(A.partnerLabel(f))+
            (S.isExternalSub(f)?' <span class="tag">นอกระบบ</span>':'')+'</h3>'+
          '<p class="muted">'+g.items.length+' รายการ'+(f.y_id?' · '+A.phoneLink(ph):(f.y_note?' · '+h(f.y_note):''))+'</p></div>'+
          '<a class="btn btn-sm" href="'+packetHref(f)+'">'+icon('eye')+'ตารางไปคุย</a></header><ul class="ents">'+
          g.items.map(function(e){
            var note=(e.impact_tag && e.impact_tag!=='—')?'<span class="tag">'+h(A.humanWarn(e.impact_tag, e))+'</span>':'';
            if(bad[e.id]) note+='<span class="tag bad">สอนซ้อน</span>';
            if(S.isFinished(e)) note+='<span class="tag good">เสร็จสิ้น</span>';
            return '<li class="ent st-'+A.ST[e.status].c+'">'+
              '<div class="ent-a"><b>'+h(A.dMid(e.date_absent))+' · คาบ '+h(e.per_give)+'</b><span class="sub">'+h(e.subject_give||'')+' '+h(A.cls(e.group_give))+' · ห้อง '+h(e.room_give||'—')+'</span></div>'+
              '<div class="ent-b">'+(S.isSubOnly(e)?'<b>สอนแทน</b><span class="sub">ไม่มีการสอนคืน</span>'
                :'<b>สอนคืน '+h(A.dMid(e.date_back))+' · คาบ '+h(e.per_back)+'</b><span class="sub">'+h(e.y_sub||'')+' · ห้อง '+h(e.y_room||e.room_back||'—')+'</span>')+'</div>'+
              '<div class="ent-c">'+note+'</div>'+
              '<div class="ent-d">'+A.statusSelect(e)+(e.status==='เสนอ'&&!ro?'<button class="btn btn-sm btn-ghost" data-act="delEntry" data-id="'+h(e.id)+'" title="ลบข้อเสนอ" aria-label="ลบข้อเสนอ">'+icon('trash')+'</button>':'')+'</div></li>';
          }).join('')+'</ul></article>';
      }).join('');
      function fchip(k, label){ return '<button class="fchip'+(ls.st===k?' on':'')+'" data-act="lsSt" data-st="'+k+'">'+label+' <i>'+cnt[k]+'</i></button>'; }
      return '<header class="page-head"><div><h1>รายการแลกคาบ</h1><p>ข้อเสนอและรายการที่อนุมัติของภาคเรียนนี้ จัดกลุ่มตามคู่ครู</p></div>'+
          (ui.meId?A.whoButton(ui.meId,'pickMe','ครู'):'')+'</header>'+
        A.auditHTML({link:false})+
        (ro?'<div class="banner info"><div>'+h(S.readOnlyText())+'</div></div>':'')+
        '<div class="tools"><div class="seg"><label><input type="radio" name="lsWho" value="me" data-chg="lsWho"'+(ls.who==='me'?' checked':'')+'><span>ที่เกี่ยวกับครูคนนี้</span></label>'+
          '<label><input type="radio" name="lsWho" value="all" data-chg="lsWho"'+(ls.who==='all'?' checked':'')+'><span>ทุกคน</span></label></div>'+
          '<div class="fchips">'+fchip('open','กำลังดำเนินการ')+fchip('เสนอ','เสนอ')+fchip('รออนุมัติ','รออนุมัติ')+fchip('อนุมัติแล้ว','อนุมัติแล้ว')+fchip('ยกเลิก','ยกเลิก')+fchip('all','ทั้งหมด')+'</div></div>'+
        (body||'<p class="empty">'+(all.length?'ไม่มีรายการตามตัวกรองนี้':'ยังไม่มีรายการ — เริ่มที่หน้า <a href="#plan">จัดคาบที่ลา</a> แล้วกด “หาคนแทน”')+'</p>')+
        '<p class="foot-note">ลบได้เฉพาะรายการที่ยัง “เสนอ” · รายการที่เลยขั้นเสนอแล้วให้เปลี่ยนเป็น “ยกเลิก” เพื่อคืนคาบ · “เสนอ” และ “รออนุมัติ” จองคาบไว้เช่นเดียวกับ “อนุมัติแล้ว”</p>';
    }
  };
  A.acts.lsSt=function(el){ ls.st=el.getAttribute('data-st'); A.rerender(); };
  A.chgs.lsWho=function(el){ ls.who=el.value; A.rerender(); };

  /* ───────── packet ───────── */
  function packetEntries(me, yk){
    return A.live().filter(function(e){
      return (e.me_id===me && A.partnerKey(e)===yk) || (yk.charAt(0)!=='~' && e.me_id===yk && e.y_id===me);
    }).sort(function(a,b){ return String(a.date_absent)<String(b.date_absent)?-1:(String(a.date_absent)>String(b.date_absent)?1:(+a.per_give)-(+b.per_give)); });
  }
  function summaryText(entries, title, anyDraft){
    var out=[title];
    entries.forEach(function(e,i){
      A.entryLines(e).forEach(function(l, j){ out.push((j===0?(i+1)+') ':'   ')+A.dMid(l.date)+' คาบ '+l.per+' — '+l.text+' ('+l.sub+')'); });
    });
    if(anyDraft) out.push('(ข้อเสนอ ยังไม่ได้รับอนุมัติ)');
    return out.join('\n');
  }
  var lastText='';
  A.pages.packet={
    nav:'list',
    render:function(args){
      var isDraft=(args[0]==='draft'), me, yk, entries, all;
      if(isDraft){
        if(!A.draft) return '<p class="empty">ไม่มีตัวอย่างที่กำลังดู — <a href="#plan">กลับไปหน้าแผน</a></p>';
        entries=all=[A.draft.entry]; me=A.draft.entry.me_id; yk=A.partnerKey(A.draft.entry);
      } else {
        me=args[0]||''; yk=args[1]||'';
        all=packetEntries(me, yk);
        if(pv.key!==me+'|'+yk){ pv.key=me+'|'+yk; pv.past=false; pv.after=true; }
        var t=S.todayISO(), up=all.filter(function(e){ return S.entryEndDate(e)>=t; });
        entries=(pv.past||!up.length)?all:up;
      }
      var back='<a class="backlink no-print" href="'+(isDraft?h(A.draft.back):'#list')+'">'+icon('back')+(isDraft?'กลับไปเลือกคู่':'รายการแลกคาบ')+'</a>';
      var yId=(yk.charAt(0)==='~')?'':yk, f=entries[0];
      var nameA=A.tName(me), nameB=yId?A.tName(yId):yk.slice(1);
      if(!entries.length) return back+'<header class="page-head"><div><h1>ตารางไปคุย</h1><p>'+h(nameA)+' ↔ '+h(nameB)+'</p></div></header><p class="empty">ไม่มีรายการที่ยังมีผลระหว่างครูสองคนนี้</p>';
      var anyDraft=entries.some(function(e){ return e.status!=='อนุมัติแล้ว'; }), ro=A.readOnly();
      var ids={}; entries.forEach(function(e){ ids[e.id]=1; });
      var base=A.log().filter(function(e){ return e.status==='อนุมัติแล้ว' && !ids[e.id]; });
      var overlay=pv.after?base.concat(entries):base;
      var weeks=A.weeksOf(entries);
      lastText=summaryText(entries, 'แลกคาบ: '+nameA+' ↔ '+nameB, anyDraft);

      var head=back+'<header class="page-head"><div><h1>ตารางไปคุย</h1><p><b>'+h(nameA)+'</b> ↔ <b>'+h(nameB)+'</b>'+
        (yId?' · '+A.phoneLink(S.phoneFor(yId)):(f.y_note?' · '+h(f.y_note):''))+'</p></div></header>';
      var banner='';
      if(isDraft) banner='<div class="banner info no-print"><div><b>ตัวอย่าง — ยังไม่ได้บันทึก</b><p>นี่คือตารางจำลองของตัวเลือกที่กำลังดู การเปิดดูไม่จองคาบและไม่เปลี่ยนสถานะใด ๆ</p></div>'+
        '<button class="btn btn-primary" data-act="draftSave"'+(ro?' disabled':'')+'>'+icon('check')+'บันทึกเป็นข้อเสนอ</button></div>';
      if(anyDraft) banner+='<div class="banner draft"><div><b>ข้อเสนอ — ยังไม่ได้รับอนุมัติ</b><p>ตารางด้านล่างเป็นตารางจำลองสำหรับใช้คุยตกลงกัน ยังไม่ใช่ตารางสอนจริง</p></div></div>';

      var sum='<section class="card"><h2 class="card-h">สรุปสิ่งที่เปลี่ยน</h2><ol class="pk-list">'+entries.map(function(e){
        var w=(e.warnings||[]).map(function(x){ return A.humanWarn(x, e); }).filter(Boolean);
        return '<li><div class="pk-lines">'+A.entryLines(e).map(function(l){
            return '<p><span class="when">'+h(A.dMid(l.date))+' · คาบ '+h(l.per)+'</span><b>'+h(l.text)+'</b> <span class="muted">'+h(l.sub)+'</span></p>'; }).join('')+
          (w.length?'<p class="pk-warn">'+icon('warn')+h(w.join(' · '))+'</p>':'')+'</div>'+
          '<div class="pk-st no-print">'+(isDraft?A.chip('เสนอ','<span class="muted">(ยังไม่บันทึก)</span>'):A.statusSelect(e)+
            (e.status==='เสนอ'&&!ro?'<button class="btn btn-sm btn-ghost" data-act="delEntry" data-id="'+h(e.id)+'" aria-label="ลบข้อเสนอ">'+icon('trash')+'</button>':''))+'</div>'+
          '<div class="pk-st print-only">'+h(e.status)+'</div></li>'; }).join('')+'</ol>';
      if(!isDraft && !ro){
        var nP=entries.filter(function(e){ return e.status==='เสนอ'; }).length, nW=entries.filter(function(e){ return e.status==='รออนุมัติ'; }).length;
        if(nP||nW) sum+='<div class="pk-bulk no-print">'+
          (nP?'<button class="btn btn-sm" data-act="pvBulk" data-from="เสนอ" data-to="รออนุมัติ">ครูปลายทางตกลงแล้ว → เปลี่ยน '+nP+' รายการเป็น “รออนุมัติ”</button>':'')+
          (nW?'<button class="btn btn-sm" data-act="pvBulk" data-from="รออนุมัติ" data-to="อนุมัติแล้ว">ได้รับอนุมัติแล้ว → เปลี่ยน '+nW+' รายการเป็น “อนุมัติแล้ว”</button>':'')+'</div>';
      }
      sum+='</section>';

      var tools='<div class="tools no-print"><div class="seg"><label><input type="radio" name="pvV" value="1" data-chg="pvView"'+(pv.after?' checked':'')+'><span>หลังแลก</span></label>'+
          '<label><input type="radio" name="pvV" value="0" data-chg="pvView"'+(!pv.after?' checked':'')+'><span>ก่อนแลก</span></label></div>'+
        (!isDraft && all.length!==entries.length || pv.past?'<label class="check"><input type="checkbox" data-chg="pvPast"'+(pv.past?' checked':'')+'> รวมรายการที่ผ่านไปแล้ว</label>':'')+
        '<span class="grow"></span><button class="btn btn-sm" data-act="pvCopy">'+icon('copy')+'คัดลอกข้อความสรุป</button>'+
        '<button class="btn btn-sm btn-primary" data-act="print">'+icon('print')+'พิมพ์ / บันทึก PDF</button></div>';
      var tables=weeks.map(function(w){
        return A.ttWeek(me, w, overlay, {quietEmpty:!pv.after})+(yId?A.ttWeek(yId, w, overlay, {quietEmpty:!pv.after}):'');
      }).join('');
      if(!yId) tables+='<p class="muted sm">ผู้สอนแทนนอกระบบไม่มีตารางสอนในโปรแกรม จึงแสดงเฉพาะตารางของผู้ลา</p>';
      return head+banner+sum+tools+(pv.after?'':'<p class="muted sm no-print">กำลังดูตาราง “ก่อนแลก” — ยังไม่รวมรายการชุดนี้</p>')+A.ttLegend+'<div class="tt-out-wrap">'+tables+'</div>';
    }
  };
  A.chgs.pvView=function(el){ pv.after=(el.value==='1'); A.rerender(); };
  A.chgs.pvPast=function(el){ pv.past=el.checked; A.rerender(); };
  A.acts.pvCopy=function(){
    function done(ok){ A.toast(ok?'คัดลอกข้อความสรุปแล้ว — วางใน LINE หรืออีเมลได้เลย':'คัดลอกไม่สำเร็จ', {bad:!ok}); }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(lastText).then(function(){ done(true); }, function(){ done(false); }); return; }
    var ta=document.createElement('textarea'); ta.value=lastText; ta.style.cssText='position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select();
    var ok=false; try{ ok=document.execCommand('copy'); }catch(_){} document.body.removeChild(ta); done(ok);
  };
  A.acts.pvBulk=function(el){
    var from=el.getAttribute('data-from'), to=el.getAttribute('data-to'), r=A.route.args;
    var list=packetEntries(r[0]||'', r[1]||'').filter(function(e){ return e.status===from; }), fail=[];
    list.forEach(function(e){ var x=A.setStatus(e.id, to); if(!x.ok) fail.push(x.error); });
    if(fail.length) A.tell('บางรายการเปลี่ยนสถานะไม่ได้', '<p>'+h(fail[0]).replace(/\n/g,'<br>')+'</p>');
    else A.toast('เปลี่ยน '+list.length+' รายการเป็น “'+to+'” แล้ว');
    A.rerender();
  };
  A.acts.draftSave=function(){
    if(!A.draft) return;
    var e=A.draft.entry, r=A.commitEntry(e);
    if(!r.ok){ A.tell('บันทึกไม่ได้', '<p>'+h(r.error)+'</p>'); return; }
    A.draft=null; A.toast('บันทึกข้อเสนอแล้ว');
    A.go('#packet/'+encodeURIComponent(e.me_id)+'/'+encodeURIComponent(A.partnerKey(e)));
  };
})();
