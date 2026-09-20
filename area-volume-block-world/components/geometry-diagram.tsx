// oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG diagrams need accessible names.
import type { CrossSolid, DiagramSpec, PlaneVariant, ShapeName, SolidVariant } from '@/lib/game';

const line = '#263f33', fill = '#dfeecf', accent = '#e8bf58';
function Text({ x, y, children, anchor = 'middle' }: { x: number; y: number; children: React.ReactNode; anchor?: 'start' | 'middle' | 'end' }) { return <text x={x} y={y} textAnchor={anchor} className="diagram-text">{children}</text>; }
function RightAngle({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) { const d = flip ? `M${x - 12} ${y}v-12h12` : `M${x + 12} ${y}v-12h-12`; return <path d={d} className="diagram-mark" />; }
function Guide({ d, show }: { d: string; show: boolean }) { return show ? <path d={d} className="diagram-guide" /> : null; }
function Dimensions({ labels }: { labels: string[] }) { return <g>{labels.map((label, index) => <Text key={label} x={310} y={246 + index * 20}>{label}</Text>)}</g>; }

function planeLabels(variant: PlaneVariant, v: Record<string, number>) {
  if (variant === 'square') return [`邊長 ${v.a} cm`];
  if (variant === 'rectangle') return [`長 ${v.w} cm　闊 ${v.h} cm`];
  if (variant === 'triangle' || variant === 'parallelogram') return [`底 ${v.b} cm　垂直高 ${v.h} cm`];
  if (variant === 'trapezium') return [`上底 ${v.u} cm　下底 ${v.l} cm　高 ${v.h} cm`];
  if (variant === 'l-notch') return [`外層：${v.w} cm × ${v.h} cm　缺角：${v.cw} cm × ${v.ch} cm`];
  if (variant === 'rectangle-triangle') return [`長方形：${v.w} cm × ${v.h} cm　三角形：底 ${v.b} cm，高 ${v.th} cm`];
  if (variant === 'u-notch') return [`外層：${v.w} cm × ${v.h} cm　中間缺口：${v.nw} cm × ${v.nh} cm`];
  if (variant === 'rectangle-cut') return [`外層：${v.w} cm × ${v.h} cm　缺口三角形：底 ${v.b} cm，高 ${v.th} cm`];
  if (variant === 'trapezium-cut') return [`梯形：上底 ${v.u} cm，下底 ${v.l} cm，高 ${v.h} cm`, `缺口三角形：底 ${v.b} cm，高 ${v.th} cm`];
  if (variant === 'double-notch') return [`外層：${v.w} cm × ${v.h} cm`, `缺角：${v.c1} cm × ${v.d1} cm；${v.c2} cm × ${v.d2} cm`];
  if (variant === 'roof-notch') return [`主體：${v.w} cm × ${v.h} cm　屋頂高 ${v.roof} cm`, `三角形缺口：底 ${v.nw} cm，高 ${v.notch} cm`];
  if (variant === 'double-wing') return [`中央：${v.w} cm × ${v.h} cm`, `左右三角形：底 ${v.b1} cm、${v.b2} cm，高同為 ${v.th} cm`];
  if (variant === 'inscribed') return [`外層：${v.w} cm × ${v.h} cm`, `外圍三角形：${v.b1} cm × ${v.h1} cm；${v.b2} cm × ${v.h2} cm`];
  return [`下層：${v.w} cm × ${v.h1} cm　上層高 ${v.h2} cm`, `上層寬度：${v.w1} cm 及 ${v.w2} cm`];
}

function PlaneDiagram({ variant, values: v, showHint }: { variant: PlaneVariant; values: Record<string, number>; showHint: boolean }) {
  let outline = 'M160 55H450V205H160Z', guides: string[] = [];
  if (variant === 'square') outline = 'M225 45H395V215H225Z';
  if (variant === 'triangle') outline = 'M160 205L350 45L470 205Z';
  if (variant === 'trapezium') outline = 'M220 55H400L480 205H140Z';
  if (variant === 'parallelogram') outline = 'M220 55H450L390 205H160Z';
  if (variant === 'l-notch') { outline = 'M150 45H470V205H150V105H280V45Z'; guides = ['M150 45V205M150 45H470']; }
  if (variant === 'rectangle-triangle') { outline = 'M150 65H340L485 205H150Z'; guides = ['M340 65V205']; }
  if (variant === 'u-notch') { outline = 'M140 45H480V205H360V110H260V205H140Z'; guides = ['M260 45V205M360 45V205']; }
  if (variant === 'rectangle-cut') { outline = 'M140 45H480V205H270L140 125Z'; guides = ['M140 45V205M140 205H480']; }
  if (variant === 'trapezium-cut') { outline = 'M220 45H400L480 205H350L310 145L270 205H140Z'; guides = ['M140 205H480M220 45V205']; }
  if (variant === 'double-notch') { outline = 'M140 45H230V95H390V45H480V205H400V155H220V205H140Z'; guides = ['M140 45H480M140 205H480M230 45V205M390 45V205']; }
  if (variant === 'roof-notch') { outline = 'M140 100L310 35L480 100V205H365L310 155L255 205H140Z'; guides = ['M140 100H480M310 35V205']; }
  if (variant === 'double-wing') { outline = 'M100 205L190 75H420L520 205Z'; guides = ['M190 75V205M420 75V205']; }
  if (variant === 'inscribed') { outline = 'M140 80L310 45L480 110L410 205H210Z'; guides = ['M140 45H480V205H140ZM140 80L210 205M480 110L410 205']; }
  if (variant === 'stepped') { outline = 'M120 205V120H230V55H390V115H500V205Z'; guides = ['M120 120H500M230 55V205M390 55V205']; }
  return <svg className="geometry-svg" viewBox="0 0 620 285" role="img" aria-label="題目平面圖形">
    <path d={outline} fill={fill} stroke={line} strokeWidth="4" strokeLinejoin="round" />
    {guides.map((d, index) => <Guide key={index} d={d} show={showHint} />)}
    {(variant === 'rectangle' || variant === 'square') && <RightAngle x={160 + (variant === 'square' ? 65 : 0)} y={205 + (variant === 'square' ? 10 : 0)} />}
    {['triangle', 'trapezium', 'parallelogram'].includes(variant) && <><path d="M350 45V205" className="diagram-dimension" /><RightAngle x={350} y={205} flip /></>}
    <Dimensions labels={planeLabels(variant, v)} />
  </svg>;
}

function solidLabels(variant: SolidVariant, v: Record<string, number>) {
  if (variant === 'cube') return [`邊長 ${v.a} cm`];
  if (variant === 'cuboid') return [`長 ${v.l} cm　闊 ${v.w} cm　高 ${v.h || '?'} cm${v.area ? `　總表面面積 ${v.area} cm²` : ''}`];
  if (variant === 'triangular-prism') return [`底三角形：底 ${v.b} cm，高 ${v.h} cm${v.s ? `，斜邊 ${v.s} cm` : ''}`, `角柱體的高 ${v.l || '?'} cm${v.volume ? `　體積 ${v.volume} cm³` : ''}`];
  if (variant === 'trapezium-prism') return [`底梯形：${v.u} cm、${v.d} cm，高 ${v.h} cm${v.s ? `，斜邊 ${v.s} cm` : ''}`, `角柱體的高 ${v.l} cm`];
  if (variant === 'parallelogram-prism') return [`底平行四邊形：底 ${v.b} cm，垂直高 ${v.h} cm，斜邊 ${v.s} cm`, `角柱體的高 ${v.l} cm`];
  if (variant === 'given-base-prism') return [`底面積 ${v.area} cm²　角柱體的高 ${v.l || '?'} cm${v.volume ? `　體積 ${v.volume} cm³` : ''}`];
  if (variant === 'u-prism') return [`U 形外層：${v.w} cm × ${v.h} cm　缺口：${v.nw} cm × ${v.nh} cm`, `角柱體的高 ${v.l} cm`];
  if (v.joined) return [`底面：長方形 ${v.w} cm × ${v.h} cm；三角形底 ${v.b} cm，高 ${v.th} cm`, `角柱體的高 ${v.l} cm`];
  return [`L 形外層：${v.w} cm × ${v.h} cm　缺角：${v.cw} cm × ${v.ch} cm`, `角柱體的高 ${v.l} cm`];
}

function SolidDiagram({ variant, values: v, showHint }: { variant: SolidVariant; values: Record<string, number>; showHint: boolean }) {
  const front = variant === 'triangular-prism' ? 'M170 190L250 70L330 190Z' : variant === 'trapezium-prism' ? 'M155 190L190 85H305L345 190Z' : variant === 'parallelogram-prism' ? 'M145 190L205 80H340L280 190Z' : variant === 'l-prism' ? 'M145 65H330V125H255V205H145Z' : variant === 'u-prism' ? 'M140 65H340V205H275V125H205V205H140Z' : 'M155 75H345V205H155Z';
  const dx = 105, dy = -38;
  return <svg className="geometry-svg" viewBox="0 0 620 300" role="img" aria-label="題目角柱體圖形">
    <path d={front} fill={accent} fillOpacity=".72" stroke={line} strokeWidth="4" strokeLinejoin="round" />
    <g transform={`translate(${dx} ${dy})`}><path d={front} fill={fill} stroke={line} strokeWidth="4" strokeLinejoin="round" /></g>
    {front.match(/M|L/g)?.map((_, index) => { const points = front.match(/\d+ \d+/g) ?? []; if (!points[index]) return null; const [x, y] = points[index].split(' ').map(Number); return <line key={index} x1={x} y1={y} x2={x + dx} y2={y + dy} className="solid-edge" />; })}
    {showHint && <path d={front} transform={`translate(${dx} ${dy})`} className="diagram-base-highlight" />}
    <Dimensions labels={solidLabels(variant, v)} />
  </svg>;
}

function CrossSectionDiagram({ solid, parallel, mirror }: { solid: CrossSolid; parallel: boolean; mirror: boolean }) {
  const isRound = solid === 'cylinder' || solid === 'cone' || solid === 'sphere';
  if (solid === 'sphere') return <svg className="geometry-svg" viewBox="0 0 620 270" role="img" aria-label="球形"><circle cx="310" cy="125" r="82" fill={fill} stroke={line} strokeWidth="4"/><ellipse cx="310" cy="125" rx="82" ry="25" className="cut-plane"/><Text x={310} y={235}>不同位置的截面大小不同</Text></svg>;
  if (solid === 'pyramid' || solid === 'cone') return <svg className="geometry-svg" viewBox="0 0 620 270" role="img" aria-label="角錦體或圓錦體"><path d={solid === 'cone' ? 'M310 35L190 205H430Z' : 'M310 35L180 205H440Z'} fill={fill} stroke={line} strokeWidth="4"/><line x1="225" y1="145" x2="395" y2="145" className="cut-plane"/><Text x={310} y={240}>沿高度切割時，截面大小會改變</Text></svg>;
  const front = solid === 'triangular-prism' ? 'M165 190L250 65L335 190Z' : solid === 'trapezium-prism' ? 'M160 190L195 80H310L350 190Z' : solid === 'pentagonal-prism' ? 'M170 120L220 65H300L350 120L325 200H195Z' : 'M165 65H350V205H165Z';
  return <svg className="geometry-svg" viewBox="0 0 620 270" role="img" aria-label="角柱體或圓柱體的截面"><g transform={mirror ? 'translate(620 0) scale(-1 1)' : undefined}>
    {isRound ? <><ellipse cx="255" cy="65" rx="90" ry="28" fill={fill} stroke={line} strokeWidth="4"/><path d="M165 65V195M345 65V195" className="solid-edge"/><ellipse cx="255" cy="195" rx="90" ry="28" fill={fill} stroke={line} strokeWidth="4"/></> : <><path d={front} fill={fill} stroke={line} strokeWidth="4"/><g transform="translate(105 -35)"><path d={front} fill="#eef6e5" stroke={line} strokeWidth="4"/></g><line x1="165" y1="190" x2="270" y2="155" className="solid-edge"/><line x1="250" y1="65" x2="355" y2="30" className="solid-edge"/><line x1="335" y1="190" x2="440" y2="155" className="solid-edge"/></>}
    <path d={parallel ? 'M180 125H430' : 'M250 45L360 205'} className="cut-plane" /></g>
    <Text x={310} y={250}>{parallel ? '切割平面平行於底' : '切割平面不平行於底'}</Text>
  </svg>;
}

export function ShapeIcon({ shape }: { shape: ShapeName }) {
  return <svg className="shape-icon" viewBox="0 0 100 70" aria-hidden="true">
    {shape === 'circle' ? <circle cx="50" cy="35" r="27" /> : shape === 'triangle' ? <path d="M50 7L90 63H10Z" /> : shape === 'trapezium' ? <path d="M28 9H72L92 62H8Z" /> : shape === 'parallelogram' ? <path d="M28 8H92L72 62H8Z" /> : <rect x={shape === 'square' ? 22 : 10} y="8" width={shape === 'square' ? 56 : 80} height="54" />}
  </svg>;
}

export default function GeometryDiagram({ diagram, showHint = false }: { diagram: DiagramSpec; showHint?: boolean }) {
  return <div className="diagram-wrap">{diagram.family === 'plane' ? <PlaneDiagram variant={diagram.variant} values={diagram.values} showHint={showHint} /> : diagram.family === 'solid' ? <SolidDiagram variant={diagram.variant} values={diagram.values} showHint={showHint} /> : <CrossSectionDiagram solid={diagram.solid} parallel={diagram.parallel} mirror={diagram.mirror} />}</div>;
}
