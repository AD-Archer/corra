import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY environment variable is missing');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
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
        if (!prompt) {
            throw new Error('Please select an analysis type first');
        }

        const formattingPrompt = `You are a personality analysis expert. Based on this context: "${prompt}"

Generate exactly 10 multiple choice questions that reveal personality traits. Format each question exactly like this, with no deviations:

1. If you discovered a close friend was living a double life, what would be your first reaction?
a) Confront them immediately to understand their reasons
b) Quietly gather more information before deciding what to do
c) Distance yourself to protect your own well-being
d) Support them while encouraging honesty

2. In a crisis situation, how do you typically respond?
a) Take immediate charge and direct others
b) Stay calm and analyze the situation methodically
c) Focus on supporting and comforting others
d) Adapt quickly and find innovative solutions

IMPORTANT FORMATTING RULES:
1. Generate exactly 10 questions
2. Each question must start with a number and period (1., 2., etc.)
3. Each question must have exactly 4 options
4. Options must be labeled a) b) c) d) with lowercase letters
5. Put one blank line between questions
6. No special characters or formatting
7. No explanatory text or additional content

Begin generating the 10 questions now:

`;

        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: formattingPrompt }]}],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.8,
                    maxOutputTokens: 2048,
                }
            });

            if (!result || !result.response) {
                throw new Error('Failed to generate questions. Please try again.');
            }

            const response = result.response.text().trim();
            
            // Validate response format before parsing
            if (!response.match(/1\./)) {
                console.error('Invalid response format:', response);
                throw new Error('Generated response is not properly formatted. Please try again.');
            }

            const questions = parseQuestions(response);

            // Additional validation
            if (!questions || questions.length !== 10) {
                console.error(`Generated ${questions?.length || 0} questions instead of 10`);
                throw new Error('Incorrect number of questions generated. Please try again.');
            }

            return questions;
        } catch (error) {
            console.error('Generation error:', error);
            if (error.message.includes('Internal Server Error')) {
                throw new Error('Service temporarily unavailable. Please try again in a moment.');
            }
            throw error;
        }
    });
}

export async function generateAnalysis(prompt, answers, interactionCount) {
    try {
        const analysisPrompt = `${prompt}

Analyze these answers and provide a clear personality analysis:

${answers.join("\n")}

Structure the response as:
1. Core Traits
2. Decision-Making Style
3. Key Strengths
4. Growth Areas

Keep the response clear and avoid special formatting.`;

        const result = await model.generateContent(analysisPrompt);
        const analysis = result.response.text().trim();
        
        return {
            analysis,
            remainingInteractions: 3 - interactionCount,
            success: true
        };
    } catch (error) {
        console.error("Error generating analysis:", error);
        if (error.message.includes('Internal Server Error')) {
            throw new Error('Service temporarily unavailable. Please try again in a moment.');
        }
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
        const questionBlocks = rawText.split('\n\n').filter(block => block.trim());
        
        for (const block of questionBlocks) {
            const lines = block.split('\n').map(line => line.trim());
            const questionMatch = lines[0].match(/^\d+\.\s*(.+)/);
            
            if (questionMatch) {
                const questionObj = {
                    question: questionMatch[1].trim(),
                    options: []
                };
                
                // Collect all options for this question
                for (const line of lines.slice(1)) {
                    const optionMatch = line.match(/^[a-d]\)\s+(.+)/);
                    if (optionMatch) {
                        questionObj.options.push(optionMatch[1].trim());
                    }
                }
                
                // Only add complete questions
                if (questionObj.options.length === 4) {
                    questions.push(questionObj);
                } else {
                    console.error('Invalid options count for question:', questionObj);
                }
            }
        }

        if (questions.length === 0) {
            throw new Error('No valid questions were generated. Please try again.');
        }

        return questions;
    } catch (error) {
        console.error('Error parsing questions:', error);
        throw new Error('Failed to parse generated questions. Please try again.');
    }
} 