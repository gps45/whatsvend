/**
 * ============================================================================
 * WhatsVend - Resolución de tienda y configuración de conexión (tienda.js)
 * ============================================================================
 */

const TIENDAS_WHATSVEND = {
  foodwars: {
    slug: 'foodwars',
    nombre: 'Food Wars',
    sheetId: '1QiNz5KlnUKaZaalRqt3TMs54pAkwtSSUMkQqvjnimI0',
    appsScriptUrl: ''
  }
};

function resolverTiendaActual() {
  const params = new URLSearchParams(window.location.search);
  const tiendaParam = (params.get('tienda') || params.get('store') || '').trim().toLowerCase();

  if (tiendaParam && TIENDAS_WHATSVEND[tiendaParam]) {
    return TIENDAS_WHATSVEND[tiendaParam];
  }

  const host = (window.location.hostname || '').toLowerCase();
  const subdominio = host.split('.')[0];
  if (subdominio && TIENDAS_WHATSVEND[subdominio]) {
    return TIENDAS_WHATSVEND[subdominio];
  }

  return TIENDAS_WHATSVEND.foodwars;
}

window.addEventListener('DOMContentLoaded', () => {
  const tiendaActual = resolverTiendaActual();
  if (typeof iniciarAplicacion === 'function') {
    iniciarAplicacion(tiendaActual);
  }
});