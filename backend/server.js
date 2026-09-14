require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const routineRoutes = require('./routes/routine');
const dynamicRoutineRoutes = require('./routes/dynamicRoutine');
const notificationRoutes = require('./routes/notification');

const app = express();
const server = http.createServer(app);

// Allow CORS for Express HTTP routes
app.use(cors({
  origin: true, // Allow any origin in development
  credentials: true
}));

// Allow CORS for Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
});

connectDB();

app.use(express.json());

// Make io available in every route/controller via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

const path = require('path');

app.get('/api-status', (req, res) => res.send('Routine API running'));
app.use('/api/auth', authRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/dynamic-routines', dynamicRoutineRoutes);
app.use('/api/notifications', notificationRoutes);

const distPath = path.join(__dirname, '../frontend/dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api') && req.accepts('html')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Anything that doesn't match a route above -> JSON 404
app.use((req, res) => {
  res.status(404).json({ message: `No route matches ${req.method} ${req.originalUrl}` });
});

// Catch-all error handler. Must be defined last, with 4 arguments, for
// Express to treat it as an error handler. Guarantees every error (a bad
// JSON body from express.json(), a thrown error anywhere, etc.) comes back
// as JSON with a message instead of Express's default HTML error page —
// again, so the real error reaches the UI instead of being swallowed into
// a generic fallback message.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Unexpected server error' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));