/**
 * ============================================================================
 * WhatsVend - Renderizado de vistas, portada, catálogo y modales (vistas.js)
 * ============================================================================
 */

function escaparHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function obtenerEstilosFuente(fuente, tamano, color, alineacion) {
  const reglas = [];
  if (fuente && fuente.trim()) {
    reglas.push(`font-family:'${escaparHtml(fuente.trim())}',sans-serif`);
  }
  if (tamano && tamano.trim()) {
    const valTam = /^[0-9]+$/.test(tamano.trim()) ? `${tamano.trim()}px` : tamano.trim();
    reglas.push(`font-size:${escaparHtml(valTam)}`);
  }
  if (color && color.trim()) {
    reglas.push(`color:${escaparHtml(color.trim())}`);
  }
  if (alineacion && alineacion.trim()) {
    const mapaAlign = {
      izquierda: 'left',
      centro: 'center',
      derecha: 'right',
      left: 'left',
      center: 'center',
      right: 'right'
    };
    const alignCss = mapaAlign[alineacion.trim().toLowerCase()];
    if (alignCss) reglas.push(`text-align:${alignCss}`);
  }
  return reglas.join(';');
}

function estaAbiertoAhora(config) {
  const aperturaStr = (config && config.horario_apertura) || '09:00';
  const cierreStr = (config && config.horario_cierre) || '22:00';

  const parsearMinutos = (horaTexto) => {
    const partes = String(horaTexto).trim().split(':');
    if (partes.length < 2) return null;
    const h = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const minApertura = parsearMinutos(aperturaStr);
  const minCierre = parsearMinutos(cierreStr);
  if (minApertura === null || minCierre === null) return true;

  const ahora = new Date();
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();

  if (minCierre >= minApertura) {
    return minActual >= minApertura && minActual <= minCierre;
  }
  return minActual >= minApertura || minActual <= minCierre;
}

function renderPortadaModular(datos, onIrCatalogo, onAbrirProducto) {
  const { config, portada, productos } = datos;
  const bloquesActivos = (portada || [])
    .filter((b) => esSi(b.activo, true))
    .sort((a, b) => aNumero(a.orden, 999) - aNumero(b.orden, 999));

  if (!bloquesActivos.length) {
    return `
      <section class="wv-portada">
        <div class="wv-portada-bloque" style="text-align:center;">
          <h1 class="wv-portada-titulo">${escaparHtml(config.nombre_negocio || 'Catálogo')}</h1>
          <button type="button" class="wv-btn-primario" id="btnEntrarCatalogoDefault">
            ${escaparHtml(config.texto_boton_portada || 'Ver menú')}
          </button>
        </div>
      </section>
    `;
  }

  const htmlBloques = bloquesActivos
    .map((bloque) => {
      const tipo = (bloque.tipo || '').trim().toLowerCase();
      const estiloTexto = obtenerEstilosFuente(
        bloque.fuente,
        bloque.tamano,
        bloque.color_texto,
        bloque.alineacion
      );
      const estiloFondo = bloque.color_fondo
        ? `background-color:${escaparHtml(bloque.color_fondo)};`
        : '';

      if (tipo === 'logo') {
        const align = (bloque.alineacion || 'centro').toLowerCase();
        const justify =
          align === 'izquierda' ? 'flex-start' : align === 'derecha' ? 'flex-end' : 'center';
        const imgUrl = bloque.imagen || config.logo_url || '';
        if (!imgUrl) return '';
        const altoCustom = bloque.tamano
          ? `style="max-height:${escaparHtml(/^[0-9]+$/.test(bloque.tamano) ? bloque.tamano + 'px' : bloque.tamano)};"`
          : '';
        return `
          <div class="wv-portada-bloque wv-portada-logo" style="display:flex;justify-content:${justify};${estiloFondo}">
            <img src="${escaparHtml(imgUrl)}" alt="${escaparHtml(config.nombre_negocio || 'Logo')}" ${altoCustom} />
          </div>
        `;
      }

      if (tipo === 'hero') {
        const botonTexto = bloque.boton_texto || config.texto_boton_portada || 'Ver menú';
        return `
          <div class="wv-portada-bloque wv-portada-hero" style="${estiloFondo}">
            ${bloque.imagen ? `<img src="${escaparHtml(bloque.imagen)}" alt="${escaparHtml(bloque.titulo || 'Portada')}" />` : ''}
            <div class="wv-portada-hero-contenido" style="${estiloTexto}">
              ${bloque.titulo ? `<h1>${escaparHtml(bloque.titulo)}</h1>` : ''}
              ${bloque.subtitulo ? `<p>${escaparHtml(bloque.subtitulo)}</p>` : ''}
              <button type="button" class="wv-btn-primario js-btn-ir-catalogo">
                ${escaparHtml(botonTexto)}
              </button>
            </div>
          </div>
        `;
      }

      if (tipo === 'texto') {
        return `
          <div class="wv-portada-bloque" style="padding:12px 16px;border-radius:14px;${estiloFondo}${estiloTexto}">
            ${bloque.titulo ? `<h2 class="wv-portada-titulo" style="${estiloTexto}">${escaparHtml(bloque.titulo)}</h2>` : ''}
            ${bloque.subtitulo ? `<p class="wv-portada-subtitulo" style="${estiloTexto}">${escaparHtml(bloque.subtitulo)}</p>` : ''}
          </div>
        `;
      }

      if (tipo === 'imagen') {
        if (!bloque.imagen) return '';
        const contenidoImg = `<img src="${escaparHtml(bloque.imagen)}" alt="${escaparHtml(bloque.titulo || 'Imagen')}" />`;
        return `
          <div class="wv-portada-bloque wv-portada-imagen" style="${estiloFondo}">
            ${
              bloque.enlace_url
                ? `<a href="${escaparHtml(bloque.enlace_url)}" target="_blank" rel="noopener noreferrer">${contenidoImg}</a>`
                : contenidoImg
            }
          </div>
        `;
      }

      if (tipo === 'boton') {
        const textoBtn = bloque.boton_texto || config.texto_boton_portada || 'Ver menú';
        const align = (bloque.alineacion || 'centro').toLowerCase();
        const justify =
          align === 'izquierda' ? 'flex-start' : align === 'derecha' ? 'flex-end' : 'center';
        const btnHtml = bloque.enlace_url
          ? `<a class="wv-btn-primario" style="text-decoration:none;${estiloTexto}" href="${escaparHtml(bloque.enlace_url)}" target="_blank" rel="noopener noreferrer">${escaparHtml(textoBtn)}</a>`
          : `<button type="button" class="wv-btn-primario js-btn-ir-catalogo" style="${estiloTexto}">${escaparHtml(textoBtn)}</button>`;
        return `
          <div class="wv-portada-bloque" style="display:flex;justify-content:${justify};${estiloFondo}">
            ${btnHtml}
          </div>
        `;
      }

      if (tipo === 'producto_unico') {
        const prod = (productos || []).find(
          (p) => String(p.id) === String(bloque.producto_id || '')
        );
        if (!prod) return '';
        return `
          <div class="wv-portada-bloque" style="${estiloFondo}${estiloTexto}">
            ${bloque.titulo ? `<h2 class="wv-portada-titulo" style="font-size:1.25rem;">${escaparHtml(bloque.titulo)}</h2>` : ''}
            ${bloque.subtitulo ? `<p class="wv-portada-subtitulo" style="margin-bottom:12px;">${escaparHtml(bloque.subtitulo)}</p>` : ''}
            <div class="wv-destacado-card wv-producto-unico-card" data-prod-id="${escaparHtml(prod.id)}">
              ${prod.imagen ? `<img src="${escaparHtml(prod.imagen)}" alt="${escaparHtml(prod.nombre)}" />` : ''}
              <div class="wv-destacado-card-body">
                <div style="font-weight:700;">${escaparHtml(prod.nombre)}</div>
                <div class="wv-destacado-precio">${formatearPrecio(prod.precio, config)}</div>
              </div>
            </div>
          </div>
        `;
      }

      if (tipo === 'destacados') {
        const idsLista = String(bloque.ids_productos_destacados || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const listaProd = idsLista.length
          ? (productos || []).filter((p) => idsLista.includes(String(p.id)))
          : (productos || []).slice(0, 4);

        const mostrarBtnVerTodo = esSi(config.mostrar_boton_destacados, true);
        const textoBtnVerTodo = config.texto_boton_destacados || 'Ver todo el menú';

        return `
          <div class="wv-portada-bloque" style="${estiloFondo}${estiloTexto}">
            ${bloque.titulo ? `<h2 class="wv-portada-titulo" style="font-size:1.3rem;">${escaparHtml(bloque.titulo)}</h2>` : ''}
            ${bloque.subtitulo ? `<p class="wv-portada-subtitulo">${escaparHtml(bloque.subtitulo)}</p>` : ''}
            <div class="wv-destacados-grid">
              ${listaProd
                .map(
                  (p) => `
                <div class="wv-destacado-card" data-prod-id="${escaparHtml(p.id)}">
                  ${p.imagen ? `<img src="${escaparHtml(p.imagen)}" alt="${escaparHtml(p.nombre)}" />` : ''}
                  <div class="wv-destacado-card-body">
                    <div style="font-weight:700;">${escaparHtml(p.nombre)}</div>
                    <div class="wv-destacado-precio">${formatearPrecio(p.precio, config)}</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
            ${
              mostrarBtnVerTodo
                ? `<div style="margin-top:18px;text-align:center;">
                     <button type="button" class="wv-btn-primario js-btn-ir-catalogo">${escaparHtml(textoBtnVerTodo)}</button>
                   </div>`
                : ''
            }
          </div>
        `;
      }

      return '';
    })
    .join('');

  return `<section class="wv-portada" id="wvPortadaContenedor">${htmlBloques}</section>`;
}

function renderAvisosSuperiores(config) {
  const filas = [];
  if (esSi(config.aviso1_activo, false) && config.aviso1_texto) {
    const tam = config.aviso1_tamano || '13px';
    const tamCss = /^[0-9]+$/.test(tam) ? `${tam}px` : tam;
    filas.push(`
      <div class="wv-aviso-fila" style="background:${escaparHtml(config.aviso1_fondo || '#1f2937')};color:${escaparHtml(config.aviso1_texto_color || '#ffffff')};font-size:${escaparHtml(tamCss)};">
        ${escaparHtml(config.aviso1_texto)}
      </div>
    `);
  }
  if (esSi(config.aviso2_activo, false) && config.aviso2_texto) {
    const tam = config.aviso2_tamano || '13px';
    const tamCss = /^[0-9]+$/.test(tam) ? `${tam}px` : tam;
    filas.push(`
      <div class="wv-aviso-fila" style="background:${escaparHtml(config.aviso2_fondo || '#16a34a')};color:${escaparHtml(config.aviso2_texto_color || '#ffffff')};font-size:${escaparHtml(tamCss)};">
        ${escaparHtml(config.aviso2_texto)}
      </div>
    `);
  }
  return filas.join('');
}

function renderCabeceraPegajosa(config, seccionesActivas, seccionActivaId, terminoBusqueda) {
  const cantTotal = calcularTotalCantidadItems();
  const totalGeneral = calcularTotalGeneral();
  const estiloNombre = obtenerEstilosFuente(
    config.fuente_nombre || config.fuente_general,
    '',
    config.color_nombre || config.color_texto_general,
    ''
  );

  const pillsHtml = seccionesActivas
    .map((sec) => {
      const activa = String(sec.id) === String(seccionActivaId);
      return `
        <button type="button" class="wv-cat-pill ${activa ? 'is-active' : ''}" data-sec-id="${escaparHtml(sec.id)}">
          ${escaparHtml(sec.titulo)}
        </button>
      `;
    })
    .join('');

  return `
    <header class="wv-sticky-wrapper ${cantTotal > 0 ? 'has-cart' : ''}" id="wvStickyHeader">
      <div class="wv-main-bar">
        <div class="wv-marca-grupo">
          ${
            config.logo_url
              ? `<img src="${escaparHtml(config.logo_url)}" alt="${escaparHtml(config.nombre_negocio || 'Logo')}" class="wv-logo-img" />`
              : ''
          }
          <h1 class="wv-nombre-negocio" style="${estiloNombre}">
            ${escaparHtml(config.nombre_negocio || 'Catálogo')}
          </h1>
        </div>

        <button type="button" class="wv-resumen-movil-bar" id="wvBtnResumenMovil">
          <span>${cantTotal} ${cantTotal === 1 ? 'ítem' : 'ítems'} • ${formatearPrecio(totalGeneral, config)}</span>
          <span>Ver pedido →</span>
        </button>

        <div class="wv-buscador-pc">
          <input
            type="search"
            class="wv-buscador-input"
            id="wvBuscadorPc"
            placeholder="Buscar productos o platos..."
            value="${escaparHtml(terminoBusqueda || '')}"
          />
        </div>

        <button type="button" class="wv-carrito-btn-pc" id="wvBtnCarritoPc">
          <span>🛒 ${escaparHtml(config.titulo_carrito || 'Tu pedido')}</span>
          <span class="wv-carrito-badge" id="wvBadgePc">${cantTotal}</span>
        </button>
      </div>

      <nav class="wv-categorias-bar" aria-label="Categorías">
        <div class="wv-categorias-inner">
          <button type="button" class="wv-lupa-movil-btn" id="wvBtnLupaMovil" title="Buscar">🔍</button>
          ${pillsHtml}
        </div>
        <div class="wv-buscador-movil-drawer" id="wvBuscadorMovilDrawer">
          <input
            type="search"
            class="wv-buscador-input"
            id="wvBuscadorMovil"
            placeholder="Buscar productos o platos..."
            value="${escaparHtml(terminoBusqueda || '')}"
          />
        </div>
      </nav>
    </header>
  `;
}

function renderBannerYEstado(config) {
  let bannerHtml = '';
  if (esSi(config.banner_inicio_activo, false)) {
    const imgPc = config.banner_inicio_pc || config.banner_inicio_movil || '';
    const imgMovil = config.banner_inicio_movil || config.banner_inicio_pc || '';
    if (imgPc || imgMovil) {
      bannerHtml = `
        <div class="wv-banner-principal">
          ${imgPc ? `<img src="${escaparHtml(imgPc)}" alt="Banner principal" class="wv-img-solo-pc" />` : ''}
          ${imgMovil ? `<img src="${escaparHtml(imgMovil)}" alt="Banner principal" class="wv-img-solo-movil" />` : ''}
        </div>
      `;
    }
  }

  let estadoHtml = '';
  if (esSi(config.barra_estado_activo, true)) {
    const abierto = estaAbiertoAhora(config);
    const etiquetaEstado = abierto
      ? config.texto_abierto || 'Abierto ahora'
      : config.texto_cerrado || 'Cerrado por ahora';
    const textoDer = config.barra_estado_derecha || config.ubicacion_texto || '';
    const fondoEstado = config.barra_estado_fondo || '#18181b';
    const colorEstado = config.barra_estado_texto || '#ffffff';

    estadoHtml = `
      <div class="wv-estado-bar" style="background:${escaparHtml(fondoEstado)};color:${escaparHtml(colorEstado)};">
        <div class="wv-estado-inner">
          <div class="wv-estado-izq">
            <span class="wv-estado-indicador">
              <span class="wv-punto-estado ${abierto ? '' : 'is-cerrado'}"></span>
              ${escaparHtml(etiquetaEstado)}
            </span>
            ${config.ubicacion_texto ? `<span style="opacity:0.85;">${escaparHtml(config.ubicacion_texto)}</span>` : ''}
          </div>
          ${textoDer ? `<div class="wv-estado-der">${escaparHtml(textoDer)}</div>` : ''}
        </div>
      </div>
    `;
  }

  return bannerHtml + estadoHtml;
}

function renderModuloExtra(mod) {
  const tipo = (mod.tipo || '').trim().toLowerCase();
  const estiloTexto = obtenerEstilosFuente(
    mod.fuente,
    mod.tamano,
    mod.color_texto,
    mod.alineacion
  );
  const estiloFondo = mod.color_fondo
    ? `background-color:${escaparHtml(mod.color_fondo)};`
    : '';
  const inclinacion = aNumero(mod.inclinacion_grados, 0);
  const transformCss = inclinacion ? `transform:rotate(${inclinacion}deg);` : '';

  if (tipo === 'cinta') {
    const textoCinta = mod.texto || mod.titulo || '';
    if (!textoCinta) return '';
    const repetido = `${escaparHtml(textoCinta)} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; ${escaparHtml(textoCinta)} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; ${escaparHtml(textoCinta)}`;
    return `
      <div class="wv-modulo-extra wv-cinta-wrap">
        <div class="wv-cinta-banda" style="${estiloFondo}${estiloTexto}${transformCss}">
          <div class="wv-cinta-track">${repetido}</div>
        </div>
      </div>
    `;
  }

  if (tipo === 'cupon') {
    const colorBorde = mod.color_borde || '#f59e0b';
    const grosor = mod.grosor_linea || '1px';
    return `
      <div class="wv-modulo-extra">
        <div class="wv-cupon-box" style="border-color:${escaparHtml(colorBorde)};border-width:${escaparHtml(grosor)};${estiloFondo}${estiloTexto}">
          ${mod.titulo ? `<div style="font-weight:800;margin-bottom:4px;">${escaparHtml(mod.titulo)}</div>` : ''}
          ${mod.texto ? `<div>${escaparHtml(mod.texto)}</div>` : ''}
        </div>
      </div>
    `;
  }

  if (tipo === 'separador') {
    const colorLinea = mod.color_borde || mod.color_texto || '#e5e7eb';
    const grosorLinea = mod.grosor_linea || '2px';
    const grosorCss = /^[0-9]+$/.test(grosorLinea) ? `${grosorLinea}px` : grosorLinea;
    return `
      <div class="wv-modulo-extra">
        <hr style="border:none;border-top:${escaparHtml(grosorCss)} solid ${escaparHtml(colorLinea)};margin:10px 0;${transformCss}" />
      </div>
    `;
  }

  if (tipo === 'texto') {
    return `
      <div class="wv-modulo-extra" style="${estiloFondo}${estiloTexto}${transformCss}">
        ${mod.titulo ? `<h3 style="margin:0 0 6px;font-weight:800;">${escaparHtml(mod.titulo)}</h3>` : ''}
        ${mod.texto ? `<p style="margin:0;line-height:1.5;">${escaparHtml(mod.texto)}</p>` : ''}
      </div>
    `;
  }

  if (tipo === 'banner') {
    const imgPc = mod.imagen_pc || mod.imagen_movil || '';
    const imgMovil = mod.imagen_movil || mod.imagen_pc || '';
    if (!imgPc && !imgMovil) return '';
    const inner = `
      ${imgPc ? `<img src="${escaparHtml(imgPc)}" alt="${escaparHtml(mod.titulo || 'Banner')}" class="wv-img-solo-pc" />` : ''}
      ${imgMovil ? `<img src="${escaparHtml(imgMovil)}" alt="${escaparHtml(mod.titulo || 'Banner')}" class="wv-img-solo-movil" />` : ''}
    `;
    return `
      <div class="wv-modulo-extra wv-banner-extra">
        ${
          mod.enlace_url
            ? `<a href="${escaparHtml(mod.enlace_url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
            : inner
        }
      </div>
    `;
  }

  return '';
}

function renderTarjetaProducto(prod, config, estiloModulo) {
  const textoBtn = config.texto_boton_tarjeta || '+';
  const etiquetaHtml = prod.etiqueta
    ? `<span class="wv-etiqueta-badge${estiloModulo === 'lista' ? '-inline' : ''}" style="background:${escaparHtml(prod.etiqueta_color || '#dc2626')};color:${escaparHtml(prod.etiqueta_texto_color || '#ffffff')};">${escaparHtml(prod.etiqueta)}</span>`
    : '';

  if (estiloModulo === 'lista') {
    return `
      <article class="wv-card-lista" data-prod-id="${escaparHtml(prod.id)}">
        ${
          prod.imagen
            ? `<img src="${escaparHtml(prod.imagen)}" alt="${escaparHtml(prod.nombre)}" class="wv-card-lista-img js-abrir-detalle" />`
            : ''
        }
        <div class="wv-card-lista-info">
          <h3 class="wv-prod-titulo js-abrir-detalle">
            ${escaparHtml(prod.nombre)} ${etiquetaHtml}
          </h3>
          ${prod.descripcion ? `<p class="wv-prod-desc">${escaparHtml(prod.descripcion)}</p>` : ''}
        </div>
        <div class="wv-card-lista-accion">
          <div class="wv-prod-precio" style="margin-bottom:0;">${formatearPrecio(prod.precio, config)}</div>
          <button type="button" class="wv-btn-tarjeta js-btn-rapido" style="width:auto;padding:7px 14px;">
            ${escaparHtml(textoBtn)}
          </button>
        </div>
      </article>
    `;
  }

  return `
    <article class="wv-card-grid" data-prod-id="${escaparHtml(prod.id)}">
      <div class="wv-card-img-wrap js-abrir-detalle">
        ${prod.imagen ? `<img src="${escaparHtml(prod.imagen)}" alt="${escaparHtml(prod.nombre)}" loading="lazy" />` : ''}
        ${etiquetaHtml}
      </div>
      <div class="wv-card-body">
        <div>
          <h3 class="wv-prod-titulo js-abrir-detalle">${escaparHtml(prod.nombre)}</h3>
          ${prod.descripcion ? `<p class="wv-prod-desc">${escaparHtml(prod.descripcion)}</p>` : ''}
        </div>
        <div>
          <div class="wv-prod-precio">${formatearPrecio(prod.precio, config)}</div>
          <button type="button" class="wv-btn-tarjeta js-btn-rapido">${escaparHtml(textoBtn)}</button>
        </div>
      </div>
    </article>
  `;
}

function renderCatalogoPrincipal(datos, filtros = {}) {
  const { config, secciones, productos, modulosExtra } = datos;
  const termino = (filtros.busqueda || '').trim().toLowerCase();
  const seccionFiltro = filtros.seccionId || 'TODAS';
  const expandidas = filtros.seccionesExpandidas || {};

  const seccionesActivas = (secciones || [])
    .filter((s) => esSi(s.activo, true))
    .sort((a, b) => aNumero(a.orden, 999) - aNumero(b.orden, 999));

  const productosDisponibles = (productos || [])
    .filter((p) => esSi(p.disponible, true))
    .sort((a, b) => aNumero(a.orden, 999) - aNumero(b.orden, 999));

  const modulosActivos = (modulosExtra || [])
    .filter((m) => esSi(m.activo, true))
    .sort((a, b) => aNumero(a.orden, 999) - aNumero(b.orden, 999));

  const elementosLineaTiempo = [];
  seccionesActivas.forEach((sec) => {
    elementosLineaTiempo.push({
      tipo: 'seccion',
      orden: aNumero(sec.orden, 999),
      data: sec
    });
  });
  modulosActivos.forEach((mod) => {
    elementosLineaTiempo.push({
      tipo: 'modulo',
      orden: aNumero(mod.orden, 999),
      data: mod
    });
  });
  elementosLineaTiempo.sort((a, b) => a.orden - b.orden);

  const limiteInicial = 6;
  const textoVerMas = config.texto_boton_ver_mas || 'Ver más productos';

  const htmlContenido = elementosLineaTiempo
    .map((el) => {
      if (el.tipo === 'modulo') {
        if (termino) return '';
        return renderModuloExtra(el.data);
      }

      const sec = el.data;
      if (seccionFiltro !== 'TODAS' && String(sec.id) !== String(seccionFiltro)) {
        return '';
      }

      let prodsSec = productosDisponibles.filter(
        (p) => String(p.seccion_id) === String(sec.id)
      );

      if (termino) {
        prodsSec = prodsSec.filter(
          (p) =>
            String(p.nombre || '').toLowerCase().includes(termino) ||
            String(p.descripcion || '').toLowerCase().includes(termino)
        );
      }

      if (!prodsSec.length) return '';

      const estiloTitulo = obtenerEstilosFuente(
        sec.titulo_fuente || config.fuente_general,
        sec.titulo_tamano || '24px',
        sec.titulo_color || config.color_texto_general,
        sec.titulo_alineacion || 'izquierda'
      );

      const estiloSubtitulo = obtenerEstilosFuente(
        sec.subtitulo_fuente || config.fuente_general,
        sec.subtitulo_tamano || '14px',
        sec.subtitulo_color || '#6b7280',
        sec.titulo_alineacion || 'izquierda'
      );

      const estiloModulo = (sec.estilo_modulo || 'cuadricula').trim().toLowerCase();
      const estaExpandida = Boolean(expandidas[sec.id]) || Boolean(termino);
      const hayMas = !estaExpandida && prodsSec.length > limiteInicial;
      const prodsVisibles = estaExpandida ? prodsSec : prodsSec.slice(0, limiteInicial);

      const claseContenedor =
        estiloModulo === 'lista' ? 'wv-lista-productos' : 'wv-grid-productos';

      return `
        <section class="wv-seccion-bloque" id="wv-sec-${escaparHtml(sec.id)}">
          <div class="wv-seccion-header">
            <h2 class="wv-seccion-titulo" style="${estiloTitulo}">${escaparHtml(sec.titulo)}</h2>
            ${sec.subtitulo ? `<p class="wv-seccion-subtitulo" style="${estiloSubtitulo}">${escaparHtml(sec.subtitulo)}</p>` : ''}
          </div>
          <div class="${claseContenedor}">
            ${prodsVisibles.map((p) => renderTarjetaProducto(p, config, estiloModulo)).join('')}
          </div>
          ${
            hayMas
              ? `<div class="wv-ver-mas-wrap">
                   <button type="button" class="wv-btn-secundario js-ver-mas-sec" data-sec-id="${escaparHtml(sec.id)}">
                     ${escaparHtml(textoVerMas)} (${prodsSec.length - limiteInicial} más)
                   </button>
                 </div>`
              : ''
          }
        </section>
      `;
    })
    .join('');

  const footerHtml = renderFooterWhatsVend(config);

  return `
    <main class="wv-catalogo-main" id="wvCatalogoMain">
      ${
        htmlContenido ||
        `<div style="text-align:center;padding:48px 16px;color:var(--wv-texto-suave);">
           No se encontraron productos que coincidan con tu búsqueda.
         </div>`
      }
      ${footerHtml}
    </main>
  `;
}

function renderFooterWhatsVend(config) {
  if (!esSi(config.mostrar_footer_whatsvend, true)) {
    return '';
  }

  return `
    <footer class="wv-footer-whatsvend-wrap">
      <button type="button" class="wv-footer-bar-btn" id="wvBtnAbrirModalWhatsVend">
        <div class="wv-footer-bar-izq">
          <div class="wv-footer-logo-box">WV</div>
          <div>
            <div class="wv-footer-sub">Plataforma de pedidos por WhatsApp</div>
            <div class="wv-footer-marca">Desarrollado por WhatsVend</div>
          </div>
        </div>
        <span style="font-weight:700;color:var(--wv-primario);">Conocer más →</span>
      </button>
    </footer>
  `;
}

function renderBarraCarritoFlotante(config) {
  const cant = calcularTotalCantidadItems();
  if (cant <= 0) return '';
  const total = calcularTotalGeneral();
  return `
    <button type="button" class="wv-barra-carrito-flotante" id="wvBarraCarritoFlotante">
      <span>🛒 ${cant} ${cant === 1 ? 'producto' : 'productos'}</span>
      <span>${escaparHtml(config.titulo_carrito || 'Tu pedido')} • ${formatearPrecio(total, config)}</span>
    </button>
  `;
}