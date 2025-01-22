import { PROMPT_TYPES } from '../config/promptTypes.js';
import * as aiService from '../services/aiService.js';

export async function analyzeAnswers(req, res) {
    const { answers, promptType, customPrompt, interactionCount } = req.body;
    
    try {
        let systemPrompt = promptType === 'CUSTOM' 
            ? customPrompt 
            : PROMPT_TYPES[promptType].systemPrompt;

        if (promptType === 'CUSTOM' && !customPrompt) {
            return res.status(400).json({ error: 'Custom prompt is required for custom quiz type' });
        }

        const result = await aiService.generateAnalysis(systemPrompt, answers, interactionCount);
        res.json(result);
    } catch (error) {
        console.error("Error generating analysis:", error);
        res.status(500).json({ 
            error: error.message,
            remainingInteractions: 3 - interactionCount,
            success: false
        });
    }
} 