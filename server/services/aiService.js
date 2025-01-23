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

        const formattingPrompt = `You are analyzing personality traits based on this context: "${prompt}"

YOUR TASK: Generate exactly 10 multiple choice questions. No more, no less.

Here's an example of the required format:
1. In a critical moment of battle, you discover a powerful but dangerous technique. What do you do?
a) Master it secretly to protect others
b) Share the knowledge with trusted allies
c) Seal it away as too dangerous
d) Study it carefully to understand its limits

Required question types (use all of these):
1. Moral/ethical choices
2. Personal preferences
3. Emotional reactions
4. Problem-solving
5. Social interactions
6. Leadership style
7. Creative thinking
8. Life priorities
9. Risk assessment
10. Conflict handling

FORMAT RULES:
- Start each question with a number (1-10)
- Each question MUST have exactly 4 options (a,b,c,d)
- Put one blank line between questions
- No extra text or explanations

START YOUR RESPONSE WITH QUESTION 1 AND END WITH QUESTION 10.`;

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: formattingPrompt }]}],
                    generationConfig: {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.9,
                        maxOutputTokens: 2048,
                    }
                });

                if (!result || !result.response) {
                    throw new Error('Failed to generate questions');
                }

                const response = result.response.text().trim();
                
                // Pre-validate the response
                const questionCount = (response.match(/^\d+\./gm) || []).length;
                if (questionCount !== 10) {
                    console.log(`Attempt ${attempts + 1}: Generated ${questionCount} questions instead of 10`);
                    attempts++;
                    continue;
                }

                const questions = parseQuestions(response);
                
                // Validate question count and options
                if (questions.length !== 10) {
                    console.log(`Attempt ${attempts + 1}: Parsed ${questions.length} valid questions`);
                    attempts++;
                    continue;
                }

                const invalidQuestions = questions.filter(q => q.options.length !== 4);
                if (invalidQuestions.length > 0) {
                    console.log(`Attempt ${attempts + 1}: Found questions with wrong number of options`);
                    attempts++;
                    continue;
                }

                // Check diversity less strictly
                const diversity = checkQuestionDiversity(questions);
                if (!diversity.diverse) {
                    console.log(`Attempt ${attempts + 1}: ${diversity.reason}`);
                    attempts++;
                    continue;
                }

                return questions;

            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed:`, error);
                if (attempts >= maxAttempts - 1) {
                    throw new Error('Failed to generate valid questions after multiple attempts');
                }
                attempts++;
            }
        }

        throw new Error('Unable to generate valid questions. Please try again.');
    });
}

function checkQuestionDiversity(questions) {
    // Convert questions to lowercase for comparison
    const questionTexts = questions.map(q => q.question.toLowerCase());
    
    // Check for repeated significant words (excluding common words)
    const commonWords = new Set(['what', 'when', 'how', 'why', 'would', 'your', 'you', 'are', 'the', 'and', 'but', 'for', 'this', 'that', 'with', 'from']);
    const wordCounts = {};
    
    questionTexts.forEach(text => {
        const words = text.match(/\b\w+\b/g) || [];
        words.forEach(word => {
            if (word.length > 3 && !commonWords.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
    });

    const repeatedWords = Object.entries(wordCounts)
        .filter(([_, count]) => count > 3)  // Allow more repetition
        .map(([word]) => word);

    if (repeatedWords.length > 5) {  // Allow more repeated words
        return {
            diverse: false,
            reason: `Too many repeated words: ${repeatedWords.join(', ')}`
        };
    }

    return { diverse: true };
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

For themed analyses (like Power Rangers, Pokemon, Bleach, etc.), feel free to:
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