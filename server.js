// server.js

const express = require('express');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies for POST requests
app.use(express.json());

// --- Routes ---

// 1. Health Check Endpoint [cite: 65, 66]
app.get('/healthz', (req, res) => {
    res.status(200).json({ 
        ok: true, 
        version: "1.0",
        message: "TinyLink server is healthy and running."
    });
});

// The remaining core routes (/, /:code, /code/:code, /api/links) will be added here

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the server health check at http://localhost:${PORT}/healthz`);
});