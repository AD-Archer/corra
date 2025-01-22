import * as aiService from '../services/aiService.js';

export async function handleFollowUp(req, res) {
    const { question, previousAnalysis, interactionCount } = req.body;

    if (!question || !previousAnalysis) {
        return res.status(400).json({ 
            error: 'Question and previous analysis are required',
            remainingInteractions: 3 - interactionCount,
            success: false
        });
    }

    try {
        const result = await aiService.generateFollowUp(previousAnalysis, question, interactionCount);
        res.json(result);
    } catch (error) {
        console.error("Error generating follow-up response:", error);
        res.status(500).json({ 
            error: error.message,
            remainingInteractions: 3 - interactionCount,
            success: false
        });
    }
} 