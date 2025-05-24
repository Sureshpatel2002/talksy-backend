require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { initializeSocket } = require('./socket');
const multer = require('multer');
const path = require('path');
const net = require('net');

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

    // Log URI format (without sensitive data)
    const uri = process.env.MONGODB_URI;
    const uriParts = uri.split('@');
    const protocol = uriParts[0].split('://')[0];
    const hostPart = uriParts[uriParts.length - 1]?.split('/')[0] || '';
    
    console.log('MongoDB URI Format Check:');
    console.log('Protocol:', protocol);
    console.log('Host part:', hostPart);
    console.log('URI starts with mongodb:// or mongodb+srv://:', 
      uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
    console.log('Contains @ symbol:', uri.includes('@'));
    console.log('Contains hostname:', hostPart.includes('.'));
    
    // Validate MongoDB URI format
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    }

    if (!uri.includes('@')) {
      throw new Error('Invalid MongoDB URI format. Must include username and password');
    }

    if (!hostPart.includes('.')) {
      throw new Error('Invalid MongoDB URI format. Must include a valid hostname with domain');
    }
    
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(uri, {
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
    console.error('Please check your MONGODB_URI format. It should look like:');
    console.error('mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
    console.error('Note: If your password contains special characters, they need to be URL encoded.');
    console.error('For example: @ becomes %40, # becomes %23, etc.');
    return false;
  }
};

// Function to find an available port
async function findAvailablePort(startPort) {
    // Ensure startPort is a number and within valid range
    let port = parseInt(startPort, 10);
    if (isNaN(port) || port < 0 || port > 65535) {
        port = 3000; // Default to 3000 if invalid
    }

    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port is in use, try the next one (max 10 attempts)
                if (port < 3010) {
                    resolve(findAvailablePort(port + 1));
                } else {
                    reject(new Error('No available ports found between 3000-3010'));
                }
            } else {
                reject(err);
            }
        });
        
        server.listen(port, () => {
            server.close(() => {
                resolve(port);
            });
        });
    });
}

// Start server function
async function startServer() {
    try {
        // Connect to MongoDB first
        const isConnected = await connectDB();
        if (!isConnected) {
            console.error('Failed to connect to MongoDB. Exiting...');
            process.exit(1);
        }

        // Register routes
        app.get('/', (req, res) => res.send('API is live'));
        app.use('/api/health', require('./routes/health'));
        app.use('/api/users', require('./routes/users'));
        app.use('/api/messages', require('./routes/messages'));
        app.use('/api/conversations', require('./routes/conversations'));
        app.use('/api/chats', require('./routes/chats'));
        app.use('/api/status', require('./routes/status'));
        app.use('/api/images', require('./routes/images'));
        app.use('/api/test', require('./routes/test-upload'));

        const port = await findAvailablePort(process.env.PORT || 3000);
        console.log(`Attempting to start server on port ${port}...`);
        
        server.listen(port, () => {
            console.log(`✅ Server is running on port ${port}`);
            console.log(`Health check available at: http://localhost:${port}/api/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

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
