# Contributing to XueTong 学通

Thank you for your interest in contributing to XueTong! This document provides guidelines and instructions for contributing to the project.

## 🎯 How to Contribute

### Reporting Bugs

1. Check existing [Issues](../../issues) to avoid duplicates
2. Use clear and descriptive titles
3. Provide detailed information:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - Browser and OS information
4. Use appropriate labels: `bug`, `enhancement`, `question`

### Suggesting Enhancements

1. Check existing [Issues](../../issues) and [Pull Requests](../../pulls)
2. Use the issue tracker for discussions
3. Provide clear descriptions with:
   - Problem statement
   - Proposed solution
   - Benefits of the change
4. Consider implementation complexity

### Submitting Pull Requests

1. Fork the repository
2. Create a new branch for your feature: `git checkout -b feature/your-feature-name`
3. Make your changes with clear, descriptive commit messages
4. Follow the existing code style
5. Test thoroughly before submitting
6. Ensure all tests pass (if applicable)
7. Update documentation if needed
8. Submit a pull request with:
   - Clear title describing the change
   - Detailed description of what you changed and why
   - Reference related issues

## 📝 Coding Standards

### JavaScript

- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns
- Use const and let appropriately
- Avoid global variables when possible
- Use template literals for strings

### HTML/CSS

- Follow existing class naming conventions
- Use Tailwind CSS classes when possible
- Keep styles consistent with existing design
- Ensure responsive design (mobile-first approach)

## 🧪 Testing

### Before Submitting

1. Test on multiple browsers (Chrome, Firefox, Safari, Edge)
2. Test on different screen sizes (mobile, tablet, desktop)
3. Test dark/light mode
4. Test with different HSK levels
5. Verify all features work:
   - Vocabulary browsing
   - Flashcards
   - Quizzes
   - AI tutor
   - Progress tracking
   - Search functionality

### Browser Testing

- Use browser DevTools to check for errors
- Test responsive design using DevTools device emulation
- Check console for JavaScript errors
- Verify localStorage functionality

## 📂 Project Structure

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

## 🎨 Design Guidelines

### Color Scheme

- Primary: Purple/Blue gradient (#667eea to #764ba2)
- Accent: Pink (#f093fb), Cyan (#4facfe), Coral (#f5576c)
- Success: Green
- Warning: Amber/Yellow
- Error: Red

### Typography

- Font: Inter (Google Fonts)
- Headings: Bold and clear
- Body: Readable with good contrast
- Dark mode: Proper contrast ratios

### UI Components

- Cards: Rounded corners (xl/2xl), subtle shadows
- Buttons: Gradient backgrounds, hover effects
- Inputs: Clear borders, focus states
- Modals: Backdrop blur, smooth animations

## 🔒 Security

### API Keys

- Never commit API keys to the repository
- Use `.env.example` for template
- Document required environment variables

### User Data

- All user data stored in localStorage (client-side)
- No server-side data collection
- Clear data on logout (if implemented)

### Input Validation

- Sanitize user inputs before processing
- Validate file uploads (if implemented)
- Prevent XSS attacks

## 📖 Documentation

### Code Comments

- Add comments for complex logic
- Explain non-obvious algorithms
- Document API integrations

### README Updates

- Update README.md for new features
- Update DEPLOYMENT.md for deployment changes
- Keep installation instructions current

## 🤝 Getting Help

### Questions?

1. Check [Issues](../../issues) for existing discussions
2. Check [Pull Requests](../../pulls) for similar changes
3. Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
4. Review existing code for patterns

### Contact

For questions not covered here, please open an issue with the `question` label.

## 🌟 Recognition

Contributors will be acknowledged in the project's contributors section.

Thank you for contributing to XueTong 学通! 🎉
