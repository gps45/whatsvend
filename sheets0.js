/**
 * ============================================================================
 * WhatsVend - Lector de datos desde Google Sheets (sheets.js)
 * ============================================================================
 */

function limpiarValorHoja(valor) {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor).replace(/^\uFEFF/, '').trim();
  if (/^#(ERROR!|REF!|NAME\?|VALUE!|N\/A|DIV\/0!)/i.test(texto)) {
    return '';
  }
  return texto;
}

function esSi(valor, porDefecto = false) {
  const limpioTexto = limpiarValorHoja(valor);
  if (limpioTexto === '') {
    return porDefecto;
  }
  const limpio = limpioTexto.toUpperCase();
  return limpio === 'SI' || limpio === 'SÍ' || limpio === 'TRUE' || limpio === '1';
}

function aNumero(valor, porDefecto = 0) {
  if (typeof valor === 'number' && !Number.isNaN(valor)) return valor;
  const textoLimpio = limpiarValorHoja(valor);
  if (!textoLimpio) return porDefecto;

  const normalizado = textoLimpio
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const num = parseFloat(normalizado);
  return Number.isNaN(num) ? porDefecto : num;
}

function parsearCSV(textoCsv) {
  const filas = [];
  let filaActual = [];
  let celdaActual = '';
  let dentroComillas = false;
  const csvLimpio = String(textoCsv || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < csvLimpio.length; i++) {
    const char = csvLimpio[i];
    const siguiente = csvLimpio[i + 1];

    if (char === '"') {
      if (dentroComillas && siguiente === '"') {
        celdaActual += '"';
        i++;
      } else {
        dentroComillas = !dentroComillas;
      }
    } else if (char === ',' && !dentroComillas) {
      filaActual.push(celdaActual);
      celdaActual = '';
    } else if ((char === '\n' || char === '\r') && !dentroComillas) {
      if (char === '\r' && siguiente === '\n') i++;
      filaActual.push(celdaActual);
      if (filaActual.some((c) => limpiarValorHoja(c) !== '')) {
        filas.push(filaActual);
      }
      filaActual = [];
      celdaActual = '';
    } else {
      celdaActual += char;
    }
  }

  if (celdaActual.length > 0 || filaActual.length > 0) {
    filaActual.push(celdaActual);
    if (filaActual.some((c) => limpiarValorHoja(c) !== '')) {
      filas.push(filaActual);
    }
  }

  if (filas.length < 2) return [];
  const encabezados = filas[0].map((h, idx) => {
    const limp = limpiarValorHoja(h).toLowerCase();
    return limp || `col_${idx}`;
  });

  return filas
    .slice(1)
    .map((fila) => {
      const obj = {};
      encabezados.forEach((enc, idx) => {
        obj[enc] = fila[idx] !== undefined ? limpiarValorHoja(fila[idx]) : '';
      });
      return obj;
    })
    .filter((obj) => Object.values(obj).some((v) => v !== ''));
}

