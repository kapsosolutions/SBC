const jwt = require('jsonwebtoken');

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function auth(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      if (allowed.length && !allowed.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = { sign, auth };
