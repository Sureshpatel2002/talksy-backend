require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { initializeSocket } = require('./socket');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

// Routes
app.get('/', (req, res) => res.send('API is live'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/chats', require('./routes/chats'));

// User Events
io.on('connection', (socket) => {
  socket.on('user:connect', (userId) => {
    // Connect user
  });

  socket.on('user:status', ({ userId, isOnline }) => {
    // User online/offline status
  });

  socket.on('user:status:updated', ({ userId, status }) => {
    // User status update
  });
});

// Message Events
io.on('connection', (socket) => {
  socket.on('message:send', (messageData) => {
    // Send message
  });

  socket.on('message:sent', (message) => {
    // Message sent confirmation
  });

  socket.on('message:receive', (message) => {
    // Receive new message
  });

  socket.on('message:read', ({ messageId, readBy }) => {
    // Message read status
  });

  socket.on('message:error', ({ error }) => {
    // Message error
  });
});

// Typing Events
io.on('connection', (socket) => {
  socket.on('typing:start', ({ conversationId, userId }) => {
    // Start typing
  });

  socket.on('typing:stop', ({ conversationId, userId }) => {
    // Stop typing
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
