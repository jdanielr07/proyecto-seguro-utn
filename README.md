# 🔒 SecureApp - UTN ISW-1013 Proyecto 2

Aplicación web segura construida con Node.js + Express + PostgreSQL + Prisma.

## Equipo

| Nombre | Correo | Rol |
|--------|--------|-----|
| (Coordinador) | | Coordinador |
| | | Integrante |
| | | Integrante |
| | | Integrante |

---

## Stack tecnológico

| Componente | Tecnología | Justificación de seguridad |
|------------|-----------|---------------------------|
| Backend    | Node.js + Express | Ecosistema maduro, soporte activo, amplia cobertura de librerías de seguridad |
| Base de datos | PostgreSQL 16 | Motor robusto, soporte nativo para roles y auditoría |
| ORM        | Prisma | Elimina SQL Injection por diseño (queries 100% parametrizadas) |
| Hashing    | bcrypt (factor 12) | Algoritmo adaptativo resistente a fuerza bruta |
| Auth       | JWT + HS256 | Estándar industria, lista blanca de algoritmos, expira en 1h |
| Proxy      | Nginx | Headers de seguridad globales, rate limiting adicional |
| Container  | Docker Compose | Aislamiento de servicios, reproducible en cualquier máquina |

---

## ⚡ Levantar el proyecto (paso a paso)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **corriendo** (buscá la ballena 🐳 en la barra de tareas)
- Puerto **8080** libre

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPO>
cd proyecto-seguro
```

### 2. Construir y levantar los contenedores

```bash
docker-compose up --build
```

Esperá hasta ver este mensaje en los logs:
```
seguro_backend  | ✅ Servidor corriendo en puerto 3000
```

La primera vez tarda 3-5 minutos porque descarga las imágenes.

### 3. Crear las tablas en la base de datos

Abrí una **segunda terminal** (sin cerrar la primera) y ejecutá:

```bash
docker exec seguro_backend npx prisma db push
```

Deberías ver:
```
✅ Your database is now in sync with your Prisma schema.
```

### 4. Cargar los datos de prueba

```bash
docker exec seguro_backend npm run db:seed
```

Deberías ver:
```
✅ SuperAdmin creado: superadmin
✅ Auditor creado: auditor1
✅ Registrador creado: registrador1
✅ Producto creado: PROD-001...
🎉 Seed completado exitosamente!
```

### 5. Abrir en el navegador

👉 **http://localhost:8080**

---

## Credenciales de prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `superadmin` | `Admin@2026!` | Todo el acceso |
| `auditor1` | `Auditor@2026!` | Solo lectura |
| `registrador1` | `Registrador@2026!` | CRUD productos |

---

## URLs del proyecto

| Recurso | URL |
|---------|-----|
| Aplicación web | http://localhost:8080 |
| API Docs (Swagger) | http://localhost:8080/api/docs |
| URL pública ngrok | *(actualizar aquí cuando esté activo)* |

---

## Exponer a internet con ngrok (para el pentest cruzado)

```bash
# 1. Crear cuenta gratuita en https://ngrok.com
# 2. Autenticarse
ngrok config add-authtoken <TU_TOKEN>

# 3. Con el proyecto corriendo, ejecutar:
ngrok http 8080

# 4. Copiar la URL que aparece (ej: https://abc123.ngrok-free.app)
# 5. Actualizar la URL en este README y notificar al equipo Red Team
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs solo del backend
docker logs seguro_backend -f

# Reiniciar solo el backend (después de cambiar código)
docker-compose restart backend

# Detener todo
docker-compose down

# Reset completo (borra la base de datos también)
docker-compose down -v
docker-compose up --build
docker exec seguro_backend npx prisma db push
docker exec seguro_backend npm run db:seed
```

---

## Controles de seguridad implementados

| Código | Control | Estado |
|--------|---------|--------|
| RF-02 | bcrypt factor 12 | ✅ |
| RF-05 | RBAC validado en backend | ✅ |
| RF-06 | Log de auditoría completo | ✅ |
| RF-07 | JWT en cookie HttpOnly | ✅ |
| RS-01 | Prisma ORM (no SQL Injection) | ✅ |
| RS-02 | Escape de output + CSP | ✅ |
| RS-03 | SameSite=Strict (CSRF) | ✅ |
| RS-04 | Sesión 5min, regeneración post-login | ✅ |
| RS-05 | JWT HS256 únicamente, expira 1h | ✅ |
| RS-06 | Helmet headers completos | ✅ |
| RS-07 | Rate limiting 5 intentos / 5 min | ✅ |