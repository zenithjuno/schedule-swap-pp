#!/usr/bin/env node
/* Build the preview's logic core from the stable root index.html.
   The engine, ledger, store, import contract and leave model are copied
   VERBATIM by line range (root index.html is protected and never edited), then
   a short, explicit list of patches is applied. Also splits the heavy embedded
   assets (fonts, SheetJS, self-test fixture) into lazily loaded files.
     node tools/build-preview-core.cjs                                        */
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const lines=src.split('\n');
const L=(a,b)=>lines.slice(a-1,b).join('\n');
function expect(n, prefix){
  if(lines[n-1].trim().indexOf(prefix)!==0) throw new Error('line '+n+' expected "'+prefix+'" got "'+lines[n-1].trim().slice(0,60)+'"');
}
// [from, to, expected first-line prefix, title]
const CH=[
 [979,1084,'var CONTRACT','IMPORT CONTRACT (7 blockers)'],
 [1163,1239,'var KNOWN_ALPHA_ROOMS','WARNINGS + ซ่อมเสริม re-parse'],
 [1386,1390,'function esc','esc'],
 [1407,1470,'function _s','DERIVED FLAGS'],
 [1488,1517,'function Engine','ENGINE spine'],
 [1537,1759,'Engine.prototype.teacherLevels','ENGINE candidate generator + scoring'],
 [1774,1800,'var WEEK_SPAN','DATES'],
 [1817,1874,'Engine.prototype._applyDates','DATES post-pass'],
 [1894,2088,'function ledDate','OCCUPANCY LEDGER'],
 [2097,2182,'function _stEq','SELF-TEST'],
 [2194,2274,'function runLedgerTests','LEDGER SUITE'],
 [2279,2455,'var STORE_KEY','STORE'],
 [2473,2491,'function thaiDate','date/readonly helpers'],
 [2620,2646,'function normalisePhone','PHONES'],
 [2701,2747,'var NO_PHONE_TEXT','PHONE workbook'],
 [2815,2820,'function downloadSheet','downloadSheet'],
 [2834,2915,'function buildScheduleTemplate','schedule template'],
 [2929,2985,'var SETTINGS_META','SETTINGS META'],
 [3149,3204,'function teacherList','dashboard status'],
 [3580,3580,'function isExternalSub','isExternalSub'],
 [3605,3690,'var LEAVE_MODES','LEAVE ROUNDS'],
 [3823,3848,'function weekLabel','result helpers'],
 [4248,4275,'function todayISO','log helpers'],
 [4357,4377,'function findLogEntry','status gate'],
 [4522,4550,'function ttDate','timetable date helpers'],
 [4920,4932,'var TH_MON','form helpers'],
];
let body='';
for(const [a,b,p,t] of CH){ expect(a,p); body+='\n  /* ───── '+t+' — root index.html:'+a+'–'+b+' ───── */\n'+L(a,b)+'\n'; }

function patch(find, repl, label){
  const n=body.split(find).length-1;
  if(n!==1) throw new Error('patch "'+label+'" matched '+n+' times');
  body=body.replace(find, ()=>repl);
}
// P1 — preview keeps its own store, in the compact envelope
patch("var STORE_KEY = 'swapApp.v1';","var STORE_KEY = 'swapApp.preview.v1';",'store key');
patch("if(raw){ this.data = JSON.parse(raw); this._migrate(); }","if(raw){ this.data = CODEC.decode(raw); this._migrate(); }",'load decode');
patch("}catch(e){ this.data = emptyStore(); }\n      return this.data;","}catch(e){ this.loadError=(e&&e.message)||String(e); this.data = emptyStore(); }\n      return this.data;",'load error kept');
patch("try{ localStorage.setItem(STORE_KEY, JSON.stringify(this.data, leanReplacer)); return {ok:true}; }",
      "if(this.loadError) return {ok:false, error:'อ่านข้อมูลเดิมในเครื่องไม่สำเร็จ จึงไม่บันทึกทับ — '+this.loadError};\n      try{ localStorage.setItem(STORE_KEY, CODEC.encode(this.data)); return {ok:true}; }",'save encode');
