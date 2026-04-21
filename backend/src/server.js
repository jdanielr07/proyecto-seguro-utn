'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const auditRoutes = require('./routes/audit.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { auditMiddleware } = require('./middleware/audit.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── 1. HEADERS DE SEGURIDAD (RS-06) ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // para estilos inline mínimos
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },           // X-Frame-Options: DENY
  xContentTypeOptions: true,                   // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin' }, // Referrer-Policy
  hsts: {                                      // Strict-Transport-Security
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// ─── 2. CORS ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── 3. PARSERS ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));       // Limitar body size
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// ─── 4. SESIONES SEGURAS (RS-04) ───────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sid',                                  // No revelar que es express-session
  cookie: {
    httpOnly: true,                             // RS-04: HttpOnly
    secure: process.env.NODE_ENV === 'production', // RS-04: Secure
    sameSite: 'strict',                         // RS-03: ayuda contra CSRF
    maxAge: 5 * 60 * 1000,                      // RS-04: 5 minutos de inactividad
  },
  rolling: true,                                // Reinicia el timer en cada request
}));

// ─── 5. LOGGING ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── 6. MIDDLEWARE DE AUDITORÍA ─────────────────────────────────────────────
app.use(auditMiddleware);

// ─── 7. RUTAS DE LA API ─────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/audit',    auditRoutes);

// ─── 8. SWAGGER DOCS (Entregable 5) ────────────────────────────────────────
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../api_docs/swagger.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log('Swagger docs not loaded yet');
}

// ─── 9. ARCHIVOS ESTÁTICOS DEL FRONTEND ─────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// SPA fallback: cualquier ruta que no sea /api devuelve el index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// ─── 10. MANEJO GLOBAL DE ERRORES ───────────────────────────────────────────
app.use(errorHandler);

// ─── INICIAR SERVIDOR ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV}`);
});

module.exports = app;
