const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    serialNumber: String,
    productName: String,
    imageUrls: [String],
    processedImageUrls: [String],
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    requestId: String,
    error: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);