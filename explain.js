// Gera explicações em português, para leigos, de cada lance e do fim da partida.
const {Chess}=require('chess.js');
const NM={p:'peão',n:'cavalo',b:'bispo',r:'torre',q:'dama',k:'rei'},AR={p:'o',n:'o',b:'o',r:'a',q:'a',k:'o'};
const VAL={p:1,n:3,b:3,r:5,q:9,k:0},AV={...VAL,k:99};
const IND={p:'um peão',n:'um cavalo',b:'um bispo',r:'uma torre',q:'uma dama'};
const cap=s=>s[0].toUpperCase()+s.slice(1),pc=t=>`${AR[t]} ${NM[t]}`,PC=t=>cap(pc(t));
const opp=c=>c==='w'?'b':'w',SIDE={w:'Brancas',b:'Pretas'},sd=c=>c==='w'?'as Brancas':'as Pretas';
const lc=n=>`${n} lance${n===1?'':'s'}`,pts=n=>`${n} ponto${n===1?'':'s'}`;
const list=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' e '+a[a.length-1];
const names=a=>list(a.map(t=>IND[t]));
const esc=s=>String(s||'').replace(/[<>&]/g,'');
const wp=cp=>50+50*(2/(1+Math.exp(-0.00368208*Math.max(-1500,Math.min(1500,cp))))-1);
const stat=w=>w>=90?'totalmente ganha':w>=70?'bem melhor':w>=57?'um pouco melhor':w>=43?'equilibrada':w>=30?'um pouco pior':w>=10?'bem pior':'perdida';
const play=(c,u)=>{try{return c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]})}catch{return null}};

function say(m){let s;
  if(m.flags.includes('k')||m.flags.includes('q'))s=`o rei faz o roque ${m.flags.includes('k')?'curto':'longo'} (esconde o rei e coloca a torre em jogo)`;
  else{s=m.captured?`${pc(m.piece)} captura ${pc(m.captured)} em ${m.to}`:`${pc(m.piece)} vai para ${m.to}`;
    if(m.flags.includes('e'))s+=' ("en passant")';
    if(m.promotion)s+=` e vira ${pc(m.promotion)}`}
  return s+(m.san.endsWith('#')?' e dá xeque-mate':m.san.includes('+')?' e dá xeque':'')}
const stp=(m,fen)=>({t:`${SIDE[m.color]}: <b>${m.san}</b> — ${cap(say(m))}`,fen,uci:m.from+m.to});

// joga uma sequência de lances (UCI) a partir de uma posição
function line(fen,pv,max){
  if(!pv||!pv.length)return null;
  const c=new Chess(fen),st=[];
  for(const u of pv.slice(0,max)){const m=play(c,u);if(!m)break;st.push({m,fen:c.fen()});if(c.isGameOver())break}
  if(!st.length)return null;
  const mate=c.isCheckmate();let n=st.length;
  if(!mate){let l=-1;st.forEach((s,i)=>{if(s.m.captured)l=i});n=l>=0?l+1:Math.min(n,3)}
  return{st:st.slice(0,n),mate}}
const seqOf=l=>l.st.map(s=>stp(s.m,s.fen));
function tally(st,col){const g=[],l=[];st.forEach(({m})=>{if(m.captured)(m.color===col?g:l).push(m.captured)});
  return{g,l,net:g.reduce((a,t)=>a+VAL[t],0)-l.reduce((a,t)=>a+VAL[t],0)}}

// peças de `col` que o adversário pode capturar com lucro
function danger(c,col){const o=[];
  for(const p of c.board().flat()){if(!p||p.color!==col||p.type==='k')continue;
    const at=c.attackers(p.square,opp(col));if(!at.length)continue;
    const df=c.attackers(p.square,col).length,mn=Math.min(...at.map(s=>AV[c.get(s).type]));
    if(!df||mn<VAL[p.type])o.push({sq:p.square,t:p.type})}
  return o}

