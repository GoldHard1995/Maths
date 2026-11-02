/* Quadratic Δ Lab — dependency-free classroom activity. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const stages = ['observe', 'connect', 'explore', 'challenge'];
  const state = { stage: 'observe', a: 1, b: -4, c: 3, rootsShown: false, vertexShown: false, observeRevealed: false, quizIndex: 0, quizCorrect: 0, quizAnswered: false };
  const questions = [
    {a:1,b:-6,c:8}, {a:1,b:4,c:4}, {a:1,b:2,c:5}, {a:-1,b:4,c:-3},
    {a:2,b:1,c:-3}, {a:2,b:-4,c:2}, {a:-1,b:2,c:-5}, {a:-2,b:0,c:8}
  ];
  const tips = {
    observe:'暫時不要展示 Δ。讓學生先從圖像回答「有多少個實數解」，再進入第二階段。',
    connect:'請學生自行計算三組 Δ，並從 2、1、0 個交點歸納 Δ 的正負規律。',
    explore:'留意 a < 0 時拋物線向下，但 Δ 的規律不變；a 必須不等於 0。',
    challenge:'請學生先在紙上計算 Δ，再揭示圖像。重點是解的數目，而非求出 x 的值。'
  };
  const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
  const nearZero = (v) => Math.abs(v) < 1e-8 ? 0 : v;
  const signed = (n) => n < 0 ? '−' + num(-n) : num(n);
  function num(v) { const n=nearZero(v); return Number.isInteger(n) ? String(n) : Number(n.toFixed(2)).toString(); }
  function poly(a,b,c, prefix='y = ') {
    const parts=[];
    const term=(v,t)=> {
      if (!v) return;
      const magnitude = Math.abs(v)===1 && t ? '' : num(Math.abs(v));
      const atom=magnitude+t;
      if(!parts.length) parts.push((v<0?'−':'')+atom);
      else parts.push((v<0?' − ':' + ')+atom);
    };
    term(a,'x²');term(b,'x');term(c,'');
    return prefix+(parts.join('')||'0');
  }
  const delta = () => nearZero(state.b**2 - 4*state.a*state.c);
  const rootCount = () => delta()>0?2:(delta()===0?1:0);
  const rootDesc = () => rootCount()===2?'兩個不同實根':rootCount()===1?'一個重根':'沒有實根';
  const condition = () => delta()>0?'Δ > 0':delta()===0?'Δ = 0':'Δ < 0';
  function plot() {
    const {a,b,c}=state;
    const vertexX=-b/(2*a), vertexY=c-b*b/(4*a);
    const d=delta();
    const off=d>0?Math.sqrt(d)/(2*Math.abs(a)):0;
    const half=clamp(Math.max(4.1,off+1.8),4.1,14);
    const xMin=vertexX-half, xMax=vertexX+half;
    const yMin=a>0?Math.min(-2.5,vertexY-2):Math.min(-6,vertexY-8);
    const yMax=a>0?Math.max(7.5,vertexY+8):Math.max(2.5,vertexY+2);
    const P={left:65,right:775,top:31,bottom:475};
    const X=x=>P.left+(x-xMin)/(xMax-xMin)*(P.right-P.left);
    const Y=y=>P.bottom-(y-yMin)/(yMax-yMin)*(P.bottom-P.top);
    let html='<defs><clipPath id="clip-plot"><rect x="65" y="31" width="710" height="444" rx="0"/></clipPath></defs>';
    function tickStep(span) { const raw=span/9, p=10**Math.floor(Math.log10(raw));return [1,2,5,10].map(x=>x*p).find(x=>x>=raw)||10*p; }
    const xs=tickStep(xMax-xMin), ys=tickStep(yMax-yMin);
    for(let x=Math.ceil(xMin/xs)*xs;x<=xMax+1e-7;x+=xs){const px=X(x);html+=`<line class="plot-grid${Math.abs(x)<1e-9?'-major':''}" x1="${px}" y1="${P.top}" x2="${px}" y2="${P.bottom}"/>`; if(Math.abs(x)>1e-8) html+=`<text class="plot-label" text-anchor="middle" x="${px}" y="${clamp(Y(0)+21,45,503)}">${signed(x)}</text>`;}
    for(let y=Math.ceil(yMin/ys)*ys;y<=yMax+1e-7;y+=ys){const py=Y(y);html+=`<line class="plot-grid${Math.abs(y)<1e-9?'-major':''}" x1="${P.left}" y1="${py}" x2="${P.right}" y2="${py}"/>`;if(Math.abs(y)>1e-8)html+=`<text class="plot-label" text-anchor="end" x="${clamp(X(0)-10,37,100)}" y="${py+4}">${signed(y)}</text>`;}
    if(xMin<=0&&xMax>=0)html+=`<line class="plot-axis" x1="${X(0)}" y1="${P.top}" x2="${X(0)}" y2="${P.bottom}"/><text class="plot-label" x="${X(0)+8}" y="${P.top+13}">y</text>`;
    html+=`<line class="plot-axis" x1="${P.left}" y1="${Y(0)}" x2="${P.right}" y2="${Y(0)}"/><text class="plot-label" x="${P.right-10}" y="${Y(0)-9}">x</text>`;
    if(xMin<=0&&xMax>=0)html+=`<text class="plot-label" x="${X(0)-14}" y="${Y(0)+19}">0</text>`;
    if(state.vertexShown)html+=`<line class="symmetry" x1="${X(vertexX)}" x2="${X(vertexX)}" y1="${P.top}" y2="${P.bottom}" clip-path="url(#clip-plot)"/>`;
    let path='';
    for(let i=0;i<=480;i++){const x=xMin+(xMax-xMin)*i/480;const y=a*x*x+b*x+c;path+=(i?'L':'M')+X(x).toFixed(2)+' '+Y(y).toFixed(2)+' ';}
    html+=`<path class="plot-curve" d="${path}" clip-path="url(#clip-plot)"/>`;
    if(state.vertexShown){html+=`<circle class="vertex-dot" cx="${X(vertexX)}" cy="${Y(vertexY)}" r="5.5" clip-path="url(#clip-plot)"/><text class="vertex-text" text-anchor="middle" x="${X(vertexX)}" y="${clamp(Y(vertexY)+(a>0?-14:25),20,498)}">頂點 (${num(vertexX)}, ${num(vertexY)})</text>`;}
    if(state.rootsShown && d>=0){const roots=d===0?[vertexX]:[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)].sort((x,y)=>x-y);
      roots.forEach((x,i)=>{const px=X(x),py=Y(0);html+=`<circle class="root-dot" cx="${px}" cy="${py}" r="7"/>`;
        const labelY=py+((roots.length===2 && Math.abs(X(roots[1])-X(roots[0]))<105 && i===1)?-21:27);
        html+=`<text class="root-text" text-anchor="middle" x="${px}" y="${clamp(labelY,20,504)}">x = ${num(x)}</text>`;
      });}
    $('graph').innerHTML=html;
    $('graph').setAttribute('aria-label',`${poly(a,b,c)}；${state.rootsShown?rootCount()+' 個 x 軸交點': '交點暫時隱藏'}`);
  }
  function setCoefficients(a,b,c) { state.a=a===0?0.5:a;state.b=b;state.c=c;render(); }
  function render() {
    $('equation-title').textContent=poly(state.a,state.b,state.c);
    $('orientation-pill').textContent=state.a>0?'開口向上':'開口向下';
    $('toggle-roots').checked=state.rootsShown;
    $('toggle-vertex').checked=state.vertexShown;
    $('intersection-chip').innerHTML='交點數目：<strong>'+(state.rootsShown?rootCount():'？')+'</strong>';
    plot();
    document.querySelectorAll('[data-k]').forEach(el=>el.classList.toggle('selected',Number(el.dataset.k)===state.c));
    $('observe-result').classList.toggle('hidden',!state.observeRevealed);
    $('reveal-observe').innerHTML=state.observeRevealed?'重新讓學生猜測 <span>↺</span>':'揭示交點與答案 <span>→</span>';
    if(state.observeRevealed){$('observe-result').innerHTML=`<strong>${rootCount()} 個交點 · ${rootDesc()}</strong>因為圖像與 x 軸有 ${rootCount()} 個不同交點，所以方程有 ${rootCount()} 個不同的實數解。`}
    $('connect-working').innerHTML=`a = ${signed(state.a)}，b = ${signed(state.b)}，c = ${signed(state.c)}<br>Δ = (${signed(state.b)})² − 4(${signed(state.a)})(${signed(state.c)})<br><strong>Δ = ${num(delta())}</strong>`;
    $('connect-conclusion').textContent=`${condition()}  →  ${rootCount()} 個交點  →  ${rootDesc()}`;
    for(const k of ['a','b','c']){$('slider-'+k).value=state[k];$('val-'+k).textContent=signed(state[k]);}
    $('explore-delta').textContent=signed(delta());
    $('explore-description').textContent=`${condition()}，${rootDesc()}`;
    $('challenge-curtain').classList.toggle('hidden',state.stage!=='challenge'||state.quizAnswered);
    $('toggle-roots').disabled=state.stage==='challenge'&&!state.quizAnswered;
    $('toggle-vertex').disabled=state.stage==='challenge'&&!state.quizAnswered;
    $('reset-view').textContent='↺ 重設';
  }
  function stage(name){
    if(!stages.includes(name))return;
    state.stage=name;
    document.querySelectorAll('[data-stage]').forEach(el=>{const on=el.dataset.stage===name;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    stages.forEach(s=>$('panel-'+s).classList.toggle('hidden',s!==name));
    $('tip-text').textContent=tips[name];
    state.vertexShown=false;
    if(name==='observe'){state.rootsShown=false;state.observeRevealed=false;setCoefficients(1,-4,3);}
    if(name==='connect'){state.rootsShown=true;setCoefficients(1,-4,3);}
    if(name==='explore'){state.rootsShown=true;state.vertexShown=true;setCoefficients(1,-4,3);}
    if(name==='challenge'){state.quizIndex=0;state.quizCorrect=0;renderQuiz();}
    render();
  }
  function selectCase(k){setCoefficients(1,-4,k);state.observeRevealed=false;state.rootsShown=state.stage==='connect';render();}
  function revealObserve(){state.observeRevealed=!state.observeRevealed;state.rootsShown=state.observeRevealed;render();}
  function renderQuiz(){
    if(state.quizIndex>=questions.length){$('quiz-finish').classList.remove('hidden');$('quiz-options').classList.add('hidden');$('quiz-equation').classList.add('hidden');$('quiz-feedback').classList.add('hidden');$('next-question').classList.add('hidden');$('quiz-step').textContent='完成挑戰';$('quiz-progress-fill').style.width='100%';$('quiz-finish').innerHTML=`<strong>${state.quizCorrect} / ${questions.length}</strong><p>你已完成所有題目。回想：Δ 的正負與 x 軸交點有何關係？</p><button type="button" id="restart-quiz">重新挑戰</button>`; $('restart-quiz').addEventListener('click',()=>{state.quizIndex=0;state.quizCorrect=0;state.quizAnswered=false;renderQuiz();render();});return;}
    const q=questions[state.quizIndex];state.quizAnswered=false;state.rootsShown=false;state.vertexShown=false;
    state.a=q.a;state.b=q.b;state.c=q.c;
    $('quiz-step').textContent=`題目 ${state.quizIndex+1} / ${questions.length}`;
    $('quiz-score').textContent=`答對 ${state.quizCorrect} 題`;
    $('quiz-progress-fill').style.width=`${100*state.quizIndex/questions.length}%`;
    $('quiz-equation').textContent=poly(q.a,q.b,q.c,'');
    $('quiz-finish').classList.add('hidden');$('quiz-options').classList.remove('hidden');$('quiz-equation').classList.remove('hidden');
    $('quiz-feedback').classList.add('hidden');$('next-question').classList.add('hidden');
    document.querySelectorAll('[data-answer]').forEach(el=>{el.disabled=false;el.classList.remove('correct','wrong')});
  }
  function answerQuiz(answer){
    if(state.quizAnswered||state.quizIndex>=questions.length)return;
    const correct=rootCount();const good=answer===correct;
    state.quizAnswered=true;state.rootsShown=true;state.vertexShown=false;if(good)state.quizCorrect++;
    document.querySelectorAll('[data-answer]').forEach(el=>{el.disabled=true;const n=Number(el.dataset.answer);el.classList.toggle('correct',n===correct);el.classList.toggle('wrong',n===answer&&!good)});
    $('quiz-feedback').classList.remove('hidden');
    $('quiz-feedback').innerHTML=`<strong>${good?'答對了！':'再看一次 Δ 的正負。'}</strong>Δ = (${signed(state.b)})² − 4(${signed(state.a)})(${signed(state.c)}) = ${signed(delta())}。<br>${condition()}，因此有 ${correct} 個交點（${rootDesc()}）。`;
    $('quiz-score').textContent=`答對 ${state.quizCorrect} 題`;
    $('next-question').classList.remove('hidden');$('next-question').innerHTML=state.quizIndex===questions.length-1?'查看成績 <span>→</span>':'下一題 <span>→</span>';
    render();
  }
  document.querySelectorAll('[data-stage]').forEach(el=>el.addEventListener('click',()=>stage(el.dataset.stage)));
  document.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('click',()=>selectCase(Number(el.dataset.k))));
  $('reveal-observe').addEventListener('click',revealObserve);
  $('toggle-roots').addEventListener('change',e=>{state.rootsShown=e.target.checked;if(state.stage==='observe')state.observeRevealed=e.target.checked;render();});
  $('toggle-vertex').addEventListener('change',e=>{state.vertexShown=e.target.checked;render();});
  for(const k of ['a','b','c'])$('slider-'+k).addEventListener('input',e=>{let v=Number(e.target.value);if(k==='a'&&v===0){v=state.a>0?-0.5:0.5;e.target.value=v;}state[k]=v;render();});
  document.querySelectorAll('[data-example]').forEach(el=>el.addEventListener('click',()=>{const v=el.dataset.example;const arr=v==='negative'?[-1,4,-3]:v==='tangent'?[1,-4,4]:[1,-4,5];setCoefficients(...arr)}));
  document.querySelectorAll('[data-answer]').forEach(el=>el.addEventListener('click',()=>answerQuiz(Number(el.dataset.answer))));
  $('next-question').addEventListener('click',()=>{state.quizIndex++;renderQuiz();render();});
  $('reset-view').addEventListener('click',()=>{if(state.stage==='challenge'){state.quizIndex=0;state.quizCorrect=0;renderQuiz();}else if(state.stage==='explore'){state.a=1;state.b=-4;state.c=3;state.rootsShown=true;state.vertexShown=true;}else{state.a=1;state.b=-4;state.c=3;state.observeRevealed=false;state.rootsShown=state.stage==='connect';state.vertexShown=false;}render();});
  $('fullscreen-btn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else alert('請使用瀏覽器的全螢幕功能。');}catch{alert('此瀏覽器未允許全螢幕，請改用瀏覽器選單操作。');}});
  document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target instanceof HTMLInputElement)return;if(e.key==='Escape'&&document.fullscreenElement)document.exitFullscreen();});
  stage('observe');
})();
