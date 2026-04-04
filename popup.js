// DOM elements
const settingsBtn = document.getElementById('settingsBtn');
const promptInput = document.getElementById('promptInput');
const includeEmailCheckbox = document.getElementById('includeEmail');
const generateBtn = document.getElementById('generateBtn');
const responseSection = document.getElementById('responseSection');
const responseOutput = document.getElementById('responseOutput');
const copyBtn = document.getElementById('copyBtn');
const useInReplyBtn = document.getElementById('useInReplyBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');

// Initialize popup
document.addEventListener('DOMContentLoaded', initializePopup);

// Initialize the popup
async function initializePopup() {
    try {
        // Check if API key exists for the selected model
        const { apiKey, selectedModel } = await getApiKey();
        if (!apiKey) {
            showError(`Please set your ${selectedModel === 'openai' ? 'OpenAI' : 'DeepSeek'} API key in settings first.`);
            generateBtn.disabled = true;
        }
        
        // Set up event listeners after DOM is loaded
        settingsBtn.addEventListener('click', openSettings);
        generateBtn.addEventListener('click', generateResponse);
        copyBtn.addEventListener('click', copyResponse);
        useInReplyBtn.addEventListener('click', useInReply);
        
        // Check if we're on Gmail and show/hide email context checkbox
        await checkGmailContext();
        
        // Update instructions based on current website
        await updateInstructions();
        
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Failed to initialize. Please check your settings.');
    }
}



// Open settings page
function openSettings() {
    chrome.tabs.create({ url: 'settings.html' });
}

// Check if current tab is on Gmail and show/hide email context checkbox
async function checkGmailContext() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url) {
            const isGmail = tabs[0].url.includes('mail.google.com');
            
            if (isGmail) {
                // Show email context checkbox and related elements
                includeEmailCheckbox.style.display = 'block';
                includeEmailCheckbox.parentElement.style.display = 'block';
            } else {
                // Hide email context checkbox and related elements
                includeEmailCheckbox.style.display = 'none';
                includeEmailCheckbox.parentElement.style.display = 'none';
                
                // Uncheck the checkbox if it was checked
                includeEmailCheckbox.checked = false;
            }
        }
    } catch (error) {
        console.error('Error checking Gmail context:', error);
        // If there's an error, show the checkbox by default
        includeEmailCheckbox.style.display = 'block';
        includeEmailCheckbox.parentElement.style.display = 'block';
    }
}

// Update instructions based on current website
async function updateInstructions() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url) {
            const isGmail = tabs[0].url.includes('mail.google.com');
            const instructionsText = document.getElementById('instructionsText');
            
            if (isGmail) {
                instructionsText.innerHTML = `
                    <strong>📧 Email Response Mode:</strong><br>
                    Write a prompt describing how you want to respond to this email. The AI will analyze the email thread and generate a professional response on your behalf.
                `;
            } else {
                instructionsText.innerHTML = `
                    <strong>✏️ Grammar & Writing Mode:</strong><br>
                    Paste your text here for grammar correction, spelling fixes, and writing improvements. The AI will enhance your writing while maintaining your style.
                `;
            }
        }
    } catch (error) {
        console.error('Error updating instructions:', error);
        // Default instructions if there's an error
        const instructionsText = document.getElementById('instructionsText');
        instructionsText.innerHTML = `
            <strong>✏️ Writing Assistant:</strong><br>
            Enter your text or prompt for AI-powered writing assistance, grammar correction, or email response generation.
        `;
    }
}

// Get API key and model from storage
async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openai_api_key', 'deepseek_api_key', 'selected_model'], (result) => {
            const selectedModel = result.selected_model || 'openai';
            const apiKey = selectedModel === 'openai' ? result.openai_api_key : result.deepseek_api_key;
            resolve({ apiKey, selectedModel });
        });
    });
}

