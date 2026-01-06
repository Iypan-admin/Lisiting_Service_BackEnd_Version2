const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ success: false, error: 'Token is required' });

    const secretKey = process.env.SECRET_KEY || process.env.JWT_SECRET;
    if (!secretKey) {
        console.error('JWT secret key not found in environment variables');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

module.exports = verifyToken;