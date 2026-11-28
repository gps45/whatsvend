/**
 * ============================================================================
 * WhatsVend - Lector de datos desde Google Sheets (sheets.js)
 * ============================================================================
 * Lee las pestañas: Config, Portada, Secciones, Productos, Extras y ModulosExtra.
 * Incluye normalización de valores SI/NO, números y datos de demostración si
 * todavía no se configura un Sheet real.
 * ============================================================================
 */

function esSi(valor, porDefecto = false) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return porDefecto;
  }
  const limpio = String(valor).trim().toUpperCase();
  return limpio === 'SI' || limpio === 'SÍ' || limpio === 'TRUE' || limpio === '1';
}

function aNumero(valor, porDefecto = 0) {
  if (typeof valor === 'number' && !Number.isNaN(valor)) return valor;
  const limpio = String(valor || '')
    .replace(/[^0-9.-]/g, '')
    .trim();
  const num = parseFloat(limpio);
  return Number.isNaN(num) ? porDefecto : num;
}

/**
 * Parser CSV sencillo y seguro que respeta comillas dobles y saltos de línea.
 */
function parsearCSV(textoCsv) {
  const filas = [];
  let filaActual = [];
  let celdaActual = '';
  let dentroComillas = false;

  for (let i = 0; i < textoCsv.length; i++) {
    const char = textoCsv[i];
    const siguiente = textoCsv[i + 1];

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
      if (filaActual.some((c) => c.trim() !== '')) {
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
    if (filaActual.some((c) => c.trim() !== '')) {
      filas.push(filaActual);
    }
  }

  if (filas.length < 2) return [];
  const encabezados = filas[0].map((h) => h.trim());
  return filas.slice(1).map((fila) => {
    const obj = {};
    encabezados.forEach((enc, idx) => {
      obj[enc] = fila[idx] !== undefined ? fila[idx].trim() : '';
    });
    return obj;
  });
}

async function leerPestanaCsv(sheetId, nombrePestana) {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    sheetId
  )}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nombrePestana)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`No se pudo leer la pestaña ${nombrePestana}`);
  }
  const csv = await resp.text();
  return parsearCSV(csv);
}

function convertirFilasConfigAObjeto(filasConfig) {
  const cfg = {};
  filasConfig.forEach((fila) => {
    const clave = (fila.clave || '').trim();
    if (clave) {
      cfg[clave] = fila.valor !== undefined ? fila.valor : '';
    }
  });
  return cfg;
}

/**
 * Datos de respaldo para probar WhatsVend antes de conectar un Google Sheet real.
 */
