// S01: standalone browser checks. Install/use Playwright via SWAP_PLAYWRIGHT_MODULE.
// Uses the embedded anonymous fixture; SWAP_SOURCE_BACKUP may point to local data.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.SWAP_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'preview/index.html'), 'utf8');
const fixture = JSON.parse(original.match(/id="oracle-fixture">([\s\S]*?)<\/script>/)[1]);
const source = process.env.SWAP_SOURCE_BACKUP
  ? JSON.parse(fs.readFileSync(process.env.SWAP_SOURCE_BACKUP, 'utf8'))
  : {schemaVersion:1,activeSemester:'2569/1',semesters:{'2569/1':{
      meta:{label:'2569/1',startDate:'2026-05-01',endDate:'2026-10-01',archived:false},
      schedule:fixture.mini_dataset.rows,log:[],leaves:[],phones:{}
    }},settings:fixture.config,phonebook:{map:{}},lastBackupAt:'2026-01-01',approvedSinceBackup:0,noEmbed:false};
const raw = JSON.stringify(source);
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions++; }
function parseScripts(html) {
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!m[1].includes('application/json')) new vm.Script(m[2]);
  }
}
parseScripts(preview);
check(/id="embedded-data"><\/script>/.test(preview), 'published data island is empty');
check(!preview.includes("var STORE_KEY = 'swapApp.v1'"), 'preview store key is isolated');
check((preview.match(/id="previewBoot"/g)||[]).length===1, 'shell injected exactly once');
const server = http.createServer((req,res)=>{
  const body = req.url.startsWith('/preview') ? preview : original;
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});res.end(body);
});
(async()=>{
  let browser;
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const origin='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({headless:true,...(process.env.SWAP_CHROMIUM ? {executablePath:process.env.SWAP_CHROMIUM}:{})});
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    if(process.env.SWAP_QUOTA_BYTES) {
      // Reproduce a byte-counting browser with unrelated same-origin data.
      await context.addInitScript(limit=>{
        const set=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){
          let bytes=2*(String(k).length+String(v).length);
          for(let i=0;i<this.length;i++){const key=this.key(i);if(key!==String(k))bytes+=2*(key.length+this.getItem(key).length);}
          if(bytes>limit)throw new DOMException('storage full','QuotaExceededError');
          return set.call(this,k,v);
        };
      },Number(process.env.SWAP_QUOTA_BYTES));
    }
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin);
    await page.evaluate(raw=>localStorage.setItem('swapApp.v1',raw),raw);
    if(process.env.SWAP_QUOTA_BYTES)await page.evaluate(()=>localStorage.setItem('other-app-test','x'.repeat(200*1024)));
    await page.goto(origin+'/preview/');
    check(await page.locator('#previewShell').isVisible(),'experimental banner visible');
    check(await page.evaluate(()=>Object.keys(__SWAP_STORE__.data.semesters).length===0),'no automatic copying');
    await page.locator('#previewReview').click();
    check(await page.locator('#previewSummary').isVisible(),'source summary visible');
    check(await page.locator('#previewSummary').innerText().then(t=>t.includes(source.activeSemester)),'correct source semester');
    check(await page.evaluate(()=>localStorage.getItem('swapApp.v1'))===raw,'review does not write original');
    await Promise.all([page.waitForNavigation({timeout:5000}),page.locator('#previewCopy').click()]);
    const copied=await page.evaluate(()=>__SWAP_STORE__.data);
    check(await page.evaluate(()=>localStorage.getItem('swapApp.preview.v1').startsWith('SWAP-PREVIEW-TABLES-1:')),'compact storage active');
    check((await page.evaluate(()=>localStorage.getItem('swapApp.preview.v1').length))<raw.length,'compact store smaller than source');
    check(copied.activeSemester===source.activeSemester,'active semester preserved');
    check(Object.keys(copied.semesters).length===Object.keys(source.semesters).length,'all semesters preserved');
    check(Object.keys(copied.phonebook.map).length===Object.keys(source.phonebook.map).length,'phonebook copied');
    for(const label of Object.keys(source.semesters)) {
      check(copied.semesters[label].schedule.length===source.semesters[label].schedule.length,'all rows preserved');
      check(copied.semesters[label].log.length===source.semesters[label].log.length,'all log entries preserved');
      check(copied.semesters[label].leaves.length===(source.semesters[label].leaves||[]).length,'all leave rounds preserved');
      check(source.semesters[label].schedule.every((row,i)=>Object.keys(row).every(k=>JSON.stringify(row[k])===JSON.stringify(copied.semesters[label].schedule[i][k]))),'all original row values preserved');
    }
    check(await page.evaluate(()=>{
      const data={schemaVersion:1,semesters:{a:{schedule:[{s:'ไทย',zero:0,bool:false,nil:null,obj:{a:1},list:[1,'x']},{s:'ไทย',extra:''}]}}};
      const codec=__SWAP_PREVIEW_STORAGE__,actual=codec.decode(codec.encode(data));
      return JSON.stringify(actual)===JSON.stringify(data)&&JSON.stringify(codec.decode(JSON.stringify(data)))===JSON.stringify(data);
    }),'codec round-trip including missing fields, null, numbers, objects and old JSON');
    const backup=await page.evaluate(async()=>JSON.parse(await __SWAP_STORE__.backupBlob().text()));
    check(Array.isArray(backup.semesters[backup.activeSemester].schedule),'backup remains normal JSON with schedule arrays');
    check(await page.evaluate(data=>__SWAP_STORE__.restoreFromObject(data).ok,backup),'normal JSON backup restores into compact store');
    // Use a fresh context so old uncompressed data is not duplicated beside a large root store.
    const legacyContext=await browser.newContext();const legacy=await legacyContext.newPage();
    await legacy.goto(origin+'/preview/');
    await legacy.evaluate(raw=>localStorage.setItem('swapApp.preview.v1',raw),raw);
    await legacy.reload();
    check(await legacy.evaluate(()=>__SWAP_STORE__.data.activeSemester)===source.activeSemester,'existing plain JSON preview reopens');
    check(await legacy.evaluate(()=>localStorage.getItem('swapApp.preview.v1').startsWith('SWAP-PREVIEW-TABLES-1:')),'old preview converts on save');
    await legacyContext.close();
    check(Boolean(copied.previewCopy.copiedAt),'copy time recorded');
    check(copied.lastBackupAt===null,'preview backup reminder reset');
    const changed=await page.evaluate(()=>{
      const s=__SWAP_STORE__.activeSemester(),r=s.schedule.find(r=>r.subject);
      s.log.push({id:'s01-isolation',status:'เสนอ',kind:'สอนแทน',me_id:r.teacher_id,me_name:r.teacher_name,
        date_absent:'2026-11-11',day_give:'พุธ',per_give:'3',subject_give:r.subject,group_give:r.group,
        room_give:r.room,y_id:'',y_name:'S01 test',date_back:'',per_back:'',created_at:new Date().toISOString()});
      const ok=__SWAP_LOG__.setStatus('s01-isolation','อนุมัติแล้ว');return ok;
    });
    check(changed,'approval mutation uses app status path');
    check(await page.evaluate(()=>localStorage.getItem('swapApp.v1'))===raw,'preview approval does not write original');
    check(await page.evaluate(()=>__SWAP_PREVIEW_STORAGE__.decode(localStorage.getItem('swapApp.preview.v1')).semesters[__SWAP_STORE__.data.activeSemester].log.some(e=>e.id==='s01-isolation'&&e.status==='อนุมัติแล้ว')),'preview approval persists');
    await page.locator('#previewCopyPanel').evaluate(el=>el.open=true);
    await page.locator('#previewReview').click();
    check(await page.locator('#previewCopy').isHidden(),'copy cannot overwrite populated preview');
    const tests=await page.evaluate(()=>({oracle:__SWAP_SELFTEST__.run(),ledger:__SWAP_LEDGERTEST__.run()}));
    check(tests.oracle.allGreen,'embedded engine self-test');check(tests.ledger.allGreen,'embedded ledger self-test');
    console.log('Engine:',tests.oracle.passed+'/'+tests.oracle.total,'Ledger:',tests.ledger.passed+'/'+tests.ledger.total);
    const ready=await page.evaluate(()=>__SWAP_S23__.buildHTML());
    parseScripts(ready);
    check(ready.includes("var STORE_KEY = 'swapApp.preview.v1'"),'ready-file export retains isolated key');
    check(ready.includes('id="previewBoot"'),'ready-file export retains experimental shell');
    check(ready.includes('id="previewShell"'),'ready-file export retains banner');
    const exported=await context.newPage();
    await exported.goto(origin+'/preview/export-check');
    await exported.evaluate(html=>{document.open();document.write(html);document.close();},ready);
    check(await exported.locator('#previewShell').isVisible(),'exported edition boot succeeds');
    await exported.close();
    // New preview attempt, original data remains untouched throughout.
    async function reset(main=raw) {
      await page.evaluate(main=>{localStorage.removeItem('swapApp.preview.v1');if(main===null)localStorage.removeItem('swapApp.v1');else localStorage.setItem('swapApp.v1',main);},main);
      await page.reload();await page.locator('#previewReview').click();
    }
    await reset(null);check(await page.locator('#previewMessage').innerText().then(t=>t.includes('ไม่พบข้อมูล')),'missing source explained');
    await reset('{bad');check(await page.locator('#previewCopy').isHidden(),'corrupt source cannot copy');
    await reset(JSON.stringify({...source,schemaVersion:999}));check(await page.locator('#previewCopy').isHidden(),'unsupported schema cannot copy');
    await reset();
    await page.evaluate(raw=>localStorage.setItem('swapApp.v1',raw+' '),raw);
    await page.locator('#previewCopy').click();
    check(await page.locator('#previewMessage').innerText().then(t=>t.includes('เปลี่ยนหลังตรวจสอบ')),'source-change guard');
    check(await page.evaluate(()=>Object.keys(__SWAP_PREVIEW_STORAGE__.decode(localStorage.getItem('swapApp.preview.v1')).semesters).length===0),'changed source not copied without re-review');
    await reset();
    const before=await page.evaluate(()=>localStorage.getItem('swapApp.preview.v1'));
    await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='swapApp.preview.v1')throw new DOMException('full','QuotaExceededError');return set.call(this,k,v);};});
    await page.locator('#previewCopy').click();
    check(await page.locator('#previewMessage').innerText().then(t=>t.includes('ไม่พอ')),'quota failure explained');
    check(await page.evaluate(()=>localStorage.getItem('swapApp.preview.v1'))===before,'quota failure preserves preview');
    check(await page.evaluate(()=>localStorage.getItem('swapApp.v1'))===raw,'quota failure preserves original');
    await page.reload();await page.locator('#previewReview').click();
    await page.evaluate(raw=>localStorage.setItem('swapApp.preview.v1',__SWAP_PREVIEW_STORAGE__.encode(JSON.parse(raw))),raw);
    await page.locator('#previewCopy').click();
    check(await page.locator('#previewMessage').innerText().then(t=>t.includes('อีกแท็บ')),'other preview tab cannot be overwritten');
    await reset();
    await Promise.all([page.waitForNavigation(),page.locator('#previewCopy').click()]);
    if(process.env.SWAP_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.SWAP_SCREENSHOT_DIR,{recursive:true});
      await page.screenshot({path:path.join(process.env.SWAP_SCREENSHOT_DIR,'s01-preview.png'),fullPage:true});
    }
    check(errors.length===0,'zero page errors: '+errors.join(';'));
    check(fs.readFileSync(path.join(root,'index.html'),'utf8')===original,'original HTML unchanged');
    console.log('PASS:',assertions,'S01 checks; original storage and HTML preserved.');
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