// "o que esse lance faz?" em frases curtas
function why(fen,u){
  const b=new Chess(fen),c=new Chess(fen),m=play(c,u);if(!m)return[];
  const col=m.color,o=[];
  if(m.san.endsWith('#'))return['dá xeque-mate'];
  if(b.inCheck())o.push('tira o rei do xeque');
  if(m.captured)o.push(!m.flags.includes('e')&&!b.attackers(m.to,opp(col)).length?`captura ${pc(m.captured)} que estava sem proteção`:VAL[m.captured]>VAL[m.piece]?`captura ${pc(m.captured)}, uma troca vantajosa`:`captura ${pc(m.captured)}`);
  if(m.promotion)o.push('promove o peão a '+pc(m.promotion));
  if(m.flags.includes('k')||m.flags.includes('q'))o.push('coloca o rei em segurança com o roque');
  if(m.san.includes('+'))o.push('dá xeque, obrigando o adversário a responder');
  const d1=danger(c,col).map(x=>x.sq);
  danger(b,col).forEach(d=>{const s=d.sq===m.from?m.to:d.sq;
    if(!d1.includes(s)&&o.length<4)o.push(d.sq===m.from?`tira ${pc(d.t)} do ataque`:`protege ${pc(d.t)} em ${d.sq}, que estava ameaçad${AR[d.t]}`)});
  const t0=danger(b,opp(col)).map(x=>x.sq),nt=danger(c,opp(col)).filter(x=>!t0.includes(x.sq));
  if(nt.length>1)o.push(`ataca ${list(nt.slice(0,3).map(x=>pc(x.t)+' em '+x.sq))} ao mesmo tempo (o adversário só consegue salvar um)`);
  else if(nt.length)o.push(`ameaça capturar ${pc(nt[0].t)} em ${nt[0].sq}`);
  if(!o.length)o.push(m.piece!=='p'&&m.piece!=='k'&&(m.from[1]==='1'||m.from[1]==='8')?'coloca uma peça em jogo (desenvolvimento)':m.piece==='p'&&['d4','e4','d5','e5'].includes(m.to)?'ocupa o centro do tabuleiro':'melhora a posição das peças');
  return o.slice(0,3)}

// por que a primeira resposta do adversário é tão forte?
function hit(m,s0){
  const x=s0.m;if(!x.captured||x.flags.includes('e'))return null;
  const c=new Chess(m.after),b=new Chess(m.before),def=c.attackers(x.to,m.color).length;
  if(x.to!==m.to&&!def&&b.attackers(x.to,m.color).includes(m.from))
    return `${PC(m.piece)} que você mexeu era quem protegia ${pc(x.captured)} em ${x.to}. Sem essa proteção, ${pc(x.captured)} ficou solt${AR[x.captured]} e o adversário captura.`;
  if(!def)return `${PC(x.captured)} em ${x.to} ficou sem nenhuma proteção: o adversário simplesmente captura de graça.`;
  if(VAL[x.captured]>VAL[x.piece])return `${PC(x.captured)} em ${x.to} vale ${pts(VAL[x.captured])} e pode ser capturad${AR[x.captured]} por ${pc(x.piece)}, que vale só ${pts(VAL[x.piece])}: mesmo recapturando, você sai perdendo na troca.`;
  return null}

