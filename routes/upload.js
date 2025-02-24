const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const csv = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const Request = require('../models/Request');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const requestId = uuidv4();
        const results = [];

        // Create a new request record
        const request = new Request({
            requestId,
            status: 'pending',
            totalProducts: 0
        });
        await request.save();

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', async (data) => {
                results.push(data);
                
                // Parse image URLs
                const imageUrls = data['Input Image Urls'].split(',').map(url => url.trim());
                
                // Create product record
                const product = new Product({
                    serialNumber: data['S. No.'],
                    productName: data['Product Name'],
                    imageUrls: imageUrls,
                    status: 'pending',
                    requestId: requestId
                });
                
                await product.save();
            })
            .on('end', async () => {
                // Update request with total products
                await Request.findOneAndUpdate(
                    { requestId },
                    { totalProducts: results.length }
                );

                // Clean up the uploaded file
                fs.unlinkSync(req.file.path);
                
                // Return request ID to client
                res.json({ 
                    requestId: requestId,
                    message: 'File uploaded successfully',
                    products: results
                });
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                res.status(500).json({ error: 'Error processing CSV file' });
            });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;