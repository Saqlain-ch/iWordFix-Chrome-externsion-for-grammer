# iWordFix Chrome Extension

A Chrome extension that provides AI-powered writing assistance for email responses and grammar correction with seamless Gmail integration.

## Features

- **Email Response Writer**: Generate professional email replies with Gmail context integration
- **Grammar Helper**: Fix grammar, spelling, and improve writing clarity
- **Gmail Integration**: Automatically insert responses into Gmail reply boxes
- **Smart Context**: Understands email threads and responds appropriately
- **One-Click Copy**: Easy copying and pasting of AI responses
- **Clean, Mobile-Friendly UI**: Single-column layout with responsive design
- **OpenAI Integration**: Uses OpenAI's GPT-3.5-turbo model for AI responses
- **Secure Storage**: API keys stored locally in Chrome storage
- **Error Handling**: Graceful error handling for API failures and missing keys

## Installation

### Prerequisites
- Google Chrome browser
- OpenAI API key (get one at [OpenAI Platform](https://platform.openai.com/api-keys))

### Steps
1. **Download/Clone** this repository to your local machine
2. **Create Icons**: Replace the placeholder icon files with actual PNG images:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels) 
   - `icon128.png` (128x128 pixels)
3. **Open Chrome** and go to `chrome://extensions/`
4. **Enable Developer Mode** (toggle in top right)
5. **Click "Load unpacked"** and select the extension folder
6. **Set API Key**: Click the extension icon, then the settings gear icon to enter your OpenAI API key

## Usage

### Basic Usage
1. **Click the extension icon** in your Chrome toolbar
2. **Enter your prompt** in the text area
3. **Choose context option**:
   - ✅ **Include email context**: Generates professional email responses using Gmail thread context
   - ❌ **No email context**: Fixes grammar, spelling, and improves writing clarity
4. **Click "Generate"** to get AI response
5. **Use the response**:
   - **Copy**: Use the Copy button to copy to clipboard
   - **Use in Reply**: Automatically insert into Gmail reply box (when on Gmail)

### Settings
- **API Key Management**: Securely store and manage your OpenAI API key
- **Privacy**: All data is stored locally, never sent to external servers
- **Security**: API key is masked by default with show/hide toggle

## File Structure

```
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── settings.html         # Settings page
├── settings.css          # Settings styling
├── settings.js           # Settings functionality
├── icon16.png            # 16x16 icon (create this)
├── icon48.png            # 48x48 icon (create this)
├── icon128.png           # 128x128 icon (create this)
└── README.md             # This file
```

## API Key Setup

1. **Get API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Create Key**: Sign in and click "Create new secret key"
3. **Copy Key**: Copy the generated key (starts with "sk-")
4. **Save in Extension**: Open extension settings and paste the key
5. **Start Using**: Your extension is now ready to use!

## Security Features

- **Local Storage**: API keys stored only in Chrome's local storage
- **No External Servers**: All processing happens locally or through OpenAI's secure API
- **Input Validation**: API key format validation before saving
- **Secure Display**: API key is masked by default

## Troubleshooting

### Common Issues

**"Please set your OpenAI API key"**
- Click the settings gear icon and enter your API key

**"Invalid API key"**
- Ensure your key starts with "sk-" and is copied correctly

**"API request failed"**
- Check your internet connection and API key validity
- Verify you have sufficient OpenAI credits

**Extension not loading**
- Ensure Developer Mode is enabled in Chrome extensions
- Check that all files are present in the extension folder

### Error Messages

- **401 Unauthorized**: Invalid or expired API key
- **429 Too Many Requests**: Rate limit exceeded, wait and try again
- **Network Error**: Check internet connection

## Development

### Modifying the Extension

- **UI Changes**: Edit `popup.css` and `settings.css`
- **Functionality**: Modify `popup.js` and `settings.js`
- **Configuration**: Update `manifest.json` for permissions or features

### Testing Changes

1. Make your modifications
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test the changes

## Privacy Policy

- **Data Storage**: All data stored locally in Chrome
- **API Calls**: Only sends prompts to OpenAI API
- **No Tracking**: No analytics or tracking code
- **Open Source**: Full source code available for review

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console for error messages
3. Ensure all files are properly loaded
4. Verify Chrome extension permissions

## License

This project is open source and available under the MIT License.

---

**Note**: This extension requires an active OpenAI API key and may incur costs based on your OpenAI usage. Please review OpenAI's pricing and terms of service.
