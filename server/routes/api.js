import express from 'express';
import { PROMPT_TYPES } from '../config/promptTypes.js';
import { getQuestions } from '../controllers/questionController.js';
import { analyzeAnswers } from '../controllers/analysisController.js';
import { handleFollowUp } from '../controllers/followUpController.js';

const router = express.Router();

router.get('/prompt-types', (req, res) => {
    res.json(PROMPT_TYPES);
});

router.get('/questions', getQuestions);
router.post('/analyze', analyzeAnswers);
router.post('/follow-up', handleFollowUp);

export default router; 