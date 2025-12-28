const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Protects routes by verifying JWT tokens
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'No token provided'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    
    // Attach user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    
    console.log(`🔐 [AUTH] User ${req.userId} authenticated`);
    
    next();
  } catch (error) {
    console.error('❌ [AUTH] Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }
    
    res.status(401).json({ 
      success: false, 
      error: 'Authentication failed',
      message: error.message
    });
  }
}

module.exports = authMiddleware;
