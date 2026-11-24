import {Chess} from '/vendor/chess.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let CH=[],flip=true,mode='study',PM={},ST={},S={c:0,l:0,k:0},P=null,ACC=new Map();
try{ST=JSON.parse(localStorage.getItem('sic')||'{}')}catch{}
const save=()=>{try{localStorage.setItem('sic',JSON.stringify(ST))}catch{}};
const norm=s=>s.replace(/[+#!?]/g,'');
const sqn=(x,y)=>String.fromCharCode(97+x)+(8-y);
const xy=s=>{const f=s.charCodeAt(0)-97,r=+s[1];return flip?[7-f,r-1]:[f,8-r]};
const pn=c=>(c===c.toUpperCase()?'w':'b')+c.toUpperCase();
function build(){const b=$('#sqs');b.innerHTML='';
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const f=flip?7-x:x,r=flip?y+1:8-y,d=document.createElement('div');
    d.className='q '+((f+r)%2?'d':'l');d.dataset.s=String.fromCharCode(97+f)+r;
    d.innerHTML=(x?'':`<i class="r">${r}</i>`)+(y<7?'':`<i class="f">${String.fromCharCode(97+f)}</i>`);b.appendChild(d)}
  for(const s in PM)place(PM[s],s)}
function place(e,s){const[x,y]=xy(s);e.style.left=x*12.5+'%';e.style.top=y*12.5+'%'}
function parse(fen){const o={};fen.split(' ')[0].split('/').forEach((r,y)=>{let x=0;for(const c of r){if(/\d/.test(c))x+=+c;else o[sqn(x++,y)]=c}});return o}
function pieces(fen,anim){const nb=parse(fen),old={};for(const s in PM)old[s]=PM[s].dataset.p;
  $('#pcs').classList.toggle('nt',!anim);
  const gone=Object.keys(old).filter(s=>nb[s]!==old[s]),app=Object.keys(nb).filter(s=>old[s]!==nb[s]),mv=[];
  app.forEach(a=>{let bi=-1,bd=1e9;gone.forEach((g,i)=>{if(old[g]===nb[a]){const d=Math.abs(g.charCodeAt(0)-a.charCodeAt(0))+Math.abs(g[1]-a[1]);if(d<bd){bd=d;bi=i}}});mv.push([a,bi>=0?gone.splice(bi,1)[0]:null])});
  gone.forEach(g=>{const e=PM[g];delete PM[g];e.classList.add('out');setTimeout(()=>e.remove(),260)});
  const els=mv.map(([a,g])=>g&&PM[g]);mv.forEach(([a,g])=>{if(g)delete PM[g]});
  mv.forEach(([a,g],i)=>{let e=els[i];if(!e){e=document.createElement('div');e.className='pc in';e.dataset.p=nb[a];e.style.backgroundImage=`url(pieces/${pn(nb[a])}.svg)`;place(e,a);$('#pcs').appendChild(e)}else{e.classList.remove('land');void e.offsetWidth;e.classList.add('land');place(e,a)}PM[a]=e})}
function hl(u){$$('.q').forEach(e=>e.classList.toggle('h',!!u&&(e.dataset.s===u.slice(0,2)||e.dataset.s===u.slice(2,4))))}
function mark(sq,c){const e=$(`.q[data-s="${sq}"]`);e&&e.classList.add(c)}
function unmark(c){$$('.q.'+c).forEach(e=>e.classList.remove(c))}
function arrow(u){const a=$('#arr');a.querySelectorAll('line').forEach(e=>e.remove());if(!u)return;
  const p=s=>{const[x,y]=xy(s);return[x+.5,y+.5]},[x1,y1]=p(u.slice(0,2)),[x2,y2]=p(u.slice(2,4));
  a.insertAdjacentHTML('beforeend',`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f5b942" stroke-width=".18" opacity=".9" marker-end="url(#m)"/>`)}
// ---- som simples
let ac;const tone=(f,d,v)=>{try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;o.frequency.setValueAtTime(f,n);o.frequency.exponentialRampToValueAtTime(f/2,n+d);g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(ac.destination);o.start(n);o.stop(n+d)}catch{}};
const snd=m=>tone(m&&m.captured?140:200,.12,.5);
// ---- dados
const lineInfo=l=>l._i||(l._i=(()=>{const g=new Chess(),f=[g.fen()],mv=[null];for(const[san]of l.mv){const m=g.move(san);f.push(g.fen());mv.push(m)}return{f,mv}})());
const numOf=k=>Math.ceil(k/2)+(k%2?'.':'...');
async function init(){CH=await(await fetch('siciliana.json')).json();
  CH.forEach(c=>(c.lines||[]).forEach((l,i)=>{l.id=c.id+':'+i;l.c=c;const p=[];l.mv.forEach(([san],j)=>{if(j%2){const k=p.join(' ');(ACC.get(k)||ACC.set(k,new Map()).get(k)).set(norm(san),san)}p.push(norm(san))})}));
  build();pieces(new Chess().fen(),false);
  $('#scope').innerHTML='<option value="all">Todas as linhas (aleatório)</option>'+CH.filter(c=>c.lines).map(c=>`<option value="${c.id}">${c.t}</option>`).join('');
  renderToc();openCh(0);stats()}
