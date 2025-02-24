const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        console.log('Webhook received:', req.body);
        res.json({ message: 'Webhook received' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;