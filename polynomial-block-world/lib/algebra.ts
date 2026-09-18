export const variables=['x','y','a','b'] as const;
export type Variable=(typeof variables)[number];
export type Polynomial=Map<string,number>;

const MAX_POWER=20;
const SUPERSCRIPT_TO_DIGIT:Record<string,string>={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'};
const DIGIT_TO_SUPERSCRIPT=['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];

class ParseFailure extends Error{
 kind:'incomplete'|'unsupported';
 constructor(kind:'incomplete'|'unsupported',message:string){super(message);this.kind=kind}
}

type Token={kind:'number'|'variable'|'operator'|'left'|'right'|'power';value:string};
const key=(powers:Partial<Record<Variable,number>>)=>variables.map(v=>powers[v]||0).join(',');
const constant=(n:number):Polynomial=>new Map(n?[[key({}),n]]:[]);
const letter=(v:Variable):Polynomial=>new Map([[key({[v]:1}),1]]);

const add=(a:Polynomial,b:Polynomial,sign=1)=>{
 const out=new Map(a);
 for(const[k,n]of b){
  const value=(out.get(k)||0)+sign*n;
  if(Math.abs(value)>1e-12)out.set(k,value);else out.delete(k);
 }
 return out;
};

const scale=(a:Polynomial,n:number)=>new Map([...a].map(([k,v])=>[k,v*n] as const).filter(([,v])=>Math.abs(v)>1e-12));

const multiply=(a:Polynomial,b:Polynomial)=>{
 const out:Polynomial=new Map();
 for(const[ka,va]of a)for(const[kb,vb]of b){
  const pa=ka.split(',').map(Number),pb=kb.split(',').map(Number),powers=pa.map((n,i)=>n+pb[i]);
  if(powers.some(n=>Math.abs(n)>MAX_POWER))throw new ParseFailure('unsupported',`指數的絕對值不可大於 ${MAX_POWER}。`);
  const k=powers.join(','),value=(out.get(k)||0)+va*vb;
  if(Math.abs(value)>1e-12)out.set(k,value);else out.delete(k);
 }
 return out;
};

const divide=(a:Polynomial,b:Polynomial)=>{
 if(b.size!==1)throw new ParseFailure('unsupported','除數必須是單項式。');
 const[[divisorKey,divisorCoefficient]]=[...b];
 if(!divisorCoefficient)throw new ParseFailure('unsupported','除數不可為 0。');
 const divisorPowers=divisorKey.split(',').map(Number),out:Polynomial=new Map();
 for(const[numeratorKey,numeratorCoefficient]of a){
  const powers=numeratorKey.split(',').map((n,i)=>Number(n)-divisorPowers[i]);
  if(powers.some(n=>Math.abs(n)>MAX_POWER))throw new ParseFailure('unsupported',`指數的絕對值不可大於 ${MAX_POWER}。`);
  out.set(powers.join(','),numeratorCoefficient/divisorCoefficient);
 }
 return out;
};

const power=(a:Polynomial,n:number)=>{
 if(n<1||n>MAX_POWER)throw new ParseFailure('unsupported',`只可使用 1 至 ${MAX_POWER} 的正整數指數。`);
 let out=constant(1);
 for(let i=0;i<n;i++)out=multiply(out,a);
 return out;
};

function normalizeSuperscripts(raw:string){
 return raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,value=>`^${value.split('').map(character=>SUPERSCRIPT_TO_DIGIT[character]).join('')}`);
}

function tokenize(raw:string){
 const source=normalizeSuperscripts(raw.replaceAll('＋','+').replaceAll('−','-').replaceAll('×','*').replaceAll('÷','/')).replace(/\s+/g,'');
 if(!source)throw new ParseFailure('incomplete','請先輸入答案。');
 const tokens:Token[]=[];
 for(let i=0;i<source.length;){
  const c=source[i];
  if(/\d/.test(c)){
   let e=i+1;
   while(e<source.length&&/\d/.test(source[e]))e++;
   tokens.push({kind:'number',value:source.slice(i,e)});i=e;
  }else if(variables.includes(c as Variable)){tokens.push({kind:'variable',value:c});i++}
  else if('+-*/'.includes(c)){tokens.push({kind:'operator',value:c});i++}
  else if(c==='^'){tokens.push({kind:'power',value:c});i++}
  else if(c==='('){tokens.push({kind:'left',value:c});i++}
  else if(c===')'){tokens.push({kind:'right',value:c});i++}
  else throw new ParseFailure('unsupported',`不支援「${c}」這個符號。`);
 }
 return tokens;
}

class Parser{
 private i=0;
 private tokens:Token[];
 constructor(tokens:Token[]){this.tokens=tokens}
 parse(){const v=this.expression();if(this.i!==this.tokens.length)throw new ParseFailure('incomplete','請檢查算式格式。');return v}
 private expression(){let v=this.term();while(this.peek('operator','+')||this.peek('operator','-')){const sign=this.take().value==='-'?-1:1;v=add(v,this.term(),sign)}return v}
 private term(){
  let v=this.factor();
  while(true){
   if(this.peek('operator','*')){this.take();v=multiply(v,this.factor())}
   else if(this.peek('operator','/')){this.take();v=divide(v,this.factor())}
   else if(this.peek('number')||this.peek('variable')||this.peek('left'))v=multiply(v,this.factor());
   else break;
  }
  return v;
 }
 private factor():Polynomial{
  let v:Polynomial;
  if(this.peek('operator','+')||this.peek('operator','-')){const negative=this.take().value==='-';v=this.factor();return negative?scale(v,-1):v}
  if(this.peek('number'))v=constant(Number(this.take().value));
  else if(this.peek('variable'))v=letter(this.take().value as Variable);
  else if(this.peek('left')){this.take();v=this.expression();if(!this.peek('right'))throw new ParseFailure('incomplete','括號尚未完成。');this.take()}
  else throw new ParseFailure('incomplete','算式尚未完成。');
  if(this.peek('power')){this.take();if(!this.peek('number'))throw new ParseFailure('incomplete','請輸入指數。');v=power(v,Number(this.take().value))}
  return v;
 }
 private peek(kind:Token['kind'],value?:string){const t=this.tokens[this.i];return t?.kind===kind&&(value===undefined||t.value===value)}
 private take(){return this.tokens[this.i++]}
}

export type ParseResult={ok:true;value:Polynomial}|{ok:false;kind:'incomplete'|'unsupported';message:string};
export function parseExpression(raw:string):ParseResult{try{return{ok:true,value:new Parser(tokenize(raw)).parse()}}catch(error){if(error instanceof ParseFailure)return{ok:false,kind:error.kind,message:error.message};throw error}}
export function equivalent(left:string,right:string){const a=parseExpression(left),b=parseExpression(right);if(!a.ok||!b.ok)return false;const keys=new Set([...a.value.keys(),...b.value.keys()]);return[...keys].every(k=>Math.abs((a.value.get(k)||0)-(b.value.get(k)||0))<1e-10)}

const compact=(raw:string)=>normalizeSuperscripts(raw.replaceAll('＋','+').replaceAll('−','-').replaceAll('×','*').replaceAll('÷','/')).replace(/\s+/g,'');
export type FormRule={expanded?:boolean;order?:'ascending'|'descending'};
export function followsForm(raw:string,rule?:FormRule){
 if(!rule)return true;
 const source=compact(raw);
 if(rule.expanded&&/[()*]/.test(source))return false;
 if(rule.order){
  const chunks=source.replace(/^-/,'').split(/[+-]/).filter(Boolean),degrees=chunks.map(term=>variables.reduce((sum,v)=>{const match=term.match(new RegExp(`${v}(?:\\^(\\d+))?`));return sum+(match?Number(match[1]||1):0)},0)),sorted=[...degrees].sort((a,b)=>rule.order==='ascending'?a-b:b-a);
  if(degrees.some((d,i)=>d!==sorted[i]))return false;
 }
 return true;
}

export function normalizeDisplay(raw:string){
 return raw.replaceAll('-','−').replaceAll('*','×').replace(/\^(\d+)/g,(_,digits)=>String(digits).split('').map(digit=>DIGIT_TO_SUPERSCRIPT[Number(digit)]).join(''));
}
