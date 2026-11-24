const express=require('express'),{Chess}=require('chess.js'),{spawn}=require('child_process'),path=require('path'),os=require('os');
const book=require('./openings.json'),{explain,ending}=require('./explain');
const bin=path.join(path.dirname(require.resolve('stockfish/package.json')),'bin','stockfish-19-lite-single.js');
const N=Math.max(1,Math.min(os.cpus().length,12)),BUDGET=4500;
class Eng{
  constructor(){this.p=spawn(process.execPath,[bin]);this.buf='';this.cb=null;this.cur={};
    this.p.stdout.on('data',d=>{this.buf+=d;let i;while((i=this.buf.indexOf('\n'))>=0){const l=this.buf.slice(0,i).trim();this.buf=this.buf.slice(i+1);this.line(l)}});
    this.p.stdin.write('uci\nsetoption name Hash value 64\nsetoption name MultiPV value 2\nisready\n')}
  line(l){
    if(l.startsWith('info')&&!/bound/.test(l)){const m=l.match(/multipv (\d+) score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/);if(m&&pv)this.cur[m[1]]={t:m[2],v:+m[3],pv:pv[1].trim().split(' ')}}
    else if(l.startsWith('bestmove')&&this.cb){const f=this.cb,c=this.cur;this.cb=null;f({a:c[1],b:c[2],best:l.split(' ')[1]})}}
  go(fen,ms){return new Promise(r=>{this.cb=r;this.cur={};this.p.stdin.write(`position fen ${fen}\ngo depth 22 movetime ${ms}\n`)})}
}
const pool=Array.from({length:N},()=>new Eng());
const toCp=r=>r?(r.t==='mate'?(r.v>0?10000-r.v:-10000-r.v):r.v):0;
async function evalAll(fens,ms,prog){
  const out=new Array(fens.length),K=Math.max(6,Math.ceil(fens.length/(N*3)));let k=0,done=0;
  await Promise.all(pool.map(async e=>{e.p.stdin.write('ucinewgame\n');for(;;){const s=k;k+=K;if(s>=fens.length)return;
    for(let i=s;i<Math.min(s+K,fens.length);i++){const c=new Chess(fens[i]);
      if(c.isCheckmate())out[i]={cp:-10000,best:null};
      else if(c.isDraw()||!c.moves().length)out[i]={cp:0,best:null};
      else{const r=await e.go(fens[i],ms[i]);out[i]={cp:toCp(r.a),cp2:r.b?toCp(r.b):null,best:r.best,mate:r.a&&r.a.t==='mate'?r.a.v:null,pv:r.a&&r.a.pv}}
      prog(++done/fens.length)}}}));
  return out}
const wp=cp=>50+50*(2/(1+Math.exp(-0.00368208*Math.max(-1500,Math.min(1500,cp))))-1);
const key=f=>f.split(' ').slice(0,4).join(' ');
const V={p:1,n:3,b:3,r:5,q:9,k:99};
function sac(m){
  if(!'nbrq'.includes(m.piece))return false;
  const c=new Chess(m.after),op=m.color==='w'?'b':'w',at=c.attackers(m.to,op);if(!at.length)return false;
  const df=c.attackers(m.to,m.color),pv=V[m.piece],cv=m.captured?V[m.captured]:0,mn=Math.min(...at.map(s=>V[c.get(s).type]));
  return (df.length?(mn<pv?cv+mn-pv:cv):cv-pv)<=-2}
function cls(l,b){if(b||l<0.3)return'best';if(l<2)return'excellent';if(l<5)return'good';if(l<10)return'inaccuracy';if(l<20)return'mistake';return'blunder'}
const sx=f=>{try{return f()}catch(e){console.error('explain:',e.message);return null}};
let q=Promise.resolve();const lock=f=>{const r=q.then(f);q=r.catch(()=>{});return r};
const app=express();app.use(express.json({limit:'1mb'}));app.use(express.static(path.join(__dirname,'public')));
app.post('/api/analyze',(req,res)=>{lock(async()=>{
  res.setHeader('Content-Type','application/x-ndjson');const w=o=>res.write(JSON.stringify(o)+'\n');
  try{
    const t0=Date.now(),g=new Chess();g.loadPgn(String(req.body.pgn||''));
    const h=g.history({verbose:true});if(!h.length)throw new Error('Nenhum lance encontrado');
    const hd=g.getHeaders(),fens=[h[0].before,...h.map(m=>m.after)];
    const wt=fens.map(f=>book[key(f)]?.3:(new Chess(f).moves().length<2?.15:1)),u=BUDGET*N/wt.reduce((a,b)=>a+b,0);
    const ms=wt.map(x=>Math.round(Math.max(30,Math.min(700,u*x))));
    const ev=await evalAll(fens,ms,p=>w({p}));
    let inBook=true,op=null;const moves=[],acc={w:[],b:[]},cnt={w:{},b:{}};
    h.forEach((m,i)=>{
      const wh=m.color==='w',before=ev[i].cp,after=-ev[i+1].cp,wB=wp(before),wA=wp(after),loss=Math.max(0,wB-wA);
      const bo=book[key(m.after)];let bk=false;if(inBook&&bo){bk=true;op=bo}else inBook=false;
      const isBest=ev[i].best===m.from+m.to+(m.promotion||''),pm=h[i-1];
      let c=bk?'book':cls(loss,isBest);
      if(!bk&&loss<1.5&&(wB<95||before>9000)&&wA>=40&&sac(m))c='brilliant';
      else if(!bk&&isBest&&ev[i].cp2!=null&&wB<92&&wB-wp(ev[i].cp2)>=15&&!(pm&&pm.captured&&m.captured&&pm.to===m.to))c='great';
      let bestSan=null;
      if(ev[i].best&&!isBest){const b=ev[i].best;try{bestSan=new Chess(m.before).move({from:b.slice(0,2),to:b.slice(2,4),promotion:b[4]}).san}catch{}}
      const s=wh?'w':'b';acc[s].push(103.1668*Math.exp(-0.04354*loss)-3.1669);cnt[s][c]=(cnt[s][c]||0)+1;
      const ex=sx(()=>explain({m,evB:ev[i],evA:ev[i+1],cls:c,wB:Math.round(wB),wA:Math.round(wA),w2:ev[i].cp2!=null?Math.round(wp(ev[i].cp2)):null,bestSan,isBest,loss:+loss.toFixed(1),book:op&&op[1]}))||{p:[]};
      moves.push({san:m.san,uci:m.from+m.to,fen:m.after,color:s,cls:c,loss:+loss.toFixed(1),cp:wh?after:-after,best:ev[i].best,bestSan,op:op&&op[1],eco:op&&op[0],ex})});
    const avg=a=>a.length?+Math.max(0,Math.min(100,a.reduce((x,y)=>x+y,0)/a.length)).toFixed(1):0;
    w({r:{headers:hd,start:fens[0],startCp:ev[0].cp,moves,end:sx(()=>ending(h,hd,fens[fens.length-1],ev[ev.length-1])),acc:{w:avg(acc.w),b:avg(acc.b)},cnt,ms:Date.now()-t0,engines:N}})
  }catch(e){w({error:e.message})}
  res.end()})});
app.get('/vendor/chess.js',(req,res)=>{const fs=require('fs'),d=path.dirname(require.resolve('chess.js')),f=[path.join(d,'..','esm','chess.js'),path.join(d,'esm','chess.js')].find(x=>fs.existsSync(x));f?res.type('js').sendFile(f):res.status(404).send('chess.js (esm) não encontrado')});
app.listen(3000,()=>console.log('http://localhost:3000'));