function renderToc(){let g='',h='';CH.forEach((c,i)=>{if(c.g!==g){g=c.g;h+=`<small>${g}</small>`}h+=`<button data-c="${i}" class="${i===S.c?'on':''}">${c.t}${c.sub?` <small>· ${c.sub}</small>`:''}</button>`});$('#toc').innerHTML=h}
function openCh(i){S.c=i;S.l=0;const c=CH[i];S.k=c.kind==='txt'?0:(c.lines[0].ini||0);renderToc();study()}
function study(){const c=CH[S.c];unmark('sel');unmark('mv');arrow(null);
  if(c.kind==='txt'){pieces(new Chess().fen(),false);hl(null);const n=c.slides.length,s=c.slides[S.k];
    $('#sx').innerHTML=`<b class="st">${s[0]}</b> <small>(${S.k+1}/${n})</small><p>${s[1]}</p>`;$('#ml2').innerHTML='';$('#pl').innerHTML='';return}
  const l=c.lines[S.l],I=lineInfo(l),k=S.k,m=I.mv[k];
  pieces(I.f[k],true);hl(m&&m.from+m.to);if(m)snd(m);
  $('#sx').innerHTML=k===0?`<b>Posição inicial</b><p>${c.sub||''} Use ▶ (ou a seta →) para ver cada lance e a ideia por trás dele. Pode voltar quantas vezes quiser.</p>`
    :`<b><span class="st">${numOf(k)} ${l.mv[k-1][0]}</span></b><p>${l.mv[k-1][1]}</p>${k===l.mv.length?'<p>🧭 <b>Fim da linha.</b> Veja os planos abaixo e depois treine em “Praticar”.</p>':''}`;
  let h='';l.mv.forEach(([san],j)=>{if(j%2===0)h+=`<span class="n">${j/2+1}.</span>`;h+=`<span data-k="${j+1}" class="${j+1===k?'on':''}">${san}</span>`});$('#ml2').innerHTML=h;
  $('#pl').innerHTML=`<b>🧭 Planos depois que as peças estão no lugar</b>`+c.planos.map(([a,b])=>`<p><b>${a}:</b> ${b}</p>`).join('')}
function go(n){const c=CH[S.c],max=c.kind==='txt'?c.slides.length-1:c.lines[S.l].mv.length;
  S.k=n==='s'?0:n==='e'?max:Math.max(0,Math.min(max,S.k+(n==='n'?1:-1)));study()}
// ---- praticar
const allLines=sc=>CH.filter(c=>c.lines&&(sc==='all'||c.id===sc)).flatMap(c=>c.lines);
const msg=h=>$('#ps').innerHTML=h;
function startPractice(){const L=allLines($('#scope').value);if(!L.length)return;
  const g=new Chess();P={g,path:[],L,line:L[Math.floor(Math.random()*L.length)],errs:0,erred:new Set(),sel:null,busy:true,done:false};
  pieces(g.fen(),false);hl(null);arrow(null);unmark('sel');unmark('mv');unmark('bad');msg('Você joga de <b>Pretas</b>. Aguarde o primeiro lance...');setTimeout(white,500)}
function white(){if(!P||P.done)return;const i=P.path.length,l=P.line.mv;
  if(i>=l.length)return finish();
  if(i%2===0){const m=P.g.move(l[i][0]);P.path.push(norm(m.san));pieces(P.g.fen(),true);hl(m.from+m.to);snd(m);
    if(P.path.length>=l.length)return finish()}
  P.busy=false;msg('Sua vez, de <b>Pretas</b>.')}
function pick(){const pre=P.path,c=P.L.filter(x=>x.mv.length>pre.length&&pre.every((s,i)=>norm(x.mv[i][0])===s));
  if(c.length)return c[Math.floor(Math.random()*c.length)];
  const a=allLines('all').filter(x=>x.mv.length>pre.length&&pre.every((s,i)=>norm(x.mv[i][0])===s));return a.length?a[0]:null}
