// Load environment variables first, before any other imports
import * as dotenv from 'dotenv';
dotenv.config();

// Then do other imports
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './server/routes/api.js';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Validate environment variables immediately
if (!process.env.GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY is not set in environment variables');
    process.exit(1);
}

// Serve static files from the public directory
app.use('/static', express.static(path.join(__dirname, 'public/static')));
app.use(express.json());

// API routes - make sure this is before the catch-all route
app.use('/api', apiRoutes);

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 