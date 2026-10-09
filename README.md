# LONG AI Dashboard 1.1 — Live quotes

App Vercel sense build (HTML+serverless API Node). GET /api/quotes consulta fonts públiques CoinGecko i Yahoo Finance. Ambdues poden aplicar límits, fallar o retornar preus retardats. El dashboard **no** calcula READY A/A+ ni replica el motor Pine 6.4.1.

## Publicació

Crea o importa un projecte Vercel, root directory d'aquesta carpeta, framework `Other` i deploy. Requereix Node >=20, sense dependències. L'endpoint `/api/health` comprova el desplegament.

La tasca de ChatGPT segueix independent. Per tenir alertes integrades, afegeix un escàner extern amb dades OHLCV i base de dades, i valida estats abans d'enviar-ne notificacions. No posis secrets al frontend.
