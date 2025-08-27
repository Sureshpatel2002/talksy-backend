import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import userRoutes from './routes/users.js';
import statusRoutes from './routes/status.js';
import conversationRoutes from './routes/conversations.js';
import notificationRoutes from './routes/notifications.js';
import testNotificationRoutes from './routes/test-notification.js';
import mediaRoutes from './routes/media.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

// Routes
app.use('/api/users', userRoutes);
app.use('/api/status', authenticateToken, statusRoutes);
app.use('/api/conversations', authenticateToken, conversationRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/test', testNotificationRoutes);
app.use('/api/media', mediaRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user's room
    socket.on('join', (userId) => {
        socket.join(userId);
    });

    // Handle new message
    socket.on('new_message', (data) => {
        const { conversationId, message } = data;
        io.to(conversationId).emit('message_received', message);
    });

    // Handle typing status
    socket.on('typing', (data) => {
        const { conversationId, userId, isTyping } = data;
        socket.to(conversationId).emit('user_typing', { userId, isTyping });
    });

    // Handle online status
    socket.on('online_status', (data) => {
        const { userId, isOnline } = data;
        io.emit('user_status_changed', { userId, isOnline });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: err.message || 'Something went wrong!'
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 