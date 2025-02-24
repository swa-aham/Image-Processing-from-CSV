const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const Request = require('../models/Request');
const { webhookURL } = require('../config');

async function processImage(url) {
    const outputUrl = `https://fake-storage-service/${uuidv4()}.jpg`;
    return outputUrl;
}

async function processImages(requestId) {
    try {
        const products = await Product.find({ requestId });
        for (const product of products) {
            const outputImageUrls = [];
            for (const inputImageUrl of product.inputImageUrls) {
                const outputImageUrl = await processImage(inputImageUrl);
                outputImageUrls.push(outputImageUrl);
            }
            product.outputImageUrls = outputImageUrls;
            await product.save();
        }
        // await axios.post(webhookURL, { requestId, status: 'COMPLETED' });
        await Request.updateOne({ id: requestId }, { status: 'COMPLETED', updatedAt: new Date() });
    } catch (error) {
        // await axios.post(webhookURL, { requestId, status: 'FAILED' });
        await Request.updateOne({ id: requestId }, { status: 'FAILED', updatedAt: new Date() });
    }
}

module.exports = { processImages };