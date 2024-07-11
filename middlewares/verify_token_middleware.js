const jwt = require('jsonwebtoken');

const dotenv = require('dotenv');
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET_KET;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from the "Bearer <token>" string

    if (!token) {
        return res.status(403).json({ success: false, message: 'Token is required' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Not authorized' });
        }
        // Save the decoded token payload to request for use in other routes
        req.userId = decoded.id;
        next();
    });
};

module.exports = verifyToken;

// const verifyToken = (req, res, next) => {
//     const token = req.header('Authorization').replace('Bearer ', '');

//     if (!token) {
//         return res.status(401).json({ success: false, message: "Access denied." });
//     }

//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         req.user = decoded; // Attach decoded token data to req.user
//         next();
//     } catch (error) {
//         res.status(401).json({ success: false, message: "Invalid token." });
//     }
// };

// module.exports = verifyToken;