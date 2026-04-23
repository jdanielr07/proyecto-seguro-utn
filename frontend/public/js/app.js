/**
 * app.js - Lógica principal del frontend
 * RS-02: NUNCA usar innerHTML con datos del usuario sin escapeHtml()
 */

window.APP = (() => {
  let currentUser = null;
  let confirmCallback = null;
  let auditPage = 1;

  // ── Helpers DOM ────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const esc = API.escapeHtml;

  function showToast(msg, type = 'success') {
    const t = $('toast');
    t.className = `toast toast-${type}`;
    // RS-02: usar textContent, no innerHTML
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
  }

  function showModal(id) { $(id).classList.remove('hidden'); }
  function hideModal(id) { $(id).classList.add('hidden'); }

  function clearFormErrors(formId) {
    document.querySelectorAll(`#${formId} .field-error`).forEach(el => el.textContent = '');
    const errBox = document.querySelector(`#${formId} .alert-error`);
    if (errBox) errBox.classList.add('hidden');
  }

  function showApiError(boxId, err) {
    const box = $(boxId);
    if (!box) return;
    // RS-02: textContent para mensajes de error del servidor
    box.textContent = err.message || 'Error desconocido.';
    box.classList.remove('hidden');
  }

  function rolBadge(rol) {
    const map = {
      SUPERADMIN:   ['badge-superadmin', '⚡ SuperAdmin'],
      AUDITOR:      ['badge-auditor',    '👁 Auditor'],
      REGISTRADOR:  ['badge-registrador','📝 Registrador'],
    };
    const [cls, label] = map[rol] || ['', rol];
    // Construimos el badge de forma segura
    const span = document.createElement('span');
    span.className = `badge ${cls}`;
    span.textContent = label;
    return span.outerHTML;
  }

  function formatDate(dt) {
    if (!dt) return '–';
    return new Date(dt).toLocaleString('es-CR');
  }

  // ── Validación frontend (RF-03, RF-04) ────────────────────────────────────
  function validateProductForm() {
    let valid = true;
    const fields = {
      'p-code':        { val: $('p-code').value,        err: 'p-code-error',  msg: 'Código requerido (máx 20 chars, alfanumérico).' },
      'p-name':        { val: $('p-name').value,        err: 'p-name-error',  msg: 'Nombre requerido (2–100 chars).' },
      'p-description': { val: $('p-description').value, err: 'p-desc-error',  msg: 'Descripción requerida.' },
    };
    for (const f of Object.values(fields)) {
      $(f.err).textContent = f.val.trim() ? '' : f.msg;
      if (!f.val.trim()) valid = false;
    }
    const qty = parseInt($('p-quantity').value, 10);
    if (isNaN(qty) || qty < 0) { $('p-qty-error').textContent = 'Cantidad debe ser ≥ 0.'; valid = false; }
    else $('p-qty-error').textContent = '';
    const price = parseFloat($('p-price').value);
    if (isNaN(price) || price <= 0) { $('p-price-error').textContent = 'Precio debe ser > 0.'; valid = false; }
    else $('p-price-error').textContent = '';
    return valid;
  }

  function validateUserForm(isEdit) {
    let valid = true;
    const username = $('u-username').value.trim();
    const email    = $('u-email').value.trim();
    const password = $('u-password').value;

    if (!isEdit && !username) { $('u-username-error').textContent = 'Usuario requerido.'; valid = false; }
    else $('u-username-error').textContent = '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $('u-email-error').textContent = 'Email inválido.'; valid = false;
    } else $('u-email-error').textContent = '';

    if (!isEdit && password.length < 8) {
      $('u-password-error').textContent = 'Contraseña: mínimo 8 caracteres.'; valid = false;
    } else $('u-password-error').textContent = '';

    return valid;
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  function showLogin() {
    currentUser = null;
    $('login-screen').classList.add('active');
    $('app-screen').classList.remove('active');
    $('login-form').reset();
  }

  async function initApp() {
    try {
      currentUser = await API.auth.me();
      if (!currentUser) { showLogin(); return; }
      renderApp();
    } catch {
      showLogin();
    }
  }

  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    clearFormErrors('login-form');
    const btn = $('login-btn');
    btn.disabled = true;
    btn.textContent = 'Ingresando...';

    try {
      const res = await API.auth.login($('username').value, $('password').value);
      if (res) {
        // Reload completo: garantiza DOM limpio sin estado del usuario anterior.
        window.location.reload();
      }
    } catch (err) {
      showApiError('login-error', err);
      btn.disabled = false;
      btn.textContent = 'Iniciar Sesión';
    }
  });

  // ── Render App ────────────────────────────────────────────────────────────
  function renderApp() {
    $('login-screen').classList.remove('active');
    $('app-screen').classList.add('active');

    // RS-02: usar textContent, no innerHTML
    $('user-info-sidebar').textContent = `${currentUser.username} · ${currentUser.rol}`;
    $('user-badge').textContent = currentUser.rol;
    $('user-badge').className = `badge badge-${currentUser.rol.toLowerCase()}`;

    // Mostrar/ocultar nav según rol (RF-05)
    // IMPORTANTE: esto es solo UX, la seguridad real está en el backend
    const isAdmin   = currentUser.rol === 'SUPERADMIN';
    const canWrite  = ['SUPERADMIN', 'REGISTRADOR'].includes(currentUser.rol);
    $('nav-users').style.display = '';
    $('nav-audit').style.display = isAdmin ? '' : 'none';
    $('btn-new-user')    && ($('btn-new-user').style.display    = isAdmin  ? '' : 'none');
    $('btn-new-product') && ($('btn-new-product').style.display = canWrite ? '' : 'none');

    // Limpiar todo el contenido dinámico de la sesión anterior para que
    // el nuevo usuario nunca vea filas, stats ni logs de otro usuario.
    $('products-tbody').innerHTML     = '';
    $('users-tbody').innerHTML        = '';
    $('audit-tbody').innerHTML        = '';
    $('audit-pagination').innerHTML   = '';
    $('recent-logs-table').innerHTML  = '';
    $('stat-products').textContent    = '–';
    $('stat-users').textContent       = '–';
    $('stat-logs').textContent        = '–';

    // Resetear siempre al dashboard al iniciar sesión
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    const dashNav = document.querySelector('.nav-item[data-page="dashboard"]');
    if (dashNav) dashNav.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    $('page-dashboard').classList.add('active');
    $('page-title').textContent = dashNav ? dashNav.textContent.trim() : 'Dashboard';

    loadDashboard();
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      $(`page-${page}`).classList.add('active');
      $('page-title').textContent = link.textContent.trim();

      if (page === 'dashboard') loadDashboard();
      if (page === 'products')  loadProducts();
      if (page === 'users')     loadUsers();
      if (page === 'audit')     loadAudit();
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  $('logout-btn').addEventListener('click', async () => {
    await API.auth.logout();
    showLogin();
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async function loadDashboard() {
    try {
      const [products, users] = await Promise.all([
        API.products.getAll(),
        API.users.getAll(),
      ]);
      $('stat-products').textContent = products?.length ?? 0;
      $('stat-users').textContent    = users?.length ?? 0;

      if (currentUser.rol === 'SUPERADMIN') {
        const logs = await API.audit.getAll();
        $('stat-logs').textContent = logs?.total ?? 0;
        renderRecentLogs(logs?.logs?.slice(0, 5) ?? []);
        $('recent-logs-section').style.display = '';
      } else {
        $('recent-logs-section').style.display = 'none';
      }
    } catch {}
  }

  function renderRecentLogs(logs) {
    const tbody = $('recent-logs-table');
    if (!logs.length) { tbody.textContent = 'Sin eventos recientes.'; return; }

    // RS-02: construir tabla sin innerHTML con datos de usuario
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Evento</th><th>Usuario</th><th>IP</th><th>Fecha</th></tr></thead>`;
    const tb = document.createElement('tbody');
    logs.forEach(log => {
      const tr = document.createElement('tr');
      const tdEvent = document.createElement('td');
      tdEvent.textContent = log.event;
      const tdUser = document.createElement('td');
      tdUser.textContent = log.user?.username || '–';
      const tdIp = document.createElement('td');
      tdIp.textContent = log.ipAddress;
      const tdDate = document.createElement('td');
      tdDate.textContent = formatDate(log.createdAt);
      tr.append(tdEvent, tdUser, tdIp, tdDate);
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    tbody.innerHTML = '';
    tbody.appendChild(table);
  }

  // ── Productos ─────────────────────────────────────────────────────────────
  async function loadProducts() {
    try {
      const products = await API.products.getAll();
      const tbody = $('products-tbody');
      tbody.innerHTML = '';

      const canWrite = ['SUPERADMIN', 'REGISTRADOR'].includes(currentUser.rol);
      if ($('btn-new-product')) $('btn-new-product').style.display = canWrite ? '' : 'none';

      if (!products?.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Sin productos</td></tr>';
        return;
      }

      products.forEach(p => {
        const tr = document.createElement('tr');
        // RS-02: textContent para todos los datos del servidor
        const cells = [
          p.code, p.name, p.description,
          p.quantity, `₡${parseFloat(p.price).toLocaleString('es-CR', {minimumFractionDigits:2})}`
        ];
        cells.forEach(val => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });

        const tdActions = document.createElement('td');
        if (canWrite) {
          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-sm btn-secondary';
          editBtn.textContent = 'Editar';
          editBtn.style.marginRight = '0.4rem';
          editBtn.addEventListener('click', () => openEditProduct(p));

          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-sm btn-danger';
          delBtn.textContent = 'Eliminar';
          delBtn.addEventListener('click', () => confirmDelete('producto', () => deleteProduct(p.id)));

          tdActions.append(editBtn, delBtn);
        } else {
          tdActions.textContent = '–';
        }
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openNewProduct() {
    $('modal-product-title').textContent = 'Nuevo Producto';
    $('product-form').reset();
    $('product-id').value = '';
    $('p-code').disabled = false;
    clearFormErrors('product-form');
    showModal('modal-product');
  }

  function openEditProduct(p) {
    $('modal-product-title').textContent = 'Editar Producto';
    $('product-id').value   = p.id;
    $('p-code').value        = p.code;
    $('p-code').disabled     = true;  // código no se puede cambiar
    $('p-name').value        = p.name;
    $('p-description').value = p.description;
    $('p-quantity').value    = p.quantity;
    $('p-price').value       = p.price;
    clearFormErrors('product-form');
    showModal('modal-product');
  }

  $('btn-new-product')?.addEventListener('click', openNewProduct);

  $('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateProductForm()) return;

    const id = $('product-id').value;
    const data = {
      code:        $('p-code').value.trim().toUpperCase(),
      name:        $('p-name').value.trim(),
      description: $('p-description').value.trim(),
      quantity:    parseInt($('p-quantity').value, 10),
      price:       parseFloat($('p-price').value),
    };

    try {
      if (id) {
        await API.products.update(id, data);
        showToast('Producto actualizado.');
      } else {
        await API.products.create(data);
        showToast('Producto creado.');
      }
      hideModal('modal-product');
      loadProducts();
    } catch (err) {
      showApiError('product-form-error', err);
    }
  });

  async function deleteProduct(id) {
    try {
      await API.products.remove(id);
      showToast('Producto eliminado.');
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────
  async function loadUsers() {
    try {
      const users = await API.users.getAll();
      const tbody = $('users-tbody');
      tbody.innerHTML = '';

      const isAdmin = currentUser.rol === 'SUPERADMIN';
      if ($('btn-new-user')) $('btn-new-user').style.display = isAdmin ? '' : 'none';

      if (!users?.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Sin usuarios</td></tr>';
        return;
      }

      users.forEach(u => {
        const tr = document.createElement('tr');

        const tdUser = document.createElement('td');
        tdUser.textContent = u.username;

        const tdEmail = document.createElement('td');
        tdEmail.textContent = u.email;

        const tdRol = document.createElement('td');
        tdRol.innerHTML = rolBadge(u.rol);

        const tdLogin = document.createElement('td');
        tdLogin.textContent = formatDate(u.lastLoginAt);

        const tdIp = document.createElement('td');
        tdIp.textContent = u.lastLoginIp || '–';

        const tdStatus = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = u.isActive ? 'badge badge-success' : 'badge badge-danger';
        statusSpan.textContent = u.isActive ? 'Activo' : 'Inactivo';
        tdStatus.appendChild(statusSpan);

        const tdActions = document.createElement('td');
        if (isAdmin && u.id !== currentUser.id) {
          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-sm btn-secondary';
          editBtn.textContent = 'Editar';
          editBtn.style.marginRight = '0.4rem';
          editBtn.addEventListener('click', () => openEditUser(u));

          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-sm btn-danger';
          delBtn.textContent = 'Eliminar';
          delBtn.addEventListener('click', () => confirmDelete('usuario', () => deleteUser(u.id)));

          tdActions.append(editBtn, delBtn);
        } else {
          tdActions.textContent = '–';
        }

        tr.append(tdUser, tdEmail, tdRol, tdLogin, tdIp, tdStatus, tdActions);
        tbody.appendChild(tr);
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openNewUser() {
    $('modal-user-title').textContent = 'Nuevo Usuario';
    $('user-form').reset();
    $('user-id').value = '';
    $('u-username').disabled = false;
    $('pass-hint').textContent = '(requerida)';
    clearFormErrors('user-form');
    showModal('modal-user');
  }

  function openEditUser(u) {
    $('modal-user-title').textContent = 'Editar Usuario';
    $('user-id').value    = u.id;
    $('u-username').value = u.username;
    $('u-username').disabled = true;
    $('u-email').value    = u.email;
    $('u-password').value = '';
    $('u-rol').value      = u.rol;
    $('pass-hint').textContent = '(dejar vacío para no cambiar)';
    clearFormErrors('user-form');
    showModal('modal-user');
  }

  $('btn-new-user')?.addEventListener('click', openNewUser);

  $('user-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id = $('user-id').value;
    if (!validateUserForm(!!id)) return;

    const data = {
      email:    $('u-email').value.trim(),
      rol:      $('u-rol').value,
      isActive: true,
    };
    if (!id) data.username = $('u-username').value.trim();
    if ($('u-password').value) data.password = $('u-password').value;

    try {
      if (id) {
        await API.users.update(id, data);
        showToast('Usuario actualizado.');
      } else {
        await API.users.create(data);
        showToast('Usuario creado.');
      }
      hideModal('modal-user');
      loadUsers();
    } catch (err) {
      showApiError('user-form-error', err);
    }
  });

  async function deleteUser(id) {
    try {
      await API.users.remove(id);
      showToast('Usuario desactivado.');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ── Auditoría ─────────────────────────────────────────────────────────────
  async function loadAudit(page = 1) {
    auditPage = page;
    const event = $('audit-filter').value;
    try {
      const data = await API.audit.getAll(page, event);
      const tbody = $('audit-tbody');
      tbody.innerHTML = '';

      if (!data?.logs?.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin eventos</td></tr>';
        return;
      }

      data.logs.forEach(log => {
        const tr = document.createElement('tr');

        const tdDate   = document.createElement('td'); tdDate.textContent   = formatDate(log.createdAt);
        const tdEvent  = document.createElement('td'); tdEvent.textContent  = log.event;
        const tdUser   = document.createElement('td'); tdUser.textContent   = log.user?.username || '–';
        const tdIp     = document.createElement('td'); tdIp.textContent     = log.ipAddress;
        const tdDetail = document.createElement('td'); tdDetail.textContent = log.detail ? JSON.stringify(JSON.parse(log.detail)).substring(0, 80) : '–';

        tr.append(tdDate, tdEvent, tdUser, tdIp, tdDetail);
        tbody.appendChild(tr);
      });

      renderPagination(data.totalPages, page);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderPagination(total, current) {
    const container = $('audit-pagination');
    container.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === current) btn.classList.add('active');
      btn.addEventListener('click', () => loadAudit(i));
      container.appendChild(btn);
    }
  }

  $('audit-filter').addEventListener('change', () => loadAudit(1));

  // ── Confirmar eliminación ─────────────────────────────────────────────────
  function confirmDelete(type, callback) {
    const msg = $('confirm-message');
    msg.textContent = `¿Estás seguro que querés eliminar este ${type}? Esta acción no se puede deshacer.`;
    confirmCallback = callback;
    showModal('modal-confirm');
  }

  $('confirm-delete-btn').addEventListener('click', () => {
    hideModal('modal-confirm');
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });

  // ── Cerrar modales ────────────────────────────────────────────────────────
  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) hideModal(modalId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  initApp();

  return { showLogin };
})();
