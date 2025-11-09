import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

// --- Variables de Entorno ---
// Lee la API Key de Boostr desde las variables de entorno de Render
const BOOSTR_API_KEY = process.env.BOOSTR_API_KEY;

if (!BOOSTR_API_KEY) {
  console.error("[FATAL ERROR] La variable de entorno BOOSTR_API_KEY no está definida.");
  // Salimos si la API Key no está configurada, para evitar que el servidor corra en un estado inválido.
  process.exit(1); 
}

// --- Mensaje de bienvenida para la ruta raíz ---
app.get("/", (req, res) => res.send("✅ Backend operativo (v6 - Boostr API)"));

/**
 * Función para normalizar y validar la patente.
 */
const normalizarPatente = (patenteSucia = "") => {
  const raw = patenteSucia.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Formatos comunes (4 letras + 2 números o 2 letras + 4 números)
  if (/^[A-Z]{4}\d{2}$/.test(raw)) return raw;
  if (/^[A-Z]{2}\d{4}$/.test(raw)) return raw;

  // Formatos antiguos o de moto (puedes ajustar esta lógica si es necesario)
  if (/^[A-Z]{2}\d{3}$/.test(raw) || /^[A-Z]{3}\d{2}$/.test(raw) || /^[A-Z]{3}\d{1}[A-Z]{1}$/.test(raw)) {
    return raw;
  }
  
  // Patente nueva (formato Mercosur)
  if (/^[A-Z]{4}\d{1}[A-Z]{1}$/.test(raw)) return raw;
  
  return null;
};

// --- Endpoint principal de la API ---
app.get("/api/verificar-patente", async (req, res) => {
  
  const patente = normalizarPatente(req.query.patente);

  if (!patente) {
    return res.json({ ok: false, tipo: "invalida", patente: req.query.patente });
  }

  // --- Lógica de la API de Boostr ---
  // Esta es la URL del endpoint específico para transporte público.
  const URL_BOOSTR = `https://api.boostr.cl/car-public_transportation/v1/`;
  const t0 = Date.now();
  
  try {
    console.log(`[INFO] Verificando patente (via Boostr API): ${patente}`);
    
    const response = await fetch(URL_BOOSTR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': BOOSTR_API_KEY 
      },
      body: JSON.stringify({
        "ppu": patente
      })
    });

    const data = await response.json();

    // ¡Importante! Hacemos log de la respuesta de Boostr para depurar
    // Usamos JSON.stringify para ver el objeto completo en los logs de Render
    console.log(`[DEBUG] Respuesta de Boostr: ${JSON.stringify(data)}`);

    if (!response.ok) {
      // Si Boostr responde con un 4xx o 5xx
      console.warn(`[WARN] La API de Boostr respondió con error ${response.status}. Detalle: ${data.message || 'Error desconocido'}`);
      throw new Error(`La API de Boostr respondió con error ${response.status}`);
    }

    // --- Interpretamos la respuesta exitosa de Boostr ---
    // Basándonos en la documentación, buscamos la llave 'is_public_transport'
    const esColectivo = data.data?.is_public_transport === true;
    const tipo = esColectivo ? "colectivo" : "otro";
    
    console.log(`[INFO] Resultado exitoso (via Boostr): ${esColectivo}`);
    
    res.json({
      ok: true, // La consulta a la API fue exitosa
      tipo: tipo,
      esTransportePublico: esColectivo,
      esTransporteEscolar: data.data?.is_school_transport === true,
      patente: patente,
      ms: Date.now() - t0,
      source: 'boostr-api'
    });

  } catch (err) {
    console.error(`[ERROR] Fetch a Boostr API fallido para ${patente}.`, err);
    // Devolvemos un error genérico al cliente
    res.json({ ok: false, tipo: "error", detalle: err.message, patente: patente });
  }
});

// --- Iniciamos el servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT} (v6 - Boostr API)`));
