'use strict';

const API = (() => {
  const BASE = '/api';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  async function request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };

    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(BASE + path, opts);
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        if (!API._redirecting) {
          API._redirecting = true;
          window.location.href = '/';
        }
        return null;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`);
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
    _redirecting: false,
    escapeHtml,

    auth: {
      login:  (u, p)  => request('POST', '/auth/login',  { username: u, password: p }),
      logout: ()      => request('POST', '/auth/logout'),
      me:     ()      => request('GET',  '/auth/me'),
    },

    products: {
      getAll:  ()       => request('GET',    '/products'),
      getById: (id)     => request('GET',    `/products/${id}`),
      create:  (data)   => request('POST',   '/products', data),
      update:  (id, d)  => request('PUT',    `/products/${id}`, d),
      remove:  (id)     => request('DELETE', `/products/${id}`),
    },

    users: {
      getAll:  ()       => request('GET',    '/users'),
      getById: (id)     => request('GET',    `/users/${id}`),
      create:  (data)   => request('POST',   '/users', data),
      update:  (id, d)  => request('PUT',    `/users/${id}`, d),
      remove:  (id)     => request('DELETE', `/users/${id}`),
    },

    audit: {
      getAll: (page = 1, event = '') =>
        request('GET', `/audit?page=${page}&limit=30${event ? `&event=${event}` : ''}`),
    },
  };
})();
