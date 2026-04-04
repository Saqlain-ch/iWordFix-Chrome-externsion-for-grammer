// DOM elements
const modelSelect = document.getElementById('modelSelect');
const openaiApiKeyInput = document.getElementById('openaiApiKey');
const deepseekApiKeyInput = document.getElementById('deepseekApiKey');
const toggleOpenaiVisibilityBtn = document.getElementById('toggleOpenaiVisibility');
const toggleDeepseekVisibilityBtn = document.getElementById('toggleDeepseekVisibility');
const saveOpenaiBtn = document.getElementById('saveOpenaiBtn');
const saveDeepseekBtn = document.getElementById('saveDeepseekBtn');
const clearOpenaiBtn = document.getElementById('clearOpenaiBtn');
const clearDeepseekBtn = document.getElementById('clearDeepseekBtn');
const statusMessage = document.getElementById('statusMessage');

// Event listeners
modelSelect.addEventListener('change', saveModelSelection);
toggleOpenaiVisibilityBtn.addEventListener('click', () => toggleApiKeyVisibility(openaiApiKeyInput, toggleOpenaiVisibilityBtn));
toggleDeepseekVisibilityBtn.addEventListener('click', () => toggleApiKeyVisibility(deepseekApiKeyInput, toggleDeepseekVisibilityBtn));
saveOpenaiBtn.addEventListener('click', () => saveApiKey('openai', openaiApiKeyInput));
saveDeepseekBtn.addEventListener('click', () => saveApiKey('deepseek', deepseekApiKeyInput));
clearOpenaiBtn.addEventListener('click', () => clearApiKey('openai', openaiApiKeyInput));
clearDeepseekBtn.addEventListener('click', () => clearApiKey('deepseek', deepseekApiKeyInput));

// Initialize settings page
document.addEventListener('DOMContentLoaded', initializeSettings);

// Initialize the settings page
async function initializeSettings() {
    try {
        // Load existing settings
        const settings = await getSettings();
        
        // Set model selection
        if (settings.selectedModel) {
            modelSelect.value = settings.selectedModel;
        }
        
        // Load existing API keys if they exist
        if (settings.openaiApiKey) {
            openaiApiKeyInput.value = settings.openaiApiKey;
        }
        if (settings.deepseekApiKey) {
            deepseekApiKeyInput.value = settings.deepseekApiKey;
        }
        

        
        // Show status if API keys are loaded
        if (settings.openaiApiKey || settings.deepseekApiKey) {
            showStatus('Settings loaded successfully.', 'success');
        }
        
    } catch (error) {
        console.error('Error initializing settings:', error);
        showStatus('Failed to load existing settings.', 'error');
    }
}



// Toggle API key visibility
function toggleApiKeyVisibility(inputElement, buttonElement) {
    const currentType = inputElement.type;
    inputElement.type = currentType === 'password' ? 'text' : 'password';
    
    // Update button icon
    const svg = buttonElement.querySelector('svg');
    if (currentType === 'password') {
        // Show eye-off icon
        svg.innerHTML = '<path d="M17.94,17.94C16.23,19.23 14.04,20 12,20C7,20 2.73,16.89 1,12C2.73,7.11 7,4 12,4C14.04,4 16.23,4.77 17.94,6.06L19.36,4.64C20.88,6.15 22,8.09 22,12C22,15.91 20.88,17.85 19.36,19.36L17.94,17.94M12,7C9.24,7 7,9.24 7,12C7,14.76 9.24,17 12,17C14.76,17 17,14.76 17,12C17,9.24 14.76,7 12,7L12,7Z"/>';
    } else {
        // Show eye icon
        svg.innerHTML = '<path d="M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>';
    }
}

// Save API key to Chrome storage
async function saveApiKey(provider, inputElement) {
    try {
        const apiKey = inputElement.value.trim();
        
        // Validate API key
        if (!apiKey) {
            showStatus('Please enter an API key.', 'error');
            return;
        }
        
        if (!apiKey.startsWith('sk-')) {
            showStatus('Invalid API key format. API keys should start with "sk-".', 'error');
            return;
        }
        
        // Save to Chrome storage
        const key = provider === 'openai' ? 'openai_api_key' : 'deepseek_api_key';
        await setApiKey(key, apiKey);
        
        // Show success message
        showStatus(`${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} API key saved successfully!`, 'success');
        
        // Clear input for security
        inputElement.value = '';
        
        // Update popup if it's open
        notifyPopupOfApiKeyChange(provider, apiKey);
        
    } catch (error) {
        console.error('Error saving API key:', error);
        showStatus('Failed to save API key. Please try again.', 'error');
    }
}

// Clear API key from Chrome storage
async function clearApiKey(provider, inputElement) {
    try {
        // Clear from Chrome storage
        const key = provider === 'openai' ? 'openai_api_key' : 'deepseek_api_key';
        await removeApiKey(key);
        
        // Clear input
        inputElement.value = '';
        
        // Show success message
        showStatus(`${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} API key cleared successfully!`, 'success');
        
        // Update popup if it's open
        notifyPopupOfApiKeyChange(provider, null);
        
    } catch (error) {
        console.error('Error clearing API key:', error);
        showStatus('Failed to clear API key. Please try again.', 'error');
    }
}

// Save model selection
async function saveModelSelection() {
    try {
        const selectedModel = modelSelect.value;
        await chrome.storage.local.set({ selected_model: selectedModel });
    } catch (error) {
        console.error('Error saving model selection:', error);
    }
}

// Get all settings from Chrome storage
async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openai_api_key', 'deepseek_api_key', 'selected_model'], (result) => {
            resolve({
                openaiApiKey: result.openai_api_key,
                deepseekApiKey: result.deepseek_api_key,
                selectedModel: result.selected_model || 'openai'
            });
        });
    });
}

// Get API key from Chrome storage
async function getApiKey(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key]);
        });
    });
}

// Set API key in Chrome storage
async function setApiKey(key, apiKey) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: apiKey }, () => {
            resolve();
        });
    });
}

// Remove API key from Chrome storage
async function removeApiKey(key) {
    return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => {
            resolve();
        });
    });
}

// Show status message
function showStatus(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Notify popup of API key change
function notifyPopupOfApiKeyChange(provider, apiKey) {
    // This will trigger the storage change listener in popup.js
    // No additional action needed as Chrome automatically notifies
    // all extension contexts of storage changes
}

// Handle Enter key in API key inputs
openaiApiKeyInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        saveApiKey('openai', openaiApiKeyInput);
    }
});

deepseekApiKeyInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        saveApiKey('deepseek', deepseekApiKeyInput);
    }
});

// Handle Ctrl/Cmd + S for saving
document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        const selectedModel = modelSelect.value;
        if (selectedModel === 'openai') {
            saveApiKey('openai', openaiApiKeyInput);
        } else {
            saveApiKey('deepseek', deepseekApiKeyInput);
        }
    }
});
