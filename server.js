// Load environment variables first, before any other imports
import { config } from 'dotenv';
config();

// Validate environment variables immediately
if (!process.env.GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY is not set in environment variables');
    process.exit(1);
}

// Then do other imports
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './server/routes/api.js';

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// API routes
app.use('/api', apiRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 