const mongoose = require('mongoose');
const axios = require('axios');
const sharp = require('sharp');
const { mongoURI, webhookURL } = require('../config');
const Product = require('../models/Product');
const Request = require('../models/Request');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Ensure output directory exists
const outputDir = 'processed_images';
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}

async function downloadImage(url) {
    try {
        console.log(`Downloading image from: ${url}`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        console.error(`Failed to download image from ${url}:`, error.message);
        return null;
    }
}

async function processImage(imageBuffer, filename) {
    if (!imageBuffer) return null;
    
    try {
        const outputPath = path.join(outputDir, filename);
        await sharp(imageBuffer)
            .resize({ width: 800 }) // Set a max width
            .jpeg({ quality: 50 }) // Compress by 50%
            .toFile(outputPath);
        
        return outputPath;
    } catch (error) {
        console.error('Error processing image:', error.message);
        return null;
    }
}

async function processProduct(product) {
    try {
        console.log(`Processing product ${product._id}`);
        await Product.findByIdAndUpdate(product._id, { status: 'processing' });

        const processedUrls = [];
        let failedUrls = [];

        // Process each image URL
        for (let i = 0; i < product.imageUrls.length; i++) {
            const url = product.imageUrls[i];
            const imageBuffer = await downloadImage(url);
            
            if (imageBuffer) {
                const filename = `${product.requestId}_${product.serialNumber}_${i}.jpg`;
                const processedPath = await processImage(imageBuffer, filename);
                
                if (processedPath) {
                    // Convert local path to URL format
                    const processedUrl = `http://localhost:${process.env.PORT || 5000}/processed/${filename}`;
                    processedUrls.push(processedUrl);
                } else {
                    failedUrls.push(url);
                }
            } else {
                failedUrls.push(url);
            }
        }

        // Update product status
        const status = processedUrls.length > 0 ? 'completed' : 'failed';
        await Product.findByIdAndUpdate(product._id, { 
            status,
            processedImageUrls: processedUrls,
            error: failedUrls.length > 0 ? `Failed to process images: ${failedUrls.join(', ')}` : null
        });

        // Update request processed count
        await Request.findOneAndUpdate(
            { requestId: product.requestId },
            { $inc: { processedProducts: 1 } }
        );

        // Check if all products are processed
        const request = await Request.findOne({ requestId: product.requestId });
        if (request.processedProducts === request.totalProducts) {
            await Request.findOneAndUpdate(
                { requestId: product.requestId },
                { status: 'completed' }
            );

            // Send webhook notification
            try {
                await axios.post(webhookURL, {
                    requestId: product.requestId,
                    status: 'completed',
                    message: 'All products processed',
                    totalProducts: request.totalProducts,
                    processedProducts: request.processedProducts,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error sending webhook:', error.message);
            }
        }

    } catch (error) {
        console.error(`Error processing product ${product._id}:`, error.message);
        await Product.findByIdAndUpdate(product._id, { 
            status: 'failed',
            error: error.message
        });
    }
}

async function processPendingProducts() {
    try {
        const pendingProducts = await Product.find({ status: 'pending' });
        
        if (pendingProducts.length === 0) {
            console.log('No pending products found');
            return;
        }

        console.log(`Found ${pendingProducts.length} pending products`);
        
        for (const product of pendingProducts) {
            await processProduct(product);
        }
    } catch (error) {
        console.error('Error in processPendingProducts:', error.message);
    }
}

// Connect to MongoDB and start processing
mongoose.connect(mongoURI)
    .then(() => {
        console.log('Worker connected to MongoDB');
        // Initial run
        processPendingProducts();
        // Run every 30 seconds
        setInterval(processPendingProducts, 30000);
    })
    .catch(err => console.error('Worker MongoDB connection error:', err));