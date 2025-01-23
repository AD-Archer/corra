import express from 'express';
import { PROMPT_TYPES } from '../config/promptTypes.js';
import { getQuestions } from '../controllers/questionController.js';
import { analyzeAnswers } from '../controllers/analysisController.js';
import { handleFollowUp } from '../controllers/followUpController.js';
import { followUpLimiter } from '../services/aiService.js';

const router = express.Router();

router.get('/prompt-types', (req, res) => {
    try {
        res.json(PROMPT_TYPES);
    } catch (error) {
        console.error('Error fetching prompt types:', error);
        res.status(500).json({ error: 'Failed to fetch prompt types' });
    }
});

router.get('/questions', getQuestions);
router.post('/analyze', analyzeAnswers);
router.post('/follow-up', followUpLimiter, handleFollowUp);

export default router; 