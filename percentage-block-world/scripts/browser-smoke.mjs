import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.PERCENTAGE_PREVIEW_URL || 'http://127.0.0.1:4173';
const output = new URL('../work/browser-qa/', import.meta.url);
await fs.mkdir(output, {recursive:true});
const backend = vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('../../google-apps-script/Code.gs',import.meta.url),'utf8'),backend);
const catalog = vm.runInContext('publicCatalog_()',backend), worlds = vm.runInContext('CATALOG',backend);
const percentage = worlds.find(w=>w.id==='percentage');
const records = [], uploads = [], failures = [], screenshots = [];
backend.currentSchoolYear_ = () => '2026-27'; backend.currentRound_ = () => 'UI-TEST'; backend.readRecords_ = () => records;
const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome'});
const context = await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
await context.route('https://script.google.com/**',async route=>{
  const request=route.request(),url=new URL(request.url()),params=url.searchParams;
  if(request.method()==='POST'){
    const p=Object.fromEntries(new URLSearchParams(request.postData()||''));
    const r={...p,...Object.fromEntries(['studentNo','score','maxScore','elapsedSeconds','questionCount','firstTryCorrect','skippedQuestions','longestFirstTryStreak','wrongAttempts'].map(k=>[k,Number(p[k])])),roundId:'UI-TEST',submittedAt:Date.now()};
    backend.validateSubmission_(r); assert.equal(r.worldId,'percentage');uploads.push(r);records.push(r);
    const best=backend.personalBestFromRecords_(percentage,r.gameId,records);
    const badges=backend.profileFromRecords_('2026-27',r.className,r.studentNo,records,[]).badges.filter(b=>b.earned&&b.id===`stage-percentage-${r.gameId}`);
    const value={source:'maths-platform',ok:true,submissionId:r.submissionId,message:'成績已成功上傳。',gradeRank:1,classRank:1,personalBest:best,previousPersonalBest:null,isNewPersonalBest:true,newBadges:badges};
    return route.fulfill({contentType:'text/html',body:`<script>window.parent.postMessage(${JSON.stringify(value)},'*')</script>`});
  }
  const action=params.get('action');let value;
  if(action==='config')value={ok:true,schoolYear:'2026-27',classes:['1A','1B','1C','1D'],studentNoMin:1,studentNoMax:33};
  else if(action==='catalog')value={ok:true,worlds:catalog,badges:vm.runInContext('publicBadges_()',backend)};
  else if(action==='profile')value=backend.profileFromRecords_('2026-27',params.get('className'),Number(params.get('studentNo')),records.filter(r=>r.className===params.get('className')&&r.studentNo===Number(params.get('studentNo'))),[]);
  else if(action==='personalBests')value={ok:true,schoolYear:'2026-27',worldId:params.get('worldId'),bests:backend.personalBestsFromRecords_(worlds.find(w=>w.id===params.get('worldId')),records.filter(r=>r.className===params.get('className')&&r.studentNo===Number(params.get('studentNo'))))};
  else value=backend.leaderboard_(params.get('board')||'overall',params.get('classFilter')||'ALL',{className:'1A',studentNo:1},params.get('worldId')||'percentage');
  await route.fulfill({contentType:'text/javascript',body:`${params.get('callback')}(${JSON.stringify(value)})`});
});
const page=await context.newPage();page.on('pageerror',error=>failures.push(error.message));
page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`)});

async function layout(name){
  const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,small:[...document.querySelectorAll('button:not(:disabled),a.hub-home')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<43.9||r.height<43.9)}).map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),mathErrors:document.querySelectorAll('.katex-error').length}));
  assert.ok(metrics.scroll<=metrics.width,`${name}: horizontal overflow ${JSON.stringify(metrics)}`);assert.deepEqual(metrics.small,[],`${name}: small touch targets`);assert.equal(metrics.mathErrors,0,name);
}
async function screenshot(name){const filename=`${name}.png`;await page.screenshot({path:fileURLToPath(new URL(filename,output)),fullPage:true});screenshots.push(filename)}
function numberFromKey(key){
  const [game,template,...data]=key.split('|'),f=JSON.parse(data.join('|'));
  switch(template){
    case 'to-decimal':case 'percent-to-fraction':return f.rate/100;
    case 'decimal-to-percent':case 'fraction-to-percent':return f.rate;
    case 'percent-arithmetic':case 'one-plus-minus':return f.a+f.sign*f.b;
    case 'part-rate':return f.part/f.total*100;case 'remaining-rate':return (f.total-f.part)/f.total*100;case 'part':return f.part;case 'whole':case 'remaining-whole':case 'nested-whole':return f.total;
    case 'remaining-part':case 'other-part':case 'nested-other':return f.total-f.part;case 'nested-part':return f.inner;
    case 'change-amount':return f.amount;case 'change-new':case 'change-new-from-amount':return f.next;case 'change-rate':case 'change-rate-from-amount':return f.rate;case 'change-original-from-amount':case 'change-original-from-new':return f.original;
    case 'trade-amount':return f.amount;case 'trade-sale':return f.sale;case 'trade-rate':case 'batch-profit-rate':case 'spoiled-loss-rate':return f.rate;case 'trade-cost-from-amount':case 'trade-cost-from-sale':return f.cost;
    case 'fold-to-rate':return f.rate;case 'rate-to-fold':return f.paidRate/10;case 'discount-sale':return f.sale;case 'discount-saving':return f.saving;case 'discount-rate':return f.rate;case 'discount-marked':case 'discount-trade-marked':return f.marked;case 'discount-total':return f.count*f.sale;case 'discount-saved-total':return f.count*f.saving;
    default:throw new Error(`${game}: unknown ${template}`);
  }
}
function choiceValue(label){
  if(/^[一二三四五六七八九]五?折$/.test(label.trim()))return '零一二三四五六七八九'.indexOf(label.trim()[0])+(label.trim().length===3?.5:0);
  const parts=label.replace(/[^\d.÷]/g,'').split('÷');return Number(parts[0])/(parts.length>1?Number(parts[1]):1);
}
try {
  await page.goto(base);await page.locator('#class-name').selectOption('1A');await page.locator('#student-no').fill('1');await page.getByRole('button',{name:'查看我的世界'}).click();await page.locator('#percentage-game').waitFor({state:'visible'});
  assert.ok((await page.locator('#percentage-game').getAttribute('href')).includes('className=1A'));await page.locator('#percentage-game').click();await page.getByRole('button',{name:/百分數互化/}).waitFor();
  for(const [width,height] of [[1024,768],[1180,820],[1366,1024]]){await page.setViewportSize({width,height});await layout(`menu-${width}`);await screenshot(`menu-${width}`)}
  await page.setViewportSize({width:1024,height:768});
  for(const [index,stage] of percentage.stages.entries()){
    await page.getByRole('button',{name:new RegExp(stage[1])}).click();
    const keys=await page.evaluate(()=>JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(k=>k.startsWith('maths-percentage-previous-v1:')))));
    // Each stage has its own key; select the matching one after earlier games.
    const currentKeys=await page.evaluate(id=>JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(k=>k.startsWith('maths-percentage-previous-v1:')&&k.endsWith(':'+id)))),stage[0]);
    assert.equal(currentKeys.length,15);assert.ok(keys.length===15);
    for(let q=0;q<15;q++){
      const value=numberFromKey(currentKeys[q]);
      await layout(`${stage[0]}-${q}`);
      if(q<10&&stage[0]!=='conversion')assert.ok(!/求原值|求成本|求標價|全部共有多少/.test(await page.locator('.task-title').textContent()));
      if(q===0||q===10){
        for(const [width,height] of [[1024,768],[1180,820],[1366,1024]]){await page.setViewportSize({width,height});await layout(`${stage[0]}-${q}-${width}`);await screenshot(`${stage[0]}-${q===0?'basic':'comprehensive'}-${width}`)}
        await page.setViewportSize({width:1024,height:768});
      }
      if(await page.locator('#numeric-answer').count()){
        if(q===10&&index===2){await page.locator('#numeric-answer').fill('9999');await page.getByRole('button',{name:'檢查答案'}).click();await page.locator('.feedback.hint').waitFor();await screenshot('increase-hint-1024')}
        const answerText=String(Math.round(value*100)/100);
        if(q===10||value<1){
          await page.locator('#numeric-answer').fill('9');
          await page.getByRole('button',{name:'刪除一位',exact:true}).click();
          for(const digit of answerText)await page.getByRole('button',{name:digit==='.'?'小數點':digit,exact:true}).click();
          assert.equal(await page.locator('#numeric-answer').inputValue(),answerText);
        }else await page.locator('#numeric-answer').fill(answerText);
        await page.getByRole('button',{name:'檢查答案'}).click();
      }else{
        const choices=page.locator('.choice');let selected=-1;
        for(let c=0;c<await choices.count();c++){const button=choices.nth(c),math=button.locator('.latex-expression');const label=await math.count()?await math.getAttribute('aria-label'):await button.textContent();const candidate=choiceValue(label);if(stage[0]!=='conversion'&&!label.trim().endsWith('折'))assert.ok(Number.isInteger(candidate)&&candidate>0,`${stage[0]}: non-integer visible choice ${label}`);if(Math.abs(candidate-value)<1e-9)selected=c;}
        assert.notEqual(selected,-1,`${stage[0]} ${currentKeys[q]}`);await choices.nth(selected).click();
      }
      if(q<14)await page.getByRole('button',{name:'下一個任務'}).click();
    }
    await page.getByRole('button',{name:'上傳成績'}).waitFor();
    for(const [width,height] of [[1024,768],[1180,820],[1366,1024]]){await page.setViewportSize({width,height});await layout(`${stage[0]}-finish-${width}`);await screenshot(`${stage[0]}-finish-${width}`)}
    await page.setViewportSize({width:1024,height:768});await page.getByRole('button',{name:'上傳成績'}).click();await page.locator('.upload-status.success').waitFor();
    await page.getByRole('button',{name:'選其他遊戲'}).click();
  }
  await page.getByRole('button',{name:'查看排行榜'}).click();await page.getByRole('tab',{name:'六關總榜'}).click();await page.locator('.ranking-row').nth(1).waitFor();
  for(const [width,height] of [[1024,768],[1180,820],[1366,1024]]){await page.setViewportSize({width,height});await screenshot(`leaderboard-${width}`);await layout(`leaderboard-${width}`)}
  await page.setViewportSize({width:1024,height:768});
  await page.getByRole('link',{name:'返回主畫面',exact:true}).click();await page.locator('#percentage-count').waitFor();assert.equal(await page.locator('#percentage-count').textContent(),'已完成 6／6');await screenshot('hub-badges-1024');
  await page.locator('#percentage-game').click();await page.getByRole('button',{name:/百分數互化/}).click();
  const first=await page.evaluate(()=>JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(k=>k.endsWith(':percentage:conversion')))));
  await page.reload();await page.getByRole('button',{name:/百分數互化/}).click();
  const second=await page.evaluate(()=>JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(k=>k.endsWith(':percentage:conversion')))));
  assert.equal(second.some(k=>first.includes(k)),false);
  await page.getByRole('link',{name:'返回主畫面',exact:true}).click();await page.getByRole('button',{name:'更換學生'}).click();await page.locator('#class-name').selectOption('1B');await page.locator('#student-no').fill('2');await page.getByRole('button',{name:'查看我的世界'}).click();await page.locator('#percentage-game').click();await page.getByRole('button',{name:/百分數互化/}).click();
  assert.ok(await page.evaluate(()=>Object.keys(sessionStorage).some(k=>k.includes(':1B:2:percentage:conversion'))));
  assert.equal(uploads.length,6);assert.ok(uploads.every(p=>p.worldId==='percentage'&&p.className==='1A'&&p.studentNo===1));
  assert.deepEqual(failures,[]);
  await fs.writeFile(new URL('results.json',output),JSON.stringify({status:'passed',platform:'mocked Apps Script transport; shared pure functions verified',viewports:[[1024,768],[1180,820],[1366,1024]],questionsAnswered:90,uploads:uploads.map(p=>({gameId:p.gameId,worldId:p.worldId,score:p.score})),screenshots},null,2));
  console.log(JSON.stringify({status:'passed',questionsAnswered:90,uploads:uploads.length,screenshots:screenshots.length,output:fileURLToPath(output)}));
}finally{await browser.close()}
