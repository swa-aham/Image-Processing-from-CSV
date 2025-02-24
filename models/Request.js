const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    totalProducts: {
        type: Number,
        default: 0
    },
    processedProducts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

requestSchema.index({ requestId: 1 }, { unique: true });

module.exports = mongoose.model('Request', requestSchema);