const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const morgan = require('morgan');
const logger = require('./utils/logger');

// Initialize Firebase Admin (skipped in Jest — mocked in __tests__/setup.js)
if (!process.env.JEST_WORKER_ID) {
  const serviceAccount = require('./serviceAccountKey.json');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

const groupRoutes = require('./routes/groups');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev', { stream: logger.stream }));

// Routes
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Firebase API is running');
});

// 404 — no route matched
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — any error passed to next(err) lands here.
// Must be last and must keep all four args so Express treats it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Log server errors (5xx) loudly; treat client errors (4xx) as warnings.
  const logLevel = status >= 500 ? 'error' : 'warn';
  logger[logLevel](`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`, {
    uid: req.user?.uid,
    status,
    stack: status >= 500 ? err.stack : undefined,
  });

  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