function obtenerDatosDemo() {
  const config = {
    nombre_negocio: 'Burger & Roll Studio',
    logo_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
    whatsapp_numero: '593999999999',
    codigo_pais: '593',
    moneda: '$',
    ubicacion_texto: 'Av. Principal y Calle 2 • Centro',
    fuente_nombre: 'Poppins',
    color_nombre: '#111827',
    color_principal: '#16a34a',
    aviso1_activo: 'SI',
    aviso1_texto: 'Promociones especiales de Lunes a Jueves',
    aviso1_fondo: '#1f2937',
    aviso1_texto_color: '#ffffff',
    aviso2_activo: 'SI',
    aviso2_texto: '🎁 10% de descuento pagando con Efectivo',
    aviso2_fondo: '#16a34a',
    aviso2_texto_color: '#ffffff',
    banner_inicio_activo: 'SI',
    banner_inicio_pc: 'https://images.unsplash.com/photo-1550547660-d9350f477399?w=1400',
    banner_inicio_movil: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    barra_estado_activo: 'SI',
    horario_apertura: '00:00',
    horario_cierre: '23:59',
    texto_abierto: 'Abierto ahora',
    texto_cerrado: 'Cerrado por ahora',
    barra_estado_derecha: 'Espera aprox. 30–40 min',
    barra_estado_fondo: '#18181b',
    barra_estado_texto: '#ffffff',
    texto_boton_portada: 'Ver menú',
    mostrar_boton_destacados: 'SI',
    texto_boton_destacados: 'Ver todo el menú',
    texto_boton_tarjeta: '+',
    texto_boton_modal_agregar: 'Agregar al pedido',
    texto_boton_ver_mas: 'Ver más productos',
    permitir_nota_producto: 'SI',
    modo_domicilio: 'SI',
    modo_retiro: 'SI',
    mensaje_retiro: 'Te esperamos en el local; tu pedido estará listo a tiempo.',
    modo_mesa: 'SI',
    propina_activa: 'SI',
    propina_porcentajes: '0,5,10,15',
    compartir_carrito_activo: 'SI',
    mostrar_footer_whatsvend: 'SI'
  };

  const portada = [
    {
      id: 'port_1',
      orden: 10,
      activo: 'SI',
      tipo: 'hero',
      titulo: 'Sabores que conquistan desde el primer bocado',
      subtitulo: 'Hecho al momento, entrega rápida y directo a tu WhatsApp.',
      imagen: 'https://images.unsplash.com/photo-1550547660-d9350f477399?w=1200',
      boton_texto: 'Ver menú',
      ids_productos_destacados: ''
    },
    {
      id: 'port_2',
      orden: 20,
      activo: 'SI',
      tipo: 'destacados',
      titulo: 'Favoritos de la casa',
      subtitulo: 'Toca cualquiera para ver opciones y pedir en segundos.',
      imagen: '',
      boton_texto: 'Ver todo el menú',
      ids_productos_destacados: 'prod_1,prod_2,prod_3'
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
      subtitulo_color: '#6b7280'
    },
    {
      id: 'sec_2',
      orden: 20,
      activo: 'SI',
      titulo: 'PROMOS Y COMBOS',
      subtitulo: 'Combinaciones preparadas para compartir y ahorrar.',
      estilo_modulo: 'lista',
      titulo_fuente: 'Poppins',
      titulo_tamano: '22px',
      titulo_color: '#111827',
      subtitulo_fuente: 'Poppins',
      subtitulo_tamano: '13px',
      subtitulo_color: '#6b7280'
    }
  ];

  // Generamos 14 productos en sec_1 para probar el límite de 12 + botón "Ver más"
  const productos = [];
  for (let i = 1; i <= 14; i++) {
    productos.push({
      id: `prod_${i}`,
      seccion_id: i <= 14 ? 'sec_1' : 'sec_2',
      nombre: i === 1 ? 'SUSHI DAY DOMINGO' : i === 2 ? 'SUSHI DAY MARTES' : `ESPECIALIDAD #${i}`,
      descripcion: 'Preparación fresca al momento con ingredientes seleccionados.',
      precio: i === 1 || i === 2 ? 14.9 : 9.5 + (i % 4),
      imagen:
        i % 2 === 0
          ? 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=700'
          : 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=700',
      etiqueta: i === 1 ? '★ TOP' : i === 3 ? 'NUEVO' : '',
      etiqueta_color: i === 1 ? '#dc2626' : '#16a34a',
      disponible: 'SI'
    });
  }

  productos.push({
    id: 'prod_combo_alitas',
    seccion_id: 'sec_2',
    nombre: 'CAJA 12 ALITAS',
    descripcion: 'Elige 2 sabores para repartir (ej. 6 maracuyá + 6 picante).',
    precio: 15.5,
    imagen: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=700',
    etiqueta: '★ TOP',
    etiqueta_color: '#dc2626',
    disponible: 'SI'
  });

  const extras = [
    {
      id: 'ext_1',
      producto_id: 'prod_1',
      regla_titulo: 'Elige presentación (Obligatorio)',
      opcion: 'Clásica',
      precio_extra: 0,
      obligatorio: 'SI',
      min_seleccion: 1,
      max_seleccion: 1
    },
    {
      id: 'ext_2',
      producto_id: 'prod_1',
      regla_titulo: 'Elige presentación (Obligatorio)',
      opcion: 'Doble porción',
      precio_extra: 4.5,
      obligatorio: 'SI',
      min_seleccion: 1,
      max_seleccion: 1
    },
    {
      id: 'ext_3',
      producto_id: 'prod_combo_alitas',
      regla_titulo: 'Elige 2 opciones de sabor (Obligatorio)',
      opcion: '6 Maracuyá',
      precio_extra: 0,
      obligatorio: 'SI',
      min_seleccion: 2,
      max_seleccion: 2
    },
    {
      id: 'ext_4',
      producto_id: 'prod_combo_alitas',
      regla_titulo: 'Elige 2 opciones de sabor (Obligatorio)',
      opcion: '6 Picante',
      precio_extra: 0,
      obligatorio: 'SI',
      min_seleccion: 2,
      max_seleccion: 2
    },
    {
      id: 'ext_5',
      producto_id: 'prod_combo_alitas',
      regla_titulo: 'Elige 2 opciones de sabor (Obligatorio)',
      opcion: '6 BBQ Ahumada',
      precio_extra: 0,
      obligatorio: 'SI',
      min_seleccion: 2,
      max_seleccion: 2
    },
    {
      id: 'ext_6',
      producto_id: 'prod_combo_alitas',
      regla_titulo: 'Extras adicionales (Opcional)',
      opcion: 'Dip de queso cheddar',
      precio_extra: 1.25,
      obligatorio: 'NO',
      min_seleccion: 0,
      max_seleccion: 3
    }
  ];

  const modulosExtra = [
    {
      id: 'mod_1',
      orden: 15,
      activo: 'SI',
      tipo: 'cinta',
      titulo: '',
      texto: 'HAZ TU PEDIDO CON ANTICIPACIÓN • ENTREGA RÁPIDA • RECIÉN HECHO',
      imagen_pc: '',
      imagen_movil: '',
      alineacion: 'centro',
      fuente: 'Poppins',
      tamano: '14px',
      color_texto: '#ffffff',
      color_fondo: '#1e3a8a',
      color_borde: '',
      grosor_linea: '',
      inclinacion_grados: -2,
      enlace_url: ''
    },
    {
      id: 'mod_2',
      orden: 18,
      activo: 'SI',
      tipo: 'cupon',
      titulo: '🎁 Cupón y promo activa',
      texto: 'Envío gratis desde $20 o 2x1 en seleccionados los martes.',
      imagen_pc: '',
      imagen_movil: '',
      alineacion: 'izquierda',
      fuente: 'Poppins',
      tamano: '14px',
      color_texto: '#111827',
      color_fondo: '#fef3c7',
      color_borde: '#f59e0b',
      grosor_linea: '',
      inclinacion_grados: 0,
      enlace_url: ''
    }
  ];

  return { config, portada, secciones, productos, extras, modulosExtra };
}

