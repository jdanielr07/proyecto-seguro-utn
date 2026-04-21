/**
 * api.js - Cliente HTTP centralizado
 * - Todas las peticiones pasan por aquí
 * - Maneja errores 401 (redirige a login)
 * - Sanitiza outputs para prevenir XSS (RS-02)
 */

const API = (() => {
  const BASE = '/api';

  /**
   * Escapa HTML para prevenir XSS al insertar texto en el DOM (RS-02)
   * SIEMPRE usar esta función al mostrar datos del servidor en innerHTML
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Petición base - todas las llamadas a la API usan esto
   */
  async function request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',   // Enviar cookies HttpOnly automáticamente
    };

    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(BASE + path, opts);

      // Sesión expirada o no autenticado → ir al login
      if (res.status === 401) {
        window.APP?.showLogin?.();
        return null;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error || `Error ${res.status}`;
        throw new Error(msg);
      }

      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        throw new Error('No se pudo conectar al servidor.');
      }
      throw err;
    }
  }

  return {
    escapeHtml,

    // Auth
    auth: {
      login:  (u, p)  => request('POST', '/auth/login',  { username: u, password: p }),
      logout: ()      => request('POST', '/auth/logout'),
      me:     ()      => request('GET',  '/auth/me'),
    },

    // Productos
    products: {
      getAll:  ()       => request('GET',    '/products'),
      getById: (id)     => request('GET',    `/products/${id}`),
      create:  (data)   => request('POST',   '/products', data),
      update:  (id, d)  => request('PUT',    `/products/${id}`, d),
      remove:  (id)     => request('DELETE', `/products/${id}`),
    },

    // Usuarios
    users: {
      getAll:  ()       => request('GET',    '/users'),
      getById: (id)     => request('GET',    `/users/${id}`),
      create:  (data)   => request('POST',   '/users', data),
      update:  (id, d)  => request('PUT',    `/users/${id}`, d),
      remove:  (id)     => request('DELETE', `/users/${id}`),
    },

    // Auditoría
    audit: {
      getAll: (page = 1, event = '') =>
        request('GET', `/audit?page=${page}&limit=30${event ? `&event=${event}` : ''}`),
    },
  };
})();
