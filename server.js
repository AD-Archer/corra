import express from 'express';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Predefined prompt types
const PROMPT_TYPES = {
    PERSONALITY_ANALYSIS: {
        title: "Personality Analysis",
        description: "Answer a series of questions to analyze your personality.",
        systemPrompt: "You are a highly skilled personality analyst. Based on the user's answers, provide a detailed analysis of their personality."
    },
    CUSTOM: {
        title: "Custom Analysis",
        description: "Create your own personality-based scenario.",
        systemPrompt: "" // Will be provided by user
    }
};

async function generateQuestions(promptType, customPrompt) {
    let prompt = PROMPT_TYPES[promptType].systemPrompt;
    if (promptType === 'CUSTOM') {
        prompt = customPrompt;
    }

    const result = await model.generateContent(prompt + "\n\n" + "Generate 10 multiple choice questions with 4 options each. Format the response as a list of questions with options.");
    const aiResponse = result.response;
    const rawText = aiResponse.text();
    console.log("Raw AI Response:", rawText);

    try {
        const questions = [];
        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        let currentQuestion = null;

        for (const line of lines) {
            if (line.match(/^\*\*\d+\.\s/)) {
                // Start of a new question
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                currentQuestion = {
                    question: line.replace(/^\*\*\d+\.\s/, '').trim(),
                    options: []
                };
            } else if (currentQuestion && line.match(/^\([a-d]\)\s/)) {
                // Option for the current question
                currentQuestion.options.push(line.replace(/^\([a-d]\)\s/, '').trim());
            }
        }

        if (currentQuestion) {
            questions.push(currentQuestion);
        }

        if (questions.length === 0) {
            throw new Error("No valid questions generated");
        }

        return questions;
    } catch (error) {
        console.error("Error parsing AI response:", error);
        throw error;
    }
}

app.get('/api/prompt-types', (req, res) => {
    res.json(PROMPT_TYPES);
});

app.get('/api/questions', async (req, res) => {
    const { promptType } = req.query;
    const customPrompt = req.query.customPrompt || '';

    if (!promptType) {
        return res.status(400).json({ error: 'Prompt type is required' });
    }

    try {
        const questions = await generateQuestions(promptType, customPrompt);
        res.json(questions);
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/analyze', async (req, res) => {
    const { answers, promptType, customPrompt, interactionCount } = req.body;
    let prompt = PROMPT_TYPES[promptType].systemPrompt;
    if (promptType === 'CUSTOM') {
        prompt = customPrompt;
    }

    const result = await model.generateContent(prompt + "\n\n" + "Analyze the following answers and provide a detailed personality analysis:\n" + answers.join("\n"));
    const aiResponse = result.response;
    const analysis = aiResponse.text();
    res.json({ analysis, remainingInteractions: 3 - interactionCount });
});

app.post('/api/follow-up', async (req, res) => {
    const { question, previousAnalysis, interactionCount } = req.body;
    const result = await model.generateContent(previousAnalysis + "\n\n" + "Answer the following question:\n" + question);
    const aiResponse = result.response;
    const answer = aiResponse.text();
    res.json({ answer, remainingInteractions: 3 - interactionCount });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 