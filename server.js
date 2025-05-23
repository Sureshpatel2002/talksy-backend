require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { initializeSocket } = require('./socket');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible to routes
app.set('io', io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

// Routes
app.get('/', (req, res) => res.send('API is live'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/status', require('./routes/status'));
app.use('/api/images', require('./routes/images'));

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
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    file: req.file
  });
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size too large. Maximum size is 5MB'
      });
    }
    return res.status(400).json({
      error: err.message
    });
  }
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
