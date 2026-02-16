const { verifySapCredentials } = require('../services/sapService');

const basicAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Work Orders"');
    return res.status(401).json({ message: 'Authentication required' });
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  const isValid = await verifySapCredentials(user, pass);

  if (isValid) {
    // Attach credentials to req for downstream use if needed
    req.auth = { user, pass };
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Work Orders"');
    return res.status(401).json({ message: 'Invalid credentials or SAP connection failed' });
  }
};

module.exports = basicAuth;
