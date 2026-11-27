/**
 * ============================================================================
 * WhatsVend - Renderizador de Vistas y Componentes (vistas.js)
 * ============================================================================
 * Construye:
 * - Portada modular ordenable/activable (hero + destacados).
 * - Cabecera del catálogo con 5 filas dinámicas + fila 6 pegajosa de categorías.
 * - Bloques de categorías ("cuadricula" y "lista") con límite de 12 y modal
 *   "Ver más" (deslizar en móvil / ventana centrada con X o clic afuera en PC).
 * - Módulos decorativos y CTA (cinta inclinada, cupón, separador, texto,
 *   banner PC/móvil, botón CTA).
 * - Modal de producto con reglas y títulos editables por grupo.
 * - Modal de carrito/checkout con modos, GPS, propina y enlace compartible.
 * - Pie de página "Desarrollado por WhatsVend" con modal hacia tu WhatsApp.
 * ============================================================================
 */

function escaparHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function estaAbiertoSegunHorario(config) {
  const apertura = (config.horario_apertura || '').trim();
  const cierre = (config.horario_cierre || '').trim();
  if (!apertura || !cierre) return true;

  const [hA, mA] = apertura.split(':').map(Number);
  const [hC, mC] = cierre.split(':').map(Number);
  if ([hA, mA, hC, mC].some(Number.isNaN)) return true;

  const ahora = new Date();
  const minsActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const minsApertura = hA * 60 + mA;
  const minsCierre = hC * 60 + mC;

  if (minsCierre >= minsApertura) {
    return minsActuales >= minsApertura && minsActuales <= minsCierre;
  }
  // Cruza medianoche
  return minsActuales >= minsApertura || minsActuales <= minsCierre;
}

