# LONG AI Dashboard v1.2 — Radar tècnic orientatiu

Conserva l'API `/api/quotes` de la v1.1 i afegeix `/api/scan?symbols=UBER,GTLB,OXY,SNOW,CRM` (màxim 5 per sol·licitud). El botó **Analitzar 10 actius** recull històric 1D, 60m, 30m en accions (Yahoo Finance Chart) i 1D, 4h, 30m per a criptomonedes (Binance pública, si disponible) i calcula EMA20/50, RSI14, MACD aproximat EMA12−EMA26, ATR14, volum relatiu i patrons orientatius de ruptura/retest.

No reprodueix exactament el Pine v6.4.1 de TradingView i no emet READY formal: usa WATCH, PRE-SETUP i PRE-READY. Els nivells són condicionals. El càlcul del R/R estructural requereix una resistència real; no considera una diana de 2R inventada com a prova de R/R. Les fonts públiques poden fallar o estar bloquejades en determinades regions. No opera ni desa claus de brokers. No hi ha alertes push ni tasca de ChatGPT connectada directament.

## Desplegament a GitHub/Vercel

Puja **els continguts d'aquesta carpeta** a l'arrel de la branca `main` del repositori `long-ai-dashboard`, substituint `index.html`, `package.json`, i afegint `api/scan.js`, mantenint `api/quotes.js` i `api/health.js`. A Vercel Root Directory = `./` i Framework Preset = Other. Comprova `/api/health`, `/api/quotes`, `/api/scan?symbols=UBER` i la pàgina principal. No pengis el ZIP dins del repositori. Si proves en GitHub, utilitza preview abans de promoure a producció.