// Generate AI response
async function generateResponse() {
    try {
        // Validate inputs
        const prompt = promptInput.value.trim();
        if (!prompt) {
            showError('Please enter a prompt.');
            return;
        }

        const { apiKey, selectedModel } = await getApiKey();
        if (!apiKey) {
            showError(`Please set your ${selectedModel === 'openai' ? 'OpenAI' : 'DeepSeek'} API key in settings first.`);
            return;
        }

        // Show loading state
        setLoadingState(true);
        hideError();

        // Construct the full prompt
        const fullPrompt = await constructPrompt(prompt);

        // Call AI API
        const response = await callAI(apiKey, fullPrompt, selectedModel);
        
        // Display response
        displayResponse(response);
        
    } catch (error) {
        console.error('Error generating response:', error);
        showError(error.message || 'Failed to generate response. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

// Construct the full prompt based on checkbox state
async function constructPrompt(userPrompt) {
    if (includeEmailCheckbox.checked) {
        try {
            // Get email context from the current page
            const emailContext = await getEmailContext();
            return `You are helping me write an email response. Here is the email thread context:

${emailContext}

CRITICAL INSTRUCTIONS:
1. I am the person READING this email (the recipient)
2. I want you to write a response that I will send back to the person who sent me the email
3. You are writing on MY behalf, NOT on behalf of the sender
4. The sender is the person who wrote the original email to me
5. I am responding TO the sender

My specific request: ${userPrompt}

Please write a professional email response that I can send back to the sender. IMPORTANT: 
- Extract and use actual names from the email content
- Do NOT use placeholder text like "[your name]", "[sender name]", etc.
- Use the real names that appear in the email thread
- Do NOT include a subject line - just write the email body content
- Make it clear that I am responding to the sender's email`;
        } catch (error) {
            console.error('Error getting email context:', error);
            return `You are helping me write an email response. Unable to get email context from page.

CRITICAL INSTRUCTIONS:
1. I am the person READING this email (the recipient)
2. I want you to write a response that I will send back to the person who sent me the email
3. You are writing on MY behalf, NOT on behalf of the sender
4. The sender is the person who wrote the original email to me
5. I am responding TO the sender

My specific request: ${userPrompt}

Please write a professional email response that I can send back to the sender. IMPORTANT: 
- Extract and use actual names from the email content
- Do NOT use placeholder text like "[your name]", "[sender name]", etc.
- Use the real names that appear in the email thread
- Do NOT include a subject line - just write the email body content
- Make it clear that I am responding to the sender's email`;
        }
    } else {
        return `You are my grammar assistant. Your task is to correct any sentences, emails, or messages I send you. Always return only the corrected text in plain form (no bold, no quotation marks, no hyperlinks). Do not explain corrections unless I specifically ask you to. Keep the tone aligned with the style of my original message—casual if I write casually, formal if I write formally. Simply rewrite my text with proper grammar, spelling, punctuation, and clarity. Message: ${userPrompt}`;
    }
}

// Get email context from the current page
async function getEmailContext() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                reject(new Error('No active tab found'));
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: () => {
                    console.log('Starting Gmail content extraction...');
                    
                    // Debug: Log all available classes and elements
                    const allElements = document.querySelectorAll('*');
                    const classes = new Set();
                    allElements.forEach(el => {
                        if (el.className && typeof el.className === 'string') {
                            el.className.split(' ').forEach(cls => {
                                if (cls.trim()) classes.add(cls.trim());
                            });
                        }
                    });
                    console.log('Available classes:', Array.from(classes).slice(0, 50)); // Log first 50 classes
                    
                    let emailContent = '';
                    let debugInfo = '';
                    
                    // Method 1: Look for Gmail's main content area with multiple selectors
                    const selectors = [
                        '[role="main"]',
                        '.adn',
                        '.zA',
                        '.aUH',
                        '.h7',
                        '.ii',
                        '.gmail_default',
                        '[data-message-id]',
                        '.msg',
                        '.email-content',
                        '.thread-content'
                    ];
                    
                    debugInfo += `Trying selectors: ${selectors.join(', ')}\n`;
                    
                    for (let selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        debugInfo += `Selector "${selector}" found ${elements.length} elements\n`;
                        
                        if (elements.length > 0) {
                            elements.forEach((el, index) => {
                                const text = el.textContent || el.innerText;
                                if (text && text.trim().length > 20) {
                                    emailContent += `[${selector} ${index + 1}]: ${text.trim()}\n\n`;
                                }
                            });
                        }
                    }
                    
                    // Method 2: Look for any element containing email-like patterns
                    const emailPatterns = ['@', 'Subject:', 'From:', 'To:', 'Date:', 'Sent:', 'Received:'];
                    const allDivs = document.querySelectorAll('div, p, span');
                    
                    debugInfo += `\nSearching for email patterns: ${emailPatterns.join(', ')}\n`;
                    
                    const emailDivs = Array.from(allDivs).filter(div => {
                        const text = div.textContent || div.innerText;
                        return text && text.length > 30 && 
                               emailPatterns.some(pattern => text.includes(pattern));
                    });
                    
                    debugInfo += `Found ${emailDivs.length} elements with email patterns\n`;
                    
                    if (emailDivs.length > 0) {
                        emailDivs.forEach((div, index) => {
                            const text = div.textContent || div.innerText;
                            if (text && text.trim().length > 20) {
                                emailContent += `[Email Pattern ${index + 1}]: ${text.trim()}\n\n`;
                            }
                        });
                    }
                    
                    // Method 3: Look for Gmail's specific structure
                    const gmailThread = document.querySelector('[role="main"], .h7, .ii');
                    if (gmailThread) {
                        debugInfo += `\nFound Gmail thread container\n`;
                        
                        // Look for individual email messages
                        const messageSelectors = ['.adn', '.zA', '.aUH', '[data-message-id]', '.msg'];
                        messageSelectors.forEach(selector => {
                            const messages = gmailThread.querySelectorAll(selector);
                            debugInfo += `Selector "${selector}" found ${messages.length} messages\n`;
                            
                            messages.forEach((msg, index) => {
                                const text = msg.textContent || msg.innerText;
                                if (text && text.trim().length > 30) {
                                    // Try to identify email type
                                    const isReply = text.includes('On ') && text.includes('wrote:');
                                    const hasQuote = text.includes('>');
                                    const hasEmail = text.includes('@');
                                    
                                    let emailType = 'Unknown';
                                    if (isReply) emailType = 'Reply';
                                    else if (hasQuote) emailType = 'Quoted';
                                    else if (hasEmail) emailType = 'Email';
                                    
                                    emailContent += `[${emailType} Message ${index + 1}]: ${text.trim()}\n\n`;
                                }
                            });
                        });
                    }
                    
                    // Clean up and prepare final content
                    if (emailContent) {
                        // Remove excessive whitespace
                        emailContent = emailContent
                            .replace(/\s+/g, ' ')
                            .replace(/\n\s*\n/g, '\n\n')
                            .trim();
                        
                        // Limit length
                        if (emailContent.length > 3000) {
                            emailContent = emailContent.substring(0, 3000) + '... [truncated]';
                        }
                        
                        const finalContent = `DEBUG INFO:\n${debugInfo}\n\nEXTRACTED CONTENT:\n${emailContent}`;
                        console.log('Final extracted content:', finalContent);
                        return finalContent;
                    } else {
                        const noContentMessage = `DEBUG INFO:\n${debugInfo}\n\nNo email content found. Please ensure you are on a Gmail page with an email open.`;
                        console.log('No content found:', noContentMessage);
                        return noContentMessage;
                    }
                }
            }, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (result && result[0] && result[0].result) {
                    resolve(result[0].result);
                } else {
                    resolve('No email content found');
                }
            });
        });
    });
}

