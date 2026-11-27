/**
 * ============================================================================
 * WhatsVend - Directorio de Tiendas (tiendas.js)
 * ============================================================================
 * Aquí registras cada negocio que usa WhatsVend y su enlace/ID de hoja en
 * Google Sheets, además de los datos de contacto de WhatsVend para captar
 * nuevos clientes desde el pie de página de cada tienda.
 * ============================================================================
 */

const WHATSAPP_CREADOR_CONFIG = {
  marca: 'WhatsVend',
  etiquetaSuperior: 'MENÚ DIGITAL CREADO POR WHATSAPPVEND',
  titulo: 'Tu negocio también puede vender así',
  descripcion:
    'Creamos catálogos y menús digitales rápidos, editables desde Google Sheets y listos para recibir pedidos organizados por WhatsApp.',
  beneficios: [
    '✓ Carrito inteligente',
    '✓ Pedidos por WhatsApp',
    '✓ Diseño adaptable'
  ],
  // Cambia este número por tu WhatsApp real de ventas (sin + ni espacios)
  whatsappNumero: '593999999999',
  textoBotonWhatsapp: 'WhatsApp',
  mensajePredeterminado:
    'Hola WhatsVend, vi una tienda creada con su plataforma y quiero información para contratar el servicio para mi negocio.'
};

/**
 * Directorio de tiendas registradas.
 * - `slug`: ruta limpia en la URL (ej. /vend -> whatvend.pages.dev/vend)
 * - `sheetId`: ID del documento de Google Sheets de esa tienda
 * - `sheetUrlCsv` / `sheetUrlJson`: opcionalmente puedes poner URLs directas
 *   de exportación (por ejemplo vía Apps Script doGet o publicación CSV).
 */
const TIENDAS_WHATSAPPVEND = {
  vend: {
    nombreReferencia: 'Burger & Roll Studio',
    activo: true,
    sheetId: 'REEMPLAZA_AQUI_CON_EL_ID_DE_TU_GOOGLE_SHEET',
    // Si usas un Apps Script publicado como Web App (doGet) que devuelve JSON
    // con las pestañas { Config, Portada, Secciones, Productos, Extras, ModulosExtra },
    // pon aquí la URL `/exec`. Si queda vacío, se intentará leer CSV público.
    appsScriptUrl: ''
  }
};

/**
 * Resuelve qué tienda cargar según la URL actual:
 * 1) Query string: `?tienda=vend`
 * 2) Ruta limpia: `/vend` o `/vend/` (ignorando archivos como `/index.html`)
 * 3) Por defecto: `'vend'`
 */
function resolverSlugTiendaActual() {
  const params = new URLSearchParams(window.location.search);
  const queryTienda = (params.get('tienda') || '').trim().toLowerCase();
  if (queryTienda) return queryTienda;

  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (pathname && !pathname.includes('.')) {
    const primerSegmento = pathname.split('/')[0].toLowerCase();
    if (primerSegmento && TIENDAS_WHATSAPPVEND[primerSegmento]) {
      return primerSegmento;
    }
  }

  return 'vend';
}