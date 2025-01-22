import { PROMPT_TYPES } from '../config/promptTypes.js';
import * as aiService from '../services/aiService.js';

export async function analyzeAnswers(req, res) {
    const { answers, promptType, customPrompt, interactionCount } = req.body;
    
    try {
        let systemPrompt = promptType === 'CUSTOM' 
            ? customPrompt 
            : PROMPT_TYPES[promptType]?.systemPrompt;

        if (!systemPrompt) {
            return res.status(400).json({ error: 'Invalid prompt type or missing custom prompt' });
        }

        const result = await aiService.generateAnalysis(systemPrompt, answers, interactionCount);
        res.json(result);
    } catch (error) {
        console.error("Error generating analysis:", error);
        res.status(500).json({ 
            error: error.message || 'Failed to analyze answers',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
} 