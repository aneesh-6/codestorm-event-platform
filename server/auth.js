import jwt from 'jsonwebtoken';
import db from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'codestorm-2026-super-secret-key-mrem-cseds';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      participantId: user.participantId,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please re-login.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Requires one of roles: [${roles.join(', ')}] but user has role '${req.user.role}'` 
      });
    }
    next();
  };
}
