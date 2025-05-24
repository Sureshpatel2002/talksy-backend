require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { initializeSocket } = require('./socket');
const multer = require('multer');
const path = require('path');

// Debug environment variables
console.log('Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible to routes
app.set('io', io);

// MongoDB Connection with options
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    // Validate MongoDB URI format
    if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    }
    
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      w: 'majority',
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000
    });
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    console.log('✅ MongoDB Connected');
    return true;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    return false;
  }
};

// Initialize server
const startServer = async () => {
  try {
    // Connect to MongoDB first
    const isConnected = await connectDB();
    if (!isConnected) {
      console.error('Failed to connect to MongoDB. Exiting...');
      process.exit(1);
    }

    // Routes
    app.get('/', (req, res) => res.send('API is live'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/messages', require('./routes/messages'));
    app.use('/api/conversations', require('./routes/conversations'));
    app.use('/api/chats', require('./routes/chats'));
    app.use('/api/status', require('./routes/status'));
    app.use('/api/images', require('./routes/images'));
    app.use('/api/test', require('./routes/test-upload'));

    // Health check endpoint for Render
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

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
