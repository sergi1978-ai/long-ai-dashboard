# LONG AI Dashboard v1.4.1 – Correcció eliminar del radar

Solucionat el botó **✕ Eliminar** que no es mostrava en les files del radar personal. Ara cada fila inclou acció d'eliminació i es desa a `localStorage` (`longai-watch-v14`), de manera que no reapareix en refrescar. Les files del descobridor Top 10 són independents: per eliminar un actiu seguït, fes-ho a **El meu radar**. La descoberta pot tornar a mostrar l'actiu com a *candidat*, però no el torna a afegir al radar personal.

Actualitza fitxers de l'arrel de GitHub `main`; Vercel farà el deploy.
