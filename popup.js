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
const instructionsText = document.getElementById('instructionsText');
const activeModelBadge = document.getElementById('activeModelBadge');
const promptModeBadge = document.getElementById('promptModeBadge');

const PROVIDER_LABELS = {
    openai: 'ChatGPT',
    gemini: 'Gemini',
    deepseek: 'DeepSeek'
};

const DEFAULT_MODELS = {
    openai: 'gpt-5.4-mini',
    gemini: 'gemini-2.0-flash',
    deepseek: 'deepseek-chat'
};

const MODEL_PRICING = {
    openai: {
        'gpt-5.4': { inputPerMillion: 3.0, outputPerMillion: 24.0 },
        'gpt-5.4-mini': { inputPerMillion: 0.75, outputPerMillion: 4.5 },
        'gpt-5.4-nano': { inputPerMillion: 0.2, outputPerMillion: 0.8 },
        'gpt-4.1': { inputPerMillion: 2.0, outputPerMillion: 8.0 },
        'gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 },
        'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
        'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 }
    },
    gemini: {
        'gemini-2.0-flash': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
        'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.3 },
        'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0 }
    },
    deepseek: {
        'deepseek-chat': { inputPerMillion: 0.27, outputPerMillion: 1.1 },
        'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 }
    }
};

const activeTabState = {
    supportsEmailContext: false,
    supportsReplyInsert: false
};

document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
    try {
        if (!settingsBtn || !promptInput || !includeEmailCheckbox || !generateBtn || !responseSection || !responseOutput || !copyBtn || !useInReplyBtn || !loadingIndicator || !errorMessage || !instructionsText || !activeModelBadge || !promptModeBadge) {
            console.error('Popup initialization failed: missing required DOM nodes.');
            return;
        }

        settingsBtn.addEventListener('click', openSettings);
        generateBtn.addEventListener('click', generateResponse);
        copyBtn.addEventListener('click', copyResponse);
        useInReplyBtn.addEventListener('click', useInReply);

        await refreshUIFromSettings();
        await checkEmailContext();
        await updateInstructions();
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Failed to initialize. Please check your settings.');
    }
}

function openSettings() {
    chrome.tabs.create({ url: 'settings.html' });
}

async function refreshUIFromSettings() {
    if (!activeModelBadge || !promptModeBadge || !generateBtn) {
        return;
    }

    const settings = await getAISettings();
    const apiKey = getApiKeyForProvider(settings);

    activeModelBadge.textContent = `${PROVIDER_LABELS[settings.provider] || 'AI'} - ${settings.model}`;
    promptModeBadge.textContent = settings.promptMode === 'custom' ? 'Custom prompt' : 'Built-in prompt';

    if (!apiKey) {
        showError(`Please set your ${PROVIDER_LABELS[settings.provider] || 'AI'} API key in settings first.`);
        generateBtn.disabled = true;
        return;
    }

    generateBtn.disabled = false;
    hideError();
}

async function checkEmailContext() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tabs[0]?.url || '';
        activeTabState.supportsEmailContext = isEmailSite(url);
        activeTabState.supportsReplyInsert = isGmailSite(url);

        includeEmailCheckbox.checked = activeTabState.supportsEmailContext && includeEmailCheckbox.checked;
        includeEmailCheckbox.parentElement.style.display = activeTabState.supportsEmailContext ? 'flex' : 'none';
    } catch (error) {
        console.error('Error checking email context:', error);
        includeEmailCheckbox.parentElement.style.display = 'none';
        activeTabState.supportsEmailContext = false;
        activeTabState.supportsReplyInsert = false;
    }
}

async function updateInstructions() {
    if (!instructionsText) {
        return;
    }

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tabs[0]?.url || '';

        if (isEmailSite(url)) {
            instructionsText.innerHTML = '<strong>Email reply mode.</strong> Describe how you want to answer and we will use the open thread as context.';
        } else {
            instructionsText.innerHTML = '<strong>Writing mode.</strong> Paste any text for grammar fixes, cleanup, or a rewrite in your tone.';
        }
    } catch (error) {
        console.error('Error updating instructions:', error);
        instructionsText.innerHTML = '<strong>Writing mode.</strong> Enter a prompt and generate an improved response.';
    }
}

