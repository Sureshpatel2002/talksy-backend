import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { initializeSocket } from './socket.js';
import multer from 'multer';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/health.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import conversationRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import statusRoutes from './routes/status.js';
import mediaRoutes from './routes/media.js';
import testUploadRoutes from './routes/test-upload.js';
import authRoutes from './routes/auth.js';
import notificationRoutes from './routes/notifications.js';
import notificationActionRoutes from './routes/notification-actions.js';
import notificationAnalyticsRoutes from './routes/notification-analytics.js';

// Initialize dotenv
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug environment variables
console.log('Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Increase timeout for all routes
app.use((req, res, next) => {
    res.setTimeout(300000, () => {
        console.error('Request timeout');
        res.status(504).json({
            message: 'Request timeout',
            error: 'TIMEOUT_ERROR'
        });
    });
    next();
});

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
    
    // Set mongoose debug mode
    mongoose.set('debug', true);
    
    // Configure mongoose options
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Reduced from 60000
      socketTimeoutMS: 45000, // Reduced from 90000
      maxPoolSize: 10, // Reduced from 50
      minPoolSize: 5, // Reduced from 10
      retryWrites: true,
      w: 'majority',
      connectTimeoutMS: 30000, // Reduced from 60000
      heartbeatFrequencyMS: 10000, // Reduced from 20000
      maxIdleTimeMS: 30000, // Reduced from 60000
      waitQueueTimeoutMS: 30000, // Reduced from 60000
      retryReads: true,
      family: 4
    };

    console.log('Mongoose options:', JSON.stringify(mongooseOptions, null, 2));
    
    await mongoose.connect(uri, mongooseOptions);
    
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

    // Test the connection
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    console.log('✅ MongoDB Connected');
    return true;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('Error stack:', err.stack);
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

// Register routes
app.get('/', (req, res) => res.send('API is live'));
app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/test', testUploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-actions', notificationActionRoutes);
app.use('/api/notification-analytics', notificationAnalyticsRoutes);

const port = await findAvailablePort(process.env.PORT || 3000);
console.log(`Attempting to start server on port ${port}...`);

server.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
    console.log(`Health check available at: http://localhost:${port}/api/health`);
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