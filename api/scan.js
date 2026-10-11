// LONG AI 1.2 — Escàner orientatiu, NO replica exacta del Pine v6.4.1.
// Càlculs server-side, sense claus ni ordres. Font Yahoo Finance Chart per accions;
// Coinbase Exchange per cripto; USD i USDC, sense barrejar proveidors.
const STOCKS=new Set(["UBER", "GTLB", "OXY", "SNOW", "CRM", "ABBV", "PEP", "CVX", "RTX", "HAE", "NVDA", "MU", "ANET", "COHR", "PLTR", "FROG", "RKLB", "APLD", "PANW", "CRWD", "MSFT", "GOOGL", "AMZN", "META", "AAPL", "AMD", "AVGO", "TSM", "ASML", "AMAT", "LRCX", "KLAC", "MRVL", "SMCI", "ORCL", "NET", "DDOG", "SHOP", "NOW", "INTU", "RBRK", "ZS", "FTNT", "OKTA", "PATH", "MDB", "HUBS", "TWLO", "HOOD", "COIN", "MSTR", "SQ", "PYPL", "SOFI", "AFRM", "IBKR", "GS", "JPM", "BAC", "C", "XOM", "SLB", "HAL", "KOS", "COP", "EOG", "MPC", "VLO", "GEV", "ETN", "PWR", "VST", "CEG", "BE", "OKLO", "CCJ", "NEE", "DUK", "GE", "CAT", "DE", "URI", "BA", "LMT", "NOC", "KTOS", "HIMS", "TEM", "UNH", "LLY", "MRK", "PFE", "GILD", "REGN", "TMO", "ISRG", "DXCM", "ROST", "COST", "WMT", "TGT", "HD", "LOW", "CMG", "MCD", "SBUX", "NFLX", "DIS", "SPOT", "ROKU", "TTD", "ABNB", "BKNG", "RCL", "CCL", "DAL", "UAL", "TSLA", "RIVN", "LCID", "NIO", "F", "GM"]);
const CRYPTOS=new Set(['BTC','ETH','SOL','AVAX','AAVE','LINK','UNI','DOGE','LTC','BCH','SUI','ONDO','RENDER','NEAR','TIA','XRP','ENA','INJ','ARB','JUP','MET','HYPE']);
const timeout=async(url)=>{const ctl=new AbortController();const id=setTimeout(()=>ctl.abort(),7000);try{const r=await fetch(url,{signal:ctl.signal,headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 LONG-AI-Radar'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}finally{clearTimeout(id)}};
function validTime(t){return typeof t==='number'&&Number.isFinite(t)&&Number.isFinite(new Date(t).getTime())&&t>946684800000&&t<Date.now()+86400000}
function safeISO(t){return validTime(t)?new Date(t).toISOString():null}
function clean(bars){return bars.filter(x=>validTime(x.t)&&[x.o,x.h,x.l,x.c].every(Number.isFinite)&&x.c>0&&x.h>=x.l).map(x=>({...x,v:Number.isFinite(x.v)&&x.v>=0?x.v:null})).sort((a,b)=>a.t-b.t)}
async function yahooFetch(url){let errors=[];for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){try{return await timeout(url.replace('query1.finance.yahoo.com',host))}catch(e){errors.push(host+': '+e.message)}}throw Error('Yahoo Finance '+errors.join(' | '))}
async function yahoo(symbol,interval,range){const u=`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`;const j=await yahooFetch(u),x=j?.chart?.result?.[0],q=x?.indicators?.quote?.[0];if(!q||!Array.isArray(x.timestamp))throw Error('no_chart_or_timestamps');let b=x.timestamp.map((t,i)=>({t:Number(t)*1000,o:q.open?.[i],h:q.high?.[i],l:q.low?.[i],c:q.close?.[i],v:q.volume?.[i]}));const filtered=clean(b);if(!filtered.length)throw Error('no_valid_candles_'+interval+'_'+range);return filtered}
async function binance(symbol,interval,limit){const s=symbol+'USDT',u=`https://api.binance.com/api/v3/klines?symbol=${s}&interval=${interval}&limit=${limit}`;const a=await timeout(u);if(!Array.isArray(a))throw Error('no klines');return clean(a.map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]})))}
// Coinbase Exchange: 1D/1H/15m natius; 4H i 30m agregats a partir de barres completes.
async function coinbaseBars(pair,seconds){
 const url='https://api.exchange.coinbase.com/products/'+encodeURIComponent(pair)+'/candles?granularity='+seconds;
 const a=await timeout(url);
 if(!Array.isArray(a))throw Error('coinbase_no_candles_'+pair+'_'+seconds);
 return clean(a.map(x=>({t:Number(x[0])*1000,l:Number(x[1]),h:Number(x[2]),o:Number(x[3]),c:Number(x[4]),v:Number(x[5])})));
}
function timeAggregate(a,bucketMs,expected,stepMs){
 const groups=new Map();
 for(const x of a){const start=Math.floor(x.t/bucketMs)*bucketMs;const g=groups.get(start)||[];g.push(x);groups.set(start,g)}
 return [...groups].sort((x,y)=>x[0]-y[0]).filter(([t,x])=>x.length===expected&&x.every((v,i)=>v.t===t+i*stepMs)).map(([t,x])=>({
 t,o:x[0].o,h:Math.max(...x.map(v=>v.h)),l:Math.min(...x.map(v=>v.l)),c:x.at(-1).c,v:x.every(y=>Number.isFinite(y.v))?x.reduce((a,y)=>a+y.v,0):null
 }));
}
async function coinbaseHistory(symbol){
 const reasons=[];
 for(const currency of ['USD','USDC']){
  const pair=symbol+'-'+currency;
  try{
   const [day,hour,quarter]=await Promise.all([coinbaseBars(pair,86400),coinbaseBars(pair,3600),coinbaseBars(pair,900)]);
   const h4=timeAggregate(hour,14400000,4,3600000);
   const f30=timeAggregate(quarter,1800000,2,900000);
   if(day.length<65||h4.length<60||f30.length<65)throw Error('insufficient_history');
   return {day,h4,h1:hour,f30,pair};
  }catch(e){reasons.push(pair+': '+String(e.message||e))}
 }
 throw Error('Coinbase unavailable: '+reasons.join('; '));
}
function aggregate(a,n){
 // Agrupa per finestres UTC fixes: evita desplacaments segons el nombre de barres retornades.
 const groups=new Map(),ms=n*3600000;
 for(const x of a){const key=Math.floor(x.t/ms)*ms;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)}
 return [...groups].sort((a,b)=>a[0]-b[0]).filter(([,bars])=>bars.length===n).map(([t,bars])=>({
  t,o:bars[0].o,h:Math.max(...bars.map(y=>y.h)),l:Math.min(...bars.map(y=>y.l)),c:bars.at(-1).c,
  v:bars.every(y=>Number.isFinite(y.v))?bars.reduce((sum,y)=>sum+y.v,0):null
 }));
}
function ema(a,p){if(a.length<p)return null;let v=a.slice(0,p).reduce((s,x)=>s+x,0)/p,k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function rsi(a,p=14){if(a.length<p+1)return null;let gain=0,loss=0;for(let i=1;i<=p;i++){let d=a[i]-a[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}gain/=p;loss/=p;for(let i=p+1;i<a.length;i++){let d=a[i]-a[i-1];gain=(gain*(p-1)+Math.max(d,0))/p;loss=(loss*(p-1)+Math.max(-d,0))/p}return loss===0?(gain===0?50:100):100-100/(1+gain/loss)}
function atr(b,p=14){if(b.length<p+1)return null;let tr=b.slice(1).map((x,i)=>Math.max(x.h-x.l,Math.abs(x.h-b[i].c),Math.abs(x.l-b[i].c)));let v=tr.slice(0,p).reduce((a,b)=>a+b,0)/p;for(let i=p;i<tr.length;i++)v=(v*(p-1)+tr[i])/p;return v}
function macd(a){let e12=ema(a,12),e26=ema(a,26);return e12!==null&&e26!==null?e12-e26:null}
function metrics(b){const c=b.map(x=>x.c),z=b.at(-1);return {price:z?.c??null,ema20:ema(c,20),ema50:ema(c,50),ema200:ema(c,200),rsi:rsi(c),atr:atr(b),macd:macd(c),lastTime:z?.t??null,volume:z?.v??null}}
function isStockSession(t){if(!validTime(t))return false;const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date(t));const d=Object.fromEntries(parts.map(x=>[x.type,x.value]));let m=Number(d.hour)*60+Number(d.minute);return d.weekday!=='Sat'&&d.weekday!=='Sun'&&m>=570&&m<960}
function closed(b,ms,isStock=false){const now=Date.now();return b.filter(x=>x.t+ms<=now-60000&&(!isStock||isStockSession(x.t)))}
function rvolMatched(f,isStock){const last=f.at(-1);if(!last||!Number.isFinite(last.v)||last.v<=0)return null;let hist=f.slice(0,-1).filter(x=>Number.isFinite(x.v)&&x.v>0);if(isStock){const tz=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});let slot=x=>validTime(x.t)?tz.format(new Date(x.t)):null;const currentSlot=slot(last);if(!currentSlot)return null;hist=hist.filter(x=>slot(x)===currentSlot);}else hist=hist.slice(-20);if(hist.length<(isStock?5:12))return null;const avg=hist.reduce((s,x)=>s+x.v,0)/hist.length;return avg>0?last.v/avg:null}
function aggregateRegularStockHours(a){
 let out=[];for(let i=0;i+4<=a.length;i+=4){
  const z=a.slice(i,i+4);out.push({t:z[0].t,o:z[0].o,h:Math.max(...z.map(x=>x.h)),l:Math.min(...z.map(x=>x.l)),c:z.at(-1).c,
   v:z.every(x=>Number.isFinite(x.v))?z.reduce((sum,x)=>sum+x.v,0):null});
 }return out;
}
function compression4h(h){
 const closes=h.map(x=>x.c);if(closes.length<45)return null;
 const widths=[];for(let i=19;i<closes.length;i++){
  const arr=closes.slice(i-19,i+1),avg=arr.reduce((a,b)=>a+b,0)/arr.length;
  if(!(avg>0))continue;
  const sd=Math.sqrt(arr.reduce((v,x)=>v+(x-avg)**2,0)/arr.length);
  widths.push(4*sd/avg);
 }
 const recent=widths.at(-1),hist=widths.slice(-41,-1);
 if(!hist.length)return null;
 const mean=hist.reduce((a,b)=>a+b,0)/hist.length;
 return mean>0?recent/mean:null;
}
function analyze(symbol,type,d,h,f){const stock=type==='acció';const C=f.at(-1),D=d.length?metrics(d):{},H=h.length?metrics(h):{},F=f.length?metrics(f):{};const coverage={daily:d.length,hour:h.length,thirty:f.length};const base={symbol,type,verifiedSignal:false,coverage,source:stock?'Yahoo Finance Chart':'Binance public klines',price:C?.c??null,quoteTime:C?safeISO(C.t):null,volumeRatio:null,rr:null,trigger:null,stop:null,tp1:null,tp2:null,pattern:'SENSE PATRÓ',status:'SENSE DADES',rsi:F.rsi??null,ema20:F.ema20??null,ema50:F.ema50??null,macd:F.macd??null,atr:F.atr??null};
 if(d.length<65||h.length<60||f.length<65)return {...base,reason:'Històric insuficient (1D '+d.length+', 4H '+h.length+', 30m '+f.length+')',dataQuality:'insufficient'};
 const age=Date.now()-C.t;const stale=stock?age>4*86400000:age>3*3600000;if(stale)return {...base,reason:'Dades massa antigues per validar un patró',dataQuality:'stale'};
 const prior=f.slice(-13,-1),high=Math.max(...prior.map(x=>x.h)),low=Math.min(...prior.map(x=>x.l));const rvol=rvolMatched(f,stock);const trendD=D.ema50!==null&&D.price>D.ema20&&D.ema20>D.ema50;const trend4H=H.ema50!==null&&H.price>H.ema20&&H.ema20>H.ema50;const higher=trendD&&trend4H;
 const momentum=F.rsi!==null&&F.rsi>=48&&F.rsi<=72;const breakout=C.c>high&&C.c>C.o;const retest=F.ema20!==null&&C.l<=F.ema20*1.008&&C.c>F.ema20&&C.c>C.o;const nearBreakout=!breakout&&high>0&&C.c>=high*0.99;const pattern=breakout?'RUPTURA':retest?'RETEST EMA20':nearBreakout?'RUPTURA PENDENT':'SENSE PATRÓ';const volOk=rvol!==null&&rvol>=1.35;
 // Regles Early Explosive de LONG AI Pine v6.6.16, adaptades a barres tancades.
 // Les dades i l'alineament de sessions poden diferir de request.security de TradingView.
 const bbRatio=compression4h(h);
 const atr4=H.atr;
 const atrHistory=[];for(let i=14;i<h.length;i++){const v=atr(h.slice(0,i+1));if(Number.isFinite(v))atrHistory.push(v)}
 const atrBaseline=atrHistory.slice(-40);
 const atrAvg=atrBaseline.length===40?atrBaseline.reduce((a,b)=>a+b,0)/40:null;
 const atrRatio=atrAvg>0?atr4/atrAvg:null;
 const prior4=h.slice(-12),earlyHigh=prior4.length===12?Math.max(...prior4.map(x=>x.h)):null;
 const earlyTrigger=earlyHigh;
 const earlyDistanceATR=atr4>0&&earlyTrigger>0?(earlyTrigger-C.c)/atr4:null;
 const earlyTrend=D.ema50>0&&H.ema50>0&&D.price>D.ema50*.94&&H.price>H.ema50*.97&&H.ema20>=H.ema50*.98;
 const earlyCompression=bbRatio!==null&&bbRatio<=.90&&atrRatio!==null&&atrRatio<=1.05;
 const earlyNear=earlyDistanceATR!==null&&earlyDistanceATR>=0&&earlyDistanceATR<=.65;
 const earlyFirstImpulse=earlyTrigger>0&&atr4>0&&C.c>earlyTrigger&&C.c>C.o&&C.c<=earlyTrigger+.60*atr4&&rvol!==null&&rvol>=1.05;
 const earlyVolume=rvol!==null&&rvol>=1.05;
 const dailyBars=d.slice(-20);const dailyTurn=dailyBars.length===20&&dailyBars.every(x=>Number.isFinite(x.v))?dailyBars.reduce((sum,x)=>sum+x.c*x.v,0)/20:null;
 const liquidOK=dailyTurn!==null&&dailyTurn>=1000000;
 const extensionOK=atr4>0&&H.ema20>0&&C.c<=H.ema20+2*atr4;
 const explosiveChecks={compression:earlyCompression,rupture:earlyNear||earlyFirstImpulse,volume:earlyVolume,trend:earlyTrend,liquidityAndExtension:liquidOK&&extensionOK};
 const explosiveWatch=Object.values(explosiveChecks).filter(Boolean).length;
 const explosiveEligible=liquidOK&&extensionOK&&earlyTrend&&(earlyCompression||earlyNear||earlyFirstImpulse)&&explosiveWatch>=3;
 const explosiveDirection=C.c>H.ema20&&H.ema20>H.ema50&&C.c>f.at(-4)?.c?'ALCISTA':C.c<H.ema20&&H.ema20<H.ema50&&C.c<f.at(-4)?.c?'BAIXISTA':'NEUTRE';
 let trigger=null,stop=null,tp1=null,tp2=null,rr=null;
 if(breakout||retest||nearBreakout){trigger=breakout?C.c:retest?C.h:high;stop=Math.min(low,C.l)-0.18*(F.atr??0);const risk=trigger-stop;if(!(risk>0&&F.atr>0)){trigger=null;stop=null}else{const highs=h.slice(-85,-1).filter(x=>x.h>trigger+0.1*F.atr).map(x=>x.h).sort((a,b)=>a-b);tp1=highs.length?highs[0]:null;rr=tp1!==null?(tp1-trigger)/risk:null;tp2=tp1!==null?trigger+2.5*risk:null}}
 let status='WATCH',reason='Sense confirmació de tendència i patró';if(higher&&(breakout||retest||nearBreakout)){status='PRE-SETUP';reason='Configuració preliminar; cal validar volum i benefici/risc';if((breakout||retest)&&volOk&&momentum&&rr!==null&&rr>=2){status='PRE-READY';reason='Filtres favorables; falta validar Pine, estructura i liquiditat'}}
 return {...base,status,reason,pattern,volumeRatio:rvol,trigger,stop,tp1,tp2,rr,trendD,trend4H,explosiveWatch,explosiveDirection,explosiveEligible,compressionRatio:bbRatio,atrCompressionRatio:atrRatio,explosiveChecks,filters:{higher,momentum,breakout,retest,volume:volOk,rr:rr!==null&&rr>=2},dataQuality:rvol===null?'volume_unavailable':'ok',warning:'Motor web orientatiu; READY formal desactivat. RVOL es mostra N/D si no es pot comparar.'}
}
async function one(symbol,forceCrypto=false,scanTf='30m'){
 const isStock=!forceCrypto&&STOCKS.has(symbol),isCrypto=forceCrypto||(!isStock&&/^[A-Z0-9]{2,16}$/.test(symbol));
 if(!isStock&&!isCrypto)throw Error('symbol_not_supported');
 let d,h,f,source=isStock?'Yahoo Finance Chart':'Binance';
 if(isStock){
  const x=await Promise.all([yahoo(symbol,'1d','1y'),yahoo(symbol,'60m','3mo'),yahoo(symbol,'30m','1mo')]);
  // Daily candles originate at midnight or opening timestamp; never filter daily bars by intraday session.
  d=closed(x[0],86400000,false);h=closed(x[1],3600000,true);f=scanTf==='1h'?h:closed(x[2],1800000,true);
 }else{
  const cb=await coinbaseHistory(symbol);
  d=closed(cb.day,86400000);h=closed(cb.h4,14400000);f=scanTf==='1h'?closed(cb.h1,3600000):closed(cb.f30,1800000);
  source='Coinbase Exchange '+cb.pair;

 }
 // En accions, les sessions NYSE no omplen finestres UTC 4H completes.
 // Conservar un context d'hores regulars orientatiu fins a reproduir les barres 4H de TradingView.
 const four=isStock?aggregateRegularStockHours(h):h;if(!d.length||!f.length)throw Error('no_valid_candles_after_filter');const result=analyze(symbol,isStock?'acció':'cripto',d,four,f);
 result.source=source;result.timeframe=scanTf;
 if(isCrypto)result.pair=source.split(' ').at(-1);
 return result;
}
export default async function handler(req,res){res.setHeader('Cache-Control','public,s-maxage=120,stale-while-revalidate=240');if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});const requested=String(req.query?.symbols||'UBER,GTLB,OXY,SNOW,AVAX').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);const names=[...new Set(requested)].slice(0,5);const forcedCrypto=new Set(String(req.query?.crypto||'').split(',').map(x=>x.trim().toUpperCase()));const tf=req.query?.tf==='1h'?'1h':'30m';let results=await Promise.allSettled(names.map(x=>one(x,forcedCrypto.has(x),tf)));const analyses=[],errors=[];results.forEach((r,i)=>r.status==='fulfilled'?analyses.push(r.value):errors.push({symbol:names[i],message:String(r.reason?.message||r.reason)}));return res.status(200).json({analyses,errors,updatedAt:new Date().toISOString(),version:'coinbase-web-v2',mode:'indicative_technical_screen',important:'Estats i Explosive Watch orientatius del motor web, NO equivalen a Pine LONG AI; READY formal desactivat sense validacio completa.'})}
