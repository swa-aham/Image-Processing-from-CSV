const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Product = require('../models/Product');
const { Parser } = require('json2csv');
const fs = require('fs');

// Status check endpoint
router.get('/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        
        const request = await Request.findOne({ requestId });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const products = await Product.find({ requestId });

        res.json({ 
            requestId,
            status: request.status,
            totalProducts: request.totalProducts,
            processedProducts: request.processedProducts,
            products: products
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CSV download endpoint
router.get('/:requestId/csv', async (req, res) => {
    try {
        const { requestId } = req.params;
        
        const request = await Request.findOne({ requestId });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const products = await Product.find({ requestId });
        
        const csvData = products.map(product => ({
            'S. No.': product.serialNumber,
            'Product Name': product.productName,
            'Input Image Urls': product.imageUrls.join(','),
            'Output Image Urls': product.processedImageUrls ? product.processedImageUrls.join(',') : ''
        }));

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(csvData);

        const fileName = `output_${requestId}.csv`;
        fs.writeFileSync(fileName, csv);

        res.download(fileName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            }
            // Delete file after sending
            fs.unlinkSync(fileName);
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;