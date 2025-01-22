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
    BANKAI_SHIKAI: {
        title: "Bleach Zanpakuto Analysis",
        description: "Answer a series of questions to determine your Bankai and Shikai.",
        systemPrompt: "You are a master Zanpakuto analyst from Bleach. Based on the user's answers, determine their Shikai and Bankai abilities, appearance, and name."
    },
    PERSONALITY_ANALYSIS: {
        title: "Personality Analysis",
        description: "Answer a series of questions to analyze your personality.",
        systemPrompt: "You are a highly skilled personality analyst. Based on the user's answers, provide a detailed analysis of their personality."
    },
    AVATAR_ELEMENT: {
        title: "Avatar Element Analysis",
        description: "Answer a series of questions to determine your Avatar element.",
        systemPrompt: "You are a wise Avatar master. Based on the user's answers, determine which of the four elements (Water, Earth, Fire, Air) they would bend."
    },
    SUPER_POWER: {
        title: "Super Power Analysis",
        description: "Answer a series of questions to determine your super power.",
        systemPrompt: "You are a super power analyst. Based on the user's answers, determine what super power they would possess."
    },
    PRINCESS_POWER: {
        title: "Princess Power Analysis",
        description: "Answer a series of questions to determine your princess power.",
        systemPrompt: "You are a royal advisor. Based on the user's answers, determine what kind of princess power they would have."
    }
};

async function generateQuestions(promptType, customPrompt) {
    let prompt = PROMPT_TYPES[promptType].systemPrompt;
    if (promptType === 'CUSTOM') {
        prompt = customPrompt;
    }

    // Modify the prompt to explicitly request a specific format
    const formattingPrompt = `${prompt}

Please generate 10 multiple choice questions with 4 options each. 
Format each question exactly like this example:
1. [Question text here]
a) [First option]
b) [Second option]
c) [Third option]
d) [Fourth option]

Make sure each question is numbered and each option uses lowercase letters a) b) c) d).`;

    const result = await model.generateContent(formattingPrompt);
    const rawText = result.response.text();
    console.log("Raw AI Response:", rawText);

    try {
        const questions = [];
        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        let currentQuestion = null;

        for (const line of lines) {
            // Match numbered questions (e.g., "1.", "2.", etc.)
            const questionMatch = line.match(/^\d+\.\s(.+)/);
            if (questionMatch) {
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                currentQuestion = {
                    question: questionMatch[1].trim(),
                    options: []
                };
            } 
            // Match options with format a), b), c), d)
            else if (currentQuestion && line.match(/^[a-d]\)\s/)) {
                const option = line.replace(/^[a-d]\)\s/, '').trim();
                currentQuestion.options.push(option);
            }
        }

        // Push the last question if it exists
        if (currentQuestion && currentQuestion.options.length > 0) {
            questions.push(currentQuestion);
        }

        if (questions.length === 0) {
            throw new Error("No valid questions were generated. Please try again.");
        }

        // Validate that each question has exactly 4 options
        const invalidQuestions = questions.filter(q => q.options.length !== 4);
        if (invalidQuestions.length > 0) {
            throw new Error("Some questions don't have exactly 4 options. Please try again.");
        }

        return questions;
    } catch (error) {
        console.error("Error parsing AI response:", error);
        throw new Error("Failed to generate properly formatted questions. Please try again.");
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
    
    // Create a more structured prompt for follow-up questions
    const followUpPrompt = `Previous Analysis:
${previousAnalysis}

Based on the above analysis, please provide a detailed and specific answer to this follow-up question:
${question}

Please format your response with these sections:
1. Direct Answer: A clear, concise response to the question
2. Explanation: Detailed reasoning based on the previous analysis
3. Additional Insights: Any relevant extra information or suggestions

Keep your response focused and relevant to both the question and the original analysis.`;

    try {
        const result = await model.generateContent(followUpPrompt);
        const aiResponse = result.response;
        const answer = aiResponse.text();

        // Validate the response
        if (!answer || answer.trim().length === 0) {
            throw new Error("Failed to generate a valid response");
        }

        res.json({ 
            answer,
            remainingInteractions: 3 - interactionCount,
            success: true
        });
    } catch (error) {
        console.error("Error in follow-up response:", error);
        res.status(500).json({ 
            error: "Failed to generate follow-up response. Please try again.",
            remainingInteractions: 3 - interactionCount,
            success: false
        });
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 