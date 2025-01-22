import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Add better error handling for API calls
async function safeApiCall(apiFunction) {
    try {
        return await apiFunction();
    } catch (error) {
        console.error('API Error:', error);
        if (error.message.includes('API key not valid')) {
            throw new Error('Invalid API key. Please check your environment variables.');
        }
        throw error;
    }
}

export async function generateQuestions(prompt) {
    return safeApiCall(async () => {
        const formattingPrompt = `${prompt}

Generate 10 multiple choice questions with 4 options each.
IMPORTANT: Format each question exactly like this example, with no asterisks or other formatting:

1. What is your favorite color?
a) Red
b) Blue
c) Green
d) Yellow

2. What is your preferred activity?
a) Reading
b) Sports
c) Music
d) Art

Use this exact format:
- Start each question with a number and period
- Each option starts with a lowercase letter and closing parenthesis
- No asterisks, no bold, no special characters
- One blank line between questions`;

        const result = await model.generateContent(formattingPrompt);
        return parseQuestions(result.response.text());
    });
}

export async function generateAnalysis(prompt, answers, interactionCount) {
    try {
        const result = await model.generateContent(prompt + "\n\n" + "Analyze the following answers and provide a detailed personality analysis:\n" + answers.join("\n"));
        const analysis = result.response.text();
        
        return {
            analysis,
            remainingInteractions: 3 - interactionCount,
            success: true
        };
    } catch (error) {
        console.error("Error generating analysis:", error);
        throw new Error("Failed to generate analysis. Please try again.");
    }
}

export async function generateFollowUp(previousAnalysis, question, interactionCount) {
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
        const answer = result.response.text();

        if (!answer || answer.trim().length === 0) {
            throw new Error("Failed to generate a valid response");
        }

        return {
            answer,
            remainingInteractions: 3 - interactionCount,
            success: true
        };
    } catch (error) {
        console.error("Error in follow-up response:", error);
        throw new Error("Failed to generate follow-up response. Please try again.");
    }
}

function parseQuestions(rawText) {
    try {
        const questions = [];
        // Split by double newline to separate questions
        const questionBlocks = rawText.split('\n\n');
        
        for (const block of questionBlocks) {
            if (!block.trim()) continue;
            
            const lines = block.split('\n').map(line => line.trim());
            // Match question line (e.g., "1. What is your...")
            const questionMatch = lines[0].match(/^\d+\.\s*(.+)/);
            
            if (questionMatch) {
                const questionObj = {
                    question: questionMatch[1].trim(),
                    options: []
                };
                
                // Process the next 4 lines for options
                for (let i = 1; i < lines.length; i++) {
                    const optionMatch = lines[i].match(/^[a-d]\)\s+(.+)/);
                    if (optionMatch) {
                        questionObj.options.push(optionMatch[1].trim());
                    }
                }
                
                // Only add if we have exactly 4 options
                if (questionObj.options.length === 4) {
                    questions.push(questionObj);
                }
            }
        }

        if (questions.length === 0) {
            throw new Error("No valid questions were generated. Please try again.");
        }

        // Validate we have the correct number of questions
        if (questions.length !== 10) {
            console.log(`Generated ${questions.length} questions instead of 10`);
            throw new Error("Incorrect number of questions generated. Please try again.");
        }

        return questions;
    } catch (error) {
        console.error("Error parsing AI response:", error);
        throw new Error("Failed to generate properly formatted questions. Please try again.");
    }
} 