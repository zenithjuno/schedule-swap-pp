// Effective-timetable scoring (js/dynamic.js).
//   node tests/preview-dynamic.cjs
// Expected values below are worked out BY HAND from the settings
// (BASE 100, weekly baseline 20, +1 per period under it, overload > 5 → −10,
// run ≥ 3 → −15, senior lunch = period 5), not taken from the code's output.
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=path.join(__dirname,'..');
const mem={}, ctx={console,Date,JSON,Math,setTimeout,
  localStorage:{getItem:k=>(k in mem?mem[k]:null),setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}},document:{getElementById:()=>null}};
ctx.window=ctx; vm.createContext(ctx);
for(const f of ['assets/selftest-fixture.js','js/core.js','js/dynamic.js']) vm.runInContext(fs.readFileSync(path.join(R,f),'utf8'),ctx,{filename:f});
const S=ctx.SWAP; let fail=0;
function ok(name,cond,extra){ console.log((cond?'  ✅ ':'  ❌ ')+name+(cond||extra==null?'':'  → '+extra)); if(!cond) fail++; }

// ── hand-built timetable ──────────────────────────────────────────────────
// Group 4.1 (senior, lunch p5). A teaches it Wed p3. B teaches it Mon p6 (B's only lesson).
// A is otherwise free on Mondays. Absence: Wed 2026-11-18; give-back on Mon 2026-11-23 (the NEXT week).
// Weekly term = B's load in the absence week (16–20 Nov) AFTER this swap: B gains Wed p3 there and
// loses Mon 23 p6 in the following week, so the absence week goes 1 → 2 → (20 − 2) × 1 = +18.
const settings=S.cloneSettings(S.DEFAULT_SETTINGS);
const row=(t,day,p,g,room)=>({teacher_id:t,teacher_name:'ครูทดสอบ '+t,day,period:String(p),subject:'ค'+g,group:g,room:room||'323',raw_cell:'',status:'VERIFIED',audit_note:''});
function mk(extraRows){ const rows=[row('A','พุธ',3,'4.1'),row('B','จันทร์',6,'4.1')].concat(extraRows||[]); S.deriveRows(rows,settings); return new S.Engine(rows,settings,[]); }
const entry=(o)=>Object.assign({id:'e'+Math.random(),status:'อนุมัติแล้ว',me_id:'A',me_name:'A',y_id:'X1',y_name:'X',day_give:'อังคาร',per_give:'1',date_absent:'2026-12-01',day_back:'จันทร์',per_back:'7',date_back:'2026-11-23',kind:'แลกคาบ'},o);
const OPTS={dateAbsent:'2026-11-18',preference:'อนาคต',dateProposed:'2026-11-16'};
function run(eng,log){
  const r=new S.Engine(eng.rows,settings,log).search('A','พุธ','3',OPTS);
  const c=r.candidates.filter(x=>x.Yid==='B')[0];
  const dyn=new S.Dyn(new S.Engine(eng.rows,settings,log),log,'A|2026-11-18|3');
  const p={me:'A',date1:'2026-11-18',per1:'3',lunchP:r.lunch_p};
  return {c,dyn,p,ev:dyn.eval(c,p,'2026-11-23',true), base:dyn.eval(c,p,'2026-11-23',false), eng:r};
}
const E=mk();

console.log('\n[1] no swaps yet → effective result equals the plain timetable');
let t=run(E,[]);
ok('give-back date is Mon 23 Nov', t.c.giveback_date==='2026-11-23', t.c.giveback_date);
// hand calc: B absence week after = 2 → +18 ; A Mon after = 1 period, run 1 ; B Wed after = 1, run 1 → no penalties ; walking 0
ok('score 118 (100 + 18)', t.ev.score===118, t.ev.score);
ok('B absence week 1 → 2', t.ev.yWeek.count===1 && t.ev.yWeek.after===2, JSON.stringify(t.ev.yWeek));
// A teaches Wed p3 every week, so 23–27 Nov already has 1 (Wed 25) → 2 with the make-up
ok('A give-back week (23–27 Nov) 1 → 2, reported only', t.ev.meWeek.start==='2026-11-23' && t.ev.meWeek.count===1 && t.ev.meWeek.after===2, JSON.stringify(t.ev.meWeek));
ok('A on Monday: 1 period, run 1', t.ev.after.me2.count===1 && t.ev.after.me2.run===1);
ok('equals plain scoring', t.ev.score===t.base.score);

