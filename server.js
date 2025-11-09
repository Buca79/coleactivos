import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

// --- Mensaje de bienvenida para la ruta raíz ---
app.get("/", (req, res) => res.send("✅ Backend operativo (v5 - Proxy Google)"));

/**
 * Función para normalizar y validar la patente.
 * (Esta sigue igual, la necesitamos)
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
  return null;
};


// --- Endpoint principal de la API ---
app.get("/api/verificar-patente", async (req, res) => {
  
  const patente = normalizarPatente(req.query.patente);

  if (!patente) {
    return res.json({ ok: false, tipo: "invalida", patente: req.query.patente });
  }

  // --- ¡¡¡EL GRAN CAMBIO!!! ---
  // Esta es tu URL de Google Apps Script
  const URL_DE_MI_PROXY_GOOGLE = "https://script.google.com/macros/s/AKfycbzg4JeWl1kx3_5P51640qhTrYSws3tuMtM7frmpSona_mBuVSDPUF9kNZ-xaaGETCIpDg/exec";
  
  const URL_CONSULTA_FINAL = `${URL_DE_MI_PROXY_GOOGLE}?patente=${patente}`;

  const t0 = Date.now();
  
  try {
    // Ahora le preguntamos a nuestro propio script de Google
    console.log(`[INFO] Verificando patente (via Google Proxy): ${patente}`);
    
    // Ya NO necesitamos el 'NODE_TLS_REJECT_UNAUTHORIZED' porque
    // 1. Google se encarga del SSL.
    // 2. La llamada de Render a Google no tiene problemas de SSL.
    const response = await fetch(URL_CONSULTA_FINAL);

    if (!response.ok) {
      console.warn(`[WARN] Mi Google Proxy respondió con error ${response.status}`);
      throw new Error(`Google Proxy respondió con error ${response.status}`);
    }

    // El script de Google ya nos devuelve un JSON limpio
    const resultado = await response.json();
    
    console.log(`[INFO] Resultado exitoso (via Google): ${resultado.tipo}`);
    
    // Le pasamos el JSON al cliente
    res.json({ ...resultado, ms: Date.now() - t0, source: 'google-apps-script' });

  } catch (err) {
    console.error(`[ERROR] Fetch a Google Proxy fallido para ${patente}.`, err);
    res.json({ ok: false, tipo: "error", detalle: err.message });
  }
});


// --- Iniciamos el servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT} (v5 - Proxy Google)`));
