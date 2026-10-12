const STOCKS=['UBER','GTLB','OXY','SNOW','CRM','ABBV','PEP','CVX','RTX','HAE'];
const CRYPTOS={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',AVAX:'avalanche-2',AAVE:'aave',LINK:'chainlink',UNI:'uniswap',DOGE:'dogecoin',LTC:'litecoin',BCH:'bitcoin-cash',MET:'meteora',HYPE:'hyperliquid'};
const allowed=new Set([...STOCKS,...Object.keys(CRYPTOS)]);
const validStock=s=>/^[A-Z][A-Z0-9.\-]{0,9}$/.test(s);
const wait=(p,ms=9500)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
async function json(url){let r=await wait(fetch(url,{headers:{'User-Agent':'LongAIDashboard/1.1','Accept':'application/json'}}));if(!r.ok)throw new Error('provider_http_'+r.status);return r.json()}
function nySession(ms){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 const minute=Number(p.hour)*60+Number(p.minute);
 if(['Sat','Sun'].includes(p.weekday))return 'TANCAT';
 return minute>=240&&minute<570?'PREMARKET':minute>=570&&minute<960?'REGULAR':minute>=960&&minute<1200?'AFTER-HOURS':'TANCAT';
}
async function alpacaExtended(symbol){
 const key=process.env.APCA_API_KEY_ID,secret=process.env.APCA_API_SECRET_KEY;
 if(!key||!secret)return null;
 const now=Date.now(),start=new Date(now-12*3600000).toISOString();
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6500);
 try{
  const url='https://data.alpaca.markets/v2/stocks/'+encodeURIComponent(symbol)+'/bars?timeframe=1Min&start='+encodeURIComponent(start)+'&limit=1000&feed=iex';
  const res=await fetch(url,{signal:ctl.signal,headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret}});
  if(!res.ok)throw Error('alpaca_http_'+res.status);
  const body=await res.json(),bars=Array.isArray(body.bars)?body.bars:[];
  for(let i=bars.length-1;i>=0;i--){const b=bars[i],ms=Date.parse(b.t||''),price=Number(b.c);
   if(!(price>0)||!Number.isFinite(ms)||Date.now()-ms>30*60000||ms>Date.now()+60000)continue;
   const session=nySession(ms);if(session!=='TANCAT')return {price,quoteMs:ms,session,source:'Alpaca IEX · 1m (cobertura parcial)'};
  }
  return null;
 }finally{clearTimeout(timer)}
}
async function krakenPairs(){
 const x=await json('https://api.kraken.com/0/public/AssetPairs');
 if(x.error?.length||!x.result)throw Error('kraken_assetpairs');
 const pairs=new Map();
 for(const [id,p] of Object.entries(x.result)){
  const ws=String(p.wsname||''),alt=String(p.altname||'');
  const [base,quote]=ws.split('/');
  if(!base||!['USD','USDC'].includes(quote)||p.status&&p.status!=='online')continue;
  const normal=base==='XBT'?'BTC':base.toUpperCase();
  if(!pairs.has(normal)||quote==='USD')pairs.set(normal,{id,altname:alt,quote});
 }
 return pairs;
}
let krakenPairsCache=null;
async function cryptoKraken(symbol){
 const pairs=krakenPairsCache||await krakenPairs();
 krakenPairsCache=pairs;
 const match=pairs.get(symbol);
 if(!match)throw Error('kraken_pair_not_available');
 const j=await json('https://api.kraken.com/0/public/Ticker?pair='+encodeURIComponent(match.id));
 if(j.error?.length)throw Error('kraken_ticker_'+j.error.join(','));
 const ticker=Object.values(j.result||{})[0],price=Number(ticker?.c?.[0]),open=Number(ticker?.o);
 if(!(price>0))throw Error('kraken_missing_price');
 // Kraken Ticker no proporciona la marca temporal de l'últim trade; no presentar-la com a temps real verificat.
 return {symbol,type:'cripto',price,changePct:open>0?100*(price/open-1):null,quoteTime:null,quoteFresh:null,source:'Kraken public '+match.id,pair:match.quote==='USD'?symbol+'-USD':symbol+'-USDC',pairVenue:'Kraken',status:'WATCH',verifiedSignal:false};
}
async function stock(symbol){
 const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol);
 const [daily,extended]=await Promise.allSettled([
  json(url+'?interval=1d&range=5d'),
  json(url+'?interval=5m&range=5d&includePrePost=true')
 ]);
 if(daily.status!=='fulfilled')throw Error('missing_stock_daily');
 const d=daily.value?.chart?.result?.[0];if(!d)throw Error('missing_stock');
 const meta=d.meta||{},regular=Number(meta.regularMarketPrice),prev=Number(meta.chartPreviousClose||meta.previousClose);
 if(!(regular>0))throw Error('missing_price');
 let price=regular,quoteMs=Number(meta.regularMarketTime||0)*1000,session='TANCAT',provider='Yahoo Finance · tancament/sessió';
 const ext=extended.status==='fulfilled'?extended.value?.chart?.result?.[0]:null;
 try{const alternate=await alpacaExtended(symbol);if(alternate){price=alternate.price;quoteMs=alternate.quoteMs;session=alternate.session;provider=alternate.source;}}
 catch(e){/* Alpaca opcional; Yahoo continua funcionant sense credencials. */}
 if(ext&&!(provider.startsWith('Alpaca'))){
  const t=ext.timestamp||[],closes=ext.indicators?.quote?.[0]?.close||[];
  for(let i=t.length-1;i>=0;i--){
   const p=Number(closes[i]),ms=Number(t[i])*1000;
   if(!(p>0)||!Number.isFinite(ms)||ms>Date.now()+60000||Date.now()-ms>24*3600000)continue;
   const zone=nySession(ms);
   if(zone!=='TANCAT'&&Date.now()-ms<60*60000){
    price=p;quoteMs=ms;session=zone;provider='Yahoo Finance · barres 5m incl. pre/post';break;
   }
  }
 }
 // Sense una barra ampliada recent, mostrar l'últim tancament com a tal, no com a premarket en directe.
 const fresh=quoteMs>0&&Date.now()-quoteMs<7*86400000;
 if(!fresh)throw Error('stale_stock_quote');
 return {symbol,type:'acció',price,regularPrice:regular,changePct:prev>0?100*(price/prev-1):null,marketState:session,quoteTime:quoteMs>0?new Date(quoteMs).toISOString():null,quoteFresh:fresh,source:provider,status:'WATCH',verifiedSignal:false};
}
async function cryptoCoinbase(symbol){
 let failure='No pair';
 for(const quote of ['USD','USDC']){
  const pair=symbol+'-'+quote;
  try{
   const [x,stats]=await Promise.all([json('https://api.exchange.coinbase.com/products/'+pair+'/ticker'),json('https://api.exchange.coinbase.com/products/'+pair+'/stats')]);
   const p=Number(x.price),dayOpen=Number(stats.open),quoteMs=Date.parse(x.time||'');if(!(p>0))throw Error('No price');
   if(!Number.isFinite(quoteMs)||quoteMs>Date.now()+60000||Date.now()-quoteMs>2*3600000)throw Error('stale_or_missing_coinbase_quote');
   return {symbol,type:'cripto',price:p,changePct:dayOpen>0?100*(p/dayOpen-1):null,quoteTime:x.time||null,source:'Coinbase '+pair,pair,status:'WATCH',verifiedSignal:false};
  }catch(e){failure=String(e.message||e)}
 }
 throw Error('Coinbase '+symbol+': '+failure);
}
async function cryptos(symbols){
 const data=[],errors=[];
 const rows=await Promise.allSettled(symbols.map(async symbol=>{try{return await cryptoCoinbase(symbol)}catch(coinbaseError){try{return await cryptoKraken(symbol)}catch(krakenError){throw Error('Coinbase: '+coinbaseError.message+' | Kraken: '+krakenError.message)}}}));
 rows.forEach((r,i)=>r.status==='fulfilled'?data.push(r.value):errors.push({symbol:symbols[i],reason:String(r.reason?.message||r.reason)}));
 return {data,errors};
}
export default async function handler(req,res){res.setHeader('Cache-Control','public, s-maxage=45, stale-while-revalidate=90');if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});let selected=String(req.query?.symbols||'').split(',').map(s=>s.trim().toUpperCase()).filter(s=>allowed.has(s)||validStock(s));if(!selected.length)selected=[...STOCKS,...Object.keys(CRYPTOS)];selected=[...new Set(selected)].slice(0,20);const requestedCrypto=new Set(String(req.query?.crypto||'').split(',').map(x=>x.toUpperCase()));const coins=selected.filter(s=>CRYPTOS[s]||requestedCrypto.has(s)),eq=selected.filter(s=>!coins.includes(s));const out=await Promise.allSettled([Promise.allSettled(eq.map(stock)),coins.length?cryptos(coins):Promise.resolve({data:[],errors:[]})]);let quotes=[],errors=[];if(out[0].status==='fulfilled')out[0].value.forEach((x,i)=>x.status==='fulfilled'?quotes.push(x.value):errors.push({symbol:eq[i],reason:String(x.reason?.message||x.reason)}));else errors.push({source:'stocks',reason:String(out[0].reason)});if(out[1].status==='fulfilled')(quotes.push(...out[1].value.data),errors.push(...out[1].value.errors));else errors.push({source:'crypto',reason:String(out[1].reason?.message||out[1].reason)});return res.status(quotes.length?200:503).json({quotes,errors,updatedAt:new Date().toISOString(),mode:'live_quotes_only',disclaimer:'Cripto: Coinbase amb Kraken com a alternativa quan Coinbase falla; Kraken no retorna timestamp del ticker. Accions: Yahoo i Alpaca IEX opcional amb credencials; senyals Pine no validats.'})}
