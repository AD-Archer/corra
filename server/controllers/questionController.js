import { PROMPT_TYPES } from '../config/promptTypes.js';
import * as aiService from '../services/aiService.js';

export async function getQuestions(req, res) {
    const { promptType, customPrompt } = req.query;

    if (!promptType) {
        return res.status(400).json({ error: 'Prompt type is required' });
    }

    try {
        let systemPrompt = promptType === 'CUSTOM' 
            ? customPrompt 
            : PROMPT_TYPES[promptType]?.systemPrompt;

        if (!systemPrompt) {
            return res.status(400).json({ error: 'Invalid prompt type or missing custom prompt' });
        }

        const questions = await aiService.generateQuestions(systemPrompt);
        res.json(questions);
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate questions',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
} 