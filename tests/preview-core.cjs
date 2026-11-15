// Headless check of preview/js/core.js: oracle self-test, ledger suite, compact
// storage round-trip. Optional arg: a backup .json (private; never committed).
//   node tests/preview-core.cjs [private/swap_backup_….json]
const fs=require('fs'), path=require('path'), vm=require('vm');
const P=path.join(__dirname,'..','preview');
const mem={};
const ctx={console, Date, JSON, Math, setTimeout,
  localStorage:{getItem:k=>(k in mem?mem[k]:null), setItem:(k,v)=>{mem[k]=String(v);}, removeItem:k=>{delete mem[k];}},
  document:{getElementById:()=>null}};
ctx.window=ctx; vm.createContext(ctx);
for(const f of ['assets/selftest-fixture.js','js/core.js']) vm.runInContext(fs.readFileSync(path.join(P,f),'utf8'),ctx,{filename:f});
const S=ctx.SWAP; let fail=0;
function ok(name,cond,extra){ console.log((cond?'  ✅ ':'  ❌ ')+name+(cond||!extra?'':'  → '+extra)); if(!cond) fail++; }

const st=S.runSelfTest(); ok('oracle self-test '+st.passed+'/'+st.total+' ('+st.fields+' ค่า)', st.ok&&st.allGreen, JSON.stringify(st.cases.filter(c=>!c.ok).slice(0,3)));
const lt=S.runLedgerTests(); ok('ledger suite '+lt.passed+'/'+lt.total, lt.allGreen, JSON.stringify(lt.cases.filter(c=>!c.ok)));

// golden search (BLUEPRINT): top-5 = 104/103/89/87/74
const F=ctx.__SWAP_FIXTURE__, g=F.searches.filter(s=>/golden/.test(s.id))[0];
if(g){ const rows=F.mini_dataset.rows.map(r=>Object.assign({},r)); const cfg=Object.assign(S.cloneSettings(S.DEFAULT_SETTINGS),F.config||{});
  S.deriveRows(rows,cfg); const r=new S.Engine(rows,cfg,[]).search(g.me,g.day1,String(g.period1));
  ok('golden top-5 = '+r.candidates.slice(0,5).map(c=>c.SCORE).join('/'), r.candidates.slice(0,5).map(c=>c.SCORE).join('/')==='104/103/89/87/74'); }

// codec round-trip on synthetic edge cases
const syn={schemaVersion:1,activeSemester:'x',settings:{},semesters:{x:{meta:{label:'x'},log:[],leaves:[],phones:{},schedule:[
  {teacher_id:'0001',teacher_name:'ครูทดสอบ 001',day:'จันทร์',period:'1',subject:'ค1',group:'1.1',room:'111',raw_cell:'ค11.1111',status:'VERIFIED',audit_note:''},
  {teacher_id:'0001',teacher_name:'ครูทดสอบ 001',day:'จันทร์',period:'2',subject:'ค1',group:'1.1',room:'111',raw_cell:'ต่างจากเดิม',status:'MANUAL',audit_note:'n',extra:5},
  {teacher_id:'0002',teacher_name:'ครูทดสอบ 002',day:'ศุกร์',period:'9',subject:'',group:'',room:'ประชุม',status:'NON_TEACHING'}]}}};
const lean=o=>JSON.stringify(JSON.parse(JSON.stringify(o,S.leanReplacer)));
ok('codec round-trip (synthetic, absent/extra/non-string fields)', lean(S.CODEC.decode(S.CODEC.encode(syn)))===lean(syn));
ok('codec reads plain JSON', lean(S.CODEC.decode(JSON.stringify(syn)))===lean(syn));

const bk=process.argv[2];
if(bk){ const d=JSON.parse(fs.readFileSync(bk,'utf8')); const plain=lean(d), enc=S.CODEC.encode(d);
  ok('codec round-trip (real backup) — '+plain.length+' → '+enc.length+' ตัวอักษร ('+Math.round(100-enc.length*100/plain.length)+'% เล็กลง)', lean(S.CODEC.decode(enc))===plain);
  // field ORDER must survive too, so a re-exported backup is byte-identical
  ok('backup re-export byte-identical', JSON.stringify(S.CODEC.decode(enc),S.leanReplacer,2)===JSON.stringify(d,S.leanReplacer,2));
  const r=S.STORE.restoreFromObject(JSON.parse(JSON.stringify(d))); ok('restore into preview store', r.ok, r.error);
  S.STORE.load(); ok('reload from compact store keeps '+Object.keys(S.STORE.data.semesters).length+' ภาคเรียน', !S.STORE.loadError && S.STORE.data.activeSemester===d.activeSemester);
  for(const l in S.STORE.data.semesters) S.ensureSemesterDerived(S.STORE.data.semesters[l], S.STORE.data.settings);
  const eng=S.engineForActive(), T=S.teacherList(); let n=0, cands=0;
  for(const t of T.slice(0,25)) for(let p=1;p<=9;p++){ const r2=eng.search(t.id,'พุธ',String(p),{dateAbsent:'2026-11-18',preference:'อนาคต',dateProposed:'2026-11-16'}); if(r2.valid==='VALID'){ n++; cands+=r2.candidates.length; } }
  ok('real-data dated searches run ('+n+' คาบ, '+cands+' คู่)', n>0 && cands>0);
}
console.log(fail?('\nFAILED '+fail):'\nALL PASS'); process.exit(fail?1:0);
