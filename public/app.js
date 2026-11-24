const $=s=>document.querySelector(s),L={brilliant:'Brilhante',great:'Ótimo',best:'Melhor',excellent:'Excelente',good:'Ok',inaccuracy:'Imprecisão',mistake:'Erro',blunder:'Capivarada',book:'Livro'};
const SY={brilliant:'!!',great:'!',best:'★',excellent:'👍',good:'✓',inaccuracy:'?!',mistake:'?',blunder:'??',book:'📖'};
const MSG={brilliant:'Sacrifício brilhante!',great:'Lance único, o melhor da posição.',best:'Melhor lance da posição.',excellent:'Quase tão bom quanto o melhor.',good:'Lance ok.',inaccuracy:'Imprecisão.',mistake:'Erro.',blunder:'Capivarada! Lance muito ruim.',book:'Lance de livro.'};
let SQ=[],EQ=[],D,cur=0,tm=0,mute=false,ac;const PM={};
const A=()=>ac||(ac=new(window.AudioContext||window.webkitAudioContext)());
function tone(f,t,d,v,ty,f2){const a=A(),o=a.createOscillator(),g=a.createGain(),n=a.currentTime+t;o.type=ty||'sine';o.frequency.setValueAtTime(f,n);if(f2)o.frequency.exponentialRampToValueAtTime(f2,n+d);g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(a.destination);o.start(n);o.stop(n+d)}
function click(t,v,fr){const a=A(),b=a.createBuffer(1,a.sampleRate*.04,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();f.type='bandpass';f.frequency.value=fr;g.gain.value=v;s.buffer=b;s.connect(f);f.connect(g);g.connect(a.destination);s.start(a.currentTime+t)}
function sound(m){if(mute||!m)return;const s=m.san;
  if(s.includes('O-O')){tone(150,0,.1,.6,'sine',70);click(0,1.2,1500);tone(170,.13,.1,.6,'sine',80);click(.13,1.2,1700)}
  else if(s.includes('x')){tone(120,0,.16,.9,'sine',50);click(0,2,1100);click(.03,1.2,2200)}
  else{tone(180,0,.1,.7,'sine',80);click(0,1.6,1900)}
  if(/[+#]/.test(s))tone(880,.08,.25,.12,'triangle');
  if(m.cls==='brilliant')[880,1175,1568].forEach((f,i)=>tone(f,.15+i*.07,.35,.13));
  if(m.cls==='blunder')tone(200,.15,.3,.15,'sawtooth',90)}
const sqn=(x,y)=>String.fromCharCode(97+x)+(8-y),xy=s=>[s.charCodeAt(0)-97,8-s[1]];
for(let y=0;y<8;y++)for(let x=0;x<8;x++){const d=document.createElement('div');d.className='q '+((x+y)%2?'d':'l');d.dataset.s=sqn(x,y);d.innerHTML=(x?'':`<i class="r">${8-y}</i>`)+(y<7?'':`<i class="f">${String.fromCharCode(97+x)}</i>`);$('#sqs').appendChild(d)}
function parse(fen){const o={};fen.split(' ')[0].split('/').forEach((r,y)=>{let x=0;for(const c of r){if(/\d/.test(c))x+=+c;else o[sqn(x++,y)]=c}});return o}
function place(e,s){const[x,y]=xy(s);e.style.left=x*12.5+'%';e.style.top=y*12.5+'%'}
const pn=c=>(c===c.toUpperCase()?'w':'b')+c.toUpperCase();
function pieces(fen,anim){const nb=parse(fen),old={};for(const s in PM)old[s]=PM[s].dataset.p;
  $('#pcs').classList.toggle('nt',!anim);
  const gone=Object.keys(old).filter(s=>nb[s]!==old[s]),app=Object.keys(nb).filter(s=>old[s]!==nb[s]),mv=[];
  app.forEach(a=>{let bi=-1,bd=1e9;gone.forEach((g,i)=>{if(old[g]===nb[a]){const d=Math.abs(g.charCodeAt(0)-a.charCodeAt(0))+Math.abs(g[1]-a[1]);if(d<bd){bd=d;bi=i}}});mv.push([a,bi>=0?gone.splice(bi,1)[0]:null])});
  gone.forEach(g=>{const e=PM[g];delete PM[g];e.classList.add('out');setTimeout(()=>e.remove(),260)});
  const els=mv.map(([a,g])=>g&&PM[g]);mv.forEach(([a,g])=>{if(g)delete PM[g]});
  mv.forEach(([a,g],i)=>{let e=els[i];if(!e){e=document.createElement('div');e.className='pc in';e.dataset.p=nb[a];e.style.backgroundImage=`url(pieces/${pn(nb[a])}.svg)`;place(e,a);$('#pcs').appendChild(e)}else{e.classList.remove('land');void e.offsetWidth;e.classList.add('land');place(e,a)}PM[a]=e})}
const wpc=cp=>50+50*(2/(1+Math.exp(-0.00368208*Math.max(-1500,Math.min(1500,cp))))-1);
const cpTxt=c=>Math.abs(c)>=9000?'#':(c>=0?'+':'')+(c/100).toFixed(1);
function hl(u){document.querySelectorAll('.q').forEach(e=>e.classList.toggle('h',!!u&&(e.dataset.s===u.slice(0,2)||e.dataset.s===u.slice(2,4))))}
function seqHtml(s,t,r){if(!s||!s.length)return'';const R=r==='e'?EQ:SQ;R.push(s);const q=R.length-1;
  return`<div class="sqs"><div class="sqt">${t||'Veja a sequência (clique em cada lance):'}</div><div class="sq back" data-r="${r}" data-q="${q}" data-k="-1">↩ voltar ao tabuleiro da partida</div>`+s.map((x,k)=>`<div class="sq" data-r="${r}" data-q="${q}" data-k="${k}">${x.t}</div>`).join('')+'</div>'}
const expl=(x,r)=>x?(x.p||[]).map(t=>`<p>${t}</p>`).join('')+seqHtml(x.s,x.st,r):'';
function show(i){const prev=cur;cur=Math.max(0,Math.min(D.moves.length,i));const m=D.moves[cur-1];
  pieces(m?m.fen:D.start,Math.abs(cur-prev)<=1);
  hl(m&&m.uci);
  const a=$('#arr');a.querySelectorAll('line').forEach(e=>e.remove());
  if(m&&m.best&&m.bestSan&&!['best','book','brilliant','great'].includes(m.cls)){const p=u=>[u.charCodeAt(0)-96-.5,8-u[1]+.5],[x1,y1]=p(m.best.slice(0,2)),[x2,y2]=p(m.best.slice(2,4));a.insertAdjacentHTML('beforeend',`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f5b942" stroke-width=".18" opacity=".85" marker-end="url(#m)"/>`)}
  if(m){const[x,y]=xy(m.uci.slice(2));$('#bg').innerHTML=`<div class="bdg ${m.cls}" style="left:calc(${(x+1)*12.5}% - var(--b) - 1px);top:calc(${y*12.5}% + 1px)">${SY[m.cls]}</div>`}else $('#bg').innerHTML='';
  const cp=m?m.cp:D.startCp;$('#barw').style.height=wpc(cp)+'%';$('#bt').textContent=cpTxt(cp);
  const o=D.moves.slice(0,cur).reverse().find(x=>x.op);$('#op').textContent=o?`${o.eco} · ${o.op}`:'';
  SQ=[];$('#cm').innerHTML=m?`<b><span class="s ${m.cls}">${SY[m.cls]}</span> ${Math.ceil(cur/2)}${m.color==='w'?'.':'...'} ${m.san} — ${L[m.cls]}</b>${m.ex&&m.ex.p&&m.ex.p.length?expl(m.ex,'m'):`<p>${MSG[m.cls]}</p>`}<p class="ev">Avaliação do computador: ${cpTxt(cp)}</p>`:'<p>Posição inicial. Clique num lance da lista (ou use as setas) para ver a explicação de cada jogada.</p>';
  document.querySelectorAll('.mv').forEach(e=>e.classList.toggle('on',+e.dataset.i===cur));
  const on=document.querySelector('.mv.on');if(on)on.scrollIntoView({block:'nearest'});graph();
  if(cur!==prev)sound(cur>prev?m:D.moves[prev-1])}
function graph(){const n=D.moves.length,pts=D.moves.map((m,i)=>`${(i+1)/n*300},${60-wpc(m.cp)*.6}`).join(' ');
  $('#gr').innerHTML=`<polygon points="0,60 ${pts} 300,60" fill="#dfe6ea" opacity=".85"/><line x1="0" x2="300" y1="30" y2="30" stroke="#666" stroke-width=".5"/>${cur?`<line x1="${cur/n*300}" x2="${cur/n*300}" y1="0" y2="60" stroke="#f5b942" stroke-width="1.5"/>`:''}`}
function render(d){D=d;const h=d.headers;
  $('#top').innerHTML=`<span>⚫ ${h.Black||'Pretas'} <small>${h.BlackElo||''}</small></span><small>${h.Result||''}</small>`;
  $('#bot').innerHTML=`<span>⚪ ${h.White||'Brancas'} <small>${h.WhiteElo||''}</small></span><small>${(d.ms/1000).toFixed(1)}s · ${d.engines} motor(es)</small>`;
  const ks=['brilliant','great','best','excellent','good','inaccuracy','mistake','blunder'];
  $('#sm').innerHTML=`<span class="h">Precisão</span><span class="h">⚪ ${d.acc.w}</span><span class="h">⚫ ${d.acc.b}</span>`+ks.map(k=>`<span class="c"><span class="s ${k}">${SY[k]}</span>${L[k]}</span><span>${d.cnt.w[k]||0}</span><span>${d.cnt.b[k]||0}</span>`).join('');
  let l='';d.moves.forEach((m,i)=>{if(i%2===0)l+=`<span class="n">${i/2+1}.</span>`;l+=`<span class="mv" data-i="${i+1}"><span class="s ${m.cls}">${SY[m.cls]}</span>${m.san}</span>`});
  if(d.moves.length%2)l+='<span></span>';$('#ml').innerHTML=l;
  EQ=[];$('#en').innerHTML=d.end?`<b>🏁 ${d.end.t}</b>${expl(d.end,'e')}`:'';$('#pcs').innerHTML='';for(const k in PM)delete PM[k];cur=0;$('#in').hidden=true;$('#out').hidden=false;show(0)}
$('#go').onclick=async()=>{const b=$('#go');b.disabled=true;$('#err').textContent='';let res;
  try{const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pgn:$('#pgn').value})}),rd=r.body.getReader(),td=new TextDecoder();let buf='';
    for(;;){const{done,value}=await rd.read();if(done)break;buf+=td.decode(value,{stream:true});let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+1);if(!l)continue;const o=JSON.parse(l);if(o.error)throw new Error(o.error);if(o.p!=null){const p=Math.round(o.p*100);b.textContent=`Analisando ${p}%`;b.style.background=`linear-gradient(90deg,#f5b942 ${p}%,#7a5f21 ${p}%)`}if(o.r)res=o.r}}
    if(res)render(res)}catch(e){$('#err').textContent='Erro: '+e.message}
  b.disabled=false;b.textContent='Analisar';b.style.background=''};