function explain(x){
  const{m,evB,evA,cls,wB,wA,w2,bestSan,isBest,loss,book}=x,col=m.color,o=opp(col),P=[];let S=null,T='';
  const mB=evB&&evB.mate>0?evB.mate:0,mA=evA&&evA.mate>0?evA.mate:0,mF=evA&&evA.mate<0?-evA.mate:0;
  const first=stp(m,m.after);
  const after=max=>{const l=line(m.after,evA&&evA.pv,max);return l&&{l,seq:[first,...seqOf(l)]}};
  const bestL=max=>{const l=line(m.before,evB&&evB.pv,max);return l&&{l,seq:seqOf(l)}};
  const bw=evB&&evB.best?why(m.before,evB.best):[],wm=why(m.before,m.from+m.to+(m.promotion||''));

  if(m.san.endsWith('#')){
    P.push(`Xeque-mate! Depois que ${pc(m.piece)} vai para ${m.to}, o rei adversário está em xeque e não tem saída: não pode fugir, nem capturar quem o ataca, nem bloquear o caminho. A partida acaba aqui.`);
    return{p:P}}

  if(cls==='book'){
    P.push(`Lance de livro: faz parte de uma abertura bem conhecida${book?` (${esc(book)})`:''}. Os jogadores estudam essa sequência há muito tempo, por isso ela não é julgada como acerto nem erro.`)}

  else if(cls==='brilliant'){
    const c=new Chess(m.after),at=c.attackers(m.to,o).map(s=>c.get(s).type).sort((a,b)=>AV[a]-AV[b])[0];
    P.push(`Sacrifício! ${cap(sd(col))} colocam ${pc(m.piece)} (vale ${pts(VAL[m.piece])}) em ${m.to}, onde pode ser capturad${AR[m.piece]}${at?` por ${pc(at)} adversári${AR[at]}`:''}. Dar uma peça de propósito parece um erro, mas aqui é uma isca: o que se ganha em troca vale mais do que o que se perde.`);
    const r=after(mF?2*mF+1:6);
    if(r){const acc=r.l.st[0].m.captured&&r.l.st[0].m.to===m.to;
      P.push(acc?'Se o adversário aceitar e capturar, veja o que acontece:':'O adversário pode até recusar o sacrifício, mas a continuação mais provável é:');S=r.seq;
      if(r.l.mate||mF)P.push(`No fim, ${sd(col)} dão xeque-mate${mF?` em ${lc(mF)}`:''}. Todo o material entregue foi só o preço desse ataque.`);
      else{const net=tally(r.l.st,col).net+(m.captured?VAL[m.captured]:0);
        P.push(net>=0?`Ao final dessa sequência, ${sd(col)} recuperam o que entregaram e ainda ficam com a posição melhor (${wA}% de chance de vitória).`
          :`Mesmo ficando com ${pts(-net)} de material a menos, ${sd(col)} ganham uma posição muito forte (${wA}% de chance de vitória).`)}}}

  else if(cls==='great'){
    P.push(`Lance único! Era o único lance realmente bom aqui${w2!=null?`: o segundo melhor deixaria ${sd(col)} com ${w2}% de chance de vitória, contra ${wB}% agora`:''}. Qualquer outro lance piorava bastante a situação.`);
    if(wm.length)P.push(`Ele ${list(wm)}.`);
    if(mB)P.push(`Além disso, abre caminho para um xeque-mate em ${lc(mB)}.`);
    const r=bestL(mB?2*mB:6);
    if(r&&(r.l.mate||r.l.st.some(s=>s.m.captured))){T='A ideia por trás do lance:';S=r.seq}}

  else if(cls==='best'){
    P.push(`Este é o melhor lance (ou praticamente o melhor) segundo o computador.${wm.length?` Ele ${list(wm)}.`:''}`);
    const r=mB?bestL(2*mB):mF?after(2*mF+1):null;
    if(r){P.push(`Existe até um xeque-mate forçado em ${lc(mB||mF)}, e este lance mantém o caminho aberto:`);S=r.seq}}

  else if(cls==='excellent'||cls==='good'){
    P.push(`${cls==='excellent'?'Ótima jogada, quase tão boa quanto a melhor':'Lance razoável'}${wm.length?`: ele ${list(wm)}`:''}.`);
    if(bestSan&&!isBest)P.push(`O computador preferia <b>${bestSan}</b>${bw.length?`, que ${list(bw)}`:''}. A diferença é pequena (${loss}% de chance de vitória).`)}

  else{ // imprecisão, erro, capivarada
    if(mA){
      P.push(`Esse lance permite xeque-mate! Depois dele, ${sd(o)} conseguem dar xeque-mate em ${lc(mA)}, e ${sd(col)} não conseguem evitar.`);
      const r=after(Math.min(2*mA+1,12));
      if(r){const h=hit(m,r.l.st[0]);if(h)P.push(h);P.push('Veja como o xeque-mate acontece:');S=r.seq}}
    else if(mB){
      P.push(`Você tinha um xeque-mate forçado em ${lc(mB)} e deixou escapar!`);
      const r=bestL(Math.min(2*mB,12));
      if(r){P.push('A sequência vencedora era:');S=r.seq}}
    else{
      const r=after(6);
      if(r){const t=tally(r.l.st,col),h=hit(m,r.l.st[0]);
        if(h)P.push(h);
        if(t.net<0){P.push(`Na sequência mais provável, ${sd(col)} perdem ${names(t.l)}${t.g.length?` e ganham só ${names(t.g)}`:''}.`);P.push('Veja como acontece:');S=r.seq}}
      if(!P.length)P.push('Não há perda direta de peças, mas o lance piora a posição: as peças ficam menos ativas ou o rei menos seguro, e o adversário ganha mais opções.')}
    P.push(`Sua posição passou de ${stat(wB)} (${wB}% de chance de vitória) para ${stat(wA)} (${wA}%).`);
    if(!mB&&bestSan&&!isBest)P.push(`O lance certo era <b>${bestSan}</b>${bw.length?`, que ${list(bw)}`:''}.`)}
  return{p:P,s:S,st:T}}

