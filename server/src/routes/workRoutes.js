const express = require('express');
const router = express.Router();
const { fetchSapData } = require('../services/sapService');
const basicAuth = require('../middleware/basicAuth');

// Apply Basic Auth to all routes in this router
// Apply Basic Auth to all routes in this router
router.use(basicAuth);

// @route   GET /api/works/verify
// @desc    Verify credentials
// @access  Private
router.get('/verify', (req, res) => {
  res.json({ status: 'ok' });
});

// @route   POST /api/works/sync
// @desc    Trigger SAP data sync and return data
// @access  Private
router.post('/sync', async (req, res) => {
  try {
    // req.auth is set by basicAuth middleware
    const { user, pass } = req.auth || {};
    
    // Fetch data using authenticated credentials
    const data = await fetchSapData(user, pass);
    
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sync failed' });
  }
});

module.exports = router;
