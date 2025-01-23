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

        const formattingPrompt = `Based on this context: "${prompt}"

You must generate exactly 10 multiple choice questions. Each question must follow this exact format:

1. If you discovered a close friend was living a double life, what would be your first reaction?
a) Confront them immediately to understand their reasons
b) Quietly gather more information before deciding what to do
c) Distance yourself to protect your own well-being
d) Support them while encouraging honesty

2. In a parallel universe where you could choose your own superpower, which would align most with your personality?
a) The ability to feel and heal others' emotional pain
b) The power to see all possible outcomes before making decisions
c) The capability to understand and speak all languages
d) The power to turn back time to fix past mistakes

STRICT REQUIREMENTS:
- Generate EXACTLY 10 questions
- Each question MUST be numbered (1-10)
- Each question MUST have EXACTLY 4 options labeled a) b) c) d)
- One blank line between questions
- No additional text or explanations
- No markdown formatting

Begin your response with question 1 and end with question 10:`;

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
            
            // Pre-validate the response format
            const questionCount = (response.match(/^\d+\./gm) || []).length;
            if (questionCount !== 10) {
                console.error(`Generated ${questionCount} questions instead of 10`);
                throw new Error('Incorrect number of questions generated. Please try again.');
            }

            const questions = parseQuestions(response);
            
            // Validate each question has exactly 4 options
            const invalidQuestions = questions.filter(q => q.options.length !== 4);
            if (invalidQuestions.length > 0) {
                console.error('Questions with incorrect number of options:', invalidQuestions);
                throw new Error('Some questions have an incorrect number of options. Please try again.');
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

Based on the answers provided, create an engaging and imaginative analysis. Feel free to be creative while following this general structure:

<h2>Core Traits</h2>
(Describe their key personality traits with specific examples and metaphors)

<h2>Decision-Making Style</h2>
(Explain how they approach challenges and make choices, using relevant scenarios)

<h2>Key Strengths</h2>
(Highlight their unique abilities and positive qualities, relating them to their chosen theme)

<h2>Growth Areas</h2>
(Suggest potential areas for development in an encouraging way)

For themed analyses (like Power Rangers, Pokemon, etc.), feel free to:
- Use theme-specific terminology and references
- Draw parallels between their traits and themed elements
- Include relevant lore or background information
- Add creative descriptions and explanations
- Make connections to specific characters or elements from the theme

Make it engaging and fun while keeping the HTML formatting for readability.
${answers.join("\n")}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: analysisPrompt }]}],
            generationConfig: {
                temperature: 0.9,  // Increased for more creativity
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2048,
            }
        });

        const analysis = result.response.text()
            .trim()
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#{2}\s/g, '<h2>')
            .replace(/\n(?=<h2>)/g, '</h2>\n')
            .replace(/^(?!<h2>|-)(.*?)$/gm, '<p>$1</p>');
        
        return {
            analysis,
            remainingInteractions: 3 - interactionCount,
            success: true
        };
    } catch (error) {
        console.error("Error generating analysis:", error);
        if (error.message.includes('Internal Server Error')) {
            throw new Error('Service temporarily unavailable. Please try again.');
        }
        throw new Error("Failed to generate analysis. Please try again.");
    }
}

export async function generateFollowUp(previousAnalysis, question, interactionCount) {
    const followUpPrompt = `Previous Analysis:
${previousAnalysis}

Create an engaging and imaginative response to this follow-up question:
${question}

Feel free to:
- Use creative analogies and examples
- Reference specific elements from the analysis theme
- Add relevant details and connections
- Be descriptive and entertaining
- Include theme-specific terminology

Keep your response focused on the question while maintaining the fun and engaging style.
Format with clear sections but feel free to be creative with the content.`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: followUpPrompt }]}],
            generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2048,
            }
        });

        const answer = result.response.text()
            .trim()
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#{2}\s/g, '<h2>')
            .replace(/\n(?=<h2>)/g, '</h2>\n')
            .replace(/^(?!<h2>|-)(.*?)$/gm, '<p>$1</p>');

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