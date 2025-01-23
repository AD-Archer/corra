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
    const siteDescription = document.getElementById('site-description');
    const hideDescriptionBtn = document.getElementById('hide-description');

    function initializeUI() {
        if (startAnalysisBtn) startAnalysisBtn.disabled = true;
        if (customPromptContainer) customPromptContainer.classList.add('d-none');
        if (questionContainer) questionContainer.classList.add('d-none');
        if (howToUseSection) howToUseSection.classList.remove('d-none');
        
        // Check if user has seen the description before
        const hasSeenDescription = localStorage.getItem('hasSeenCorraDescription');
        if (hasSeenDescription && siteDescription) {
            siteDescription.classList.add('d-none');
        }

        // Auto-hide description after 10 seconds if user hasn't dismissed it
        if (!hasSeenDescription && siteDescription) {
            setTimeout(() => {
                fadeOutDescription();
            }, 10000); // 10 seconds
        }
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
        try {
            const response = await fetch('/api/prompt-types');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            populatePromptTypes(data);
        } catch (error) {
            console.error('Error fetching prompt types:', error);
            throw new Error('Failed to load analysis types. Please refresh the page.');
        }
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
            updateTheme(e.target.value);
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

        // Add exit button handlers
        const exitButton = document.getElementById('exit-button');
        const exitButtonAnalysis = document.getElementById('exit-button-analysis');

        if (exitButton) {
            exitButton.addEventListener('click', handleExit);
        }

        if (exitButtonAnalysis) {
            exitButtonAnalysis.addEventListener('click', handleExit);
        }

        // Add description hide button listener
        if (hideDescriptionBtn) {
            hideDescriptionBtn.addEventListener('click', fadeOutDescription);
        }
    }

    function updateStartButton() {
        const promptType = promptTypeSelect.value;
        const isCustom = promptType === 'CUSTOM';
        startAnalysisBtn.disabled = !promptType || (isCustom && !customPromptInput.value.trim());
    }

    async function handleStartAnalysis() {
        const promptType = promptTypeSelect.value;
        if (!promptType) {
            alert('Please select an analysis type first');
            return;
        }

        try {
            setLoading(true);
            howToUseSection.classList.add('d-none');
            
            const customPrompt = promptType === 'CUSTOM' ? customPromptInput.value.trim() : '';
            questions = await fetchQuestions(promptType, customPrompt);
            
            // Hide prompt selection after successful question fetch
            document.getElementById('prompt-selection').classList.add('d-none');
            
            // Reset state
            currentQuestionIndex = 0;
            answers = [];
            
            // Update UI
            questionContainer.classList.remove('d-none');
            analysisContainer.classList.add('d-none');
            displayCurrentQuestion();
            
        } catch (error) {
            console.error('Error starting analysis:', error);
            alert(error.message || 'Failed to load questions. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function displayCurrentQuestion() {
        if (!questions[currentQuestionIndex]) return;

        // Update progress bar and text
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
        
        progressBar.style.width = `${progressPercentage}%`;
        progressText.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;

        const questionText = document.querySelector('.question-text');
        const optionsContainer = document.querySelector('.question-options');
        
        questionText.textContent = `${currentQuestionIndex + 1}. ${questions[currentQuestionIndex].question}`;
        optionsContainer.innerHTML = '';

        // Add regular options
        questions[currentQuestionIndex].options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'btn option-btn';
            button.textContent = `${String.fromCharCode(97 + index)}) ${option}`;
            button.addEventListener('click', () => handleOptionSelect(option));
            if (answers[currentQuestionIndex] === option) {
                button.classList.add('selected');
            }
            optionsContainer.appendChild(button);
        });

        // Add custom response option
        const customButton = document.createElement('button');
        customButton.className = 'btn option-btn custom-option';
        customButton.textContent = 'Write your own response...';
        customButton.addEventListener('click', toggleCustomResponse);
        optionsContainer.appendChild(customButton);

        // Add custom response container
        const customContainer = document.createElement('div');
        customContainer.className = 'custom-response-container';
        customContainer.innerHTML = `
            <p class="custom-response-info">Share your unique perspective! Your custom response helps create a more accurate personality analysis.</p>
            <textarea 
                class="custom-response-input" 
                placeholder="Enter your custom response here..."
                maxlength="500"
            ></textarea>
        `;
        optionsContainer.appendChild(customContainer);

        // Restore custom response if it exists
        const customResponse = answers[currentQuestionIndex];
        if (customResponse && !questions[currentQuestionIndex].options.includes(customResponse)) {
            customContainer.classList.add('active');
            customContainer.querySelector('textarea').value = customResponse;
            customButton.classList.add('selected');
        }

        updateNavigationButtons();
    }

    function toggleCustomResponse(event) {
        const button = event.target;
        const container = button.parentElement.querySelector('.custom-response-container');
        const textarea = container.querySelector('textarea');
        const allOptions = document.querySelectorAll('.option-btn');
        
        allOptions.forEach(opt => opt.classList.remove('selected'));
        button.classList.add('selected');
        container.classList.add('active');
        textarea.focus();

        // Add input handler for custom response
        textarea.oninput = (e) => {
            const sanitizedValue = sanitizeInput(e.target.value);
            answers[currentQuestionIndex] = sanitizedValue;
        };
    }

    function sanitizeInput(input) {
        // Allow spaces and normal text input while preventing harmful content
        return input
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/javascript:|data:/gi, '') // Remove potential script/data URIs
            .replace(/[^\w\s.,!?'"()\-:;@#$%&*+=\s]/g, '') // Note the \s at both ends
            .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
            .slice(0, 500); // Limit length
    }

    // Update handleOptionSelect to handle custom responses
    function handleOptionSelect(option) {
        const customContainer = document.querySelector('.custom-response-container');
        if (customContainer) {
            customContainer.classList.remove('active');
        }
        
        const allOptions = document.querySelectorAll('.option-btn');
        allOptions.forEach(btn => btn.classList.remove('selected'));
        
        const selectedButton = Array.from(document.querySelectorAll('.option-btn'))
            .find(btn => btn.textContent.includes(option));
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }
        
        answers[currentQuestionIndex] = option;
    }

    function updateNavigationButtons() {
        const prevButton = document.getElementById('prev-question');
        const nextButton = document.getElementById('next-question');
        
        prevButton.disabled = currentQuestionIndex === 0;
        nextButton.textContent = currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next';
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
            analysisText.innerHTML = result.analysis;
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
        document.getElementById('prompt-selection').classList.remove('d-none');
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
        
        // Reset follow-up section
        if (followUpInput) {
            followUpInput.value = '';
        }
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

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    alert('Rate limit exceeded. Please try again later.');
                    followUpInput.disabled = true;
                    submitFollowUp.disabled = true;
                    return;
                }
                throw new Error(result.error || 'Failed to get follow-up response');
            }
            
            // Update the analysis text with the follow-up response
            analysisText.innerHTML += `<h2>Follow-up Question</h2><p>${question}</p>${result.answer}`;
            
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
            alert(error.message || 'Failed to get follow-up response. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function handleExit() {
        if (confirm('Are you sure you want to exit? All progress will be lost.')) {
            window.location.reload();
        }
    }

    function fadeOutDescription() {
        if (siteDescription && !siteDescription.classList.contains('d-none')) {
            siteDescription.classList.add('fade-out');
            setTimeout(() => {
                siteDescription.classList.add('d-none');
                localStorage.setItem('hasSeenCorraDescription', 'true');
            }, 500);
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

function updateTheme(promptType) {
    document.querySelector('.theme-container').dataset.theme = promptType;
}