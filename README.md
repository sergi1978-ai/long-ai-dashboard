# LONG AI Dashboard v1.5.2 — Fix JavaScript startup

Soluciona l’error `formatTech is not defined` eliminant el bloc d’actualització duplicat que s’executava abans de la inicialització del motor tècnic. Conserva API i funcionalitat de v1.5.1.

## Instal·lació
Pugeu tots els fitxers interiors del ZIP a l’arrel del repositori `long-ai-dashboard` a la branca `main`, substituint els existents.

## Verificació
Obriu el web i comproveu «Actualitzar radar», «Descobrir candidats nous» i «Analitzar el meu radar». Si una font externa falla, el motor mostrarà l’error corresponent. La correcció de JavaScript no garanteix disponibilitat de Yahoo/CoinGecko/Binance.
