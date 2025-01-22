export const PROMPT_TYPES = {
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
    },
    CUSTOM: {
        title: "Custom Quiz",
        description: "Create your own custom quiz with a specific theme.",
        systemPrompt: "You are an expert quiz creator. Generate questions based on the user's custom prompt."
    }
};

// Helper function to validate prompt type
export function isValidPromptType(type) {
    return Object.keys(PROMPT_TYPES).includes(type);
}

// Helper function to get system prompt
export function getSystemPrompt(type) {
    return PROMPT_TYPES[type]?.systemPrompt;
} 