async function cargarDatosTienda(tiendaInfo, slug = '') {
  if (!tiendaInfo) {
    if (!slug) {
      return obtenerDatosDemo();
    }
    return {
      estadoError: 404,
      motivo: 'tienda_no_existe'
    };
  }

  if (tiendaInfo.activo === false) {
    return {
      estadoError: 404,
      motivo: 'tienda_inactiva',
      nombreReferencia: tiendaInfo.nombreReferencia || slug
    };
  }

  const tieneAppsScript =
    tiendaInfo.appsScriptUrl && tiendaInfo.appsScriptUrl.startsWith('http');
  const tieneSheetId =
    tiendaInfo.sheetId &&
    String(tiendaInfo.sheetId).trim() !== '' &&
    !String(tiendaInfo.sheetId).trim().startsWith('REEMPLAZA_AQUI');

  if (!tieneAppsScript && !tieneSheetId) {
    return obtenerDatosDemo();
  }

  if (tieneAppsScript) {
    try {
      const resp = await fetch(tiendaInfo.appsScriptUrl);
      if (!resp.ok) {
        return { estadoError: 404, motivo: 'sheet_no_disponible' };
      }
      const data = await resp.json();
      const configObj = Array.isArray(data.Config)
        ? convertirFilasConfigAObjeto(data.Config)
        : data.Config || {};

      if (!configObj || Object.keys(configObj).length === 0) {
        return { estadoError: 404, motivo: 'sheet_vacio' };
      }

      return {
        config: configObj,
        portada: data.Portada || [],
        secciones: data.Secciones || [],
        productos: data.Productos || [],
        extras: data.Extras || [],
        modulosExtra: data.ModulosExtra || []
      };
    } catch (err) {
      console.warn('Error al cargar tienda desde Apps Script:', err);
      return { estadoError: 404, motivo: 'sheet_no_disponible' };
    }
  }

  try {
    const [
      filasConfig,
      portada,
      secciones,
      productos,
      extras,
      modulosExtra
    ] = await Promise.all([
      leerPestanaCsv(tiendaInfo.sheetId.trim(), 'Config'),
      leerPestanaCsv(tiendaInfo.sheetId.trim(), 'Portada'),
      leerPestanaCsv(tiendaInfo.sheetId.trim(), 'Secciones'),
      leerPestanaCsv(tiendaInfo.sheetId.trim(), 'Productos'),
      leerPestanaCsv(tiendaInfo.sheetId.trim(), 'Extras'),
      leerPestanaCsv(tiendaInfo.sheetId.trim(), 'ModulosExtra')
    ]);

    const configObj = convertirFilasConfigAObjeto(filasConfig);
    if (!configObj || Object.keys(configObj).length === 0) {
      return { estadoError: 404, motivo: 'sheet_vacio' };
    }

    return {
      config: configObj,
      portada,
      secciones,
      productos,
      extras,
      modulosExtra
    };
  } catch (err) {
    console.warn('No se pudo cargar el Google Sheet de la tienda:', err);
    return {
      estadoError: 404,
      motivo: 'sheet_no_disponible',
      nombreReferencia: tiendaInfo.nombreReferencia || slug
    };
  }
}