function renderizarPortada(datos, carrito) {
  const { config, portada, productos } = datos;
  const moneda = (config.moneda || '$').trim();
  const bloquesActivos = [...portada]
    .filter((b) => esSi(b.activo, true))
    .sort((a, b) => aNumero(a.orden, 0) - aNumero(b.orden, 0));

  let html = `<div class="wv-portada">`;

  bloquesActivos.forEach((bloque) => {
    if (bloque.tipo === 'hero') {
      const textoBtn =
        bloque.boton_texto || config.texto_boton_portada || 'Ver menú';
      html += `
        <section class="wv-portada-hero">
          ${
            bloque.imagen
              ? `<img src="${escaparHtml(bloque.imagen)}" alt="${escaparHtml(bloque.titulo)}" />`
              : ''
          }
          <div class="wv-portada-hero-contenido">
            <h1>${escaparHtml(bloque.titulo || config.nombre_negocio)}</h1>
            ${bloque.subtitulo ? `<p>${escaparHtml(bloque.subtitulo)}</p>` : ''}
            <button type="button" class="wv-btn-primario" data-accion="ir-catalogo">
              ${escaparHtml(textoBtn)}
            </button>
          </div>
        </section>
      `;
    } else if (bloque.tipo === 'destacados') {
      const ids = (bloque.ids_productos_destacados || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const listaDestacados =
        ids.length > 0
          ? productos.filter((p) => ids.includes(p.id) && esSi(p.disponible, true))
          : productos.filter((p) => esSi(p.disponible, true)).slice(0, 4);

      const mostrarBtn = esSi(config.mostrar_boton_destacados, true);
      const textoBtnDest =
        bloque.boton_texto ||
        config.texto_boton_destacados ||
        'Ver todo el menú';

      html += `
        <section style="margin-bottom: 32px;">
          <h2 style="margin:0 0 6px;">${escaparHtml(bloque.titulo || 'Destacados')}</h2>
          ${
            bloque.subtitulo
              ? `<p style="margin:0 0 12px; color:var(--wv-texto-suave);">${escaparHtml(bloque.subtitulo)}</p>`
              : ''
          }
          <div class="wv-destacados-grid">
            ${listaDestacados
              .map(
                (prod) => `
              <article class="wv-destacado-card" data-abrir-producto="${escaparHtml(prod.id)}">
                ${
                  prod.imagen
                    ? `<img src="${escaparHtml(prod.imagen)}" alt="${escaparHtml(prod.nombre)}" />`
                    : ''
                }
                <div class="wv-destacado-card-body">
                  <div style="font-weight:700;">${escaparHtml(prod.nombre)}</div>
                  <div class="wv-destacado-precio">${moneda}${aNumero(prod.precio, 0).toFixed(2)}</div>
                </div>
              </article>
            `
              )
              .join('')}
          </div>
          ${
            mostrarBtn
              ? `<div style="margin-top:18px; text-align:center;">
                   <button type="button" class="wv-btn-primario" data-accion="ir-catalogo">
                     ${escaparHtml(textoBtnDest)}
                   </button>
                 </div>`
              : ''
          }
        </section>
      `;
    }
  });

  html += renderizarFooterWhatsVend(config);
  html += `</div>`;
  return html;
}

function renderizarModuloExtra(mod, secciones) {
  const alineacion = (mod.alineacion || 'centro').toLowerCase();
  const alignCss =
    alineacion === 'izquierda'
      ? 'left'
      : alineacion === 'derecha'
      ? 'right'
      : 'center';
  const fuenteCss = mod.fuente
    ? `'${escaparHtml(mod.fuente)}', var(--wv-fuente-base)`
    : 'var(--wv-fuente-base)';
  const tamanoCss = mod.tamano ? escaparHtml(mod.tamano) : '15px';
  const colorTexto = mod.color_texto || 'inherit';
  const colorFondo = mod.color_fondo || 'transparent';
  const colorBorde = mod.color_borde || 'var(--wv-borde)';

  if (mod.tipo === 'separador') {
    const grosor = mod.grosor_linea || '2px';
    return `
      <div class="wv-modulo-extra">
        <hr style="border:none; border-top:${escaparHtml(grosor)} solid ${escaparHtml(colorBorde)}; margin:0;" />
      </div>
    `;
  }

  if (mod.tipo === 'banner') {
    const imgPc = mod.imagen_pc || mod.imagen_movil;
    const imgMovil = mod.imagen_movil || mod.imagen_pc;
    return `
      <div class="wv-modulo-extra wv-banner-extra">
        ${
          imgPc
            ? `<img class="wv-img-solo-pc" src="${escaparHtml(imgPc)}" alt="${escaparHtml(mod.titulo || 'Banner')}" />`
            : ''
        }
        ${
          imgMovil
            ? `<img class="wv-img-solo-movil" src="${escaparHtml(imgMovil)}" alt="${escaparHtml(mod.titulo || 'Banner')}" />`
            : ''
        }
      </div>
    `;
  }

  if (mod.tipo === 'cinta') {
    const grados = aNumero(mod.inclinacion_grados, -2);
    const leyenda = (mod.texto || '').trim();
    const repetido = `${leyenda} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; ${leyenda} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; ${leyenda}`;
    return `
      <div class="wv-modulo-extra wv-cinta-wrap">
        <div
          class="wv-cinta-banda"
          style="background:${escaparHtml(colorFondo || '#1e3a8a')}; color:${escaparHtml(colorTexto || '#ffffff')}; transform:rotate(${grados}deg);"
        >
          <div class="wv-cinta-track" style="font-family:${fuenteCss}; font-size:${tamanoCss};">
            ${repetido}
          </div>
        </div>
      </div>
    `;
  }

  if (mod.tipo === 'texto') {
    return `
      <div
        class="wv-modulo-extra"
        style="text-align:${alignCss}; font-family:${fuenteCss}; font-size:${tamanoCss}; color:${escaparHtml(colorTexto)};"
      >
        ${escaparHtml(mod.texto || '')}
      </div>
    `;
  }

  if (mod.tipo === 'cupon') {
    return `
      <div class="wv-modulo-extra">
        <div
          class="wv-cupon-box"
          style="background:${escaparHtml(colorFondo || '#fef3c7')}; border-color:${escaparHtml(colorBorde || '#f59e0b')}; color:${escaparHtml(colorTexto || '#111827')}; text-align:${alignCss};"
        >
          ${
            mod.titulo
              ? `<div style="font-weight:800; margin-bottom:4px; font-family:${fuenteCss};">${escaparHtml(mod.titulo)}</div>`
              : ''
          }
          <div style="font-family:${fuenteCss}; font-size:${tamanoCss};">${escaparHtml(mod.texto || '')}</div>
        </div>
      </div>
    `;
  }

  if (mod.tipo === 'cta_boton') {
    const destino = (mod.enlace_url || '').trim();
    const esSeccionInterna = destino.startsWith('#');
    return `
      <div class="wv-modulo-extra" style="text-align:${alignCss};">
        <button
          type="button"
          class="wv-btn-primario"
          style="background:${escaparHtml(colorFondo || 'var(--wv-primario)')}; color:${escaparHtml(colorTexto || '#ffffff')};"
          data-cta-destino="${escaparHtml(destino)}"
          data-cta-interno="${esSeccionInterna ? '1' : '0'}"
        >
          ${escaparHtml(mod.texto || mod.titulo || 'Ver más')}
        </button>
      </div>
    `;
  }

  return '';
}

function renderizarTarjetaProducto(prod, config, extrasProducto) {
  const moneda = (config.moneda || '$').trim();
  const textoBtn = (config.texto_boton_tarjeta || '+').trim() || '+';
  const tieneExtras = extrasProducto.length > 0;
  const precioFmt = `${moneda}${aNumero(prod.precio, 0).toFixed(2)}`;

  const badgeHtml = prod.etiqueta
    ? `<span class="wv-etiqueta-badge" style="background:${escaparHtml(prod.etiqueta_color || '#dc2626')};">${escaparHtml(prod.etiqueta)}</span>`
    : '';

  return {
    cuadricula: `
      <article class="wv-card-grid">
        <div class="wv-card-img-wrap" data-abrir-producto="${escaparHtml(prod.id)}">
          <img
            src="${escaparHtml(prod.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500')}"
            alt="${escaparHtml(prod.nombre)}"
            loading="lazy"
          />
          ${badgeHtml}
        </div>
        <div class="wv-card-body">
          <div>
            <h3 class="wv-prod-titulo" data-abrir-producto="${escaparHtml(prod.id)}">${escaparHtml(prod.nombre)}</h3>
            ${prod.descripcion ? `<p class="wv-prod-desc">${escaparHtml(prod.descripcion)}</p>` : ''}
          </div>
          <div>
            <div class="wv-prod-precio">${precioFmt}</div>
            <button
              type="button"
              class="wv-btn-tarjeta"
              data-boton-producto="${escaparHtml(prod.id)}"
              data-tiene-extras="${tieneExtras ? '1' : '0'}"
            >
              ${escaparHtml(textoBtn)}
            </button>
          </div>
        </div>
      </article>
    `,
    lista: `
      <article class="wv-card-lista">
        <img
          class="wv-card-lista-img"
          src="${escaparHtml(prod.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500')}"
          alt="${escaparHtml(prod.nombre)}"
          loading="lazy"
          data-abrir-producto="${escaparHtml(prod.id)}"
        />
        <div class="wv-card-lista-info">
          <h3 class="wv-prod-titulo" data-abrir-producto="${escaparHtml(prod.id)}">
            ${escaparHtml(prod.nombre)}
            ${
              prod.etiqueta
                ? `<span style="margin-left:6px; font-size:0.72rem; padding:2px 7px; border-radius:6px; color:#fff; background:${escaparHtml(prod.etiqueta_color || '#dc2626')};">${escaparHtml(prod.etiqueta)}</span>`
                : ''
            }
          </h3>
          ${prod.descripcion ? `<p class="wv-prod-desc">${escaparHtml(prod.descripcion)}</p>` : ''}
        </div>
        <div class="wv-card-lista-accion">
          <div class="wv-prod-precio" style="margin:0;">${precioFmt}</div>
          <button
            type="button"
            class="wv-btn-tarjeta"
            style="width:auto; min-width:44px;"
            data-boton-producto="${escaparHtml(prod.id)}"
            data-tiene-extras="${tieneExtras ? '1' : '0'}"
          >
            ${escaparHtml(textoBtn)}
          </button>
        </div>
      </article>
    `
  };
}

function renderizarFooterWhatsVend(config) {
  if (!esSi(config.mostrar_footer_whatsvend, true)) return '';
  const marca = WHATSAPP_CREADOR_CONFIG.marca || 'WhatsVend';

  return `
    <footer class="wv-footer-whatsvend-wrap">
      <button type="button" class="wv-footer-bar-btn" data-accion="abrir-whatsvend-info">
        <div class="wv-footer-bar-izq">
          <div class="wv-footer-logo-box">WV</div>
          <div>
            <div class="wv-footer-sub">MENÚ DIGITAL DESARROLLADO POR</div>
            <div class="wv-footer-marca">${escaparHtml(marca)}</div>
          </div>
        </div>
        <span style="font-size:1.3rem; font-weight:700; color:var(--wv-texto-suave);">&rsaquo;</span>
      </button>
    </footer>
  `;
}

function renderizarCatalogo(datos, carrito, filtroBusqueda = '', categoriaActiva = '') {
  const { config, secciones, productos, extras, modulosExtra } = datos;
  const moneda = (config.moneda || '$').trim();
  const cantTotal = carrito.obtenerCantidadTotal();
  const totalFmt = `${moneda}${carrito.obtenerTotalFinal().toFixed(2)}`;

  const seccionesActivas = [...secciones]
    .filter((s) => esSi(s.activo, true))
    .sort((a, b) => aNumero(a.orden, 0) - aNumero(b.orden, 0));

  const modulosActivos = [...modulosExtra]
    .filter((m) => esSi(m.activo, true))
    .sort((a, b) => aNumero(a.orden, 0) - aNumero(b.orden, 0));

  const textoBusqueda = (filtroBusqueda || '').trim().toLowerCase();

  // Fila 1 y Fila 2: Avisos
  const aviso1Html = esSi(config.aviso1_activo, false) && config.aviso1_texto
    ? `<div class="wv-aviso-fila" style="background:${escaparHtml(config.aviso1_fondo || '#1f2937')}; color:${escaparHtml(config.aviso1_texto_color || '#ffffff')};">${escaparHtml(config.aviso1_texto)}</div>`
    : '';

  const aviso2Html = esSi(config.aviso2_activo, false) && config.aviso2_texto
    ? `<div class="wv-aviso-fila" style="background:${escaparHtml(config.aviso2_fondo || '#16a34a')}; color:${escaparHtml(config.aviso2_texto_color || '#ffffff')};">${escaparHtml(config.aviso2_texto)}</div>`
    : '';

  // Fila 3: Barra de menú principal dinámica + Fila 6: Categorías pegajosa
  const fuenteNombre = config.fuente_nombre
    ? `'${escaparHtml(config.fuente_nombre)}', var(--wv-fuente-base)`
    : 'var(--wv-fuente-base)';
  const colorNombre = config.color_nombre || 'var(--wv-texto)';

  const cabeceraDinamicaHtml = `
    <div id="wv-sticky-header" class="wv-sticky-wrapper ${cantTotal > 0 ? 'has-cart' : ''}">
      <div class="wv-main-bar">
        <div class="wv-marca-grupo">
          ${
            config.logo_url
              ? `<img class="wv-logo-img" src="${escaparHtml(config.logo_url)}" alt="${escaparHtml(config.nombre_negocio)}" />`
              : ''
          }
          <h2 class="wv-nombre-negocio" style="font-family:${fuenteNombre}; color:${escaparHtml(colorNombre)};">
            ${escaparHtml(config.nombre_negocio || 'Tienda')}
          </h2>
        </div>

        <div class="wv-buscador-pc">
          <input
            type="search"
            class="wv-buscador-input wv-input-buscar"
            placeholder="Buscar productos..."
            value="${escaparHtml(filtroBusqueda)}"
          />
        </div>

        <button type="button" class="wv-carrito-btn-pc" data-accion="abrir-carrito">
          <span>🛒 Carrito</span>
          <span class="wv-carrito-badge">${cantTotal}</span>
          <span>${totalFmt}</span>
        </button>

        <button type="button" class="wv-resumen-movil-bar" data-accion="abrir-carrito">
          <span>${cantTotal} producto(s) • Ver pedido</span>
          <span>${totalFmt}</span>
        </button>
      </div>

      <nav class="wv-categorias-bar" aria-label="Categorías">
        <div class="wv-categorias-inner">
          <button
            type="button"
            class="wv-lupa-movil-btn"
            data-accion="toggle-buscador-movil"
            aria-label="Buscar"
          >
            🔍
          </button>
          ${seccionesActivas
            .map((sec) => {
              const activa = categoriaActiva === sec.id ? 'is-active' : '';
              return `
                <button
                  type="button"
                  class="wv-cat-pill ${activa}"
                  data-ir-seccion="${escaparHtml(sec.id)}"
                >
                  ${escaparHtml(sec.titulo)}
                </button>
              `;
            })
            .join('')}
        </div>
        <div id="wv-buscador-movil-drawer" class="wv-buscador-movil-drawer">
          <input
            type="search"
            class="wv-buscador-input wv-input-buscar"
            placeholder="Buscar productos..."
            value="${escaparHtml(filtroBusqueda)}"
          />
        </div>
      </nav>
    </div>
  `;

  // Fila 4: Banner principal PC / Móvil
  const bannerPc = config.banner_inicio_pc || config.banner_inicio_movil;
  const bannerMovil = config.banner_inicio_movil || config.banner_inicio_pc;
  const bannerHtml =
    esSi(config.banner_inicio_activo, false) && (bannerPc || bannerMovil)
      ? `
      <div class="wv-banner-principal">
        ${bannerPc ? `<img class="wv-img-solo-pc" src="${escaparHtml(bannerPc)}" alt="Banner principal" />` : ''}
        ${bannerMovil ? `<img class="wv-img-solo-movil" src="${escaparHtml(bannerMovil)}" alt="Banner principal" />` : ''}
      </div>
    `
      : '';

  // Fila 5: Barra de estado (Abierto/Cerrado + texto a la derecha)
  const abierto = estaAbiertoSegunHorario(config);
  const textoEstado = abierto
    ? config.texto_abierto || 'Abierto ahora'
    : config.texto_cerrado || 'Cerrado por ahora';

  const estadoHtml = esSi(config.barra_estado_activo, false)
    ? `
      <div
        class="wv-estado-bar"
        style="background:${escaparHtml(config.barra_estado_fondo || '#18181b')}; color:${escaparHtml(config.barra_estado_texto || '#ffffff')};"
      >
        <div class="wv-estado-inner">
          <div class="wv-estado-izq">
            <span class="wv-estado-indicador">
              <span class="wv-punto-estado ${abierto ? '' : 'is-cerrado'}"></span>
              ${escaparHtml(textoEstado)}
            </span>
          </div>
          ${
            config.barra_estado_derecha
              ? `<div class="wv-estado-der">${escaparHtml(config.barra_estado_derecha)}</div>`
              : ''
          }
        </div>
      </div>
    `
    : '';

  // Combinamos Secciones y MódulosExtra ordenados por su columna `orden`
  const elementosCuerpo = [
    ...seccionesActivas.map((s) => ({
      kind: 'seccion',
      orden: aNumero(s.orden, 0),
      data: s
    })),
    ...modulosActivos.map((m) => ({
      kind: 'modulo',
      orden: aNumero(m.orden, 0),
      data: m
    }))
  ].sort((a, b) => a.orden - b.orden);

  const LIMITE_INICIAL = 12;
  const textoVerMas = (config.texto_boton_ver_mas || 'Ver más productos').trim();

  let cuerpoHtml = `<main id="wv-catalogo-main" class="wv-catalogo-main">`;

  elementosCuerpo.forEach((item) => {
    if (item.kind === 'modulo') {
      cuerpoHtml += renderizarModuloExtra(item.data, seccionesActivas);
      return;
    }

    const sec = item.data;
    const productosSeccion = productos.filter((p) => {
      if (p.seccion_id !== sec.id || !esSi(p.disponible, true)) return false;
      if (!textoBusqueda) return true;
      const matchNombre = (p.nombre || '').toLowerCase().includes(textoBusqueda);
      const matchDesc = (p.descripcion || '').toLowerCase().includes(textoBusqueda);
      return matchNombre || matchDesc;
    });

    if (productosSeccion.length === 0 && textoBusqueda) return;

    const estilo = (sec.estilo_modulo || 'cuadricula').toLowerCase() === 'lista' ? 'lista' : 'cuadricula';
    const visibles = productosSeccion.slice(0, LIMITE_INICIAL);
    const hayMas = productosSeccion.length > LIMITE_INICIAL;

    const tFuente = sec.titulo_fuente ? `'${escaparHtml(sec.titulo_fuente)}', var(--wv-fuente-base)` : 'var(--wv-fuente-base)';
    const tTamano = sec.titulo_tamano || '22px';
    const tColor = sec.titulo_color || 'var(--wv-texto)';

    const sFuente = sec.subtitulo_fuente ? `'${escaparHtml(sec.subtitulo_fuente)}', var(--wv-fuente-base)` : 'var(--wv-fuente-base)';
    const sTamano = sec.subtitulo_tamano || '14px';
    const sColor = sec.subtitulo_color || 'var(--wv-texto-suave)';

    const tarjetasHtml = visibles
      .map((prod) => {
        const exProd = extras.filter((e) => e.producto_id === prod.id);
        const plantillas = renderizarTarjetaProducto(prod, config, exProd);
        return estilo === 'lista' ? plantillas.lista : plantillas.cuadricula;
      })
      .join('');

    const contenedorClase =
      estilo === 'lista' ? 'wv-lista-productos' : 'wv-grid-productos';

    cuerpoHtml += `
      <section id="sec-${escaparHtml(sec.id)}" class="wv-seccion-bloque" data-seccion-id="${escaparHtml(sec.id)}">
        <div class="wv-seccion-header">
          <h2
            class="wv-seccion-titulo"
            style="font-family:${tFuente}; font-size:${escaparHtml(tTamano)}; color:${escaparHtml(tColor)};"
          >
            ${escaparHtml(sec.titulo)}
          </h2>
          ${
            sec.subtitulo
              ? `<p class="wv-seccion-subtitulo" style="font-family:${sFuente}; font-size:${escaparHtml(sTamano)}; color:${escaparHtml(sColor)};">${escaparHtml(sec.subtitulo)}</p>`
              : ''
          }
        </div>
        <div class="${contenedorClase}">
          ${tarjetasHtml}
        </div>
        ${
          hayMas
            ? `<div class="wv-ver-mas-wrap">
                 <button
                   type="button"
                   class="wv-btn-secundario"
                   data-abrir-ver-mas="${escaparHtml(sec.id)}"
                 >
                   ${escaparHtml(textoVerMas)} (${productosSeccion.length})
                 </button>
               </div>`
            : ''
        }
      </section>
    `;
  });

  cuerpoHtml += `</main>`;

  const barraFlotanteHtml =
    cantTotal > 0
      ? `
      <button type="button" class="wv-barra-carrito-flotante" data-accion="abrir-carrito">
        <span>${cantTotal} producto(s) • Ver pedido</span>
        <span>${totalFmt}</span>
      </button>
    `
      : '';

  return (
    aviso1Html +
    aviso2Html +
    cabeceraDinamicaHtml +
    bannerHtml +
    estadoHtml +
    cuerpoHtml +
    barraFlotanteHtml +
    renderizarFooterWhatsVend(config)
  );
}
