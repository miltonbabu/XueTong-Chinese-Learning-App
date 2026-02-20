# XueTong 学通 - HSK Chinese Learning App

A comprehensive Chinese learning application designed to help students master HSK vocabulary and improve their Chinese language skills.

## 🎯 Features

- 📚 **HSK 1-6 Vocabulary** (5000+ words)
- 🎴 **Interactive Flashcards** with flip animation
- ✍️ **Practice Quizzes** with multiple question types
- 🧠 **AI-Powered Tutor** using DeepSeek API
- 📊 **Progress Tracking** with XP rewards and streaks
- 🔊 **Audio Pronunciation** for all words
- 🔍 **Advanced Search** with filters
- 🌙 **Dark/Light Mode** support
- 📱 **Fully Responsive** design

## 🚀 Quick Start

### Prerequisites
- Node.js 14.x or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)
- DeepSeek API key (for AI tutor features)

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and add your DeepSeek API key
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000/xuetong-latest.html
   ```

## 📁 Project Structure

```
xuetong-app/
├── server/              # Backend server
│   ├── server.js        # Express server with DeepSeek AI
│   ├── .env.example     # Environment variables template
│   └── package.json    # Backend dependencies
├── xuetong-latest.html # Main frontend file
├── script.js            # Frontend logic
├── styles.css            # Styles
├── ui-enhancements.js  # UI enhancements
├── share.js             # Share functionality
├── images/              # App images and icons
├── csv_files/           # HSK vocabulary data
├── vercel.json          # Vercel configuration
└── package.json          # Root package.json
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3000
```

### Get API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key and add to `.env` file

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Vercel, Netlify, Render, and more.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 📚 Learning Features

### HSK Levels
- **HSK 1**: 150 words (Beginner)
- **HSK 2**: 300 words (Elementary)
- **HSK 3**: 600 words (Intermediate)
- **HSK 4**: 1200 words (Upper Intermediate)
- **HSK 5**: 2500 words (Advanced)
- **HSK 6**: 5000 words (Proficient)

### Study Modes

1. **Learn Tab**
   - Browse vocabulary by HSK level
   - View character breakdown and pinyin
   - Listen to pronunciation
   - Copy words to clipboard
   - Share words with others

2. **Flashcards Tab**
   - Practice with interactive flashcards
   - Mark words as "known" or "learning"
   - Track mastery progress
   - Multiple practice modes (random, sequential, new only)

3. **Practice Tab**
   - Take quizzes on vocabulary
   - Multiple question types
   - Timer option
   - Track accuracy and progress
   - Retry wrong answers

4. **AI Tutor Tab**
   - Get personalized help
   - Practice conversations
   - Learn grammar
   - Get pronunciation tips
   - Cultural insights

5. **Stats Tab**
   - Track overall progress
   - View HSK level progress
   - See study activity (last 24 hours)
   - View achievements
   - Monitor streak and XP

## 🎨 Customization

### Themes
- Light mode (default)
- Dark mode
- Automatic system preference detection
- Manual toggle in header

### Animations
- Smooth transitions
- Card flip animations
- Progress bar animations
- Hover effects
- Loading states

## 🔒 Privacy & Security

- All data stored locally in browser (localStorage)
- No server-side data collection
- No account required
- Your progress stays on your device
- Clear data by clearing browser cache

## 📊 Progress System

### XP System
- Earn XP through various activities
- Level up every 100 XP
- Track total XP and current level

### Points System
- Earn points for studying
- Track overall points
- Display in stats tab

### Streak System
- Track daily study activity
- Maintain streak for consecutive days
- Motivate consistent learning

## 🐛 Troubleshooting

### Common Issues

1. **Vocabulary not loading**
   - Check if CSV files exist in `csv_files/` folder
   - Check browser console for errors

2. **AI tutor not responding**
   - Verify DeepSeek API key in `.env` file
   - Check internet connection
   - Verify API key is valid

3. **Progress not saving**
   - Check if localStorage is enabled in browser
   - Check for browser storage limits
   - Try clearing browser cache

4. **Audio not playing**
   - Check browser audio settings
   - Verify volume is not muted
   - Try different browser

## 📝 Development

### Adding New Features

1. Add new vocabulary to `csv_files/` folder
2. Update `script.js` with new functionality
3. Add styles to `styles.css`
4. Test thoroughly before deploying

### Code Structure

- Frontend: Vanilla JavaScript with modular functions
- Backend: Express.js server
- Styling: Tailwind CSS + custom CSS
- No build process required (direct HTML/JS)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

© 2026 XueTong 学通. All rights reserved.

## 🙏 Acknowledgments

- DeepSeek AI API for AI tutor functionality
- Tailwind CSS for styling framework
- Express.js for backend server
- HSK vocabulary data sources

## 📞 Support

For issues, questions, or suggestions:
- Check existing issues first
- Create detailed bug reports
- Include steps to reproduce
- Specify browser and OS version

---

**Happy Learning! 🎓**