async function getAISettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(
            [
                'selected_provider',
                'selected_model',
                'prompt_mode',
                'custom_prompt',
                'openai_api_key',
                'gemini_api_key',
                'deepseek_api_key'
            ],
            (result) => {
                resolve({
                    provider: result.selected_provider || 'openai',
                    model: result.selected_model || DEFAULT_MODELS[result.selected_provider || 'openai'],
                    promptMode: result.prompt_mode || 'default',
                    customPrompt: result.custom_prompt || '',
                    apiKeys: {
                        openai: result.openai_api_key || '',
                        gemini: result.gemini_api_key || '',
                        deepseek: result.deepseek_api_key || ''
                    }
                });
            }
        );
    });
}

function getApiKeyForProvider(settings) {
    return settings.apiKeys[settings.provider];
}

async function generateResponse() {
    try {
        const userInput = promptInput.value.trim();
        if (!userInput) {
            showError('Please enter your message or reply request.');
            return;
        }

        const settings = await getAISettings();
        const apiKey = getApiKeyForProvider(settings);

        if (!apiKey) {
            showError(`Please set your ${PROVIDER_LABELS[settings.provider] || 'AI'} API key in settings first.`);
            return;
        }

        setLoadingState(true);
        hideError();

        const prompt = await constructPrompt(userInput, settings);
        const result = await callAI(apiKey, prompt, settings);
        await recordUsageStats(settings.provider, settings.model, result.usage);

        displayResponse(result.text);
    } catch (error) {
        console.error('Error generating response:', error);
        showError(error.message || 'Failed to generate response. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

async function constructPrompt(userInput, settings) {
    const wantsEmailContext = includeEmailCheckbox.checked;
    const emailContext = wantsEmailContext ? await getEmailContext() : '';

    if (settings.promptMode === 'custom' && settings.customPrompt.trim()) {
        return buildCustomPrompt(settings.customPrompt, userInput, emailContext);
    }

    return wantsEmailContext ? buildBuiltInEmailPrompt(userInput, emailContext) : buildBuiltInGrammarPrompt(userInput);
}

function buildCustomPrompt(template, userInput, emailContext) {
    let result = template
        .replaceAll('{{input}}', userInput)
        .replaceAll('{{email_context}}', emailContext || 'No email context available.');

    if (!template.includes('{{input}}')) {
        result += `\n\nUser input:\n${userInput}`;
    }

    if (emailContext && !template.includes('{{email_context}}')) {
        result += `\n\nEmail context:\n${emailContext}`;
    }

    return result;
}

function buildBuiltInEmailPrompt(userInput, emailContext) {
    return `You are helping the user write an email reply.

Email thread context:
${emailContext || 'No email context was available.'}

Instructions:
- The user is replying to the sender of the email thread.
- Write on the user's behalf, not on behalf of the sender.
- Use real names from the thread when they are visible.
- Do not use placeholders.
- Do not include a subject line.
- Return only the email body.

User request:
${userInput}`;
}

function buildBuiltInGrammarPrompt(userInput) {
    return `You are a writing assistant. Correct grammar, spelling, punctuation, and clarity while preserving the user's tone. Return only the improved text with no explanation.

Text:
${userInput}`;
}

async function getEmailContext() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) {
                reject(new Error('No active tab found.'));
                return;
            }

            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    func: extractEmailContextFromPage
                },
                (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    resolve(result?.[0]?.result || 'No email content found.');
                }
            );
        });
    });
}

function extractEmailContextFromPage() {
    const isGmail = window.location.hostname.includes('mail.google.com');

    if (isGmail) {
        const messageNodes = Array.from(document.querySelectorAll('[data-message-id], .adn, .a3s'));
        const uniqueBlocks = [];

        messageNodes.forEach((node) => {
            const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.length > 40 && !uniqueBlocks.includes(text)) {
                uniqueBlocks.push(text);
            }
        });

        if (uniqueBlocks.length > 0) {
            return uniqueBlocks.slice(0, 6).join('\n\n');
        }
    }

    const genericCandidates = Array.from(document.querySelectorAll('article, main, [role="main"], .message, .thread, .mail'));
    const genericText = genericCandidates
        .map((node) => (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((text) => text.length > 60)
        .slice(0, 5)
        .join('\n\n');

    return genericText || 'No email content found. Open the email thread before generating a reply.';
}

async function callAI(apiKey, prompt, settings) {
    if (settings.provider === 'openai') {
        return callOpenAI(apiKey, prompt, settings.model);
    }

    if (settings.provider === 'gemini') {
        return callGemini(apiKey, prompt, settings.model);
    }

    if (settings.provider === 'deepseek') {
        return callDeepSeek(apiKey, prompt, settings.model);
    }

    throw new Error('Unsupported provider selected.');
}

async function callOpenAI(apiKey, prompt, model) {
    const requestBody = buildOpenAIRequestBody(model, prompt);
    let response = await fetchOpenAI(apiKey, requestBody);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';

        if (shouldRetryOpenAIRequest(errorMessage)) {
            const fallbackBody = buildOpenAIRequestBody(model, prompt, { forceModernTokenParam: true, omitTemperature: true });
            response = await fetchOpenAI(apiKey, fallbackBody);
        } else {
            response.parsedErrorData = errorData;
        }
    }

    return handleOpenAIStyleResponse(response, 'OpenAI');
}

