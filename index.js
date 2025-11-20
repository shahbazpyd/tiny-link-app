// index.js

const express = require('express');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const path = require('path');

// --- Configuration & Initialization ---
dotenv.config();
// Initialize Prisma client
const prisma = new PrismaClient(); 
const app = express();
const PORT = process.env.PORT || 3000;

// Define the absolute path to the 'public' directory
const publicPath = path.join(__dirname, 'public');

// Regular Expression for URL validation (basic check for http/https protocol)
const URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
// Regular Expression for short code validation: [A-Za-z0-9]{6,8} as required
const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

// Middleware to serve static files from the 'public' directory
app.use(express.static(publicPath));

// Middleware to parse JSON bodies
app.use(express.json());

// --- Root Endpoint ---

// Serve the main dashboard page for the root URL
app.get('/', (req, res) => {
    // This explicitly serves your main HTML file for the root path.
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Route for the Stats Page (Must come before the API routes and the final redirect)
app.get('/code/:code', (req, res) => {
    // We serve the stats.html file for this path
    res.sendFile(path.join(publicPath, 'stats.html'));
});

// --- Helper Functions ---

/**
 * Generates a unique short code (6-8 characters, A-Z, a-z, 0-9).
 */
function generateRandomCode() {
    const length = Math.floor(Math.random() * 3) + 6; // Random length 6, 7, or 8
    // Generate a secure, URL-safe base64 string and truncate it
    return crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, '').slice(0, length);
}


// --- API Endpoints ---

// 1. Health Check Endpoint (GET /healthz)
app.get('/healthz', (req, res) => {
    res.status(200).json({ 
        ok: true, 
        version: "1.0",
        message: "TinyLink server is healthy and running."
    });
});

// 2. Create Short Link (POST /api/links)
app.post('/api/links', async (req, res) => {
    const { targetUrl, customCode } = req.body;

    // A. Validate target URL
    if (!targetUrl || !URL_REGEX.test(targetUrl)) {
        return res.status(400).json({ error: 'Invalid or missing targetUrl. Must start with http:// or https://' });
    }

    let shortCode = customCode;

    // B. Validate or Generate short code
    if (customCode) {
        // Custom code validation
        if (!CODE_REGEX.test(customCode)) {
            return res.status(400).json({ 
                error: 'Invalid customCode. Must be 6 to 8 characters long and contain only alphanumeric characters (A-Z, a-z, 0-9).' 
            });
        }
    } else {
        // Auto-generate a unique code (retry mechanism)
        let foundUnique = false;
        for (let i = 0; i < 5; i++) { // Max 5 retries for a unique code
            shortCode = generateRandomCode();
            const existingLink = await prisma.link.findUnique({ where: { shortCode } });
            if (!existingLink) {
                foundUnique = true;
                break;
            }
        }
        if (!foundUnique) {
             return res.status(500).json({ error: 'Failed to generate a unique short code. Please try again.' });
        }
    }

    // C. Save to Database (handles 409 Conflict)
    try {
        const newLink = await prisma.link.create({
            data: {
                shortCode,
                targetUrl,
                totalClicks: 0,
            }
        });
        
        // Success: 201 Created
        res.status(201).json({ 
            message: 'Link created successfully.',
            link: newLink
        });

    } catch (error) {
        if (error.code === 'P2002') {
            // Return 409 Conflict if code already exists
            return res.status(409).json({ 
                error: 'Conflict: This short code already exists. Please choose a different one.' 
            });
        }
        console.error('Database save error:', error);
        res.status(500).json({ error: 'Internal server error while creating the link.' });
    }
});


// 3. List all links (GET /api/links)
app.get('/api/links', async (req, res) => {
    try {
        const allLinks = await prisma.link.findMany({
            orderBy: {
                createdAt: 'desc',
            }
        });
        res.status(200).json(allLinks);
    } catch (error) {
        console.error('Database fetch error:', error);
        res.status(500).json({ error: 'Internal server error while fetching links.' });
    }
});


// 4. Stats for one code (GET /api/links/:code)
app.get('/api/links/:code', async (req, res) => {
    const { code } = req.params;

    try {
        const link = await prisma.link.findUnique({
            where: { shortCode: code }
        });

        if (!link) {
            return res.status(404).json({ error: 'Link not found.' });
        }

        res.status(200).json(link);
    } catch (error) {
        console.error('Database fetch error:', error);
        res.status(500).json({ error: 'Internal server error while fetching link stats.' });
    }
});


// 5. Delete link (DELETE /api/links/:code)
app.delete('/api/links/:code', async (req, res) => {
    const { code } = req.params;
    
    try {
        // Attempt to delete the link
        await prisma.link.delete({
            where: { shortCode: code }
        });

        // Successful deletion (204 No Content)
        res.status(204).send(); 

    } catch (error) {
        // P2025 means the link to delete was not found
        if (error.code === 'P2025') {
            // If it doesn't exist, we can't delete it, 404 is appropriate
            return res.status(404).json({ error: 'Link not found or already deleted.' });
        }
        console.error('Database delete error:', error);
        res.status(500).json({ error: 'Internal server error while deleting the link.' });
    }
});


// 6. The Redirect Route (GET /:code) - CRUCIAL LOGIC ADDED HERE!
// This MUST be the last route definition to ensure it doesn't conflict with API paths
app.get('/:code', async (req, res) => {
    const { code } = req.params;
    
    // We use a transaction (update) to ensure the click count and redirect happen atomically
    try {
        const updatedLink = await prisma.link.update({
            where: { shortCode: code },
            data: {
                // Increment the click count atomically
                totalClicks: { increment: 1 }, 
                // Set the last clicked time to the current time
                lastClickedAt: new Date(), 
            }
        });

        // Redirect with HTTP 302 (Found/Temporary Redirect) as specified in the assignment 
        res.redirect(302, updatedLink.targetUrl);

    } catch (error) {
        // Prisma error P2025 occurs if the link with that shortCode is not found
        if (error.code === 'P2025') {
            // If the code is not found (or was deleted), return 404 Not Found
            return res.status(404).send('Not Found: The requested short link does not exist or has been deleted.');
        }
        
        console.error('Redirect or database update error:', error);
        // Fallback for any other server-side error
        res.status(500).send('Internal Server Error while processing link redirection.');
    }
});


// // Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
//     console.log(`Dashboard available at http://localhost:${PORT}/`);
//     console.log(`Health Check at http://localhost:${PORT}/healthz`);
// });

// Start the server if not in a serverless environment (like Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Dashboard available at http://localhost:${PORT}/`);
    });
}

module.exports = app;