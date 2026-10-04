import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../..',import.meta.url));
const site=path.join(root,'_site');
const backend=vm.createContext({console});vm.runInContext(await fs.readFile(path.join(root,'google-apps-script/Code.gs'),'utf8'),backend);
const records=[],awards=[];
backend.currentRound_=()=> 'LOCAL-PREVIEW';backend.currentSchoolYear_=()=> '2026-27';backend.readRecords_=()=> records;backend.readBadgeRecords_=()=> awards;
const google='https://script.google.com/macros/s/AKfycbzJRblwkScQZuKpUQjiwkpZIMKyY0-h4vO8aFhqqVU2rgINbxYDPW0nH60YL8Pxpz0r/exec';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:8766');
 try{
  if(url.pathname==='/api/platform'){
   if(req.method==='POST'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>10000)throw Error('提交過長');}
    const fields=Object.fromEntries(new URLSearchParams(body));for(const name of ['studentNo','score','maxScore','elapsedSeconds','questionCount','firstTryCorrect','skippedQuestions','longestFirstTryStreak','wrongAttempts'])fields[name]=Number(fields[name]);
    backend.validateSubmission_(fields);const previous=backend.personalBest_(fields.schoolYear,fields.className,fields.studentNo,fields.worldId,fields.gameId);
    const before=backend.profileFromRecords_(fields.schoolYear,fields.className,fields.studentNo,records.filter(r=>r.className===fields.className&&r.studentNo===fields.studentNo),awards);
    const inserted=!records.some(r=>r.submissionId===fields.submissionId);if(inserted)records.push({...fields,roundId:'LOCAL-PREVIEW',submittedAt:Date.now()});
    const profile=backend.profile_(fields.schoolYear,fields.className,fields.studentNo),newBadges=inserted?profile.badges.filter(b=>b.earned&&!before.badges.find(old=>old.id===b.id)?.earned):[];
    for(const b of newBadges)awards.push({schoolYear:fields.schoolYear,className:fields.className,studentNo:fields.studentNo,badgeId:b.id,earnedAt:new Date().toISOString()});
    const identity={className:fields.className,studentNo:fields.studentNo},grade=backend.leaderboard_(fields.gameId,'ALL',identity,fields.worldId),classBoard=backend.leaderboard_(fields.gameId,fields.className,identity,fields.worldId),best=backend.personalBest_(fields.schoolYear,fields.className,fields.studentNo,fields.worldId,fields.gameId);
    const data={source:'maths-platform',ok:true,submissionId:fields.submissionId,message:'模擬成績已上傳；不會寫入正式紀錄。',best:grade.self,gradeRank:grade.self?.rank||null,classRank:classBoard.self?.rank||null,personalBest:best,previousPersonalBest:previous,isNewPersonalBest:backend.isNewPersonalBest_(inserted,fields,previous),newBadges};
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(`<meta charset="utf-8"><script>parent.postMessage(${JSON.stringify(data)},'*')</script>`);
   }
   const q=Object.fromEntries(url.searchParams),studentNo=Number(q.studentNo);let data;
   if(q.action==='config')data={ok:true,schoolYear:'2026-27',classes:['1A','1B','1C','1D'],studentNoMin:1,studentNoMax:33};
   else if(q.action==='catalog')data={ok:true,worlds:backend.publicCatalog_(),badges:backend.publicBadges_()};
   else if(q.action==='profile')data=backend.profile_(q.schoolYear,q.className,studentNo);
   else if(q.action==='personalBests')data=backend.personalBests_(q.schoolYear,q.className,studentNo,q.worldId);
   else data=backend.leaderboard_(q.board,q.classFilter,{className:q.className,studentNo},q.worldId);
   if(!/^[A-Za-z_$][\w$]*$/.test(q.callback))throw Error('無效 callback');
   res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});return res.end(`${q.callback}(${JSON.stringify(data)})`);
  }
  const file=path.resolve(site,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(site+path.sep))throw Error('無效路徑');
  let content=await fs.readFile(file);const extension=path.extname(file);
  // Redirect only this local preview's bundle endpoint; source and production assets remain unchanged.
  if(extension==='.js')content=Buffer.from(content.toString().replaceAll(google,'http://127.0.0.1:8766/api/platform'));
  res.writeHead(200,{'content-type':(mime[extension]||'application/octet-stream')+(extension==='.html'||extension==='.js'||extension==='.css'?'; charset=utf-8':''),'cache-control':'no-store'});res.end(content);
 }catch(error){
  if(url.pathname==='/api/platform'&&url.searchParams.get('callback')){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});res.end(`${url.searchParams.get('callback')}(${JSON.stringify({ok:false,message:error.message})})`);}
  else{res.writeHead(404);res.end('Not found');}
 }
}).listen(8766,'127.0.0.1',()=>console.log('Local preview with mock records: http://127.0.0.1:8766/'));
