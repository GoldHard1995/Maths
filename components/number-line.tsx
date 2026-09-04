'use client';
import { useEffect, useRef } from 'react';
import { plain } from '@/lib/game';
export default function NumberLine({onPick,marks=[],cursor,labels='all',disabled=false}: {
  onPick?:(n:number)=>void; marks?:number[];cursor?:number;labels?:'all'|'some';disabled?:boolean;
}) {
  const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{ const el=wrap.current;if(el)el.scrollLeft=(el.scrollWidth-el.clientWidth)/2; },[]);
  return <div className="numberline-wrap"><div className="line-directions"><span>← 負方向</span><span>正方向 →</span></div><div className="line-scroll" ref={wrap} tabIndex={0} aria-label="數線，可橫向捲動"><div className="numberline" role="group" aria-label="負十至正十的数線">{Array.from({length:21},(_,i)=>i-10).map(n=>{
    const label=labels==='all'||n===0||n===-10||n===10;
    const cls=`tick ${n===0?'zero':''} ${marks.includes(n)?'marked':''} ${cursor===n?'cursor':''}`;
    const content=<><span className="pin" aria-hidden="true">{cursor===n?'▼':marks.includes(n)?'●':''}</span><span className="tick-mark"/><span className="tick-label">{label?plain(n):'·'}</span></>;
    return onPick?<button key={n} type="button" className={cls} disabled={disabled} onClick={()=>onPick(n)} aria-label={label?`位置 ${plain(n)}`:`零的${n<0?'左':'右'}方第 ${Math.abs(n)} 格`}>{content}</button>:<div key={n} className={cls}>{content}</div>;
  })}</div></div><p className="line-help">每一格代表 1。數線超出畫面時，可左右滑動。</p></div>;
}
