// LONG AI 1.2 — Escàner orientatiu, NO replica exacta del Pine v6.4.1.
// Càlculs server-side, sense claus ni ordres. Font Yahoo Finance Chart per accions;
// Binance public klines per cripto quan la regió ho permet.
const STOCKS=new Set(['UBER','GTLB','OXY','SNOW','CRM','ABBV','PEP','CVX','RTX','HAE','NVDA','MU','ANET','COHR','PLTR','FROG','RKLB','APLD','PANW','CRWD']);
const CRYPTOS=new Set(['BTC','ETH','SOL','AVAX','AAVE','LINK','UNI','DOGE','LTC','BCH','SUI','ONDO','RENDER','NEAR','TIA','XRP','ENA','INJ','ARB','JUP']);
const timeout=async(url)=>{const ctl=new AbortController();const id=setTimeout(()=>ctl.abort(),7000);try{const r=await fetch(url,{signal:ctl.signal,headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 LONG-AI-Radar'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}finally{clearTimeout(id)}};
function clean(bars){return bars.filter(x=>[x.t,x.o,x.h,x.l,x.c].every(Number.isFinite)&&x.c>0&&x.h>=x.l).map(x=>({...x,v:Number.isFinite(x.v)&&x.v>=0?x.v:null})).sort((a,b)=>a.t-b.t)}
async function yahooFetch(url){let errors=[];for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){try{return await timeout(url.replace('query1.finance.yahoo.com',host))}catch(e){errors.push(host+': '+e.message)}}throw Error('Yahoo Finance '+errors.join(' | '))}
async function yahoo(symbol,interval,range){const u=`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`;const j=await yahooFetch(u),x=j?.chart?.result?.[0],q=x?.indicators?.quote?.[0];if(!q)throw Error('no chart');let b=x.timestamp.map((t,i)=>({t:t*1000,o:q.open[i],h:q.high[i],l:q.low[i],c:q.close[i],v:q.volume[i]}));return clean(b)}
async function binance(symbol,interval,limit){const s=symbol+'USDT',u=`https://api.binance.com/api/v3/klines?symbol=${s}&interval=${interval}&limit=${limit}`;const a=await timeout(u);if(!Array.isArray(a))throw Error('no klines');return clean(a.map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]})))}
function aggregate(a,n){let out=[];for(let i=0;i+n<=a.length;i+=n){const x=a.slice(i,i+n);out.push({t:x[0].t,o:x[0].o,h:Math.max(...x.map(y=>y.h)),l:Math.min(...x.map(y=>y.l)),c:x.at(-1).c,v:x.every(y=>Number.isFinite(y.v))?x.reduce((s,y)=>s+y.v,0):null})}return out}
function ema(a,p){if(a.length<p)return null;let v=a.slice(0,p).reduce((s,x)=>s+x,0)/p,k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function rsi(a,p=14){if(a.length<p+1)return null;let gain=0,loss=0;for(let i=1;i<=p;i++){let d=a[i]-a[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}gain/=p;loss/=p;for(let i=p+1;i<a.length;i++){let d=a[i]-a[i-1];gain=(gain*(p-1)+Math.max(d,0))/p;loss=(loss*(p-1)+Math.max(-d,0))/p}return loss===0?(gain===0?50:100):100-100/(1+gain/loss)}
function atr(b,p=14){if(b.length<p+1)return null;let tr=b.slice(1).map((x,i)=>Math.max(x.h-x.l,Math.abs(x.h-b[i].c),Math.abs(x.l-b[i].c)));let v=tr.slice(0,p).reduce((a,b)=>a+b,0)/p;for(let i=p;i<tr.length;i++)v=(v*(p-1)+tr[i])/p;return v}
function macd(a){let e12=ema(a,12),e26=ema(a,26);return e12!==null&&e26!==null?e12-e26:null}
function metrics(b){const c=b.map(x=>x.c),z=b.at(-1);return {price:z?.c??null,ema20:ema(c,20),ema50:ema(c,50),ema200:ema(c,200),rsi:rsi(c),atr:atr(b),macd:macd(c),lastTime:z?.t??null,volume:z?.v??null}}
function isStockSession(t){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date(t));const d=Object.fromEntries(parts.map(x=>[x.type,x.value]));let m=Number(d.hour)*60+Number(d.minute);return d.weekday!=='Sat'&&d.weekday!=='Sun'&&m>=570&&m<960}
function closed(b,ms,isStock=false){const now=Date.now();return b.filter(x=>x.t+ms<=now-60000&&(!isStock||isStockSession(x.t)))}
function rvolMatched(f,isStock){const last=f.at(-1);if(!last||!Number.isFinite(last.v)||last.v<=0)return null;let hist=f.slice(0,-1).filter(x=>Number.isFinite(x.v)&&x.v>0);if(isStock){const tz=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});let slot=x=>tz.format(new Date(x.t));hist=hist.filter(x=>slot(x.t)===slot(last.t));}else hist=hist.slice(-40);if(hist.length<(isStock?5:12))return null;const avg=hist.reduce((s,x)=>s+x.v,0)/hist.length;return avg>0?last.v/avg:null}
function analyze(symbol,type,d,h,f){const stock=type==='acció';const C=f.at(-1),D=d.length?metrics(d):{},H=h.length?metrics(h):{},F=f.length?metrics(f):{};const coverage={daily:d.length,hour:h.length,thirty:f.length};const base={symbol,type,verifiedSignal:false,coverage,source:stock?'Yahoo Finance Chart':'Binance public klines',price:C?.c??null,quoteTime:C?new Date(C.t).toISOString():null,volumeRatio:null,rr:null,trigger:null,stop:null,tp1:null,tp2:null,pattern:'SENSE PATRÓ',status:'WATCH',rsi:F.rsi??null,ema20:F.ema20??null,ema50:F.ema50??null,macd:F.macd??null,atr:F.atr??null};
 if(d.length<55||h.length<40||f.length<65)return {...base,reason:'Històric insuficient (1D '+d.length+', 4H '+h.length+', 30m '+f.length+')',dataQuality:'insufficient'};
 const age=Date.now()-C.t;const stale=stock?age>4*86400000:age>3*3600000;if(stale)return {...base,reason:'Dades massa antigues per validar un patró',dataQuality:'stale'};
 const prior=f.slice(-13,-1),high=Math.max(...prior.map(x=>x.h)),low=Math.min(...prior.map(x=>x.l));const rvol=rvolMatched(f,stock);const trendD=D.ema50!==null&&D.price>D.ema20&&D.ema20>D.ema50;const trend4H=H.ema50!==null&&H.price>H.ema20&&H.ema20>H.ema50;const higher=trendD&&trend4H;
 const momentum=F.rsi!==null&&F.rsi>=48&&F.rsi<=72;const breakout=C.c>high&&C.c>C.o;const retest=F.ema20!==null&&C.l<=F.ema20*1.008&&C.c>F.ema20&&C.c>C.o;const nearBreakout=!breakout&&high>0&&C.c>=high*0.99;const pattern=breakout?'RUPTURA':retest?'RETEST EMA20':nearBreakout?'RUPTURA PENDENT':'SENSE PATRÓ';const volOk=rvol!==null&&rvol>=1.35;
 let trigger=null,stop=null,tp1=null,tp2=null,rr=null;
 if(breakout||retest||nearBreakout){trigger=breakout?C.c:retest?C.h:high;stop=Math.min(low,C.l)-0.18*(F.atr??0);const risk=trigger-stop;if(!(risk>0&&F.atr>0)){trigger=null;stop=null}else{const highs=h.slice(-85,-1).filter(x=>x.h>trigger+0.1*F.atr).map(x=>x.h).sort((a,b)=>a-b);tp1=highs.length?highs[0]:null;rr=tp1!==null?(tp1-trigger)/risk:null;tp2=tp1!==null?trigger+2.5*risk:null}}
 let status='WATCH',reason='Sense confirmació de tendència i patró';if(higher&&(breakout||retest||nearBreakout)){status='PRE-SETUP';reason='Configuració preliminar; cal validar volum i benefici/risc';if((breakout||retest)&&volOk&&momentum&&rr!==null&&rr>=2){status='PRE-READY';reason='Filtres favorables; falta validar Pine, estructura i liquiditat'}}
 return {...base,status,reason,pattern,volumeRatio:rvol,trigger,stop,tp1,tp2,rr,trendD,trend4H,filters:{higher,momentum,breakout,retest,volume:volOk,rr:rr!==null&&rr>=2},dataQuality:rvol===null?'volume_unavailable':'ok',warning:'Motor web orientatiu; READY formal desactivat. RVOL es mostra N/D si no es pot comparar.'}
}
async function one(symbol){
 const isStock=STOCKS.has(symbol),isCrypto=CRYPTOS.has(symbol);
 if(!isStock&&!isCrypto)throw Error('symbol_not_supported');
 let d,h,f,source=isStock?'Yahoo Finance Chart':'Binance';
 if(isStock){
  const x=await Promise.all([yahoo(symbol,'1d','1y'),yahoo(symbol,'60m','3mo'),yahoo(symbol,'30m','1mo')]);
  // Daily candles originate at midnight or opening timestamp; never filter daily bars by intraday session.
  d=closed(x[0],86400000,false);h=closed(x[1],3600000,true);f=closed(x[2],1800000,true);
 }else{
  try{[d,h,f]=await Promise.all([binance(symbol,'1d',260),binance(symbol,'1h',500),binance(symbol,'30m',400)]);source='Binance public klines'}
  catch(err){
   // Some Vercel regions cannot reach Binance. Use public Yahoo USD historical candles if available.
   const sym=symbol+'-USD';try{[d,h,f]=await Promise.all([yahoo(sym,'1d','1y'),yahoo(sym,'60m','3mo'),yahoo(sym,'30m','1mo')]);source='Yahoo Finance crypto chart (Binance inaccessible: '+err.message+')'}catch(alt){throw Error('Crypto primary: '+err.message+'; fallback: '+alt.message)}
  }
  d=closed(d,86400000);h=closed(h,3600000);f=closed(f,1800000)
 }
 const four=aggregate(h,4);const result=analyze(symbol,isStock?'acció':'cripto',d,four,f);
 result.source=source;
 return result;
}
export default async function handler(req,res){res.setHeader('Cache-Control','public,s-maxage=120,stale-while-revalidate=240');if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});const requested=String(req.query?.symbols||'UBER,GTLB,OXY,SNOW,AVAX').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);const names=[...new Set(requested)].slice(0,5);let results=await Promise.allSettled(names.map(one));const analyses=[],errors=[];results.forEach((r,i)=>r.status==='fulfilled'?analyses.push(r.value):errors.push({symbol:names[i],message:String(r.reason?.message||r.reason)}));return res.status(200).json({analyses,errors,updatedAt:new Date().toISOString(),version:'1.2.2',mode:'indicative_technical_screen',important:'Els estats són estimacions del motor web; no són la sortida directa del Pine LONG AI v6.4.1. READY desactivat sense validació completa.'})}
