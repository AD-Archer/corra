# AI Personality Quiz Generator

A web application that generates personalized quizzes and analyses using Google's Gemini Pro AI model. The app creates custom multiple-choice questions based on different themes and provides detailed personality analyses.

## Features

- Multiple quiz types including:
  - Bleach Zanpakuto Analysis
  - Personality Analysis
  - Avatar Element Analysis
  - Super Power Analysis
  - Princess Power Analysis
  - Custom Quiz Option

- Interactive question-answer format
- Detailed AI-generated analysis
- Follow-up questions with structured responses
- Limited to 3 follow-up questions per session

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Create a .env file in the root directory with:
   ```
   GOOGLE_API_KEY=your_gemini_pro_api_key
   ```

4. Start the server:
   ```
   npm start
   ```

5. Access the application at http://localhost:3000

## Technical Requirements

- Node.js
- Express.js
- Google Generative AI (Gemini Pro)
- Modern web browser
- Internet connection

## Environment Variables

GOOGLE_API_KEY: Your Google Gemini API key (required)

## API Endpoints

- GET /api/prompt-types: Returns available quiz types
- GET /api/questions: Generates quiz questions
- POST /api/analyze: Analyzes quiz answers
- POST /api/follow-up: Handles follow-up questions

## Error Handling

The application includes comprehensive error handling for:
- Invalid API responses
- Malformed questions
- Empty responses
- Server errors

## Limitations

- 3 follow-up questions per session
- Requires valid Google Gemini Pro API key
- Internet connection required for AI functionality

## License

MIT License

## Support

For issues or questions, please open an issue in the repository. 