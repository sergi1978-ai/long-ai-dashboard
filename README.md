# LONG AI Dashboard v1.5 — Radar personal actualitzable

- **Actualitzar radar:** consulta preus i recalcula indicadors de TOTS els tickers del radar personal (peticions per lots, límit 100 guardats).
- **Analitzar el meu radar:** actualització tècnica manual sense tocar la descoberta.
- **Descobrir candidats nous:** cerca independent que NO afegeix automàticament actius a la teva llista.
- **Actualització automàtica:** preus cada 2 minuts, tècnica cada 30 minuts mentre el navegador sigui obert. NO és una tasca en segon pla del servidor.
- Data de cotització i última espelma tècnica visibles; les fallades d'API es mostren com a sense cobertura.
- Selecció guardada en `localStorage` amb clau `longai-watch-v14`; eliminar un actiu persisteix després de recarregar.
- Dades de mercat públiques amb limitacions i retard. Les criptomonedes diferents de les admeses pel motor poden aparèixer sense cobertura tècnica.
- WATCH/PRE-SETUP/PRE-READY són classificacions orientatives. No emet READY oficial Pine ni executa operacions ni envia notificacions externes.

**Instal·lació:** puja els fitxers INTERIORS d'aquesta carpeta a l'arrel de la branca `main` del repositori GitHub connectat a Vercel. No canviïs Root Directory.

## v1.5.1
- Consultes Yahoo controlades en lots de 5, amb fallades individuals visibles.
- Alternativa Binance si CoinGecko no està disponible (pot dependre de la regió).
- Respostes parcials i missatges d’error visibles en la descoberta.
- Lot rotatiu de 15 accions per reduir el risc de bloqueig.
- No s’han validat les fonts externes des d’una implementació real de Vercel.
