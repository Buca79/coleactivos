import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => res.send("✅ Backend operativo (v3 - Fetch HTML)"));

/**
 * Función para normalizar y validar la patente.
 * @param {string} patenteSucia
 * Válida patentes chilenas (auto, moto, carro)
 * Formatos:
 * - Auto: ABCD12, AB-CD-12, ab-cd-12
 * - Moto: AB123, ab-123
 * - Antiguo: AB1234, ab-12-34
 * - Carro: 1234AB, 12-34-ab
 */
const normalizarPatente = (patenteSucia = "") => {
  const raw = patenteSucia.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Patentes nuevas (4 letras, 2 números)
  if (/^[A-Z]{4}\d{2}$/.test(raw)) {
    return raw;
  }
  // Patentes antiguas (2 letras, 4 números)
  if (/^[A-Z]{2}\d{4}$/.test(raw)) {
    return raw;
  }
  // Patentes moto (2 letras, 3 números) o (3 letras, 2 números)
  if (/^[A-Z]{2}\d{3}$/.test(raw) || /^[A-Z]{3}\d{2}$/.test(raw)) {
    return raw;
  }
  // Patentes carro/remolque (1 o 2 letras + 4 números)
  if (/^[A-Z]{1,2}\d{4}$/.test(raw)) {
     return raw;
  }
  // Formato moto nuevo (3 letras, 1 numero, 1 letra)
  if (/^[A-Z]{3}\d{1}[A-Z]{1}$/.test(raw)) {
    return raw;
  }

  // Si no calza, es inválida
  return null;
};


app.get("/api/verificar-patente", async (req, res) => {
  const patente = normalizarPatente(req.query.patente);

  if (!patente) {
    return res.json({ ok: false, tipo: "invalida", patente: req.query.patente });
  }

  const t0 = Date.now();
  
  // --- ¡ESTA ES LA URL CORRECTA! ---
  // El sitio no usa una API JSON, sino que recarga la página
  // y muestra el resultado en el HTML.
  const URL_CONSULTA_MTT = `https://apps.mtt.cl/consultaweb/consulta?patente=${patente}`;

  try {
    // ----------------------------------------------------------------------
    // Hacemos un GET a la URL de consulta
    // ----------------------------------------------------------------------
    const response = await fetch(URL_CONSULTA_MTT, {
      method: "GET",
      headers: {
        // Simulamos ser un navegador normal para evitar bloqueos
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://apps.mtt.cl/consultaweb/"
      },
      // Importante: No podemos usar 'timeout' en el fetch estándar de Node
      // Necesitaríamos un AbortController si quisiéramos timeout,
      // pero para este caso, lo mantenemos simple.
    });

    if (!response.ok) {
      throw new Error(`La web del MTT respondió con error ${response.status}`);
    }

    // ¡La respuesta no es JSON, es HTML! La leemos como texto.
    const html = await response.text();
    
    // Convertimos el HTML a minúsculas para buscar fácilmente
    const textoServicio = html.toLowerCase();

    // Buscamos las palabras clave en *todo* el HTML de la respuesta
    const esColectivo = textoServicio.includes("colectivo");
    const esTaxi = textoServicio.includes("taxi");
    
    // Si la patente no existe, la página incluye este texto:
    const noEncontrado = textoServicio.includes("no existen resultados para la patente");

    let tipo = "otro";
    if (esColectivo) tipo = "colectivo";
    else if (esTaxi) tipo = "taxi";
    else if (noEncontrado) tipo = "no-encontrado";
    
    res.json({ ok: esColectivo || esTaxi, tipo, patente, ms: Date.now() - t0, source: 'html-fetch' });

  } catch (err) {
    console.error(`Error verificando patente ${patente}:`, err.message);
    res.json({ ok: false, tipo: "error", detalle: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT} (con Fetch HTML)`));
