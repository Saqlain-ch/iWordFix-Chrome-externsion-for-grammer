const MODEL_OPTIONS = {
    openai: [
        {
            group: 'GPT-5',
            models: [
                { value: 'gpt-5.4', label: 'GPT-5.4', cost: 'expensive' },
                { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', cost: 'cheap' },
                { value: 'gpt-5.4-nano', label: 'GPT-5.4 Nano', cost: 'very-cheap' }
            ]
        },
        {
            group: 'GPT-4',
            models: [
                { value: 'gpt-4.1', label: 'GPT-4.1', cost: 'expensive' },
                { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', cost: 'cheap' },
                { value: 'gpt-4o', label: 'GPT-4o', cost: 'expensive' },
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 'very-cheap' }
            ]
        }
    ],
    gemini: [
        {
            group: 'Gemini',
            models: [
                { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', cost: 'cheap' },
                { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', cost: 'very-cheap' },
                { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', cost: 'expensive' }
            ]
        }
    ],
    deepseek: [
        {
            group: 'DeepSeek',
            models: [
                { value: 'deepseek-chat', label: 'DeepSeek Chat', cost: 'cheap' },
                { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', cost: 'expensive' }
            ]
        }
    ]
};

const STORAGE_KEYS = {
    provider: 'selected_provider',
    model: 'selected_model',
    promptMode: 'prompt_mode',
    customPrompt: 'custom_prompt',
    openai: 'openai_api_key',
    gemini: 'gemini_api_key',
    deepseek: 'deepseek_api_key'
};

const providerSelect = document.getElementById('providerSelect');
const modelSelect = document.getElementById('modelSelect');
const modelCostBadge = document.getElementById('modelCostBadge');
const promptModeSelect = document.getElementById('promptModeSelect');
const customPromptField = document.getElementById('customPromptField');
const customPromptInput = document.getElementById('customPrompt');
const statusMessage = document.getElementById('statusMessage');
const totalTokensValue = document.getElementById('totalTokensValue');
const estimatedCostValue = document.getElementById('estimatedCostValue');
const openaiCostValue = document.getElementById('openaiCostValue');
const geminiCostValue = document.getElementById('geminiCostValue');
const deepseekCostValue = document.getElementById('deepseekCostValue');
const statsUpdatedAt = document.getElementById('statsUpdatedAt');

const apiControls = {
    openai: {
        input: document.getElementById('openaiApiKey'),
        saveBtn: document.getElementById('saveOpenaiBtn'),
        clearBtn: document.getElementById('clearOpenaiBtn'),
        toggleBtn: document.getElementById('toggleOpenaiVisibility'),
        statusEl: document.getElementById('openaiKeyStatus'),
        label: 'OpenAI'
    },
    gemini: {
        input: document.getElementById('geminiApiKey'),
        saveBtn: document.getElementById('saveGeminiBtn'),
        clearBtn: document.getElementById('clearGeminiBtn'),
        toggleBtn: document.getElementById('toggleGeminiVisibility'),
        statusEl: document.getElementById('geminiKeyStatus'),
        label: 'Gemini'
    },
    deepseek: {
        input: document.getElementById('deepseekApiKey'),
        saveBtn: document.getElementById('saveDeepseekBtn'),
        clearBtn: document.getElementById('clearDeepseekBtn'),
        toggleBtn: document.getElementById('toggleDeepseekVisibility'),
        statusEl: document.getElementById('deepseekKeyStatus'),
        label: 'DeepSeek'
    }
};

let statusTimer = null;
document.addEventListener('DOMContentLoaded', initializeSettings);
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.usage_stats) {
        loadUsageStats();
    }
});

async function initializeSettings() {
    if (!providerSelect || !modelSelect || !modelCostBadge || !promptModeSelect || !customPromptField || !customPromptInput || !statusMessage) {
        console.error('Settings initialization failed: missing required DOM nodes.');
        return;
    }

    providerSelect.addEventListener('change', handleProviderChange);
    modelSelect.addEventListener('change', saveModelSelection);
    promptModeSelect.addEventListener('change', handlePromptModeChange);
    customPromptInput.addEventListener('input', debounce(saveCustomPrompt, 300));

    Object.entries(apiControls).forEach(([provider, controls]) => {
        if (!controls.input || !controls.saveBtn || !controls.clearBtn || !controls.toggleBtn) {
            return;
        }

        controls.toggleBtn.addEventListener('click', () => toggleApiKeyVisibility(controls.input, controls.toggleBtn));
        controls.saveBtn.addEventListener('click', () => saveApiKey(provider));
        controls.clearBtn.addEventListener('click', () => clearApiKey(provider));
        controls.input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                saveApiKey(provider);
            }
        });
    });

    populateProviderOptions();

    const settings = await getSettings();
    const selectedProvider = MODEL_OPTIONS[settings.selectedProvider] ? settings.selectedProvider : 'openai';

    providerSelect.value = selectedProvider;
    renderModelOptions(selectedProvider, settings.selectedModel);

    promptModeSelect.value = settings.promptMode;
    customPromptInput.value = settings.customPrompt;
    toggleCustomPromptField(settings.promptMode === 'custom');

    Object.entries(apiControls).forEach(([provider, controls]) => {
        controls.input.value = maskApiKey(settings.apiKeys[provider] || '');
        updateProviderKeyStatus(controls, Boolean(settings.apiKeys[provider]));
    });

    await loadUsageStats();
}

