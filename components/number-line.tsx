'use client';
import { useEffect, useRef } from 'react';
import { plain, signed } from '@/lib/game';
export default function NumberLine({onPick,marks=[],cursor,labels='all',labelValues,step=1,showScale=true,disabled=false}: {
  onPick?:(n:number)=>void;marks?:number[];cursor?:number;labels?:'all'|'some';labelValues?:number[];step?:0.5|1|2;showScale?:boolean;disabled?:boolean;
}) {
  const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{ const el=wrap.current;if(el)el.scrollLeft=(el.scrollWidth-el.clientWidth)/2; },[]);
  return <div className="numberline-wrap"><div className="line-directions"><span>← 負方向</span><span>正方向 →</span></div><div className="line-scroll" ref={wrap} tabIndex={0} aria-label="數線，可橫向捲動"><div className="numberline" role="group" aria-label="數線">{Array.from({length:21},(_,i)=>(i-10)*step).map((n,i)=>{
    const label=labelValues?labelValues.includes(n):labels==='all'||n===0||i===0||i===20;
    const cls=`tick ${n===0&&(!labelValues||label)?'zero':''} ${marks.includes(n)?'marked':''} ${cursor===n?'cursor':''}`;
    const content=<><span className="pin" aria-hidden="true">{cursor===n?'▼':marks.includes(n)?'●':''}</span><span className="tick-mark"/><span className="tick-label">{label?signed(n):'·'}</span></>;
    return onPick?<button key={n} type="button" className={cls} disabled={disabled} onClick={()=>onPick(n)} aria-label={label?`位置 ${plain(n)}`:`未標示刻度 ${i+1}`} >{content}</button>:<div key={n} className={cls}>{content}</div>;
  })}</div></div><p className="line-help">{showScale?`每一格代表 ${step}。`:labelValues?'根據已知刻度，推算每一格的數值。':'每一格代表 1。'} 數線超出畫面時，可左右滑動。</p></div>;
}
