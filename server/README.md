# XueTong AI Tutor Backend

## Setup

1. Navigate to the server folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your DeepSeek API key:
   - Open `.env` file
   - Replace `your_deepseek_api_key_here` with your actual API key
   - Get your API key from: https://platform.deepseek.com/

4. Start the server:
   ```bash
   npm start
   ```

The server will run on http://localhost:3000

## Usage

- The frontend calls `http://localhost:3000/api/chat` to send messages to the AI tutor
- Keep the server running while using the AI tutor feature
- Your API key is stored in the `.env` file and never exposed to the client

## Troubleshooting

If you see "Could not connect to AI server", make sure:
1. The backend server is running (`npm start`)
2. The .env file has your DeepSeek API key
3. No other application is using port 3000