function populateProviderOptions() {
    providerSelect.innerHTML = Object.keys(MODEL_OPTIONS)
        .map((provider) => `<option value="${provider}">${formatProviderName(provider)}</option>`)
        .join('');
}

function renderModelOptions(provider, selectedModel) {
    const groups = MODEL_OPTIONS[provider] || [];
    const models = flattenModels(provider);

    modelSelect.innerHTML = groups
        .map((group) => `
            <optgroup label="${group.group}">
                ${group.models
                    .map((model) => `<option value="${model.value}">${formatModelOptionLabel(model)}</option>`)
                    .join('')}
            </optgroup>
        `)
        .join('');

    const defaultModel = models[0]?.value || '';
    modelSelect.value = models.some((model) => model.value === selectedModel) ? selectedModel : defaultModel;
    updateModelCostBadge();
}

async function handleProviderChange() {
    const provider = providerSelect.value;
    renderModelOptions(provider);

    await chrome.storage.local.set({
        [STORAGE_KEYS.provider]: provider,
        [STORAGE_KEYS.model]: modelSelect.value
    });

    showStatus(`${formatProviderName(provider)} is now the active provider.`, 'success');
}

async function saveModelSelection() {
    await chrome.storage.local.set({ [STORAGE_KEYS.model]: modelSelect.value });
    updateModelCostBadge();
    showStatus(`Model updated to ${modelSelect.options[modelSelect.selectedIndex].text}.`, 'success');
}

async function handlePromptModeChange() {
    const mode = promptModeSelect.value;
    toggleCustomPromptField(mode === 'custom');
    await chrome.storage.local.set({ [STORAGE_KEYS.promptMode]: mode });
    showStatus(mode === 'custom' ? 'Custom prompt enabled.' : 'Built-in prompt enabled.', 'success');
}

function toggleCustomPromptField(show) {
    if (customPromptField) {
        customPromptField.hidden = !show;
    }
}

async function saveCustomPrompt() {
    await chrome.storage.local.set({ [STORAGE_KEYS.customPrompt]: customPromptInput.value.trim() });
}

function toggleApiKeyVisibility(inputElement, buttonElement) {
    const currentType = inputElement.type;
    inputElement.type = currentType === 'password' ? 'text' : 'password';

    const svg = buttonElement.querySelector('svg');
    if (currentType === 'password') {
        svg.innerHTML = '<path d="M17.94,17.94C16.23,19.23 14.04,20 12,20C7,20 2.73,16.89 1,12C2.73,7.11 7,4 12,4C14.04,4 16.23,4.77 17.94,6.06L19.36,4.64C20.88,6.15 22,8.09 22,12C22,15.91 20.88,17.85 19.36,19.36L17.94,17.94M12,7C9.24,7 7,9.24 7,12C7,14.76 9.24,17 12,17C14.76,17 17,14.76 17,12C17,9.24 14.76,7 12,7L12,7Z"/>';
    } else {
        svg.innerHTML = '<path d="M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>';
    }
}

async function saveApiKey(provider) {
    const controls = apiControls[provider];
    const apiKey = controls.input.value.trim();

    if (!isValidApiKey(provider, apiKey)) {
        showStatus(`Enter a valid ${controls.label} API key.`, 'error');
        return;
    }

    await chrome.storage.local.set({ [STORAGE_KEYS[provider]]: apiKey });
    controls.input.value = maskApiKey(apiKey);
    updateProviderKeyStatus(controls, true);
    showStatus(`${controls.label} API key saved.`, 'success');
}

