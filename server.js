import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

// --- Mensaje de bienvenida para la ruta raíz ---
app.get("/", (req, res) => res.send("✅ Backend operativo (v4 - Depuración de Fetch)"));

/**
 * Función para normalizar y validar la patente.
 * @param {string} patenteSucia
 * Limpia la patente (quita espacios, guiones) y la valida contra formatos comunes.
 */
const normalizarPatente = (patenteSucia = "") => {
  const raw = patenteSucia.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Patentes nuevas (4 letras, 2 números) - Ej: ABCD12
  if (/^[A-Z]{4}\d{2}$/.test(raw)) {
    return raw;
  }
  // Patentes antiguas (2 letras, 4 números) - Ej: AB1234
  if (/^[A-Z]{2}\d{4}$/.test(raw)) {
    return raw;
  }
  // Patentes moto (formatos variados) - Ej: AB123, ABC12, ABC1D
  if (/^[A-Z]{2}\d{3}$/.test(raw) || /^[A-Z]{3}\d{2}$/.test(raw) || /^[A-Z]{3}\d{1}[A-Z]{1}$/.test(raw)) {
    return raw;
  }
  
  // Si no calza con los formatos más comunes, es inválida
  return null;
};


// --- Endpoint principal de la API ---
app.get("/api/verificar-patente", async (req, res) => {
  
  const patente = normalizarPatente(req.query.patente);

  if (!patente) {
    // Si la patente es inválida, respondemos de inmediato.
    return res.json({ ok: false, tipo: "invalida", patente: req.query.patente });
  }

  const t0 = Date.now();
  
  // Esta es la URL de consulta que descubrimos
  const URL_CONSULTA_MTT = `https://apps.mtt.cl/consultaweb/consulta?patente=${patente}`;

  try {
    // ----------------------------------------------------------------------
    // Hacemos un GET a la URL de consulta
    // ----------------------------------------------------------------------
    
    // *** NUEVO LOG: ***
    // Esto aparecerá en los logs de Render ANTES de hacer la llamada.
    console.log(`[INFO] Verificando patente: ${patente} en ${URL_CONSULTA_MTT}`);

    const response = await fetch(URL_CONSULTA_MTT, {
      method: "GET",
      headers: {
        // *** CAMBIO: Simulemos ser un navegador Firefox en Windows ***
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
        "Referer": "https://apps.mtt.cl/consultaweb/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      },
    });

    if (!response.ok) {
      // *** NUEVO LOG: ***
      // Si el MTT responde con un error 404, 500, 403, etc.
      console.warn(`[WARN] La web del MTT respondió con error ${response.status} ${response.statusText}`);
      throw new Error(`La web del MTT respondió con error ${response.status}`);
    }

    // Leemos la respuesta como HTML
    const html = await response.text();
    
    // Convertimos a minúsculas para buscar
    const textoServicio = html.toLowerCase();

    // Buscamos las palabras clave
    const esColectivo = textoServicio.includes("colectivo");
    const esTaxi = textoServicio.includes("taxi");
    const noEnconrado = textoServicio.includes("no existen resultados para la patente");

    let tipo = "otro";
    if (esColectivo) tipo = "colectivo";
    else if (esTaxi) tipo = "taxi";
    else if (noEnconrado) tipo = "no-encontrado";
    
    // *** NUEVO LOG: ***
    console.log(`[INFO] Resultado exitoso para ${patente}: ${tipo}`);
    
    // Respondemos con éxito
    res.json({ ok: esColectivo || esTaxi, tipo, patente, ms: Date.now() - t0, source: 'html-fetch' });

  } catch (err) {
    // ----------------------------------------------------------------------
    // --- SECCIÓN DE ERROR MEJORADA ---
    // ----------------------------------------------------------------------
    
    // *** NUEVO LOG: ***
    // Esto nos dará el error completo en la consola de Render
    console.error(`[ERROR] Fetch fallido para patente ${patente}. Detalles completos:`, err);
    
    // *** CAMBIO: ***
    // Intentamos obtener un código de error más específico.
    // En Node 18+, el 'fetch' suele incluir una 'causa' del error.
    const detalleError = err.cause ? err.cause.code : err.message;
    
    // Respondemos al usuario con el error detallado
    res.json({ ok: false, tipo: "error", detalle: detalleError || "fetch failed" });
  }
});


// --- Iniciamos el servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT} (v4 - Depuración de Fetch)`));
