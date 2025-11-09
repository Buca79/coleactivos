Backend de ColeActivos (Versión 3 - Fetch HTML)

Este backend usa Express y fetch nativo de Node.js para verificar patentes.

Se eliminó Puppeteer porque es inestable, lento y consume demasiados recursos para un servicio como Render.

Estrategia

El sitio apps.mtt.cl no usa una API JSON (Fetch/XHR) moderna. En su lugar, usa un envío de formulario HTML simple que recarga la página en una nueva URL:

https://apps.mtt.cl/consultaweb/consulta?patente=PATENTE_AQUI

Este backend llama directamente a esa URL, recibe la respuesta (que es una página HTML completa), la convierte a texto y busca las palabras clave "colectivo" o "taxi" dentro de ese texto.

Esta es la solución más rápida, ligera y estable para desplegar en Render.