// Call AI API (OpenAI or DeepSeek)
async function callAI(apiKey, prompt, model) {
    if (model === 'openai') {
        return await callOpenAI(apiKey, prompt);
    } else if (model === 'deepseek') {
        return await callDeepSeek(apiKey, prompt);
    } else {
        throw new Error('Invalid model selected. Please check your settings.');
    }
}

// Call OpenAI API
async function callOpenAI(apiKey, prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
            throw new Error('Invalid OpenAI API key. Please check your settings.');
        } else if (response.status === 429) {
            throw new Error('OpenAI rate limit exceeded. Please try again later.');
        } else {
            throw new Error(errorData.error?.message || `OpenAI API request failed (${response.status})`);
        }
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
}

// Call DeepSeek API
async function callDeepSeek(apiKey, prompt) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
            throw new Error('Invalid DeepSeek API key. Please check your settings.');
        } else if (response.status === 429) {
            throw new Error('DeepSeek rate limit exceeded. Please try again later.');
        } else {
            throw new Error(errorData.error?.message || `DeepSeek API request failed (${response.status})`);
        }
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
}

// Display the AI response
function displayResponse(response) {
    responseOutput.textContent = response;
    responseSection.style.display = 'block';
    
    // Show/hide "Use in Reply" button based on context
    if (includeEmailCheckbox.checked) {
        useInReplyBtn.style.display = 'inline-block';
        useInReplyBtn.disabled = false;
    } else {
        useInReplyBtn.style.display = 'none';
    }
    
    // Scroll to response
    responseSection.scrollIntoView({ behavior: 'smooth' });
}

// Copy response to clipboard
async function copyResponse() {
    try {
        await navigator.clipboard.writeText(responseOutput.textContent);
        
        // Visual feedback
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#218838';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#28a745';
        }, 1500);
        
    } catch (error) {
        console.error('Failed to copy:', error);
        showError('Failed to copy response to clipboard.');
    }
}