patch("try{ return JSON.stringify(STORE.data, leanReplacer).length/1048576; }","try{ return CODEC.encode(STORE.data).length/1048576; }",'storage size');
// P2 — the oracle fixture is a lazily loaded file, not an inline island
patch(/function loadEmbeddedFixture\(\)\{[\s\S]*?\n  \}/.exec(body)[0],"function loadEmbeddedFixture(){ return window.__SWAP_FIXTURE__ || null; }",'fixture loader');
// P3 — docs/PLAN-fix-same-weekday-giveback.md: with real dates the give-back is a
// DIFFERENT calendar date even when the weekday matches, so nothing combines.
// The dateless oracle path (self-test) is untouched and stays 21/21.
patch("var yid=d.teacher_id, day2=d.day, sameDay=(day1===day2);","var yid=d.teacher_id, day2=d.day, sameDay=(day1===day2) && !(opts && opts.dateAbsent);",'same-weekday fix');

// P4 — the template's example row must not carry a real person's name
{ const re=/(ชื่อครูพร้อมคำนำหน้า เช่น )[^']+/g, n=(body.match(re)||[]).length;
  if(n!==1) throw new Error('patch "template example name" matched '+n+' times');
  body=body.replace(re, '$1นายตัวอย่าง นามสมมติ'); }

const codec=`
  /* ───── COMPACT STORAGE ENVELOPE (preview only; lossless) ─────
     v2: one string dictionary sorted by frequency, schedules flattened to a
     single int array (rows × columns), raw_cell elided when it equals
     subject+group+room. Reads v1 envelopes and plain JSON too. Backups,
     ready files and runtime objects stay ordinary schema-1 JSON. */
  var CODEC=(function(){
    var P1='SWAP-PREVIEW-TABLES-1:', P2='SWAP-PREVIEW-TABLES-2:';
    var own=Object.prototype.hasOwnProperty;
    var BASE=['teacher_id','teacher_name','day','period','subject','group','room','raw_cell','status','audit_note'];
    function rawSame(r){ return typeof r.raw_cell==='string' && r.raw_cell===String(r.subject)+String(r.group)+String(r.room)
      && typeof r.subject==='string' && typeof r.group==='string' && typeof r.room==='string'; }
    function encode(data){
      var packed=JSON.parse(JSON.stringify(data, leanReplacer)), freq=Object.create(null), sems=packed.semesters||{}, tables={};
      Object.keys(sems).forEach(function(label){
        var sch=sems[label].schedule; if(!Array.isArray(sch)) return;
        var cols=BASE.slice(), seen=Object.create(null); BASE.forEach(function(k){ seen[k]=1; });
        sch.forEach(function(r){ for(var k in r) if(own.call(r,k) && !seen[k]){ seen[k]=1; cols.push(k); } });
        tables[label]=cols;
        sch.forEach(function(r){ cols.forEach(function(k){
          if(!own.call(r,k) || typeof r[k]!=='string') return;
          if(k==='raw_cell' && rawSame(r)) return;
          freq[r[k]]=(freq[r[k]]||0)+1; }); });
      });
      var strings=Object.keys(freq).sort(function(a,b){ return freq[b]-freq[a] || (a<b?-1:1); }), ids=Object.create(null);
      strings.forEach(function(s,i){ ids[s]=i; });
      Object.keys(tables).forEach(function(label){
        var cols=tables[label], sch=sems[label].schedule, flat=[];
        sch.forEach(function(r){ cols.forEach(function(k){
          if(!own.call(r,k)) flat.push(-2);
          else if(typeof r[k]!=='string') flat.push([r[k]]);
          else if(k==='raw_cell' && rawSame(r)) flat.push(-1);
          else flat.push(ids[r[k]]); }); });
        sems[label].schedule={c:cols, n:sch.length, v:flat};
      });
      return P2+JSON.stringify({strings:strings, data:packed});
    }
    function decodeV2(env){
      var data=env.data, strings=env.strings;
      if(!data||!data.semesters||!Array.isArray(strings)) throw new Error('สำเนารุ่นทดลองมีรูปแบบไม่ถูกต้อง');
      Object.keys(data.semesters).forEach(function(label){
        var t=data.semesters[label].schedule;
        if(Array.isArray(t)) return;
        if(!t||!Array.isArray(t.c)||!Array.isArray(t.v)||t.v.length!==t.n*t.c.length) throw new Error('ตารางสำเนาไม่ครบ');
        var rows=[], w=t.c.length;
        for(var i=0;i<t.n;i++){
          var row={}, rawAt=-1;
          for(var j=0;j<w;j++){
            var v=t.v[i*w+j], k=t.c[j];
            if(v===-2) continue;
            if(v===-1){ rawAt=j; row[k]=''; continue; }   // placeholder keeps key order
            if(Array.isArray(v)){ row[k]=v[0]; continue; }
            if(typeof v!=='number'||v%1!==0||v<0||v>=strings.length) throw new Error('ข้อมูลสำเนาไม่ครบ');
            row[k]=strings[v];
          }
          if(rawAt>=0) row.raw_cell=row.subject+row.group+row.room;
          rows.push(row);
        }
        data.semesters[label].schedule=rows;
      });
      return data;
    }
    function decodeV1(env){
      var data=env.data, strings=env.strings;
      if(!data||!data.semesters||!Array.isArray(strings)) throw new Error('สำเนารุ่นทดลองมีรูปแบบไม่ถูกต้อง');
      Object.keys(data.semesters).forEach(function(label){
        var sem=data.semesters[label], table=sem.schedule;
        if(!table||!Array.isArray(table.columns)||!Array.isArray(table.rows)) throw new Error('ตารางสำเนาไม่ครบ');
        sem.schedule=table.rows.map(function(values){
          if(!Array.isArray(values)||values.length!==table.columns.length) throw new Error('แถวสำเนาไม่ครบ');
          var row={};
          values.forEach(function(value,i){
            if(value===null) return;
            if(Array.isArray(value)){ row[table.columns[i]]=value[0]; return; }
            if(typeof value!=='number'||value%1!==0||value<0||value>=strings.length) throw new Error('ข้อมูลสำเนาไม่ครบ');
            row[table.columns[i]]=strings[value];
          });
          return row;
        });
      });
      return data;
    }
    function decode(raw){
      if(raw.slice(0,P2.length)===P2) return decodeV2(JSON.parse(raw.slice(P2.length)));
      if(raw.slice(0,P1.length)===P1) return decodeV1(JSON.parse(raw.slice(P1.length)));
      return JSON.parse(raw);
    }
    return {encode:encode, decode:decode};
  })();
`;
const exportsList=`
  window.SWAP={
    CODEC:CODEC, STORE:STORE, STORE_KEY:STORE_KEY, Engine:Engine, engineForActive:engineForActive, esc:esc, _s:_s,
    CONTRACT:CONTRACT, DAYS:DAY_VOCAB, DAYN:THAI_DAYN, WEEK_SPAN:WEEK_SPAN,
    readVerifiedSheet:readVerifiedSheet, validateBlockers:validateBlockers, summarise:summarise,
    reparseSomserm:reparseSomserm, scanWarnings:scanWarnings, statusCounts:statusCounts,
    deriveRows:deriveRows, ensureSemesterDerived:ensureSemesterDerived, buildingOf:buildingOf,
    isoWeekday:isoWeekday, weekdayThai:weekdayThai, givebackDateISO:givebackDateISO, formatBE:formatBE,
    buildLedger:buildLedger, ledDate:ledDate, holdStrength:holdStrength, ledgerConflicts:ledgerConflicts,
    ledgerConflictText:ledgerConflictText, auditActive:function(){ return window.__SWAP_LEDGER__.auditActive(); },
    runSelfTest:runSelfTest, runLedgerTests:runLedgerTests,
    DEFAULT_SETTINGS:DEFAULT_SETTINGS, cloneSettings:cloneSettings, leanReplacer:leanReplacer, storageUsedMB:storageUsedMB,
    SETTINGS_META:SETTINGS_META, settingsDefaults:settingsDefaults,
    thaiDate:thaiDate, daysSince:daysSince, isReadOnly:isReadOnlySemester, readOnlyText:readOnlyText,
    normalisePhone:normalisePhone, displayPhone:displayPhone, phonebook:phonebook, phoneFor:phoneFor,
    phoneAgeText:phoneAgeText, phoneDateBE:phoneDateBE, phoneIsStale:phoneIsStale, NO_PHONE_TEXT:NO_PHONE_TEXT,
    parsePhoneWorkbook:parsePhoneWorkbook, downloadSheet:downloadSheet, buildScheduleTemplate:buildScheduleTemplate,
    teacherList:teacherList, logStatusFor:logStatusFor, dashStatus:dashStatus, isExternalSub:isExternalSub,
    LEAVE_MODES:LEAVE_MODES, leavesOf:leavesOf, leavePresetPeriods:leavePresetPeriods, leaveTeachingCount:leaveTeachingCount,
    leaveRoundFor:leaveRoundFor, leavePeriodsFor:leavePeriodsFor, leaveSetPeriods:leaveSetPeriods,
    leaveDatesBetween:leaveDatesBetween, leaveSaveRound:leaveSaveRound, leaveDeleteRound:leaveDeleteRound, leaveRoundLabel:leaveRoundLabel,
    weekLabel:weekLabel, compactItems:compactItems,
    todayISO:todayISO, beShort:beShort, entryEndDate:entryEndDate, isSubOnly:isSubOnly, isFinished:isFinished, logEntries:logEntries,
    findLogEntry:findLogEntry, statusChangeBlocked:statusChangeBlocked, bumpApprovalIfNeeded:bumpApprovalIfNeeded,
    ttAddDays:ttAddDays, ttWeekStart:ttWeekStart, ttWeekLabel:ttWeekLabel, ttDateForDay:ttDateForDay,
    TH_MON:TH_MON, _bd:_bd, beShort2:beShort2, fnTag:fnTag, stripTitle:stripTitle, groupToClass:groupToClass
  };
`;
const out='/* GENERATED by tools/build-preview-core.cjs from the stable root index.html — do not edit by hand.\n'+
'   Logic is verbatim; the only differences are the patches listed in the build script. */\n'+
'(function(){\n  "use strict";\n'+body+codec+exportsList+'})();\n';
fs.writeFileSync(path.join(ROOT,'preview/js/core.js'), out);

// ---- heavy assets, split out so the page itself stays small ----
expect(876,'<script>'); expect(900,'</script>');
fs.writeFileSync(path.join(ROOT,'preview/assets/xlsx.js'), L(877,899)+'\n');
const fx=/^<script type="application\/json" id="oracle-fixture">([\s\S]*)<\/script>\s*$/.exec(lines[685]);
if(!fx) throw new Error('fixture island not found');
JSON.parse(fx[1]);
fs.writeFileSync(path.join(ROOT,'preview/assets/selftest-fixture.js'), 'window.__SWAP_FIXTURE__='+fx[1]+';\n');
[[10,'sarabun-400.woff2'],[11,'sarabun-700.woff2']].forEach(([n,name])=>{
  const m=/base64,([A-Za-z0-9+/=]+)\)/.exec(lines[n-1]); if(!m) throw new Error('font line '+n);
  fs.writeFileSync(path.join(ROOT,'preview/assets',name), Buffer.from(m[1],'base64'));
});
const sz=f=>(fs.statSync(path.join(ROOT,'preview',f)).size/1024).toFixed(0)+' KB';
['js/core.js','assets/xlsx.js','assets/selftest-fixture.js','assets/sarabun-400.woff2','assets/sarabun-700.woff2'].forEach(f=>console.log(f.padEnd(34),sz(f)));
