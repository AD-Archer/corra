document.addEventListener('DOMContentLoaded', () => {
    // State management
    let questions = [];
    let answers = [];
    let currentQuestionIndex = 0;
    let previousAnalysis = '';
    let interactionCount = 0;

    // DOM Elements
    const promptTypeSelect = document.getElementById('prompt-type');
    const customPromptContainer = document.getElementById('custom-prompt-container');
    const customPromptInput = document.getElementById('custom-prompt');
    const startAnalysisBtn = document.getElementById('start-analysis');
    const questionContainer = document.getElementById('question-container');
    const analysisContainer = document.getElementById('analysis-container');
    const loadingContainer = document.getElementById('loading-container');
    const analysisText = document.getElementById('analysis-text');
    const followUpInput = document.getElementById('follow-up-input');
    const submitFollowUp = document.getElementById('submit-follow-up');
    const remainingInteractions = document.getElementById('remaining-interactions');
    const restartBtn = document.getElementById('restart-btn');
    const howToUseSection = document.getElementById('how-to-use');

    function initializeUI() {
        if (startAnalysisBtn) startAnalysisBtn.disabled = true;
        if (customPromptContainer) customPromptContainer.classList.add('d-none');
        if (questionContainer) questionContainer.classList.add('d-none');
        if (howToUseSection) howToUseSection.classList.remove('d-none');
    }

    function setLoading(isLoading) {
        if (loadingContainer) {
            loadingContainer.classList.toggle('d-none', !isLoading);
        }
    }

    // Initialize
    async function initialize() {
        try {
            setLoading(true);
            await fetchPromptTypes();
            setupEventListeners();
            initializeUI();
        } catch (error) {
            console.error('Error initializing:', error);
            alert('Failed to initialize. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }

    // Fetch prompt types
    async function fetchPromptTypes() {
        const response = await fetch('/api/prompt-types');
        const data = await response.json();
        populatePromptTypes(data);
    }

    // Populate prompt type select
    function populatePromptTypes(types) {
        promptTypeSelect.innerHTML = '<option value="">Select an analysis type...</option>';
        Object.entries(types).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value.title;
            promptTypeSelect.appendChild(option);
        });
    }

    function setupEventListeners() {
        // Handle prompt type selection
        promptTypeSelect.addEventListener('change', (e) => {
            const isCustom = e.target.value === 'CUSTOM';
            customPromptContainer.classList.toggle('d-none', !isCustom);
            updateStartButton();
        });

        // Handle custom prompt input
        customPromptInput?.addEventListener('input', () => {
            updateStartButton();
        });

        // Start analysis button
        startAnalysisBtn.addEventListener('click', handleStartAnalysis);

        // Navigation buttons
        const prevButton = document.getElementById('prev-question');
        const nextButton = document.getElementById('next-question');

        if (prevButton) {
            prevButton.addEventListener('click', handlePrevQuestion);
        }

        if (nextButton) {
            nextButton.addEventListener('click', handleNextQuestion);
        }

        // Restart button
        if (restartBtn) {
            restartBtn.addEventListener('click', handleRestart);
        }

        // Follow-up question submission
        if (submitFollowUp) {
            submitFollowUp.addEventListener('click', handleFollowUpSubmission);
        }
    }

    function updateStartButton() {
        const promptType = promptTypeSelect.value;
        const isCustom = promptType === 'CUSTOM';
        startAnalysisBtn.disabled = !promptType || (isCustom && !customPromptInput.value.trim());
    }

    async function handleStartAnalysis() {
        const promptType = promptTypeSelect.value;
        if (!promptType) return;

        try {
            setLoading(true);
            howToUseSection.classList.add('d-none');
            
            const customPrompt = promptType === 'CUSTOM' ? customPromptInput.value.trim() : '';
            questions = await fetchQuestions(promptType, customPrompt);
            
            // Reset state
            currentQuestionIndex = 0;
            answers = [];
            
            // Update UI
            questionContainer.classList.remove('d-none');
            analysisContainer.classList.add('d-none');
            displayCurrentQuestion();
            
        } catch (error) {
            console.error('Error starting analysis:', error);
            alert('Failed to load questions. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function displayCurrentQuestion() {
        if (!questions.length) return;

        const question = questions[currentQuestionIndex];
        const questionText = questionContainer.querySelector('.question-text');
        const optionsContainer = questionContainer.querySelector('.question-options');
        const prevButton = document.getElementById('prev-question');
        const nextButton = document.getElementById('next-question');
        
        // Update question text
        questionText.textContent = question.question;
        
        // Clear and rebuild options
        optionsContainer.innerHTML = '';
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'btn option-btn';
            if (answers[currentQuestionIndex] === option) {
                button.classList.add('selected');
            }
            button.textContent = option;
            button.addEventListener('click', () => selectOption(index));
            optionsContainer.appendChild(button);
        });

        // Update navigation buttons
        prevButton.disabled = currentQuestionIndex === 0;
        nextButton.textContent = currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next';
    }

    function selectOption(optionIndex) {
        answers[currentQuestionIndex] = questions[currentQuestionIndex].options[optionIndex];
        
        // Update UI to show selected option
        const optionButtons = questionContainer.querySelectorAll('.option-btn');
        optionButtons.forEach((button, index) => {
            button.classList.toggle('selected', index === optionIndex);
        });
    }

    function handlePrevQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayCurrentQuestion();
        }
    }

    function handleNextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            // Only proceed if an answer is selected
            if (!answers[currentQuestionIndex]) {
                alert('Please select an answer before proceeding.');
                return;
            }
            currentQuestionIndex++;
            displayCurrentQuestion();
        } else {
            // Handle submission of final question
            if (!answers[currentQuestionIndex]) {
                alert('Please select an answer before submitting.');
                return;
            }
            handleSubmitAnswers();
        }
    }

    async function handleSubmitAnswers() {
        try {
            setLoading(true);
            const promptType = promptTypeSelect.value;
            const customPrompt = promptType === 'CUSTOM' ? customPromptInput.value.trim() : '';

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    answers,
                    promptType,
                    customPrompt,
                    interactionCount
                })
            });

            if (!response.ok) {
                throw new Error('Failed to analyze answers');
            }

            const result = await response.json();
            previousAnalysis = result.analysis;
            
            // Update UI
            questionContainer.classList.add('d-none');
            analysisContainer.classList.remove('d-none');
            analysisText.textContent = result.analysis;
            remainingInteractions.textContent = result.remainingInteractions;

        } catch (error) {
            console.error('Error submitting answers:', error);
            alert('Failed to analyze answers. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Fetch questions from the server
    async function fetchQuestions(promptType, customPrompt = '') {
        try {
            const params = new URLSearchParams({
                promptType: promptType,
                ...(customPrompt && { customPrompt })
            });

            const response = await fetch(`/api/questions?${params}`);
            if (!response.ok) {
                throw new Error(await response.text());
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching questions:', error);
            throw error;
        }
    }

    function handleRestart() {
        // Reset state
        questions = [];
        answers = [];
        currentQuestionIndex = 0;
        previousAnalysis = '';
        
        // Reset UI
        questionContainer.classList.add('d-none');
        analysisContainer.classList.add('d-none');
        howToUseSection.classList.remove('d-none');
        
        // Reset form
        promptTypeSelect.value = '';
        if (customPromptInput) {
            customPromptInput.value = '';
        }
        customPromptContainer.classList.add('d-none');
        startAnalysisBtn.disabled = true;
    }

    async function handleFollowUpSubmission() {
        const question = followUpInput.value.trim();
        
        if (!question) {
            alert('Please enter a follow-up question.');
            return;
        }

        try {
            setLoading(true);
            
            const response = await fetch('/api/follow-up', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question,
                    previousAnalysis,
                    interactionCount
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get follow-up response');
            }

            const result = await response.json();
            
            // Update the analysis text with the follow-up response
            analysisText.textContent += '\n\nFollow-up Question:\n' + question + '\n\nResponse:\n' + result.answer;
            
            // Update remaining interactions
            interactionCount++;
            remainingInteractions.textContent = result.remainingInteractions;
            
            // Clear the input
            followUpInput.value = '';
            
            // Disable follow-up if no more interactions left
            if (result.remainingInteractions <= 0) {
                followUpInput.disabled = true;
                submitFollowUp.disabled = true;
            }

        } catch (error) {
            console.error('Error submitting follow-up:', error);
            alert('Failed to get follow-up response. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Initialize the application
    initialize();
});

// Handle prompt type selection
if (promptTypeSelect) {
    promptTypeSelect.addEventListener('change', (e) => {
        console.log('Selected Prompt Type:', e.target.value);
        const isCustom = e.target.value === 'CUSTOM';
        
        if (customPromptContainer) {
            customPromptContainer.classList.toggle('d-none', !isCustom);
        }
        
        if (startAnalysisBtn) {
            startAnalysisBtn.disabled = !e.target.value || (isCustom && !customPromptInput?.value);
        }
    });
}

// Handle custom prompt input
if (customPromptInput) {
    customPromptInput.addEventListener('input', (e) => {
        if (startAnalysisBtn && promptTypeSelect) {
            startAnalysisBtn.disabled = !e.target.value && promptTypeSelect.value === 'CUSTOM';
        }
    });
}

// Start analysis button handler
if (startAnalysisBtn) {
    startAnalysisBtn.addEventListener('click', async () => {
        try {
            const promptType = promptTypeSelect?.value;
            if (!promptType) return;

            console.log('Starting analysis for type:', promptType);
            setLoading(true);
            
            if (howToUseSection) {
                howToUseSection.classList.add('d-none');
            }

            const customPrompt = promptType === 'CUSTOM' ? customPromptInput?.value : '';
            console.log('Fetching questions for prompt type:', promptType);
            
            questions = await fetchQuestions(promptType, customPrompt);
            currentQuestionIndex = 0;
            answers = [];
            
            displayCurrentQuestion();
            
        } catch (error) {
            console.error('Error starting analysis:', error);
            // Show error message to user
        } finally {
            setLoading(false);
        }
    });
}