// Use response in Gmail reply
async function useInReply() {
    try {
        const response = responseOutput.textContent;
        
        // Execute script in the active tab to fill Gmail reply box
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) {
            showError('No active tab found.');
            return;
        }

        // Add a small delay to ensure Gmail reply interface is fully loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: (responseText) => {
                console.log('Starting Gmail reply box insertion...');
                console.log('Response text to insert:', responseText);
                
                // Format response text for Gmail with proper HTML
                function formatResponseForGmail(text) {
                    if (!text) return '';
                    
                    // Convert line breaks to <br> tags for proper formatting
                    let formatted = text.replace(/\n/g, '<br>');
                    
                    return formatted;
                }
                
                // Try multiple selectors for Gmail reply box
                const replySelectors = [
                    'div.gmail_default',
                    'div[role="textbox"][aria-label*="Message Body"]',
                    'div[role="textbox"][aria-label*="Reply"]',
                    'div[role="textbox"][aria-label*="Compose"]',
                    'div[contenteditable="true"][role="textbox"]',
                    'div[contenteditable="true"]',
                    'div[aria-label*="Message"]',
                    'div[aria-label*="Reply"]',
                    'div[aria-label*="Compose"]',
                    'div[data-tooltip*="Compose"]',
                    'div[data-tooltip*="Reply"]'
                ];
                
                console.log('Trying selectors:', replySelectors);
                
                let replyBox = null;
                let foundSelector = null;
                
                for (let selector of replySelectors) {
                    const elements = document.querySelectorAll(selector);
                    console.log(`Selector "${selector}" found ${elements.length} elements`);
                    
                    if (elements.length > 0) {
                        // Try to find the most suitable element
                        for (let element of elements) {
                            // Check if it's actually editable and visible
                            if (element.offsetWidth > 0 && element.offsetHeight > 0 && 
                                (element.contentEditable === 'true' || element.getAttribute('role') === 'textbox')) {
                                replyBox = element;
                                foundSelector = selector;
                                console.log('Found suitable reply box:', element);
                                break;
                            }
                        }
                        if (replyBox) break;
                    }
                }
                
                if (replyBox) {
                    console.log('Inserting content into reply box...');
                    
                    try {
                        // Clear existing content
                        replyBox.innerHTML = '';
                        
                        // Format the response text with HTML
                        const formattedText = formatResponseForGmail(responseText);
                        
                        // Insert the formatted HTML
                        replyBox.innerHTML = formattedText;
                        
                        // Also try setting textContent as backup if innerHTML doesn't work
                        if (replyBox.innerHTML !== formattedText) {
                            replyBox.textContent = responseText;
                        }
                        
                        // Focus the element
                        replyBox.focus();
                        
                        // Trigger multiple events to ensure Gmail recognizes the change
                        const events = ['input', 'change', 'keyup', 'keydown', 'focus', 'blur'];
                        events.forEach(eventType => {
                            replyBox.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
                        });
                        
                        // Force a selection change
                        const range = document.createRange();
                        const selection = window.getSelection();
                        range.selectNodeContents(replyBox);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        console.log('Content inserted successfully');
                        return { 
                            success: true, 
                            message: `Response inserted into Gmail reply box using selector: ${foundSelector}!`,
                            selector: foundSelector
                        };
                    } catch (error) {
                        console.error('Error inserting content:', error);
                        return { 
                            success: false, 
                            message: `Error inserting content: ${error.message}`,
                            error: error.message
                        };
                    }
                } else {
                    // Log all available elements for debugging
                    const allDivs = document.querySelectorAll('div');
                    const potentialElements = Array.from(allDivs).filter(div => {
                        const text = div.textContent || div.innerText;
                        return div.offsetWidth > 0 && div.offsetHeight > 0 && 
                               (div.contentEditable === 'true' || 
                                div.getAttribute('role') === 'textbox' ||
                                div.getAttribute('aria-label')?.includes('Message') ||
                                div.getAttribute('aria-label')?.includes('Reply') ||
                                div.getAttribute('aria-label')?.includes('Compose'));
                    });
                    
                    console.log('Potential reply box elements found:', potentialElements.length);
                    potentialElements.forEach((el, index) => {
                        console.log(`Element ${index}:`, {
                            tagName: el.tagName,
                            className: el.className,
                            role: el.getAttribute('role'),
                            'aria-label': el.getAttribute('aria-label'),
                            contentEditable: el.contentEditable,
                            textContent: (el.textContent || el.innerText).substring(0, 100)
                        });
                        });
                    
                    return { 
                        success: false, 
                        message: 'Could not find Gmail reply box. Please ensure you are in a Gmail reply/compose window.',
                        debugInfo: `Found ${potentialElements.length} potential elements`
                    };
                }
            },
            args: [response]
        });

        if (result && result[0] && result[0].result) {
            const resultData = result[0].result;
            if (resultData.success) {
                // Visual feedback
                const originalText = useInReplyBtn.textContent;
                useInReplyBtn.textContent = 'Inserted!';
                useInReplyBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    useInReplyBtn.textContent = originalText;
                    useInReplyBtn.style.background = '#007bff';
                }, 2000);
                
                showError(resultData.message, 'success');
            } else {
                showError(resultData.message);
            }
        } else {
            showError('Failed to insert response into Gmail.');
        }
        
    } catch (error) {
        console.error('Error using response in reply:', error);
        showError('Failed to insert response into Gmail. Please try again.');
    }
}

