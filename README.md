# LONG AI Dashboard v1.2.1 — Correcció de dades

- RSI i ATR calculats amb suavització de Wilder; indicador web orientatiu.
- RVOL sobre volums 30m de la mateixa franja horària (accions) o últimes 40 espelmes (cripto); mínim de mostres, sense convertir dades absents a zero.
- S'exclouen espelmes encara obertes; es marca WATCH si la dada és antiga o falta històric.
- R/R es mostra N/D sense patró ni resistència identificada; no s'inventa un objectiu estructural.
- Identificació de ruptura pendent; PRE-READY exigeix suport de volum, tendència i RR>=2, però no és compra confirmada.

Puja els fitxers interiors del ZIP a l'arrel del repositori GitHub `long-ai-dashboard`, substituint els anteriors. Vercel hauria de desplegar des de main.
