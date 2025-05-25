import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // TODO: Add actual user authentication logic here
        // For now, we'll just check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { email },
            config.jwt.secret,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // TODO: Add actual user registration logic here
        // For now, we'll just check if required fields are provided
        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'Email, password, and name are required'
            });
        }

        res.status(201).json({
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Token is required'
            });
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        res.json({
            message: 'Token is valid',
            user: decoded
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            error: 'Invalid token'
        });
    }
});

export default router; 