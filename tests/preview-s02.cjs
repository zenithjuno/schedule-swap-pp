// S02: real interactions + unchanged engine output, desktop and narrow-screen checks.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.SWAP_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),original=fs.readFileSync(path.join(root,'index.html'),'utf8'),preview=fs.readFileSync(path.join(root,'preview/index.html'),'utf8');
const fixture=JSON.parse(original.match(/id="oracle-fixture">([\s\S]*?)<\/script>/)[1]);
const data=process.env.SWAP_SOURCE_BACKUP?JSON.parse(fs.readFileSync(process.env.SWAP_SOURCE_BACKUP,'utf8')):{schemaVersion:1,activeSemester:'2569/1',semesters:{'2569/1':{meta:{label:'2569/1',startDate:'2026-05-01',endDate:'2026-10-01',archived:false},schedule:fixture.mini_dataset.rows,log:[],leaves:[]}},settings:fixture.config,phonebook:{map:{}},noEmbed:false};
const scenario=data.activeSemester==='2569/2'?{me:'0222',per:'3',date:'2026-11-11'}:{me:'0221',per:'2',date:'2026-06-08'};
let count=0;function check(v,m){assert.ok(v,m);count++;}
function engineRegion(html){return html.slice(html.indexOf('  function Engine('),html.indexOf('     STAGE 04 — SEMESTER STORE'));}
check(engineRegion(original)===engineRegion(preview),'engine/dates/ledger and frozen test code unchanged');
check(!preview.includes('grid-motif'),'decorative grid removed including dead CSS');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(req.url.startsWith('/preview')?preview:original);});
(async()=>{
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  const baseline=await page.evaluate(({data,scenario})=>{
    __SWAP_STORE__.restoreFromObject(data);const d=__SWAP_HOME__.state;d.meId=scenario.me;d.dateAbsent=scenario.date;d.dateProposed=scenario.date;d.preference='อนาคต';__SWAP_HOME__.refresh();
    return __SWAP_HOME__.runSearchFor(scenario.per).candidates.map(c=>({idx:c.idx,rank:c.rank,Yid:c.Yid,SCORE:c.SCORE,day2:c.day2,per2:c.per2,giveback_date:c.giveback_date,available_offsets:c.available_offsets}));
  },{data,scenario});
  check(baseline.length>0,'scenario has candidates');
  const oldStorage=await page.evaluate(()=>localStorage.getItem('swapApp.v1'));
  await page.goto(url+'/preview/');
  check(await page.locator('#homeImportShortcut').isVisible(),'empty home has real import shortcut');
  await page.locator('#homeImportShortcut').click();check(await page.locator('#page-settings').isVisible(),'import shortcut opens settings');
  await page.evaluate(data=>localStorage.setItem('swapApp.preview.v1',__SWAP_PREVIEW_STORAGE__.encode(data)),data);await page.reload();
  check(await page.locator('#page-home h1').innerText()==='จัดคาบที่ลา','task-first homepage');
  check((await page.locator('#inTeacher').boundingBox()).y<=(await page.locator('#inAbsent').boundingBox()).y,'teacher and absence are primary');
  check(await page.locator('.ux-options').evaluate(el=>!el.open),'planning options initially folded');
  check(await page.locator('#previewStageNote').isHidden(),'loaded preview banner stays compact');
  await page.locator('#inTeacher').fill(scenario.me);
  await page.locator('#acList [data-id="'+scenario.me+'"]').click();
  await page.locator('#inAbsent').fill(scenario.date);await page.locator('#inAbsent').press('Tab');
  await page.locator('.ux-options summary').click();await page.locator('#inProposed').fill(scenario.date);await page.locator('#inProposed').press('Tab');
  if(process.env.SWAP_SCREENSHOT_DIR){fs.mkdirSync(process.env.SWAP_SCREENSHOT_DIR,{recursive:true});await page.locator('.ux-options summary').click();await page.screenshot({path:path.join(process.env.SWAP_SCREENSHOT_DIR,'s02-home-desktop.png'),fullPage:true});}
  const find=page.locator('.btn-find[data-per="'+scenario.per+'"]');check(await find.innerText()==='หาคู่สลับ','search action clearly labeled');await find.click();
  const actual=await page.evaluate(()=>__SWAP_HOME__.lastSearch.res.candidates.map(c=>({idx:c.idx,rank:c.rank,Yid:c.Yid,SCORE:c.SCORE,day2:c.day2,per2:c.per2,giveback_date:c.giveback_date,available_offsets:c.available_offsets})));
  assert.deepEqual(actual,baseline);count++;
  check(await page.locator('.ux-candidate').count()===baseline.length,'all candidates displayed');
  check(await page.locator('.ux-candidate h3').first().innerText().then(Boolean),'candidate name visible');
  check(await page.locator('#page-results').innerText().then(t=>t.includes('ไม่ใช่เปอร์เซ็นต์')),'ranking score explanation visible');
  check(!await page.locator('#page-results').innerText().then(t=>/\bMe\b|ครู Y\b/.test(t)),'no Me/Y shorthand in result overview');
  const toggle=page.locator('.btn-candidate-toggle').first();await toggle.focus();await toggle.press('Enter');
  check(await toggle.getAttribute('aria-expanded')==='true','keyboard detail action works');
  const detail=page.locator('.detail-row:not([hidden])');check(await detail.count()===1,'one detail at a time');
  check(await detail.locator('.ux-fold').count()===4,'all four evidence sections retained');
  check(await detail.locator('.ux-fold[open]').count()===0,'technical evidence initially folded');
  check(await detail.locator('.btn-savelog').isVisible(),'save action available before technical evidence');
  check(!await detail.innerText().then(t=>/\bMe\b|ครู Y\b/.test(t)),'no Me/Y shorthand in visible detail');
  const first=baseline[0],week=page.locator('.wk-pick[data-idx="'+first.idx+'"]');
  const options=await week.locator('option:not([disabled])').evaluateAll(es=>es.map(e=>e.value));
  const before=await page.locator('#gbcell-'+first.idx).innerText();const selected=await week.inputValue();const alternative=options.find(o=>o!==selected);
  await week.selectOption(alternative);const after=await page.locator('#gbcell-'+first.idx).innerText();check(before!==after,'week picker updates summary date');
  check(await page.locator('#gbDate-'+first.idx).innerText().then(t=>t.includes(after)),'week picker updates open detail date');
  await week.selectOption(selected);
  await detail.locator('.ux-fold summary').nth(2).click();check(await detail.locator('.receipt').isVisible(),'score calculation still accessible');
  await detail.locator('.ux-fold summary').nth(2).click();
  if(process.env.SWAP_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SWAP_SCREENSHOT_DIR,'s02-results-desktop.png'),fullPage:true});
  if(baseline.length>1){await page.locator('.btn-candidate-toggle').nth(1).click();check(await page.locator('.detail-row:not([hidden])').count()===1,'opening another candidate closes previous');await toggle.click();}
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'results fit 390px without page overflow');
  check((await page.locator('.btn-candidate-toggle').first().boundingBox()).height>=40,'touch target height');
  await page.locator('.detail-row:not([hidden]) .ux-fold summary').nth(2).click();
  check(await page.locator('.detail-row:not([hidden]) .receipt .rc-n').first().isVisible(),'score explanations retained on mobile');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'expanded score fits mobile');
  await page.locator('.detail-row:not([hidden]) .ux-fold summary').nth(2).click();
  if(process.env.SWAP_SCREENSHOT_DIR){await page.screenshot({path:path.join(process.env.SWAP_SCREENSHOT_DIR,'s02-results-mobile.png'),fullPage:true});await page.screenshot({path:path.join(process.env.SWAP_SCREENSHOT_DIR,'s02-results-mobile-first.png')});}
  await page.locator('.ux-home-back').first().click();check(await page.locator('#page-home').isVisible(),'back-to-period action works');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'home fits 390px without page overflow');
  if(process.env.SWAP_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SWAP_SCREENSHOT_DIR,'s02-home-mobile.png'),fullPage:true});
  await page.locator('.tab[data-page="results"]').click();await toggle.click();
  const logsBefore=await page.evaluate(()=>__SWAP_STORE__.activeSemester().log.length);
  await page.locator('.detail-row:not([hidden]) .btn-savelog').click();
  check(await page.locator('.save-msg.ok').isVisible(),'proposal saves successfully through UI');
  check(await page.evaluate(()=>__SWAP_STORE__.activeSemester().log.length)===logsBefore+1,'exactly one proposal saved');
  check(await page.evaluate(()=>localStorage.getItem('swapApp.v1'))===oldStorage,'all UI interactions preserve original data');
  await page.locator('.tab[data-page="form"]').click();check(await page.locator('#formPaper').evaluate(el=>getComputedStyle(el).fontFamily.includes('TH Sarabun')),'paper retains document font');
  check((await page.evaluate(()=>__SWAP_SELFTEST__.run())).allGreen,'engine oracle still passes');
  check(errors.length===0,'zero page errors: '+errors.join(';'));
  check(fs.readFileSync(path.join(root,'index.html'),'utf8')===original,'root file unchanged');
  console.log('PASS:',count,'S02 checks; candidate output unchanged; desktop/mobile and save verified.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
