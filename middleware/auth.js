import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const auth = async (req, res, next) => {
    try {
        // Get the token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify the token
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.user_id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        // Find user
        const user = await User.findOne({ uid: decoded.user_id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Add user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error',
            error: error.message,
            code: 'AUTH_ERROR'
        });
    }
};

export default auth; 