$('#back').onclick=()=>{clearInterval(tm);tm=0;$('#out').hidden=true;$('#in').hidden=false};
$('#ml').onclick=e=>{const t=e.target.closest('.mv');if(t)show(+t.dataset.i)};
$('#gr').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();show(Math.round((e.clientX-r.left)/r.width*D.moves.length))};
$('#mute').onclick=e=>{mute=!mute;e.target.textContent=mute?'🔇':'🔊'};
$('#play').onclick=e=>{if(tm){clearInterval(tm);tm=0;e.target.textContent='▶▶';return}e.target.textContent='⏸';if(cur>=D.moves.length)show(0);tm=setInterval(()=>{if(cur>=D.moves.length){clearInterval(tm);tm=0;$('#play').textContent='▶▶'}else show(cur+1)},1000)};
document.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>show({s:0,p:cur-1,n:cur+1,e:1e9}[b.dataset.n]));
document.onkeydown=e=>{if(!D||$('#out').hidden)return;if(e.key==='ArrowLeft')show(cur-1);if(e.key==='ArrowRight')show(cur+1)};
document.addEventListener('click',e=>{const t=e.target.closest('.sq');if(!t)return;const k=+t.dataset.k;
  if(k<0){show(cur);return}
  const x=(t.dataset.r==='e'?EQ:SQ)[+t.dataset.q][k];if(!x)return;
  pieces(x.fen,true);hl(x.uci);$('#arr').querySelectorAll('line').forEach(l=>l.remove());$('#bg').innerHTML='';
  document.querySelectorAll('.sq').forEach(y=>y.classList.toggle('on',y===t))});