function buildOpenAIRequestBody(model, prompt, options = {}) {
    const requestBody = {
        model,
        messages: [{ role: 'user', content: prompt }]
    };

    const useModernTokenParam = options.forceModernTokenParam || model.startsWith('gpt-5');
    if (useModernTokenParam) {
        requestBody.max_completion_tokens = 1000;
    } else {
        requestBody.max_tokens = 1000;
    }

    if (!options.omitTemperature && !model.startsWith('gpt-5')) {
        requestBody.temperature = 0.7;
    }

    return requestBody;
}

function shouldRetryOpenAIRequest(errorMessage) {
    return errorMessage.includes('max_tokens') || errorMessage.includes('max_completion_tokens') || errorMessage.includes('temperature');
}

async function fetchOpenAI(apiKey, requestBody) {
    return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });
}

async function callDeepSeek(apiKey, prompt, model) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    return handleOpenAIStyleResponse(response, 'DeepSeek');
}

async function handleOpenAIStyleResponse(response, providerLabel) {
    if (!response.ok) {
        const errorData = response.parsedErrorData || await response.json().catch(() => ({}));
        if (response.status === 401) {
            throw new Error(`Invalid ${providerLabel} API key. Please check your settings.`);
        }
        if (response.status === 429) {
            throw new Error(`${providerLabel} rate limit exceeded. Please try again later.`);
        }
        throw new Error(errorData.error?.message || `${providerLabel} API request failed (${response.status}).`);
    }

    const data = await response.json();
    return {
        text: data.choices?.[0]?.message?.content || 'No response generated.',
        usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
        }
    };
}

async function callGemini(apiKey, prompt, model) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid Gemini API key. Please check your settings.');
        }
        if (response.status === 429) {
            throw new Error('Gemini rate limit exceeded. Please try again later.');
        }
        throw new Error(errorData.error?.message || `Gemini API request failed (${response.status}).`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
    return {
        text: text || 'No response generated.',
        usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0
        }
    };
}

async function recordUsageStats(provider, model, usage) {
    if (!usage || (!usage.totalTokens && !usage.promptTokens && !usage.completionTokens)) {
        return;
    }

    const estimatedCost = calculateEstimatedCost(provider, model, usage);

    const currentStats = await new Promise((resolve) => {
        chrome.storage.local.get(['usage_stats'], (result) => {
            resolve(result.usage_stats || {
                totalPromptTokens: 0,
                totalCompletionTokens: 0,
                totalTokens: 0,
                totalEstimatedCost: 0,
                byProvider: {
                    openai: 0,
                    gemini: 0,
                    deepseek: 0
                },
                byProviderCost: {
                    openai: 0,
                    gemini: 0,
                    deepseek: 0
                },
                updatedAt: null
            });
        });
    });

    const nextStats = {
        totalPromptTokens: currentStats.totalPromptTokens + (usage.promptTokens || 0),
        totalCompletionTokens: currentStats.totalCompletionTokens + (usage.completionTokens || 0),
        totalTokens: currentStats.totalTokens + (usage.totalTokens || 0),
        totalEstimatedCost: (currentStats.totalEstimatedCost || 0) + estimatedCost,
        byProvider: {
            openai: currentStats.byProvider?.openai || 0,
            gemini: currentStats.byProvider?.gemini || 0,
            deepseek: currentStats.byProvider?.deepseek || 0
        },
        byProviderCost: {
            openai: currentStats.byProviderCost?.openai || 0,
            gemini: currentStats.byProviderCost?.gemini || 0,
            deepseek: currentStats.byProviderCost?.deepseek || 0
        },
        updatedAt: new Date().toISOString()
    };

    nextStats.byProvider[provider] = (nextStats.byProvider[provider] || 0) + (usage.totalTokens || 0);
    nextStats.byProviderCost[provider] = (nextStats.byProviderCost[provider] || 0) + estimatedCost;

    await new Promise((resolve) => {
        chrome.storage.local.set({ usage_stats: nextStats }, resolve);
    });
}