console.log('\n[2] two periods already swapped onto that Monday (7, 8) → new period 6 makes a run of 3');
const piled=[entry({per_back:'7',y_id:'X1'}),entry({per_back:'8',y_id:'X2',per_give:'2'})];
t=run(E,piled);
// hand calc: A Monday after = 6,7,8 → 3 periods, run 3 ≥ 3 → one overrun → 118 − 15 = 103. plain timetable still says 118.
ok('A on Monday: 3 periods (was 2 before this swap)', t.ev.after.me2.count===3 && t.ev.before.me2.count===2, JSON.stringify(t.ev.after.me2));
ok('run of 3 detected', t.ev.after.me2.run===3);
ok('score 103 (118 − 15)', t.ev.score===103, t.ev.score);
ok('plain timetable unchanged (118)', t.base.score===118);
ok('flagged as extra load: +2 on Monday', t.ev.extra.me2===2, JSON.stringify(t.ev.extra));
ok('A\'s other days unaffected (give-up day extra 0)', t.ev.extra.me1===0);

console.log('\n[3] status matters the way the ledger says it does');
ok('ยกเลิก does not count', run(E,[entry({per_back:'7',status:'ยกเลิก'}),entry({per_back:'8',status:'ยกเลิก',per_give:'2'})]).ev.score===118);
ok('เสนอ counts (it reserves the slot)', run(E,piled.map(e=>Object.assign({},e,{status:'เสนอ'}))).ev.score===103);
ok('รออนุมัติ counts', run(E,piled.map(e=>Object.assign({},e,{status:'รออนุมัติ'}))).ev.score===103);

console.log('\n[4] an existing swap on the SAME give-up slot is ignored (we are replacing it)');
const own=entry({me_id:'A',date_absent:'2026-11-18',per_give:'3',per_back:'7',date_back:'2026-11-23',y_id:'X9'});
t=run(E,[own]);
ok('own slot not counted', t.ev.score===118, t.ev.score);

console.log('\n[5] a swap-in on a different date does not leak');
t=run(E,[entry({date_back:'2026-11-30',per_back:'7'}),entry({date_back:'2026-11-30',per_back:'8',per_give:'2'})]);
ok('other Monday has no effect', t.ev.score===118, t.ev.score);

console.log('\n[6] a day already full: 5 periods on Monday + this one = 6 > 5 → overload');
const full=[1,2,3,4,7].map((p,i)=>entry({per_back:String(p),per_give:String(i+1),y_id:'Y'+i}));   // 1,2,3,4 (run 4 — lunch is 5) and 7
t=run(E,full);
// Monday after = 1,2,3,4,6,7 = 6 periods (> 5) → overload 1 ; runs: 1-4 = 4 and 6-7 = 2 → run 4 ≥ 3 → overrun 1
ok('6 periods that Monday', t.ev.after.me2.count===6, t.ev.after.me2.count);
ok('overload 1 and overrun 1 → 118 − 10 − 15 = 93', t.ev.overload===1 && t.ev.overrun===1 && t.ev.score===93, JSON.stringify([t.ev.overload,t.ev.overrun,t.ev.score]));

console.log('\n[7] handing a class over frees that period for the run count');
// B handed their Monday p6... use A instead: A normally teaches Mon p7 (a base lesson), but gave it away on 23 Nov
const E2=mk([row('A','จันทร์',7,'4.2'),row('A','จันทร์',8,'4.2')]);
t=run(E2,[]);
ok('plain: A teaches 7,8 + new 6 → run 3, score 103', t.ev.score===103 && t.ev.after.me2.run===3, JSON.stringify([t.ev.score,t.ev.after.me2]));
const gaveAway=entry({me_id:'A',date_absent:'2026-11-23',per_give:'7',per_back:'',date_back:'',y_id:'Z1',kind:'สอนแทน'});
t=run(E2,[gaveAway]);
ok('after giving 7 away that day: A has 6,8 → run 1, score 118', t.ev.after.me2.run===1 && t.ev.score===118, JSON.stringify([t.ev.score,t.ev.after.me2]));

