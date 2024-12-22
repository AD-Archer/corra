document.addEventListener('DOMContentLoaded', () => {
    // State management
    let questions = [];
    let answers = [];
    let promptTypes = {};
    let selectedPromptType = '';
    let customPrompt = '';
    let previousAnalysis = '';
    let interactionCount = 0;
    let currentQuestionIndex = 0;

    // DOM Elements
    const promptSelection = document.getElementById('prompt-selection');
    const promptTypeSelect = document.getElementById('prompt-type');
    const customPromptContainer = document.getElementById('custom-prompt-container');
    const customPromptInput = document.getElementById('custom-prompt');
    const startAnalysisBtn = document.getElementById('start-analysis');
    const questionContainer = document.getElementById('question-container');
    const questionsList = document.getElementById('questions-list');
    const analysisContainer = document.getElementById('analysis-container');
    const loadingContainer = document.getElementById('loading-container');
    const analysisText = document.getElementById('analysis-text');
    const followUpInput = document.getElementById('follow-up-input');
    const submitFollowUp = document.getElementById('submit-follow-up');
    const remainingInteractions = document.getElementById('remaining-interactions');
    const restartBtn = document.getElementById('restart-btn');
    const submitAnswersBtn = document.getElementById('submit-answers');

    // Initialize
    async function initialize() {
        try {
            loadingContainer.classList.remove('d-none');
            await fetchPromptTypes();
            startAnalysisBtn.disabled = false;
        } catch (error) {
            console.error('Error initializing:', error);
            alert('Failed to initialize. Please refresh the page.');
        } finally {
            loadingContainer.classList.add('d-none');
        }
    }

    // Fetch prompt types
    async function fetchPromptTypes() {
        try {
            const response = await fetch('/api/prompt-types');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data || Object.keys(data).length === 0) {
                throw new Error('No prompt types received');
            }

            promptTypes = data;
            populatePromptTypes();
        } catch (error) {
            console.error('Error fetching prompt types:', error);
            alert('Failed to load prompt types: ' + error.message);
        }
    }

    // Populate prompt type select
    function populatePromptTypes() {
        promptTypeSelect.innerHTML = '<option value="">Select an analysis type...</option>';
        Object.entries(promptTypes).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value.title;
            promptTypeSelect.appendChild(option);
        });
    }

    // Set selected prompt type
    promptTypeSelect.addEventListener('change', (event) => {
        selectedPromptType = event.target.value;
        console.log('Selected Prompt Type:', selectedPromptType);
    });

    // Start analysis button click
    startAnalysisBtn.addEventListener('click', async () => {
        console.log('Starting analysis for type:', selectedPromptType);

        if (!selectedPromptType) {
            alert('Please select an analysis type.');
            return;
        }

        if (selectedPromptType === 'CUSTOM' && !customPromptInput.value.trim()) {
            alert('Please enter a custom prompt.');
            return;
        }

        try {
            startAnalysisBtn.disabled = true;
            loadingContainer.classList.remove('d-none');
            customPrompt = customPromptInput.value.trim();

            document.getElementById('how-to-use').classList.add('d-none');

            switch (selectedPromptType) {
                case 'PERSONALITY_ANALYSIS':
                case 'BANKAI_SHIKAI':
                case 'AVATAR_ELEMENT':
                case 'SUPER_POWER':
                case 'PRINCESS_POWER':
                    await fetchQuestions();
                    break;
                case 'CUSTOM':
                    // No specific action needed for custom prompt, questions are not fetched
                    break;
                default:
                    alert('Invalid analysis type selected.');
                    break;
            }

            promptSelection.classList.add('d-none');
            questionContainer.classList.remove('d-none');
        } catch (error) {
            console.error('Error starting analysis:', error);
            alert('Failed to load questions. Please try again.');
            startAnalysisBtn.disabled = false;
            loadingContainer.classList.add('d-none');
        }
    });

    // Fetch questions
    async function fetchQuestions() {
        try {
            loadingContainer.classList.remove('d-none');
            console.log('Fetching questions for prompt type:', selectedPromptType);
            
            const response = await fetch(`/api/questions?promptType=${selectedPromptType}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            questions = data;
            currentQuestionIndex = 0; // Reset to the first question
            displayQuestion(); // Display the first question
        } catch (error) {
            console.error('Error fetching questions:', error);
            alert('Failed to load questions. Please try again.');
        } finally {
            loadingContainer.classList.add('d-none');
        }
    }

    // Display questions
    function displayQuestion() {
        if (currentQuestionIndex < questions.length) {
            const questionData = questions[currentQuestionIndex];
            questionsList.innerHTML = ''; // Clear previous questions

            const questionDiv = document.createElement('div');
            questionDiv.className = 'mb-4';

            // Create the question text
            const questionText = document.createElement('div');
            questionText.className = 'question-text mb-4';
            questionText.textContent = `${currentQuestionIndex + 1}. ${questionData.question}`;

            // Create an input field for the user's answer
            const answerInput = document.createElement('input');
            answerInput.type = 'text';
            answerInput.className = 'form-control question-answer';
            answerInput.placeholder = 'Feel free to type or edit your answer here...';

            // Create the options container
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'question-options';

            // Add each option as a button
            questionData.options.forEach((option) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'option-btn';
                button.textContent = option;
                button.addEventListener('click', () => {
                    answerInput.value = option; // Set the input value to the selected option
                    nextBtn.disabled = false; // Enable the Next button when an option is selected
                });
                optionsDiv.appendChild(button);
            });

            // Create navigation buttons
            const navButtons = document.createElement('div');
            navButtons.className = 'd-flex justify-content-between mt-4';
            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-primary';
            nextBtn.id = 'next-btn';
            nextBtn.textContent = currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next';
            nextBtn.disabled = true; // Initially disabled

            nextBtn.addEventListener('click', handleNext); // Attach event listener

            navButtons.innerHTML = `
                <button class="btn btn-secondary" id="back-btn" ${currentQuestionIndex === 0 ? 'disabled' : ''}>Back</button>
                <button class="btn btn-secondary" id="end-early-btn">End Early</button>
            `;
            navButtons.appendChild(nextBtn); // Append the Next button

            // Assemble the question container
            questionDiv.appendChild(questionText);
            questionDiv.appendChild(answerInput); // Add the input field
            questionDiv.appendChild(optionsDiv);
            questionDiv.appendChild(navButtons);
            questionsList.appendChild(questionDiv);

            // Update progress bar
            const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
            document.getElementById('progress-bar').style.width = `${progress}%`;

            // Add event listeners for navigation buttons
            document.getElementById('back-btn').addEventListener('click', handleBack);
            document.getElementById('end-early-btn').addEventListener('click', handleEndEarly);

            // Enable Next button if there's an answer
            answerInput.addEventListener('input', () => {
                nextBtn.disabled = !answerInput.value.trim(); // Enable if there's input
            });

            // Focus on the answer input field for better user experience
            answerInput.focus();
        }
    }

    // Handle Back button
    function handleBack() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
        }
    }

    // Handle Next button
    function handleNext() {
        const answerInput = document.querySelector('.question-answer');
        if (!answerInput.value) {
            alert('Please provide an answer before proceeding.');
            return;
        }

        answers[currentQuestionIndex] = answerInput.value; // Save the answer
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        } else {
            submitAnalysis(); // If it's the last question, submit the answers
        }
    }

    // Handle End Early
    function handleEndEarly() {
        const answerInput = document.querySelector('.question-answer');
        answers[currentQuestionIndex] = answerInput.value; // Save the answer
        submitAnalysis(); // Submit the answers immediately
    }

    // Function to submit answers for analysis
    async function submitAnalysis() {
        try {
            loadingContainer.classList.remove('d-none');
            
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers,
                    promptType: selectedPromptType,
                    customPrompt,
                    interactionCount
                })
            });

            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            previousAnalysis = data.analysis;
            analysisText.textContent = data.analysis;
            remainingInteractions.textContent = data.remainingInteractions;

            // Hide the question container when analysis is displayed
            questionContainer.classList.add('d-none'); // Hide questions div

            loadingContainer.classList.add('d-none');
            analysisContainer.classList.remove('d-none');
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            loadingContainer.classList.add('d-none');
        }
    }

    // Follow-up question submission
    submitFollowUp.addEventListener('click', async () => {
        const followUpQuestion = followUpInput.value.trim();
        if (!followUpQuestion) {
            alert('Please enter a follow-up question.');
            return;
        }

        try {
            loadingContainer.classList.remove('d-none');
            const response = await fetch('/api/follow-up', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: followUpQuestion,
                    previousAnalysis: previousAnalysis, // Ensure this variable holds the previous analysis
                    interactionCount: interactionCount
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Display the answer to the follow-up question in the analysis box
            analysisText.textContent += `\nFollow-Up Answer: ${data.answer}`; // Append the follow-up answer
            followUpInput.value = ''; // Clear the input after submission
        } catch (error) {
            console.error('Error submitting follow-up question:', error);
            alert('Failed to submit follow-up question. Please try again.');
        } finally {
            loadingContainer.classList.add('d-none');
        }
    });

    initialize();
});