function calculateEstimatedCost(provider, model, usage) {
    const pricing = MODEL_PRICING[provider]?.[model];
    if (!pricing) {
        return 0;
    }

    const promptCost = ((usage.promptTokens || 0) / 1000000) * pricing.inputPerMillion;
    const completionCost = ((usage.completionTokens || 0) / 1000000) * pricing.outputPerMillion;
    return promptCost + completionCost;
}

function displayResponse(response) {
    if (!responseOutput || !responseSection || !useInReplyBtn) {
        return;
    }

    responseOutput.textContent = response;
    responseSection.hidden = false;

    if (includeEmailCheckbox.checked && activeTabState.supportsReplyInsert) {
        useInReplyBtn.style.display = 'inline-flex';
        useInReplyBtn.disabled = false;
    } else {
        useInReplyBtn.style.display = 'none';
    }
}

async function copyResponse() {
    try {
        await navigator.clipboard.writeText(responseOutput.textContent);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied';

        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 1400);
    } catch (error) {
        console.error('Failed to copy:', error);
        showError('Failed to copy response to clipboard.');
    }
}

async function useInReply() {
    try {
        const response = responseOutput.textContent;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tabs[0]?.id) {
            showError('No active tab found.');
            return;
        }

        const result = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: insertResponseIntoReplyBox,
            args: [response]
        });

        const payload = result?.[0]?.result;
        if (!payload?.success) {
            showError(payload?.message || 'Could not insert the response into the reply box.');
            return;
        }

        const originalText = useInReplyBtn.textContent;
        useInReplyBtn.textContent = 'Inserted';
        showError(payload.message, 'success');

        setTimeout(() => {
            useInReplyBtn.textContent = originalText;
        }, 1800);
    } catch (error) {
        console.error('Error using response in reply:', error);
        showError('Failed to insert response into Gmail. Please try again.');
    }
}

function insertResponseIntoReplyBox(responseText) {
    const selectors = [
        'div[role="textbox"][aria-label*="Message Body"]',
        'div[role="textbox"][aria-label*="Reply"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"].gmail_default'
    ];

    const formattedHtml = responseText.replace(/\n/g, '<br>');
    let replyBox = null;

    for (const selector of selectors) {
        const candidate = Array.from(document.querySelectorAll(selector)).find(
            (element) => element.offsetWidth > 0 && element.offsetHeight > 0
        );

        if (candidate) {
            replyBox = candidate;
            break;
        }
    }

    if (!replyBox) {
        return {
            success: false,
            message: 'Open a Gmail reply box first, then try again.'
        };
    }

    replyBox.focus();
    replyBox.innerHTML = formattedHtml;
    replyBox.dispatchEvent(new Event('input', { bubbles: true }));

    return {
        success: true,
        message: 'Response inserted into the current reply box.'
    };
}

function setLoadingState(isLoading) {
    if (!loadingIndicator || !generateBtn) {
        return;
    }

    loadingIndicator.hidden = !isLoading;
    generateBtn.disabled = isLoading;
    generateBtn.textContent = isLoading ? 'Generating...' : 'Generate';
}

function showError(message, type = 'error') {
    if (!errorMessage) {
        return;
    }

    errorMessage.textContent = message;
    errorMessage.className = `error-message ${type}`;
    errorMessage.hidden = false;
}

function hideError() {
    if (errorMessage) {
        errorMessage.hidden = true;
    }
}

function isEmailSite(url) {
    return /mail\.google\.com|outlook\.live\.com|outlook\.office\.com|mail\.yahoo\.com/i.test(url);
}

function isGmailSite(url) {
    return /mail\.google\.com/i.test(url);
}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace !== 'local') {
        return;
    }

    if (
        changes.selected_provider ||
        changes.selected_model ||
        changes.prompt_mode ||
        changes.openai_api_key ||
        changes.gemini_api_key ||
        changes.deepseek_api_key
    ) {
        await refreshUIFromSettings();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        checkEmailContext();
        updateInstructions();
    }
});

chrome.tabs.onActivated.addListener(() => {
    checkEmailContext();
    updateInstructions();
});