async function leerPestanaCsv(sheetId, nombrePestana) {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    sheetId
  )}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nombrePestana)}&_t=${Date.now()}`;
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`No se pudo leer la pestaña ${nombrePestana} (HTTP ${resp.status})`);
  }
  const csv = await resp.text();
  return parsearCSV(csv);
}

async function leerPestanaSegura(sheetId, nombrePestana, respaldo = []) {
  try {
    return await leerPestanaCsv(sheetId, nombrePestana);
  } catch (err) {
    console.warn(`Aviso al leer pestaña "${nombrePestana}":`, err.message || err);
    return respaldo;
  }
}

function convertirFilasConfigAObjeto(filasConfig) {
  const cfg = {};
  (filasConfig || []).forEach((fila) => {
    const keys = Object.keys(fila || {});
    const keyCol =
      keys.find((k) => k === 'clave' || k.includes('clave') || k === 'key') || keys[0];
    const valCol =
      keys.find((k) => k === 'valor' || k.includes('valor') || k === 'value') || keys[1];

    const clave = keyCol ? limpiarValorHoja(fila[keyCol]) : '';
    if (
      !clave ||
      clave.startsWith('-') ||
      clave.startsWith('[') ||
      clave === clave.toUpperCase()
    ) {
      return;
    }

    cfg[clave] = valCol && fila[valCol] !== undefined ? limpiarValorHoja(fila[valCol]) : '';
  });
  return cfg;
}

function obtenerDatosDemo() {
  const config = {
    nombre_negocio: 'Burger & Roll Studio',
    logo_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
    logo_alto_pc: '42px',
    logo_alto_movil: '38px',
    whatsapp_numero: '593999999999',
    codigo_pais: '593',
    moneda: '$',
    ubicacion_texto: 'Av. Principal y Calle 2 • Centro',
    fuente_general: 'Poppins',
    fuente_nombre: 'Poppins',
    color_nombre: '#111827',
    color_principal: '#16a34a',
    color_fondo_app: '#ffffff',
    color_superficie: '#f9fafb',
    color_texto_general: '#111827',
    aviso1_activo: 'SI',
    aviso1_texto: 'Promociones especiales de Lunes a Jueves',
    aviso1_fondo: '#1f2937',
    aviso1_texto_color: '#ffffff',
    aviso1_tamano: '13px',
    aviso2_activo: 'SI',
    aviso2_texto: '🎁 10% de descuento pagando con Efectivo',
    aviso2_fondo: '#16a34a',
    aviso2_texto_color: '#ffffff',
    aviso2_tamano: '13px',
    banner_inicio_activo: 'SI',
    banner_inicio_pc: 'https://images.unsplash.com/photo-1550547660-d9350f477399?w=1400',
    banner_inicio_movil: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    barra_estado_activo: 'SI',
    horario_apertura: '09:00',
    horario_cierre: '22:30',
    texto_abierto: 'Abierto ahora',
    texto_cerrado: 'Cerrado por ahora',
    barra_estado_derecha: 'Espera aprox. 30–40 min',
    barra_estado_fondo: '#18181b',
    barra_estado_texto: '#ffffff',
    portada_activa: 'SI',
    texto_boton_portada: 'Ver menú',
    mostrar_boton_destacados: 'SI',
    texto_boton_destacados: 'Ver todo el menú',
    texto_boton_tarjeta: '+',
    texto_boton_modal_agregar: 'Agregar al pedido',
    texto_boton_ver_mas: 'Ver más productos',
    tamano_titulo_producto: '15px',
    tamano_precio_producto: '16px',
    tamano_etiqueta_producto: '11px',
    permitir_nota_producto: 'SI',
    placeholder_nota_producto: 'Ej. Sin cebolla, bien cocido...',
    titulo_carrito: 'Tu pedido',
    modo_domicilio: 'SI',
    etiqueta_domicilio: 'A domicilio',
    domicilio_pedir_telefono: 'SI',
    domicilio_gps_activo: 'SI',
    modo_retiro: 'SI',
    etiqueta_retiro: 'Retiro en local',
    mensaje_retiro: 'Te esperamos en el local; tu pedido estará listo a tiempo.',
    modo_mesa: 'SI',
    etiqueta_mesa: 'En mesa',
    propina_activa: 'SI',
    propina_porcentajes: '0,5,10,15',
    compartir_carrito_activo: 'SI',
    texto_boton_whatsapp: 'Enviar pedido por WhatsApp',
    mostrar_footer_whatsvend: 'SI'
  };

  const portada = [
    {
      id: 'port_0',
      orden: 10,
      activo: 'SI',
      tipo: 'logo',
      titulo: '',
      subtitulo: '',
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
      boton_texto: '',
      ids_productos_destacados: '',
      alineacion: 'centro',
      producto_id: '',
      enlace_url: '',
      fuente: '',
      tamano: '96px',
      color_texto: '',
      color_fondo: ''
    },
    {
      id: 'port_1',
      orden: 20,
      activo: 'SI',
      tipo: 'hero',
      titulo: 'Sabores que conquistan desde el primer bocado',
      subtitulo: 'Hecho al momento, entrega rápida y directo a tu WhatsApp.',
      imagen: 'https://images.unsplash.com/photo-1550547660-d9350f477399?w=1200',
      boton_texto: 'Ver menú',
      ids_productos_destacados: '',
      alineacion: 'izquierda',
      producto_id: '',
      enlace_url: '',
      fuente: 'Poppins',
      tamano: '',
      color_texto: '#ffffff',
      color_fondo: '#111827'
    }
  ];

  const secciones = [
    {
      id: 'sec_1',
      orden: 10,
      activo: 'SI',
      titulo: 'INDIVIDUALES',
      subtitulo: 'Opciones ideales para disfrutar solo o acompañar.',
      estilo_modulo: 'cuadricula',
      titulo_fuente: 'Bebas Neue',
      titulo_tamano: '26px',
      titulo_color: '#111827',
      subtitulo_fuente: 'Poppins',
      subtitulo_tamano: '14px',
      subtitulo_color: '#6b7280',
      titulo_alineacion: 'izquierda'
    }
  ];

  const productos = [
    {
      id: 'prod_1',
      orden: 10,
      seccion_id: 'sec_1',
      nombre: 'SUSHI DAY DOMINGO',
      descripcion: 'Preparación fresca al momento con ingredientes seleccionados.',
      precio: 14.9,
      imagen: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=700',
      etiqueta: '★ TOP',
      etiqueta_color: '#dc2626',
      etiqueta_texto_color: '#ffffff',
      disponible: 'SI'
    }
  ];

  return { config, portada, secciones, productos, extras: [], modulosExtra: [] };
}

async function cargarDatosTienda(tiendaInfo) {
  if (!tiendaInfo) {
    return obtenerDatosDemo();
  }

  if (tiendaInfo.appsScriptUrl && tiendaInfo.appsScriptUrl.startsWith('http')) {
    try {
      const resp = await fetch(tiendaInfo.appsScriptUrl, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        return {
          config: Array.isArray(data.Config)
            ? convertirFilasConfigAObjeto(data.Config)
            : data.Config || {},
          portada: data.Portada || [],
          secciones: data.Secciones || [],
          productos: data.Productos || [],
          extras: data.Extras || [],
          modulosExtra: data.ModulosExtra || []
        };
      }
    } catch (err) {
      console.warn('Fallo al leer Apps Script, intentando CSV:', err);
    }
  }

  if (tiendaInfo.sheetId && !tiendaInfo.sheetId.startsWith('REEMPLAZA_AQUI')) {
    const [
      filasConfig,
      portada,
      secciones,
      productos,
      extras,
      modulosExtra
    ] = await Promise.all([
      leerPestanaSegura(tiendaInfo.sheetId, 'Config', []),
      leerPestanaSegura(tiendaInfo.sheetId, 'Portada', []),
      leerPestanaSegura(tiendaInfo.sheetId, 'Secciones', []),
      leerPestanaSegura(tiendaInfo.sheetId, 'Productos', []),
      leerPestanaSegura(tiendaInfo.sheetId, 'Extras', []),
      leerPestanaSegura(tiendaInfo.sheetId, 'ModulosExtra', [])
    ]);

    const config = convertirFilasConfigAObjeto(filasConfig);
    const tieneDatosReales =
      Object.keys(config).length > 0 ||
      portada.length > 0 ||
      secciones.length > 0 ||
      productos.length > 0;

    if (tieneDatosReales) {
      return {
        config,
        portada,
        secciones,
        productos,
        extras,
        modulosExtra
      };
    }

    console.warn('No se encontraron datos en las pestañas del Sheet, usando demo.');
  }

  return obtenerDatosDemo();
}