// Format response text for Gmail with proper HTML
function formatResponseForGmail(text) {
    if (!text) return '';
    
    let formatted = text;
    
    // Convert line breaks to <br> tags
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Make common email elements bold
    const boldPatterns = [
        { pattern: /^(Hi|Hello|Dear|Good morning|Good afternoon|Good evening|Greetings)/i, tag: 'strong' },
        { pattern: /^(Best regards|Sincerely|Thank you|Thanks|Regards|Kind regards|Yours truly)/i, tag: 'strong' },
        { pattern: /^(Subject|From|To|Date|Sent|Received):/i, tag: 'strong' },
        { pattern: /^(I hope|I would like|I am writing|Please let me know|Could you|Would you)/i, tag: 'strong' }
    ];
    
    boldPatterns.forEach(({ pattern, tag }) => {
        formatted = formatted.replace(pattern, `<${tag}>$1</${tag}>`);
    });
    
    // Make names bold (words that start with capital letters and are likely names)
    formatted = formatted.replace(/\b([A-Z][a-z]+)\b/g, (match) => {
        // Don't bold common words that start with capitals
        const commonWords = ['I', 'I\'m', 'I\'ll', 'I\'ve', 'I\'d', 'The', 'This', 'That', 'These', 'Those', 'Please', 'Thank', 'Best', 'Kind', 'Yours'];
        if (commonWords.includes(match)) return match;
        return `<strong>${match}</strong>`;
    });
    
    // Add proper spacing around paragraphs
    formatted = formatted.replace(/(<br>){2,}/g, '</p><p>');
    formatted = formatted.replace(/^(.*?)(<br>|$)/, '<p>$1</p>');
    
    return formatted;
}

// Set loading state
function setLoadingState(isLoading) {
    if (isLoading) {
        loadingIndicator.style.display = 'flex';
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
    } else {
        loadingIndicator.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate';
    }
}

// Show error message
function showError(message, type = 'error') {
    errorMessage.textContent = message;
    errorMessage.className = `error-message ${type === 'success' ? 'success' : 'error'}`;
    errorMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Listen for storage changes (when API key is updated in settings)
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
        // Handle OpenAI API key changes
        if (changes.openai_api_key) {
            const newApiKey = changes.openai_api_key.newValue;
            if (newApiKey) {
                generateBtn.disabled = false;
                hideError();
            }
        }
        
        // Handle DeepSeek API key changes
        if (changes.deepseek_api_key) {
            const newApiKey = changes.deepseek_api_key.newValue;
            if (newApiKey) {
                generateBtn.disabled = false;
                hideError();
            }
        }
        
        // Handle model selection changes
        if (changes.selected_model) {
            const newModel = changes.selected_model.newValue;
            const { apiKey } = await getApiKey();
            if (apiKey) {
                hideError();
                generateBtn.disabled = false;
            } else {
                showError(`Please set your ${newModel === 'openai' ? 'OpenAI' : 'DeepSeek'} API key in settings first.`);
                generateBtn.disabled = true;
            }
        }
        
        // If no API key is available for the selected model
        const { apiKey } = await getApiKey();
        if (!apiKey) {
            const { selectedModel } = await getApiKey();
            showError(`Please set your ${selectedModel === 'openai' ? 'OpenAI' : 'DeepSeek'} API key in settings first.`);
            generateBtn.disabled = true;
        }
    }
});

// Listen for tab updates to show/hide email context checkbox
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        checkGmailContext();
        updateInstructions();
    }
});

// Listen for tab activation changes
chrome.tabs.onActivated.addListener((activeInfo) => {
    checkGmailContext();
    updateInstructions();
});