console.log('\n[9] weekly load of the covering teacher counts the real week (Mon 16 – Fri 20 Nov)');
// B already covers 3 periods on Tue 17 Nov → 4 that week before, 5 after this swap → (20 − 5) × 1 = +15 → 115.
const cover=(d,p,o)=>entry(Object.assign({me_id:'C',y_id:'B',date_absent:d,per_give:String(p),day_give:'อังคาร',date_back:'',per_back:'',day_back:'',kind:'สอนแทน'},o||{}));
t=run(E,[cover('2026-11-17',1),cover('2026-11-17',2),cover('2026-11-17',3)]);
ok('B teaches 4 that week (1 + 3 covers), 5 after', t.ev.yWeek.count===4 && t.ev.yWeek.extra===3 && t.ev.yWeek.after===5, JSON.stringify(t.ev.yWeek));
ok('score 115 (100 + 15)', t.ev.score===115, t.ev.score);
ok('covers in another week do not count', run(E,[cover('2026-11-24',1),cover('2026-11-24',2),cover('2026-11-24',3)]).ev.score===118);
ok('cancelled covers do not count', run(E,[cover('2026-11-17',1,{status:'ยกเลิก'})]).ev.score===118);
// B gave their only lesson of that week (Mon 16 p6) to someone else → 0 that week, 1 after → +19 → 119
t=run(E,[entry({me_id:'B',y_id:'Q',date_absent:'2026-11-16',per_give:'6',day_give:'จันทร์',date_back:'',per_back:'',day_back:'',kind:'สอนแทน'})]);
ok('B handed their week\'s lesson away → 0 → 1 periods, score 119', t.ev.yWeek.count===0 && t.ev.yWeek.after===1 && t.ev.score===119, JSON.stringify([t.ev.yWeek,t.ev.score]));

console.log('\n[10] give-back in the SAME week leaves both weekly loads unchanged');
// give back on Mon 16 Nov p6 (B's own lesson that week): B absence week 1 + 1 − 1 = 1 → +19 → 119, one more than next week's 118
t=run(E,[]); let same=t.dyn.eval(t.c,t.p,'2026-11-16',true);
ok('B week stays 1, score 119', same.yWeek.count===1 && same.yWeek.after===1 && same.score===119, JSON.stringify([same.yWeek,same.score]));
ok('A week (16–20 Nov) stays 1', same.meWeek.start==='2026-11-16' && same.meWeek.count===1 && same.meWeek.after===1, JSON.stringify(same.meWeek));
ok('same week beats next week by 1', same.score-t.ev.score===1);

console.log('\n[8] with an empty log it matches the engine on the oracle fixture (no clash cases)');
// day counts, runs and penalties are identical. The score differs only by the weekly term when the give-back
// is in another week: the engine counts the covering teacher's base week (Y_weekly), we count Y_weekly + 1.
const F=ctx.__SWAP_FIXTURE__, cfg=Object.assign(S.cloneSettings(S.DEFAULT_SETTINGS),F.config||{});
const frows=F.mini_dataset.rows.map(r=>Object.assign({},r)); S.deriveRows(frows,cfg);
let n=0,bad=0,nSame=0,nOther=0;
for(const sc of F.searches){
  const eng=new S.Engine(frows,cfg,[]); const r=eng.search(sc.me,sc.day1,String(sc.period1),{dateAbsent:sc.date_absent,preference:'อนาคต',dateProposed:sc.date_absent});
  if(r.valid!=='VALID') continue;
  const dyn=new S.Dyn(eng,[],null), p={me:sc.me,date1:sc.date_absent,per1:String(sc.period1),lunchP:r.lunch_p};
  const B=+cfg.WORKLOAD_WEEKLY_BASELINE, term=n=>n>B?-(n-B)*cfg.WORKLOAD_WEEKLY_PENALTY_PER_PERIOD:(n<B?(B-n)*cfg.WORKLOAD_WEEKLY_BONUS_PER_PERIOD:0);
  for(const c of r.candidates){
    if(c.giveback_date===sc.date_absent) continue;           // clash: the engine's own day split is not meaningful there
    const ev=dyn.eval(c,p,c.giveback_date,true); n++;
    const sameWk=S.ttWeekStart(c.giveback_date)===S.ttWeekStart(sc.date_absent); if(sameWk) nSame++; else nOther++;
    const want=c.SCORE+(sameWk?0:term(c.Y_weekly+1)-term(c.Y_weekly));
    if(ev.score!==want || ev.after.me1.count!==c.aMe_d1 || ev.after.me2.count!==c.aMe_d2 || ev.after.y1.count!==c.aY_d1 || ev.after.y2.count!==c.aY_d2 ||
       Math.max(ev.after.me1.run,ev.after.me2.run)!==Math.max(c.runMeD1,c.runMeD2) || ev.overload!==c.overload_n || ev.overrun!==c.overrun_n){ bad++; if(bad<4) console.log('     mismatch',sc.id,c.Yid,c.day2,c.per2,ev.score,c.SCORE); }
  }
}
ok('all '+n+' candidates agree with the engine ('+nSame+' same week, '+nOther+' other week)', n>0 && bad===0, bad+' differ');

console.log(fail?('\nFAILED '+fail):'\nALL PASS'); process.exit(fail?1:0);
