require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const routineRoutes = require('./routes/routine');

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

app.get('/', (req, res) => res.send('Routine API running'));
app.use('/api/auth', authRoutes);
app.use('/api/routines', routineRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));