/**
 * ============================================================================
 * WhatsVend - Controlador principal y eventos de la app (app.js)
 * ============================================================================
 */

const estadoApp = {
  tiendaInfo: null,
  datos: null,
  vistaActual: 'cargando', // 'cargando' | 'portada' | 'catalogo'
  seccionActivaId: 'TODAS',
  busqueda: '',
  seccionesExpandidas: {},
  modalProductoId: null,
  modalCarritoAbierto: false,
  modalWhatsVendAbierto: false,
  enlaceCompartidoActual: ''
};

function aplicarTemaGlobal(config) {
  if (!config) return;
  const root = document.documentElement;

  if (config.color_principal) {
    root.style.setProperty('--wv-primario', config.color_principal);
  }
  if (config.color_fondo_app) {
    root.style.setProperty('--wv-fondo', config.color_fondo_app);
  }
  if (config.color_superficie) {
    root.style.setProperty('--wv-superficie', config.color_superficie);
  }
  if (config.color_texto_general) {
    root.style.setProperty('--wv-texto', config.color_texto_general);
  }
  if (config.fuente_general) {
    root.style.setProperty(
      '--wv-fuente-base',
      `'${config.fuente_general}', system-ui, -apple-system, sans-serif`
    );
  }
  if (config.logo_alto_pc) {
    const v = /^[0-9]+$/.test(String(config.logo_alto_pc).trim())
      ? `${config.logo_alto_pc.trim()}px`
      : config.logo_alto_pc.trim();
    root.style.setProperty('--wv-logo-alto-pc', v);
  }
  if (config.logo_alto_movil) {
    const v = /^[0-9]+$/.test(String(config.logo_alto_movil).trim())
      ? `${config.logo_alto_movil.trim()}px`
      : config.logo_alto_movil.trim();
    root.style.setProperty('--wv-logo-alto-movil', v);
  }
  if (config.tamano_titulo_producto) {
    const v = /^[0-9]+$/.test(String(config.tamano_titulo_producto).trim())
      ? `${config.tamano_titulo_producto.trim()}px`
      : config.tamano_titulo_producto.trim();
    root.style.setProperty('--wv-tam-prod-titulo', v);
  }
  if (config.tamano_precio_producto) {
    const v = /^[0-9]+$/.test(String(config.tamano_precio_producto).trim())
      ? `${config.tamano_precio_producto.trim()}px`
      : config.tamano_precio_producto.trim();
    root.style.setProperty('--wv-tam-prod-precio', v);
  }
  if (config.tamano_etiqueta_producto) {
    const v = /^[0-9]+$/.test(String(config.tamano_etiqueta_producto).trim())
      ? `${config.tamano_etiqueta_producto.trim()}px`
      : config.tamano_etiqueta_producto.trim();
    root.style.setProperty('--wv-tam-prod-etiqueta', v);
  }

  cargarFuentesGoogle(config, estadoApp.datos);
}

