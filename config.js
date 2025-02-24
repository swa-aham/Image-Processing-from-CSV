require('dotenv').config();

module.exports = {
    mongoURI: process.env.MONGO_URI,
    webhookURL: process.env.WEBHOOK_URL,
    port: process.env.PORT || 5000
};