function sel(s){unmark('sel');unmark('mv');P.sel=s;if(!s)return;mark(s,'sel');P.g.moves({square:s,verbose:true}).forEach(m=>mark(m.to,'mv'))}
$('#sqs').addEventListener('click',e=>{const q=e.target.closest('.q');if(!q||mode!=='practice'||!P||P.busy||P.done)return;const s=q.dataset.s;
  if(P.sel&&P.g.moves({square:P.sel,verbose:true}).some(m=>m.to===s))return attempt(P.sel,s);
  const p=P.g.get(s);sel(p&&p.color==='b'&&s!==P.sel?s:null)});
function attempt(from,to){P.busy=true;sel(null);arrow(null);unmark('bad');
  const m=P.g.move({from,to,promotion:'q'}),acc=ACC.get(P.path.join(' '))||new Map();pieces(P.g.fen(),true);snd(m);
  if(acc.has(norm(m.san))){P.path.push(norm(m.san));hl(from+to);unmark('okk');mark(to,'okk');setTimeout(()=>unmark('okk'),500);
    const nl=pick();if(!nl)return finish();P.line=nl;if(P.path.length>=nl.mv.length)return finish();setTimeout(white,550);return}
  if(!P.erred.has(P.path.length)){P.erred.add(P.path.length);P.errs++}
  const want=P.line.mv[P.path.length][0],show=acc.size?(acc.has(norm(want))?want:[...acc.values()][0]):want;
  mark(from,'bad');mark(to,'bad');msg(`❌ <b>Você errou.</b> O lance da Siciliana aqui é <b>${show}</b>. Tente de novo.`);
  setTimeout(()=>{P.g.undo();unmark('bad');pieces(P.g.fen(),true);hl(null);
    try{const t=new Chess(P.g.fen()).move(show);if(t)arrow(t.from+t.to)}catch{}P.busy=false},900)}
function finish(){P.done=true;P.busy=true;sel(null);arrow(null);const id=P.line.id,s=ST[id]||(ST[id]={runs:0,clean:0,err:0});
  s.runs++;s.err+=P.errs;if(!P.errs)s.clean++;save();stats();
  msg(`🎉 <b>Linha concluída:</b> ${P.line.c.t}.<br>${P.errs?`Você errou ${P.errs} vez(es). Repita até zerar os erros.`:'Sem nenhum erro! 👏'}<div class="row" style="margin-top:8px"><button id="nx">🎯 Próxima linha</button><button id="st">📖 Estudar esta linha</button></div>`);
  $('#nx').onclick=startPractice;$('#st').onclick=()=>{setMode('study');openCh(CH.indexOf(P.line.c))}}
function stats(){$('#pst').innerHTML=CH.filter(c=>c.lines).map(c=>{const s=ST[c.id+':0']||{runs:0,clean:0,err:0};
  return`<div><span>${c.t}</span><span>${s.clean>=3?'🏆 dominada':s.clean?`✅ ${s.clean}x sem erro`:s.runs?`🔁 ${s.runs}x, ${s.err} erro(s)`:'—'}</span></div>`}).join('')+'<p style="font-size:12px;color:var(--m)">Dominada = 3 execuções sem erro.</p>'}
function setMode(m){mode=m;$('#tS').classList.toggle('on',m==='study');$('#tP').classList.toggle('on',m==='practice');
  $('#pStudy').hidden=m!=='study';$('#pPrac').hidden=m!=='practice';$('#nav').querySelectorAll('[data-n]').forEach(b=>b.hidden=m!=='study');
  arrow(null);unmark('sel');unmark('mv');unmark('bad');
  if(m==='study')study();else{P=null;pieces(new Chess().fen(),false);hl(null);msg('Escolha o conjunto de linhas e clique em Começar.')}}
$('#tS').onclick=()=>setMode('study');$('#tP').onclick=()=>setMode('practice');$('#start').onclick=startPractice;
$('#toc').onclick=e=>{const b=e.target.closest('button[data-c]');if(b)openCh(+b.dataset.c)};
$('#ml2').onclick=e=>{const s=e.target.closest('span[data-k]');if(s){S.k=+s.dataset.k;study()}};
$$('#nav [data-n]').forEach(b=>b.onclick=()=>go(b.dataset.n));
$('#flip').onclick=()=>{flip=!flip;build();if(P&&mode==='practice')hl(null)};
document.addEventListener('keydown',e=>{if(mode!=='study')return;if(e.key==='ArrowRight')go('n');if(e.key==='ArrowLeft')go('p')});
init().catch(e=>{$('#sx').innerHTML='<b>Erro ao carregar:</b><p>'+e.message+'</p>'});