function cargarFuentesGoogle(config, datos) {
  const familias = new Set(['Poppins', 'Bebas Neue']);
  if (config && config.fuente_general) familias.add(config.fuente_general.trim());
  if (config && config.fuente_nombre) familias.add(config.fuente_nombre.trim());

  if (datos) {
    (datos.secciones || []).forEach((s) => {
      if (s.titulo_fuente) familias.add(s.titulo_fuente.trim());
      if (s.subtitulo_fuente) familias.add(s.subtitulo_fuente.trim());
    });
    (datos.portada || []).forEach((b) => {
      if (b.fuente) familias.add(b.fuente.trim());
    });
    (datos.modulosExtra || []).forEach((m) => {
      if (m.fuente) familias.add(m.fuente.trim());
    });
  }

  const limpias = Array.from(familias).filter(Boolean);
  if (!limpias.length) return;

  const idLink = 'wv-google-fonts-dinamico';
  let linkEl = document.getElementById(idLink);
  if (!linkEl) {
    linkEl = document.createElement('link');
    linkEl.id = idLink;
    linkEl.rel = 'stylesheet';
    document.head.appendChild(linkEl);
  }

  const query = limpias
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700;800`)
    .join('&');
  linkEl.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

function renderizarApp() {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  if (!estadoApp.datos) {
    appRoot.innerHTML = `<div class="wv-cargando">Cargando catálogo...</div>`;
    return;
  }

  const { config, secciones } = estadoApp.datos;
  aplicarTemaGlobal(config);

  if (estadoApp.vistaActual === 'portada') {
    appRoot.innerHTML = `
      ${renderAvisosSuperiores(config)}
      ${renderPortadaModular(
        estadoApp.datos,
        () => irACatalogo(),
        (prodId) => abrirModalProducto(prodId)
      )}
      ${renderBarraCarritoFlotante(config)}
      ${renderModalesHtml()}
    `;
    enlazarEventosPortada();
    enlazarEventosModales();
    return;
  }

  const seccionesActivas = (secciones || [])
    .filter((s) => esSi(s.activo, true))
    .sort((a, b) => aNumero(a.orden, 999) - aNumero(b.orden, 999));

  appRoot.innerHTML = `
    ${renderAvisosSuperiores(config)}
    ${renderCabeceraPegajosa(
      config,
      seccionesActivas,
      estadoApp.seccionActivaId,
      estadoApp.busqueda
    )}
    ${renderBannerYEstado(config)}
    ${renderCatalogoPrincipal(estadoApp.datos, {
      busqueda: estadoApp.busqueda,
      seccionId: estadoApp.seccionActivaId,
      seccionesExpandidas: estadoApp.seccionesExpandidas
    })}
    ${renderBarraCarritoFlotante(config)}
    ${renderModalesHtml()}
  `;

  enlazarEventosCatalogo();
  enlazarEventosModales();
  actualizarEstadoScrollHeader();
}

function irACatalogo(seccionId = 'TODAS') {
  estadoApp.vistaActual = 'catalogo';
  estadoApp.seccionActivaId = seccionId || 'TODAS';
  renderizarApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enlazarEventosPortada() {
  const btnDefault = document.getElementById('btnEntrarCatalogoDefault');
  if (btnDefault) {
    btnDefault.addEventListener('click', () => irACatalogo());
  }

  document.querySelectorAll('.js-btn-ir-catalogo').forEach((btn) => {
    btn.addEventListener('click', () => irACatalogo());
  });

  document.querySelectorAll('.wv-destacado-card[data-prod-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const prodId = card.getAttribute('data-prod-id');
      if (prodId) abrirModalProducto(prodId);
    });
  });

  const barraFlotante = document.getElementById('wvBarraCarritoFlotante');
  if (barraFlotante) {
    barraFlotante.addEventListener('click', () => abrirModalCarrito());
  }
}

function enlazarEventosCatalogo() {
  document.querySelectorAll('.wv-cat-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const secId = pill.getAttribute('data-sec-id') || 'TODAS';
      estadoApp.seccionActivaId = secId;
      renderizarApp();
      if (secId !== 'TODAS') {
        const elSec = document.getElementById(`wv-sec-${secId}`);
        if (elSec) elSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const inputPc = document.getElementById('wvBuscadorPc');
  const inputMovil = document.getElementById('wvBuscadorMovil');
  const drawerMovil = document.getElementById('wvBuscadorMovilDrawer');
  const btnLupa = document.getElementById('wvBtnLupaMovil');

  if (btnLupa && drawerMovil) {
    btnLupa.addEventListener('click', () => {
      drawerMovil.classList.toggle('is-open');
      if (drawerMovil.classList.contains('is-open') && inputMovil) {
        setTimeout(() => inputMovil.focus(), 50);
      }
    });
  }

  const manejarBusqueda = (valor) => {
    estadoApp.busqueda = valor;
    const posY = window.scrollY;
    renderizarApp();
    window.scrollTo(0, posY);
    const nuevoInput =
      window.innerWidth >= 768
        ? document.getElementById('wvBuscadorPc')
        : document.getElementById('wvBuscadorMovil');
    if (nuevoInput) {
      nuevoInput.focus();
      const len = nuevoInput.value.length;
      nuevoInput.setSelectionRange(len, len);
    }
  };

  if (inputPc) {
    inputPc.addEventListener('input', (e) => manejarBusqueda(e.target.value));
  }
  if (inputMovil) {
    inputMovil.addEventListener('input', (e) => manejarBusqueda(e.target.value));
  }

  document.querySelectorAll('.js-abrir-detalle').forEach((el) => {
    el.addEventListener('click', () => {
      const card = el.closest('[data-prod-id]');
      const prodId = card && card.getAttribute('data-prod-id');
      if (prodId) abrirModalProducto(prodId);
    });
  });

  document.querySelectorAll('.js-btn-rapido').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('[data-prod-id]');
      const prodId = card && card.getAttribute('data-prod-id');
      if (!prodId || !estadoApp.datos) return;

      const prod = (estadoApp.datos.productos || []).find(
        (p) => String(p.id) === String(prodId)
      );
      if (!prod) return;

      const extrasProd = (estadoApp.datos.extras || []).filter(
        (ex) => String(ex.producto_id) === String(prod.id)
      );
      const tieneObligatorios = extrasProd.some((ex) => esSi(ex.obligatorio, false));

      if (tieneObligatorios) {
        abrirModalProducto(prodId);
      } else {
        agregarAlCarrito(prod, [], '', 1);
      }
    });
  });

  document.querySelectorAll('.js-ver-mas-sec').forEach((btn) => {
    btn.addEventListener('click', () => {
      const secId = btn.getAttribute('data-sec-id');
      if (!secId) return;
      estadoApp.seccionesExpandidas[secId] = true;
      renderizarApp();
    });
  });

  const btnCarritoPc = document.getElementById('wvBtnCarritoPc');
  const btnResumenMovil = document.getElementById('wvBtnResumenMovil');
  const barraFlotante = document.getElementById('wvBarraCarritoFlotante');

  if (btnCarritoPc) btnCarritoPc.addEventListener('click', () => abrirModalCarrito());
  if (btnResumenMovil) btnResumenMovil.addEventListener('click', () => abrirModalCarrito());
  if (barraFlotante) barraFlotante.addEventListener('click', () => abrirModalCarrito());

  const btnWhatsVend = document.getElementById('wvBtnAbrirModalWhatsVend');
  if (btnWhatsVend) {
    btnWhatsVend.addEventListener('click', () => {
      estadoApp.modalWhatsVendAbierto = true;
      renderizarApp();
    });
  }
}

function obtenerExtrasProducto(productoId) {
  if (!estadoApp.datos || !Array.isArray(estadoApp.datos.extras)) return [];
  return estadoApp.datos.extras.filter(
    (ex) => String(ex.producto_id) === String(productoId)
  );
}

function agruparReglasExtras(extrasProducto) {
  const grupos = [];
  const mapa = new Map();

  extrasProducto.forEach((ex, idx) => {
    const clave = `${ex.regla_titulo || 'Opciones'}__${esSi(ex.obligatorio, false) ? '1' : '0'}__${aNumero(ex.min_seleccion, 0)}__${aNumero(ex.max_seleccion, 99)}`;
    if (!mapa.has(clave)) {
      const grupo = {
        id: `grupo_${idx}`,
        titulo: ex.regla_titulo || 'Opciones disponibles',
        obligatorio: esSi(ex.obligatorio, false),
        min: aNumero(ex.min_seleccion, esSi(ex.obligatorio, false) ? 1 : 0),
        max: Math.max(1, aNumero(ex.max_seleccion, esSi(ex.obligatorio, false) ? 1 : 99)),
        opciones: []
      };
      mapa.set(clave, grupo);
      grupos.push(grupo);
    }
    mapa.get(clave).opciones.push(ex);
  });

  return grupos;
}

function abrirModalProducto(productoId) {
  estadoApp.modalProductoId = productoId;
  estadoApp.modalCarritoAbierto = false;
  estadoApp.modalWhatsVendAbierto = false;
  renderizarApp();
}

function abrirModalCarrito() {
  estadoApp.modalCarritoAbierto = true;
  estadoApp.modalProductoId = null;
  estadoApp.modalWhatsVendAbierto = false;
  renderizarApp();
}

function cerrarTodosLosModales() {
  estadoApp.modalProductoId = null;
  estadoApp.modalCarritoAbierto = false;
  estadoApp.modalWhatsVendAbierto = false;
  estadoApp.enlaceCompartidoActual = '';
  renderizarApp();
}

function renderModalesHtml() {
  if (!estadoApp.datos) return '';
  const { config, productos } = estadoApp.datos;
  const moneda = obtenerMoneda(config);

  if (estadoApp.modalProductoId) {
    const prod = (productos || []).find(
      (p) => String(p.id) === String(estadoApp.modalProductoId)
    );
    if (!prod) return '';

    const extrasProd = obtenerExtrasProducto(prod.id);
    const grupos = agruparReglasExtras(extrasProd);
    const permitirNota = esSi(config.permitir_nota_producto, true);
    const placeholderNota = config.placeholder_nota_producto || 'Ej. Sin cebolla, bien cocido...';
    const textoBtnAgregar = config.texto_boton_modal_agregar || 'Agregar al pedido';

    const gruposHtml = grupos
      .map((g, gIdx) => {
        const esRadio = g.min === 1 && g.max === 1;
        const inputType = esRadio ? 'radio' : 'checkbox';
        const badgeReq = g.obligatorio
          ? `<span style="color:#dc2626;font-size:0.78rem;margin-left:6px;">(Obligatorio: mín ${g.min}, máx ${g.max})</span>`
          : `<span style="color:var(--wv-texto-suave);font-size:0.78rem;margin-left:6px;">(Opcional: máx ${g.max})</span>`;

        const opcionesHtml = g.opciones
          .map((op, oIdx) => {
            const precioExtra = aNumero(op.precio_extra, 0);
            const precioTexto =
              precioExtra > 0 ? `+${formatearPrecio(precioExtra, config)}` : 'Gratis';
            const checkedAttr = esRadio && oIdx === 0 ? 'checked' : '';
            return `
              <label class="wv-opcion-extra-item">
                <span style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input
                    type="${inputType}"
                    name="grupo_extra_${gIdx}"
                    class="js-input-extra"
                    data-grupo-idx="${gIdx}"
                    data-extra-id="${escaparHtml(op.id || '')}"
                    data-regla="${escaparHtml(g.titulo)}"
                    data-opcion="${escaparHtml(op.opcion)}"
                    data-precio="${precioExtra}"
                    ${checkedAttr}
                  />
                  <span>${escaparHtml(op.opcion)}</span>
                </span>
                <span style="font-weight:700;">${precioTexto}</span>
              </label>
            `;
          })
          .join('');

        return `
          <div class="wv-grupo-extras" data-grupo-container="${gIdx}" data-min="${g.min}" data-max="${g.max}" data-obligatorio="${g.obligatorio ? '1' : '0'}">
            <div class="wv-grupo-extras-titulo">${escaparHtml(g.titulo)} ${badgeReq}</div>
            ${opcionesHtml}
          </div>
        `;
      })
      .join('');

    return `
      <div class="wv-modal-backdrop is-open" id="wvModalBackdrop">
        <div class="wv-modal-dialog" role="dialog" aria-modal="true">
          <button type="button" class="wv-modal-cerrar" id="wvBtnCerrarModal">✕</button>
          ${
            prod.imagen
              ? `<img src="${escaparHtml(prod.imagen)}" alt="${escaparHtml(prod.nombre)}" style="width:100%;max-height:240px;object-fit:cover;border-radius:14px;margin-bottom:14px;" />`
              : ''
          }
          <h2 style="margin:0 0 6px;font-size:1.3rem;">${escaparHtml(prod.nombre)}</h2>
          <div style="font-size:1.15rem;font-weight:800;color:var(--wv-primario);margin-bottom:8px;">
            ${formatearPrecio(prod.precio, config)}
          </div>
          ${prod.descripcion ? `<p style="margin:0 0 12px;color:var(--wv-texto-suave);font-size:0.9rem;">${escaparHtml(prod.descripcion)}</p>` : ''}

          ${gruposHtml}

          ${
            permitirNota
              ? `<div style="margin-top:14px;">
                   <label style="display:block;font-weight:700;font-size:0.88rem;margin-bottom:6px;">Notas especiales</label>
                   <input type="text" id="wvInputNotaProducto" class="wv-buscador-input" style="border-radius:10px;" placeholder="${escaparHtml(placeholderNota)}" />
                 </div>`
              : ''
          }

          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;">
            <div style="display:inline-flex;align-items:center;gap:10px;border:1px solid var(--wv-borde);border-radius:10px;padding:6px 10px;">
              <button type="button" id="wvCantMenos" style="border:none;background:none;font-size:1.1rem;font-weight:800;cursor:pointer;">-</button>
              <span id="wvCantValor" style="font-weight:800;min-width:20px;text-align:center;">1</span>
              <button type="button" id="wvCantMas" style="border:none;background:none;font-size:1.1rem;font-weight:800;cursor:pointer;">+</button>
            </div>
            <button type="button" class="wv-btn-primario" id="wvBtnConfirmarAgregar" style="flex:1;">
              ${escaparHtml(textoBtnAgregar)}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (estadoApp.modalCarritoAbierto) {
    const itemsHtml = estadoCarrito.items.length
      ? estadoCarrito.items
          .map((it) => {
            const extrasUnit = (it.extras || []).reduce(
              (s, e) => s + aNumero(e.precio_extra, 0),
              0
            );
            const totalLinea =
              (aNumero(it.precioUnitario, 0) + extrasUnit) * aNumero(it.cantidad, 1);
            const extrasTxt = (it.extras || [])
              .map((e) => e.opcion)
              .filter(Boolean)
              .join(', ');

            return `
              <div style="border-bottom:1px solid var(--wv-borde);padding:12px 0;display:flex;justify-content:space-between;gap:10px;">
                <div style="flex:1;">
                  <div style="font-weight:700;">${escaparHtml(it.nombre)}</div>
                  ${extrasTxt ? `<div style="font-size:0.8rem;color:var(--wv-texto-suave);">${escaparHtml(extrasTxt)}</div>` : ''}
                  ${it.nota ? `<div style="font-size:0.8rem;color:var(--wv-primario);">Nota: ${escaparHtml(it.nota)}</div>` : ''}
                  <div style="font-weight:800;margin-top:4px;">${formatearPrecio(totalLinea, config)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <button type="button" class="wv-btn-secundario js-item-menos" data-uid="${escaparHtml(it.uid)}" style="padding:4px 10px;">-</button>
                  <span style="font-weight:700;">${it.cantidad}</span>
                  <button type="button" class="wv-btn-secundario js-item-mas" data-uid="${escaparHtml(it.uid)}" style="padding:4px 10px;">+</button>
                  <button type="button" class="wv-btn-secundario js-item-borrar" data-uid="${escaparHtml(it.uid)}" style="padding:4px 8px;color:#dc2626;">🗑</button>
                </div>
              </div>
            `;
          })
          .join('')
      : `<div style="text-align:center;padding:24px;color:var(--wv-texto-suave);">Tu carrito está vacío.</div>`;

    const modos = [];
    if (esSi(config.modo_domicilio, true)) {
      modos.push({ id: 'domicilio', label: config.etiqueta_domicilio || 'A domicilio' });
    }
    if (esSi(config.modo_retiro, true)) {
      modos.push({ id: 'retiro', label: config.etiqueta_retiro || 'Retiro en local' });
    }
    if (esSi(config.modo_mesa, true)) {
      modos.push({ id: 'mesa', label: config.etiqueta_mesa || 'En mesa' });
    }

    if (modos.length && !modos.some((m) => m.id === estadoCarrito.tipoEntrega)) {
      estadoCarrito.tipoEntrega = modos[0].id;
    }

    const tabsModoHtml = modos
      .map(
        (m) => `
        <button
          type="button"
          class="wv-cat-pill js-modo-entrega ${estadoCarrito.tipoEntrega === m.id ? 'is-active' : ''}"
          data-modo="${m.id}"
        >
          ${escaparHtml(m.label)}
        </button>
      `
      )
      .join('');

    let camposEntregaHtml = '';
    if (estadoCarrito.tipoEntrega === 'domicilio') {
      camposEntregaHtml = `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
          <input type="text" id="wvInputNombre" class="wv-buscador-input" style="border-radius:10px;" placeholder="Tu nombre" value="${escaparHtml(estadoCarrito.nombreCliente)}" />
          <input type="tel" id="wvInputTelefono" class="wv-buscador-input" style="border-radius:10px;" placeholder="Teléfono / WhatsApp" value="${escaparHtml(estadoCarrito.telefonoCliente)}" />
          <input type="text" id="wvInputDireccion" class="wv-buscador-input" style="border-radius:10px;" placeholder="Dirección exacta de entrega *" value="${escaparHtml(estadoCarrito.direccionCliente)}" />
          <input type="text" id="wvInputReferencia" class="wv-buscador-input" style="border-radius:10px;" placeholder="Referencia (color de casa, esquina, etc.)" value="${escaparHtml(estadoCarrito.referenciaCliente)}" />
          ${
            esSi(config.domicilio_gps_activo, true)
              ? `<button type="button" class="wv-btn-secundario" id="wvBtnGps">
                   📍 ${estadoCarrito.gpsCoordenadas ? `GPS listo (${estadoCarrito.gpsCoordenadas.lat}, ${estadoCarrito.gpsCoordenadas.lng})` : 'Compartir mi ubicación GPS'}
                 </button>`
              : ''
          }
        </div>
      `;
    } else if (estadoCarrito.tipoEntrega === 'retiro') {
      camposEntregaHtml = `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
          ${config.mensaje_retiro ? `<div style="font-size:0.85rem;color:var(--wv-texto-suave);background:var(--wv-superficie);padding:10px;border-radius:10px;">${escaparHtml(config.mensaje_retiro)}</div>` : ''}
          <input type="text" id="wvInputNombre" class="wv-buscador-input" style="border-radius:10px;" placeholder="Tu nombre" value="${escaparHtml(estadoCarrito.nombreCliente)}" />
          <input type="tel" id="wvInputTelefono" class="wv-buscador-input" style="border-radius:10px;" placeholder="Teléfono de contacto" value="${escaparHtml(estadoCarrito.telefonoCliente)}" />
        </div>
      `;
    } else if (estadoCarrito.tipoEntrega === 'mesa') {
      camposEntregaHtml = `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
          <input type="text" id="wvInputMesa" class="wv-buscador-input" style="border-radius:10px;" placeholder="Número de mesa *" value="${escaparHtml(estadoCarrito.numeroMesa)}" />
          <input type="text" id="wvInputNombre" class="wv-buscador-input" style="border-radius:10px;" placeholder="Nombre (opcional)" value="${escaparHtml(estadoCarrito.nombreCliente)}" />
        </div>
      `;
    }

    let propinaHtml = '';
    if (esSi(config.propina_activa, false) && estadoCarrito.items.length > 0) {
      const porcentajes = String(config.propina_porcentajes || '0,5,10,15')
        .split(',')
        .map((p) => aNumero(p.trim(), -1))
        .filter((p) => p >= 0);

      if (porcentajes.length) {
        propinaHtml = `
          <div style="margin-top:12px;">
            <div style="font-weight:700;font-size:0.86rem;margin-bottom:6px;">Propina opcional</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${porcentajes
                .map(
                  (pct) => `
                <button
                  type="button"
                  class="wv-cat-pill js-propina-btn ${aNumero(estadoCarrito.propinaPorcentaje, 0) === pct ? 'is-active' : ''}"
                  data-pct="${pct}"
                >
                  ${pct === 0 ? 'Sin propina' : `${pct}%`}
                </button>
              `
                )
                .join('')}
            </div>
          </div>
        `;
      }
    }

    const subtotal = calcularSubtotalItems();
    const propinaMonto = calcularPropinaMonto(subtotal);
    const total = subtotal + propinaMonto;
    const permitirCompartir =
      esSi(config.compartir_carrito_activo, true) && estadoCarrito.items.length > 0;
    const textoWhatsapp = config.texto_boton_whatsapp || 'Enviar pedido por WhatsApp';

    return `
      <div class="wv-modal-backdrop is-open" id="wvModalBackdrop">
        <div class="wv-modal-dialog" role="dialog" aria-modal="true">
          <button type="button" class="wv-modal-cerrar" id="wvBtnCerrarModal">✕</button>
          <h2 style="margin:0 0 12px;font-size:1.25rem;">${escaparHtml(config.titulo_carrito || 'Tu pedido')}</h2>

          ${itemsHtml}

          ${
            estadoCarrito.items.length
              ? `
                <div style="margin-top:14px;">
                  <div style="font-weight:700;font-size:0.88rem;margin-bottom:8px;">Tipo de entrega</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">${tabsModoHtml}</div>
                  ${camposEntregaHtml}
                </div>

                ${propinaHtml}

                <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--wv-borde);font-size:0.92rem;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span>Subtotal</span>
                    <strong>${moneda}${subtotal.toFixed(2)}</strong>
                  </div>
                  ${
                    propinaMonto > 0
                      ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                           <span>Propina (${estadoCarrito.propinaPorcentaje}%)</span>
                           <strong>${moneda}${propinaMonto.toFixed(2)}</strong>
                         </div>`
                      : ''
                  }
                  <div style="display:flex;justify-content:space-between;font-size:1.08rem;font-weight:800;margin-top:6px;">
                    <span>Total</span>
                    <span>${moneda}${total.toFixed(2)}</span>
                  </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;">
                  <button type="button" class="wv-btn-primario" id="wvBtnEnviarWhatsApp">
                    ${escaparHtml(textoWhatsapp)}
                  </button>
                  ${
                    permitirCompartir
                      ? `<button type="button" class="wv-btn-secundario" id="wvBtnCompartirCarrito">
                           🔗 Compartir carrito ("Tu amig@ hoy invita")
                         </button>`
                      : ''
                  }
                  ${
                    estadoApp.enlaceCompartidoActual
                      ? `<input type="text" readonly class="wv-buscador-input" style="border-radius:10px;font-size:0.8rem;" value="${escaparHtml(estadoApp.enlaceCompartidoActual)}" />`
                      : ''
                  }
                </div>
              `
              : ''
          }
        </div>
      </div>
    `;
  }

  if (estadoApp.modalWhatsVendAbierto) {
    return `
      <div class="wv-modal-backdrop is-open" id="wvModalBackdrop">
        <div class="wv-modal-dialog" role="dialog" aria-modal="true">
          <button type="button" class="wv-modal-cerrar" id="wvBtnCerrarModal">✕</button>
          <div style="font-weight:800;font-size:1.2rem;margin-bottom:8px;">WhatsVend</div>
          <p style="margin:0;color:var(--wv-texto-suave);font-size:0.92rem;line-height:1.5;">
            Catálogo digital conectado a Google Sheets con pedidos directos a WhatsApp, extras configurables, enlaces compartibles y administración rápida.
          </p>
          <div class="wv-whatsvend-pills">
            <span class="wv-whatsvend-pill">Catálogo editable en Sheets</span>
            <span class="wv-whatsvend-pill">Pedidos directos a WhatsApp</span>
            <span class="wv-whatsvend-pill">GPS y modalidades de entrega</span>
            <span class="wv-whatsvend-pill">Carrito compartible</span>
          </div>
          <button type="button" class="wv-btn-whatsapp-creador" id="wvBtnCerrarInfoWv">
            Entendido
          </button>
        </div>
      </div>
    `;
  }

  return '';
}

function enlazarEventosModales() {
  const backdrop = document.getElementById('wvModalBackdrop');
  const btnCerrar = document.getElementById('wvBtnCerrarModal');

  if (btnCerrar) {
    btnCerrar.addEventListener('click', () => cerrarTodosLosModales());
  }
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cerrarTodosLosModales();
    });
  }

  if (estadoApp.modalProductoId && estadoApp.datos) {
    const prod = (estadoApp.datos.productos || []).find(
      (p) => String(p.id) === String(estadoApp.modalProductoId)
    );
    if (!prod) return;

    let cantidad = 1;
    const valCant = document.getElementById('wvCantValor');
    const btnMenos = document.getElementById('wvCantMenos');
    const btnMas = document.getElementById('wvCantMas');
    const btnAgregar = document.getElementById('wvBtnConfirmarAgregar');

    if (btnMenos && valCant) {
      btnMenos.addEventListener('click', () => {
        cantidad = Math.max(1, cantidad - 1);
        valCant.textContent = String(cantidad);
      });
    }
    if (btnMas && valCant) {
      btnMas.addEventListener('click', () => {
        cantidad += 1;
        valCant.textContent = String(cantidad);
      });
    }

    if (btnAgregar) {
      btnAgregar.addEventListener('click', () => {
        const contenedoresGrupo = document.querySelectorAll('[data-grupo-container]');
        const seleccionados = [];

        for (const cont of contenedoresGrupo) {
          const minReq = aNumero(cont.getAttribute('data-min'), 0);
          const maxReq = aNumero(cont.getAttribute('data-max'), 99);
          const oblig = cont.getAttribute('data-obligatorio') === '1';
          const tituloGrupo =
            (cont.querySelector('.wv-grupo-extras-titulo') &&
              cont.querySelector('.wv-grupo-extras-titulo').textContent) ||
            'Opciones';

          const inputsMarcados = Array.from(
            cont.querySelectorAll('.js-input-extra:checked')
          );

          if (oblig && inputsMarcados.length < Math.max(1, minReq)) {
            alert(`Debes seleccionar al menos ${Math.max(1, minReq)} opción en: ${tituloGrupo}`);
            return;
          }
          if (inputsMarcados.length > maxReq) {
            alert(`Puedes seleccionar máximo ${maxReq} opciones en: ${tituloGrupo}`);
            return;
          }

          inputsMarcados.forEach((inp) => {
            seleccionados.push({
              id: inp.getAttribute('data-extra-id') || '',
              regla_titulo: inp.getAttribute('data-regla') || '',
              opcion: inp.getAttribute('data-opcion') || '',
              precio_extra: aNumero(inp.getAttribute('data-precio'), 0)
            });
          });
        }

        const notaInput = document.getElementById('wvInputNotaProducto');
        const notaTxt = notaInput ? notaInput.value : '';

        agregarAlCarrito(prod, seleccionados, notaTxt, cantidad);
        cerrarTodosLosModales();
      });
    }
  }

  if (estadoApp.modalCarritoAbierto && estadoApp.datos) {
    const config = estadoApp.datos.config;

    document.querySelectorAll('.js-item-menos').forEach((b) => {
      b.addEventListener('click', () => {
        cambiarCantidadItem(b.getAttribute('data-uid'), -1);
        renderizarApp();
      });
    });
    document.querySelectorAll('.js-item-mas').forEach((b) => {
      b.addEventListener('click', () => {
        cambiarCantidadItem(b.getAttribute('data-uid'), 1);
        renderizarApp();
      });
    });
    document.querySelectorAll('.js-item-borrar').forEach((b) => {
      b.addEventListener('click', () => {
        eliminarItemCarrito(b.getAttribute('data-uid'));
        renderizarApp();
      });
    });

    document.querySelectorAll('.js-modo-entrega').forEach((btn) => {
      btn.addEventListener('click', () => {
        estadoCarrito.tipoEntrega = btn.getAttribute('data-modo') || 'domicilio';
        renderizarApp();
      });
    });

    const sincronizarCampos = () => {
      const iNombre = document.getElementById('wvInputNombre');
      const iTel = document.getElementById('wvInputTelefono');
      const iDir = document.getElementById('wvInputDireccion');
      const iRef = document.getElementById('wvInputReferencia');
      const iMesa = document.getElementById('wvInputMesa');

      if (iNombre) estadoCarrito.nombreCliente = iNombre.value;
      if (iTel) estadoCarrito.telefonoCliente = iTel.value;
      if (iDir) estadoCarrito.direccionCliente = iDir.value;
      if (iRef) estadoCarrito.referenciaCliente = iRef.value;
      if (iMesa) estadoCarrito.numeroMesa = iMesa.value;
    };

    ['wvInputNombre', 'wvInputTelefono', 'wvInputDireccion', 'wvInputReferencia', 'wvInputMesa'].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', sincronizarCampos);
      }
    );

    const btnGps = document.getElementById('wvBtnGps');
    if (btnGps) {
      btnGps.addEventListener('click', () => {
        sincronizarCampos();
        btnGps.textContent = 'Obteniendo ubicación GPS...';
        capturarUbicacionGps(
          () => renderizarApp(),
          (msg) => {
            alert(msg);
            renderizarApp();
          }
        );
      });
    }

    document.querySelectorAll('.js-propina-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        estadoCarrito.propinaPorcentaje = aNumero(btn.getAttribute('data-pct'), 0);
        renderizarApp();
      });
    });

    const btnEnviar = document.getElementById('wvBtnEnviarWhatsApp');
    if (btnEnviar) {
      btnEnviar.addEventListener('click', () => {
        sincronizarCampos();
        enviarPedidoPorWhatsApp(config);
      });
    }

    const btnCompartir = document.getElementById('wvBtnCompartirCarrito');
    if (btnCompartir) {
      btnCompartir.addEventListener('click', () => {
        const link = generarEnlaceCompartirCarrito();
        estadoApp.enlaceCompartidoActual = link;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).catch(() => {});
        }
        renderizarApp();
      });
    }
  }

  if (estadoApp.modalWhatsVendAbierto) {
    const btnCerrarInfo = document.getElementById('wvBtnCerrarInfoWv');
    if (btnCerrarInfo) {
      btnCerrarInfo.addEventListener('click', () => cerrarTodosLosModales());
    }
  }
}

function actualizarEstadoScrollHeader() {
  const header = document.getElementById('wvStickyHeader');
  if (!header) return;
  const y = window.scrollY || window.pageYOffset || 0;
  if (y > 80) {
    header.classList.add('is-compact');
    header.classList.add('is-scrolled-past-hero');
  } else {
    header.classList.remove('is-compact');
    header.classList.remove('is-scrolled-past-hero');
  }
}

window.alCambiarCarrito = function () {
  if (estadoApp.vistaActual !== 'cargando') {
    const posY = window.scrollY;
    renderizarApp();
    window.scrollTo(0, posY);
  }
};

window.addEventListener('scroll', actualizarEstadoScrollHeader, { passive: true });

async function iniciarAplicacion(tiendaInfo) {
  estadoApp.tiendaInfo = tiendaInfo || null;
  estadoApp.vistaActual = 'cargando';
  renderizarApp();

  try {
    const datos = await cargarDatosTienda(tiendaInfo);
    estadoApp.datos = datos;

    const cargoDesdeUrl = cargarCarritoDesdeUrlSiExiste(
      datos.productos || [],
      datos.extras || []
    );

    const mostrarPortada = esSi(
      datos.config && datos.config.portada_activa,
      false
    );

    if (cargoDesdeUrl) {
      estadoApp.vistaActual = 'catalogo';
      estadoApp.modalCarritoAbierto = true;
    } else if (mostrarPortada) {
      estadoApp.vistaActual = 'portada';
    } else {
      estadoApp.vistaActual = 'catalogo';
    }

    renderizarApp();
  } catch (err) {
    console.error('Error iniciando WhatsVend:', err);
    estadoApp.datos = obtenerDatosDemo();
    estadoApp.vistaActual = 'catalogo';
    renderizarApp();
  }
}