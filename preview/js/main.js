/* Preview UI — shell + boot. Loaded last. */
(function(){
  'use strict';
  var A=window.APP, S=A.S, STORE=A.STORE, h=A.h;
  A.pristine='<!DOCTYPE html>\n'+document.documentElement.outerHTML;   // untouched markup, for the ready-file export
  var TITLE=document.title;

  A.renderShell=function(){
    var sem=A.sem(), box=document.getElementById('sideFoot'), ds=S.daysSince(STORE.data.lastBackupAt), n=A.route.name;
    if(n!=='pick') document.body.classList.remove('det-open');
    if(n!=='form' && n!=='timetable') document.title=TITLE;
    document.body.classList.toggle('is-archived', !!(sem && sem.meta && sem.meta.archived));
    box.innerHTML=(sem
      ? '<span class="sem">ภาคเรียน '+h(sem.meta.label)+(sem.meta.archived?' <i>อ่านอย่างเดียว</i>':'')+'</span>'+
        '<span class="'+((ds==null||ds>30)?'stale':'')+'">สำรองล่าสุด: '+(ds==null?'ยังไม่เคย':(ds===0?'วันนี้':ds+' วันที่แล้ว'))+'</span>'
      : '<span class="sem">ยังไม่มีข้อมูล</span>')+
      '<a href="../">เปิดเว็บเดิม ↗</a>';
    var ro=document.getElementById('roBar');
    ro.hidden=!(sem && sem.meta && sem.meta.archived);
    if(!ro.hidden) ro.innerHTML='กำลังดูภาคเรียน '+h(sem.meta.label)+' ที่เก็บไว้ (อ่านอย่างเดียว) — <a href="#data/sem">สลับกลับภาคเรียนปัจจุบัน</a>เพื่อบันทึกหรือแก้ไข';
  };

  STORE.load();
  if(!STORE.loadError){ A.deriveMissing(); A.bootEmbedded(); }
  STORE.prevActiveRowCount=(function(){ var a=STORE.activeSemester(); return a&&a.schedule?a.schedule.length:null; })();
  try{ localStorage.setItem('swap_preview_last_open', new Date().toISOString()); }catch(_){}
  if(STORE.loadError && (!location.hash || location.hash==='#plan')) location.hash='#data';
  A.render();
})();