async function clearApiKey(provider) {
    const controls = apiControls[provider];
    await chrome.storage.local.remove([STORAGE_KEYS[provider]]);
    controls.input.value = '';
    updateProviderKeyStatus(controls, false);
    showStatus(`${controls.label} API key cleared.`, 'success');
}

function isValidApiKey(provider, apiKey) {
    if (!apiKey) {
        return false;
    }

    if (provider === 'gemini') {
        return apiKey.length >= 20;
    }

    return apiKey.startsWith('sk-') && apiKey.length > 20;
}

async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(
            [
                STORAGE_KEYS.provider,
                STORAGE_KEYS.model,
                STORAGE_KEYS.promptMode,
                STORAGE_KEYS.customPrompt,
                STORAGE_KEYS.openai,
                STORAGE_KEYS.gemini,
                STORAGE_KEYS.deepseek
            ],
            (result) => {
                const selectedProvider = result[STORAGE_KEYS.provider] || 'openai';
                const selectedModel = result[STORAGE_KEYS.model] || flattenModels(selectedProvider)[0].value;

                resolve({
                    selectedProvider,
                    selectedModel,
                    promptMode: result[STORAGE_KEYS.promptMode] || 'default',
                    customPrompt: result[STORAGE_KEYS.customPrompt] || '',
                    apiKeys: {
                        openai: result[STORAGE_KEYS.openai] || '',
                        gemini: result[STORAGE_KEYS.gemini] || '',
                        deepseek: result[STORAGE_KEYS.deepseek] || ''
                    }
                });
            }
        );
    });
}

async function loadUsageStats() {
    const stats = await new Promise((resolve) => {
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

    if (totalTokensValue) {
        totalTokensValue.textContent = formatNumber(stats.totalTokens || 0);
    }
    if (estimatedCostValue) {
        estimatedCostValue.textContent = formatCurrency(stats.totalEstimatedCost || 0);
    }
    if (openaiCostValue) {
        openaiCostValue.textContent = formatCurrency(stats.byProviderCost?.openai || 0);
    }
    if (geminiCostValue) {
        geminiCostValue.textContent = formatCurrency(stats.byProviderCost?.gemini || 0);
    }
    if (deepseekCostValue) {
        deepseekCostValue.textContent = formatCurrency(stats.byProviderCost?.deepseek || 0);
    }
    if (statsUpdatedAt) {
        statsUpdatedAt.textContent = stats.updatedAt
            ? `Last updated ${new Date(stats.updatedAt).toLocaleString()}`
            : 'No usage recorded yet.';
    }
}

function flattenModels(provider) {
    return (MODEL_OPTIONS[provider] || []).flatMap((group) => group.models);
}

function updateModelCostBadge() {
    if (!modelCostBadge || !modelSelect || !providerSelect) {
        return;
    }

    const selectedModel = flattenModels(providerSelect.value).find((model) => model.value === modelSelect.value);
    const cost = selectedModel?.cost || 'cheap';
    modelCostBadge.textContent = formatCostLabel(cost);
    modelCostBadge.className = `cost-badge ${cost}`;
}

function formatCostLabel(cost) {
    if (cost === 'very-cheap') return 'Very cheap';
    if (cost === 'expensive') return 'Expensive';
    return 'Cheap';
}

function formatModelOptionLabel(model) {
    return model.label;
}

function updateProviderKeyStatus(controls, hasKey) {
    if (!controls.statusEl) {
        return;
    }

    controls.statusEl.textContent = hasKey ? 'Key saved in browser' : 'No key saved';
    controls.statusEl.className = hasKey ? 'provider-status saved' : 'provider-status';
}

function maskApiKey(apiKey) {
    if (!apiKey) {
        return '';
    }

    if (apiKey.length <= 12) {
        return apiKey;
    }

    return `${apiKey.slice(0, 6)}${'*'.repeat(10)}${apiKey.slice(-6)}`;
}

function formatNumber(value) {
    return new Intl.NumberFormat().format(value);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
    }).format(value);
}

function showStatus(message, type = 'success') {
    if (!statusMessage) {
        return;
    }

    if (statusTimer) {
        clearTimeout(statusTimer);
    }

    statusMessage.textContent = message;
    statusMessage.className = `status-toast ${type}`;
    statusMessage.hidden = false;

    statusTimer = setTimeout(() => {
        statusMessage.hidden = true;
    }, 3200);
}

function formatProviderName(provider) {
    if (provider === 'openai') return 'ChatGPT';
    if (provider === 'gemini') return 'Gemini';
    return 'DeepSeek';
}

function debounce(fn, delay) {
    let timer = null;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
