/**
 * ============================================================================
 * WhatsVend - Lógica de Carrito, Reglas de Extras y Pedidos (carrito.js)
 * ============================================================================
 * Gestiona:
 * - Items agregados con su precio unitario (base + extras), cantidad y nota.
 * - Validación de reglas de extras (obligatorio, min_seleccion, max_seleccion).
 * - Modos de entrega (domicilio con GPS, retiro en local, mesa).
 * - Cálculo de propina por porcentaje.
 * - Enlace compartible para abrir el carrito con el pedido cargado.
 * - Generación del mensaje formateado para WhatsApp (con código de país).
 * ============================================================================
 */

class GestorCarrito {
  constructor(slugTienda = 'vend') {
    this.slugTienda = slugTienda;
    this.storageKey = `whatsvend_cart_${slugTienda}`;
    this.estado = {
      items: [],
      modoEntrega: 'domicilio', // 'domicilio' | 'retiro' | 'mesa'
      clienteNombre: '',
      clienteTelefono: '',
      direccion: '',
      gpsCoords: null, // { lat, lng }
      mesaNumero: '',
      porcentajePropina: 0,
      notaPedido: ''
    };
    this.cargarDesdeStorage();
    this.cargarDesdeUrlSiExiste();
  }

  cargarDesdeStorage() {
    try {
      const guardado = localStorage.getItem(this.storageKey);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        this.estado = { ...this.estado, ...parsed };
      }
    } catch (_) {
      // Ignorar errores de almacenamiento privado
    }
  }

  guardarEnStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.estado));
    } catch (_) {
      // Ignorar errores de almacenamiento privado
    }
  }

  /**
   * Si alguien abre un enlace compartido (?pedido=...), decodifica e importa
   * los productos del carrito.
   */
  cargarDesdeUrlSiExiste() {
    try {
      const params = new URLSearchParams(window.location.search);
      const codificado = params.get('pedido');
      if (!codificado) return;

      const jsonStr = decodeURIComponent(escape(atob(codificado)));
      const datosCompartidos = JSON.parse(jsonStr);
      if (Array.isArray(datosCompartidos.items) && datosCompartidos.items.length > 0) {
        this.estado.items = datosCompartidos.items;
        if (datosCompartidos.modoEntrega) {
          this.estado.modoEntrega = datosCompartidos.modoEntrega;
        }
        if (typeof datosCompartidos.porcentajePropina === 'number') {
          this.estado.porcentajePropina = datosCompartidos.porcentajePropina;
        }
        this.guardarEnStorage();
      }
    } catch (err) {
      console.warn('Enlace de pedido no válido:', err);
    }
  }

  generarEnlaceCompartible() {
    const payload = {
      items: this.estado.items,
      modoEntrega: this.estado.modoEntrega,
      porcentajePropina: this.estado.porcentajePropina
    };
    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = new URL(window.location.href);
    url.searchParams.set('pedido', base64);
    return url.toString();
  }

  agregarItem(producto, cantidad = 1, extrasSeleccionados = [], nota = '') {
    const precioExtras = extrasSeleccionados.reduce(
      (sum, ex) => sum + aNumero(ex.precio_extra, 0),
      0
    );
    const precioUnitario = aNumero(producto.precio, 0) + precioExtras;
    const claveFirma = `${producto.id}__${extrasSeleccionados
      .map((e) => e.id)
      .sort()
      .join(',')}__${(nota || '').trim()}`;

    const existente = this.estado.items.find((it) => it.claveFirma === claveFirma);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      this.estado.items.push({
        uid: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        claveFirma,
        productoId: producto.id,
        nombre: producto.nombre,
        precioUnitario,
        cantidad,
        extras: extrasSeleccionados,
        nota: (nota || '').trim()
      });
    }
    this.guardarEnStorage();
  }

  cambiarCantidad(uid, delta) {
    const idx = this.estado.items.findIndex((it) => it.uid === uid);
    if (idx === -1) return;
    this.estado.items[idx].cantidad += delta;
    if (this.estado.items[idx].cantidad <= 0) {
      this.estado.items.splice(idx, 1);
    }
    this.guardarEnStorage();
  }

  vaciar() {
    this.estado.items = [];
    this.guardarEnStorage();
  }

  obtenerCantidadTotal() {
    return this.estado.items.reduce((acc, it) => acc + it.cantidad, 0);
  }

  obtenerSubtotal() {
    return this.estado.items.reduce(
      (acc, it) => acc + it.precioUnitario * it.cantidad,
      0
    );
  }

  obtenerMontoPropina() {
    const sub = this.obtenerSubtotal();
    return (sub * aNumero(this.estado.porcentajePropina, 0)) / 100;
  }

  obtenerTotalFinal() {
    return this.obtenerSubtotal() + this.obtenerMontoPropina();
  }

  /**
   * Agrupa los extras de un producto por `regla_titulo` y valida si la
   * selección actual cumple con `obligatorio`, `min_seleccion` y `max_seleccion`.
   */
  static agruparReglasProducto(extrasProducto) {
    const gruposMap = new Map();
    extrasProducto.forEach((ex) => {
      const tituloRegla = (ex.regla_titulo || 'Opciones').trim();
      if (!gruposMap.has(tituloRegla)) {
        gruposMap.set(tituloRegla, {
          regla_titulo: tituloRegla,
          obligatorio: esSi(ex.obligatorio, false),
          min_seleccion: Math.max(0, Math.floor(aNumero(ex.min_seleccion, 0))),
          max_seleccion: Math.max(0, Math.floor(aNumero(ex.max_seleccion, 0))),
          opciones: []
        });
      }
      const grupo = gruposMap.get(tituloRegla);
      // Si alguna fila del grupo marca obligatorio SI o min > 0, se respeta
      if (esSi(ex.obligatorio, false)) grupo.obligatorio = true;
      const minVal = Math.max(0, Math.floor(aNumero(ex.min_seleccion, 0)));
      const maxVal = Math.max(0, Math.floor(aNumero(ex.max_seleccion, 0)));
      if (minVal > grupo.min_seleccion) grupo.min_seleccion = minVal;
      if (maxVal > 0 && (grupo.max_seleccion === 0 || maxVal < grupo.max_seleccion)) {
        grupo.max_seleccion = maxVal;
      }
      grupo.opciones.push(ex);
    });
    return Array.from(gruposMap.values());
  }

  static validarSelecciones(grupos, seleccionIdsSet) {
    for (const grupo of grupos) {
      const elegidasEnGrupo = grupo.opciones.filter((op) =>
        seleccionIdsSet.has(op.id)
      );
      const cant = elegidasEnGrupo.length;
      const minRequerido = grupo.obligatorio
        ? Math.max(1, grupo.min_seleccion)
        : grupo.min_seleccion;

      if (minRequerido > 0 && cant < minRequerido) {
        return {
          valido: false,
          mensaje: `En "${grupo.regla_titulo}" debes seleccionar al menos ${minRequerido} opción(es).`
        };
      }

      if (grupo.max_seleccion > 0 && cant > grupo.max_seleccion) {
        return {
          valido: false,
          mensaje: `En "${grupo.regla_titulo}" puedes seleccionar máximo ${grupo.max_seleccion} opción(es).`
        };
      }
    }
    return { valido: true, mensaje: '' };
  }

  construirUrlWhatsApp(config) {
    const moneda = (config.moneda || '$').trim();
    const codigoPais = (config.codigo_pais || '593').replace(/[^0-9]/g, '');
    let numeroLimpio = (config.whatsapp_numero || '').replace(/[^0-9]/g, '');

    if (numeroLimpio.startsWith('0') && codigoPais) {
      numeroLimpio = codigoPais + numeroLimpio.slice(1);
    }

    const lineas = [
      `*NUEVO PEDIDO — ${config.nombre_negocio || 'WhatsVend'}*`,
      ''
    ];

    this.estado.items.forEach((it) => {
      const subtotalItem = (it.precioUnitario * it.cantidad).toFixed(2);
      lineas.push(`• *${it.cantidad}x ${it.nombre}* — ${moneda}${subtotalItem}`);
      if (it.extras && it.extras.length > 0) {
        const nombresExtras = it.extras.map((e) => e.opcion).join(', ');
        lineas.push(`   _Opciones:_ ${nombresExtras}`);
      }
      if (it.nota) {
        lineas.push(`   _Nota:_ ${it.nota}`);
      }
    });

    lineas.push('');
    lineas.push(`*Subtotal:* ${moneda}${this.obtenerSubtotal().toFixed(2)}`);

    const propinaMonto = this.obtenerMontoPropina();
    if (propinaMonto > 0) {
      lineas.push(
        `*Propina (${this.estado.porcentajePropina}%):* ${moneda}${propinaMonto.toFixed(2)}`
      );
    }

    lineas.push(`*Total a pagar:* ${moneda}${this.obtenerTotalFinal().toFixed(2)}`);
    lineas.push('');

    if (this.estado.modoEntrega === 'domicilio') {
      lineas.push('*Entrega:* A domicilio');
      if (this.estado.clienteNombre) lineas.push(`*Cliente:* ${this.estado.clienteNombre}`);
      if (this.estado.clienteTelefono) lineas.push(`*Teléfono:* ${this.estado.clienteTelefono}`);
      if (this.estado.direccion) lineas.push(`*Dirección:* ${this.estado.direccion}`);
      if (this.estado.gpsCoords) {
        const { lat, lng } = this.estado.gpsCoords;
        lineas.push(`*Ubicación GPS:* https://maps.google.com/?q=${lat},${lng}`);
      }
    } else if (this.estado.modoEntrega === 'retiro') {
      lineas.push('*Entrega:* Retiro en local');
      if (this.estado.clienteNombre) lineas.push(`*Cliente:* ${this.estado.clienteNombre}`);
    } else if (this.estado.modoEntrega === 'mesa') {
      lineas.push(`*Entrega:* En mesa${this.estado.mesaNumero ? ` #${this.estado.mesaNumero}` : ''}`);
    }

    if (this.estado.notaPedido) {
      lineas.push(`*Comentario general:* ${this.estado.notaPedido}`);
    }

    const textoCodificado = encodeURIComponent(lineas.join('\n'));
    return `https://wa.me/${numeroLimpio}?text=${textoCodificado}`;
  }
}