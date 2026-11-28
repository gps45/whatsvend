/**
 * ============================================================================
 * WhatsVend - Lógica del carrito, entregas y WhatsApp (carrito.js)
 * ============================================================================
 */

const estadoCarrito = {
  items: [],
  tipoEntrega: 'domicilio', // 'domicilio' | 'retiro' | 'mesa'
  propinaPorcentaje: 0,
  nombreCliente: '',
  telefonoCliente: '',
  direccionCliente: '',
  referenciaCliente: '',
  numeroMesa: '',
  gpsCoordenadas: null
};

function obtenerMoneda(config) {
  return (config && config.moneda) || '$';
}

function formatearPrecio(monto, config) {
  const moneda = obtenerMoneda(config);
  const num = aNumero(monto, 0);
  return `${moneda}${num.toFixed(2)}`;
}

function calcularSubtotalItems() {
  return estadoCarrito.items.reduce((acc, item) => {
    const precioBase = aNumero(item.precioUnitario, 0);
    const extrasTotal = (item.extras || []).reduce(
      (sum, ex) => sum + aNumero(ex.precio_extra, 0),
      0
    );
    return acc + (precioBase + extrasTotal) * aNumero(item.cantidad, 1);
  }, 0);
}

function calcularTotalCantidadItems() {
  return estadoCarrito.items.reduce(
    (acc, item) => acc + aNumero(item.cantidad, 1),
    0
  );
}

function calcularPropinaMonto(subtotal) {
  const pct = aNumero(estadoCarrito.propinaPorcentaje, 0);
  return subtotal * (pct / 100);
}

function calcularTotalGeneral() {
  const subtotal = calcularSubtotalItems();
  return subtotal + calcularPropinaMonto(subtotal);
}