// como a partida terminou (e, se não foi xeque-mate, por quê)
function ending(h,hd,fen,ev){
  const c=new Chess(fen),P=[],last=h[h.length-1],res=hd.Result||'*',term=String(hd.Termination||'').toLowerCase();
  const win=res==='1-0'?'w':res==='0-1'?'b':null,T='Como a partida terminou';
  if(c.isCheckmate()){const w=last.color;
    return{t:T,p:[`Terminou em xeque-mate: ${sd(w)} venceram. O rei de ${sd(opp(w))} está em xeque e não tem saída: não pode fugir, nem capturar quem o ataca, nem bloquear o caminho.`]}}
  if(c.isStalemate())return{t:T,p:['Empate por afogamento: quem tinha a vez não estava em xeque, mas também não tinha nenhum lance legal. Pelas regras, isso é empate.']};
  if(c.isInsufficientMaterial())return{t:T,p:['Empate por material insuficiente: não sobraram peças suficientes para ninguém conseguir dar xeque-mate.']};
  if(c.isThreefoldRepetition())return{t:T,p:['Empate por repetição: a mesma posição apareceu três vezes.']};
  if(c.isDraw())return{t:T,p:['Empate pela regra dos 50 lances: 50 lances seguidos sem captura nem lance de peão.']};

  const how=/time|tempo|clock/.test(term)?'por tempo (o relógio acabou)':/resign|desist/.test(term)?'por desistência':/abandon/.test(term)?'por abandono (o jogador saiu da partida)':/agree|acordo/.test(term)?'por acordo':'';
  P.push(`A partida não terminou em xeque-mate no tabuleiro. ${win?`O resultado registrado foi vitória ${win==='w'?'das Brancas':'das Pretas'}`:res==='1/2-1/2'?'O resultado registrado foi empate':'Não há resultado registrado'}${how?`, ${how}`:''}.`);
  let S=null,tt='';
  if(ev){
    const turn=c.turn(),cpW=turn==='w'?ev.cp:-ev.cp,mW=ev.mate?(turn==='w'?ev.mate:-ev.mate):0,wW=wp(cpW);
    let mw=0,mb=0;for(const p of c.board().flat())if(p)(p.color==='w'?mw+=VAL[p.type]:mb+=VAL[p.type]);
    const l=line(fen,ev.pv,mW?12:6);
    if(mW){const m=mW>0?'w':'b',lo=opp(m);
      P.push(`Se a partida continuasse daqui, ${sd(m)} dariam xeque-mate em ${lc(Math.abs(mW))}, e ${sd(lo)} não teriam como evitar.`);
      if(l){tt='A sequência que o computador via:';S=seqOf(l)}
      P.push(win===m?`Por isso faz sentido ${sd(lo)} terem ${how.includes('tempo')?'perdido no relógio':'desistido'}: não havia defesa, então desistir só adiantou o inevitável.`
        :win===lo?`Curioso: ${sd(lo)} estavam para levar mate, mas o resultado foi vitória delas. Provavelmente ${sd(m)} ficaram sem tempo ou abandonaram a partida.`
        :'Mesmo assim o resultado não foi vitória: provavelmente houve acordo de empate ou a partida foi interrompida.')}
    else if(wW>=75||wW<=25){const ld=cpW>0?'w':'b';
      P.push(`Na posição final, ${sd(ld)} estavam com grande vantagem (o computador dá cerca de ${(Math.abs(cpW)/100).toFixed(1)} peões de vantagem a elas). Material: Brancas ${mw} pontos x Pretas ${mb} pontos (peão = 1, cavalo e bispo = 3, torre = 5, dama = 9).`);
      if(l&&(l.mate||l.st.some(s=>s.m.captured))){tt='O que o computador previa:';S=seqOf(l)}
      P.push(win===ld?`É natural que ${sd(opp(ld))} tenham desistido ou perdido no tempo: a posição já estava perdida.`
        :win===opp(ld)?`Curioso: o computador via vantagem para ${sd(ld)}, mas o vencedor foi o outro lado. Algo fora do tabuleiro decidiu, como o tempo no relógio ou uma desistência precoce.`
        :'Mesmo com essa vantagem, a partida acabou empatada, provavelmente por acordo.')}
    else P.push(`A posição estava equilibrada (avaliação ${cpW>0?'+':''}${(cpW/100).toFixed(1)}; material Brancas ${mw} x Pretas ${mb}). Não foi o tabuleiro que decidiu: o mais provável é que o tempo tenha acabado, alguém tenha abandonado a partida ou os dois tenham concordado com o resultado.`)}
  return{t:T,p:P,s:S,st:tt}}

module.exports={explain,ending,wp};
