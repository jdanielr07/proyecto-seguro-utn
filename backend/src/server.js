'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const auditRoutes = require('./routes/audit.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { auditMiddleware } = require('./middleware/audit.middleware');
const { requireAuth } = require('./middleware/auth.middleware');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000,
  },
  rolling: true,
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use(auditMiddleware);

app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/audit',    auditRoutes);

try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../api_docs/swagger.yaml'));
  app.use('/api/docs', requireAuth, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log('Swagger docs not loaded yet');
}

const STATIC = path.join(__dirname, '../../frontend/public');
app.use(express.static(STATIC, { index: false }));

app.get(/^(?!\/api).*/, (req, res) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'proyecto-seguro',
      });
      return res.sendFile(path.join(STATIC, 'index.html'));
    }
  } catch {
    res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  }
  res.sendFile(path.join(STATIC, 'login.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;