function agregarAlCarrito(producto, extrasSeleccionados = [], nota = '', cantidad = 1) {
  const firmaExtras = (extrasSeleccionados || [])
    .map((e) => `${e.id || e.opcion}:${aNumero(e.precio_extra, 0)}`)
    .sort()
    .join('|');
  const notaLimpia = (nota || '').trim();
  const cantNum = Math.max(1, parseInt(cantidad, 10) || 1);

  const existente = estadoCarrito.items.find(
    (it) =>
      String(it.productoId) === String(producto.id) &&
      (it.firmaExtras || '') === firmaExtras &&
      (it.nota || '') === notaLimpia
  );

  if (existente) {
    existente.cantidad = aNumero(existente.cantidad, 1) + cantNum;
  } else {
    estadoCarrito.items.push({
      uid: `${producto.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productoId: producto.id,
      nombre: producto.nombre,
      imagen: producto.imagen || '',
      precioUnitario: aNumero(producto.precio, 0),
      extras: extrasSeleccionados.map((e) => ({
        id: e.id || '',
        regla_titulo: e.regla_titulo || '',
        opcion: e.opcion || '',
        precio_extra: aNumero(e.precio_extra, 0)
      })),
      firmaExtras,
      nota: notaLimpia,
      cantidad: cantNum
    });
  }

  notificarCambioCarrito();
}

function cambiarCantidadItem(uid, delta) {
  const idx = estadoCarrito.items.findIndex((it) => it.uid === uid);
  if (idx === -1) return;
  const nuevaCant = aNumero(estadoCarrito.items[idx].cantidad, 1) + delta;
  if (nuevaCant <= 0) {
    estadoCarrito.items.splice(idx, 1);
  } else {
    estadoCarrito.items[idx].cantidad = nuevaCant;
  }
  notificarCambioCarrito();
}

function eliminarItemCarrito(uid) {
  estadoCarrito.items = estadoCarrito.items.filter((it) => it.uid !== uid);
  notificarCambioCarrito();
}

function vaciarCarrito() {
  estadoCarrito.items = [];
  estadoCarrito.propinaPorcentaje = 0;
  notificarCambioCarrito();
}

function generarEnlaceCompartirCarrito() {
  try {
    const payload = {
      v: 1,
      items: estadoCarrito.items.map((it) => ({
        p: it.productoId,
        c: it.cantidad,
        n: it.nota || '',
        e: (it.extras || []).map((ex) => ex.opcion)
      })),
      t: estadoCarrito.tipoEntrega
    };
    const jsonStr = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const url = new URL(window.location.href);
    url.searchParams.set('cart', b64);
    return url.toString();
  } catch (err) {
    console.warn('No se pudo codificar el carrito:', err);
    return window.location.href;
  }
}

function cargarCarritoDesdeUrlSiExiste(productosDisponibles = [], extrasDisponibles = []) {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('cart');
    if (!raw) return false;

    let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(jsonStr);

    if (!data || !Array.isArray(data.items)) return false;

    estadoCarrito.items = [];
    data.items.forEach((itemCod) => {
      const prod = productosDisponibles.find(
        (p) => String(p.id) === String(itemCod.p)
      );
      if (!prod) return;

      const opcionesNombres = Array.isArray(itemCod.e) ? itemCod.e : [];
      const extrasMatch = opcionesNombres
        .map((nomOp) =>
          extrasDisponibles.find(
            (ex) =>
              String(ex.producto_id) === String(prod.id) &&
              String(ex.opcion) === String(nomOp)
          )
        )
        .filter(Boolean);

      agregarAlCarrito(prod, extrasMatch, itemCod.n || '', itemCod.c || 1);
    });

    if (data.t && ['domicilio', 'retiro', 'mesa'].includes(data.t)) {
      estadoCarrito.tipoEntrega = data.t;
    }

    return estadoCarrito.items.length > 0;
  } catch (err) {
    console.warn('Enlace de carrito inválido o corrupto:', err);
    return false;
  }
}

function capturarUbicacionGps(onSuccess, onError) {
  if (!navigator.geolocation) {
    if (onError) onError('Tu navegador no soporta geolocalización GPS.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = {
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6)
      };
      estadoCarrito.gpsCoordenadas = coords;
      if (onSuccess) onSuccess(coords);
    },
    (err) => {
      if (onError) onError(err.message || 'No se pudo obtener la ubicación GPS.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function construirMensajeWhatsApp(config) {
  const moneda = obtenerMoneda(config);
  const lineas = [];
  const nombreNegocio = (config && config.nombre_negocio) || 'Pedido';

  lineas.push(`*Nuevo pedido — ${nombreNegocio}*`);
  lineas.push('');

  estadoCarrito.items.forEach((it, idx) => {
    const extrasUnit = (it.extras || []).reduce(
      (s, e) => s + aNumero(e.precio_extra, 0),
      0
    );
    const totalLinea = (aNumero(it.precioUnitario, 0) + extrasUnit) * aNumero(it.cantidad, 1);
    lineas.push(`${idx + 1}. *${it.cantidad}x ${it.nombre}* — ${moneda}${totalLinea.toFixed(2)}`);

    if (it.extras && it.extras.length > 0) {
      const descExtras = it.extras
        .map((ex) => {
          const pe = aNumero(ex.precio_extra, 0);
          return pe > 0 ? `${ex.opcion} (+${moneda}${pe.toFixed(2)})` : ex.opcion;
        })
        .join(', ');
      lineas.push(`   • Opciones: ${descExtras}`);
    }

    if (it.nota) {
      lineas.push(`   • Nota: _${it.nota}_`);
    }
  });

  const subtotal = calcularSubtotalItems();
  const propina = calcularPropinaMonto(subtotal);
  const total = subtotal + propina;

  lineas.push('');
  lineas.push(`Subtotal: *${moneda}${subtotal.toFixed(2)}*`);
  if (propina > 0) {
    lineas.push(`Propina (${estadoCarrito.propinaPorcentaje}%): *${moneda}${propina.toFixed(2)}*`);
  }
  lineas.push(`*Total a pagar: ${moneda}${total.toFixed(2)}*`);
  lineas.push('');

  if (estadoCarrito.tipoEntrega === 'domicilio') {
    lineas.push(`Modalidad: *${(config && config.etiqueta_domicilio) || 'A domicilio'}*`);
    if (estadoCarrito.nombreCliente) lineas.push(`Cliente: ${estadoCarrito.nombreCliente}`);
    if (estadoCarrito.telefonoCliente) lineas.push(`Teléfono: ${estadoCarrito.telefonoCliente}`);
    if (estadoCarrito.direccionCliente) lineas.push(`Dirección: ${estadoCarrito.direccionCliente}`);
    if (estadoCarrito.referenciaCliente) lineas.push(`Referencia: ${estadoCarrito.referenciaCliente}`);
    if (estadoCarrito.gpsCoordenadas) {
      const { lat, lng } = estadoCarrito.gpsCoordenadas;
      lineas.push(`GPS: https://maps.google.com/?q=${lat},${lng}`);
    }
  } else if (estadoCarrito.tipoEntrega === 'retiro') {
    lineas.push(`Modalidad: *${(config && config.etiqueta_retiro) || 'Retiro en local'}*`);
    if (estadoCarrito.nombreCliente) lineas.push(`Cliente: ${estadoCarrito.nombreCliente}`);
    if (estadoCarrito.telefonoCliente) lineas.push(`Teléfono: ${estadoCarrito.telefonoCliente}`);
  } else if (estadoCarrito.tipoEntrega === 'mesa') {
    lineas.push(`Modalidad: *${(config && config.etiqueta_mesa) || 'En mesa'}*`);
    if (estadoCarrito.numeroMesa) lineas.push(`Mesa: *${estadoCarrito.numeroMesa}*`);
    if (estadoCarrito.nombreCliente) lineas.push(`Cliente: ${estadoCarrito.nombreCliente}`);
  }

  return lineas.join('\n');
}

function enviarPedidoPorWhatsApp(config) {
  if (!estadoCarrito.items.length) return;

  if (estadoCarrito.tipoEntrega === 'domicilio') {
    if (!estadoCarrito.direccionCliente.trim()) {
      alert('Por favor ingresa tu dirección de entrega.');
      return;
    }
    if (esSi(config && config.domicilio_pedir_telefono, true) && !estadoCarrito.telefonoCliente.trim()) {
      alert('Por favor ingresa tu número de teléfono.');
      return;
    }
  } else if (estadoCarrito.tipoEntrega === 'mesa') {
    if (!estadoCarrito.numeroMesa.trim()) {
      alert('Por favor indica el número de mesa.');
      return;
    }
  }

  let numeroLimpio = String((config && config.whatsapp_numero) || '').replace(/\D/g, '');
  const codPais = String((config && config.codigo_pais) || '').replace(/\D/g, '');
  if (codPais && numeroLimpio && !numeroLimpio.startsWith(codPais) && numeroLimpio.length <= 10) {
    numeroLimpio = codPais + numeroLimpio;
  }

  if (!numeroLimpio) {
    alert('No hay un número de WhatsApp configurado en la hoja Config.');
    return;
  }

  const texto = encodeURIComponent(construirMensajeWhatsApp(config));
  const url = `https://wa.me/${numeroLimpio}?text=${texto}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function notificarCambioCarrito() {
  if (typeof window.alCambiarCarrito === 'function') {
    window.alCambiarCarrito();
  }
}
