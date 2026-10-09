# LONG AI Dashboard v1.2.3 — FIX INVALID TIME VALUE

Arregla validació temporal al backend. `api/scan.js` elimina espelmes amb timestamps no vàlids, no aplica `Intl.DateTimeFormat` ni `toISOString` sobre dates invàlides, i torna errors específics quan la font no envia dades útils. No altera els criteris READY del motor.

## Publicació
Puja els fitxers continguts en aquesta carpeta a l’arrel de `main` del repositori GitHub, reemplaçant els existents, sense crear cap subcarpeta addicional. Vercel hauria de construir automàticament.

## Prova
`/api/scan?symbols=UBER` ha de retornar JSON amb `analyses` o errors explícits de la font. Si persisteix un error, copia el JSON complet perquè es pugui reproduir.

La resposta és orientativa; el script Pine de TradingView no s'executa aquí.
