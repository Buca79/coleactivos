Backend de ColeActivos (v6 - API de Boostr)

Este backend sirve como un proxy seguro para verificar si una patente de vehículo chileno corresponde a transporte público (colectivo).

Utiliza la API de boostr.cl como fuente de datos, ya que los intentos de scraping al MTT fueron bloqueados.

Endpoint

GET /api/verificar-patente?patente=ABCD12
Verifica una patente.

Respuesta exitosa: { "ok": true, "tipo": "colectivo", "esTransportePublico": true, ... }

Respuesta de error: { "ok": false, "tipo": "error", "detalle": "...", ... }

Configuración de Despliegue en Render

Para que este servidor funcione, requiere DOS variables de entorno:

NODE_VERSION

Key: NODE_VERSION

Value: 18.17.0 (o cualquier versión superior a 18)

Razón: El código usa import y fetch nativos.

BOOSTR_API_KEY

Key: BOOSTR_API_KEY

Value: (Tu API Key secreta obtenida de boostr.cl)

Razón: Necesaria para autenticarse con la API de Boostr.

IMPORTANTE: La variable NODE_TLS_REJECT_UNAUTHORIZED ya NO es necesaria y debe ser eliminada por seguridad.
