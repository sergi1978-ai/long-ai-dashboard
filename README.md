# LONG AI Dashboard v1.3 · Descobridor dinàmic

Puja **el contingut d’aquesta carpeta** a l’arrel de `main` a GitHub. Vercel ha de detectar `/api/discover`, `/api/scan` i `/api/quotes`.

## Funcions
- Descobrir nous candidats: selecciona per lots rotatius de 25 actius entre un univers de +100 accions i consulta les altcoins de més volum de CoinGecko. Mostra Top 10 + 10 per preu i variació, NO senyals verificats.
- Analitzar Top 10 + 10: analitza fins a 5 accions i 5 altcoins de les disponibles, amb confirmacions WEB WATCH / PRE-SETUP / PRE-READY. Els candidats cripto fora dels símbols coberts per /api/scan no s'avaluen com a entrada.
- L'estat READY és deliberadament desactivat: falta validador Pine de TradingView i prova retrospectiva.
- Fonts públiques poden fallar o limitar consultes. Sense base de dades ni servei continu, la cerca per rotació no és un escàner complet en temps real i no guarda historial de canvis.
- El dashboard no està connectat a la tasca programada de ChatGPT i no envia notificacions automàtiques.
