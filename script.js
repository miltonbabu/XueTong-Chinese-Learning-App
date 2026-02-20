// Global variables
let currentLevel = "hsk1";
let vocabulary = [];
let currentCharIndex = 0;

// Flashcard mode variables - declared at top to avoid temporal dead zone
let flashcardPracticeMode = "character";
let flashcardMode = "sequential";
let currentFlashcardIndex = 0;
let isCardFlipped = false;
let filteredVocabulary = []; // Will hold the filtered/shuffled vocabulary based on mode
let currentFlashcardChar = ""; // Store current word's character for Listen button

// Text-to-speech function for Chinese pronunciation
function speakChinese(text) {
  if ("speechSynthesis" in window) {
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.8; // Slightly slower for learning
    utterance.pitch = 1;

    // Try to find a Chinese voice
    const voices = speechSynthesis.getVoices();
    const chineseVoice = voices.find((voice) => voice.lang.includes("zh"));
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    speechSynthesis.speak(utterance);

    // Track listening activity
    trackListeningActivity(text);
  } else {
    console.warn("Text-to-speech not supported in this browser");
  }
}

function copyVocabWord(char, pinyin, meaning, buttonElement) {
  const textToCopy = `${char} (${pinyin}) - ${meaning}`;

  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      const originalHTML = buttonElement.innerHTML;
      buttonElement.innerHTML = "✓";
      buttonElement.classList.add("bg-green-500");
      buttonElement.classList.remove("bg-gray-500", "hover:bg-gray-600");

      setTimeout(() => {
        buttonElement.innerHTML = originalHTML;
        buttonElement.classList.remove("bg-green-500");
        buttonElement.classList.add("bg-gray-500", "hover:bg-gray-600");
      }, 1500);
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    });
}

function shareVocabWord(char, pinyin, meaning, buttonElement) {
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?share=word&char=${encodeURIComponent(char)}&pinyin=${encodeURIComponent(pinyin)}&meaning=${encodeURIComponent(meaning)}`;

  navigator.clipboard
    .writeText(shareUrl)
    .then(() => {
      const originalHTML = buttonElement.innerHTML;
      buttonElement.innerHTML = "✓";
      buttonElement.classList.add("bg-green-500");
      buttonElement.classList.remove("bg-purple-500", "hover:bg-purple-600");

      setTimeout(() => {
        buttonElement.innerHTML = originalHTML;
        buttonElement.classList.remove("bg-green-500");
        buttonElement.classList.add("bg-purple-500", "hover:bg-purple-600");
      }, 1500);
    })
    .catch((err) => {
      console.error("Failed to copy share link:", err);
      alert("Failed to copy share link");
    });
}

function checkSharedWord() {
  const urlParams = new URLSearchParams(window.location.search);
  const isShared = urlParams.get("share");

  if (isShared === "word") {
    const char = urlParams.get("char");
    const pinyin = urlParams.get("pinyin");
    const meaning = urlParams.get("meaning");

    if (char && pinyin && meaning) {
      showSharedWordPopup(char, pinyin, meaning);
    }
  }
}

function showSharedWordPopup(char, pinyin, meaning) {
  const popup = document.createElement("div");
  popup.id = "sharedWordPopup";
  popup.className =
    "fixed inset-0 z-[10002] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in";

  popup.innerHTML = `
    <div class="relative w-full max-w-md mx-4 transform animate-scale-in">
      <div class="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        <div class="bg-gradient-to-br from-primary-500 to-accent-purple p-8 text-center">
          <button onclick="document.getElementById('sharedWordPopup').remove()" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <div class="text-7xl font-bold text-white mb-3">${char}</div>
          <div class="text-2xl text-white/90 mb-2">${pinyin}</div>
          <div class="text-xl text-white/80">${meaning}</div>
        </div>
        <div class="p-6 space-y-4">
          <div class="text-center">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Learn More Chinese with XueTong!</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">Discover thousands of HSK vocabulary words, interactive flashcards, quizzes, and an AI-powered tutor to help you master Chinese.</p>
          </div>
          <div class="flex gap-3">
            <button onclick="document.getElementById('sharedWordPopup').remove()" class="flex-1 btn-secondary py-3">Close</button>
            <button onclick="document.getElementById('sharedWordPopup').remove(); location.href = window.location.pathname" class="flex-1 btn-primary py-3">Start Learning</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  window.history.replaceState({}, document.title, window.location.pathname);
}

// Track listening activity
function trackListeningActivity(word) {
  // Get current time
  const now = new Date();
  const timestamp = now.toISOString();
  const dateString = now.toDateString();
  const timeString = now.toLocaleTimeString();

  // Add to study log
  userProgress.studyLog.push({
    type: "listen",
    word: word,
    level: currentLevel,
    timestamp: timestamp,
    date: dateString,
    time: timeString,
  });

  // Award points for listening (1 point per listen)
  userProgress.points += 1;

  // Award small amount of XP (0.5 XP per listen, rounded up)
  userProgress.xp += 1;

  // Update streak
  if (userProgress.lastStudyDate !== dateString) {
    userProgress.streak++;
    userProgress.lastStudyDate = dateString;
    updateStreakDisplay();
  }

  // Add word to studied chars set
  userProgress.studiedChars.add(word);

  // Update displays
  updateXPDisplay();
  updatePointsDisplay();

  // Save progress
  saveProgress();
}

// Initialize UI - will be called after all data is loaded
function initializeUI() {
  // Initialize vocabulary for current level
  if (typeof hskVocabulary !== "undefined" && hskVocabulary[currentLevel]) {
    vocabulary = hskVocabulary[currentLevel];
  } else {
    console.error("hskVocabulary not loaded yet");
    vocabulary = [];
  }

  // Update word count for current level
  if (document.getElementById("wordCount")) {
    document.getElementById("wordCount").textContent =
      vocabulary.length + " Words";
  }

  // Update word counts for all HSK levels
  updateAllWordCounts();

  // Hide all word counts initially (only show when level is selected)
  const levels = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"];
  levels.forEach((lvl) => {
    const wordCount = document.getElementById(`wordCount${lvl.toUpperCase()}`);
    if (wordCount) wordCount.classList.add("hidden");
  });

  // Show word count for currently selected level
  const currentLevelWordCount = document.getElementById(
    `wordCount${currentLevel.toUpperCase()}`,
  );
  if (currentLevelWordCount) currentLevelWordCount.classList.remove("hidden");

  // Load theme
  loadTheme();

  // Update user progress displays (streak, points, level, XP)
  updateStreakDisplay();
  updateXPDisplay();
  updatePointsDisplay();

  // Render vocabulary cards (preview mode - first 10 words)
  showAllWordsMode = false;
  if (vocabulary.length > 0) {
    renderVocabCards(false);
  }

  // Initialize flashcard
  resetFlashcards();

  // Initialize flashcard statistics
  updateFlashcardStats();

  // Initialize learn tab
  updateLearnTab();

  // Initialize progress tab
  renderProgressTab();

  // Initialize quiz (prepare quiz settings, don't start automatically)
  // The quiz will be started when user clicks "Start Quiz" button
}
let userProgress = {
  streak: 0,
  points: 0,
  level: 1,
  xp: 0,
  totalCharsLearned: 0,
  studiedChars: new Set(),
  lastStudyDate: null,
  sessionStartTime: Date.now(),
  hskLevels: {
    hsk1: {
      charsLearned: 0,
      quizzesCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
    },
    hsk2: {
      charsLearned: 0,
      quizzesCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
    },
    hsk3: {
      charsLearned: 0,
      quizzesCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
    },
    hsk4: {
      charsLearned: 0,
      quizzesCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
    },
  },
  // Word mastery tracking: stores status for each word (known, learning, new)
  wordMastery: {
    hsk1: {},
    hsk2: {},
    hsk3: {},
    hsk4: {},
    hsk5: {},
    hsk6: {},
  },
  // Study log for tracking study activities with timestamps
  studyLog: [],
};

let achievements = [
  {
    id: "firstChar",
    name: "First Character",
    desc: "Learn your first Chinese character",
    icon: "📝",
    unlocked: false,
  },
  {
    id: "streak3",
    name: "3-Day Streak",
    desc: "Study for 3 consecutive days",
    icon: "🔥",
    unlocked: false,
  },
  {
    id: "level5",
    name: "Level 5",
    desc: "Reach level 5 in the app",
    icon: "📈",
    unlocked: false,
  },
  {
    id: "hsk1Master",
    name: "HSK 1 Master",
    desc: "Learn all HSK 1 vocabulary",
    icon: "🎓",
    unlocked: false,
  },
  {
    id: "quizChampion",
    name: "Quiz Champion",
    desc: "Get 100% on a quiz",
    icon: "🏆",
    unlocked: false,
  },
  {
    id: "vocabHero",
    name: "Vocabulary Hero",
    desc: "Learn 50 characters",
    icon: "💪",
    unlocked: false,
  },
  {
    id: "aiMaster",
    name: "AI Master",
    desc: "Chat with the AI tutor",
    icon: "🤖",
    unlocked: false,
  },
  {
    id: "flashcardPro",
    name: "Flashcard Pro",
    desc: "Complete a flashcard deck",
    icon: "🎴",
    unlocked: false,
  },
  {
    id: "loginBonus",
    name: "Welcome Bonus",
    desc: "Log in to your account",
    icon: "🔐",
    unlocked: false,
  },
  {
    id: "socialButterfly",
    name: "Social Butterfly",
    desc: "Share your progress",
    icon: "🚀",
    unlocked: false,
  },
];

// Flashcard data
const flashcardData = {
  deck: [],
  currentIndex: 0,
  isFlipped: false,
  mode: "random",
  practiceMode: "character",
  cardStatus: {},
};

// Theme toggle functions
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.classList.contains("dark") ? "dark" : "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  if (newTheme === "dark") {
    html.classList.add("dark");
    document.getElementById("themeIcon").textContent = "☀️";
  } else {
    html.classList.remove("dark");
    document.getElementById("themeIcon").textContent = "🌙";
  }

  // Save preference
  localStorage.setItem("theme", newTheme);
}

// Load saved theme
function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").textContent = "☀️";
  } else {
    document.documentElement.classList.remove("dark");
    document.getElementById("themeIcon").textContent = "🌙";
  }
}

// HSK Vocabulary Database
// HSK Vocabulary Database
// HSK Vocabulary Database
const hskVocabulary = {
  hsk1: [
    {
      char: "爱",
      pinyin: "ài",
      meaning: "to love",
      breakdown: "爱 (ài) - to love",
    },
    {
      char: "八",
      pinyin: "bā",
      meaning: "eight",
      breakdown: "八 (bā) - eight",
    },
    {
      char: "爸爸",
      pinyin: "bà ba",
      meaning: "(informal) father",
      breakdown: "爸爸 (bà ba) - (informal) father",
    },
    {
      char: "杯子",
      pinyin: "bēi zi",
      meaning: "cup",
      breakdown: "杯子 (bēi zi) - cup",
    },
    {
      char: "北京",
      pinyin: "Běi jīng",
      meaning: "Beijing",
      breakdown: "北京 (Běi jīng) - Beijing",
    },
    {
      char: "本",
      pinyin: "běn",
      meaning: "roots or stems of plants",
      breakdown: "本 (běn) - roots or stems of plants",
    },
    {
      char: "不客气",
      pinyin: "bù kè qi",
      meaning: "you're welcome",
      breakdown: "不客气 (bù kè qi) - you're welcome",
    },
    {
      char: "不",
      pinyin: "bù",
      meaning: "(negative prefix)",
      breakdown: "不 (bù) - (negative prefix)",
    },
    {
      char: "菜",
      pinyin: "cài",
      meaning: "dish (type of food)",
      breakdown: "菜 (cài) - dish (type of food)",
    },
    { char: "茶", pinyin: "chá", meaning: "tea", breakdown: "茶 (chá) - tea" },
    {
      char: "吃",
      pinyin: "chī",
      meaning: "to eat",
      breakdown: "吃 (chī) - to eat",
    },
    {
      char: "出租车",
      pinyin: "chū zū chē",
      meaning: "taxi",
      breakdown: "出租车 (chū zū chē) - taxi",
    },
    {
      char: "打电话",
      pinyin: "dǎ diàn huà",
      meaning: "to make a telephone call",
      breakdown: "打电话 (dǎ diàn huà) - to make a telephone call",
    },
    { char: "大", pinyin: "dà", meaning: "big", breakdown: "大 (dà) - big" },
    { char: "的", pinyin: "de", meaning: "of", breakdown: "的 (de) - of" },
    {
      char: "点",
      pinyin: "diǎn",
      meaning: "point",
      breakdown: "点 (diǎn) - point",
    },
    {
      char: "电脑",
      pinyin: "diàn nǎo",
      meaning: "computer",
      breakdown: "电脑 (diàn nǎo) - computer",
    },
    {
      char: "电视",
      pinyin: "diàn shì",
      meaning: "television",
      breakdown: "电视 (diàn shì) - television",
    },
    {
      char: "电影",
      pinyin: "diàn yǐng",
      meaning: "movie",
      breakdown: "电影 (diàn yǐng) - movie",
    },
    {
      char: "东西",
      pinyin: "dōng xi",
      meaning: "thing",
      breakdown: "东西 (dōng xi) - thing",
    },
    { char: "都", pinyin: "dōu", meaning: "all", breakdown: "都 (dōu) - all" },
    {
      char: "读",
      pinyin: "dú",
      meaning: "to read",
      breakdown: "读 (dú) - to read",
    },
    {
      char: "对不起",
      pinyin: "duì bu qǐ",
      meaning: "unworthy",
      breakdown: "对不起 (duì bu qǐ) - unworthy",
    },
    {
      char: "多",
      pinyin: "duō",
      meaning: "many",
      breakdown: "多 (duō) - many",
    },
    {
      char: "多少",
      pinyin: "duō shao",
      meaning: "how much",
      breakdown: "多少 (duō shao) - how much",
    },
    {
      char: "儿子",
      pinyin: "ér zi",
      meaning: "son",
      breakdown: "儿子 (ér zi) - son",
    },
    { char: "二", pinyin: "èr", meaning: "two", breakdown: "二 (èr) - two" },
    {
      char: "饭馆",
      pinyin: "fàn guǎn",
      meaning: "restaurant",
      breakdown: "饭馆 (fàn guǎn) - restaurant",
    },
    {
      char: "飞机",
      pinyin: "fēi jī",
      meaning: "airplane",
      breakdown: "飞机 (fēi jī) - airplane",
    },
    {
      char: "分钟",
      pinyin: "fēn zhōng",
      meaning: "minute",
      breakdown: "分钟 (fēn zhōng) - minute",
    },
    {
      char: "高兴",
      pinyin: "gāo xìng",
      meaning: "happy",
      breakdown: "高兴 (gāo xìng) - happy",
    },
    {
      char: "个",
      pinyin: "gè",
      meaning: "variant of 個|个[gè]",
      breakdown: "个 (gè) - variant of 個|个[gè]",
    },
    {
      char: "工作",
      pinyin: "gōng zuò",
      meaning: "to work",
      breakdown: "工作 (gōng zuò) - to work",
    },
    { char: "狗", pinyin: "gǒu", meaning: "dog", breakdown: "狗 (gǒu) - dog" },
    {
      char: "汉语",
      pinyin: "Hàn yǔ",
      meaning: "Chinese language",
      breakdown: "汉语 (Hàn yǔ) - Chinese language",
    },
    {
      char: "好",
      pinyin: "hǎo",
      meaning: "good",
      breakdown: "好 (hǎo) - good",
    },
    {
      char: "喝",
      pinyin: "hē",
      meaning: "to drink",
      breakdown: "喝 (hē) - to drink",
    },
    { char: "和", pinyin: "hé", meaning: "and", breakdown: "和 (hé) - and" },
    {
      char: "很",
      pinyin: "hěn",
      meaning: "(adverb of degree)",
      breakdown: "很 (hěn) - (adverb of degree)",
    },
    {
      char: "后面",
      pinyin: "hòu mian",
      meaning: "rear",
      breakdown: "后面 (hòu mian) - rear",
    },
    {
      char: "回",
      pinyin: "huí",
      meaning: "to curve",
      breakdown: "回 (huí) - to curve",
    },
    { char: "会", pinyin: "huì", meaning: "can", breakdown: "会 (huì) - can" },
    {
      char: "火车站",
      pinyin: "huǒ chē zhàn",
      meaning: "train station",
      breakdown: "火车站 (huǒ chē zhàn) - train station",
    },
    {
      char: "几",
      pinyin: "jǐ",
      meaning: "how much",
      breakdown: "几 (jǐ) - how much",
    },
    {
      char: "家",
      pinyin: "jiā",
      meaning: "home",
      breakdown: "家 (jiā) - home",
    },
    {
      char: "叫",
      pinyin: "jiào",
      meaning: "to shout",
      breakdown: "叫 (jiào) - to shout",
    },
    {
      char: "今天",
      pinyin: "jīn tiān",
      meaning: "today",
      breakdown: "今天 (jīn tiān) - today",
    },
    {
      char: "九",
      pinyin: "jiǔ",
      meaning: "nine",
      breakdown: "九 (jiǔ) - nine",
    },
    {
      char: "开",
      pinyin: "kāi",
      meaning: "to open",
      breakdown: "开 (kāi) - to open",
    },
    {
      char: "看",
      pinyin: "kàn",
      meaning: "to see",
      breakdown: "看 (kàn) - to see",
    },
    {
      char: "看见",
      pinyin: "kàn jiàn",
      meaning: "to see",
      breakdown: "看见 (kàn jiàn) - to see",
    },
    {
      char: "块",
      pinyin: "kuài",
      meaning: "lump (of earth)",
      breakdown: "块 (kuài) - lump (of earth)",
    },
    {
      char: "来",
      pinyin: "lái",
      meaning: "to come",
      breakdown: "来 (lái) - to come",
    },
    {
      char: "老师",
      pinyin: "lǎo shī",
      meaning: "teacher",
      breakdown: "老师 (lǎo shī) - teacher",
    },
    {
      char: "了",
      pinyin: "le",
      meaning: "(modal particle intensifying preceding clause)",
      breakdown: "了 (le) - (modal particle intensifying preceding clause)",
    },
    {
      char: "冷",
      pinyin: "lěng",
      meaning: "cold",
      breakdown: "冷 (lěng) - cold",
    },
    {
      char: "里",
      pinyin: "lǐ",
      meaning: "li (Chinese mile)",
      breakdown: "里 (lǐ) - li (Chinese mile)",
    },
    {
      char: "零",
      pinyin: "líng",
      meaning: "zero",
      breakdown: "零 (líng) - zero",
    },
    { char: "六", pinyin: "liù", meaning: "six", breakdown: "六 (liù) - six" },
    {
      char: "妈妈",
      pinyin: "mā ma",
      meaning: "mama",
      breakdown: "妈妈 (mā ma) - mama",
    },
    {
      char: "吗",
      pinyin: "ma",
      meaning: "(question tag)",
      breakdown: "吗 (ma) - (question tag)",
    },
    {
      char: "买",
      pinyin: "mǎi",
      meaning: "to buy",
      breakdown: "买 (mǎi) - to buy",
    },
    { char: "猫", pinyin: "māo", meaning: "cat", breakdown: "猫 (māo) - cat" },
    {
      char: "没",
      pinyin: "méi",
      meaning: "(negative prefix for verbs)",
      breakdown: "没 (méi) - (negative prefix for verbs)",
    },
    {
      char: "没关系",
      pinyin: "méi guān xi",
      meaning: "it doesn't matter",
      breakdown: "没关系 (méi guān xi) - it doesn't matter",
    },
    {
      char: "米饭",
      pinyin: "mǐ fàn",
      meaning: "(cooked) rice",
      breakdown: "米饭 (mǐ fàn) - (cooked) rice",
    },
    {
      char: "明天",
      pinyin: "míng tiān",
      meaning: "tomorrow",
      breakdown: "明天 (míng tiān) - tomorrow",
    },
    {
      char: "名字",
      pinyin: "míng zi",
      meaning: "name (of a person or thing)",
      breakdown: "名字 (míng zi) - name (of a person or thing)",
    },
    { char: "哪", pinyin: "nǎ", meaning: "how", breakdown: "哪 (nǎ) - how" },
    { char: "那", pinyin: "nà", meaning: "that", breakdown: "那 (nà) - that" },
    {
      char: "呢",
      pinyin: "ne",
      meaning:
        "particle indicating that a previously asked question is to be applied to the preceding word ('What about ...?')",
      breakdown:
        "呢 (ne) - particle indicating that a previously asked question is to be applied to the preceding word ('What about ...?')",
    },
    {
      char: "能",
      pinyin: "néng",
      meaning: "to be able to",
      breakdown: "能 (néng) - to be able to",
    },
    {
      char: "你",
      pinyin: "nǐ",
      meaning: "you (informal)",
      breakdown: "你 (nǐ) - you (informal)",
    },
    {
      char: "年",
      pinyin: "nián",
      meaning: "year",
      breakdown: "年 (nián) - year",
    },
    {
      char: "女儿",
      pinyin: "nǚ ér",
      meaning: "daughter",
      breakdown: "女儿 (nǚ ér) - daughter",
    },
    {
      char: "朋友",
      pinyin: "péng you",
      meaning: "friend",
      breakdown: "朋友 (péng you) - friend",
    },
    {
      char: "漂亮",
      pinyin: "piào liang",
      meaning: "pretty",
      breakdown: "漂亮 (piào liang) - pretty",
    },
    {
      char: "苹果",
      pinyin: "píng guǒ",
      meaning: "apple",
      breakdown: "苹果 (píng guǒ) - apple",
    },
    {
      char: "七",
      pinyin: "qī",
      meaning: "seven",
      breakdown: "七 (qī) - seven",
    },
    {
      char: "钱",
      pinyin: "qián",
      meaning: "coin",
      breakdown: "钱 (qián) - coin",
    },
    {
      char: "前面",
      pinyin: "qián miàn",
      meaning: "ahead",
      breakdown: "前面 (qián miàn) - ahead",
    },
    {
      char: "请",
      pinyin: "qǐng",
      meaning: "to ask",
      breakdown: "请 (qǐng) - to ask",
    },
    {
      char: "去",
      pinyin: "qù",
      meaning: "to go",
      breakdown: "去 (qù) - to go",
    },
    {
      char: "热",
      pinyin: "rè",
      meaning: "to warm up",
      breakdown: "热 (rè) - to warm up",
    },
    { char: "人", pinyin: "rén", meaning: "man", breakdown: "人 (rén) - man" },
    {
      char: "认识",
      pinyin: "rèn shi",
      meaning: "to know",
      breakdown: "认识 (rèn shi) - to know",
    },
    { char: "日", pinyin: "rì", meaning: "sun", breakdown: "日 (rì) - sun" },
    {
      char: "三",
      pinyin: "sān",
      meaning: "three",
      breakdown: "三 (sān) - three",
    },
    {
      char: "商店",
      pinyin: "shāng diàn",
      meaning: "store",
      breakdown: "商店 (shāng diàn) - store",
    },
    {
      char: "上",
      pinyin: "shàng",
      meaning: "on top",
      breakdown: "上 (shàng) - on top",
    },
    {
      char: "上午",
      pinyin: "shàng wǔ",
      meaning: "morning",
      breakdown: "上午 (shàng wǔ) - morning",
    },
    {
      char: "少",
      pinyin: "shǎo",
      meaning: "few",
      breakdown: "少 (shǎo) - few",
    },
    {
      char: "谁",
      pinyin: "shéi",
      meaning: "who",
      breakdown: "谁 (shéi) - who",
    },
    {
      char: "什么",
      pinyin: "shén me",
      meaning: "what?",
      breakdown: "什么 (shén me) - what?",
    },
    { char: "十", pinyin: "shí", meaning: "ten", breakdown: "十 (shí) - ten" },
    {
      char: "时候",
      pinyin: "shí hou",
      meaning: "time",
      breakdown: "时候 (shí hou) - time",
    },
    { char: "是", pinyin: "shì", meaning: "is", breakdown: "是 (shì) - is" },
    {
      char: "书",
      pinyin: "shū",
      meaning: "book",
      breakdown: "书 (shū) - book",
    },
    {
      char: "水",
      pinyin: "shuǐ",
      meaning: "water",
      breakdown: "水 (shuǐ) - water",
    },
    {
      char: "水果",
      pinyin: "shuǐ guǒ",
      meaning: "fruit",
      breakdown: "水果 (shuǐ guǒ) - fruit",
    },
    {
      char: "睡觉",
      pinyin: "shuì jiào",
      meaning: "to go to bed",
      breakdown: "睡觉 (shuì jiào) - to go to bed",
    },
    {
      char: "说话",
      pinyin: "shuō huà",
      meaning: "to speak",
      breakdown: "说话 (shuō huà) - to speak",
    },
    { char: "四", pinyin: "sì", meaning: "four", breakdown: "四 (sì) - four" },
    {
      char: "岁",
      pinyin: "suì",
      meaning: "classifier for years (of age)",
      breakdown: "岁 (suì) - classifier for years (of age)",
    },
    {
      char: "他",
      pinyin: "tā",
      meaning: "he or him",
      breakdown: "他 (tā) - he or him",
    },
    { char: "她", pinyin: "tā", meaning: "she", breakdown: "她 (tā) - she" },
    {
      char: "太",
      pinyin: "tài",
      meaning: "highest",
      breakdown: "太 (tài) - highest",
    },
    {
      char: "天气",
      pinyin: "tiān qì",
      meaning: "weather",
      breakdown: "天气 (tiān qì) - weather",
    },
    {
      char: "听",
      pinyin: "tīng",
      meaning: "to listen",
      breakdown: "听 (tīng) - to listen",
    },
    {
      char: "同学",
      pinyin: "tóng xué",
      meaning: "to study at the same school",
      breakdown: "同学 (tóng xué) - to study at the same school",
    },
    {
      char: "喂",
      pinyin: "wèi",
      meaning: "to feed",
      breakdown: "喂 (wèi) - to feed",
    },
    { char: "我", pinyin: "wǒ", meaning: "I", breakdown: "我 (wǒ) - I" },
    {
      char: "我们",
      pinyin: "wǒ men",
      meaning: "we",
      breakdown: "我们 (wǒ men) - we",
    },
    { char: "五", pinyin: "wǔ", meaning: "five", breakdown: "五 (wǔ) - five" },
    {
      char: "喜欢",
      pinyin: "xǐ huan",
      meaning: "to like",
      breakdown: "喜欢 (xǐ huan) - to like",
    },
    {
      char: "下",
      pinyin: "xià",
      meaning: "down",
      breakdown: "下 (xià) - down",
    },
    {
      char: "下午",
      pinyin: "xià wǔ",
      meaning: "afternoon",
      breakdown: "下午 (xià wǔ) - afternoon",
    },
    {
      char: "下雨",
      pinyin: "xià yǔ",
      meaning: "to rain",
      breakdown: "下雨 (xià yǔ) - to rain",
    },
    {
      char: "先生",
      pinyin: "xiān sheng",
      meaning: "teacher",
      breakdown: "先生 (xiān sheng) - teacher",
    },
    {
      char: "现在",
      pinyin: "xiàn zài",
      meaning: "now",
      breakdown: "现在 (xiàn zài) - now",
    },
    {
      char: "想",
      pinyin: "xiǎng",
      meaning: "to think",
      breakdown: "想 (xiǎng) - to think",
    },
    {
      char: "小",
      pinyin: "xiǎo",
      meaning: "small",
      breakdown: "小 (xiǎo) - small",
    },
    {
      char: "小姐",
      pinyin: "xiǎo jie",
      meaning: "young lady",
      breakdown: "小姐 (xiǎo jie) - young lady",
    },
    {
      char: "些",
      pinyin: "xiē",
      meaning: "some",
      breakdown: "些 (xiē) - some",
    },
    {
      char: "写",
      pinyin: "xiě",
      meaning: "to write",
      breakdown: "写 (xiě) - to write",
    },
    {
      char: "谢谢",
      pinyin: "xiè xie",
      meaning: "to thank",
      breakdown: "谢谢 (xiè xie) - to thank",
    },
    {
      char: "星期",
      pinyin: "xīng qī",
      meaning: "week",
      breakdown: "星期 (xīng qī) - week",
    },
    {
      char: "学生",
      pinyin: "xué sheng",
      meaning: "student",
      breakdown: "学生 (xué sheng) - student",
    },
    {
      char: "学习",
      pinyin: "xué xí",
      meaning: "to learn",
      breakdown: "学习 (xué xí) - to learn",
    },
    {
      char: "学校",
      pinyin: "xué xiào",
      meaning: "school",
      breakdown: "学校 (xué xiào) - school",
    },
    { char: "一", pinyin: "yī", meaning: "one", breakdown: "一 (yī) - one" },
    {
      char: "衣服",
      pinyin: "yī fu",
      meaning: "clothes",
      breakdown: "衣服 (yī fu) - clothes",
    },
    {
      char: "医生",
      pinyin: "yī shēng",
      meaning: "doctor",
      breakdown: "医生 (yī shēng) - doctor",
    },
    {
      char: "医院",
      pinyin: "yī yuàn",
      meaning: "hospital",
      breakdown: "医院 (yī yuàn) - hospital",
    },
    {
      char: "椅子",
      pinyin: "yǐ zi",
      meaning: "chair",
      breakdown: "椅子 (yǐ zi) - chair",
    },
    {
      char: "有",
      pinyin: "yǒu",
      meaning: "to have",
      breakdown: "有 (yǒu) - to have",
    },
    {
      char: "月",
      pinyin: "yuè",
      meaning: "moon",
      breakdown: "月 (yuè) - moon",
    },
    {
      char: "在",
      pinyin: "zài",
      meaning: "(located) at",
      breakdown: "在 (zài) - (located) at",
    },
    {
      char: "再见",
      pinyin: "zài jiàn",
      meaning: "goodbye",
      breakdown: "再见 (zài jiàn) - goodbye",
    },
    {
      char: "怎么",
      pinyin: "zěn me",
      meaning: "variant of 怎麼|怎么[zěn me]",
      breakdown: "怎么 (zěn me) - variant of 怎麼|怎么[zěn me]",
    },
    {
      char: "怎么样",
      pinyin: "zěn me yàng",
      meaning: "how?",
      breakdown: "怎么样 (zěn me yàng) - how?",
    },
    {
      char: "这",
      pinyin: "zhè",
      meaning: "this",
      breakdown: "这 (zhè) - this",
    },
    {
      char: "中国",
      pinyin: "Zhōng guó",
      meaning: "China",
      breakdown: "中国 (Zhōng guó) - China",
    },
    {
      char: "中午",
      pinyin: "zhōng wǔ",
      meaning: "noon",
      breakdown: "中午 (zhōng wǔ) - noon",
    },
    {
      char: "住",
      pinyin: "zhù",
      meaning: "to live",
      breakdown: "住 (zhù) - to live",
    },
    {
      char: "桌子",
      pinyin: "zhuō zi",
      meaning: "table",
      breakdown: "桌子 (zhuō zi) - table",
    },
    {
      char: "字",
      pinyin: "zì",
      meaning: "letter",
      breakdown: "字 (zì) - letter",
    },
    {
      char: "昨天",
      pinyin: "zuó tiān",
      meaning: "yesterday",
      breakdown: "昨天 (zuó tiān) - yesterday",
    },
    {
      char: "坐",
      pinyin: "zuò",
      meaning: "to sit",
      breakdown: "坐 (zuò) - to sit",
    },
  ],
  hsk2: [
    {
      char: "吧",
      pinyin: "ba",
      meaning: "(modal particle indicating suggestion or surmise)",
      breakdown: "吧 (ba) - (modal particle indicating suggestion or surmise)",
    },
    {
      char: "白",
      pinyin: "bái",
      meaning: "white",
      breakdown: "白 (bái) - white",
    },
    {
      char: "百",
      pinyin: "bǎi",
      meaning: "hundred",
      breakdown: "百 (bǎi) - hundred",
    },
    {
      char: "帮助",
      pinyin: "bāng zhù",
      meaning: "assistance",
      breakdown: "帮助 (bāng zhù) - assistance",
    },
    {
      char: "报纸",
      pinyin: "bào zhǐ",
      meaning: "newspaper",
      breakdown: "报纸 (bào zhǐ) - newspaper",
    },
    {
      char: "比",
      pinyin: "bǐ",
      meaning: "(particle used for comparison and 'er than')",
      breakdown: "比 (bǐ) - (particle used for comparison and 'er than')",
    },
    {
      char: "别",
      pinyin: "bié",
      meaning: "to leave",
      breakdown: "别 (bié) - to leave",
    },
    {
      char: "长",
      pinyin: "cháng",
      meaning: "length",
      breakdown: "长 (cháng) - length",
    },
    {
      char: "唱歌",
      pinyin: "chàng gē",
      meaning: "to sing a song",
      breakdown: "唱歌 (chàng gē) - to sing a song",
    },
    {
      char: "出",
      pinyin: "chū",
      meaning: "to go out",
      breakdown: "出 (chū) - to go out",
    },
    {
      char: "穿",
      pinyin: "chuān",
      meaning: "to bore through",
      breakdown: "穿 (chuān) - to bore through",
    },
    {
      char: "船",
      pinyin: "chuán",
      meaning: "a boat",
      breakdown: "船 (chuán) - a boat",
    },
    {
      char: "次",
      pinyin: "cì",
      meaning: "next in sequence",
      breakdown: "次 (cì) - next in sequence",
    },
    {
      char: "从",
      pinyin: "cóng",
      meaning: "from",
      breakdown: "从 (cóng) - from",
    },
    {
      char: "错",
      pinyin: "cuò",
      meaning: "mistake",
      breakdown: "错 (cuò) - mistake",
    },
    {
      char: "打篮球",
      pinyin: "dá lán qiú",
      meaning: "Play basketball",
      breakdown: "打篮球 (dá lán qiú) - Play basketball",
    },
    {
      char: "大家",
      pinyin: "dà jiā",
      meaning: "everyone",
      breakdown: "大家 (dà jiā) - everyone",
    },
    {
      char: "但是",
      pinyin: "dàn shì",
      meaning: "but",
      breakdown: "但是 (dàn shì) - but",
    },
    {
      char: "到",
      pinyin: "dào",
      meaning: "to (a place)",
      breakdown: "到 (dào) - to (a place)",
    },
    {
      char: "得",
      pinyin: "de",
      meaning:
        "structural particle: used after a verb (or adjective as main verb)",
      breakdown:
        "得 (de) - structural particle: used after a verb (or adjective as main verb)",
    },
    {
      char: "得",
      pinyin: "děi",
      meaning: "to have to",
      breakdown: "得 (děi) - to have to",
    },
    {
      char: "弟弟",
      pinyin: "dì di",
      meaning: "younger brother",
      breakdown: "弟弟 (dì di) - younger brother",
    },
    {
      char: "第一",
      pinyin: "dì yī",
      meaning: "first",
      breakdown: "第一 (dì yī) - first",
    },
    {
      char: "懂",
      pinyin: "dǒng",
      meaning: "to understand",
      breakdown: "懂 (dǒng) - to understand",
    },
    {
      char: "房间",
      pinyin: "fáng jiān",
      meaning: "room",
      breakdown: "房间 (fáng jiān) - room",
    },
    {
      char: "非常",
      pinyin: "fēi cháng",
      meaning: "unusual",
      breakdown: "非常 (fēi cháng) - unusual",
    },
    {
      char: "服务员",
      pinyin: "fú wù yuán",
      meaning: "waiter",
      breakdown: "服务员 (fú wù yuán) - waiter",
    },
    {
      char: "高",
      pinyin: "gāo",
      meaning: "high",
      breakdown: "高 (gāo) - high",
    },
    {
      char: "告诉",
      pinyin: "gào su",
      meaning: "to tell",
      breakdown: "告诉 (gào su) - to tell",
    },
    {
      char: "哥哥",
      pinyin: "gē ge",
      meaning: "older brother",
      breakdown: "哥哥 (gē ge) - older brother",
    },
    { char: "给", pinyin: "gěi", meaning: "to", breakdown: "给 (gěi) - to" },
    {
      char: "公共汽车",
      pinyin: "gōng gòng qì chē",
      meaning: "bus",
      breakdown: "公共汽车 (gōng gòng qì chē) - bus",
    },
    {
      char: "公斤",
      pinyin: "gōng jīn",
      meaning: "kilogram (kg)",
      breakdown: "公斤 (gōng jīn) - kilogram (kg)",
    },
    {
      char: "公司",
      pinyin: "gōng sī",
      meaning: "(business) company",
      breakdown: "公司 (gōng sī) - (business) company",
    },
    {
      char: "贵",
      pinyin: "guì",
      meaning: "expensive",
      breakdown: "贵 (guì) - expensive",
    },
    {
      char: "还",
      pinyin: "hái",
      meaning: "still",
      breakdown: "还 (hái) - still",
    },
    {
      char: "孩子",
      pinyin: "hái zi",
      meaning: "child",
      breakdown: "孩子 (hái zi) - child",
    },
    {
      char: "好吃",
      pinyin: "hǎo chī",
      meaning: "tasty",
      breakdown: "好吃 (hǎo chī) - tasty",
    },
    {
      char: "号",
      pinyin: "hào",
      meaning: "ordinal number",
      breakdown: "号 (hào) - ordinal number",
    },
    {
      char: "黑",
      pinyin: "hēi",
      meaning: "black",
      breakdown: "黑 (hēi) - black",
    },
    {
      char: "红",
      pinyin: "hóng",
      meaning: "red",
      breakdown: "红 (hóng) - red",
    },
    {
      char: "欢迎",
      pinyin: "huān yíng",
      meaning: "to welcome",
      breakdown: "欢迎 (huān yíng) - to welcome",
    },
    {
      char: "还",
      pinyin: "huán",
      meaning: "to pay back",
      breakdown: "还 (huán) - to pay back",
    },
    {
      char: "回答",
      pinyin: "huí dá",
      meaning: "to reply",
      breakdown: "回答 (huí dá) - to reply",
    },
    {
      char: "机场",
      pinyin: "jī chǎng",
      meaning: "airport",
      breakdown: "机场 (jī chǎng) - airport",
    },
    {
      char: "鸡蛋",
      pinyin: "jī dàn",
      meaning: "(chicken) egg",
      breakdown: "鸡蛋 (jī dàn) - (chicken) egg",
    },
    {
      char: "件",
      pinyin: "jiàn",
      meaning: "item",
      breakdown: "件 (jiàn) - item",
    },
    {
      char: "教室",
      pinyin: "jiào shì",
      meaning: "classroom",
      breakdown: "教室 (jiào shì) - classroom",
    },
    {
      char: "姐姐",
      pinyin: "jiě jie",
      meaning: "older sister",
      breakdown: "姐姐 (jiě jie) - older sister",
    },
    {
      char: "介绍",
      pinyin: "jiè shào",
      meaning: "to introduce (sb to sb)",
      breakdown: "介绍 (jiè shào) - to introduce (sb to sb)",
    },
    {
      char: "进",
      pinyin: "jìn",
      meaning: "to advance",
      breakdown: "进 (jìn) - to advance",
    },
    {
      char: "近",
      pinyin: "jìn",
      meaning: "near",
      breakdown: "近 (jìn) - near",
    },
    {
      char: "就",
      pinyin: "jiù",
      meaning: "at once",
      breakdown: "就 (jiù) - at once",
    },
    {
      char: "觉得",
      pinyin: "jué de",
      meaning: "to think",
      breakdown: "觉得 (jué de) - to think",
    },
    {
      char: "咖啡",
      pinyin: "kā fēi",
      meaning: "coffee",
      breakdown: "咖啡 (kā fēi) - coffee",
    },
    {
      char: "开始",
      pinyin: "kāi shǐ",
      meaning: "to begin",
      breakdown: "开始 (kāi shǐ) - to begin",
    },
    {
      char: "考试",
      pinyin: "kǎo shì",
      meaning: "to take an exam",
      breakdown: "考试 (kǎo shì) - to take an exam",
    },
    {
      char: "可能",
      pinyin: "kě néng",
      meaning: "might (happen)",
      breakdown: "可能 (kě néng) - might (happen)",
    },
    {
      char: "可以",
      pinyin: "kě yǐ",
      meaning: "can",
      breakdown: "可以 (kě yǐ) - can",
    },
    {
      char: "课",
      pinyin: "kè",
      meaning: "subject",
      breakdown: "课 (kè) - subject",
    },
    {
      char: "快",
      pinyin: "kuài",
      meaning: "rapid",
      breakdown: "快 (kuài) - rapid",
    },
    {
      char: "快乐",
      pinyin: "kuài lè",
      meaning: "happy",
      breakdown: "快乐 (kuài lè) - happy",
    },
    {
      char: "累",
      pinyin: "lèi",
      meaning: "tired",
      breakdown: "累 (lèi) - tired",
    },
    {
      char: "离",
      pinyin: "lí",
      meaning: "to leave",
      breakdown: "离 (lí) - to leave",
    },
    {
      char: "两",
      pinyin: "liǎng",
      meaning: "both",
      breakdown: "两 (liǎng) - both",
    },
    { char: "路", pinyin: "lù", meaning: "road", breakdown: "路 (lù) - road" },
    {
      char: "旅游",
      pinyin: "lǚ yóu",
      meaning: "trip",
      breakdown: "旅游 (lǚ yóu) - trip",
    },
    {
      char: "卖",
      pinyin: "mài",
      meaning: "to sell",
      breakdown: "卖 (mài) - to sell",
    },
    {
      char: "慢",
      pinyin: "màn",
      meaning: "slow",
      breakdown: "慢 (màn) - slow",
    },
    {
      char: "忙",
      pinyin: "máng",
      meaning: "busy",
      breakdown: "忙 (máng) - busy",
    },
    {
      char: "每",
      pinyin: "měi",
      meaning: "each",
      breakdown: "每 (měi) - each",
    },
    {
      char: "妹妹",
      pinyin: "mèi mei",
      meaning: "younger sister",
      breakdown: "妹妹 (mèi mei) - younger sister",
    },
    {
      char: "门",
      pinyin: "mén",
      meaning: "gate",
      breakdown: "门 (mén) - gate",
    },
    {
      char: "男人",
      pinyin: "nán rén",
      meaning: "a man",
      breakdown: "男人 (nán rén) - a man",
    },
    {
      char: "您",
      pinyin: "nín",
      meaning: "you (courteous)",
      breakdown: "您 (nín) - you (courteous)",
    },
    {
      char: "牛奶",
      pinyin: "niú nǎi",
      meaning: "cow's milk",
      breakdown: "牛奶 (niú nǎi) - cow's milk",
    },
    {
      char: "女人",
      pinyin: "nǚ rén",
      meaning: "woman",
      breakdown: "女人 (nǚ rén) - woman",
    },
    {
      char: "旁边",
      pinyin: "páng biān",
      meaning: "lateral",
      breakdown: "旁边 (páng biān) - lateral",
    },
    {
      char: "跑步",
      pinyin: "pǎo bù",
      meaning: "to walk quickly",
      breakdown: "跑步 (pǎo bù) - to walk quickly",
    },
    {
      char: "便宜",
      pinyin: "pián yi",
      meaning: "small advantages",
      breakdown: "便宜 (pián yi) - small advantages",
    },
    {
      char: "票",
      pinyin: "piào",
      meaning: "ticket",
      breakdown: "票 (piào) - ticket",
    },
    {
      char: "妻子",
      pinyin: "qī zi",
      meaning: "wife",
      breakdown: "妻子 (qī zi) - wife",
    },
    {
      char: "起床",
      pinyin: "qǐ chuáng",
      meaning: "to get out of bed",
      breakdown: "起床 (qǐ chuáng) - to get out of bed",
    },
    {
      char: "千",
      pinyin: "qiān",
      meaning: "a swing",
      breakdown: "千 (qiān) - a swing",
    },
    {
      char: "晴",
      pinyin: "qíng",
      meaning: "clear",
      breakdown: "晴 (qíng) - clear",
    },
    {
      char: "去年",
      pinyin: "qù nián",
      meaning: "last year",
      breakdown: "去年 (qù nián) - last year",
    },
    {
      char: "让",
      pinyin: "ràng",
      meaning: "to yield",
      breakdown: "让 (ràng) - to yield",
    },
    {
      char: "上班",
      pinyin: "shàng bān",
      meaning: "to go to work",
      breakdown: "上班 (shàng bān) - to go to work",
    },
    {
      char: "身体",
      pinyin: "shēn tǐ",
      meaning: "(human) body",
      breakdown: "身体 (shēn tǐ) - (human) body",
    },
    {
      char: "生病",
      pinyin: "shēng bìng",
      meaning: "to fall ill",
      breakdown: "生病 (shēng bìng) - to fall ill",
    },
    {
      char: "生日",
      pinyin: "shēng rì",
      meaning: "birthday",
      breakdown: "生日 (shēng rì) - birthday",
    },
    {
      char: "时间",
      pinyin: "shí jiān",
      meaning: "time",
      breakdown: "时间 (shí jiān) - time",
    },
    {
      char: "事情",
      pinyin: "shì qing",
      meaning: "affair",
      breakdown: "事情 (shì qing) - affair",
    },
    {
      char: "手表",
      pinyin: "shǒu biǎo",
      meaning: "wrist watch",
      breakdown: "手表 (shǒu biǎo) - wrist watch",
    },
    {
      char: "手机",
      pinyin: "shǒu jī",
      meaning: "cell phone",
      breakdown: "手机 (shǒu jī) - cell phone",
    },
    {
      char: "送",
      pinyin: "sòng",
      meaning: "to deliver",
      breakdown: "送 (sòng) - to deliver",
    },
    {
      char: "所以",
      pinyin: "suǒ yǐ",
      meaning: "therefore",
      breakdown: "所以 (suǒ yǐ) - therefore",
    },
    { char: "它", pinyin: "tā", meaning: "it", breakdown: "它 (tā) - it" },
    {
      char: "踢",
      pinyin: "tī",
      meaning: "to kick",
      breakdown: "踢 (tī) - to kick",
    },
    {
      char: "题",
      pinyin: "tí",
      meaning: "topic",
      breakdown: "题 (tí) - topic",
    },
    {
      char: "跳舞",
      pinyin: "tiào wǔ",
      meaning: "to dance",
      breakdown: "跳舞 (tiào wǔ) - to dance",
    },
    {
      char: "外",
      pinyin: "wài",
      meaning: "outside",
      breakdown: "外 (wài) - outside",
    },
    {
      char: "完",
      pinyin: "wán",
      meaning: "to finish",
      breakdown: "完 (wán) - to finish",
    },
    { char: "玩", pinyin: "wán", meaning: "toy", breakdown: "玩 (wán) - toy" },
    {
      char: "晚上",
      pinyin: "wǎn shang",
      meaning: "evening",
      breakdown: "晚上 (wǎn shang) - evening",
    },
    {
      char: "为",
      pinyin: "wèi",
      meaning: "variant of 為|为",
      breakdown: "为 (wèi) - variant of 為|为",
    },
    {
      char: "问",
      pinyin: "wèn",
      meaning: "to ask",
      breakdown: "问 (wèn) - to ask",
    },
    {
      char: "问题",
      pinyin: "wèn tí",
      meaning: "question",
      breakdown: "问题 (wèn tí) - question",
    },
    {
      char: "西瓜",
      pinyin: "xī guā",
      meaning: "watermelon",
      breakdown: "西瓜 (xī guā) - watermelon",
    },
    {
      char: "希望",
      pinyin: "xī wàng",
      meaning: "to wish for",
      breakdown: "希望 (xī wàng) - to wish for",
    },
    {
      char: "洗",
      pinyin: "xǐ",
      meaning: "to wash",
      breakdown: "洗 (xǐ) - to wash",
    },
    {
      char: "向",
      pinyin: "xiàng",
      meaning: "towards",
      breakdown: "向 (xiàng) - towards",
    },
    {
      char: "小时",
      pinyin: "xiǎo shí",
      meaning: "hour",
      breakdown: "小时 (xiǎo shí) - hour",
    },
    {
      char: "笑",
      pinyin: "xiào",
      meaning: "laugh",
      breakdown: "笑 (xiào) - laugh",
    },
    { char: "新", pinyin: "xīn", meaning: "new", breakdown: "新 (xīn) - new" },
    {
      char: "姓",
      pinyin: "xìng",
      meaning: "family name",
      breakdown: "姓 (xìng) - family name",
    },
    {
      char: "休息",
      pinyin: "xiū xi",
      meaning: "rest",
      breakdown: "休息 (xiū xi) - rest",
    },
    {
      char: "雪",
      pinyin: "xuě",
      meaning: "snow",
      breakdown: "雪 (xuě) - snow",
    },
    {
      char: "颜色",
      pinyin: "yán sè",
      meaning: "color",
      breakdown: "颜色 (yán sè) - color",
    },
    {
      char: "眼睛",
      pinyin: "yǎn jing",
      meaning: "eye",
      breakdown: "眼睛 (yǎn jing) - eye",
    },
    {
      char: "羊肉",
      pinyin: "yáng ròu",
      meaning: "mutton",
      breakdown: "羊肉 (yáng ròu) - mutton",
    },
    {
      char: "药",
      pinyin: "yào",
      meaning: "medicine",
      breakdown: "药 (yào) - medicine",
    },
    {
      char: "要",
      pinyin: "yào",
      meaning: "important",
      breakdown: "要 (yào) - important",
    },
    { char: "也", pinyin: "yě", meaning: "also", breakdown: "也 (yě) - also" },
    {
      char: "已经",
      pinyin: "yǐ jīng",
      meaning: "already",
      breakdown: "已经 (yǐ jīng) - already",
    },
    {
      char: "一起",
      pinyin: "yī qǐ",
      meaning: "in the same place",
      breakdown: "一起 (yī qǐ) - in the same place",
    },
    {
      char: "意思",
      pinyin: "yì si",
      meaning: "idea",
      breakdown: "意思 (yì si) - idea",
    },
    {
      char: "阴",
      pinyin: "yīn",
      meaning: "overcast (weather)",
      breakdown: "阴 (yīn) - overcast (weather)",
    },
    {
      char: "因为",
      pinyin: "yīn wèi",
      meaning: "because",
      breakdown: "因为 (yīn wèi) - because",
    },
    {
      char: "游泳",
      pinyin: "yóu yǒng",
      meaning: "swimming",
      breakdown: "游泳 (yóu yǒng) - swimming",
    },
    {
      char: "右边",
      pinyin: "yòu bian",
      meaning: "right side",
      breakdown: "右边 (yòu bian) - right side",
    },
    { char: "鱼", pinyin: "yú", meaning: "fish", breakdown: "鱼 (yú) - fish" },
    {
      char: "元",
      pinyin: "yuán",
      meaning: "Chinese monetary unit",
      breakdown: "元 (yuán) - Chinese monetary unit",
    },
    {
      char: "远",
      pinyin: "yuǎn",
      meaning: "far",
      breakdown: "远 (yuǎn) - far",
    },
    {
      char: "运动",
      pinyin: "yùn dòng",
      meaning: "to move",
      breakdown: "运动 (yùn dòng) - to move",
    },
    {
      char: "再",
      pinyin: "zài",
      meaning: "again",
      breakdown: "再 (zài) - again",
    },
    {
      char: "早上",
      pinyin: "zǎo shang",
      meaning: "early morning",
      breakdown: "早上 (zǎo shang) - early morning",
    },
    {
      char: "张",
      pinyin: "zhāng",
      meaning: "to open up",
      breakdown: "张 (zhāng) - to open up",
    },
    {
      char: "长",
      pinyin: "zhǎng",
      meaning: "chief",
      breakdown: "长 (zhǎng) - chief",
    },
    {
      char: "丈夫",
      pinyin: "zhàng fu",
      meaning: "husband",
      breakdown: "丈夫 (zhàng fu) - husband",
    },
    {
      char: "找",
      pinyin: "zhǎo",
      meaning: "to try to find",
      breakdown: "找 (zhǎo) - to try to find",
    },
    {
      char: "着",
      pinyin: "zhe",
      meaning: "aspect particle indicating action in progress",
      breakdown: "着 (zhe) - aspect particle indicating action in progress",
    },
    {
      char: "真",
      pinyin: "zhēn",
      meaning: "really",
      breakdown: "真 (zhēn) - really",
    },
    {
      char: "正在",
      pinyin: "zhèng zài",
      meaning: "in the process of (doing something or happening)",
      breakdown:
        "正在 (zhèng zài) - in the process of (doing something or happening)",
    },
    {
      char: "知道",
      pinyin: "zhī dào",
      meaning: "to know",
      breakdown: "知道 (zhī dào) - to know",
    },
    {
      char: "准备",
      pinyin: "zhǔn bèi",
      meaning: "preparation",
      breakdown: "准备 (zhǔn bèi) - preparation",
    },
    {
      char: "自行车",
      pinyin: "zì xíng chē",
      meaning: "bicycle",
      breakdown: "自行车 (zì xíng chē) - bicycle",
    },
    {
      char: "走",
      pinyin: "zǒu",
      meaning: "to walk",
      breakdown: "走 (zǒu) - to walk",
    },
    {
      char: "最",
      pinyin: "zuì",
      meaning: "most",
      breakdown: "最 (zuì) - most",
    },
  ],
  hsk3: [
    {
      char: "阿姨",
      pinyin: "ā yí",
      meaning: "maternal aunt",
      breakdown: "阿姨 (ā yí) - maternal aunt",
    },
    {
      char: "啊",
      pinyin: "a",
      meaning: "modal particle ending sentence",
      breakdown: "啊 (a) - modal particle ending sentence",
    },
    { char: "矮", pinyin: "ǎi", meaning: "low", breakdown: "矮 (ǎi) - low" },
    {
      char: "爱好",
      pinyin: "ài hào",
      meaning: "to like",
      breakdown: "爱好 (ài hào) - to like",
    },
    {
      char: "安静",
      pinyin: "ān jìng",
      meaning: "quiet",
      breakdown: "安静 (ān jìng) - quiet",
    },
    {
      char: "把",
      pinyin: "bǎ",
      meaning: "to hold",
      breakdown: "把 (bǎ) - to hold",
    },
    {
      char: "搬",
      pinyin: "bān",
      meaning: "to move",
      breakdown: "搬 (bān) - to move",
    },
    {
      char: "班",
      pinyin: "bān",
      meaning: "team",
      breakdown: "班 (bān) - team",
    },
    {
      char: "半",
      pinyin: "bàn",
      meaning: "half",
      breakdown: "半 (bàn) - half",
    },
    {
      char: "办法",
      pinyin: "bàn fǎ",
      meaning: "means",
      breakdown: "办法 (bàn fǎ) - means",
    },
    {
      char: "办公室",
      pinyin: "bàn gōng shì",
      meaning: "office",
      breakdown: "办公室 (bàn gōng shì) - office",
    },
    {
      char: "帮忙",
      pinyin: "bāng máng",
      meaning: "to help",
      breakdown: "帮忙 (bāng máng) - to help",
    },
    {
      char: "包",
      pinyin: "bāo",
      meaning: "to cover",
      breakdown: "包 (bāo) - to cover",
    },
    {
      char: "饱",
      pinyin: "bǎo",
      meaning: "to eat till full",
      breakdown: "饱 (bǎo) - to eat till full",
    },
    {
      char: "北方",
      pinyin: "běi fāng",
      meaning: "north",
      breakdown: "北方 (běi fāng) - north",
    },
    {
      char: "被",
      pinyin: "bèi",
      meaning: "quilt",
      breakdown: "被 (bèi) - quilt",
    },
    {
      char: "鼻子",
      pinyin: "bí zi",
      meaning: "nose",
      breakdown: "鼻子 (bí zi) - nose",
    },
    {
      char: "比较",
      pinyin: "bǐ jiào",
      meaning: "to compare",
      breakdown: "比较 (bǐ jiào) - to compare",
    },
    {
      char: "比赛",
      pinyin: "bǐ sài",
      meaning: "competition (sports etc)",
      breakdown: "比赛 (bǐ sài) - competition (sports etc)",
    },
    {
      char: "必须",
      pinyin: "bì xū",
      meaning: "to have to",
      breakdown: "必须 (bì xū) - to have to",
    },
    {
      char: "变化",
      pinyin: "biàn huà",
      meaning: "change",
      breakdown: "变化 (biàn huà) - change",
    },
    {
      char: "表示",
      pinyin: "biǎo shì",
      meaning: "to express",
      breakdown: "表示 (biǎo shì) - to express",
    },
    {
      char: "表演",
      pinyin: "biǎo yǎn",
      meaning: "play",
      breakdown: "表演 (biǎo yǎn) - play",
    },
    {
      char: "别人",
      pinyin: "bié ren",
      meaning: "other people",
      breakdown: "别人 (bié ren) - other people",
    },
    {
      char: "宾馆",
      pinyin: "bīn guǎn",
      meaning: "guesthouse",
      breakdown: "宾馆 (bīn guǎn) - guesthouse",
    },
    {
      char: "冰箱",
      pinyin: "bīng xiāng",
      meaning: "icebox",
      breakdown: "冰箱 (bīng xiāng) - icebox",
    },
    {
      char: "才",
      pinyin: "cái",
      meaning: "a moment ago",
      breakdown: "才 (cái) - a moment ago",
    },
    {
      char: "菜单",
      pinyin: "cài dān",
      meaning: "menu",
      breakdown: "菜单 (cài dān) - menu",
    },
    {
      char: "参加",
      pinyin: "cān jiā",
      meaning: "to participate",
      breakdown: "参加 (cān jiā) - to participate",
    },
    {
      char: "草",
      pinyin: "cǎo",
      meaning: "grass",
      breakdown: "草 (cǎo) - grass",
    },
    {
      char: "层",
      pinyin: "céng",
      meaning: "layer",
      breakdown: "层 (céng) - layer",
    },
    {
      char: "差",
      pinyin: "chà",
      meaning: "to differ from",
      breakdown: "差 (chà) - to differ from",
    },
    {
      char: "超市",
      pinyin: "chāo shì",
      meaning: "supermarket (abbr.)",
      breakdown: "超市 (chāo shì) - supermarket (abbr.)",
    },
    {
      char: "衬衫",
      pinyin: "chèn shān",
      meaning: "shirt",
      breakdown: "衬衫 (chèn shān) - shirt",
    },
    {
      char: "成绩",
      pinyin: "chéng jì",
      meaning: "achievement",
      breakdown: "成绩 (chéng jì) - achievement",
    },
    {
      char: "城市",
      pinyin: "chéng shì",
      meaning: "city",
      breakdown: "城市 (chéng shì) - city",
    },
    {
      char: "迟到",
      pinyin: "chí dào",
      meaning: "to arrive late",
      breakdown: "迟到 (chí dào) - to arrive late",
    },
    {
      char: "出现",
      pinyin: "chū xiàn",
      meaning: "to appear",
      breakdown: "出现 (chū xiàn) - to appear",
    },
    {
      char: "除了",
      pinyin: "chú le",
      meaning: "besides",
      breakdown: "除了 (chú le) - besides",
    },
    {
      char: "厨房",
      pinyin: "chú fáng",
      meaning: "kitchen",
      breakdown: "厨房 (chú fáng) - kitchen",
    },
    {
      char: "春",
      pinyin: "chūn",
      meaning: "spring (time)",
      breakdown: "春 (chūn) - spring (time)",
    },
    {
      char: "词语",
      pinyin: "cí yǔ",
      meaning:
        "word (general term including monosyllables through to short phrases)",
      breakdown:
        "词语 (cí yǔ) - word (general term including monosyllables through to short phrases)",
    },
    {
      char: "聪明",
      pinyin: "cōng ming",
      meaning: "acute (of sight and hearing)",
      breakdown: "聪明 (cōng ming) - acute (of sight and hearing)",
    },
    {
      char: "打扫",
      pinyin: "dǎ sǎo",
      meaning: "to clean",
      breakdown: "打扫 (dǎ sǎo) - to clean",
    },
    {
      char: "打算",
      pinyin: "dǎ suàn",
      meaning: "to plan",
      breakdown: "打算 (dǎ suàn) - to plan",
    },
    {
      char: "带",
      pinyin: "dài",
      meaning: "band",
      breakdown: "带 (dài) - band",
    },
    {
      char: "担心",
      pinyin: "dān xīn",
      meaning: "anxious",
      breakdown: "担心 (dān xīn) - anxious",
    },
    {
      char: "蛋糕",
      pinyin: "dàn gāo",
      meaning: "cake",
      breakdown: "蛋糕 (dàn gāo) - cake",
    },
    {
      char: "当然",
      pinyin: "dāng rán",
      meaning: "only natural",
      breakdown: "当然 (dāng rán) - only natural",
    },
    { char: "地", pinyin: "de", meaning: "ly", breakdown: "地 (de) - -ly" },
    {
      char: "灯",
      pinyin: "dēng",
      meaning: "lamp",
      breakdown: "灯 (dēng) - lamp",
    },
    { char: "低", pinyin: "dī", meaning: "low", breakdown: "低 (dī) - low" },
    {
      char: "地方",
      pinyin: "dì fang",
      meaning: "area",
      breakdown: "地方 (dì fang) - area",
    },
    {
      char: "地铁",
      pinyin: "dì tiě",
      meaning: "subway",
      breakdown: "地铁 (dì tiě) - subway",
    },
    {
      char: "地图",
      pinyin: "dì tú",
      meaning: "map",
      breakdown: "地图 (dì tú) - map",
    },
    {
      char: "电梯",
      pinyin: "diàn tī",
      meaning: "elevator",
      breakdown: "电梯 (diàn tī) - elevator",
    },
    {
      char: "电子",
      pinyin: "diàn zǐ",
      meaning: "electronic",
      breakdown: "电子 (diàn zǐ) - electronic",
    },
    {
      char: "冬",
      pinyin: "dōng",
      meaning: "sound of beating a drum",
      breakdown: "冬 (dōng) - sound of beating a drum",
    },
    {
      char: "东",
      pinyin: "dōng",
      meaning: "east",
      breakdown: "东 (dōng) - east",
    },
    {
      char: "动物",
      pinyin: "dòng wù",
      meaning: "animal",
      breakdown: "动物 (dòng wù) - animal",
    },
    {
      char: "短",
      pinyin: "duǎn",
      meaning: "short or brief",
      breakdown: "短 (duǎn) - short or brief",
    },
    {
      char: "段",
      pinyin: "duàn",
      meaning: "paragraph",
      breakdown: "段 (duàn) - paragraph",
    },
    {
      char: "锻炼",
      pinyin: "duàn liàn",
      meaning: "to engage in physical exercise",
      breakdown: "锻炼 (duàn liàn) - to engage in physical exercise",
    },
    {
      char: "多么",
      pinyin: "duō me",
      meaning: "how (wonderful etc)",
      breakdown: "多么 (duō me) - how (wonderful etc)",
    },
    {
      char: "饿",
      pinyin: "è",
      meaning: "to be hungry",
      breakdown: "饿 (è) - to be hungry",
    },
    {
      char: "而且",
      pinyin: "ér qiě",
      meaning: "(not only ...) but also",
      breakdown: "而且 (ér qiě) - (not only ...) but also",
    },
    {
      char: "耳朵",
      pinyin: "ěr duo",
      meaning: "ear",
      breakdown: "耳朵 (ěr duo) - ear",
    },
    {
      char: "发烧",
      pinyin: "fā shāo",
      meaning: "to have a high temperature (from illness)",
      breakdown: "发烧 (fā shāo) - to have a high temperature (from illness)",
    },
    {
      char: "发现",
      pinyin: "fā xiàn",
      meaning: "to find",
      breakdown: "发现 (fā xiàn) - to find",
    },
    {
      char: "方便",
      pinyin: "fāng biàn",
      meaning: "convenient",
      breakdown: "方便 (fāng biàn) - convenient",
    },
    {
      char: "放",
      pinyin: "fàng",
      meaning: "to release",
      breakdown: "放 (fàng) - to release",
    },
    {
      char: "放心",
      pinyin: "fàng xīn",
      meaning: "to feel relieved",
      breakdown: "放心 (fàng xīn) - to feel relieved",
    },
    {
      char: "分",
      pinyin: "fēn",
      meaning: "to divide",
      breakdown: "分 (fēn) - to divide",
    },
    {
      char: "附近",
      pinyin: "fù jìn",
      meaning: "(in the) vicinity",
      breakdown: "附近 (fù jìn) - (in the) vicinity",
    },
    {
      char: "复习",
      pinyin: "fù xí",
      meaning: "variant of 復習|复习",
      breakdown: "复习 (fù xí) - variant of 復習|复习",
    },
    {
      char: "干净",
      pinyin: "gān jìng",
      meaning: "clean",
      breakdown: "干净 (gān jìng) - clean",
    },
    {
      char: "敢",
      pinyin: "gǎn",
      meaning: "to dare",
      breakdown: "敢 (gǎn) - to dare",
    },
    {
      char: "感冒",
      pinyin: "gǎn mào",
      meaning: "to catch cold",
      breakdown: "感冒 (gǎn mào) - to catch cold",
    },
    {
      char: "刚才",
      pinyin: "gāng cái",
      meaning: "(just) a moment ago",
      breakdown: "刚才 (gāng cái) - (just) a moment ago",
    },
    {
      char: "根据",
      pinyin: "gēn jù",
      meaning: "according to",
      breakdown: "根据 (gēn jù) - according to",
    },
    {
      char: "跟",
      pinyin: "gēn",
      meaning: "heel",
      breakdown: "跟 (gēn) - heel",
    },
    {
      char: "更",
      pinyin: "gèng",
      meaning: "more",
      breakdown: "更 (gèng) - more",
    },
    {
      char: "公园",
      pinyin: "gōng yuán",
      meaning: "public park",
      breakdown: "公园 (gōng yuán) - public park",
    },
    {
      char: "故事",
      pinyin: "gù shi",
      meaning: "narrative",
      breakdown: "故事 (gù shi) - narrative",
    },
    {
      char: "刮",
      pinyin: "guā",
      meaning: "to blow (of the wind)",
      breakdown: "刮 (guā) - to blow (of the wind)",
    },
    {
      char: "关",
      pinyin: "guān",
      meaning: "mountain pass",
      breakdown: "关 (guān) - mountain pass",
    },
    {
      char: "关系",
      pinyin: "guān xì",
      meaning: "variant of 關係|关系[guān xì]",
      breakdown: "关系 (guān xì) - variant of 關係|关系[guān xì]",
    },
    {
      char: "关心",
      pinyin: "guān xīn",
      meaning: "to care for sth",
      breakdown: "关心 (guān xīn) - to care for sth",
    },
    {
      char: "关于",
      pinyin: "guān yú",
      meaning: "pertaining to",
      breakdown: "关于 (guān yú) - pertaining to",
    },
    {
      char: "国家",
      pinyin: "guó jiā",
      meaning: "country",
      breakdown: "国家 (guó jiā) - country",
    },
    {
      char: "果汁",
      pinyin: "guǒ zhī",
      meaning: "fruit juice",
      breakdown: "果汁 (guǒ zhī) - fruit juice",
    },
    {
      char: "过去",
      pinyin: "guò qu",
      meaning: "(in the) past",
      breakdown: "过去 (guò qu) - (in the) past",
    },
    {
      char: "还是",
      pinyin: "hái shi",
      meaning: "or",
      breakdown: "还是 (hái shi) - or",
    },
    {
      char: "害怕",
      pinyin: "hài pà",
      meaning: "to be afraid",
      breakdown: "害怕 (hài pà) - to be afraid",
    },
    {
      char: "河",
      pinyin: "hé",
      meaning: "river",
      breakdown: "河 (hé) - river",
    },
    {
      char: "黑板",
      pinyin: "hēi bǎn",
      meaning: "blackboard",
      breakdown: "黑板 (hēi bǎn) - blackboard",
    },
    {
      char: "护照",
      pinyin: "hù zhào",
      meaning: "passport",
      breakdown: "护照 (hù zhào) - passport",
    },
    {
      char: "花",
      pinyin: "huā",
      meaning: "flower",
      breakdown: "花 (huā) - flower",
    },
    {
      char: "花园",
      pinyin: "huā yuán",
      meaning: "garden",
      breakdown: "花园 (huā yuán) - garden",
    },
    {
      char: "画",
      pinyin: "huà",
      meaning: "to draw",
      breakdown: "画 (huà) - to draw",
    },
    {
      char: "坏",
      pinyin: "huài",
      meaning: "bad",
      breakdown: "坏 (huài) - bad",
    },
    {
      char: "环境",
      pinyin: "huán jìng",
      meaning: "environment",
      breakdown: "环境 (huán jìng) - environment",
    },
    {
      char: "换",
      pinyin: "huàn",
      meaning: "to change",
      breakdown: "换 (huàn) - to change",
    },
    {
      char: "黄",
      pinyin: "huáng",
      meaning: "yellow",
      breakdown: "黄 (huáng) - yellow",
    },
    {
      char: "会议",
      pinyin: "huì yì",
      meaning: "meeting",
      breakdown: "会议 (huì yì) - meeting",
    },
    {
      char: "或者",
      pinyin: "huò zhě",
      meaning: "or",
      breakdown: "或者 (huò zhě) - or",
    },
    {
      char: "机会",
      pinyin: "jī huì",
      meaning: "opportunity",
      breakdown: "机会 (jī huì) - opportunity",
    },
    {
      char: "几乎",
      pinyin: "jī hū",
      meaning: "almost",
      breakdown: "几乎 (jī hū) - almost",
    },
    {
      char: "极",
      pinyin: "jí",
      meaning: "extremely",
      breakdown: "极 (jí) - extremely",
    },
    {
      char: "记得",
      pinyin: "jì de",
      meaning: "to remember",
      breakdown: "记得 (jì de) - to remember",
    },
    {
      char: "季节",
      pinyin: "jì jié",
      meaning: "time",
      breakdown: "季节 (jì jié) - time",
    },
    {
      char: "检查",
      pinyin: "jiǎn chá",
      meaning: "inspection",
      breakdown: "检查 (jiǎn chá) - inspection",
    },
    {
      char: "简单",
      pinyin: "jiǎn dān",
      meaning: "simple",
      breakdown: "简单 (jiǎn dān) - simple",
    },
    {
      char: "见面",
      pinyin: "jiàn miàn",
      meaning: "to meet",
      breakdown: "见面 (jiàn miàn) - to meet",
    },
    {
      char: "健康",
      pinyin: "jiàn kāng",
      meaning: "health",
      breakdown: "健康 (jiàn kāng) - health",
    },
    {
      char: "讲",
      pinyin: "jiǎng",
      meaning: "to speak",
      breakdown: "讲 (jiǎng) - to speak",
    },
    {
      char: "教",
      pinyin: "jiāo",
      meaning: "to teach",
      breakdown: "教 (jiāo) - to teach",
    },
    {
      char: "脚",
      pinyin: "jiǎo",
      meaning: "foot",
      breakdown: "脚 (jiǎo) - foot",
    },
    {
      char: "角",
      pinyin: "jiǎo",
      meaning: "angle",
      breakdown: "角 (jiǎo) - angle",
    },
    {
      char: "接",
      pinyin: "jiē",
      meaning: "to receive",
      breakdown: "接 (jiē) - to receive",
    },
    {
      char: "街道",
      pinyin: "jiē dào",
      meaning: "street",
      breakdown: "街道 (jiē dào) - street",
    },
    {
      char: "节目",
      pinyin: "jié mù",
      meaning: "program",
      breakdown: "节目 (jié mù) - program",
    },
    {
      char: "节日",
      pinyin: "jié rì",
      meaning: "holiday",
      breakdown: "节日 (jié rì) - holiday",
    },
    {
      char: "结婚",
      pinyin: "jié hūn",
      meaning: "to marry",
      breakdown: "结婚 (jié hūn) - to marry",
    },
    {
      char: "结束",
      pinyin: "jié shù",
      meaning: "termination",
      breakdown: "结束 (jié shù) - termination",
    },
    {
      char: "解决",
      pinyin: "jiě jué",
      meaning: "to settle (a dispute)",
      breakdown: "解决 (jiě jué) - to settle (a dispute)",
    },
    {
      char: "借",
      pinyin: "jiè",
      meaning: "to lend",
      breakdown: "借 (jiè) - to lend",
    },
    {
      char: "经常",
      pinyin: "jīng cháng",
      meaning: "day to day",
      breakdown: "经常 (jīng cháng) - day to day",
    },
    {
      char: "经过",
      pinyin: "jīng guò",
      meaning: "to pass",
      breakdown: "经过 (jīng guò) - to pass",
    },
    {
      char: "经理",
      pinyin: "jīng lǐ",
      meaning: "manager",
      breakdown: "经理 (jīng lǐ) - manager",
    },
    {
      char: "久",
      pinyin: "jiǔ",
      meaning: "(long) time",
      breakdown: "久 (jiǔ) - (long) time",
    },
    { char: "旧", pinyin: "jiù", meaning: "old", breakdown: "旧 (jiù) - old" },
    {
      char: "举行",
      pinyin: "jǔ xíng",
      meaning: "to hold (a meeting)",
      breakdown: "举行 (jǔ xíng) - to hold (a meeting)",
    },
    {
      char: "句子",
      pinyin: "jù zi",
      meaning: "sentence",
      breakdown: "句子 (jù zi) - sentence",
    },
    {
      char: "决定",
      pinyin: "jué dìng",
      meaning: "to decide (to do something)",
      breakdown: "决定 (jué dìng) - to decide (to do something)",
    },
    {
      char: "渴",
      pinyin: "kě",
      meaning: "thirsty",
      breakdown: "渴 (kě) - thirsty",
    },
    {
      char: "可爱",
      pinyin: "kě ài",
      meaning: "adorable",
      breakdown: "可爱 (kě ài) - adorable",
    },
    {
      char: "刻",
      pinyin: "kè",
      meaning: "quarter (hour)",
      breakdown: "刻 (kè) - quarter (hour)",
    },
    {
      char: "客人",
      pinyin: "kè rén",
      meaning: "visitor",
      breakdown: "客人 (kè rén) - visitor",
    },
    {
      char: "空调",
      pinyin: "kōng tiáo",
      meaning: "air conditioning",
      breakdown: "空调 (kōng tiáo) - air conditioning",
    },
    {
      char: "口",
      pinyin: "kǒu",
      meaning: "mouth",
      breakdown: "口 (kǒu) - mouth",
    },
    {
      char: "哭",
      pinyin: "kū",
      meaning: "to cry",
      breakdown: "哭 (kū) - to cry",
    },
    {
      char: "裤子",
      pinyin: "kù zi",
      meaning: "trousers",
      breakdown: "裤子 (kù zi) - trousers",
    },
    {
      char: "筷子",
      pinyin: "kuài zi",
      meaning: "chopsticks",
      breakdown: "筷子 (kuài zi) - chopsticks",
    },
    {
      char: "蓝",
      pinyin: "lán",
      meaning: "blue",
      breakdown: "蓝 (lán) - blue",
    },
    { char: "老", pinyin: "lǎo", meaning: "old", breakdown: "老 (lǎo) - old" },
    {
      char: "离开",
      pinyin: "lí kāi",
      meaning: "to depart",
      breakdown: "离开 (lí kāi) - to depart",
    },
    {
      char: "礼物",
      pinyin: "lǐ wù",
      meaning: "gift",
      breakdown: "礼物 (lǐ wù) - gift",
    },
    {
      char: "历史",
      pinyin: "lì shǐ",
      meaning: "history",
      breakdown: "历史 (lì shǐ) - history",
    },
    {
      char: "脸",
      pinyin: "liǎn",
      meaning: "face",
      breakdown: "脸 (liǎn) - face",
    },
    {
      char: "练习",
      pinyin: "liàn xí",
      meaning: "exercise",
      breakdown: "练习 (liàn xí) - exercise",
    },
    {
      char: "辆",
      pinyin: "liàng",
      meaning: "classifier for vehicles",
      breakdown: "辆 (liàng) - classifier for vehicles",
    },
    {
      char: "了解",
      pinyin: "liǎo jiě",
      meaning: "to understand",
      breakdown: "了解 (liǎo jiě) - to understand",
    },
    {
      char: "邻居",
      pinyin: "lín jū",
      meaning: "neighbor",
      breakdown: "邻居 (lín jū) - neighbor",
    },
    {
      char: "楼",
      pinyin: "lóu",
      meaning: "house with more than 1 story",
      breakdown: "楼 (lóu) - house with more than 1 story",
    },
    {
      char: "绿",
      pinyin: "lǜ",
      meaning: "green",
      breakdown: "绿 (lǜ) - green",
    },
    {
      char: "马",
      pinyin: "mǎ",
      meaning: "horse",
      breakdown: "马 (mǎ) - horse",
    },
    {
      char: "马上",
      pinyin: "mǎ shàng",
      meaning: "at once",
      breakdown: "马上 (mǎ shàng) - at once",
    },
    {
      char: "满意",
      pinyin: "mǎn yì",
      meaning: "satisfied",
      breakdown: "满意 (mǎn yì) - satisfied",
    },
    {
      char: "帽子",
      pinyin: "mào zi",
      meaning: "hat",
      breakdown: "帽子 (mào zi) - hat",
    },
    { char: "米", pinyin: "mǐ", meaning: "rice", breakdown: "米 (mǐ) - rice" },
    {
      char: "面包",
      pinyin: "miàn bāo",
      meaning: "bread",
      breakdown: "面包 (miàn bāo) - bread",
    },
    {
      char: "面条",
      pinyin: "miàn tiáo",
      meaning: "noodles",
      breakdown: "面条 (miàn tiáo) - noodles",
    },
    {
      char: "明白",
      pinyin: "míng bai",
      meaning: "clear",
      breakdown: "明白 (míng bai) - clear",
    },
    {
      char: "拿",
      pinyin: "ná",
      meaning: "to hold",
      breakdown: "拿 (ná) - to hold",
    },
    {
      char: "奶奶",
      pinyin: "nǎi nai",
      meaning: "(informal) grandma (paternal grandmother)",
      breakdown: "奶奶 (nǎi nai) - (informal) grandma (paternal grandmother)",
    },
    {
      char: "南",
      pinyin: "nán",
      meaning: "south",
      breakdown: "南 (nán) - south",
    },
    {
      char: "难",
      pinyin: "nán",
      meaning: "difficult (to...)",
      breakdown: "难 (nán) - difficult (to...)",
    },
    {
      char: "难过",
      pinyin: "nán guò",
      meaning: "to feel sad",
      breakdown: "难过 (nán guò) - to feel sad",
    },
    {
      char: "年级",
      pinyin: "nián jí",
      meaning: "grade",
      breakdown: "年级 (nián jí) - grade",
    },
    {
      char: "年轻",
      pinyin: "nián qīng",
      meaning: "young",
      breakdown: "年轻 (nián qīng) - young",
    },
    {
      char: "鸟",
      pinyin: "niǎo",
      meaning: "bird",
      breakdown: "鸟 (niǎo) - bird",
    },
    {
      char: "努力",
      pinyin: "nǔ lì",
      meaning: "great effort",
      breakdown: "努力 (nǔ lì) - great effort",
    },
    {
      char: "爬山",
      pinyin: "pá shān",
      meaning: "to climb a mountain",
      breakdown: "爬山 (pá shān) - to climb a mountain",
    },
    {
      char: "盘子",
      pinyin: "pán zi",
      meaning: "tray",
      breakdown: "盘子 (pán zi) - tray",
    },
    {
      char: "胖",
      pinyin: "pàng",
      meaning: "fat",
      breakdown: "胖 (pàng) - fat",
    },
    {
      char: "啤酒",
      pinyin: "pí jiǔ",
      meaning: "beer",
      breakdown: "啤酒 (pí jiǔ) - beer",
    },
    {
      char: "葡萄",
      pinyin: "pú tao",
      meaning: "grape",
      breakdown: "葡萄 (pú tao) - grape",
    },
    {
      char: "普通话",
      pinyin: "pǔ tōng huà",
      meaning: "Mandarin (common language)",
      breakdown: "普通话 (pǔ tōng huà) - Mandarin (common language)",
    },
    {
      char: "骑",
      pinyin: "qí",
      meaning: "to ride (an animal or bike)",
      breakdown: "骑 (qí) - to ride (an animal or bike)",
    },
    {
      char: "其实",
      pinyin: "qí shí",
      meaning: "actually",
      breakdown: "其实 (qí shí) - actually",
    },
    {
      char: "其他",
      pinyin: "qí tā",
      meaning: "other",
      breakdown: "其他 (qí tā) - other",
    },
    {
      char: "奇怪",
      pinyin: "qí guài",
      meaning: "strange",
      breakdown: "奇怪 (qí guài) - strange",
    },
    {
      char: "铅笔",
      pinyin: "qiān bǐ",
      meaning: "(lead) pencil",
      breakdown: "铅笔 (qiān bǐ) - (lead) pencil",
    },
    {
      char: "清楚",
      pinyin: "qīng chu",
      meaning: "clear",
      breakdown: "清楚 (qīng chu) - clear",
    },
    {
      char: "秋",
      pinyin: "qiū",
      meaning: "a swing",
      breakdown: "秋 (qiū) - a swing",
    },
    {
      char: "裙子",
      pinyin: "qún zi",
      meaning: "skirt",
      breakdown: "裙子 (qún zi) - skirt",
    },
    {
      char: "然后",
      pinyin: "rán hòu",
      meaning: "after",
      breakdown: "然后 (rán hòu) - after",
    },
    {
      char: "热情",
      pinyin: "rè qíng",
      meaning: "cordial",
      breakdown: "热情 (rè qíng) - cordial",
    },
    {
      char: "认为",
      pinyin: "rèn wéi",
      meaning: "to believe",
      breakdown: "认为 (rèn wéi) - to believe",
    },
    {
      char: "认真",
      pinyin: "rèn zhēn",
      meaning: "conscientious",
      breakdown: "认真 (rèn zhēn) - conscientious",
    },
    {
      char: "容易",
      pinyin: "róng yì",
      meaning: "easy",
      breakdown: "容易 (róng yì) - easy",
    },
    {
      char: "如果",
      pinyin: "rú guǒ",
      meaning: "if",
      breakdown: "如果 (rú guǒ) - if",
    },
    {
      char: "伞",
      pinyin: "sǎn",
      meaning: "umbrella",
      breakdown: "伞 (sǎn) - umbrella",
    },
    {
      char: "上网",
      pinyin: "shàng wǎng",
      meaning: "to be on the internet",
      breakdown: "上网 (shàng wǎng) - to be on the internet",
    },
    {
      char: "生气",
      pinyin: "shēng qì",
      meaning: "angry",
      breakdown: "生气 (shēng qì) - angry",
    },
    {
      char: "声音",
      pinyin: "shēng yīn",
      meaning: "voice",
      breakdown: "声音 (shēng yīn) - voice",
    },
    {
      char: "使",
      pinyin: "shǐ",
      meaning: "to make",
      breakdown: "使 (shǐ) - to make",
    },
    {
      char: "世界",
      pinyin: "shì jiè",
      meaning: "world",
      breakdown: "世界 (shì jiè) - world",
    },
    {
      char: "瘦",
      pinyin: "shòu",
      meaning: "thin",
      breakdown: "瘦 (shòu) - thin",
    },
    {
      char: "舒服",
      pinyin: "shū fu",
      meaning: "comfortable",
      breakdown: "舒服 (shū fu) - comfortable",
    },
    {
      char: "叔叔",
      pinyin: "shū shu",
      meaning: "father's younger brother",
      breakdown: "叔叔 (shū shu) - father's younger brother",
    },
    {
      char: "树",
      pinyin: "shù",
      meaning: "tree",
      breakdown: "树 (shù) - tree",
    },
    {
      char: "数学",
      pinyin: "shù xué",
      meaning: "mathematics",
      breakdown: "数学 (shù xué) - mathematics",
    },
    {
      char: "刷",
      pinyin: "shuā",
      meaning: "to brush",
      breakdown: "刷 (shuā) - to brush",
    },
    {
      char: "双",
      pinyin: "shuāng",
      meaning: "two",
      breakdown: "双 (shuāng) - two",
    },
    {
      char: "水平",
      pinyin: "shuǐ píng",
      meaning: "level (of achievement etc)",
      breakdown: "水平 (shuǐ píng) - level (of achievement etc)",
    },
    {
      char: "司机",
      pinyin: "sī jī",
      meaning: "chauffeur",
      breakdown: "司机 (sī jī) - chauffeur",
    },
    {
      char: "虽然",
      pinyin: "suī rán",
      meaning: "although",
      breakdown: "虽然 (suī rán) - although",
    },
    {
      char: "太阳",
      pinyin: "tài yáng",
      meaning: "sun",
      breakdown: "太阳 (tài yáng) - sun",
    },
    {
      char: "糖",
      pinyin: "táng",
      meaning: "sugar",
      breakdown: "糖 (táng) - sugar",
    },
    {
      char: "特别",
      pinyin: "tè bié",
      meaning: "especially",
      breakdown: "特别 (tè bié) - especially",
    },
    {
      char: "疼",
      pinyin: "téng",
      meaning: "(it) hurts",
      breakdown: "疼 (téng) - (it) hurts",
    },
    {
      char: "提高",
      pinyin: "tí gāo",
      meaning: "to raise",
      breakdown: "提高 (tí gāo) - to raise",
    },
    {
      char: "体育",
      pinyin: "tǐ yù",
      meaning: "sports",
      breakdown: "体育 (tǐ yù) - sports",
    },
    {
      char: "甜",
      pinyin: "tián",
      meaning: "sweet",
      breakdown: "甜 (tián) - sweet",
    },
    {
      char: "条",
      pinyin: "tiáo",
      meaning: "strip",
      breakdown: "条 (tiáo) - strip",
    },
    {
      char: "同事",
      pinyin: "tóng shì",
      meaning: "colleague",
      breakdown: "同事 (tóng shì) - colleague",
    },
    {
      char: "同意",
      pinyin: "tóng yì",
      meaning: "to agree",
      breakdown: "同意 (tóng yì) - to agree",
    },
    {
      char: "头发",
      pinyin: "tóu fa",
      meaning: "hair (on the head)",
      breakdown: "头发 (tóu fa) - hair (on the head)",
    },
    {
      char: "突然",
      pinyin: "tū rán",
      meaning: "sudden",
      breakdown: "突然 (tū rán) - sudden",
    },
    {
      char: "图书馆",
      pinyin: "tú shū guǎn",
      meaning: "library",
      breakdown: "图书馆 (tú shū guǎn) - library",
    },
    { char: "腿", pinyin: "tuǐ", meaning: "leg", breakdown: "腿 (tuǐ) - leg" },
    {
      char: "完成",
      pinyin: "wán chéng",
      meaning: "to complete",
      breakdown: "完成 (wán chéng) - to complete",
    },
    {
      char: "碗",
      pinyin: "wǎn",
      meaning: "bowl",
      breakdown: "碗 (wǎn) - bowl",
    },
    {
      char: "万",
      pinyin: "wàn",
      meaning: "ten thousand",
      breakdown: "万 (wàn) - ten thousand",
    },
    {
      char: "忘记",
      pinyin: "wàng jì",
      meaning: "to forget",
      breakdown: "忘记 (wàng jì) - to forget",
    },
    {
      char: "为了",
      pinyin: "wèi le",
      meaning: "in order to",
      breakdown: "为了 (wèi le) - in order to",
    },
    {
      char: "为什么",
      pinyin: "wèi shén me",
      meaning: "why?",
      breakdown: "为什么 (wèi shén me) - why?",
    },
    {
      char: "位",
      pinyin: "wèi",
      meaning: "position",
      breakdown: "位 (wèi) - position",
    },
    {
      char: "文化",
      pinyin: "wén huà",
      meaning: "culture",
      breakdown: "文化 (wén huà) - culture",
    },
    { char: "西", pinyin: "xī", meaning: "west", breakdown: "西 (xī) - west" },
    {
      char: "习惯",
      pinyin: "xí guàn",
      meaning: "habit",
      breakdown: "习惯 (xí guàn) - habit",
    },
    {
      char: "洗手间",
      pinyin: "xǐ shǒu jiān",
      meaning: "toilet",
      breakdown: "洗手间 (xǐ shǒu jiān) - toilet",
    },
    {
      char: "洗澡",
      pinyin: "xǐ zǎo",
      meaning: "to bathe",
      breakdown: "洗澡 (xǐ zǎo) - to bathe",
    },
    {
      char: "夏",
      pinyin: "xià",
      meaning: "summer",
      breakdown: "夏 (xià) - summer",
    },
    {
      char: "先",
      pinyin: "xiān",
      meaning: "early",
      breakdown: "先 (xiān) - early",
    },
    {
      char: "香蕉",
      pinyin: "xiāng jiāo",
      meaning: "banana",
      breakdown: "香蕉 (xiāng jiāo) - banana",
    },
    {
      char: "相同",
      pinyin: "xiāng tóng",
      meaning: "identical",
      breakdown: "相同 (xiāng tóng) - identical",
    },
    {
      char: "相信",
      pinyin: "xiāng xìn",
      meaning: "to be convinced (that sth is true)",
      breakdown: "相信 (xiāng xìn) - to be convinced (that sth is true)",
    },
    {
      char: "像",
      pinyin: "xiàng",
      meaning: "to resemble",
      breakdown: "像 (xiàng) - to resemble",
    },
    {
      char: "小心",
      pinyin: "xiǎo xīn",
      meaning: "to be careful",
      breakdown: "小心 (xiǎo xīn) - to be careful",
    },
    {
      char: "校长",
      pinyin: "xiào zhǎng",
      meaning: "(college)",
      breakdown: "校长 (xiào zhǎng) - (college)",
    },
    {
      char: "鞋",
      pinyin: "xié",
      meaning: "shoe",
      breakdown: "鞋 (xié) - shoe",
    },
    {
      char: "新闻",
      pinyin: "xīn wén",
      meaning: "news",
      breakdown: "新闻 (xīn wén) - news",
    },
    {
      char: "新鲜",
      pinyin: "xīn xiān",
      meaning: "fresh (experience)",
      breakdown: "新鲜 (xīn xiān) - fresh (experience)",
    },
    {
      char: "信",
      pinyin: "xìn",
      meaning: "letter",
      breakdown: "信 (xìn) - letter",
    },
    {
      char: "行李箱",
      pinyin: "xíng li xiāng",
      meaning: "suitcase",
      breakdown: "行李箱 (xíng li xiāng) - suitcase",
    },
    {
      char: "兴趣",
      pinyin: "xìng qù",
      meaning: "interest (desire to know about sth)",
      breakdown: "兴趣 (xìng qù) - interest (desire to know about sth)",
    },
    {
      char: "熊猫",
      pinyin: "xióng māo",
      meaning: "panda",
      breakdown: "熊猫 (xióng māo) - panda",
    },
    {
      char: "需要",
      pinyin: "xū yào",
      meaning: "to need",
      breakdown: "需要 (xū yào) - to need",
    },
    {
      char: "选择",
      pinyin: "xuǎn zé",
      meaning: "to select",
      breakdown: "选择 (xuǎn zé) - to select",
    },
    {
      char: "眼镜",
      pinyin: "yǎn jìng",
      meaning: "spectacles",
      breakdown: "眼镜 (yǎn jìng) - spectacles",
    },
    {
      char: "要求",
      pinyin: "yāo qiú",
      meaning: "to request",
      breakdown: "要求 (yāo qiú) - to request",
    },
    {
      char: "爷爷",
      pinyin: "yé ye",
      meaning: "(informal) father's father",
      breakdown: "爷爷 (yé ye) - (informal) father's father",
    },
    {
      char: "一定",
      pinyin: "yī dìng",
      meaning: "surely",
      breakdown: "一定 (yī dìng) - surely",
    },
    {
      char: "一共",
      pinyin: "yī gòng",
      meaning: "altogether",
      breakdown: "一共 (yī gòng) - altogether",
    },
    {
      char: "一会儿",
      pinyin: "yī huì r",
      meaning: "a while",
      breakdown: "一会儿 (yī huì r) - a while",
    },
    {
      char: "一样",
      pinyin: "yī yàng",
      meaning: "same",
      breakdown: "一样 (yī yàng) - same",
    },
    {
      char: "以后",
      pinyin: "yǐ hòu",
      meaning: "after",
      breakdown: "以后 (yǐ hòu) - after",
    },
    {
      char: "以前",
      pinyin: "yǐ qián",
      meaning: "before",
      breakdown: "以前 (yǐ qián) - before",
    },
    {
      char: "以为",
      pinyin: "yǐ wéi",
      meaning: "to believe",
      breakdown: "以为 (yǐ wéi) - to believe",
    },
    {
      char: "一般",
      pinyin: "yī bān",
      meaning: "same",
      breakdown: "一般 (yī bān) - same",
    },
    {
      char: "一边",
      pinyin: "yī biān",
      meaning: "one side",
      breakdown: "一边 (yī biān) - one side",
    },
    {
      char: "一直",
      pinyin: "yī zhí",
      meaning: "straight (in a straight line)",
      breakdown: "一直 (yī zhí) - straight (in a straight line)",
    },
    {
      char: "音乐",
      pinyin: "yīn yuè",
      meaning: "music",
      breakdown: "音乐 (yīn yuè) - music",
    },
    {
      char: "银行",
      pinyin: "yín háng",
      meaning: "bank",
      breakdown: "银行 (yín háng) - bank",
    },
    {
      char: "应该",
      pinyin: "yīng gāi",
      meaning: "ought to",
      breakdown: "应该 (yīng gāi) - ought to",
    },
    {
      char: "影响",
      pinyin: "yǐng xiǎng",
      meaning: "an influence",
      breakdown: "影响 (yǐng xiǎng) - an influence",
    },
    {
      char: "用",
      pinyin: "yòng",
      meaning: "to use",
      breakdown: "用 (yòng) - to use",
    },
    {
      char: "游戏",
      pinyin: "yóu xì",
      meaning: "game",
      breakdown: "游戏 (yóu xì) - game",
    },
    {
      char: "有名",
      pinyin: "yǒu míng",
      meaning: "famous",
      breakdown: "有名 (yǒu míng) - famous",
    },
    {
      char: "又",
      pinyin: "yòu",
      meaning: "(once) again",
      breakdown: "又 (yòu) - (once) again",
    },
    {
      char: "遇到",
      pinyin: "yù dào",
      meaning: "to meet",
      breakdown: "遇到 (yù dào) - to meet",
    },
    {
      char: "愿意",
      pinyin: "yuàn yì",
      meaning: "to wish",
      breakdown: "愿意 (yuàn yì) - to wish",
    },
    {
      char: "越",
      pinyin: "yuè",
      meaning: "to exceed",
      breakdown: "越 (yuè) - to exceed",
    },
    {
      char: "月亮",
      pinyin: "yuè liang",
      meaning: "moon",
      breakdown: "月亮 (yuè liang) - moon",
    },
    {
      char: "云",
      pinyin: "yún",
      meaning: "cloud",
      breakdown: "云 (yún) - cloud",
    },
    {
      char: "站",
      pinyin: "zhàn",
      meaning: "station",
      breakdown: "站 (zhàn) - station",
    },
    {
      char: "着急",
      pinyin: "zháo jí",
      meaning: "to worry",
      breakdown: "着急 (zháo jí) - to worry",
    },
    {
      char: "照顾",
      pinyin: "zhào gu",
      meaning: "to take care of",
      breakdown: "照顾 (zhào gu) - to take care of",
    },
    {
      char: "照片",
      pinyin: "zhào piàn",
      meaning: "photograph",
      breakdown: "照片 (zhào piàn) - photograph",
    },
    {
      char: "照相机",
      pinyin: "zhào xiàng jī",
      meaning: "camera",
      breakdown: "照相机 (zhào xiàng jī) - camera",
    },
    {
      char: "只",
      pinyin: "zhī",
      meaning: "classifier for birds and certain animals",
      breakdown: "只 (zhī) - classifier for birds and certain animals",
    },
    { char: "只", pinyin: "zhǐ", meaning: "but", breakdown: "只 (zhǐ) - but" },
    {
      char: "终于",
      pinyin: "zhōng yú",
      meaning: "at last",
      breakdown: "终于 (zhōng yú) - at last",
    },
    {
      char: "中间",
      pinyin: "zhōng jiān",
      meaning: "between",
      breakdown: "中间 (zhōng jiān) - between",
    },
    {
      char: "种",
      pinyin: "zhǒng",
      meaning: "abbr. for 物種|物种",
      breakdown: "种 (zhǒng) - abbr. for 物種|物种",
    },
    {
      char: "重要",
      pinyin: "zhòng yào",
      meaning: "important",
      breakdown: "重要 (zhòng yào) - important",
    },
    {
      char: "周末",
      pinyin: "zhōu mò",
      meaning: "weekend",
      breakdown: "周末 (zhōu mò) - weekend",
    },
    {
      char: "主要",
      pinyin: "zhǔ yào",
      meaning: "main",
      breakdown: "主要 (zhǔ yào) - main",
    },
    {
      char: "祝",
      pinyin: "zhù",
      meaning: "to wish",
      breakdown: "祝 (zhù) - to wish",
    },
    {
      char: "注意",
      pinyin: "zhù yì",
      meaning: "to take note of",
      breakdown: "注意 (zhù yì) - to take note of",
    },
    {
      char: "字典",
      pinyin: "zì diǎn",
      meaning: "dictionary",
      breakdown: "字典 (zì diǎn) - dictionary",
    },
    {
      char: "自己",
      pinyin: "zì jǐ",
      meaning: "oneself",
      breakdown: "自己 (zì jǐ) - oneself",
    },
    {
      char: "总是",
      pinyin: "zǒng shì",
      meaning: "always",
      breakdown: "总是 (zǒng shì) - always",
    },
    {
      char: "最近",
      pinyin: "zuì jìn",
      meaning: "recent",
      breakdown: "最近 (zuì jìn) - recent",
    },
    {
      char: "作业",
      pinyin: "zuò yè",
      meaning: "school assignment",
      breakdown: "作业 (zuò yè) - school assignment",
    },
  ],
  hsk4: [
    {
      char: "爱情",
      pinyin: "ài qíng",
      meaning: "romance",
      breakdown: "爱情 (ài qíng) - romance",
    },
    {
      char: "安排",
      pinyin: "ān pái",
      meaning: "to arrange",
      breakdown: "安排 (ān pái) - to arrange",
    },
    {
      char: "安全",
      pinyin: "ān quán",
      meaning: "safe",
      breakdown: "安全 (ān quán) - safe",
    },
    {
      char: "暗",
      pinyin: "àn",
      meaning: "to close (a door)",
      breakdown: "暗 (àn) - to close (a door)",
    },
    {
      char: "按时",
      pinyin: "àn shí",
      meaning: "on time",
      breakdown: "按时 (àn shí) - on time",
    },
    {
      char: "按照",
      pinyin: "àn zhào",
      meaning: "according to",
      breakdown: "按照 (àn zhào) - according to",
    },
    {
      char: "包括",
      pinyin: "bāo kuò",
      meaning: "to comprise",
      breakdown: "包括 (bāo kuò) - to comprise",
    },
    {
      char: "保护",
      pinyin: "bǎo hù",
      meaning: "to protect",
      breakdown: "保护 (bǎo hù) - to protect",
    },
    {
      char: "保证",
      pinyin: "bǎo zhèng",
      meaning: "guarantee",
      breakdown: "保证 (bǎo zhèng) - guarantee",
    },
    {
      char: "抱",
      pinyin: "bào",
      meaning: "to hold",
      breakdown: "抱 (bào) - to hold",
    },
    {
      char: "抱歉",
      pinyin: "bào qiàn",
      meaning: "to be sorry",
      breakdown: "抱歉 (bào qiàn) - to be sorry",
    },
    {
      char: "报道",
      pinyin: "bào dào",
      meaning: "report",
      breakdown: "报道 (bào dào) - report",
    },
    {
      char: "报名",
      pinyin: "bào míng",
      meaning: "to sign up",
      breakdown: "报名 (bào míng) - to sign up",
    },
    {
      char: "倍",
      pinyin: "bèi",
      meaning: "(two)",
      breakdown: "倍 (bèi) - (two)",
    },
    {
      char: "本来",
      pinyin: "běn lái",
      meaning: "original",
      breakdown: "本来 (běn lái) - original",
    },
    {
      char: "笨",
      pinyin: "bèn",
      meaning: "stupid",
      breakdown: "笨 (bèn) - stupid",
    },
    {
      char: "笔记本",
      pinyin: "bǐ jì běn",
      meaning: "notebook",
      breakdown: "笔记本 (bǐ jì běn) - notebook",
    },
    {
      char: "毕业",
      pinyin: "bì yè",
      meaning: "graduation",
      breakdown: "毕业 (bì yè) - graduation",
    },
    {
      char: "遍",
      pinyin: "biàn",
      meaning: "everywhere",
      breakdown: "遍 (biàn) - everywhere",
    },
    {
      char: "标准",
      pinyin: "biāo zhǔn",
      meaning: "(an official) standard",
      breakdown: "标准 (biāo zhǔn) - (an official) standard",
    },
    {
      char: "表达",
      pinyin: "biǎo dá",
      meaning: "to voice (an opinion)",
      breakdown: "表达 (biǎo dá) - to voice (an opinion)",
    },
    {
      char: "表格",
      pinyin: "biǎo gé",
      meaning: "form",
      breakdown: "表格 (biǎo gé) - form",
    },
    {
      char: "表扬",
      pinyin: "biǎo yáng",
      meaning: "to praise",
      breakdown: "表扬 (biǎo yáng) - to praise",
    },
    {
      char: "饼干",
      pinyin: "bǐng gān",
      meaning: "biscuit",
      breakdown: "饼干 (bǐng gān) - biscuit",
    },
    {
      char: "并且",
      pinyin: "bìng qiě",
      meaning: "and",
      breakdown: "并且 (bìng qiě) - and",
    },
    {
      char: "博士",
      pinyin: "bó shì",
      meaning: "doctor",
      breakdown: "博士 (bó shì) - doctor",
    },
    {
      char: "不但",
      pinyin: "bù dàn",
      meaning: "not only (... but also...)",
      breakdown: "不但 (bù dàn) - not only (... but also...)",
    },
    {
      char: "不过",
      pinyin: "bù guò",
      meaning: "only",
      breakdown: "不过 (bù guò) - only",
    },
    {
      char: "不得不",
      pinyin: "bù dé bù",
      meaning: "have no choice or option but to",
      breakdown: "不得不 (bù dé bù) - have no choice or option but to",
    },
    {
      char: "不管",
      pinyin: "bù guǎn",
      meaning: "no matter (what)",
      breakdown: "不管 (bù guǎn) - no matter (what)",
    },
    {
      char: "不仅",
      pinyin: "bù jǐn",
      meaning: "not only (this one)",
      breakdown: "不仅 (bù jǐn) - not only (this one)",
    },
    {
      char: "部分",
      pinyin: "bù fèn",
      meaning: "part",
      breakdown: "部分 (bù fèn) - part",
    },
    {
      char: "擦",
      pinyin: "cā",
      meaning: "to wipe",
      breakdown: "擦 (cā) - to wipe",
    },
    {
      char: "猜",
      pinyin: "cāi",
      meaning: "to guess",
      breakdown: "猜 (cāi) - to guess",
    },
    {
      char: "材料",
      pinyin: "cái liào",
      meaning: "material",
      breakdown: "材料 (cái liào) - material",
    },
    {
      char: "参观",
      pinyin: "cān guān",
      meaning: "to look around",
      breakdown: "参观 (cān guān) - to look around",
    },
    {
      char: "差不多",
      pinyin: "chà bu duō",
      meaning: "almost",
      breakdown: "差不多 (chà bu duō) - almost",
    },
    {
      char: "长城",
      pinyin: "Cháng chéng",
      meaning: "the Great Wall",
      breakdown: "长城 (Cháng chéng) - the Great Wall",
    },
    {
      char: "长江",
      pinyin: "Cháng Jiāng",
      meaning: "Yangtze River",
      breakdown: "长江 (Cháng Jiāng) - Yangtze River",
    },
    {
      char: "尝",
      pinyin: "cháng",
      meaning: "to taste",
      breakdown: "尝 (cháng) - to taste",
    },
    {
      char: "场",
      pinyin: "chǎng",
      meaning: "large place used for a specific purpose",
      breakdown: "场 (chǎng) - large place used for a specific purpose",
    },
    {
      char: "超过",
      pinyin: "chāo guò",
      meaning: "to surpass",
      breakdown: "超过 (chāo guò) - to surpass",
    },
    {
      char: "吵",
      pinyin: "chǎo",
      meaning: "to quarrel",
      breakdown: "吵 (chǎo) - to quarrel",
    },
    {
      char: "乘坐",
      pinyin: "chéng zuò",
      meaning: "to ride (in a vehicle)",
      breakdown: "乘坐 (chéng zuò) - to ride (in a vehicle)",
    },
    {
      char: "成功",
      pinyin: "chéng gōng",
      meaning: "success",
      breakdown: "成功 (chéng gōng) - success",
    },
    {
      char: "成熟",
      pinyin: "chéng shú",
      meaning: "mature",
      breakdown: "成熟 (chéng shú) - mature",
    },
    {
      char: "成为",
      pinyin: "chéng wéi",
      meaning: "to become",
      breakdown: "成为 (chéng wéi) - to become",
    },
    {
      char: "诚实",
      pinyin: "chéng shí",
      meaning: "honest",
      breakdown: "诚实 (chéng shí) - honest",
    },
    {
      char: "吃惊",
      pinyin: "chī jīng",
      meaning: "to be startled",
      breakdown: "吃惊 (chī jīng) - to be startled",
    },
    {
      char: "重新",
      pinyin: "chóng xīn",
      meaning: "again",
      breakdown: "重新 (chóng xīn) - again",
    },
    {
      char: "抽烟",
      pinyin: "chōu yān",
      meaning: "to smoke (a cigarette)",
      breakdown: "抽烟 (chōu yān) - to smoke (a cigarette)",
    },
    {
      char: "出差",
      pinyin: "chū chāi",
      meaning: "to go on an official or business trip",
      breakdown: "出差 (chū chāi) - to go on an official or business trip",
    },
    {
      char: "出发",
      pinyin: "chū fā",
      meaning: "to start out",
      breakdown: "出发 (chū fā) - to start out",
    },
    {
      char: "出生",
      pinyin: "chū shēng",
      meaning: "to be born",
      breakdown: "出生 (chū shēng) - to be born",
    },
    {
      char: "传真",
      pinyin: "chuán zhēn",
      meaning: "fax",
      breakdown: "传真 (chuán zhēn) - fax",
    },
    {
      char: "窗户",
      pinyin: "chuāng hu",
      meaning: "window",
      breakdown: "窗户 (chuāng hu) - window",
    },
    {
      char: "词典",
      pinyin: "cí diǎn",
      meaning: "dictionary (of Chinese compound words)",
      breakdown: "词典 (cí diǎn) - dictionary (of Chinese compound words)",
    },
    {
      char: "从来",
      pinyin: "cóng lái",
      meaning: "always",
      breakdown: "从来 (cóng lái) - always",
    },
    {
      char: "粗心",
      pinyin: "cū xīn",
      meaning: "careless",
      breakdown: "粗心 (cū xīn) - careless",
    },
    {
      char: "答案",
      pinyin: "dá àn",
      meaning: "answer",
      breakdown: "答案 (dá àn) - answer",
    },
    {
      char: "打扮",
      pinyin: "dǎ ban",
      meaning: "to decorate",
      breakdown: "打扮 (dǎ ban) - to decorate",
    },
    {
      char: "打扰",
      pinyin: "dǎ rǎo",
      meaning: "to disturb",
      breakdown: "打扰 (dǎ rǎo) - to disturb",
    },
    {
      char: "打印",
      pinyin: "dǎ yìn",
      meaning: "to print",
      breakdown: "打印 (dǎ yìn) - to print",
    },
    {
      char: "打折",
      pinyin: "dǎ zhé",
      meaning: "to give a discount",
      breakdown: "打折 (dǎ zhé) - to give a discount",
    },
    {
      char: "打针",
      pinyin: "dǎ zhēn",
      meaning: "to give or have an injection",
      breakdown: "打针 (dǎ zhēn) - to give or have an injection",
    },
    {
      char: "大概",
      pinyin: "dà gài",
      meaning: "roughly",
      breakdown: "大概 (dà gài) - roughly",
    },
    {
      char: "大使馆",
      pinyin: "dà shǐ guǎn",
      meaning: "embassy",
      breakdown: "大使馆 (dà shǐ guǎn) - embassy",
    },
    {
      char: "大约",
      pinyin: "dà yuē",
      meaning: "approximately",
      breakdown: "大约 (dà yuē) - approximately",
    },
    {
      char: "戴",
      pinyin: "dài",
      meaning: "to put on or wear (glasses)",
      breakdown: "戴 (dài) - to put on or wear (glasses)",
    },
    {
      char: "代表",
      pinyin: "dài biǎo",
      meaning: "representative",
      breakdown: "代表 (dài biǎo) - representative",
    },
    {
      char: "代替",
      pinyin: "dài tì",
      meaning: "instead",
      breakdown: "代替 (dài tì) - instead",
    },
    {
      char: "大夫",
      pinyin: "dài fu",
      meaning: "doctor",
      breakdown: "大夫 (dài fu) - doctor",
    },
    {
      char: "当",
      pinyin: "dāng",
      meaning: "to be",
      breakdown: "当 (dāng) - to be",
    },
    {
      char: "当地",
      pinyin: "dāng dì",
      meaning: "local",
      breakdown: "当地 (dāng dì) - local",
    },
    {
      char: "当时",
      pinyin: "dāng shí",
      meaning: "then",
      breakdown: "当时 (dāng shí) - then",
    },
    {
      char: "刀",
      pinyin: "dāo",
      meaning: "knife",
      breakdown: "刀 (dāo) - knife",
    },
    {
      char: "导游",
      pinyin: "dǎo yóu",
      meaning: "tour guide",
      breakdown: "导游 (dǎo yóu) - tour guide",
    },
    {
      char: "到处",
      pinyin: "dào chù",
      meaning: "everywhere",
      breakdown: "到处 (dào chù) - everywhere",
    },
    {
      char: "到底",
      pinyin: "dào dǐ",
      meaning: "finally",
      breakdown: "到底 (dào dǐ) - finally",
    },
    {
      char: "道歉",
      pinyin: "dào qiàn",
      meaning: "to apologize",
      breakdown: "道歉 (dào qiàn) - to apologize",
    },
    {
      char: "得意",
      pinyin: "dé yì",
      meaning: "proud of oneself",
      breakdown: "得意 (dé yì) - proud of oneself",
    },
    {
      char: "等",
      pinyin: "děng",
      meaning: "class",
      breakdown: "等 (děng) - class",
    },
    {
      char: "等",
      pinyin: "děng",
      meaning: "class",
      breakdown: "等 (děng) - class",
    },
    {
      char: "底",
      pinyin: "dǐ",
      meaning: "background",
      breakdown: "底 (dǐ) - background",
    },
    {
      char: "地球",
      pinyin: "dì qiú",
      meaning: "the Earth",
      breakdown: "地球 (dì qiú) - the Earth",
    },
    {
      char: "地址",
      pinyin: "dì zhǐ",
      meaning: "address",
      breakdown: "地址 (dì zhǐ) - address",
    },
    {
      char: "掉",
      pinyin: "diào",
      meaning: "to fall",
      breakdown: "掉 (diào) - to fall",
    },
    {
      char: "调查",
      pinyin: "diào chá",
      meaning: "investigation",
      breakdown: "调查 (diào chá) - investigation",
    },
    {
      char: "丢",
      pinyin: "diū",
      meaning: "to lose",
      breakdown: "丢 (diū) - to lose",
    },
    {
      char: "动作",
      pinyin: "dòng zuò",
      meaning: "movement",
      breakdown: "动作 (dòng zuò) - movement",
    },
    {
      char: "堵车",
      pinyin: "dǔ chē",
      meaning: "traffic jam",
      breakdown: "堵车 (dǔ chē) - traffic jam",
    },
    {
      char: "肚子",
      pinyin: "dù zi",
      meaning: "belly",
      breakdown: "肚子 (dù zi) - belly",
    },
    {
      char: "断",
      pinyin: "duàn",
      meaning: "to break",
      breakdown: "断 (duàn) - to break",
    },
    {
      char: "对",
      pinyin: "duì",
      meaning: "couple",
      breakdown: "对 (duì) - couple",
    },
    {
      char: "对",
      pinyin: "duì",
      meaning: "couple",
      breakdown: "对 (duì) - couple",
    },
    {
      char: "对话",
      pinyin: "duì huà",
      meaning: "dialog",
      breakdown: "对话 (duì huà) - dialog",
    },
    {
      char: "对面",
      pinyin: "duì miàn",
      meaning: "(sitting) opposite",
      breakdown: "对面 (duì miàn) - (sitting) opposite",
    },
    {
      char: "顿",
      pinyin: "dùn",
      meaning: "to stop",
      breakdown: "顿 (dùn) - to stop",
    },
    {
      char: "朵",
      pinyin: "duǒ",
      meaning: "flower",
      breakdown: "朵 (duǒ) - flower",
    },
    { char: "而", pinyin: "ér", meaning: "and", breakdown: "而 (ér) - and" },
    {
      char: "儿童",
      pinyin: "ér tóng",
      meaning: "child",
      breakdown: "儿童 (ér tóng) - child",
    },
    {
      char: "发",
      pinyin: "fā",
      meaning: "to send out",
      breakdown: "发 (fā) - to send out",
    },
    {
      char: "发生",
      pinyin: "fā shēng",
      meaning: "to happen",
      breakdown: "发生 (fā shēng) - to happen",
    },
    {
      char: "发展",
      pinyin: "fā zhǎn",
      meaning: "development",
      breakdown: "发展 (fā zhǎn) - development",
    },
    {
      char: "法律",
      pinyin: "fǎ lǜ",
      meaning: "law",
      breakdown: "法律 (fǎ lǜ) - law",
    },
    {
      char: "翻译",
      pinyin: "fān yì",
      meaning: "to translate",
      breakdown: "翻译 (fān yì) - to translate",
    },
    {
      char: "烦恼",
      pinyin: "fán nǎo",
      meaning: "to be worried",
      breakdown: "烦恼 (fán nǎo) - to be worried",
    },
    {
      char: "反对",
      pinyin: "fǎn duì",
      meaning: "to fight against",
      breakdown: "反对 (fǎn duì) - to fight against",
    },
    {
      char: "反映",
      pinyin: "fǎn yìng",
      meaning: "to mirror",
      breakdown: "反映 (fǎn yìng) - to mirror",
    },
    {
      char: "范围",
      pinyin: "fàn wéi",
      meaning: "range",
      breakdown: "范围 (fàn wéi) - range",
    },
    {
      char: "方法",
      pinyin: "fāng fǎ",
      meaning: "method",
      breakdown: "方法 (fāng fǎ) - method",
    },
    {
      char: "方面",
      pinyin: "fāng miàn",
      meaning: "respect",
      breakdown: "方面 (fāng miàn) - respect",
    },
    {
      char: "方向",
      pinyin: "fāng xiàng",
      meaning: "direction",
      breakdown: "方向 (fāng xiàng) - direction",
    },
    {
      char: "访问",
      pinyin: "fǎng wèn",
      meaning: "to visit",
      breakdown: "访问 (fǎng wèn) - to visit",
    },
    {
      char: "放弃",
      pinyin: "fàng qì",
      meaning: "to renounce",
      breakdown: "放弃 (fàng qì) - to renounce",
    },
    {
      char: "放暑假",
      pinyin: "fàng shǔ jià",
      meaning: "The summer holidays",
      breakdown: "放暑假 (fàng shǔ jià) - The summer holidays",
    },
    {
      char: "分之",
      pinyin: "fēn zhī",
      meaning: "(indicating a fraction)",
      breakdown: "分之 (fēn zhī) - (indicating a fraction)",
    },
    {
      char: "份",
      pinyin: "fèn",
      meaning: "classifier for gifts",
      breakdown: "份 (fèn) - classifier for gifts",
    },
    {
      char: "风景",
      pinyin: "fēng jǐng",
      meaning: "scenery",
      breakdown: "风景 (fēng jǐng) - scenery",
    },
    {
      char: "丰富",
      pinyin: "fēng fù",
      meaning: "to enrich",
      breakdown: "丰富 (fēng fù) - to enrich",
    },
    {
      char: "否则",
      pinyin: "fǒu zé",
      meaning: "if not",
      breakdown: "否则 (fǒu zé) - if not",
    },
    {
      char: "符合",
      pinyin: "fú hé",
      meaning: "in keeping with",
      breakdown: "符合 (fú hé) - in keeping with",
    },
    { char: "富", pinyin: "fù", meaning: "rich", breakdown: "富 (fù) - rich" },
    {
      char: "负责",
      pinyin: "fù zé",
      meaning: "to be in charge of",
      breakdown: "负责 (fù zé) - to be in charge of",
    },
    {
      char: "复印",
      pinyin: "fù yìn",
      meaning: "to photocopy",
      breakdown: "复印 (fù yìn) - to photocopy",
    },
    {
      char: "复杂",
      pinyin: "fù zá",
      meaning: "complicated",
      breakdown: "复杂 (fù zá) - complicated",
    },
    {
      char: "父亲",
      pinyin: "fù qīn",
      meaning: "father",
      breakdown: "父亲 (fù qīn) - father",
    },
    {
      char: "改变",
      pinyin: "gǎi biàn",
      meaning: "to change",
      breakdown: "改变 (gǎi biàn) - to change",
    },
    {
      char: "干杯",
      pinyin: "gān bēi",
      meaning: "to drink a toast",
      breakdown: "干杯 (gān bēi) - to drink a toast",
    },
    {
      char: "干燥",
      pinyin: "gān zào",
      meaning: "to dry (of weather)",
      breakdown: "干燥 (gān zào) - to dry (of weather)",
    },
    {
      char: "感动",
      pinyin: "gǎn dòng",
      meaning: "to move (sb)",
      breakdown: "感动 (gǎn dòng) - to move (sb)",
    },
    {
      char: "感觉",
      pinyin: "gǎn jué",
      meaning: "to feel",
      breakdown: "感觉 (gǎn jué) - to feel",
    },
    {
      char: "感情",
      pinyin: "gǎn qíng",
      meaning: "feeling",
      breakdown: "感情 (gǎn qíng) - feeling",
    },
    {
      char: "感谢",
      pinyin: "gǎn xiè",
      meaning: "(express) thanks",
      breakdown: "感谢 (gǎn xiè) - (express) thanks",
    },
    {
      char: "干",
      pinyin: "gàn",
      meaning: "tree trunk",
      breakdown: "干 (gàn) - tree trunk",
    },
    {
      char: "刚刚",
      pinyin: "gāng gang",
      meaning: "just recently",
      breakdown: "刚刚 (gāng gang) - just recently",
    },
    {
      char: "高级",
      pinyin: "gāo jí",
      meaning: "high level",
      breakdown: "高级 (gāo jí) - high level",
    },
    {
      char: "个子",
      pinyin: "gè zi",
      meaning: "height",
      breakdown: "个子 (gè zi) - height",
    },
    { char: "各", pinyin: "gè", meaning: "each", breakdown: "各 (gè) - each" },
    {
      char: "公里",
      pinyin: "gōng lǐ",
      meaning: "kilometer",
      breakdown: "公里 (gōng lǐ) - kilometer",
    },
    {
      char: "工具",
      pinyin: "gōng jù",
      meaning: "tool",
      breakdown: "工具 (gōng jù) - tool",
    },
    {
      char: "工资",
      pinyin: "gōng zī",
      meaning: "wages",
      breakdown: "工资 (gōng zī) - wages",
    },
    {
      char: "共同",
      pinyin: "gòng tóng",
      meaning: "common",
      breakdown: "共同 (gòng tóng) - common",
    },
    {
      char: "够",
      pinyin: "gòu",
      meaning: "to reach",
      breakdown: "够 (gòu) - to reach",
    },
    {
      char: "购物",
      pinyin: "gòu wù",
      meaning: "shopping",
      breakdown: "购物 (gòu wù) - shopping",
    },
    {
      char: "孤单",
      pinyin: "gū dān",
      meaning: "lone",
      breakdown: "孤单 (gū dān) - lone",
    },
    {
      char: "估计",
      pinyin: "gū jì",
      meaning: "to estimate",
      breakdown: "估计 (gū jì) - to estimate",
    },
    {
      char: "鼓励",
      pinyin: "gǔ lì",
      meaning: "to encourage",
      breakdown: "鼓励 (gǔ lì) - to encourage",
    },
    {
      char: "鼓掌",
      pinyin: "gǔ zhǎng",
      meaning: "to applaud",
      breakdown: "鼓掌 (gǔ zhǎng) - to applaud",
    },
    {
      char: "顾客",
      pinyin: "gù kè",
      meaning: "client",
      breakdown: "顾客 (gù kè) - client",
    },
    {
      char: "故意",
      pinyin: "gù yì",
      meaning: "deliberately",
      breakdown: "故意 (gù yì) - deliberately",
    },
    {
      char: "挂",
      pinyin: "guà",
      meaning: "to hang or suspend (from a hook etc)",
      breakdown: "挂 (guà) - to hang or suspend (from a hook etc)",
    },
    {
      char: "关键",
      pinyin: "guān jiàn",
      meaning: "crucial point",
      breakdown: "关键 (guān jiàn) - crucial point",
    },
    {
      char: "观众",
      pinyin: "guān zhòng",
      meaning: "spectators",
      breakdown: "观众 (guān zhòng) - spectators",
    },
    {
      char: "管理",
      pinyin: "guǎn lǐ",
      meaning: "to supervise",
      breakdown: "管理 (guǎn lǐ) - to supervise",
    },
    {
      char: "光",
      pinyin: "guāng",
      meaning: "light",
      breakdown: "光 (guāng) - light",
    },
    {
      char: "广播",
      pinyin: "guǎng bō",
      meaning: "broadcast",
      breakdown: "广播 (guǎng bō) - broadcast",
    },
    {
      char: "广告",
      pinyin: "guǎng gào",
      meaning: "to advertise",
      breakdown: "广告 (guǎng gào) - to advertise",
    },
    {
      char: "逛",
      pinyin: "guàng",
      meaning: "to stroll",
      breakdown: "逛 (guàng) - to stroll",
    },
    {
      char: "规定",
      pinyin: "guī dìng",
      meaning: "provision",
      breakdown: "规定 (guī dìng) - provision",
    },
    {
      char: "国际",
      pinyin: "guó jì",
      meaning: "international",
      breakdown: "国际 (guó jì) - international",
    },
    {
      char: "果然",
      pinyin: "guǒ rán",
      meaning: "really",
      breakdown: "果然 (guǒ rán) - really",
    },
    {
      char: "过",
      pinyin: "guò",
      meaning: "(experienced action marker)",
      breakdown: "过 (guò) - (experienced action marker)",
    },
    {
      char: "过",
      pinyin: "guò",
      meaning: "(experienced action marker)",
      breakdown: "过 (guò) - (experienced action marker)",
    },
    {
      char: "过程",
      pinyin: "guò chéng",
      meaning: "course of events",
      breakdown: "过程 (guò chéng) - course of events",
    },
    {
      char: "海洋",
      pinyin: "hǎi yáng",
      meaning: "ocean",
      breakdown: "海洋 (hǎi yáng) - ocean",
    },
    {
      char: "害羞",
      pinyin: "hài xiū",
      meaning: "shy",
      breakdown: "害羞 (hài xiū) - shy",
    },
    {
      char: "寒假",
      pinyin: "hán jià",
      meaning: "winter vacation",
      breakdown: "寒假 (hán jià) - winter vacation",
    },
    {
      char: "汗",
      pinyin: "hàn",
      meaning: "perspiration",
      breakdown: "汗 (hàn) - perspiration",
    },
    {
      char: "航班",
      pinyin: "háng bān",
      meaning: "scheduled flight",
      breakdown: "航班 (háng bān) - scheduled flight",
    },
    {
      char: "好处",
      pinyin: "hǎo chu",
      meaning: "benefit",
      breakdown: "好处 (hǎo chu) - benefit",
    },
    {
      char: "好像",
      pinyin: "hǎo xiàng",
      meaning: "as if",
      breakdown: "好像 (hǎo xiàng) - as if",
    },
    {
      char: "号码",
      pinyin: "hào mǎ",
      meaning: "number",
      breakdown: "号码 (hào mǎ) - number",
    },
    {
      char: "合格",
      pinyin: "hé gé",
      meaning: "qualified",
      breakdown: "合格 (hé gé) - qualified",
    },
    {
      char: "合适",
      pinyin: "hé shì",
      meaning: "suitable",
      breakdown: "合适 (hé shì) - suitable",
    },
    {
      char: "盒子",
      pinyin: "hé zi",
      meaning: "case",
      breakdown: "盒子 (hé zi) - case",
    },
    {
      char: "猴子",
      pinyin: "hóu zi",
      meaning: "monkey",
      breakdown: "猴子 (hóu zi) - monkey",
    },
    {
      char: "厚",
      pinyin: "hòu",
      meaning: "thick",
      breakdown: "厚 (hòu) - thick",
    },
    {
      char: "后悔",
      pinyin: "hòu huǐ",
      meaning: "to regret",
      breakdown: "后悔 (hòu huǐ) - to regret",
    },
    {
      char: "后来",
      pinyin: "hòu lái",
      meaning: "afterwards",
      breakdown: "后来 (hòu lái) - afterwards",
    },
    {
      char: "忽然",
      pinyin: "hū rán",
      meaning: "suddenly",
      breakdown: "忽然 (hū rán) - suddenly",
    },
    {
      char: "互相",
      pinyin: "hù xiāng",
      meaning: "each other",
      breakdown: "互相 (hù xiāng) - each other",
    },
    {
      char: "护士",
      pinyin: "hù shi",
      meaning: "nurse",
      breakdown: "护士 (hù shi) - nurse",
    },
    {
      char: "怀疑",
      pinyin: "huái yí",
      meaning: "to doubt",
      breakdown: "怀疑 (huái yí) - to doubt",
    },
    {
      char: "回忆",
      pinyin: "huí yì",
      meaning: "to recall",
      breakdown: "回忆 (huí yì) - to recall",
    },
    {
      char: "活动",
      pinyin: "huó dòng",
      meaning: "to exercise",
      breakdown: "活动 (huó dòng) - to exercise",
    },
    {
      char: "活泼",
      pinyin: "huó po",
      meaning: "lively",
      breakdown: "活泼 (huó po) - lively",
    },
    {
      char: "火",
      pinyin: "huǒ",
      meaning: "fire",
      breakdown: "火 (huǒ) - fire",
    },
    {
      char: "获得",
      pinyin: "huò dé",
      meaning: "to obtain",
      breakdown: "获得 (huò dé) - to obtain",
    },
    {
      char: "基础",
      pinyin: "jī chǔ",
      meaning: "base",
      breakdown: "基础 (jī chǔ) - base",
    },
    {
      char: "激动",
      pinyin: "jī dòng",
      meaning: "to excite",
      breakdown: "激动 (jī dòng) - to excite",
    },
    {
      char: "积极",
      pinyin: "jī jí",
      meaning: "active",
      breakdown: "积极 (jī jí) - active",
    },
    {
      char: "积累",
      pinyin: "jī lěi",
      meaning: "to accumulate",
      breakdown: "积累 (jī lěi) - to accumulate",
    },
    {
      char: "极其",
      pinyin: "jí qí",
      meaning: "extremely",
      breakdown: "极其 (jí qí) - extremely",
    },
    {
      char: "即使",
      pinyin: "jí shǐ",
      meaning: "even if",
      breakdown: "即使 (jí shǐ) - even if",
    },
    {
      char: "及时",
      pinyin: "jí shí",
      meaning: "in time",
      breakdown: "及时 (jí shí) - in time",
    },
    {
      char: "集合",
      pinyin: "jí hé",
      meaning: "to gather",
      breakdown: "集合 (jí hé) - to gather",
    },
    {
      char: "寄",
      pinyin: "jì",
      meaning: "to live (in a house)",
      breakdown: "寄 (jì) - to live (in a house)",
    },
    {
      char: "继续",
      pinyin: "jì xù",
      meaning: "to continue",
      breakdown: "继续 (jì xù) - to continue",
    },
    {
      char: "记者",
      pinyin: "jì zhě",
      meaning: "reporter",
      breakdown: "记者 (jì zhě) - reporter",
    },
    {
      char: "计划",
      pinyin: "jì huà",
      meaning: "plan",
      breakdown: "计划 (jì huà) - plan",
    },
    {
      char: "技术",
      pinyin: "jì shù",
      meaning: "technology",
      breakdown: "技术 (jì shù) - technology",
    },
    {
      char: "既然",
      pinyin: "jì rán",
      meaning: "since",
      breakdown: "既然 (jì rán) - since",
    },
    {
      char: "家具",
      pinyin: "jiā jù",
      meaning: "furniture",
      breakdown: "家具 (jiā jù) - furniture",
    },
    {
      char: "加班",
      pinyin: "jiā bān",
      meaning: "to work overtime",
      breakdown: "加班 (jiā bān) - to work overtime",
    },
    {
      char: "加油站",
      pinyin: "jiā yóu zhàn",
      meaning: "gas station",
      breakdown: "加油站 (jiā yóu zhàn) - gas station",
    },
    {
      char: "假",
      pinyin: "jiǎ",
      meaning: "fake",
      breakdown: "假 (jiǎ) - fake",
    },
    {
      char: "价格",
      pinyin: "jià gé",
      meaning: "price",
      breakdown: "价格 (jià gé) - price",
    },
    {
      char: "坚持",
      pinyin: "jiān chí",
      meaning: "to persevere with",
      breakdown: "坚持 (jiān chí) - to persevere with",
    },
    {
      char: "减肥",
      pinyin: "jiǎn féi",
      meaning: "to lose weight",
      breakdown: "减肥 (jiǎn féi) - to lose weight",
    },
    {
      char: "减少",
      pinyin: "jiǎn shǎo",
      meaning: "to lessen",
      breakdown: "减少 (jiǎn shǎo) - to lessen",
    },
    {
      char: "将来",
      pinyin: "jiāng lái",
      meaning: "in the future",
      breakdown: "将来 (jiāng lái) - in the future",
    },
    {
      char: "奖金",
      pinyin: "jiǎng jīn",
      meaning: "premium",
      breakdown: "奖金 (jiǎng jīn) - premium",
    },
    {
      char: "降低",
      pinyin: "jiàng dī",
      meaning: "to reduce",
      breakdown: "降低 (jiàng dī) - to reduce",
    },
    {
      char: "交",
      pinyin: "jiāo",
      meaning: "to hand over",
      breakdown: "交 (jiāo) - to hand over",
    },
    {
      char: "交流",
      pinyin: "jiāo liú",
      meaning: "to exchange",
      breakdown: "交流 (jiāo liú) - to exchange",
    },
    {
      char: "交通",
      pinyin: "jiāo tōng",
      meaning: "to be connected",
      breakdown: "交通 (jiāo tōng) - to be connected",
    },
    {
      char: "骄傲",
      pinyin: "jiāo ào",
      meaning: "pride",
      breakdown: "骄傲 (jiāo ào) - pride",
    },
    {
      char: "饺子",
      pinyin: "jiǎo zi",
      meaning: "dumpling",
      breakdown: "饺子 (jiǎo zi) - dumpling",
    },
    {
      char: "教授",
      pinyin: "jiào shòu",
      meaning: "professor",
      breakdown: "教授 (jiào shòu) - professor",
    },
    {
      char: "教育",
      pinyin: "jiào yù",
      meaning: "to educate",
      breakdown: "教育 (jiào yù) - to educate",
    },
    {
      char: "接受",
      pinyin: "jiē shòu",
      meaning: "to accept",
      breakdown: "接受 (jiē shòu) - to accept",
    },
    {
      char: "节约",
      pinyin: "jié yuē",
      meaning: "to economize",
      breakdown: "节约 (jié yuē) - to economize",
    },
    {
      char: "结果",
      pinyin: "jié guǒ",
      meaning: "outcome",
      breakdown: "结果 (jié guǒ) - outcome",
    },
    {
      char: "解释",
      pinyin: "jiě shì",
      meaning: "explanation",
      breakdown: "解释 (jiě shì) - explanation",
    },
    {
      char: "紧张",
      pinyin: "jǐn zhāng",
      meaning: "nervous",
      breakdown: "紧张 (jǐn zhāng) - nervous",
    },
    {
      char: "尽管",
      pinyin: "jǐn guǎn",
      meaning: "despite",
      breakdown: "尽管 (jǐn guǎn) - despite",
    },
    {
      char: "进行",
      pinyin: "jìn xíng",
      meaning: "to advance",
      breakdown: "进行 (jìn xíng) - to advance",
    },
    {
      char: "禁止",
      pinyin: "jìn zhǐ",
      meaning: "to prohibit",
      breakdown: "禁止 (jìn zhǐ) - to prohibit",
    },
    {
      char: "精彩",
      pinyin: "jīng cǎi",
      meaning: "brilliant",
      breakdown: "精彩 (jīng cǎi) - brilliant",
    },
    {
      char: "精神",
      pinyin: "jīng shén",
      meaning: "spirit",
      breakdown: "精神 (jīng shén) - spirit",
    },
    {
      char: "经济",
      pinyin: "jīng jì",
      meaning: "economy",
      breakdown: "经济 (jīng jì) - economy",
    },
    {
      char: "经历",
      pinyin: "jīng lì",
      meaning: "experience",
      breakdown: "经历 (jīng lì) - experience",
    },
    {
      char: "经验",
      pinyin: "jīng yàn",
      meaning: "to experience",
      breakdown: "经验 (jīng yàn) - to experience",
    },
    {
      char: "京剧",
      pinyin: "Jīng jù",
      meaning: "Beijing opera",
      breakdown: "京剧 (Jīng jù) - Beijing opera",
    },
    {
      char: "警察",
      pinyin: "jǐng chá",
      meaning: "police",
      breakdown: "警察 (jǐng chá) - police",
    },
    {
      char: "竟然",
      pinyin: "jìng rán",
      meaning: "unexpectedly",
      breakdown: "竟然 (jìng rán) - unexpectedly",
    },
    {
      char: "竞争",
      pinyin: "jìng zhēng",
      meaning: "to compete",
      breakdown: "竞争 (jìng zhēng) - to compete",
    },
    {
      char: "镜子",
      pinyin: "jìng zi",
      meaning: "mirror",
      breakdown: "镜子 (jìng zi) - mirror",
    },
    {
      char: "究竟",
      pinyin: "jiū jìng",
      meaning: "after all (when all is said and done)",
      breakdown: "究竟 (jiū jìng) - after all (when all is said and done)",
    },
    {
      char: "举办",
      pinyin: "jǔ bàn",
      meaning: "to conduct",
      breakdown: "举办 (jǔ bàn) - to conduct",
    },
    {
      char: "拒绝",
      pinyin: "jù jué",
      meaning: "to refuse",
      breakdown: "拒绝 (jù jué) - to refuse",
    },
    {
      char: "距离",
      pinyin: "jù lí",
      meaning: "distance",
      breakdown: "距离 (jù lí) - distance",
    },
    {
      char: "开玩笑",
      pinyin: "kāi wán xiào",
      meaning: "to play a joke",
      breakdown: "开玩笑 (kāi wán xiào) - to play a joke",
    },
    {
      char: "看法",
      pinyin: "kàn fǎ",
      meaning: "way of looking at a thing",
      breakdown: "看法 (kàn fǎ) - way of looking at a thing",
    },
    {
      char: "考虑",
      pinyin: "kǎo lǜ",
      meaning: "to think over",
      breakdown: "考虑 (kǎo lǜ) - to think over",
    },
    {
      char: "棵",
      pinyin: "kē",
      meaning: "classifier for trees",
      breakdown: "棵 (kē) - classifier for trees",
    },
    {
      char: "科学",
      pinyin: "kē xué",
      meaning: "science",
      breakdown: "科学 (kē xué) - science",
    },
    {
      char: "咳嗽",
      pinyin: "ké sou",
      meaning: "to cough",
      breakdown: "咳嗽 (ké sou) - to cough",
    },
    {
      char: "可怜",
      pinyin: "kě lián",
      meaning: "pitiful",
      breakdown: "可怜 (kě lián) - pitiful",
    },
    {
      char: "可是",
      pinyin: "kě shì",
      meaning: "but",
      breakdown: "可是 (kě shì) - but",
    },
    {
      char: "可惜",
      pinyin: "kě xī",
      meaning: "it is a pity",
      breakdown: "可惜 (kě xī) - it is a pity",
    },
    {
      char: "肯定",
      pinyin: "kěn dìng",
      meaning: "to be sure",
      breakdown: "肯定 (kěn dìng) - to be sure",
    },
    {
      char: "空气",
      pinyin: "kōng qì",
      meaning: "air",
      breakdown: "空气 (kōng qì) - air",
    },
    {
      char: "恐怕",
      pinyin: "kǒng pà",
      meaning: "fear",
      breakdown: "恐怕 (kǒng pà) - fear",
    },
    {
      char: "苦",
      pinyin: "kǔ",
      meaning: "bitter",
      breakdown: "苦 (kǔ) - bitter",
    },
    {
      char: "宽",
      pinyin: "kuān",
      meaning: "lenient",
      breakdown: "宽 (kuān) - lenient",
    },
    {
      char: "困",
      pinyin: "kùn",
      meaning: "sleepy",
      breakdown: "困 (kùn) - sleepy",
    },
    {
      char: "困难",
      pinyin: "kùn nan",
      meaning: "difficult",
      breakdown: "困难 (kùn nan) - difficult",
    },
    {
      char: "扩大",
      pinyin: "kuò dà",
      meaning: "to expand",
      breakdown: "扩大 (kuò dà) - to expand",
    },
    {
      char: "拉",
      pinyin: "lā",
      meaning: "to pull",
      breakdown: "拉 (lā) - to pull",
    },
    {
      char: "垃圾桶",
      pinyin: "lā jī tǒng",
      meaning: "rubbish bin",
      breakdown: "垃圾桶 (lā jī tǒng) - rubbish bin",
    },
    {
      char: "辣",
      pinyin: "là",
      meaning: "hot (spicy)",
      breakdown: "辣 (là) - hot (spicy)",
    },
    {
      char: "来不及",
      pinyin: "lái bu jí",
      meaning: "there's not enough time (to do sth)",
      breakdown: "来不及 (lái bu jí) - there's not enough time (to do sth)",
    },
    {
      char: "来得及",
      pinyin: "lái de jí",
      meaning: "there's still time",
      breakdown: "来得及 (lái de jí) - there's still time",
    },
    {
      char: "懒",
      pinyin: "lǎn",
      meaning: "lazy",
      breakdown: "懒 (lǎn) - lazy",
    },
    {
      char: "浪费",
      pinyin: "làng fèi",
      meaning: "to waste",
      breakdown: "浪费 (làng fèi) - to waste",
    },
    {
      char: "浪漫",
      pinyin: "làng màn",
      meaning: "romantic",
      breakdown: "浪漫 (làng màn) - romantic",
    },
    {
      char: "老虎",
      pinyin: "lǎo hǔ",
      meaning: "tiger",
      breakdown: "老虎 (lǎo hǔ) - tiger",
    },
    {
      char: "冷静",
      pinyin: "lěng jìng",
      meaning: "calm",
      breakdown: "冷静 (lěng jìng) - calm",
    },
    {
      char: "礼貌",
      pinyin: "lǐ mào",
      meaning: "courtesy",
      breakdown: "礼貌 (lǐ mào) - courtesy",
    },
    {
      char: "理发",
      pinyin: "lǐ fà",
      meaning: "a barber",
      breakdown: "理发 (lǐ fà) - a barber",
    },
    {
      char: "理解",
      pinyin: "lǐ jiě",
      meaning: "to comprehend",
      breakdown: "理解 (lǐ jiě) - to comprehend",
    },
    {
      char: "理想",
      pinyin: "lǐ xiǎng",
      meaning: "a dream",
      breakdown: "理想 (lǐ xiǎng) - a dream",
    },
    {
      char: "厉害",
      pinyin: "lì hai",
      meaning: "difficult to deal with",
      breakdown: "厉害 (lì hai) - difficult to deal with",
    },
    {
      char: "力气",
      pinyin: "lì qi",
      meaning: "strength",
      breakdown: "力气 (lì qi) - strength",
    },
    {
      char: "例如",
      pinyin: "lì rú",
      meaning: "for example",
      breakdown: "例如 (lì rú) - for example",
    },
    {
      char: "俩",
      pinyin: "liǎ",
      meaning: "two (colloquial equivalent of 兩個|两个)",
      breakdown: "俩 (liǎ) - two (colloquial equivalent of 兩個|两个)",
    },
    {
      char: "连",
      pinyin: "lián",
      meaning: "to link",
      breakdown: "连 (lián) - to link",
    },
    {
      char: "联系",
      pinyin: "lián xì",
      meaning: "connection",
      breakdown: "联系 (lián xì) - connection",
    },
    {
      char: "凉快",
      pinyin: "liáng kuai",
      meaning: "nice and cold",
      breakdown: "凉快 (liáng kuai) - nice and cold",
    },
    {
      char: "亮",
      pinyin: "liàng",
      meaning: "bright",
      breakdown: "亮 (liàng) - bright",
    },
    {
      char: "聊天",
      pinyin: "liáo tiān",
      meaning: "to chat",
      breakdown: "聊天 (liáo tiān) - to chat",
    },
    {
      char: "另外",
      pinyin: "lìng wài",
      meaning: "additional",
      breakdown: "另外 (lìng wài) - additional",
    },
    {
      char: "留",
      pinyin: "liú",
      meaning: "to leave (a message etc)",
      breakdown: "留 (liú) - to leave (a message etc)",
    },
    {
      char: "留学",
      pinyin: "liú xué",
      meaning: "to study abroad",
      breakdown: "留学 (liú xué) - to study abroad",
    },
    {
      char: "流泪",
      pinyin: "liú lèi",
      meaning: "to shed tears",
      breakdown: "流泪 (liú lèi) - to shed tears",
    },
    {
      char: "流利",
      pinyin: "liú lì",
      meaning: "fluent",
      breakdown: "流利 (liú lì) - fluent",
    },
    {
      char: "流行",
      pinyin: "liú xíng",
      meaning: "to spread",
      breakdown: "流行 (liú xíng) - to spread",
    },
    {
      char: "乱",
      pinyin: "luàn",
      meaning: "in confusion or disorder",
      breakdown: "乱 (luàn) - in confusion or disorder",
    },
    {
      char: "律师",
      pinyin: "lǜ shī",
      meaning: "lawyer",
      breakdown: "律师 (lǜ shī) - lawyer",
    },
    {
      char: "麻烦",
      pinyin: "má fan",
      meaning: "inconvenient",
      breakdown: "麻烦 (má fan) - inconvenient",
    },
    {
      char: "马虎",
      pinyin: "mǎ hu",
      meaning: "careless",
      breakdown: "马虎 (mǎ hu) - careless",
    },
    {
      char: "满",
      pinyin: "mǎn",
      meaning: "full",
      breakdown: "满 (mǎn) - full",
    },
    {
      char: "毛巾",
      pinyin: "máo jīn",
      meaning: "towel",
      breakdown: "毛巾 (máo jīn) - towel",
    },
    {
      char: "美丽",
      pinyin: "měi lì",
      meaning: "beautiful",
      breakdown: "美丽 (měi lì) - beautiful",
    },
    {
      char: "梦",
      pinyin: "mèng",
      meaning: "dream",
      breakdown: "梦 (mèng) - dream",
    },
    {
      char: "密码",
      pinyin: "mì mǎ",
      meaning: "code",
      breakdown: "密码 (mì mǎ) - code",
    },
    {
      char: "免费",
      pinyin: "miǎn fèi",
      meaning: "free (of charge)",
      breakdown: "免费 (miǎn fèi) - free (of charge)",
    },
    {
      char: "民族",
      pinyin: "mín zú",
      meaning: "nationality",
      breakdown: "民族 (mín zú) - nationality",
    },
    {
      char: "母亲",
      pinyin: "mǔ qīn",
      meaning: "mother",
      breakdown: "母亲 (mǔ qīn) - mother",
    },
    {
      char: "目的",
      pinyin: "mù dì",
      meaning: "purpose",
      breakdown: "目的 (mù dì) - purpose",
    },
    {
      char: "耐心",
      pinyin: "nài xīn",
      meaning: "to be patient",
      breakdown: "耐心 (nài xīn) - to be patient",
    },
    {
      char: "难道",
      pinyin: "nán dào",
      meaning: "don't tell me ...",
      breakdown: "难道 (nán dào) - don't tell me ...",
    },
    {
      char: "难受",
      pinyin: "nán shòu",
      meaning: "to feel unwell",
      breakdown: "难受 (nán shòu) - to feel unwell",
    },
    {
      char: "内",
      pinyin: "nèi",
      meaning: "inside",
      breakdown: "内 (nèi) - inside",
    },
    {
      char: "内容",
      pinyin: "nèi róng",
      meaning: "content",
      breakdown: "内容 (nèi róng) - content",
    },
    {
      char: "能力",
      pinyin: "néng lì",
      meaning: "capability",
      breakdown: "能力 (néng lì) - capability",
    },
    {
      char: "年龄",
      pinyin: "nián líng",
      meaning: "(a person's) age",
      breakdown: "年龄 (nián líng) - (a person's) age",
    },
    {
      char: "农村",
      pinyin: "nóng cūn",
      meaning: "rural area",
      breakdown: "农村 (nóng cūn) - rural area",
    },
    {
      char: "弄",
      pinyin: "nòng",
      meaning: "to do",
      breakdown: "弄 (nòng) - to do",
    },
    {
      char: "暖和",
      pinyin: "nuǎn huo",
      meaning: "warm",
      breakdown: "暖和 (nuǎn huo) - warm",
    },
    {
      char: "偶尔",
      pinyin: "ǒu ěr",
      meaning: "occasionally",
      breakdown: "偶尔 (ǒu ěr) - occasionally",
    },
    {
      char: "排列",
      pinyin: "pái liè",
      meaning: "array",
      breakdown: "排列 (pái liè) - array",
    },
    {
      char: "判断",
      pinyin: "pàn duàn",
      meaning: "to decide",
      breakdown: "判断 (pàn duàn) - to decide",
    },
    {
      char: "陪",
      pinyin: "péi",
      meaning: "to accompany",
      breakdown: "陪 (péi) - to accompany",
    },
    {
      char: "批评",
      pinyin: "pī píng",
      meaning: "to criticize",
      breakdown: "批评 (pī píng) - to criticize",
    },
    {
      char: "皮肤",
      pinyin: "pí fū",
      meaning: "skin",
      breakdown: "皮肤 (pí fū) - skin",
    },
    {
      char: "脾气",
      pinyin: "pí qi",
      meaning: "character",
      breakdown: "脾气 (pí qi) - character",
    },
    {
      char: "篇",
      pinyin: "piān",
      meaning: "sheet",
      breakdown: "篇 (piān) - sheet",
    },
    {
      char: "骗",
      pinyin: "piàn",
      meaning: "to cheat",
      breakdown: "骗 (piàn) - to cheat",
    },
    {
      char: "乒乓球",
      pinyin: "pīng pāng qiú",
      meaning: "table tennis",
      breakdown: "乒乓球 (pīng pāng qiú) - table tennis",
    },
    {
      char: "平时",
      pinyin: "píng shí",
      meaning: "ordinarily",
      breakdown: "平时 (píng shí) - ordinarily",
    },
    {
      char: "瓶子",
      pinyin: "píng zi",
      meaning: "bottle",
      breakdown: "瓶子 (píng zi) - bottle",
    },
    {
      char: "破",
      pinyin: "pò",
      meaning: "broken",
      breakdown: "破 (pò) - broken",
    },
    {
      char: "普遍",
      pinyin: "pǔ biàn",
      meaning: "universal",
      breakdown: "普遍 (pǔ biàn) - universal",
    },
    {
      char: "其次",
      pinyin: "qí cì",
      meaning: "next",
      breakdown: "其次 (qí cì) - next",
    },
    {
      char: "其中",
      pinyin: "qí zhōng",
      meaning: "among",
      breakdown: "其中 (qí zhōng) - among",
    },
    {
      char: "起飞",
      pinyin: "qǐ fēi",
      meaning: "to take off (in an airplane)",
      breakdown: "起飞 (qǐ fēi) - to take off (in an airplane)",
    },
    {
      char: "起来",
      pinyin: "qi lai",
      meaning: "(after a verb)",
      breakdown: "起来 (qi lai) - (after a verb)",
    },
    {
      char: "气候",
      pinyin: "qì hòu",
      meaning: "climate",
      breakdown: "气候 (qì hòu) - climate",
    },
    {
      char: "千万",
      pinyin: "qiān wàn",
      meaning: "ten million",
      breakdown: "千万 (qiān wàn) - ten million",
    },
    {
      char: "签证",
      pinyin: "qiān zhèng",
      meaning: "visa",
      breakdown: "签证 (qiān zhèng) - visa",
    },
    {
      char: "墙",
      pinyin: "qiáng",
      meaning: "wall",
      breakdown: "墙 (qiáng) - wall",
    },
    {
      char: "敲",
      pinyin: "qiāo",
      meaning: "to hit",
      breakdown: "敲 (qiāo) - to hit",
    },
    {
      char: "桥",
      pinyin: "qiáo",
      meaning: "bridge",
      breakdown: "桥 (qiáo) - bridge",
    },
    {
      char: "巧克力",
      pinyin: "qiǎo kè lì",
      meaning: "chocolate (loanword)",
      breakdown: "巧克力 (qiǎo kè lì) - chocolate (loanword)",
    },
    {
      char: "亲戚",
      pinyin: "qīn qi",
      meaning: "a relative (i.e. family relation)",
      breakdown: "亲戚 (qīn qi) - a relative (i.e. family relation)",
    },
    {
      char: "轻",
      pinyin: "qīng",
      meaning: "light",
      breakdown: "轻 (qīng) - light",
    },
    {
      char: "轻松",
      pinyin: "qīng sōng",
      meaning: "gentle",
      breakdown: "轻松 (qīng sōng) - gentle",
    },
    {
      char: "情况",
      pinyin: "qíng kuàng",
      meaning: "circumstances",
      breakdown: "情况 (qíng kuàng) - circumstances",
    },
    {
      char: "请假",
      pinyin: "qǐng jià",
      meaning: "to request leave of absence",
      breakdown: "请假 (qǐng jià) - to request leave of absence",
    },
    {
      char: "请客",
      pinyin: "qǐng kè",
      meaning: "to give a dinner party",
      breakdown: "请客 (qǐng kè) - to give a dinner party",
    },
    {
      char: "穷",
      pinyin: "qióng",
      meaning: "exhausted",
      breakdown: "穷 (qióng) - exhausted",
    },
    {
      char: "区别",
      pinyin: "qū bié",
      meaning: "difference",
      breakdown: "区别 (qū bié) - difference",
    },
    {
      char: "取",
      pinyin: "qǔ",
      meaning: "to take",
      breakdown: "取 (qǔ) - to take",
    },
    {
      char: "全部",
      pinyin: "quán bù",
      meaning: "whole",
      breakdown: "全部 (quán bù) - whole",
    },
    {
      char: "缺点",
      pinyin: "quē diǎn",
      meaning: "weak point",
      breakdown: "缺点 (quē diǎn) - weak point",
    },
    {
      char: "缺少",
      pinyin: "quē shǎo",
      meaning: "lack",
      breakdown: "缺少 (quē shǎo) - lack",
    },
    { char: "却", pinyin: "què", meaning: "but", breakdown: "却 (què) - but" },
    {
      char: "确实",
      pinyin: "què shí",
      meaning: "indeed",
      breakdown: "确实 (què shí) - indeed",
    },
    {
      char: "群",
      pinyin: "qún",
      meaning: "group",
      breakdown: "群 (qún) - group",
    },
    {
      char: "然而",
      pinyin: "rán ér",
      meaning: "however",
      breakdown: "然而 (rán ér) - however",
    },
    {
      char: "热闹",
      pinyin: "rè nao",
      meaning: "bustling with noise and excitement",
      breakdown: "热闹 (rè nao) - bustling with noise and excitement",
    },
    {
      char: "人民币",
      pinyin: "rén mín bì",
      meaning: "Renminbi (RMB)",
      breakdown: "人民币 (rén mín bì) - Renminbi (RMB)",
    },
    {
      char: "任何",
      pinyin: "rèn hé",
      meaning: "any",
      breakdown: "任何 (rèn hé) - any",
    },
    {
      char: "任务",
      pinyin: "rèn wu",
      meaning: "mission",
      breakdown: "任务 (rèn wu) - mission",
    },
    {
      char: "扔",
      pinyin: "rēng",
      meaning: "to throw",
      breakdown: "扔 (rēng) - to throw",
    },
    {
      char: "仍然",
      pinyin: "réng rán",
      meaning: "still",
      breakdown: "仍然 (réng rán) - still",
    },
    {
      char: "日记",
      pinyin: "rì jì",
      meaning: "diary",
      breakdown: "日记 (rì jì) - diary",
    },
    {
      char: "入口",
      pinyin: "rù kǒu",
      meaning: "entrance",
      breakdown: "入口 (rù kǒu) - entrance",
    },
    {
      char: "软",
      pinyin: "ruǎn",
      meaning: "soft",
      breakdown: "软 (ruǎn) - soft",
    },
    {
      char: "散步",
      pinyin: "sàn bù",
      meaning: "to take a walk",
      breakdown: "散步 (sàn bù) - to take a walk",
    },
    {
      char: "森林",
      pinyin: "sēn lín",
      meaning: "forest",
      breakdown: "森林 (sēn lín) - forest",
    },
    {
      char: "沙发",
      pinyin: "shā fā",
      meaning: "sofa",
      breakdown: "沙发 (shā fā) - sofa",
    },
    {
      char: "商量",
      pinyin: "shāng liang",
      meaning: "to consult",
      breakdown: "商量 (shāng liang) - to consult",
    },
    {
      char: "伤心",
      pinyin: "shāng xīn",
      meaning: "to grieve",
      breakdown: "伤心 (shāng xīn) - to grieve",
    },
    {
      char: "稍微",
      pinyin: "shāo wēi",
      meaning: "a little bit",
      breakdown: "稍微 (shāo wēi) - a little bit",
    },
    {
      char: "社会",
      pinyin: "shè huì",
      meaning: "society",
      breakdown: "社会 (shè huì) - society",
    },
    {
      char: "深",
      pinyin: "shēn",
      meaning: "close",
      breakdown: "深 (shēn) - close",
    },
    {
      char: "申请",
      pinyin: "shēn qǐng",
      meaning: "to apply for sth",
      breakdown: "申请 (shēn qǐng) - to apply for sth",
    },
    {
      char: "甚至",
      pinyin: "shèn zhì",
      meaning: "even",
      breakdown: "甚至 (shèn zhì) - even",
    },
    {
      char: "生活",
      pinyin: "shēng huó",
      meaning: "life",
      breakdown: "生活 (shēng huó) - life",
    },
    {
      char: "生命",
      pinyin: "shēng mìng",
      meaning: "life",
      breakdown: "生命 (shēng mìng) - life",
    },
    {
      char: "省",
      pinyin: "shěng",
      meaning: "to save",
      breakdown: "省 (shěng) - to save",
    },
    {
      char: "剩",
      pinyin: "shèng",
      meaning: "to remain",
      breakdown: "剩 (shèng) - to remain",
    },
    {
      char: "失败",
      pinyin: "shī bài",
      meaning: "to be defeated",
      breakdown: "失败 (shī bài) - to be defeated",
    },
    {
      char: "失望",
      pinyin: "shī wàng",
      meaning: "disappointed",
      breakdown: "失望 (shī wàng) - disappointed",
    },
    {
      char: "师傅",
      pinyin: "shī fu",
      meaning: "master",
      breakdown: "师傅 (shī fu) - master",
    },
    {
      char: "湿润",
      pinyin: "shī rùn",
      meaning: "moist",
      breakdown: "湿润 (shī rùn) - moist",
    },
    {
      char: "狮子",
      pinyin: "shī zi",
      meaning: "lion",
      breakdown: "狮子 (shī zi) - lion",
    },
    {
      char: "十分",
      pinyin: "shí fēn",
      meaning: "to divide into ten equal parts",
      breakdown: "十分 (shí fēn) - to divide into ten equal parts",
    },
    {
      char: "实际",
      pinyin: "shí jì",
      meaning: "actual",
      breakdown: "实际 (shí jì) - actual",
    },
    {
      char: "实在",
      pinyin: "shí zài",
      meaning: "really",
      breakdown: "实在 (shí zài) - really",
    },
    {
      char: "食品",
      pinyin: "shí pǐn",
      meaning: "foodstuff",
      breakdown: "食品 (shí pǐn) - foodstuff",
    },
    {
      char: "使用",
      pinyin: "shǐ yòng",
      meaning: "to use",
      breakdown: "使用 (shǐ yòng) - to use",
    },
    {
      char: "试",
      pinyin: "shì",
      meaning: "to test",
      breakdown: "试 (shì) - to test",
    },
    {
      char: "市场",
      pinyin: "shì chǎng",
      meaning: "marketplace",
      breakdown: "市场 (shì chǎng) - marketplace",
    },
    {
      char: "世纪",
      pinyin: "shì jì",
      meaning: "century",
      breakdown: "世纪 (shì jì) - century",
    },
    {
      char: "适合",
      pinyin: "shì hé",
      meaning: "to fit",
      breakdown: "适合 (shì hé) - to fit",
    },
    {
      char: "适应",
      pinyin: "shì yìng",
      meaning: "to adapt",
      breakdown: "适应 (shì yìng) - to adapt",
    },
    {
      char: "收",
      pinyin: "shōu",
      meaning: "to receive",
      breakdown: "收 (shōu) - to receive",
    },
    {
      char: "收入",
      pinyin: "shōu rù",
      meaning: "to take in",
      breakdown: "收入 (shōu rù) - to take in",
    },
    {
      char: "收拾",
      pinyin: "shōu shi",
      meaning: "to put in order",
      breakdown: "收拾 (shōu shi) - to put in order",
    },
    {
      char: "首都",
      pinyin: "shǒu dū",
      meaning: "capital (city)",
      breakdown: "首都 (shǒu dū) - capital (city)",
    },
    {
      char: "首先",
      pinyin: "shǒu xiān",
      meaning: "first (of all)",
      breakdown: "首先 (shǒu xiān) - first (of all)",
    },
    {
      char: "受不了",
      pinyin: "shòu bù liǎo",
      meaning: "unbearable",
      breakdown: "受不了 (shòu bù liǎo) - unbearable",
    },
    {
      char: "受到",
      pinyin: "shòu dào",
      meaning: "to receive",
      breakdown: "受到 (shòu dào) - to receive",
    },
    {
      char: "售货员",
      pinyin: "shòu huò yuán",
      meaning: "salesperson",
      breakdown: "售货员 (shòu huò yuán) - salesperson",
    },
    {
      char: "输",
      pinyin: "shū",
      meaning: "to lose",
      breakdown: "输 (shū) - to lose",
    },
    {
      char: "熟悉",
      pinyin: "shú xī",
      meaning: "to be familiar with",
      breakdown: "熟悉 (shú xī) - to be familiar with",
    },
    {
      char: "数量",
      pinyin: "shù liàng",
      meaning: "amount",
      breakdown: "数量 (shù liàng) - amount",
    },
    {
      char: "数字",
      pinyin: "shù zì",
      meaning: "numeral",
      breakdown: "数字 (shù zì) - numeral",
    },
    {
      char: "帅",
      pinyin: "shuài",
      meaning: "handsome",
      breakdown: "帅 (shuài) - handsome",
    },
    {
      char: "顺便",
      pinyin: "shùn biàn",
      meaning: "conveniently",
      breakdown: "顺便 (shùn biàn) - conveniently",
    },
    {
      char: "顺利",
      pinyin: "shùn lì",
      meaning: "smoothly",
      breakdown: "顺利 (shùn lì) - smoothly",
    },
    {
      char: "顺序",
      pinyin: "shùn xù",
      meaning: "sequence",
      breakdown: "顺序 (shùn xù) - sequence",
    },
    {
      char: "说明",
      pinyin: "shuō míng",
      meaning: "to explain",
      breakdown: "说明 (shuō míng) - to explain",
    },
    {
      char: "硕士",
      pinyin: "shuò shì",
      meaning: "master's degree",
      breakdown: "硕士 (shuò shì) - master's degree",
    },
    {
      char: "死",
      pinyin: "sǐ",
      meaning: "to die",
      breakdown: "死 (sǐ) - to die",
    },
    {
      char: "速度",
      pinyin: "sù dù",
      meaning: "speed",
      breakdown: "速度 (sù dù) - speed",
    },
    {
      char: "塑料袋",
      pinyin: "sù liào dài",
      meaning: "plastic bag",
      breakdown: "塑料袋 (sù liào dài) - plastic bag",
    },
    {
      char: "酸",
      pinyin: "suān",
      meaning: "sour",
      breakdown: "酸 (suān) - sour",
    },
    {
      char: "算",
      pinyin: "suàn",
      meaning: "to regard as",
      breakdown: "算 (suàn) - to regard as",
    },
    {
      char: "随便",
      pinyin: "suí biàn",
      meaning: "as one wishes",
      breakdown: "随便 (suí biàn) - as one wishes",
    },
    {
      char: "随着",
      pinyin: "suí zhe",
      meaning: "along with",
      breakdown: "随着 (suí zhe) - along with",
    },
    {
      char: "孙子",
      pinyin: "sūn zi",
      meaning: "grandson",
      breakdown: "孙子 (sūn zi) - grandson",
    },
    {
      char: "所有",
      pinyin: "suǒ yǒu",
      meaning: "all",
      breakdown: "所有 (suǒ yǒu) - all",
    },
    {
      char: "抬",
      pinyin: "tái",
      meaning: "to lift",
      breakdown: "抬 (tái) - to lift",
    },
    {
      char: "台",
      pinyin: "tái",
      meaning: "typhoon",
      breakdown: "台 (tái) - typhoon",
    },
    {
      char: "态度",
      pinyin: "tài du",
      meaning: "manner",
      breakdown: "态度 (tài du) - manner",
    },
    {
      char: "谈",
      pinyin: "tán",
      meaning: "to speak",
      breakdown: "谈 (tán) - to speak",
    },
    {
      char: "弹",
      pinyin: "tán",
      meaning: "to pluck (a string)",
      breakdown: "弹 (tán) - to pluck (a string)",
    },
    {
      char: "汤",
      pinyin: "tāng",
      meaning: "soup",
      breakdown: "汤 (tāng) - soup",
    },
    {
      char: "躺",
      pinyin: "tǎng",
      meaning: "to recline",
      breakdown: "躺 (tǎng) - to recline",
    },
    {
      char: "趟",
      pinyin: "tàng",
      meaning: "classifier for times",
      breakdown: "趟 (tàng) - classifier for times",
    },
    {
      char: "讨论",
      pinyin: "tǎo lùn",
      meaning: "to discuss",
      breakdown: "讨论 (tǎo lùn) - to discuss",
    },
    {
      char: "讨厌",
      pinyin: "tǎo yàn",
      meaning: "to dislike",
      breakdown: "讨厌 (tǎo yàn) - to dislike",
    },
    {
      char: "特点",
      pinyin: "tè diǎn",
      meaning: "characteristic (feature)",
      breakdown: "特点 (tè diǎn) - characteristic (feature)",
    },
    {
      char: "提供",
      pinyin: "tí gōng",
      meaning: "to offer",
      breakdown: "提供 (tí gōng) - to offer",
    },
    {
      char: "提前",
      pinyin: "tí qián",
      meaning: "to shift to an earlier date",
      breakdown: "提前 (tí qián) - to shift to an earlier date",
    },
    {
      char: "提醒",
      pinyin: "tí xǐng",
      meaning: "to remind",
      breakdown: "提醒 (tí xǐng) - to remind",
    },
    {
      char: "填空",
      pinyin: "tián kòng",
      meaning: "to fill a job vacancy",
      breakdown: "填空 (tián kòng) - to fill a job vacancy",
    },
    {
      char: "条件",
      pinyin: "tiáo jiàn",
      meaning: "condition",
      breakdown: "条件 (tiáo jiàn) - condition",
    },
    {
      char: "停止",
      pinyin: "tíng zhǐ",
      meaning: "to stop",
      breakdown: "停止 (tíng zhǐ) - to stop",
    },
    {
      char: "挺",
      pinyin: "tǐng",
      meaning: "to stick out",
      breakdown: "挺 (tǐng) - to stick out",
    },
    {
      char: "通过",
      pinyin: "tōng guò",
      meaning: "by means of",
      breakdown: "通过 (tōng guò) - by means of",
    },
    {
      char: "通知",
      pinyin: "tōng zhī",
      meaning: "to notify",
      breakdown: "通知 (tōng zhī) - to notify",
    },
    {
      char: "同情",
      pinyin: "tóng qíng",
      meaning: "to sympathize with",
      breakdown: "同情 (tóng qíng) - to sympathize with",
    },
    {
      char: "推",
      pinyin: "tuī",
      meaning: "to push",
      breakdown: "推 (tuī) - to push",
    },
    {
      char: "推迟",
      pinyin: "tuī chí",
      meaning: "to postpone",
      breakdown: "推迟 (tuī chí) - to postpone",
    },
    {
      char: "脱",
      pinyin: "tuō",
      meaning: "to shed",
      breakdown: "脱 (tuō) - to shed",
    },
    {
      char: "袜子",
      pinyin: "wà zi",
      meaning: "socks",
      breakdown: "袜子 (wà zi) - socks",
    },
    {
      char: "完全",
      pinyin: "wán quán",
      meaning: "complete",
      breakdown: "完全 (wán quán) - complete",
    },
    {
      char: "往",
      pinyin: "wǎng",
      meaning: "to go (in a direction)",
      breakdown: "往 (wǎng) - to go (in a direction)",
    },
    {
      char: "往往",
      pinyin: "wǎng wǎng",
      meaning: "often",
      breakdown: "往往 (wǎng wǎng) - often",
    },
    {
      char: "网球",
      pinyin: "wǎng qiú",
      meaning: "tennis",
      breakdown: "网球 (wǎng qiú) - tennis",
    },
    {
      char: "网站",
      pinyin: "wǎng zhàn",
      meaning: "website",
      breakdown: "网站 (wǎng zhàn) - website",
    },
    {
      char: "危险",
      pinyin: "wēi xiǎn",
      meaning: "danger",
      breakdown: "危险 (wēi xiǎn) - danger",
    },
    {
      char: "味道",
      pinyin: "wèi dao",
      meaning: "flavor",
      breakdown: "味道 (wèi dao) - flavor",
    },
    {
      char: "温度",
      pinyin: "wēn dù",
      meaning: "temperature",
      breakdown: "温度 (wēn dù) - temperature",
    },
    {
      char: "文章",
      pinyin: "wén zhāng",
      meaning: "article",
      breakdown: "文章 (wén zhāng) - article",
    },
    {
      char: "握手",
      pinyin: "wò shǒu",
      meaning: "to shake hands",
      breakdown: "握手 (wò shǒu) - to shake hands",
    },
    {
      char: "污染",
      pinyin: "wū rǎn",
      meaning: "pollution",
      breakdown: "污染 (wū rǎn) - pollution",
    },
    { char: "无", pinyin: "wú", meaning: "less", breakdown: "无 (wú) - -less" },
    {
      char: "无聊",
      pinyin: "wú liáo",
      meaning: "bored",
      breakdown: "无聊 (wú liáo) - bored",
    },
    {
      char: "无论",
      pinyin: "wú lùn",
      meaning: "no matter what or how",
      breakdown: "无论 (wú lùn) - no matter what or how",
    },
    {
      char: "误会",
      pinyin: "wù huì",
      meaning: "to misunderstand",
      breakdown: "误会 (wù huì) - to misunderstand",
    },
    {
      char: "西红柿",
      pinyin: "xī hóng shì",
      meaning: "tomato",
      breakdown: "西红柿 (xī hóng shì) - tomato",
    },
    {
      char: "吸引",
      pinyin: "xī yǐn",
      meaning: "to attract (interest)",
      breakdown: "吸引 (xī yǐn) - to attract (interest)",
    },
    {
      char: "洗衣机",
      pinyin: "xǐ yī jī",
      meaning: "washer",
      breakdown: "洗衣机 (xǐ yī jī) - washer",
    },
    {
      char: "咸",
      pinyin: "xián",
      meaning: "salted",
      breakdown: "咸 (xián) - salted",
    },
    {
      char: "现代",
      pinyin: "xiàn dài",
      meaning: "modern times",
      breakdown: "现代 (xiàn dài) - modern times",
    },
    {
      char: "羡慕",
      pinyin: "xiàn mù",
      meaning: "to envy",
      breakdown: "羡慕 (xiàn mù) - to envy",
    },
    {
      char: "限制",
      pinyin: "xiàn zhì",
      meaning: "to restrict",
      breakdown: "限制 (xiàn zhì) - to restrict",
    },
    {
      char: "香",
      pinyin: "xiāng",
      meaning: "fragrant",
      breakdown: "香 (xiāng) - fragrant",
    },
    {
      char: "相反",
      pinyin: "xiāng fǎn",
      meaning: "opposite",
      breakdown: "相反 (xiāng fǎn) - opposite",
    },
    {
      char: "详细",
      pinyin: "xiáng xì",
      meaning: "detailed",
      breakdown: "详细 (xiáng xì) - detailed",
    },
    {
      char: "响",
      pinyin: "xiǎng",
      meaning: "echo",
      breakdown: "响 (xiǎng) - echo",
    },
    {
      char: "消息",
      pinyin: "xiāo xi",
      meaning: "news",
      breakdown: "消息 (xiāo xi) - news",
    },
    {
      char: "小说",
      pinyin: "xiǎo shuō",
      meaning: "novel",
      breakdown: "小说 (xiǎo shuō) - novel",
    },
    {
      char: "笑话",
      pinyin: "xiào huà",
      meaning: "joke",
      breakdown: "笑话 (xiào huà) - joke",
    },
    {
      char: "效果",
      pinyin: "xiào guǒ",
      meaning: "result",
      breakdown: "效果 (xiào guǒ) - result",
    },
    {
      char: "心情",
      pinyin: "xīn qíng",
      meaning: "mood",
      breakdown: "心情 (xīn qíng) - mood",
    },
    {
      char: "辛苦",
      pinyin: "xīn kǔ",
      meaning: "hard",
      breakdown: "辛苦 (xīn kǔ) - hard",
    },
    {
      char: "信任",
      pinyin: "xìn rèn",
      meaning: "to trust",
      breakdown: "信任 (xìn rèn) - to trust",
    },
    {
      char: "信心",
      pinyin: "xìn xīn",
      meaning: "confidence",
      breakdown: "信心 (xìn xīn) - confidence",
    },
    {
      char: "信用卡",
      pinyin: "xìn yòng kǎ",
      meaning: "credit card",
      breakdown: "信用卡 (xìn yòng kǎ) - credit card",
    },
    {
      char: "兴奋",
      pinyin: "xīng fèn",
      meaning: "excited",
      breakdown: "兴奋 (xīng fèn) - excited",
    },
    {
      char: "行",
      pinyin: "xíng",
      meaning: "to walk",
      breakdown: "行 (xíng) - to walk",
    },
    {
      char: "醒",
      pinyin: "xǐng",
      meaning: "to wake up",
      breakdown: "醒 (xǐng) - to wake up",
    },
    {
      char: "性别",
      pinyin: "xìng bié",
      meaning: "gender",
      breakdown: "性别 (xìng bié) - gender",
    },
    {
      char: "性格",
      pinyin: "xìng gé",
      meaning: "nature",
      breakdown: "性格 (xìng gé) - nature",
    },
    {
      char: "幸福",
      pinyin: "xìng fú",
      meaning: "happiness",
      breakdown: "幸福 (xìng fú) - happiness",
    },
    {
      char: "修",
      pinyin: "xiū",
      meaning: "to decorate",
      breakdown: "修 (xiū) - to decorate",
    },
    {
      char: "许多",
      pinyin: "xǔ duō",
      meaning: "many",
      breakdown: "许多 (xǔ duō) - many",
    },
    {
      char: "血",
      pinyin: "xuè",
      meaning: "blood",
      breakdown: "血 (xuè) - blood",
    },
    {
      char: "压力",
      pinyin: "yā lì",
      meaning: "pressure",
      breakdown: "压力 (yā lì) - pressure",
    },
    {
      char: "牙膏",
      pinyin: "yá gāo",
      meaning: "toothpaste",
      breakdown: "牙膏 (yá gāo) - toothpaste",
    },
    {
      char: "亚洲",
      pinyin: "Yà zhōu",
      meaning: "Asia",
      breakdown: "亚洲 (Yà zhōu) - Asia",
    },
    {
      char: "呀",
      pinyin: "ya",
      meaning: "(particle equivalent to 啊 after a vowel)",
      breakdown: "呀 (ya) - (particle equivalent to 啊 after a vowel)",
    },
    {
      char: "盐",
      pinyin: "yán",
      meaning: "salt",
      breakdown: "盐 (yán) - salt",
    },
    {
      char: "严格",
      pinyin: "yán gé",
      meaning: "strict",
      breakdown: "严格 (yán gé) - strict",
    },
    {
      char: "严重",
      pinyin: "yán zhòng",
      meaning: "grave",
      breakdown: "严重 (yán zhòng) - grave",
    },
    {
      char: "研究生",
      pinyin: "yán jiū shēng",
      meaning: "graduate student",
      breakdown: "研究生 (yán jiū shēng) - graduate student",
    },
    {
      char: "演出",
      pinyin: "yǎn chū",
      meaning: "to act (in a play)",
      breakdown: "演出 (yǎn chū) - to act (in a play)",
    },
    {
      char: "演员",
      pinyin: "yǎn yuán",
      meaning: "actor or actress",
      breakdown: "演员 (yǎn yuán) - actor or actress",
    },
    {
      char: "阳光",
      pinyin: "yáng guāng",
      meaning: "sunshine",
      breakdown: "阳光 (yáng guāng) - sunshine",
    },
    {
      char: "养成",
      pinyin: "yǎng chéng",
      meaning: "to cultivate",
      breakdown: "养成 (yǎng chéng) - to cultivate",
    },
    {
      char: "样子",
      pinyin: "yàng zi",
      meaning: "appearance",
      breakdown: "样子 (yàng zi) - appearance",
    },
    {
      char: "邀请",
      pinyin: "yāo qǐng",
      meaning: "to invite",
      breakdown: "邀请 (yāo qǐng) - to invite",
    },
    {
      char: "钥匙",
      pinyin: "yào shi",
      meaning: "key",
      breakdown: "钥匙 (yào shi) - key",
    },
    {
      char: "也许",
      pinyin: "yě xǔ",
      meaning: "perhaps",
      breakdown: "也许 (yě xǔ) - perhaps",
    },
    { char: "页", pinyin: "yè", meaning: "page", breakdown: "页 (yè) - page" },
    {
      char: "叶子",
      pinyin: "yè zi",
      meaning: "foliage",
      breakdown: "叶子 (yè zi) - foliage",
    },
    {
      char: "一切",
      pinyin: "yī qiè",
      meaning: "everything",
      breakdown: "一切 (yī qiè) - everything",
    },
    {
      char: "以",
      pinyin: "yǐ",
      meaning: "to use",
      breakdown: "以 (yǐ) - to use",
    },
    {
      char: "亿",
      pinyin: "yì",
      meaning: "100 million",
      breakdown: "亿 (yì) - 100 million",
    },
    {
      char: "意见",
      pinyin: "yì jiàn",
      meaning: "idea",
      breakdown: "意见 (yì jiàn) - idea",
    },
    {
      char: "艺术",
      pinyin: "yì shù",
      meaning: "art",
      breakdown: "艺术 (yì shù) - art",
    },
    {
      char: "因此",
      pinyin: "yīn cǐ",
      meaning: "thus",
      breakdown: "因此 (yīn cǐ) - thus",
    },
    {
      char: "引起",
      pinyin: "yǐn qǐ",
      meaning: "to give rise to",
      breakdown: "引起 (yǐn qǐ) - to give rise to",
    },
    {
      char: "饮料",
      pinyin: "yǐn liào",
      meaning: "drink",
      breakdown: "饮料 (yǐn liào) - drink",
    },
    {
      char: "印象",
      pinyin: "yìn xiàng",
      meaning: "impression",
      breakdown: "印象 (yìn xiàng) - impression",
    },
    {
      char: "赢",
      pinyin: "yíng",
      meaning: "to beat",
      breakdown: "赢 (yíng) - to beat",
    },
    {
      char: "硬",
      pinyin: "yìng",
      meaning: "hard",
      breakdown: "硬 (yìng) - hard",
    },
    {
      char: "勇敢",
      pinyin: "yǒng gǎn",
      meaning: "brave",
      breakdown: "勇敢 (yǒng gǎn) - brave",
    },
    {
      char: "永远",
      pinyin: "yǒng yuǎn",
      meaning: "forever",
      breakdown: "永远 (yǒng yuǎn) - forever",
    },
    {
      char: "优点",
      pinyin: "yōu diǎn",
      meaning: "merit",
      breakdown: "优点 (yōu diǎn) - merit",
    },
    {
      char: "优秀",
      pinyin: "yōu xiù",
      meaning: "outstanding",
      breakdown: "优秀 (yōu xiù) - outstanding",
    },
    {
      char: "幽默",
      pinyin: "yōu mò",
      meaning: "(loanword) humor",
      breakdown: "幽默 (yōu mò) - (loanword) humor",
    },
    {
      char: "由",
      pinyin: "yóu",
      meaning: "to follow",
      breakdown: "由 (yóu) - to follow",
    },
    {
      char: "由于",
      pinyin: "yóu yú",
      meaning: "due to",
      breakdown: "由于 (yóu yú) - due to",
    },
    {
      char: "尤其",
      pinyin: "yóu qí",
      meaning: "especially",
      breakdown: "尤其 (yóu qí) - especially",
    },
    {
      char: "有趣",
      pinyin: "yǒu qù",
      meaning: "interesting",
      breakdown: "有趣 (yǒu qù) - interesting",
    },
    {
      char: "友好",
      pinyin: "yǒu hǎo",
      meaning: "friendly",
      breakdown: "友好 (yǒu hǎo) - friendly",
    },
    {
      char: "友谊",
      pinyin: "yǒu yì",
      meaning: "companionship",
      breakdown: "友谊 (yǒu yì) - companionship",
    },
    {
      char: "愉快",
      pinyin: "yú kuài",
      meaning: "cheerful",
      breakdown: "愉快 (yú kuài) - cheerful",
    },
    {
      char: "于是",
      pinyin: "yú shì",
      meaning: "thereupon",
      breakdown: "于是 (yú shì) - thereupon",
    },
    { char: "与", pinyin: "yǔ", meaning: "and", breakdown: "与 (yǔ) - and" },
    {
      char: "语法",
      pinyin: "yǔ fǎ",
      meaning: "grammar",
      breakdown: "语法 (yǔ fǎ) - grammar",
    },
    {
      char: "语言",
      pinyin: "yǔ yán",
      meaning: "language",
      breakdown: "语言 (yǔ yán) - language",
    },
    {
      char: "羽毛球",
      pinyin: "yǔ máo qiú",
      meaning: "shuttlecock",
      breakdown: "羽毛球 (yǔ máo qiú) - shuttlecock",
    },
    {
      char: "预习",
      pinyin: "yù xí",
      meaning: "to prepare a lesson",
      breakdown: "预习 (yù xí) - to prepare a lesson",
    },
    {
      char: "圆",
      pinyin: "yuán",
      meaning: "circle",
      breakdown: "圆 (yuán) - circle",
    },
    {
      char: "原来",
      pinyin: "yuán lái",
      meaning: "original",
      breakdown: "原来 (yuán lái) - original",
    },
    {
      char: "原谅",
      pinyin: "yuán liàng",
      meaning: "to excuse",
      breakdown: "原谅 (yuán liàng) - to excuse",
    },
    {
      char: "原因",
      pinyin: "yuán yīn",
      meaning: "cause",
      breakdown: "原因 (yuán yīn) - cause",
    },
    {
      char: "约会",
      pinyin: "yuē huì",
      meaning: "appointment",
      breakdown: "约会 (yuē huì) - appointment",
    },
    {
      char: "阅读",
      pinyin: "yuè dú",
      meaning: "to read",
      breakdown: "阅读 (yuè dú) - to read",
    },
    {
      char: "允许",
      pinyin: "yǔn xǔ",
      meaning: "to permit",
      breakdown: "允许 (yǔn xǔ) - to permit",
    },
    {
      char: "杂志",
      pinyin: "zá zhì",
      meaning: "magazine",
      breakdown: "杂志 (zá zhì) - magazine",
    },
    {
      char: "咱们",
      pinyin: "zán men",
      meaning:
        "we or us (including both the speaker and the person(s) spoken to)",
      breakdown:
        "咱们 (zán men) - we or us (including both the speaker and the person(s) spoken to)",
    },
    {
      char: "暂时",
      pinyin: "zàn shí",
      meaning: "temporary",
      breakdown: "暂时 (zàn shí) - temporary",
    },
    {
      char: "脏",
      pinyin: "zāng",
      meaning: "dirty",
      breakdown: "脏 (zāng) - dirty",
    },
    {
      char: "责任",
      pinyin: "zé rèn",
      meaning: "responsibility",
      breakdown: "责任 (zé rèn) - responsibility",
    },
    {
      char: "增加",
      pinyin: "zēng jiā",
      meaning: "to raise",
      breakdown: "增加 (zēng jiā) - to raise",
    },
    {
      char: "增长",
      pinyin: "zēng zhǎng",
      meaning: "to grow",
      breakdown: "增长 (zēng zhǎng) - to grow",
    },
    {
      char: "窄",
      pinyin: "zhǎi",
      meaning: "narrow",
      breakdown: "窄 (zhǎi) - narrow",
    },
    {
      char: "招聘",
      pinyin: "zhāo pìn",
      meaning: "recruitment",
      breakdown: "招聘 (zhāo pìn) - recruitment",
    },
    {
      char: "真正",
      pinyin: "zhēn zhèng",
      meaning: "genuine",
      breakdown: "真正 (zhēn zhèng) - genuine",
    },
    {
      char: "整理",
      pinyin: "zhěng lǐ",
      meaning: "to arrange",
      breakdown: "整理 (zhěng lǐ) - to arrange",
    },
    {
      char: "整齐",
      pinyin: "zhěng qí",
      meaning: "orderly",
      breakdown: "整齐 (zhěng qí) - orderly",
    },
    {
      char: "正常",
      pinyin: "zhèng cháng",
      meaning: "regular",
      breakdown: "正常 (zhèng cháng) - regular",
    },
    {
      char: "正好",
      pinyin: "zhèng hǎo",
      meaning: "just (in time)",
      breakdown: "正好 (zhèng hǎo) - just (in time)",
    },
    {
      char: "正确",
      pinyin: "zhèng què",
      meaning: "correct",
      breakdown: "正确 (zhèng què) - correct",
    },
    {
      char: "正式",
      pinyin: "zhèng shì",
      meaning: "formal",
      breakdown: "正式 (zhèng shì) - formal",
    },
    {
      char: "证明",
      pinyin: "zhèng míng",
      meaning: "proof",
      breakdown: "证明 (zhèng míng) - proof",
    },
    {
      char: "之",
      pinyin: "zhī",
      meaning: "(possessive particle)",
      breakdown: "之 (zhī) - (possessive particle)",
    },
    {
      char: "支持",
      pinyin: "zhī chí",
      meaning: "to be in favor of",
      breakdown: "支持 (zhī chí) - to be in favor of",
    },
    {
      char: "知识",
      pinyin: "zhī shi",
      meaning: "intellectual",
      breakdown: "知识 (zhī shi) - intellectual",
    },
    {
      char: "直接",
      pinyin: "zhí jiē",
      meaning: "direct",
      breakdown: "直接 (zhí jiē) - direct",
    },
    {
      char: "值得",
      pinyin: "zhí de",
      meaning: "to be worth",
      breakdown: "值得 (zhí de) - to be worth",
    },
    {
      char: "职业",
      pinyin: "zhí yè",
      meaning: "occupation",
      breakdown: "职业 (zhí yè) - occupation",
    },
    {
      char: "植物",
      pinyin: "zhí wù",
      meaning: "botanical",
      breakdown: "植物 (zhí wù) - botanical",
    },
    {
      char: "指",
      pinyin: "zhǐ",
      meaning: "finger",
      breakdown: "指 (zhǐ) - finger",
    },
    {
      char: "只好",
      pinyin: "zhǐ hǎo",
      meaning: "without any better option",
      breakdown: "只好 (zhǐ hǎo) - without any better option",
    },
    {
      char: "只要",
      pinyin: "zhǐ yào",
      meaning: "if only",
      breakdown: "只要 (zhǐ yào) - if only",
    },
    {
      char: "制造",
      pinyin: "zhì zào",
      meaning: "to manufacture",
      breakdown: "制造 (zhì zào) - to manufacture",
    },
    {
      char: "至少",
      pinyin: "zhì shǎo",
      meaning: "at least",
      breakdown: "至少 (zhì shǎo) - at least",
    },
    {
      char: "质量",
      pinyin: "zhì liàng",
      meaning: "quality",
      breakdown: "质量 (zhì liàng) - quality",
    },
    {
      char: "中文",
      pinyin: "Zhōng wén",
      meaning: "Chinese",
      breakdown: "中文 (Zhōng wén) - Chinese",
    },
    {
      char: "重点",
      pinyin: "zhòng diǎn",
      meaning: "important point",
      breakdown: "重点 (zhòng diǎn) - important point",
    },
    {
      char: "重视",
      pinyin: "zhòng shì",
      meaning: "to attach importance to sth",
      breakdown: "重视 (zhòng shì) - to attach importance to sth",
    },
    {
      char: "周围",
      pinyin: "zhōu wéi",
      meaning: "surroundings",
      breakdown: "周围 (zhōu wéi) - surroundings",
    },
    { char: "猪", pinyin: "zhū", meaning: "hog", breakdown: "猪 (zhū) - hog" },
    {
      char: "逐渐",
      pinyin: "zhú jiàn",
      meaning: "gradually",
      breakdown: "逐渐 (zhú jiàn) - gradually",
    },
    {
      char: "主动",
      pinyin: "zhǔ dòng",
      meaning: "to take the initiative",
      breakdown: "主动 (zhǔ dòng) - to take the initiative",
    },
    {
      char: "主意",
      pinyin: "zhǔ yi",
      meaning: "plan",
      breakdown: "主意 (zhǔ yi) - plan",
    },
    {
      char: "祝贺",
      pinyin: "zhù hè",
      meaning: "to congratulate",
      breakdown: "祝贺 (zhù hè) - to congratulate",
    },
    {
      char: "著名",
      pinyin: "zhù míng",
      meaning: "famous",
      breakdown: "著名 (zhù míng) - famous",
    },
    {
      char: "专门",
      pinyin: "zhuān mén",
      meaning: "specialist",
      breakdown: "专门 (zhuān mén) - specialist",
    },
    {
      char: "专业",
      pinyin: "zhuān yè",
      meaning: "specialty",
      breakdown: "专业 (zhuān yè) - specialty",
    },
    {
      char: "赚",
      pinyin: "zhuàn",
      meaning: "to earn",
      breakdown: "赚 (zhuàn) - to earn",
    },
    {
      char: "撞",
      pinyin: "zhuàng",
      meaning: "to hit",
      breakdown: "撞 (zhuàng) - to hit",
    },
    {
      char: "准确",
      pinyin: "zhǔn què",
      meaning: "accurate",
      breakdown: "准确 (zhǔn què) - accurate",
    },
    {
      char: "准时",
      pinyin: "zhǔn shí",
      meaning: "on time",
      breakdown: "准时 (zhǔn shí) - on time",
    },
    {
      char: "仔细",
      pinyin: "zǐ xì",
      meaning: "careful",
      breakdown: "仔细 (zǐ xì) - careful",
    },
    {
      char: "自然",
      pinyin: "zì rán",
      meaning: "nature",
      breakdown: "自然 (zì rán) - nature",
    },
    {
      char: "总结",
      pinyin: "zǒng jié",
      meaning: "to sum up",
      breakdown: "总结 (zǒng jié) - to sum up",
    },
    {
      char: "租",
      pinyin: "zū",
      meaning: "to hire",
      breakdown: "租 (zū) - to hire",
    },
    {
      char: "组成",
      pinyin: "zǔ chéng",
      meaning: "to form",
      breakdown: "组成 (zǔ chéng) - to form",
    },
    {
      char: "组织",
      pinyin: "zǔ zhī",
      meaning: "to organize",
      breakdown: "组织 (zǔ zhī) - to organize",
    },
    {
      char: "嘴",
      pinyin: "zuǐ",
      meaning: "mouth",
      breakdown: "嘴 (zuǐ) - mouth",
    },
    {
      char: "最好",
      pinyin: "zuì hǎo",
      meaning: "best",
      breakdown: "最好 (zuì hǎo) - best",
    },
    {
      char: "最后",
      pinyin: "zuì hòu",
      meaning: "final",
      breakdown: "最后 (zuì hòu) - final",
    },
    {
      char: "尊重",
      pinyin: "zūn zhòng",
      meaning: "to esteem",
      breakdown: "尊重 (zūn zhòng) - to esteem",
    },
    {
      char: "做生意",
      pinyin: "zuò shēng yì",
      meaning: "to do business",
      breakdown: "做生意 (zuò shēng yì) - to do business",
    },
    {
      char: "座",
      pinyin: "zuò",
      meaning: "seat",
      breakdown: "座 (zuò) - seat",
    },
    {
      char: "座位",
      pinyin: "zuò wèi",
      meaning: "seat",
      breakdown: "座位 (zuò wèi) - seat",
    },
  ],
  hsk5: [
    {
      char: "唉",
      pinyin: "āi",
      meaning: "interjection or grunt of agreement",
      breakdown: "唉 (āi) - interjection or grunt of agreement",
    },
    {
      char: "爱护",
      pinyin: "ài hù",
      meaning: "to cherish",
      breakdown: "爱护 (ài hù) - to cherish",
    },
    {
      char: "爱惜",
      pinyin: "ài xī",
      meaning: "to cherish",
      breakdown: "爱惜 (ài xī) - to cherish",
    },
    {
      char: "爱心",
      pinyin: "ài xīn",
      meaning: "compassion",
      breakdown: "爱心 (ài xīn) - compassion",
    },
    {
      char: "安慰",
      pinyin: "ān wèi",
      meaning: "to comfort",
      breakdown: "安慰 (ān wèi) - to comfort",
    },
    {
      char: "安装",
      pinyin: "ān zhuāng",
      meaning: "to install",
      breakdown: "安装 (ān zhuāng) - to install",
    },
    { char: "岸", pinyin: "àn", meaning: "bank", breakdown: "岸 (àn) - bank" },
    {
      char: "把握",
      pinyin: "bǎ wò",
      meaning: "to grasp (also fig.)",
      breakdown: "把握 (bǎ wò) - to grasp (also fig.)",
    },
    {
      char: "摆",
      pinyin: "bǎi",
      meaning: "to arrange",
      breakdown: "摆 (bǎi) - to arrange",
    },
    {
      char: "班主任",
      pinyin: "bān zhǔ rèn",
      meaning: "teacher in charge of a class",
      breakdown: "班主任 (bān zhǔ rèn) - teacher in charge of a class",
    },
    {
      char: "办理",
      pinyin: "bàn lǐ",
      meaning: "to handle",
      breakdown: "办理 (bàn lǐ) - to handle",
    },
    {
      char: "棒",
      pinyin: "bàng",
      meaning: "a stick",
      breakdown: "棒 (bàng) - a stick",
    },
    {
      char: "傍晚",
      pinyin: "bàng wǎn",
      meaning: "in the evening",
      breakdown: "傍晚 (bàng wǎn) - in the evening",
    },
    {
      char: "包裹",
      pinyin: "bāo guǒ",
      meaning: "wrap up",
      breakdown: "包裹 (bāo guǒ) - wrap up",
    },
    {
      char: "包含",
      pinyin: "bāo hán",
      meaning: "to contain",
      breakdown: "包含 (bāo hán) - to contain",
    },
    {
      char: "包子",
      pinyin: "bāo zi",
      meaning: "steamed stuffed bun",
      breakdown: "包子 (bāo zi) - steamed stuffed bun",
    },
    {
      char: "薄",
      pinyin: "báo",
      meaning: "thin",
      breakdown: "薄 (báo) - thin",
    },
    {
      char: "宝贝",
      pinyin: "bǎo bèi",
      meaning: "treasured object",
      breakdown: "宝贝 (bǎo bèi) - treasured object",
    },
    {
      char: "宝贵",
      pinyin: "bǎo guì",
      meaning: "valuable",
      breakdown: "宝贵 (bǎo guì) - valuable",
    },
    {
      char: "保持",
      pinyin: "bǎo chí",
      meaning: "to keep",
      breakdown: "保持 (bǎo chí) - to keep",
    },
    {
      char: "保存",
      pinyin: "bǎo cún",
      meaning: "to conserve",
      breakdown: "保存 (bǎo cún) - to conserve",
    },
    {
      char: "保留",
      pinyin: "bǎo liú",
      meaning: "to retain",
      breakdown: "保留 (bǎo liú) - to retain",
    },
    {
      char: "保险",
      pinyin: "bǎo xiǎn",
      meaning: "insurance",
      breakdown: "保险 (bǎo xiǎn) - insurance",
    },
    {
      char: "报告",
      pinyin: "bào gào",
      meaning: "to inform",
      breakdown: "报告 (bào gào) - to inform",
    },
    {
      char: "悲观",
      pinyin: "bēi guān",
      meaning: "pessimistic",
      breakdown: "悲观 (bēi guān) - pessimistic",
    },
    {
      char: "被子",
      pinyin: "bèi zi",
      meaning: "quilt",
      breakdown: "被子 (bèi zi) - quilt",
    },
    {
      char: "背",
      pinyin: "bèi",
      meaning: "the back of a body or object",
      breakdown: "背 (bèi) - the back of a body or object",
    },
    {
      char: "背景",
      pinyin: "bèi jǐng",
      meaning: "background",
      breakdown: "背景 (bèi jǐng) - background",
    },
    {
      char: "本科",
      pinyin: "běn kē",
      meaning: "undergraduate course",
      breakdown: "本科 (běn kē) - undergraduate course",
    },
    {
      char: "本领",
      pinyin: "běn lǐng",
      meaning: "skill",
      breakdown: "本领 (běn lǐng) - skill",
    },
    {
      char: "本质",
      pinyin: "běn zhì",
      meaning: "essence",
      breakdown: "本质 (běn zhì) - essence",
    },
    {
      char: "比例",
      pinyin: "bǐ lì",
      meaning: "proportion",
      breakdown: "比例 (bǐ lì) - proportion",
    },
    {
      char: "比如",
      pinyin: "bǐ rú",
      meaning: "for example",
      breakdown: "比如 (bǐ rú) - for example",
    },
    {
      char: "彼此",
      pinyin: "bǐ cǐ",
      meaning: "each other",
      breakdown: "彼此 (bǐ cǐ) - each other",
    },
    {
      char: "必然",
      pinyin: "bì rán",
      meaning: "inevitable",
      breakdown: "必然 (bì rán) - inevitable",
    },
    {
      char: "必需",
      pinyin: "bì xū",
      meaning: "to need",
      breakdown: "必需 (bì xū) - to need",
    },
    {
      char: "必要",
      pinyin: "bì yào",
      meaning: "necessary",
      breakdown: "必要 (bì yào) - necessary",
    },
    {
      char: "毕竟",
      pinyin: "bì jìng",
      meaning: "after all",
      breakdown: "毕竟 (bì jìng) - after all",
    },
    {
      char: "避免",
      pinyin: "bì miǎn",
      meaning: "to avert",
      breakdown: "避免 (bì miǎn) - to avert",
    },
    {
      char: "鞭炮",
      pinyin: "biān pào",
      meaning: "firecrackers",
      breakdown: "鞭炮 (biān pào) - firecrackers",
    },
    {
      char: "编辑",
      pinyin: "biān jí",
      meaning: "to edit",
      breakdown: "编辑 (biān jí) - to edit",
    },
    {
      char: "便",
      pinyin: "biàn",
      meaning: "ordinary",
      breakdown: "便 (biàn) - ordinary",
    },
    {
      char: "辩论",
      pinyin: "biàn lùn",
      meaning: "debate",
      breakdown: "辩论 (biàn lùn) - debate",
    },
    {
      char: "标点",
      pinyin: "biāo diǎn",
      meaning: "punctuation",
      breakdown: "标点 (biāo diǎn) - punctuation",
    },
    {
      char: "标志",
      pinyin: "biāo zhì",
      meaning: "sign",
      breakdown: "标志 (biāo zhì) - sign",
    },
    {
      char: "表面",
      pinyin: "biǎo miàn",
      meaning: "surface",
      breakdown: "表面 (biǎo miàn) - surface",
    },
    {
      char: "表明",
      pinyin: "biǎo míng",
      meaning: "to make clear",
      breakdown: "表明 (biǎo míng) - to make clear",
    },
    {
      char: "表情",
      pinyin: "biǎo qíng",
      meaning: "(facial) expression",
      breakdown: "表情 (biǎo qíng) - (facial) expression",
    },
    {
      char: "表现",
      pinyin: "biǎo xiàn",
      meaning: "to show",
      breakdown: "表现 (biǎo xiàn) - to show",
    },
    {
      char: "丙",
      pinyin: "bǐng",
      meaning: "third of 10 heavenly stems 十天干",
      breakdown: "丙 (bǐng) - third of 10 heavenly stems 十天干",
    },
    {
      char: "病毒",
      pinyin: "bìng dú",
      meaning: "virus",
      breakdown: "病毒 (bìng dú) - virus",
    },
    {
      char: "玻璃",
      pinyin: "bō li",
      meaning: "glass",
      breakdown: "玻璃 (bō li) - glass",
    },
    {
      char: "博物馆",
      pinyin: "bó wù guǎn",
      meaning: "museum",
      breakdown: "博物馆 (bó wù guǎn) - museum",
    },
    {
      char: "脖子",
      pinyin: "bó zi",
      meaning: "neck",
      breakdown: "脖子 (bó zi) - neck",
    },
    {
      char: "不必",
      pinyin: "bù bì",
      meaning: "need not",
      breakdown: "不必 (bù bì) - need not",
    },
    {
      char: "不断",
      pinyin: "bù duàn",
      meaning: "unceasing",
      breakdown: "不断 (bù duàn) - unceasing",
    },
    {
      char: "不见得",
      pinyin: "bù jiàn de",
      meaning: "not necessarily",
      breakdown: "不见得 (bù jiàn de) - not necessarily",
    },
    {
      char: "不耐烦",
      pinyin: "bù nài fán",
      meaning: "impatience",
      breakdown: "不耐烦 (bù nài fán) - impatience",
    },
    {
      char: "不要紧",
      pinyin: "bù yào jǐn",
      meaning: "unimportant",
      breakdown: "不要紧 (bù yào jǐn) - unimportant",
    },
    {
      char: "补充",
      pinyin: "bǔ chōng",
      meaning: "to replenish",
      breakdown: "补充 (bǔ chōng) - to replenish",
    },
    {
      char: "不安",
      pinyin: "bù ān",
      meaning: "unpeaceful",
      breakdown: "不安 (bù ān) - unpeaceful",
    },
    {
      char: "不得了",
      pinyin: "bù dé liǎo",
      meaning: "desperately serious",
      breakdown: "不得了 (bù dé liǎo) - desperately serious",
    },
    {
      char: "不好意思",
      pinyin: "bù hǎo yì si",
      meaning: "to feel embarrassed",
      breakdown: "不好意思 (bù hǎo yì si) - to feel embarrassed",
    },
    {
      char: "不免",
      pinyin: "bù miǎn",
      meaning: "inevitably",
      breakdown: "不免 (bù miǎn) - inevitably",
    },
    {
      char: "不然",
      pinyin: "bù rán",
      meaning: "not so",
      breakdown: "不然 (bù rán) - not so",
    },
    {
      char: "不如",
      pinyin: "bù rú",
      meaning: "not equal to",
      breakdown: "不如 (bù rú) - not equal to",
    },
    {
      char: "不足",
      pinyin: "bù zú",
      meaning: "insufficient",
      breakdown: "不足 (bù zú) - insufficient",
    },
    {
      char: "布",
      pinyin: "bù",
      meaning: "cloth",
      breakdown: "布 (bù) - cloth",
    },
    {
      char: "步骤",
      pinyin: "bù zhòu",
      meaning: "procedure",
      breakdown: "步骤 (bù zhòu) - procedure",
    },
    {
      char: "部门",
      pinyin: "bù mén",
      meaning: "department",
      breakdown: "部门 (bù mén) - department",
    },
    {
      char: "财产",
      pinyin: "cái chǎn",
      meaning: "property",
      breakdown: "财产 (cái chǎn) - property",
    },
    {
      char: "踩",
      pinyin: "cǎi",
      meaning: "to step on",
      breakdown: "踩 (cǎi) - to step on",
    },
    {
      char: "采访",
      pinyin: "cǎi fǎng",
      meaning: "to interview",
      breakdown: "采访 (cǎi fǎng) - to interview",
    },
    {
      char: "采取",
      pinyin: "cǎi qǔ",
      meaning: "to adopt or carry out (measures)",
      breakdown: "采取 (cǎi qǔ) - to adopt or carry out (measures)",
    },
    {
      char: "彩虹",
      pinyin: "cǎi hóng",
      meaning: "rainbow",
      breakdown: "彩虹 (cǎi hóng) - rainbow",
    },
    {
      char: "参考",
      pinyin: "cān kǎo",
      meaning: "consultation",
      breakdown: "参考 (cān kǎo) - consultation",
    },
    {
      char: "参与",
      pinyin: "cān yù",
      meaning: "to participate (in sth)",
      breakdown: "参与 (cān yù) - to participate (in sth)",
    },
    {
      char: "餐厅",
      pinyin: "cān tīng",
      meaning: "dining hall",
      breakdown: "餐厅 (cān tīng) - dining hall",
    },
    {
      char: "残疾",
      pinyin: "cán jí",
      meaning: "disabled",
      breakdown: "残疾 (cán jí) - disabled",
    },
    {
      char: "惭愧",
      pinyin: "cán kuì",
      meaning: "ashamed",
      breakdown: "惭愧 (cán kuì) - ashamed",
    },
    {
      char: "操场",
      pinyin: "cāo chǎng",
      meaning: "playground",
      breakdown: "操场 (cāo chǎng) - playground",
    },
    {
      char: "操心",
      pinyin: "cāo xīn",
      meaning: "to worry about",
      breakdown: "操心 (cāo xīn) - to worry about",
    },
    { char: "册", pinyin: "cè", meaning: "book", breakdown: "册 (cè) - book" },
    {
      char: "测验",
      pinyin: "cè yàn",
      meaning: "test",
      breakdown: "测验 (cè yàn) - test",
    },
    {
      char: "厕所",
      pinyin: "cè suǒ",
      meaning: "toilet",
      breakdown: "厕所 (cè suǒ) - toilet",
    },
    {
      char: "曾经",
      pinyin: "céng jīng",
      meaning: "once",
      breakdown: "曾经 (céng jīng) - once",
    },
    {
      char: "插",
      pinyin: "chā",
      meaning: "to insert",
      breakdown: "插 (chā) - to insert",
    },
    {
      char: "差别",
      pinyin: "chā bié",
      meaning: "difference",
      breakdown: "差别 (chā bié) - difference",
    },
    {
      char: "叉子",
      pinyin: "chā zi",
      meaning: "fork",
      breakdown: "叉子 (chā zi) - fork",
    },
    {
      char: "拆",
      pinyin: "chāi",
      meaning: "to tear open",
      breakdown: "拆 (chāi) - to tear open",
    },
    {
      char: "产品",
      pinyin: "chǎn pǐn",
      meaning: "goods",
      breakdown: "产品 (chǎn pǐn) - goods",
    },
    {
      char: "产生",
      pinyin: "chǎn shēng",
      meaning: "to arise",
      breakdown: "产生 (chǎn shēng) - to arise",
    },
    {
      char: "长途",
      pinyin: "cháng tú",
      meaning: "long distance",
      breakdown: "长途 (cháng tú) - long distance",
    },
    {
      char: "常识",
      pinyin: "cháng shí",
      meaning: "common sense",
      breakdown: "常识 (cháng shí) - common sense",
    },
    {
      char: "抄",
      pinyin: "chāo",
      meaning: "to make a copy",
      breakdown: "抄 (chāo) - to make a copy",
    },
    {
      char: "朝",
      pinyin: "cháo",
      meaning: "imperial or royal court",
      breakdown: "朝 (cháo) - imperial or royal court",
    },
    {
      char: "朝代",
      pinyin: "cháo dài",
      meaning: "dynasty",
      breakdown: "朝代 (cháo dài) - dynasty",
    },
    {
      char: "炒",
      pinyin: "chǎo",
      meaning: "to sauté",
      breakdown: "炒 (chǎo) - to sauté",
    },
    {
      char: "吵架",
      pinyin: "chǎo jià",
      meaning: "to quarrel",
      breakdown: "吵架 (chǎo jià) - to quarrel",
    },
    {
      char: "车库",
      pinyin: "chē kù",
      meaning: "garage",
      breakdown: "车库 (chē kù) - garage",
    },
    {
      char: "车厢",
      pinyin: "chē xiāng",
      meaning: "carriage",
      breakdown: "车厢 (chē xiāng) - carriage",
    },
    {
      char: "彻底",
      pinyin: "chè dǐ",
      meaning: "thorough",
      breakdown: "彻底 (chè dǐ) - thorough",
    },
    {
      char: "沉默",
      pinyin: "chén mò",
      meaning: "taciturn",
      breakdown: "沉默 (chén mò) - taciturn",
    },
    {
      char: "趁",
      pinyin: "chèn",
      meaning: "to avail oneself of",
      breakdown: "趁 (chèn) - to avail oneself of",
    },
    {
      char: "称",
      pinyin: "chēng",
      meaning: "to weigh",
      breakdown: "称 (chēng) - to weigh",
    },
    {
      char: "称呼",
      pinyin: "chēng hu",
      meaning: "to call",
      breakdown: "称呼 (chēng hu) - to call",
    },
    {
      char: "称赞",
      pinyin: "chēng zàn",
      meaning: "to praise",
      breakdown: "称赞 (chēng zàn) - to praise",
    },
    {
      char: "乘",
      pinyin: "chéng",
      meaning: "to ride",
      breakdown: "乘 (chéng) - to ride",
    },
    {
      char: "承担",
      pinyin: "chéng dān",
      meaning: "to undertake",
      breakdown: "承担 (chéng dān) - to undertake",
    },
    {
      char: "承认",
      pinyin: "chéng rèn",
      meaning: "to admit",
      breakdown: "承认 (chéng rèn) - to admit",
    },
    {
      char: "承受",
      pinyin: "chéng shòu",
      meaning: "to bear",
      breakdown: "承受 (chéng shòu) - to bear",
    },
    {
      char: "成分",
      pinyin: "chéng fèn",
      meaning: "composition",
      breakdown: "成分 (chéng fèn) - composition",
    },
    {
      char: "成果",
      pinyin: "chéng guǒ",
      meaning: "result",
      breakdown: "成果 (chéng guǒ) - result",
    },
    {
      char: "成就",
      pinyin: "chéng jiù",
      meaning: "accomplishment",
      breakdown: "成就 (chéng jiù) - accomplishment",
    },
    {
      char: "成立",
      pinyin: "chéng lì",
      meaning: "to establish",
      breakdown: "成立 (chéng lì) - to establish",
    },
    {
      char: "成语",
      pinyin: "chéng yǔ",
      meaning: "Chinese set expression",
      breakdown: "成语 (chéng yǔ) - Chinese set expression",
    },
    {
      char: "成长",
      pinyin: "chéng zhǎng",
      meaning: "to mature",
      breakdown: "成长 (chéng zhǎng) - to mature",
    },
    {
      char: "程度",
      pinyin: "chéng dù",
      meaning: "degree (level or extent)",
      breakdown: "程度 (chéng dù) - degree (level or extent)",
    },
    {
      char: "程序",
      pinyin: "chéng xù",
      meaning: "procedures",
      breakdown: "程序 (chéng xù) - procedures",
    },
    {
      char: "诚恳",
      pinyin: "chéng kěn",
      meaning: "sincere",
      breakdown: "诚恳 (chéng kěn) - sincere",
    },
    {
      char: "吃亏",
      pinyin: "chī kuī",
      meaning: "to suffer losses",
      breakdown: "吃亏 (chī kuī) - to suffer losses",
    },
    {
      char: "持续",
      pinyin: "chí xù",
      meaning: "to continue",
      breakdown: "持续 (chí xù) - to continue",
    },
    {
      char: "池子",
      pinyin: "chí zi",
      meaning: "pond",
      breakdown: "池子 (chí zi) - pond",
    },
    {
      char: "尺子",
      pinyin: "chǐ zi",
      meaning: "rule",
      breakdown: "尺子 (chǐ zi) - rule",
    },
    {
      char: "翅膀",
      pinyin: "chì bǎng",
      meaning: "wing",
      breakdown: "翅膀 (chì bǎng) - wing",
    },
    {
      char: "冲",
      pinyin: "chōng",
      meaning: "thoroughfare",
      breakdown: "冲 (chōng) - thoroughfare",
    },
    {
      char: "充电器",
      pinyin: "chōng diàn qì",
      meaning: "battery charger",
      breakdown: "充电器 (chōng diàn qì) - battery charger",
    },
    {
      char: "充分",
      pinyin: "chōng fèn",
      meaning: "ample",
      breakdown: "充分 (chōng fèn) - ample",
    },
    {
      char: "充满",
      pinyin: "chōng mǎn",
      meaning: "full of",
      breakdown: "充满 (chōng mǎn) - full of",
    },
    {
      char: "重复",
      pinyin: "chóng fù",
      meaning: "to repeat",
      breakdown: "重复 (chóng fù) - to repeat",
    },
    {
      char: "宠物",
      pinyin: "chǒng wù",
      meaning: "house pet",
      breakdown: "宠物 (chǒng wù) - house pet",
    },
    {
      char: "抽屉",
      pinyin: "chōu ti",
      meaning: "drawer",
      breakdown: "抽屉 (chōu ti) - drawer",
    },
    {
      char: "抽象",
      pinyin: "chōu xiàng",
      meaning: "abstract",
      breakdown: "抽象 (chōu xiàng) - abstract",
    },
    {
      char: "丑",
      pinyin: "chǒu",
      meaning: "shameful",
      breakdown: "丑 (chǒu) - shameful",
    },
    {
      char: "臭",
      pinyin: "chòu",
      meaning: "stench",
      breakdown: "臭 (chòu) - stench",
    },
    {
      char: "出版",
      pinyin: "chū bǎn",
      meaning: "to publish",
      breakdown: "出版 (chū bǎn) - to publish",
    },
    {
      char: "出口",
      pinyin: "chū kǒu",
      meaning: "an exit",
      breakdown: "出口 (chū kǒu) - an exit",
    },
    {
      char: "出色",
      pinyin: "chū sè",
      meaning: "remarkable",
      breakdown: "出色 (chū sè) - remarkable",
    },
    {
      char: "出席",
      pinyin: "chū xí",
      meaning: "to attend",
      breakdown: "出席 (chū xí) - to attend",
    },
    {
      char: "初级",
      pinyin: "chū jí",
      meaning: "junior",
      breakdown: "初级 (chū jí) - junior",
    },
    {
      char: "除",
      pinyin: "chú",
      meaning: "to get rid of",
      breakdown: "除 (chú) - to get rid of",
    },
    {
      char: "除非",
      pinyin: "chú fēi",
      meaning: "only if (...)",
      breakdown: "除非 (chú fēi) - only if (...)",
    },
    {
      char: "除夕",
      pinyin: "chú xī",
      meaning: "(New Year's) Eve",
      breakdown: "除夕 (chú xī) - (New Year's) Eve",
    },
    {
      char: "处理",
      pinyin: "chǔ lǐ",
      meaning: "to handle",
      breakdown: "处理 (chǔ lǐ) - to handle",
    },
    {
      char: "传播",
      pinyin: "chuán bō",
      meaning: "to disseminate",
      breakdown: "传播 (chuán bō) - to disseminate",
    },
    {
      char: "传递",
      pinyin: "chuán dì",
      meaning: "to transmit",
      breakdown: "传递 (chuán dì) - to transmit",
    },
    {
      char: "传染",
      pinyin: "chuán rǎn",
      meaning: "to infect",
      breakdown: "传染 (chuán rǎn) - to infect",
    },
    {
      char: "传说",
      pinyin: "chuán shuō",
      meaning: "legend",
      breakdown: "传说 (chuán shuō) - legend",
    },
    {
      char: "传统",
      pinyin: "chuán tǒng",
      meaning: "tradition",
      breakdown: "传统 (chuán tǒng) - tradition",
    },
    {
      char: "窗帘",
      pinyin: "chuāng lián",
      meaning: "window curtains",
      breakdown: "窗帘 (chuāng lián) - window curtains",
    },
    {
      char: "闯",
      pinyin: "chuǎng",
      meaning: "to rush",
      breakdown: "闯 (chuǎng) - to rush",
    },
    {
      char: "创造",
      pinyin: "chuàng zào",
      meaning: "to create",
      breakdown: "创造 (chuàng zào) - to create",
    },
    {
      char: "吹",
      pinyin: "chuī",
      meaning: "to blow",
      breakdown: "吹 (chuī) - to blow",
    },
    {
      char: "磁带",
      pinyin: "cí dài",
      meaning: "magnetic tape",
      breakdown: "磁带 (cí dài) - magnetic tape",
    },
    {
      char: "辞职",
      pinyin: "cí zhí",
      meaning: "to resign",
      breakdown: "辞职 (cí zhí) - to resign",
    },
    {
      char: "此外",
      pinyin: "cǐ wài",
      meaning: "besides",
      breakdown: "此外 (cǐ wài) - besides",
    },
    {
      char: "刺激",
      pinyin: "cì jī",
      meaning: "to provoke",
      breakdown: "刺激 (cì jī) - to provoke",
    },
    {
      char: "次要",
      pinyin: "cì yào",
      meaning: "secondary",
      breakdown: "次要 (cì yào) - secondary",
    },
    {
      char: "匆忙",
      pinyin: "cōng máng",
      meaning: "hasty",
      breakdown: "匆忙 (cōng máng) - hasty",
    },
    {
      char: "从此",
      pinyin: "cóng cǐ",
      meaning: "from now on",
      breakdown: "从此 (cóng cǐ) - from now on",
    },
    {
      char: "从而",
      pinyin: "cóng ér",
      meaning: "thus",
      breakdown: "从而 (cóng ér) - thus",
    },
    {
      char: "从前",
      pinyin: "cóng qián",
      meaning: "previously",
      breakdown: "从前 (cóng qián) - previously",
    },
    {
      char: "从事",
      pinyin: "cóng shì",
      meaning: "to go for",
      breakdown: "从事 (cóng shì) - to go for",
    },
    {
      char: "醋",
      pinyin: "cù",
      meaning: "vinegar",
      breakdown: "醋 (cù) - vinegar",
    },
    {
      char: "促进",
      pinyin: "cù jìn",
      meaning: "to promote (an idea or cause)",
      breakdown: "促进 (cù jìn) - to promote (an idea or cause)",
    },
    {
      char: "促使",
      pinyin: "cù shǐ",
      meaning: "to induce",
      breakdown: "促使 (cù shǐ) - to induce",
    },
    {
      char: "催",
      pinyin: "cuī",
      meaning: "to urge",
      breakdown: "催 (cuī) - to urge",
    },
    {
      char: "存",
      pinyin: "cún",
      meaning: "to exist",
      breakdown: "存 (cún) - to exist",
    },
    {
      char: "存在",
      pinyin: "cún zài",
      meaning: "to exist",
      breakdown: "存在 (cún zài) - to exist",
    },
    {
      char: "错误",
      pinyin: "cuò wù",
      meaning: "error",
      breakdown: "错误 (cuò wù) - error",
    },
    {
      char: "措施",
      pinyin: "cuò shī",
      meaning: "measure",
      breakdown: "措施 (cuò shī) - measure",
    },
    {
      char: "答应",
      pinyin: "dā ying",
      meaning: "to promise",
      breakdown: "答应 (dā ying) - to promise",
    },
    {
      char: "达到",
      pinyin: "dá dào",
      meaning: "to reach",
      breakdown: "达到 (dá dào) - to reach",
    },
    {
      char: "打工",
      pinyin: "dǎ gōng",
      meaning: "to work a temporary or casual job",
      breakdown: "打工 (dǎ gōng) - to work a temporary or casual job",
    },
    {
      char: "打交道",
      pinyin: "dǎ jiāo dào",
      meaning: "to come into contact with",
      breakdown: "打交道 (dǎ jiāo dào) - to come into contact with",
    },
    {
      char: "打喷嚏",
      pinyin: "dǎ pēn tì",
      meaning: "to sneeze",
      breakdown: "打喷嚏 (dǎ pēn tì) - to sneeze",
    },
    {
      char: "打听",
      pinyin: "dǎ ting",
      meaning: "to ask about",
      breakdown: "打听 (dǎ ting) - to ask about",
    },
    {
      char: "打招呼",
      pinyin: "dǎ zhāo hu",
      meaning: "to greet sb by word or action",
      breakdown: "打招呼 (dǎ zhāo hu) - to greet sb by word or action",
    },
    {
      char: "大方",
      pinyin: "dà fang",
      meaning: "generous",
      breakdown: "大方 (dà fang) - generous",
    },
    {
      char: "大象",
      pinyin: "dà xiàng",
      meaning: "elephant",
      breakdown: "大象 (dà xiàng) - elephant",
    },
    {
      char: "大型",
      pinyin: "dà xíng",
      meaning: "large",
      breakdown: "大型 (dà xíng) - large",
    },
    {
      char: "呆",
      pinyin: "dāi",
      meaning: "foolish",
      breakdown: "呆 (dāi) - foolish",
    },
    {
      char: "贷款",
      pinyin: "dài kuǎn",
      meaning: "a loan",
      breakdown: "贷款 (dài kuǎn) - a loan",
    },
    {
      char: "待遇",
      pinyin: "dài yù",
      meaning: "treatment",
      breakdown: "待遇 (dài yù) - treatment",
    },
    {
      char: "担任",
      pinyin: "dān rèn",
      meaning: "to hold a governmental office or post",
      breakdown: "担任 (dān rèn) - to hold a governmental office or post",
    },
    {
      char: "单纯",
      pinyin: "dān chún",
      meaning: "simple",
      breakdown: "单纯 (dān chún) - simple",
    },
    {
      char: "单调",
      pinyin: "dān diào",
      meaning: "monotonous",
      breakdown: "单调 (dān diào) - monotonous",
    },
    {
      char: "单独",
      pinyin: "dān dú",
      meaning: "alone",
      breakdown: "单独 (dān dú) - alone",
    },
    {
      char: "单位",
      pinyin: "dān wèi",
      meaning: "a unit",
      breakdown: "单位 (dān wèi) - a unit",
    },
    {
      char: "单元",
      pinyin: "dān yuán",
      meaning: "unit",
      breakdown: "单元 (dān yuán) - unit",
    },
    {
      char: "耽误",
      pinyin: "dān wu",
      meaning: "to delay",
      breakdown: "耽误 (dān wu) - to delay",
    },
    {
      char: "胆小鬼",
      pinyin: "dǎn xiǎo guǐ",
      meaning: "coward",
      breakdown: "胆小鬼 (dǎn xiǎo guǐ) - coward",
    },
    {
      char: "淡",
      pinyin: "dàn",
      meaning: "insipid",
      breakdown: "淡 (dàn) - insipid",
    },
    {
      char: "当代",
      pinyin: "dāng dài",
      meaning: "the present age",
      breakdown: "当代 (dāng dài) - the present age",
    },
    {
      char: "挡",
      pinyin: "dǎng",
      meaning: "to resist",
      breakdown: "挡 (dǎng) - to resist",
    },
    {
      char: "岛",
      pinyin: "dǎo",
      meaning: "island",
      breakdown: "岛 (dǎo) - island",
    },
    {
      char: "倒霉",
      pinyin: "dǎo méi",
      meaning: "to have bad luck",
      breakdown: "倒霉 (dǎo méi) - to have bad luck",
    },
    {
      char: "导演",
      pinyin: "dǎo yǎn",
      meaning: "to direct",
      breakdown: "导演 (dǎo yǎn) - to direct",
    },
    {
      char: "导致",
      pinyin: "dǎo zhì",
      meaning: "to lead to",
      breakdown: "导致 (dǎo zhì) - to lead to",
    },
    {
      char: "倒",
      pinyin: "dào",
      meaning: "to place upside down",
      breakdown: "倒 (dào) - to place upside down",
    },
    {
      char: "到达",
      pinyin: "dào dá",
      meaning: "to reach",
      breakdown: "到达 (dào dá) - to reach",
    },
    {
      char: "道德",
      pinyin: "dào dé",
      meaning: "virtue",
      breakdown: "道德 (dào dé) - virtue",
    },
    {
      char: "道理",
      pinyin: "dào li",
      meaning: "reason",
      breakdown: "道理 (dào li) - reason",
    },
    {
      char: "登机牌",
      pinyin: "dēng jī pái",
      meaning: "boarding pass",
      breakdown: "登机牌 (dēng jī pái) - boarding pass",
    },
    {
      char: "登记",
      pinyin: "dēng jì",
      meaning: "to register (one's name)",
      breakdown: "登记 (dēng jì) - to register (one's name)",
    },
    {
      char: "等待",
      pinyin: "děng dài",
      meaning: "to wait",
      breakdown: "等待 (děng dài) - to wait",
    },
    {
      char: "等候",
      pinyin: "děng hòu",
      meaning: "to wait",
      breakdown: "等候 (děng hòu) - to wait",
    },
    {
      char: "等于",
      pinyin: "děng yú",
      meaning: "to equal",
      breakdown: "等于 (děng yú) - to equal",
    },
    {
      char: "滴",
      pinyin: "dī",
      meaning: "a drop",
      breakdown: "滴 (dī) - a drop",
    },
    {
      char: "的确",
      pinyin: "dí què",
      meaning: "really",
      breakdown: "的确 (dí què) - really",
    },
    {
      char: "敌人",
      pinyin: "dí rén",
      meaning: "enemy",
      breakdown: "敌人 (dí rén) - enemy",
    },
    {
      char: "递",
      pinyin: "dì",
      meaning: "to hand over",
      breakdown: "递 (dì) - to hand over",
    },
    {
      char: "地道",
      pinyin: "dì dao",
      meaning: "authentic",
      breakdown: "地道 (dì dao) - authentic",
    },
    {
      char: "地理",
      pinyin: "dì lǐ",
      meaning: "geography",
      breakdown: "地理 (dì lǐ) - geography",
    },
    {
      char: "地区",
      pinyin: "dì qū",
      meaning: "local",
      breakdown: "地区 (dì qū) - local",
    },
    {
      char: "地毯",
      pinyin: "dì tǎn",
      meaning: "carpet",
      breakdown: "地毯 (dì tǎn) - carpet",
    },
    {
      char: "地位",
      pinyin: "dì wèi",
      meaning: "position",
      breakdown: "地位 (dì wèi) - position",
    },
    {
      char: "地震",
      pinyin: "dì zhèn",
      meaning: "earthquake",
      breakdown: "地震 (dì zhèn) - earthquake",
    },
    {
      char: "点头",
      pinyin: "diǎn tóu",
      meaning: "to nod",
      breakdown: "点头 (diǎn tóu) - to nod",
    },
    {
      char: "点心",
      pinyin: "diǎn xin",
      meaning: "light refreshments",
      breakdown: "点心 (diǎn xin) - light refreshments",
    },
    {
      char: "电池",
      pinyin: "diàn chí",
      meaning: "battery",
      breakdown: "电池 (diàn chí) - battery",
    },
    {
      char: "电台",
      pinyin: "diàn tái",
      meaning: "transmitter-receiver",
      breakdown: "电台 (diàn tái) - transmitter-receiver",
    },
    {
      char: "钓",
      pinyin: "diào",
      meaning: "to fish with a hook and bait",
      breakdown: "钓 (diào) - to fish with a hook and bait",
    },
    {
      char: "丁",
      pinyin: "dīng",
      meaning: "fourth of 10 heavenly stems 十天干",
      breakdown: "丁 (dīng) - fourth of 10 heavenly stems 十天干",
    },
    {
      char: "顶",
      pinyin: "dǐng",
      meaning: "apex",
      breakdown: "顶 (dǐng) - apex",
    },
    {
      char: "冻",
      pinyin: "dòng",
      meaning: "to freeze",
      breakdown: "冻 (dòng) - to freeze",
    },
    {
      char: "洞",
      pinyin: "dòng",
      meaning: "cave",
      breakdown: "洞 (dòng) - cave",
    },
    {
      char: "动画片",
      pinyin: "dòng huà piàn",
      meaning: "animated film",
      breakdown: "动画片 (dòng huà piàn) - animated film",
    },
    {
      char: "逗",
      pinyin: "dòu",
      meaning: "to stay",
      breakdown: "逗 (dòu) - to stay",
    },
    {
      char: "豆腐",
      pinyin: "dòu fu",
      meaning: "tofu",
      breakdown: "豆腐 (dòu fu) - tofu",
    },
    {
      char: "独立",
      pinyin: "dú lì",
      meaning: "independent",
      breakdown: "独立 (dú lì) - independent",
    },
    {
      char: "独特",
      pinyin: "dú tè",
      meaning: "unique",
      breakdown: "独特 (dú tè) - unique",
    },
    {
      char: "度过",
      pinyin: "dù guò",
      meaning: "to pass",
      breakdown: "度过 (dù guò) - to pass",
    },
    {
      char: "短信",
      pinyin: "duǎn xìn",
      meaning: "text message",
      breakdown: "短信 (duǎn xìn) - text message",
    },
    {
      char: "堆",
      pinyin: "duī",
      meaning: "to pile up",
      breakdown: "堆 (duī) - to pile up",
    },
    {
      char: "对比",
      pinyin: "duì bǐ",
      meaning: "to contrast",
      breakdown: "对比 (duì bǐ) - to contrast",
    },
    {
      char: "对待",
      pinyin: "duì dài",
      meaning: "to treat",
      breakdown: "对待 (duì dài) - to treat",
    },
    {
      char: "对方",
      pinyin: "duì fāng",
      meaning: "counterpart",
      breakdown: "对方 (duì fāng) - counterpart",
    },
    {
      char: "对手",
      pinyin: "duì shǒu",
      meaning: "opponent",
      breakdown: "对手 (duì shǒu) - opponent",
    },
    {
      char: "对象",
      pinyin: "duì xiàng",
      meaning: "target",
      breakdown: "对象 (duì xiàng) - target",
    },
    {
      char: "对于",
      pinyin: "duì yú",
      meaning: "regarding",
      breakdown: "对于 (duì yú) - regarding",
    },
    { char: "吨", pinyin: "dūn", meaning: "ton", breakdown: "吨 (dūn) - ton" },
    {
      char: "蹲",
      pinyin: "dūn",
      meaning: "to crouch",
      breakdown: "蹲 (dūn) - to crouch",
    },
    {
      char: "多亏",
      pinyin: "duō kuī",
      meaning: "thanks to",
      breakdown: "多亏 (duō kuī) - thanks to",
    },
    {
      char: "多余",
      pinyin: "duō yú",
      meaning: "superfluous",
      breakdown: "多余 (duō yú) - superfluous",
    },
    {
      char: "躲藏",
      pinyin: "duǒ cáng",
      meaning: "to hide oneself",
      breakdown: "躲藏 (duǒ cáng) - to hide oneself",
    },
    {
      char: "恶劣",
      pinyin: "è liè",
      meaning: "vile",
      breakdown: "恶劣 (è liè) - vile",
    },
    {
      char: "发表",
      pinyin: "fā biǎo",
      meaning: "to issue",
      breakdown: "发表 (fā biǎo) - to issue",
    },
    {
      char: "发愁",
      pinyin: "fā chóu",
      meaning: "to worry",
      breakdown: "发愁 (fā chóu) - to worry",
    },
    {
      char: "发达",
      pinyin: "fā dá",
      meaning: "developed (country etc)",
      breakdown: "发达 (fā dá) - developed (country etc)",
    },
    {
      char: "发抖",
      pinyin: "fā dǒu",
      meaning: "to tremble",
      breakdown: "发抖 (fā dǒu) - to tremble",
    },
    {
      char: "发挥",
      pinyin: "fā huī",
      meaning: "to display",
      breakdown: "发挥 (fā huī) - to display",
    },
    {
      char: "发明",
      pinyin: "fā míng",
      meaning: "to invent",
      breakdown: "发明 (fā míng) - to invent",
    },
    {
      char: "发票",
      pinyin: "fā piào",
      meaning: "invoice",
      breakdown: "发票 (fā piào) - invoice",
    },
    {
      char: "发言",
      pinyin: "fā yán",
      meaning: "to make a speech",
      breakdown: "发言 (fā yán) - to make a speech",
    },
    {
      char: "罚款",
      pinyin: "fá kuǎn",
      meaning: "(impose a) fine",
      breakdown: "罚款 (fá kuǎn) - (impose a) fine",
    },
    {
      char: "法院",
      pinyin: "fǎ yuàn",
      meaning: "court of law",
      breakdown: "法院 (fǎ yuàn) - court of law",
    },
    {
      char: "翻",
      pinyin: "fān",
      meaning: "to turn over",
      breakdown: "翻 (fān) - to turn over",
    },
    {
      char: "繁荣",
      pinyin: "fán róng",
      meaning: "prosperous",
      breakdown: "繁荣 (fán róng) - prosperous",
    },
    {
      char: "凡是",
      pinyin: "fán shì",
      meaning: "each and every",
      breakdown: "凡是 (fán shì) - each and every",
    },
    {
      char: "反而",
      pinyin: "fǎn ér",
      meaning: "instead",
      breakdown: "反而 (fǎn ér) - instead",
    },
    {
      char: "反复",
      pinyin: "fǎn fù",
      meaning: "repeatedly",
      breakdown: "反复 (fǎn fù) - repeatedly",
    },
    {
      char: "反应",
      pinyin: "fǎn yìng",
      meaning: "to react",
      breakdown: "反应 (fǎn yìng) - to react",
    },
    {
      char: "反正",
      pinyin: "fǎn zhèng",
      meaning: "anyway",
      breakdown: "反正 (fǎn zhèng) - anyway",
    },
    {
      char: "方",
      pinyin: "fāng",
      meaning: "square",
      breakdown: "方 (fāng) - square",
    },
    {
      char: "方案",
      pinyin: "fāng àn",
      meaning: "plan",
      breakdown: "方案 (fāng àn) - plan",
    },
    {
      char: "方式",
      pinyin: "fāng shì",
      meaning: "way (of life)",
      breakdown: "方式 (fāng shì) - way (of life)",
    },
    {
      char: "妨碍",
      pinyin: "fáng ài",
      meaning: "to hinder",
      breakdown: "妨碍 (fáng ài) - to hinder",
    },
    {
      char: "房东",
      pinyin: "fáng dōng",
      meaning: "landlord",
      breakdown: "房东 (fáng dōng) - landlord",
    },
    {
      char: "仿佛",
      pinyin: "fǎng fú",
      meaning: "to seem",
      breakdown: "仿佛 (fǎng fú) - to seem",
    },
    {
      char: "放松",
      pinyin: "fàng sōng",
      meaning: "to loosen",
      breakdown: "放松 (fàng sōng) - to loosen",
    },
    {
      char: "非",
      pinyin: "fēi",
      meaning: "to not be",
      breakdown: "非 (fēi) - to not be",
    },
    {
      char: "肥皂",
      pinyin: "féi zào",
      meaning: "soap",
      breakdown: "肥皂 (féi zào) - soap",
    },
    {
      char: "肺",
      pinyin: "fèi",
      meaning: "lung",
      breakdown: "肺 (fèi) - lung",
    },
    {
      char: "废话",
      pinyin: "fèi huà",
      meaning: "nonsense",
      breakdown: "废话 (fèi huà) - nonsense",
    },
    {
      char: "费用",
      pinyin: "fèi yòng",
      meaning: "cost",
      breakdown: "费用 (fèi yòng) - cost",
    },
    {
      char: "分别",
      pinyin: "fēn bié",
      meaning: "to part or leave each other",
      breakdown: "分别 (fēn bié) - to part or leave each other",
    },
    {
      char: "分布",
      pinyin: "fēn bù",
      meaning: "distributed",
      breakdown: "分布 (fēn bù) - distributed",
    },
    {
      char: "分配",
      pinyin: "fēn pèi",
      meaning: "to distribute",
      breakdown: "分配 (fēn pèi) - to distribute",
    },
    {
      char: "分析",
      pinyin: "fēn xī",
      meaning: "to analyze",
      breakdown: "分析 (fēn xī) - to analyze",
    },
    {
      char: "纷纷",
      pinyin: "fēn fēn",
      meaning: "one after another",
      breakdown: "纷纷 (fēn fēn) - one after another",
    },
    {
      char: "奋斗",
      pinyin: "fèn dòu",
      meaning: "to strive",
      breakdown: "奋斗 (fèn dòu) - to strive",
    },
    {
      char: "愤怒",
      pinyin: "fèn nù",
      meaning: "angry",
      breakdown: "愤怒 (fèn nù) - angry",
    },
    {
      char: "风格",
      pinyin: "fēng gé",
      meaning: "style",
      breakdown: "风格 (fēng gé) - style",
    },
    {
      char: "风俗",
      pinyin: "fēng sú",
      meaning: "social custom",
      breakdown: "风俗 (fēng sú) - social custom",
    },
    {
      char: "风险",
      pinyin: "fēng xiǎn",
      meaning: "risk",
      breakdown: "风险 (fēng xiǎn) - risk",
    },
    {
      char: "疯狂",
      pinyin: "fēng kuáng",
      meaning: "madness",
      breakdown: "疯狂 (fēng kuáng) - madness",
    },
    {
      char: "讽刺",
      pinyin: "fěng cì",
      meaning: "to satirize",
      breakdown: "讽刺 (fěng cì) - to satirize",
    },
    {
      char: "否定",
      pinyin: "fǒu dìng",
      meaning: "to negate",
      breakdown: "否定 (fǒu dìng) - to negate",
    },
    {
      char: "否认",
      pinyin: "fǒu rèn",
      meaning: "to declare to be untrue",
      breakdown: "否认 (fǒu rèn) - to declare to be untrue",
    },
    {
      char: "扶",
      pinyin: "fú",
      meaning: "to support with the hand",
      breakdown: "扶 (fú) - to support with the hand",
    },
    {
      char: "幅",
      pinyin: "fú",
      meaning: "width",
      breakdown: "幅 (fú) - width",
    },
    {
      char: "服从",
      pinyin: "fú cóng",
      meaning: "to obey (an order)",
      breakdown: "服从 (fú cóng) - to obey (an order)",
    },
    {
      char: "服装",
      pinyin: "fú zhuāng",
      meaning: "dress",
      breakdown: "服装 (fú zhuāng) - dress",
    },
    {
      char: "辅导",
      pinyin: "fǔ dǎo",
      meaning: "to coach",
      breakdown: "辅导 (fǔ dǎo) - to coach",
    },
    {
      char: "复制",
      pinyin: "fù zhì",
      meaning: "to duplicate",
      breakdown: "复制 (fù zhì) - to duplicate",
    },
    {
      char: "付款",
      pinyin: "fù kuǎn",
      meaning: "to pay a sum of money",
      breakdown: "付款 (fù kuǎn) - to pay a sum of money",
    },
    {
      char: "妇女",
      pinyin: "fù nǚ",
      meaning: "woman",
      breakdown: "妇女 (fù nǚ) - woman",
    },
    {
      char: "改革",
      pinyin: "gǎi gé",
      meaning: "reform",
      breakdown: "改革 (gǎi gé) - reform",
    },
    {
      char: "改进",
      pinyin: "gǎi jìn",
      meaning: "to improve",
      breakdown: "改进 (gǎi jìn) - to improve",
    },
    {
      char: "改善",
      pinyin: "gǎi shàn",
      meaning: "to make better",
      breakdown: "改善 (gǎi shàn) - to make better",
    },
    {
      char: "改正",
      pinyin: "gǎi zhèng",
      meaning: "to correct",
      breakdown: "改正 (gǎi zhèng) - to correct",
    },
    { char: "盖", pinyin: "gài", meaning: "lid", breakdown: "盖 (gài) - lid" },
    {
      char: "概括",
      pinyin: "gài kuò",
      meaning: "to summarize",
      breakdown: "概括 (gài kuò) - to summarize",
    },
    {
      char: "概念",
      pinyin: "gài niàn",
      meaning: "concept",
      breakdown: "概念 (gài niàn) - concept",
    },
    {
      char: "干脆",
      pinyin: "gān cuì",
      meaning: "straightforward",
      breakdown: "干脆 (gān cuì) - straightforward",
    },
    {
      char: "感激",
      pinyin: "gǎn jī",
      meaning: "to be grateful",
      breakdown: "感激 (gǎn jī) - to be grateful",
    },
    {
      char: "感受",
      pinyin: "gǎn shòu",
      meaning: "to sense",
      breakdown: "感受 (gǎn shòu) - to sense",
    },
    {
      char: "感想",
      pinyin: "gǎn xiǎng",
      meaning: "impressions",
      breakdown: "感想 (gǎn xiǎng) - impressions",
    },
    {
      char: "赶紧",
      pinyin: "gǎn jǐn",
      meaning: "hurriedly",
      breakdown: "赶紧 (gǎn jǐn) - hurriedly",
    },
    {
      char: "赶快",
      pinyin: "gǎn kuài",
      meaning: "at once",
      breakdown: "赶快 (gǎn kuài) - at once",
    },
    {
      char: "干活儿",
      pinyin: "gàn huó r",
      meaning: "to work",
      breakdown: "干活儿 (gàn huó r) - to work",
    },
    {
      char: "钢铁",
      pinyin: "gāng tiě",
      meaning: "steel",
      breakdown: "钢铁 (gāng tiě) - steel",
    },
    {
      char: "高档",
      pinyin: "gāo dàng",
      meaning: "superior quality",
      breakdown: "高档 (gāo dàng) - superior quality",
    },
    {
      char: "高速",
      pinyin: "gāo sù",
      meaning: "high speed",
      breakdown: "高速 (gāo sù) - high speed",
    },
    {
      char: "搞",
      pinyin: "gǎo",
      meaning: "to do",
      breakdown: "搞 (gǎo) - to do",
    },
    {
      char: "告别",
      pinyin: "gào bié",
      meaning: "to leave",
      breakdown: "告别 (gào bié) - to leave",
    },
    {
      char: "胳膊",
      pinyin: "gē bo",
      meaning: "arm",
      breakdown: "胳膊 (gē bo) - arm",
    },
    {
      char: "鸽子",
      pinyin: "gē zi",
      meaning: "pigeon",
      breakdown: "鸽子 (gē zi) - pigeon",
    },
    {
      char: "隔壁",
      pinyin: "gé bì",
      meaning: "next door",
      breakdown: "隔壁 (gé bì) - next door",
    },
    {
      char: "格外",
      pinyin: "gé wài",
      meaning: "especially",
      breakdown: "格外 (gé wài) - especially",
    },
    {
      char: "革命",
      pinyin: "gé mìng",
      meaning: "revolution",
      breakdown: "革命 (gé mìng) - revolution",
    },
    {
      char: "个别",
      pinyin: "gè bié",
      meaning: "individual",
      breakdown: "个别 (gè bié) - individual",
    },
    {
      char: "个人",
      pinyin: "gè rén",
      meaning: "individual",
      breakdown: "个人 (gè rén) - individual",
    },
    {
      char: "个性",
      pinyin: "gè xìng",
      meaning: "individuality",
      breakdown: "个性 (gè xìng) - individuality",
    },
    {
      char: "各自",
      pinyin: "gè zì",
      meaning: "each",
      breakdown: "各自 (gè zì) - each",
    },
    {
      char: "根",
      pinyin: "gēn",
      meaning: "root",
      breakdown: "根 (gēn) - root",
    },
    {
      char: "根本",
      pinyin: "gēn běn",
      meaning: "fundamental",
      breakdown: "根本 (gēn běn) - fundamental",
    },
    {
      char: "更加",
      pinyin: "gèng jiā",
      meaning: "more (than sth else)",
      breakdown: "更加 (gèng jiā) - more (than sth else)",
    },
    {
      char: "公布",
      pinyin: "gōng bù",
      meaning: "to announce",
      breakdown: "公布 (gōng bù) - to announce",
    },
    {
      char: "公开",
      pinyin: "gōng kāi",
      meaning: "public",
      breakdown: "公开 (gōng kāi) - public",
    },
    {
      char: "公平",
      pinyin: "gōng píng",
      meaning: "fair",
      breakdown: "公平 (gōng píng) - fair",
    },
    {
      char: "公寓",
      pinyin: "gōng yù",
      meaning: "apartment building",
      breakdown: "公寓 (gōng yù) - apartment building",
    },
    {
      char: "公元",
      pinyin: "gōng yuán",
      meaning: "CE (Common Era)",
      breakdown: "公元 (gōng yuán) - CE (Common Era)",
    },
    {
      char: "公主",
      pinyin: "gōng zhǔ",
      meaning: "princess",
      breakdown: "公主 (gōng zhǔ) - princess",
    },
    {
      char: "工厂",
      pinyin: "gōng chǎng",
      meaning: "factory",
      breakdown: "工厂 (gōng chǎng) - factory",
    },
    {
      char: "工程师",
      pinyin: "gōng chéng shī",
      meaning: "engineer",
      breakdown: "工程师 (gōng chéng shī) - engineer",
    },
    {
      char: "工人",
      pinyin: "gōng rén",
      meaning: "worker",
      breakdown: "工人 (gōng rén) - worker",
    },
    {
      char: "工业",
      pinyin: "gōng yè",
      meaning: "industry",
      breakdown: "工业 (gōng yè) - industry",
    },
    {
      char: "功夫",
      pinyin: "gōng fu",
      meaning: "skill",
      breakdown: "功夫 (gōng fu) - skill",
    },
    {
      char: "功能",
      pinyin: "gōng néng",
      meaning: "function",
      breakdown: "功能 (gōng néng) - function",
    },
    {
      char: "贡献",
      pinyin: "gòng xiàn",
      meaning: "to contribute",
      breakdown: "贡献 (gòng xiàn) - to contribute",
    },
    {
      char: "沟通",
      pinyin: "gōu tōng",
      meaning: "to join",
      breakdown: "沟通 (gōu tōng) - to join",
    },
    {
      char: "构成",
      pinyin: "gòu chéng",
      meaning: "to constitute",
      breakdown: "构成 (gòu chéng) - to constitute",
    },
    {
      char: "姑姑",
      pinyin: "gū gu",
      meaning: "paternal aunt",
      breakdown: "姑姑 (gū gu) - paternal aunt",
    },
    {
      char: "姑娘",
      pinyin: "gū niang",
      meaning: "girl",
      breakdown: "姑娘 (gū niang) - girl",
    },
    {
      char: "古代",
      pinyin: "gǔ dài",
      meaning: "ancient times",
      breakdown: "古代 (gǔ dài) - ancient times",
    },
    {
      char: "古典",
      pinyin: "gǔ diǎn",
      meaning: "classical",
      breakdown: "古典 (gǔ diǎn) - classical",
    },
    {
      char: "古老",
      pinyin: "gǔ lǎo",
      meaning: "ancient",
      breakdown: "古老 (gǔ lǎo) - ancient",
    },
    {
      char: "股票",
      pinyin: "gǔ piào",
      meaning: "share",
      breakdown: "股票 (gǔ piào) - share",
    },
    {
      char: "鼓舞",
      pinyin: "gǔ wǔ",
      meaning: "heartening (news)",
      breakdown: "鼓舞 (gǔ wǔ) - heartening (news)",
    },
    {
      char: "骨头",
      pinyin: "gǔ tou",
      meaning: "bone",
      breakdown: "骨头 (gǔ tou) - bone",
    },
    {
      char: "固定",
      pinyin: "gù dìng",
      meaning: "fixed",
      breakdown: "固定 (gù dìng) - fixed",
    },
    {
      char: "固体",
      pinyin: "gù tǐ",
      meaning: "solid",
      breakdown: "固体 (gù tǐ) - solid",
    },
    {
      char: "雇佣",
      pinyin: "gù yōng",
      meaning: "to employ",
      breakdown: "雇佣 (gù yōng) - to employ",
    },
    {
      char: "挂号",
      pinyin: "guà hào",
      meaning: "to register (a letter etc)",
      breakdown: "挂号 (guà hào) - to register (a letter etc)",
    },
    {
      char: "乖",
      pinyin: "guāi",
      meaning: "(of a child) obedient",
      breakdown: "乖 (guāi) - (of a child) obedient",
    },
    {
      char: "拐弯",
      pinyin: "guǎi wān",
      meaning: "to go round a curve",
      breakdown: "拐弯 (guǎi wān) - to go round a curve",
    },
    {
      char: "怪不得",
      pinyin: "guài bu de",
      meaning: "no wonder!",
      breakdown: "怪不得 (guài bu de) - no wonder!",
    },
    {
      char: "关闭",
      pinyin: "guān bì",
      meaning: "to close",
      breakdown: "关闭 (guān bì) - to close",
    },
    {
      char: "关怀",
      pinyin: "guān huái",
      meaning: "care",
      breakdown: "关怀 (guān huái) - care",
    },
    {
      char: "官",
      pinyin: "guān",
      meaning: "official",
      breakdown: "官 (guān) - official",
    },
    {
      char: "观察",
      pinyin: "guān chá",
      meaning: "to observe",
      breakdown: "观察 (guān chá) - to observe",
    },
    {
      char: "观点",
      pinyin: "guān diǎn",
      meaning: "point of view",
      breakdown: "观点 (guān diǎn) - point of view",
    },
    {
      char: "观念",
      pinyin: "guān niàn",
      meaning: "notion",
      breakdown: "观念 (guān niàn) - notion",
    },
    {
      char: "管子",
      pinyin: "guǎn zi",
      meaning: "tube",
      breakdown: "管子 (guǎn zi) - tube",
    },
    {
      char: "罐头",
      pinyin: "guàn tou",
      meaning: "tin",
      breakdown: "罐头 (guàn tou) - tin",
    },
    {
      char: "冠军",
      pinyin: "guàn jūn",
      meaning: "champion",
      breakdown: "冠军 (guàn jūn) - champion",
    },
    {
      char: "光滑",
      pinyin: "guāng hua",
      meaning: "glossy",
      breakdown: "光滑 (guāng hua) - glossy",
    },
    {
      char: "光临",
      pinyin: "guāng lín",
      meaning: "(honorific) Welcome!",
      breakdown: "光临 (guāng lín) - (honorific) Welcome!",
    },
    {
      char: "光明",
      pinyin: "guāng míng",
      meaning: "light",
      breakdown: "光明 (guāng míng) - light",
    },
    {
      char: "光盘",
      pinyin: "guāng pán",
      meaning: "compact disc",
      breakdown: "光盘 (guāng pán) - compact disc",
    },
    {
      char: "光荣",
      pinyin: "guāng róng",
      meaning: "honor and glory",
      breakdown: "光荣 (guāng róng) - honor and glory",
    },
    {
      char: "广场",
      pinyin: "guǎng chǎng",
      meaning: "public square",
      breakdown: "广场 (guǎng chǎng) - public square",
    },
    {
      char: "广大",
      pinyin: "guǎng dà",
      meaning: "(of an area) vast or extensive",
      breakdown: "广大 (guǎng dà) - (of an area) vast or extensive",
    },
    {
      char: "广泛",
      pinyin: "guǎng fàn",
      meaning: "extensive",
      breakdown: "广泛 (guǎng fàn) - extensive",
    },
    {
      char: "规矩",
      pinyin: "guī ju",
      meaning: "lit. compass and set square",
      breakdown: "规矩 (guī ju) - lit. compass and set square",
    },
    {
      char: "规律",
      pinyin: "guī lǜ",
      meaning: "rule (e.g. of science)",
      breakdown: "规律 (guī lǜ) - rule (e.g. of science)",
    },
    {
      char: "规模",
      pinyin: "guī mó",
      meaning: "scale",
      breakdown: "规模 (guī mó) - scale",
    },
    {
      char: "规则",
      pinyin: "guī zé",
      meaning: "rule",
      breakdown: "规则 (guī zé) - rule",
    },
    {
      char: "柜台",
      pinyin: "guì tái",
      meaning: "sales counter",
      breakdown: "柜台 (guì tái) - sales counter",
    },
    {
      char: "滚",
      pinyin: "gǔn",
      meaning: "to boil",
      breakdown: "滚 (gǔn) - to boil",
    },
    { char: "锅", pinyin: "guō", meaning: "pot", breakdown: "锅 (guō) - pot" },
    {
      char: "国籍",
      pinyin: "guó jí",
      meaning: "nationality",
      breakdown: "国籍 (guó jí) - nationality",
    },
    {
      char: "国庆节",
      pinyin: "Guó qìng jié",
      meaning: "PRC National Day (October 1st)",
      breakdown: "国庆节 (Guó qìng jié) - PRC National Day (October 1st)",
    },
    {
      char: "果实",
      pinyin: "guǒ shí",
      meaning: "fruit",
      breakdown: "果实 (guǒ shí) - fruit",
    },
    {
      char: "过分",
      pinyin: "guò fèn",
      meaning: "excessive",
      breakdown: "过分 (guò fèn) - excessive",
    },
    {
      char: "过敏",
      pinyin: "guò mǐn",
      meaning: "to be allergic",
      breakdown: "过敏 (guò mǐn) - to be allergic",
    },
    {
      char: "过期",
      pinyin: "guò qī",
      meaning: "to be overdue",
      breakdown: "过期 (guò qī) - to be overdue",
    },
    {
      char: "哈",
      pinyin: "hā",
      meaning: "laughter",
      breakdown: "哈 (hā) - laughter",
    },
    {
      char: "海关",
      pinyin: "hǎi guān",
      meaning: "customs (i.e. border crossing inspection)",
      breakdown: "海关 (hǎi guān) - customs (i.e. border crossing inspection)",
    },
    {
      char: "海鲜",
      pinyin: "hǎi xiān",
      meaning: "seafood",
      breakdown: "海鲜 (hǎi xiān) - seafood",
    },
    {
      char: "喊",
      pinyin: "hǎn",
      meaning: "to yell",
      breakdown: "喊 (hǎn) - to yell",
    },
    {
      char: "行业",
      pinyin: "háng yè",
      meaning: "industry",
      breakdown: "行业 (háng yè) - industry",
    },
    {
      char: "豪华",
      pinyin: "háo huá",
      meaning: "luxurious",
      breakdown: "豪华 (háo huá) - luxurious",
    },
    {
      char: "好奇",
      pinyin: "hào qí",
      meaning: "inquisitive",
      breakdown: "好奇 (hào qí) - inquisitive",
    },
    {
      char: "和平",
      pinyin: "hé píng",
      meaning: "peace",
      breakdown: "和平 (hé píng) - peace",
    },
    {
      char: "何必",
      pinyin: "hé bì",
      meaning: "there is no need",
      breakdown: "何必 (hé bì) - there is no need",
    },
    {
      char: "何况",
      pinyin: "hé kuàng",
      meaning: "let alone",
      breakdown: "何况 (hé kuàng) - let alone",
    },
    {
      char: "合法",
      pinyin: "hé fǎ",
      meaning: "lawful",
      breakdown: "合法 (hé fǎ) - lawful",
    },
    {
      char: "合理",
      pinyin: "hé lǐ",
      meaning: "rational",
      breakdown: "合理 (hé lǐ) - rational",
    },
    {
      char: "合同",
      pinyin: "hé tong",
      meaning: "(business) contract",
      breakdown: "合同 (hé tong) - (business) contract",
    },
    {
      char: "合影",
      pinyin: "hé yǐng",
      meaning: "joint photo",
      breakdown: "合影 (hé yǐng) - joint photo",
    },
    {
      char: "合作",
      pinyin: "hé zuò",
      meaning: "to cooperate",
      breakdown: "合作 (hé zuò) - to cooperate",
    },
    {
      char: "核心",
      pinyin: "hé xīn",
      meaning: "core",
      breakdown: "核心 (hé xīn) - core",
    },
    {
      char: "恨",
      pinyin: "hèn",
      meaning: "to hate",
      breakdown: "恨 (hèn) - to hate",
    },
    {
      char: "横",
      pinyin: "héng",
      meaning: "horizontal",
      breakdown: "横 (héng) - horizontal",
    },
    {
      char: "后果",
      pinyin: "hòu guǒ",
      meaning: "consequences",
      breakdown: "后果 (hòu guǒ) - consequences",
    },
    {
      char: "忽视",
      pinyin: "hū shì",
      meaning: "to neglect",
      breakdown: "忽视 (hū shì) - to neglect",
    },
    {
      char: "呼吸",
      pinyin: "hū xī",
      meaning: "to breathe",
      breakdown: "呼吸 (hū xī) - to breathe",
    },
    { char: "壶", pinyin: "hú", meaning: "pot", breakdown: "壶 (hú) - pot" },
    {
      char: "蝴蝶",
      pinyin: "hú dié",
      meaning: "butterfly",
      breakdown: "蝴蝶 (hú dié) - butterfly",
    },
    {
      char: "胡说",
      pinyin: "hú shuō",
      meaning: "to talk nonsense",
      breakdown: "胡说 (hú shuō) - to talk nonsense",
    },
    {
      char: "胡同",
      pinyin: "hú tòng",
      meaning: "variant of 胡同[hú tòng]",
      breakdown: "胡同 (hú tòng) - variant of 胡同[hú tòng]",
    },
    {
      char: "胡须",
      pinyin: "hú xū",
      meaning: "beard",
      breakdown: "胡须 (hú xū) - beard",
    },
    {
      char: "糊涂",
      pinyin: "hú tu",
      meaning: "muddled",
      breakdown: "糊涂 (hú tu) - muddled",
    },
    {
      char: "花生",
      pinyin: "huā shēng",
      meaning: "peanut",
      breakdown: "花生 (huā shēng) - peanut",
    },
    {
      char: "滑冰",
      pinyin: "huá bīng",
      meaning: "to skate",
      breakdown: "滑冰 (huá bīng) - to skate",
    },
    {
      char: "划船",
      pinyin: "huá chuán",
      meaning: "to row a boat",
      breakdown: "划船 (huá chuán) - to row a boat",
    },
    {
      char: "华裔",
      pinyin: "Huá yì",
      meaning: "ethnic Chinese",
      breakdown: "华裔 (Huá yì) - ethnic Chinese",
    },
    {
      char: "化学",
      pinyin: "huà xué",
      meaning: "chemistry",
      breakdown: "化学 (huà xué) - chemistry",
    },
    {
      char: "话题",
      pinyin: "huà tí",
      meaning: "subject (of a talk or conversation)",
      breakdown: "话题 (huà tí) - subject (of a talk or conversation)",
    },
    {
      char: "怀念",
      pinyin: "huái niàn",
      meaning: "to cherish the memory of",
      breakdown: "怀念 (huái niàn) - to cherish the memory of",
    },
    {
      char: "缓解",
      pinyin: "huǎn jiě",
      meaning: "to blunt",
      breakdown: "缓解 (huǎn jiě) - to blunt",
    },
    {
      char: "幻想",
      pinyin: "huàn xiǎng",
      meaning: "delusion",
      breakdown: "幻想 (huàn xiǎng) - delusion",
    },
    {
      char: "慌张",
      pinyin: "huāng zhāng",
      meaning: "confused",
      breakdown: "慌张 (huāng zhāng) - confused",
    },
    {
      char: "黄瓜",
      pinyin: "huáng guā",
      meaning: "cucumber",
      breakdown: "黄瓜 (huáng guā) - cucumber",
    },
    {
      char: "黄金",
      pinyin: "huáng jīn",
      meaning: "gold",
      breakdown: "黄金 (huáng jīn) - gold",
    },
    {
      char: "皇帝",
      pinyin: "huáng dì",
      meaning: "emperor",
      breakdown: "皇帝 (huáng dì) - emperor",
    },
    {
      char: "皇后",
      pinyin: "huáng hòu",
      meaning: "empress",
      breakdown: "皇后 (huáng hòu) - empress",
    },
    { char: "灰", pinyin: "huī", meaning: "ash", breakdown: "灰 (huī) - ash" },
    {
      char: "灰尘",
      pinyin: "huī chén",
      meaning: "dust",
      breakdown: "灰尘 (huī chén) - dust",
    },
    {
      char: "灰心",
      pinyin: "huī xīn",
      meaning: "to lose heart",
      breakdown: "灰心 (huī xīn) - to lose heart",
    },
    {
      char: "挥",
      pinyin: "huī",
      meaning: "to wave",
      breakdown: "挥 (huī) - to wave",
    },
    {
      char: "恢复",
      pinyin: "huī fù",
      meaning: "to reinstate",
      breakdown: "恢复 (huī fù) - to reinstate",
    },
    {
      char: "汇率",
      pinyin: "huì lǜ",
      meaning: "exchange rate",
      breakdown: "汇率 (huì lǜ) - exchange rate",
    },
    {
      char: "婚礼",
      pinyin: "hūn lǐ",
      meaning: "wedding ceremony",
      breakdown: "婚礼 (hūn lǐ) - wedding ceremony",
    },
    {
      char: "婚姻",
      pinyin: "hūn yīn",
      meaning: "matrimony",
      breakdown: "婚姻 (hūn yīn) - matrimony",
    },
    {
      char: "活跃",
      pinyin: "huó yuè",
      meaning: "active",
      breakdown: "活跃 (huó yuè) - active",
    },
    {
      char: "火柴",
      pinyin: "huǒ chái",
      meaning: "match (for lighting fire)",
      breakdown: "火柴 (huǒ chái) - match (for lighting fire)",
    },
    {
      char: "伙伴",
      pinyin: "huǒ bàn",
      meaning: "partner",
      breakdown: "伙伴 (huǒ bàn) - partner",
    },
    {
      char: "基本",
      pinyin: "jī běn",
      meaning: "basic",
      breakdown: "基本 (jī běn) - basic",
    },
    {
      char: "机器",
      pinyin: "jī qì",
      meaning: "machine",
      breakdown: "机器 (jī qì) - machine",
    },
    {
      char: "激烈",
      pinyin: "jī liè",
      meaning: "intense",
      breakdown: "激烈 (jī liè) - intense",
    },
    {
      char: "肌肉",
      pinyin: "jī ròu",
      meaning: "muscle",
      breakdown: "肌肉 (jī ròu) - muscle",
    },
    {
      char: "及格",
      pinyin: "jí gé",
      meaning: "to pass a test",
      breakdown: "及格 (jí gé) - to pass a test",
    },
    {
      char: "急忙",
      pinyin: "jí máng",
      meaning: "hastily",
      breakdown: "急忙 (jí máng) - hastily",
    },
    {
      char: "集体",
      pinyin: "jí tǐ",
      meaning: "collective",
      breakdown: "集体 (jí tǐ) - collective",
    },
    {
      char: "集中",
      pinyin: "jí zhōng",
      meaning: "to concentrate",
      breakdown: "集中 (jí zhōng) - to concentrate",
    },
    {
      char: "记录",
      pinyin: "jì lù",
      meaning: "to record",
      breakdown: "记录 (jì lù) - to record",
    },
    {
      char: "记忆",
      pinyin: "jì yì",
      meaning: "to remember",
      breakdown: "记忆 (jì yì) - to remember",
    },
    {
      char: "计算",
      pinyin: "jì suàn",
      meaning: "to count",
      breakdown: "计算 (jì suàn) - to count",
    },
    {
      char: "寂寞",
      pinyin: "jì mò",
      meaning: "lonely",
      breakdown: "寂寞 (jì mò) - lonely",
    },
    {
      char: "系领带",
      pinyin: "jì lǐng dài",
      meaning: "to tie one's necktie",
      breakdown: "系领带 (jì lǐng dài) - to tie one's necktie",
    },
    {
      char: "纪录",
      pinyin: "jì lù",
      meaning: "record",
      breakdown: "纪录 (jì lù) - record",
    },
    {
      char: "纪律",
      pinyin: "jì lǜ",
      meaning: "discipline",
      breakdown: "纪律 (jì lǜ) - discipline",
    },
    {
      char: "纪念",
      pinyin: "jì niàn",
      meaning: "to commemorate",
      breakdown: "纪念 (jì niàn) - to commemorate",
    },
    {
      char: "家庭",
      pinyin: "jiā tíng",
      meaning: "family",
      breakdown: "家庭 (jiā tíng) - family",
    },
    {
      char: "家务",
      pinyin: "jiā wù",
      meaning: "household duties",
      breakdown: "家务 (jiā wù) - household duties",
    },
    {
      char: "家乡",
      pinyin: "jiā xiāng",
      meaning: "hometown",
      breakdown: "家乡 (jiā xiāng) - hometown",
    },
    {
      char: "嘉宾",
      pinyin: "jiā bīn",
      meaning: "esteemed guest",
      breakdown: "嘉宾 (jiā bīn) - esteemed guest",
    },
    {
      char: "夹子",
      pinyin: "jiā zi",
      meaning: "clip",
      breakdown: "夹子 (jiā zi) - clip",
    },
    {
      char: "甲",
      pinyin: "jiǎ",
      meaning: "first of the ten heavenly stems 十天干[shí tiān gān]",
      breakdown:
        "甲 (jiǎ) - first of the ten heavenly stems 十天干[shí tiān gān]",
    },
    {
      char: "假如",
      pinyin: "jiǎ rú",
      meaning: "if",
      breakdown: "假如 (jiǎ rú) - if",
    },
    {
      char: "假装",
      pinyin: "jiǎ zhuāng",
      meaning: "to feign",
      breakdown: "假装 (jiǎ zhuāng) - to feign",
    },
    {
      char: "嫁",
      pinyin: "jià",
      meaning: "(of a woman) to marry",
      breakdown: "嫁 (jià) - (of a woman) to marry",
    },
    {
      char: "价值",
      pinyin: "jià zhí",
      meaning: "value",
      breakdown: "价值 (jià zhí) - value",
    },
    {
      char: "驾驶",
      pinyin: "jià shǐ",
      meaning: "to pilot (ship)",
      breakdown: "驾驶 (jià shǐ) - to pilot (ship)",
    },
    {
      char: "煎",
      pinyin: "jiān",
      meaning: "to pan fry",
      breakdown: "煎 (jiān) - to pan fry",
    },
    {
      char: "肩膀",
      pinyin: "jiān bǎng",
      meaning: "shoulder",
      breakdown: "肩膀 (jiān bǎng) - shoulder",
    },
    {
      char: "坚决",
      pinyin: "jiān jué",
      meaning: "firm",
      breakdown: "坚决 (jiān jué) - firm",
    },
    {
      char: "坚强",
      pinyin: "jiān qiáng",
      meaning: "staunch",
      breakdown: "坚强 (jiān qiáng) - staunch",
    },
    {
      char: "尖锐",
      pinyin: "jiān ruì",
      meaning: "sharp",
      breakdown: "尖锐 (jiān ruì) - sharp",
    },
    {
      char: "艰巨",
      pinyin: "jiān jù",
      meaning: "arduous",
      breakdown: "艰巨 (jiān jù) - arduous",
    },
    {
      char: "艰苦",
      pinyin: "jiān kǔ",
      meaning: "difficult",
      breakdown: "艰苦 (jiān kǔ) - difficult",
    },
    {
      char: "捡",
      pinyin: "jiǎn",
      meaning: "to pick up",
      breakdown: "捡 (jiǎn) - to pick up",
    },
    {
      char: "剪刀",
      pinyin: "jiǎn dāo",
      meaning: "scissors",
      breakdown: "剪刀 (jiǎn dāo) - scissors",
    },
    {
      char: "简历",
      pinyin: "jiǎn lì",
      meaning: "Curriculum Vitae (CV)",
      breakdown: "简历 (jiǎn lì) - Curriculum Vitae (CV)",
    },
    {
      char: "简直",
      pinyin: "jiǎn zhí",
      meaning: "simply",
      breakdown: "简直 (jiǎn zhí) - simply",
    },
    {
      char: "健身房",
      pinyin: "jiàn shēn fáng",
      meaning: "gym",
      breakdown: "健身房 (jiàn shēn fáng) - gym",
    },
    {
      char: "建立",
      pinyin: "jiàn lì",
      meaning: "to establish",
      breakdown: "建立 (jiàn lì) - to establish",
    },
    {
      char: "建设",
      pinyin: "jiàn shè",
      meaning: "to build",
      breakdown: "建设 (jiàn shè) - to build",
    },
    {
      char: "建议",
      pinyin: "jiàn yì",
      meaning: "to propose",
      breakdown: "建议 (jiàn yì) - to propose",
    },
    {
      char: "建筑",
      pinyin: "jiàn zhù",
      meaning: "to construct",
      breakdown: "建筑 (jiàn zhù) - to construct",
    },
    {
      char: "键盘",
      pinyin: "jiàn pán",
      meaning: "keyboard",
      breakdown: "键盘 (jiàn pán) - keyboard",
    },
    {
      char: "讲究",
      pinyin: "jiǎng jiu",
      meaning: "to pay particular attention to",
      breakdown: "讲究 (jiǎng jiu) - to pay particular attention to",
    },
    {
      char: "讲座",
      pinyin: "jiǎng zuò",
      meaning: "a course of lectures",
      breakdown: "讲座 (jiǎng zuò) - a course of lectures",
    },
    {
      char: "降落",
      pinyin: "jiàng luò",
      meaning: "to descend",
      breakdown: "降落 (jiàng luò) - to descend",
    },
    {
      char: "酱油",
      pinyin: "jiàng yóu",
      meaning: "soy sauce",
      breakdown: "酱油 (jiàng yóu) - soy sauce",
    },
    {
      char: "浇",
      pinyin: "jiāo",
      meaning: "to pour liquid",
      breakdown: "浇 (jiāo) - to pour liquid",
    },
    {
      char: "交换",
      pinyin: "jiāo huàn",
      meaning: "to exchange",
      breakdown: "交换 (jiāo huàn) - to exchange",
    },
    {
      char: "交际",
      pinyin: "jiāo jì",
      meaning: "communication",
      breakdown: "交际 (jiāo jì) - communication",
    },
    {
      char: "郊区",
      pinyin: "jiāo qū",
      meaning: "suburban district",
      breakdown: "郊区 (jiāo qū) - suburban district",
    },
    {
      char: "胶水",
      pinyin: "jiāo shuǐ",
      meaning: "glue",
      breakdown: "胶水 (jiāo shuǐ) - glue",
    },
    {
      char: "角度",
      pinyin: "jiǎo dù",
      meaning: "angle",
      breakdown: "角度 (jiǎo dù) - angle",
    },
    {
      char: "狡猾",
      pinyin: "jiǎo huá",
      meaning: "crafty",
      breakdown: "狡猾 (jiǎo huá) - crafty",
    },
    {
      char: "教材",
      pinyin: "jiào cái",
      meaning: "teaching material",
      breakdown: "教材 (jiào cái) - teaching material",
    },
    {
      char: "教练",
      pinyin: "jiào liàn",
      meaning: "instructor",
      breakdown: "教练 (jiào liàn) - instructor",
    },
    {
      char: "教训",
      pinyin: "jiào xun",
      meaning: "lesson",
      breakdown: "教训 (jiào xun) - lesson",
    },
    {
      char: "接触",
      pinyin: "jiē chù",
      meaning: "to touch",
      breakdown: "接触 (jiē chù) - to touch",
    },
    {
      char: "接待",
      pinyin: "jiē dài",
      meaning: "to receive (a visitor)",
      breakdown: "接待 (jiē dài) - to receive (a visitor)",
    },
    {
      char: "接近",
      pinyin: "jiē jìn",
      meaning: "to approach",
      breakdown: "接近 (jiē jìn) - to approach",
    },
    {
      char: "接着",
      pinyin: "jiē zhe",
      meaning: "to catch and hold on",
      breakdown: "接着 (jiē zhe) - to catch and hold on",
    },
    {
      char: "阶段",
      pinyin: "jiē duàn",
      meaning: "stage",
      breakdown: "阶段 (jiē duàn) - stage",
    },
    {
      char: "结实",
      pinyin: "jiē shi",
      meaning: "rugged",
      breakdown: "结实 (jiē shi) - rugged",
    },
    {
      char: "节",
      pinyin: "jié",
      meaning: "festival",
      breakdown: "节 (jié) - festival",
    },
    {
      char: "节省",
      pinyin: "jié shěng",
      meaning: "saving",
      breakdown: "节省 (jié shěng) - saving",
    },
    {
      char: "结构",
      pinyin: "jié gòu",
      meaning: "structure",
      breakdown: "结构 (jié gòu) - structure",
    },
    {
      char: "结合",
      pinyin: "jié hé",
      meaning: "to combine",
      breakdown: "结合 (jié hé) - to combine",
    },
    {
      char: "结论",
      pinyin: "jié lùn",
      meaning: "conclusion",
      breakdown: "结论 (jié lùn) - conclusion",
    },
    {
      char: "结账",
      pinyin: "jié zhàng",
      meaning: "to pay the bill",
      breakdown: "结账 (jié zhàng) - to pay the bill",
    },
    {
      char: "解放",
      pinyin: "jiě fàng",
      meaning: "to liberate",
      breakdown: "解放 (jiě fàng) - to liberate",
    },
    {
      char: "解说员",
      pinyin: "jiě shuō yuán",
      meaning: "commentator",
      breakdown: "解说员 (jiě shuō yuán) - commentator",
    },
    {
      char: "届",
      pinyin: "jiè",
      meaning: "to arrive at (place or time)",
      breakdown: "届 (jiè) - to arrive at (place or time)",
    },
    {
      char: "借口",
      pinyin: "jiè kǒu",
      meaning: "to use as an excuse",
      breakdown: "借口 (jiè kǒu) - to use as an excuse",
    },
    {
      char: "戒烟",
      pinyin: "jiè yān",
      meaning: "to give up smoking",
      breakdown: "戒烟 (jiè yān) - to give up smoking",
    },
    {
      char: "戒指",
      pinyin: "jiè zhi",
      meaning: "(finger) ring",
      breakdown: "戒指 (jiè zhi) - (finger) ring",
    },
    {
      char: "金属",
      pinyin: "jīn shǔ",
      meaning: "metal",
      breakdown: "金属 (jīn shǔ) - metal",
    },
    {
      char: "紧",
      pinyin: "jǐn",
      meaning: "tight",
      breakdown: "紧 (jǐn) - tight",
    },
    {
      char: "紧急",
      pinyin: "jǐn jí",
      meaning: "urgent",
      breakdown: "紧急 (jǐn jí) - urgent",
    },
    {
      char: "尽量",
      pinyin: "jǐn liàng",
      meaning: "as much as possible",
      breakdown: "尽量 (jǐn liàng) - as much as possible",
    },
    {
      char: "谨慎",
      pinyin: "jǐn shèn",
      meaning: "cautious",
      breakdown: "谨慎 (jǐn shèn) - cautious",
    },
    {
      char: "进步",
      pinyin: "jìn bù",
      meaning: "progress",
      breakdown: "进步 (jìn bù) - progress",
    },
    {
      char: "进口",
      pinyin: "jìn kǒu",
      meaning: "to import",
      breakdown: "进口 (jìn kǒu) - to import",
    },
    {
      char: "近代",
      pinyin: "jìn dài",
      meaning: "modern times",
      breakdown: "近代 (jìn dài) - modern times",
    },
    {
      char: "尽力",
      pinyin: "jìn lì",
      meaning: "to strive one's hardest",
      breakdown: "尽力 (jìn lì) - to strive one's hardest",
    },
    {
      char: "精力",
      pinyin: "jīng lì",
      meaning: "energy",
      breakdown: "精力 (jīng lì) - energy",
    },
    {
      char: "经典",
      pinyin: "jīng diǎn",
      meaning: "the classics",
      breakdown: "经典 (jīng diǎn) - the classics",
    },
    {
      char: "经营",
      pinyin: "jīng yíng",
      meaning: "to engage in (business etc)",
      breakdown: "经营 (jīng yíng) - to engage in (business etc)",
    },
    {
      char: "景色",
      pinyin: "jǐng sè",
      meaning: "scenery",
      breakdown: "景色 (jǐng sè) - scenery",
    },
    {
      char: "敬爱",
      pinyin: "jìng ài",
      meaning: "respect and love",
      breakdown: "敬爱 (jìng ài) - respect and love",
    },
    {
      char: "酒吧",
      pinyin: "jiǔ bā",
      meaning: "bar",
      breakdown: "酒吧 (jiǔ bā) - bar",
    },
    {
      char: "救",
      pinyin: "jiù",
      meaning: "to save",
      breakdown: "救 (jiù) - to save",
    },
    {
      char: "救护车",
      pinyin: "jiù hù chē",
      meaning: "ambulance",
      breakdown: "救护车 (jiù hù chē) - ambulance",
    },
    {
      char: "舅舅",
      pinyin: "jiù jiu",
      meaning: "mother's brother",
      breakdown: "舅舅 (jiù jiu) - mother's brother",
    },
    {
      char: "居然",
      pinyin: "jū rán",
      meaning: "unexpectedly",
      breakdown: "居然 (jū rán) - unexpectedly",
    },
    {
      char: "桔子",
      pinyin: "jú zi",
      meaning: "tangerine",
      breakdown: "桔子 (jú zi) - tangerine",
    },
    {
      char: "举",
      pinyin: "jǔ",
      meaning: "to lift",
      breakdown: "举 (jǔ) - to lift",
    },
    {
      char: "具备",
      pinyin: "jù bèi",
      meaning: "to possess",
      breakdown: "具备 (jù bèi) - to possess",
    },
    {
      char: "具体",
      pinyin: "jù tǐ",
      meaning: "concrete",
      breakdown: "具体 (jù tǐ) - concrete",
    },
    {
      char: "巨大",
      pinyin: "jù dà",
      meaning: "huge",
      breakdown: "巨大 (jù dà) - huge",
    },
    {
      char: "聚会",
      pinyin: "jù huì",
      meaning: "party",
      breakdown: "聚会 (jù huì) - party",
    },
    {
      char: "俱乐部",
      pinyin: "jù lè bù",
      meaning: "club (i.e. a group or organization) (loanword)",
      breakdown:
        "俱乐部 (jù lè bù) - club (i.e. a group or organization) (loanword)",
    },
    {
      char: "据说",
      pinyin: "jù shuō",
      meaning: "it is said that",
      breakdown: "据说 (jù shuō) - it is said that",
    },
    {
      char: "捐",
      pinyin: "juān",
      meaning: "to contribute",
      breakdown: "捐 (juān) - to contribute",
    },
    {
      char: "卷",
      pinyin: "juǎn",
      meaning: "to roll (up)",
      breakdown: "卷 (juǎn) - to roll (up)",
    },
    {
      char: "决赛",
      pinyin: "jué sài",
      meaning: "finals (of a competition)",
      breakdown: "决赛 (jué sài) - finals (of a competition)",
    },
    {
      char: "决心",
      pinyin: "jué xīn",
      meaning: "determination",
      breakdown: "决心 (jué xīn) - determination",
    },
    {
      char: "绝对",
      pinyin: "jué duì",
      meaning: "absolute",
      breakdown: "绝对 (jué duì) - absolute",
    },
    {
      char: "角色",
      pinyin: "jué sè",
      meaning: "role",
      breakdown: "角色 (jué sè) - role",
    },
    {
      char: "军事",
      pinyin: "jūn shì",
      meaning: "military affairs",
      breakdown: "军事 (jūn shì) - military affairs",
    },
    {
      char: "均匀",
      pinyin: "jūn yún",
      meaning: "even",
      breakdown: "均匀 (jūn yún) - even",
    },
    {
      char: "卡车",
      pinyin: "kǎ chē",
      meaning: "truck",
      breakdown: "卡车 (kǎ chē) - truck",
    },
    {
      char: "开发",
      pinyin: "kāi fā",
      meaning: "to exploit (a resource)",
      breakdown: "开发 (kāi fā) - to exploit (a resource)",
    },
    {
      char: "开放",
      pinyin: "kāi fàng",
      meaning: "to bloom",
      breakdown: "开放 (kāi fàng) - to bloom",
    },
    {
      char: "开幕式",
      pinyin: "kāi mù shì",
      meaning: "opening ceremony",
      breakdown: "开幕式 (kāi mù shì) - opening ceremony",
    },
    {
      char: "开心",
      pinyin: "kāi xīn",
      meaning: "to feel happy",
      breakdown: "开心 (kāi xīn) - to feel happy",
    },
    {
      char: "砍",
      pinyin: "kǎn",
      meaning: "to chop",
      breakdown: "砍 (kǎn) - to chop",
    },
    {
      char: "看不起",
      pinyin: "kàn bu qǐ",
      meaning: "to look down upon",
      breakdown: "看不起 (kàn bu qǐ) - to look down upon",
    },
    {
      char: "看来",
      pinyin: "kàn lai",
      meaning: "apparently",
      breakdown: "看来 (kàn lai) - apparently",
    },
    {
      char: "抗议",
      pinyin: "kàng yì",
      meaning: "to protest",
      breakdown: "抗议 (kàng yì) - to protest",
    },
    {
      char: "烤鸭",
      pinyin: "kǎo yā",
      meaning: "roast duck",
      breakdown: "烤鸭 (kǎo yā) - roast duck",
    },
    {
      char: "颗",
      pinyin: "kē",
      meaning: "classifier for small spheres",
      breakdown: "颗 (kē) - classifier for small spheres",
    },
    {
      char: "可见",
      pinyin: "kě jiàn",
      meaning: "it can clearly be seen (that this is the case)",
      breakdown:
        "可见 (kě jiàn) - it can clearly be seen (that this is the case)",
    },
    {
      char: "可靠",
      pinyin: "kě kào",
      meaning: "reliable",
      breakdown: "可靠 (kě kào) - reliable",
    },
    {
      char: "可怕",
      pinyin: "kě pà",
      meaning: "awful",
      breakdown: "可怕 (kě pà) - awful",
    },
    {
      char: "刻苦",
      pinyin: "kè kǔ",
      meaning: "hardworking",
      breakdown: "刻苦 (kè kǔ) - hardworking",
    },
    {
      char: "课程",
      pinyin: "kè chéng",
      meaning: "course",
      breakdown: "课程 (kè chéng) - course",
    },
    {
      char: "克",
      pinyin: "kè",
      meaning: "variant of 克[kè]",
      breakdown: "克 (kè) - variant of 克[kè]",
    },
    {
      char: "克服",
      pinyin: "kè fú",
      meaning: "(try to) overcome (hardships etc)",
      breakdown: "克服 (kè fú) - (try to) overcome (hardships etc)",
    },
    {
      char: "客观",
      pinyin: "kè guān",
      meaning: "objective",
      breakdown: "客观 (kè guān) - objective",
    },
    {
      char: "客厅",
      pinyin: "kè tīng",
      meaning: "drawing room (room for arriving guests)",
      breakdown: "客厅 (kè tīng) - drawing room (room for arriving guests)",
    },
    {
      char: "空间",
      pinyin: "kōng jiān",
      meaning: "space",
      breakdown: "空间 (kōng jiān) - space",
    },
    {
      char: "恐怖",
      pinyin: "kǒng bù",
      meaning: "terrible",
      breakdown: "恐怖 (kǒng bù) - terrible",
    },
    {
      char: "空闲",
      pinyin: "kòng xián",
      meaning: "idle",
      breakdown: "空闲 (kòng xián) - idle",
    },
    {
      char: "控制",
      pinyin: "kòng zhì",
      meaning: "control",
      breakdown: "控制 (kòng zhì) - control",
    },
    {
      char: "口味",
      pinyin: "kǒu wèi",
      meaning: "a person's preferences",
      breakdown: "口味 (kǒu wèi) - a person's preferences",
    },
    {
      char: "夸",
      pinyin: "kuā",
      meaning: "to boast",
      breakdown: "夸 (kuā) - to boast",
    },
    {
      char: "会计",
      pinyin: "kuài jì",
      meaning: "accountant",
      breakdown: "会计 (kuài jì) - accountant",
    },
    {
      char: "矿泉水",
      pinyin: "kuàng quán shuǐ",
      meaning: "mineral spring water",
      breakdown: "矿泉水 (kuàng quán shuǐ) - mineral spring water",
    },
    {
      char: "辣椒",
      pinyin: "là jiāo",
      meaning: "hot pepper",
      breakdown: "辣椒 (là jiāo) - hot pepper",
    },
    {
      char: "蜡烛",
      pinyin: "là zhú",
      meaning: "candle",
      breakdown: "蜡烛 (là zhú) - candle",
    },
    {
      char: "来自",
      pinyin: "lái zì",
      meaning: "to come from (a place)",
      breakdown: "来自 (lái zì) - to come from (a place)",
    },
    {
      char: "拦",
      pinyin: "lán",
      meaning: "to cut off",
      breakdown: "拦 (lán) - to cut off",
    },
    {
      char: "烂",
      pinyin: "làn",
      meaning: "soft",
      breakdown: "烂 (làn) - soft",
    },
    {
      char: "狼",
      pinyin: "láng",
      meaning: "wolf",
      breakdown: "狼 (láng) - wolf",
    },
    {
      char: "劳动",
      pinyin: "láo dòng",
      meaning: "work",
      breakdown: "劳动 (láo dòng) - work",
    },
    {
      char: "劳驾",
      pinyin: "láo jià",
      meaning: "excuse me",
      breakdown: "劳驾 (láo jià) - excuse me",
    },
    {
      char: "老百姓",
      pinyin: "lǎo bǎi xìng",
      meaning: "ordinary people",
      breakdown: "老百姓 (lǎo bǎi xìng) - ordinary people",
    },
    {
      char: "老板",
      pinyin: "lǎo bǎn",
      meaning: "boss",
      breakdown: "老板 (lǎo bǎn) - boss",
    },
    {
      char: "老实",
      pinyin: "lǎo shí",
      meaning: "honest",
      breakdown: "老实 (lǎo shí) - honest",
    },
    {
      char: "老鼠",
      pinyin: "lǎo shǔ",
      meaning: "rat",
      breakdown: "老鼠 (lǎo shǔ) - rat",
    },
    {
      char: "姥姥",
      pinyin: "lǎo lao",
      meaning: "(informal) mother's mother",
      breakdown: "姥姥 (lǎo lao) - (informal) mother's mother",
    },
    {
      char: "乐观",
      pinyin: "lè guān",
      meaning: "optimistic",
      breakdown: "乐观 (lè guān) - optimistic",
    },
    {
      char: "雷",
      pinyin: "léi",
      meaning: "thunder",
      breakdown: "雷 (léi) - thunder",
    },
    {
      char: "类",
      pinyin: "lèi",
      meaning: "kind",
      breakdown: "类 (lèi) - kind",
    },
    { char: "梨", pinyin: "lí", meaning: "pear", breakdown: "梨 (lí) - pear" },
    {
      char: "离婚",
      pinyin: "lí hūn",
      meaning: "to divorce",
      breakdown: "离婚 (lí hūn) - to divorce",
    },
    {
      char: "厘米",
      pinyin: "lí mǐ",
      meaning: "centimeter",
      breakdown: "厘米 (lí mǐ) - centimeter",
    },
    {
      char: "礼拜天",
      pinyin: "lǐ bài tiān",
      meaning: "Sunday",
      breakdown: "礼拜天 (lǐ bài tiān) - Sunday",
    },
    {
      char: "理论",
      pinyin: "lǐ lùn",
      meaning: "theory",
      breakdown: "理论 (lǐ lùn) - theory",
    },
    {
      char: "理由",
      pinyin: "lǐ yóu",
      meaning: "reason",
      breakdown: "理由 (lǐ yóu) - reason",
    },
    {
      char: "粒",
      pinyin: "lì",
      meaning: "grain",
      breakdown: "粒 (lì) - grain",
    },
    {
      char: "立方",
      pinyin: "lì fāng",
      meaning: "cube",
      breakdown: "立方 (lì fāng) - cube",
    },
    {
      char: "立即",
      pinyin: "lì jí",
      meaning: "immediately",
      breakdown: "立即 (lì jí) - immediately",
    },
    {
      char: "立刻",
      pinyin: "lì kè",
      meaning: "forthwith",
      breakdown: "立刻 (lì kè) - forthwith",
    },
    {
      char: "力量",
      pinyin: "lì liang",
      meaning: "power",
      breakdown: "力量 (lì liang) - power",
    },
    {
      char: "利润",
      pinyin: "lì rùn",
      meaning: "profits",
      breakdown: "利润 (lì rùn) - profits",
    },
    {
      char: "利息",
      pinyin: "lì xī",
      meaning: "interest (on a loan)",
      breakdown: "利息 (lì xī) - interest (on a loan)",
    },
    {
      char: "利益",
      pinyin: "lì yì",
      meaning: "benefit",
      breakdown: "利益 (lì yì) - benefit",
    },
    {
      char: "利用",
      pinyin: "lì yòng",
      meaning: "exploit",
      breakdown: "利用 (lì yòng) - exploit",
    },
    {
      char: "连忙",
      pinyin: "lián máng",
      meaning: "promptly",
      breakdown: "连忙 (lián máng) - promptly",
    },
    {
      char: "连续剧",
      pinyin: "lián xù jù",
      meaning: "serialized drama",
      breakdown: "连续剧 (lián xù jù) - serialized drama",
    },
    {
      char: "联合",
      pinyin: "lián hé",
      meaning: "to combine",
      breakdown: "联合 (lián hé) - to combine",
    },
    {
      char: "恋爱",
      pinyin: "liàn ài",
      meaning: "(romantic) love",
      breakdown: "恋爱 (liàn ài) - (romantic) love",
    },
    {
      char: "良好",
      pinyin: "liáng hǎo",
      meaning: "good",
      breakdown: "良好 (liáng hǎo) - good",
    },
    {
      char: "粮食",
      pinyin: "liáng shi",
      meaning: "foodstuff",
      breakdown: "粮食 (liáng shi) - foodstuff",
    },
    {
      char: "了不起",
      pinyin: "liǎo bu qǐ",
      meaning: "amazing",
      breakdown: "了不起 (liǎo bu qǐ) - amazing",
    },
    {
      char: "临时",
      pinyin: "lín shí",
      meaning: "at the instant sth happens",
      breakdown: "临时 (lín shí) - at the instant sth happens",
    },
    {
      char: "铃",
      pinyin: "líng",
      meaning: "(small) bell",
      breakdown: "铃 (líng) - (small) bell",
    },
    {
      char: "零件",
      pinyin: "líng jiàn",
      meaning: "part",
      breakdown: "零件 (líng jiàn) - part",
    },
    {
      char: "零钱",
      pinyin: "líng qián",
      meaning: "change (of money)",
      breakdown: "零钱 (líng qián) - change (of money)",
    },
    {
      char: "零食",
      pinyin: "líng shí",
      meaning: "between-meal nibbles",
      breakdown: "零食 (líng shí) - between-meal nibbles",
    },
    {
      char: "灵活",
      pinyin: "líng huó",
      meaning: "flexible",
      breakdown: "灵活 (líng huó) - flexible",
    },
    {
      char: "领导",
      pinyin: "lǐng dǎo",
      meaning: "lead",
      breakdown: "领导 (lǐng dǎo) - lead",
    },
    {
      char: "领域",
      pinyin: "lǐng yù",
      meaning: "domain",
      breakdown: "领域 (lǐng yù) - domain",
    },
    {
      char: "流传",
      pinyin: "liú chuán",
      meaning: "to spread",
      breakdown: "流传 (liú chuán) - to spread",
    },
    {
      char: "浏览",
      pinyin: "liú lǎn",
      meaning: "to skim over",
      breakdown: "浏览 (liú lǎn) - to skim over",
    },
    {
      char: "龙",
      pinyin: "lóng",
      meaning: "dragon",
      breakdown: "龙 (lóng) - dragon",
    },
    {
      char: "漏",
      pinyin: "lòu",
      meaning: "to leak",
      breakdown: "漏 (lòu) - to leak",
    },
    { char: "露", pinyin: "lù", meaning: "dew", breakdown: "露 (lù) - dew" },
    {
      char: "陆地",
      pinyin: "lù dì",
      meaning: "dry land (as opposed to the sea)",
      breakdown: "陆地 (lù dì) - dry land (as opposed to the sea)",
    },
    {
      char: "陆续",
      pinyin: "lù xù",
      meaning: "in turn",
      breakdown: "陆续 (lù xù) - in turn",
    },
    {
      char: "录取",
      pinyin: "lù qǔ",
      meaning: "to recruit",
      breakdown: "录取 (lù qǔ) - to recruit",
    },
    {
      char: "录音",
      pinyin: "lù yīn",
      meaning: "to record (sound)",
      breakdown: "录音 (lù yīn) - to record (sound)",
    },
    {
      char: "轮流",
      pinyin: "lún liú",
      meaning: "to alternate",
      breakdown: "轮流 (lún liú) - to alternate",
    },
    {
      char: "论文",
      pinyin: "lùn wén",
      meaning: "paper",
      breakdown: "论文 (lùn wén) - paper",
    },
    {
      char: "逻辑",
      pinyin: "luó ji",
      meaning: "logic (loanword)",
      breakdown: "逻辑 (luó ji) - logic (loanword)",
    },
    {
      char: "落后",
      pinyin: "luò hòu",
      meaning: "to fall behind",
      breakdown: "落后 (luò hòu) - to fall behind",
    },
    {
      char: "骂",
      pinyin: "mà",
      meaning: "to scold",
      breakdown: "骂 (mà) - to scold",
    },
    {
      char: "麦克风",
      pinyin: "mài kè fēng",
      meaning: "microphone (loanword)",
      breakdown: "麦克风 (mài kè fēng) - microphone (loanword)",
    },
    {
      char: "馒头",
      pinyin: "mán tou",
      meaning: "steamed roll",
      breakdown: "馒头 (mán tou) - steamed roll",
    },
    {
      char: "满足",
      pinyin: "mǎn zú",
      meaning: "to satisfy",
      breakdown: "满足 (mǎn zú) - to satisfy",
    },
    {
      char: "毛",
      pinyin: "máo",
      meaning: "hair",
      breakdown: "毛 (máo) - hair",
    },
    {
      char: "毛病",
      pinyin: "máo bìng",
      meaning: "fault",
      breakdown: "毛病 (máo bìng) - fault",
    },
    {
      char: "矛盾",
      pinyin: "máo dùn",
      meaning: "contradictory",
      breakdown: "矛盾 (máo dùn) - contradictory",
    },
    {
      char: "冒险",
      pinyin: "mào xiǎn",
      meaning: "to take risks",
      breakdown: "冒险 (mào xiǎn) - to take risks",
    },
    {
      char: "贸易",
      pinyin: "mào yì",
      meaning: "(commercial) trade",
      breakdown: "贸易 (mào yì) - (commercial) trade",
    },
    {
      char: "眉毛",
      pinyin: "méi mao",
      meaning: "eyebrow",
      breakdown: "眉毛 (méi mao) - eyebrow",
    },
    {
      char: "煤炭",
      pinyin: "méi tàn",
      meaning: "coal",
      breakdown: "煤炭 (méi tàn) - coal",
    },
    {
      char: "美术",
      pinyin: "měi shù",
      meaning: "art",
      breakdown: "美术 (měi shù) - art",
    },
    {
      char: "魅力",
      pinyin: "mèi lì",
      meaning: "charm",
      breakdown: "魅力 (mèi lì) - charm",
    },
    {
      char: "迷路",
      pinyin: "mí lù",
      meaning: "to lose the way",
      breakdown: "迷路 (mí lù) - to lose the way",
    },
    {
      char: "谜语",
      pinyin: "mí yǔ",
      meaning: "riddle",
      breakdown: "谜语 (mí yǔ) - riddle",
    },
    {
      char: "密切",
      pinyin: "mì qiè",
      meaning: "close",
      breakdown: "密切 (mì qiè) - close",
    },
    {
      char: "蜜蜂",
      pinyin: "mì fēng",
      meaning: "bee",
      breakdown: "蜜蜂 (mì fēng) - bee",
    },
    {
      char: "秘密",
      pinyin: "mì mì",
      meaning: "secret",
      breakdown: "秘密 (mì mì) - secret",
    },
    {
      char: "秘书",
      pinyin: "mì shū",
      meaning: "secretary",
      breakdown: "秘书 (mì shū) - secretary",
    },
    {
      char: "棉花",
      pinyin: "mián hua",
      meaning: "cotton",
      breakdown: "棉花 (mián hua) - cotton",
    },
    {
      char: "面对",
      pinyin: "miàn duì",
      meaning: "to confront",
      breakdown: "面对 (miàn duì) - to confront",
    },
    {
      char: "面积",
      pinyin: "miàn ji",
      meaning: "area (of a floor)",
      breakdown: "面积 (miàn ji) - area (of a floor)",
    },
    {
      char: "面临",
      pinyin: "miàn lín",
      meaning: "to face sth",
      breakdown: "面临 (miàn lín) - to face sth",
    },
    {
      char: "描写",
      pinyin: "miáo xiě",
      meaning: "to describe",
      breakdown: "描写 (miáo xiě) - to describe",
    },
    {
      char: "苗条",
      pinyin: "miáo tiáo",
      meaning: "slim",
      breakdown: "苗条 (miáo tiáo) - slim",
    },
    {
      char: "秒",
      pinyin: "miǎo",
      meaning: "second (of time)",
      breakdown: "秒 (miǎo) - second (of time)",
    },
    {
      char: "民主",
      pinyin: "mín zhǔ",
      meaning: "democracy",
      breakdown: "民主 (mín zhǔ) - democracy",
    },
    {
      char: "明确",
      pinyin: "míng què",
      meaning: "clear-cut",
      breakdown: "明确 (míng què) - clear-cut",
    },
    {
      char: "明显",
      pinyin: "míng xiǎn",
      meaning: "clear",
      breakdown: "明显 (míng xiǎn) - clear",
    },
    {
      char: "明信片",
      pinyin: "míng xìn piàn",
      meaning: "postcard",
      breakdown: "明信片 (míng xìn piàn) - postcard",
    },
    {
      char: "明星",
      pinyin: "míng xīng",
      meaning: "star",
      breakdown: "明星 (míng xīng) - star",
    },
    {
      char: "名牌",
      pinyin: "míng pái",
      meaning: "famous brand",
      breakdown: "名牌 (míng pái) - famous brand",
    },
    {
      char: "名片",
      pinyin: "míng piàn",
      meaning: "(business) card",
      breakdown: "名片 (míng piàn) - (business) card",
    },
    {
      char: "名胜",
      pinyin: "míng shèng",
      meaning: "a place famous for its scenery or historical relics",
      breakdown:
        "名胜 (míng shèng) - a place famous for its scenery or historical relics",
    },
    {
      char: "命令",
      pinyin: "mìng lìng",
      meaning: "order",
      breakdown: "命令 (mìng lìng) - order",
    },
    {
      char: "命运",
      pinyin: "mìng yùn",
      meaning: "fate",
      breakdown: "命运 (mìng yùn) - fate",
    },
    {
      char: "摸",
      pinyin: "mō",
      meaning: "to feel with the hand",
      breakdown: "摸 (mō) - to feel with the hand",
    },
    {
      char: "摩托车",
      pinyin: "mó tuō chē",
      meaning: "motorbike",
      breakdown: "摩托车 (mó tuō chē) - motorbike",
    },
    {
      char: "模仿",
      pinyin: "mó fǎng",
      meaning: "to imitate",
      breakdown: "模仿 (mó fǎng) - to imitate",
    },
    {
      char: "模糊",
      pinyin: "mó hu",
      meaning: "vague",
      breakdown: "模糊 (mó hu) - vague",
    },
    {
      char: "陌生",
      pinyin: "mò shēng",
      meaning: "strange",
      breakdown: "陌生 (mò shēng) - strange",
    },
    {
      char: "某",
      pinyin: "mǒu",
      meaning: "some",
      breakdown: "某 (mǒu) - some",
    },
    {
      char: "目标",
      pinyin: "mù biāo",
      meaning: "target",
      breakdown: "目标 (mù biāo) - target",
    },
    {
      char: "目录",
      pinyin: "mù lù",
      meaning: "catalog",
      breakdown: "目录 (mù lù) - catalog",
    },
    {
      char: "目前",
      pinyin: "mù qián",
      meaning: "at the present time",
      breakdown: "目前 (mù qián) - at the present time",
    },
    {
      char: "木头",
      pinyin: "mù tou",
      meaning: "slow-witted",
      breakdown: "木头 (mù tou) - slow-witted",
    },
    {
      char: "哪怕",
      pinyin: "nǎ pà",
      meaning: "even",
      breakdown: "哪怕 (nǎ pà) - even",
    },
    {
      char: "难怪",
      pinyin: "nán guài",
      meaning: "(it's) no wonder (that...)",
      breakdown: "难怪 (nán guài) - (it's) no wonder (that...)",
    },
    {
      char: "难看",
      pinyin: "nán kàn",
      meaning: "ugly",
      breakdown: "难看 (nán kàn) - ugly",
    },
    {
      char: "脑袋",
      pinyin: "nǎo dài",
      meaning: "head",
      breakdown: "脑袋 (nǎo dài) - head",
    },
    {
      char: "内科",
      pinyin: "nèi kē",
      meaning: "internal medicine",
      breakdown: "内科 (nèi kē) - internal medicine",
    },
    {
      char: "嫩",
      pinyin: "nèn",
      meaning: "tender",
      breakdown: "嫩 (nèn) - tender",
    },
    {
      char: "能干",
      pinyin: "néng gàn",
      meaning: "capable",
      breakdown: "能干 (néng gàn) - capable",
    },
    {
      char: "能源",
      pinyin: "néng yuán",
      meaning: "energy",
      breakdown: "能源 (néng yuán) - energy",
    },
    {
      char: "年代",
      pinyin: "nián dài",
      meaning: "a decade of a century (e.g. the Sixties)",
      breakdown: "年代 (nián dài) - a decade of a century (e.g. the Sixties)",
    },
    {
      char: "年纪",
      pinyin: "nián jì",
      meaning: "age",
      breakdown: "年纪 (nián jì) - age",
    },
    {
      char: "念",
      pinyin: "niàn",
      meaning: "to read",
      breakdown: "念 (niàn) - to read",
    },
    {
      char: "宁可",
      pinyin: "nìng kě",
      meaning: "preferably",
      breakdown: "宁可 (nìng kě) - preferably",
    },
    {
      char: "牛仔裤",
      pinyin: "niú zǎi kù",
      meaning: "jeans",
      breakdown: "牛仔裤 (niú zǎi kù) - jeans",
    },
    {
      char: "浓",
      pinyin: "nóng",
      meaning: "concentrated",
      breakdown: "浓 (nóng) - concentrated",
    },
    {
      char: "农民",
      pinyin: "nóng mín",
      meaning: "peasant",
      breakdown: "农民 (nóng mín) - peasant",
    },
    {
      char: "农业",
      pinyin: "nóng yè",
      meaning: "agriculture",
      breakdown: "农业 (nóng yè) - agriculture",
    },
    {
      char: "女士",
      pinyin: "nǚ shì",
      meaning: "lady",
      breakdown: "女士 (nǚ shì) - lady",
    },
    {
      char: "偶然",
      pinyin: "ǒu rán",
      meaning: "incidentally",
      breakdown: "偶然 (ǒu rán) - incidentally",
    },
    {
      char: "拍",
      pinyin: "pāi",
      meaning: "to pat",
      breakdown: "拍 (pāi) - to pat",
    },
    {
      char: "排队",
      pinyin: "pái duì",
      meaning: "to line up",
      breakdown: "排队 (pái duì) - to line up",
    },
    {
      char: "排球",
      pinyin: "pái qiú",
      meaning: "volleyball",
      breakdown: "排球 (pái qiú) - volleyball",
    },
    {
      char: "派",
      pinyin: "pài",
      meaning: "clique",
      breakdown: "派 (pài) - clique",
    },
    {
      char: "盼望",
      pinyin: "pàn wàng",
      meaning: "to hope for",
      breakdown: "盼望 (pàn wàng) - to hope for",
    },
    {
      char: "赔偿",
      pinyin: "péi cháng",
      meaning: "to compensate",
      breakdown: "赔偿 (péi cháng) - to compensate",
    },
    {
      char: "培养",
      pinyin: "péi yǎng",
      meaning: "to cultivate",
      breakdown: "培养 (péi yǎng) - to cultivate",
    },
    {
      char: "配合",
      pinyin: "pèi hé",
      meaning: "matching",
      breakdown: "配合 (pèi hé) - matching",
    },
    {
      char: "佩服",
      pinyin: "pèi fú",
      meaning: "to admire",
      breakdown: "佩服 (pèi fú) - to admire",
    },
    {
      char: "盆",
      pinyin: "pén",
      meaning: "basin",
      breakdown: "盆 (pén) - basin",
    },
    {
      char: "碰见",
      pinyin: "pèng jiàn",
      meaning: "to run into",
      breakdown: "碰见 (pèng jiàn) - to run into",
    },
    {
      char: "披",
      pinyin: "pī",
      meaning: "to drape over one's shoulders",
      breakdown: "披 (pī) - to drape over one's shoulders",
    },
    {
      char: "批",
      pinyin: "pī",
      meaning: "to ascertain",
      breakdown: "批 (pī) - to ascertain",
    },
    {
      char: "批准",
      pinyin: "pī zhǔn",
      meaning: "to approve",
      breakdown: "批准 (pī zhǔn) - to approve",
    },
    {
      char: "疲劳",
      pinyin: "pí láo",
      meaning: "fatigue",
      breakdown: "疲劳 (pí láo) - fatigue",
    },
    {
      char: "皮鞋",
      pinyin: "pí xié",
      meaning: "leather shoes",
      breakdown: "皮鞋 (pí xié) - leather shoes",
    },
    {
      char: "匹",
      pinyin: "pǐ",
      meaning: "classifier for horses",
      breakdown: "匹 (pǐ) - classifier for horses",
    },
    {
      char: "片",
      pinyin: "piàn",
      meaning: "thin piece",
      breakdown: "片 (piàn) - thin piece",
    },
    {
      char: "片面",
      pinyin: "piàn miàn",
      meaning: "unilateral",
      breakdown: "片面 (piàn miàn) - unilateral",
    },
    {
      char: "飘",
      pinyin: "piāo",
      meaning: "to float",
      breakdown: "飘 (piāo) - to float",
    },
    {
      char: "频道",
      pinyin: "pín dào",
      meaning: "frequency",
      breakdown: "频道 (pín dào) - frequency",
    },
    {
      char: "品种",
      pinyin: "pǐn zhǒng",
      meaning: "breed",
      breakdown: "品种 (pǐn zhǒng) - breed",
    },
    {
      char: "凭",
      pinyin: "píng",
      meaning: "to lean against",
      breakdown: "凭 (píng) - to lean against",
    },
    {
      char: "平",
      pinyin: "píng",
      meaning: "flat",
      breakdown: "平 (píng) - flat",
    },
    {
      char: "平常",
      pinyin: "píng cháng",
      meaning: "ordinary",
      breakdown: "平常 (píng cháng) - ordinary",
    },
    {
      char: "平等",
      pinyin: "píng děng",
      meaning: "equal",
      breakdown: "平等 (píng děng) - equal",
    },
    {
      char: "平方",
      pinyin: "píng fāng",
      meaning: "square (as in square foot)",
      breakdown: "平方 (píng fāng) - square (as in square foot)",
    },
    {
      char: "平衡",
      pinyin: "píng héng",
      meaning: "balance",
      breakdown: "平衡 (píng héng) - balance",
    },
    {
      char: "平静",
      pinyin: "píng jìng",
      meaning: "tranquil",
      breakdown: "平静 (píng jìng) - tranquil",
    },
    {
      char: "平均",
      pinyin: "píng jūn",
      meaning: "average",
      breakdown: "平均 (píng jūn) - average",
    },
    {
      char: "评价",
      pinyin: "píng jià",
      meaning: "to evaluate",
      breakdown: "评价 (píng jià) - to evaluate",
    },
    {
      char: "破产",
      pinyin: "pò chǎn",
      meaning: "to go bankrupt",
      breakdown: "破产 (pò chǎn) - to go bankrupt",
    },
    {
      char: "破坏",
      pinyin: "pò huài",
      meaning: "destruction",
      breakdown: "破坏 (pò huài) - destruction",
    },
    {
      char: "迫切",
      pinyin: "pò qiè",
      meaning: "urgent",
      breakdown: "迫切 (pò qiè) - urgent",
    },
    {
      char: "朴素",
      pinyin: "pǔ sù",
      meaning: "plain and simple",
      breakdown: "朴素 (pǔ sù) - plain and simple",
    },
    {
      char: "期待",
      pinyin: "qī dài",
      meaning: "to look forward to",
      breakdown: "期待 (qī dài) - to look forward to",
    },
    {
      char: "期间",
      pinyin: "qī jiān",
      meaning: "period of time",
      breakdown: "期间 (qī jiān) - period of time",
    },
    {
      char: "其余",
      pinyin: "qí yú",
      meaning: "the rest",
      breakdown: "其余 (qí yú) - the rest",
    },
    {
      char: "奇迹",
      pinyin: "qí jì",
      meaning: "miracle",
      breakdown: "奇迹 (qí jì) - miracle",
    },
    {
      char: "启发",
      pinyin: "qǐ fā",
      meaning: "to enlighten",
      breakdown: "启发 (qǐ fā) - to enlighten",
    },
    {
      char: "企图",
      pinyin: "qǐ tú",
      meaning: "to attempt",
      breakdown: "企图 (qǐ tú) - to attempt",
    },
    {
      char: "企业",
      pinyin: "qǐ yè",
      meaning: "company",
      breakdown: "企业 (qǐ yè) - company",
    },
    {
      char: "气氛",
      pinyin: "qì fēn",
      meaning: "atmosphere",
      breakdown: "气氛 (qì fēn) - atmosphere",
    },
    {
      char: "汽油",
      pinyin: "qì yóu",
      meaning: "gasoline",
      breakdown: "汽油 (qì yóu) - gasoline",
    },
    {
      char: "牵",
      pinyin: "qiān",
      meaning: "to pull (an animal on a tether)",
      breakdown: "牵 (qiān) - to pull (an animal on a tether)",
    },
    {
      char: "签字",
      pinyin: "qiān zì",
      meaning: "to sign (a signature)",
      breakdown: "签字 (qiān zì) - to sign (a signature)",
    },
    {
      char: "谦虚",
      pinyin: "qiān xū",
      meaning: "modest",
      breakdown: "谦虚 (qiān xū) - modest",
    },
    {
      char: "前途",
      pinyin: "qián tú",
      meaning: "prospects",
      breakdown: "前途 (qián tú) - prospects",
    },
    {
      char: "浅",
      pinyin: "qiǎn",
      meaning: "shallow",
      breakdown: "浅 (qiǎn) - shallow",
    },
    {
      char: "欠",
      pinyin: "qiàn",
      meaning: "deficient",
      breakdown: "欠 (qiàn) - deficient",
    },
    {
      char: "枪",
      pinyin: "qiāng",
      meaning: "gun",
      breakdown: "枪 (qiāng) - gun",
    },
    {
      char: "强调",
      pinyin: "qiáng diào",
      meaning: "to emphasize (a statement)",
      breakdown: "强调 (qiáng diào) - to emphasize (a statement)",
    },
    {
      char: "强烈",
      pinyin: "qiáng liè",
      meaning: "intense",
      breakdown: "强烈 (qiáng liè) - intense",
    },
    {
      char: "抢",
      pinyin: "qiǎng",
      meaning: "to fight over",
      breakdown: "抢 (qiǎng) - to fight over",
    },
    {
      char: "悄悄",
      pinyin: "qiāo qiāo",
      meaning: "quietly",
      breakdown: "悄悄 (qiāo qiāo) - quietly",
    },
    {
      char: "瞧",
      pinyin: "qiáo",
      meaning: "to look at",
      breakdown: "瞧 (qiáo) - to look at",
    },
    {
      char: "巧妙",
      pinyin: "qiǎo miào",
      meaning: "ingenious",
      breakdown: "巧妙 (qiǎo miào) - ingenious",
    },
    {
      char: "切",
      pinyin: "qiē",
      meaning: "to cut",
      breakdown: "切 (qiē) - to cut",
    },
    {
      char: "亲爱",
      pinyin: "qīn ài",
      meaning: "dear",
      breakdown: "亲爱 (qīn ài) - dear",
    },
    {
      char: "亲切",
      pinyin: "qīn qiè",
      meaning: "amiable",
      breakdown: "亲切 (qīn qiè) - amiable",
    },
    {
      char: "亲自",
      pinyin: "qīn zì",
      meaning: "personally",
      breakdown: "亲自 (qīn zì) - personally",
    },
    {
      char: "侵略",
      pinyin: "qīn lvè",
      meaning: "invasion",
      breakdown: "侵略 (qīn lvè) - invasion",
    },
    {
      char: "勤奋",
      pinyin: "qín fèn",
      meaning: "hardworking",
      breakdown: "勤奋 (qín fèn) - hardworking",
    },
    {
      char: "勤劳",
      pinyin: "qín láo",
      meaning: "hardworking",
      breakdown: "勤劳 (qín láo) - hardworking",
    },
    {
      char: "青",
      pinyin: "qīng",
      meaning: "nature's color",
      breakdown: "青 (qīng) - nature's color",
    },
    {
      char: "青春",
      pinyin: "qīng chūn",
      meaning: "youth",
      breakdown: "青春 (qīng chūn) - youth",
    },
    {
      char: "青少年",
      pinyin: "qīng shào nián",
      meaning: "adolescent",
      breakdown: "青少年 (qīng shào nián) - adolescent",
    },
    {
      char: "轻视",
      pinyin: "qīng shì",
      meaning: "contempt",
      breakdown: "轻视 (qīng shì) - contempt",
    },
    {
      char: "清淡",
      pinyin: "qīng dàn",
      meaning: "light (of food)",
      breakdown: "清淡 (qīng dàn) - light (of food)",
    },
    {
      char: "情景",
      pinyin: "qíng jǐng",
      meaning: "scene",
      breakdown: "情景 (qíng jǐng) - scene",
    },
    {
      char: "情绪",
      pinyin: "qíng xù",
      meaning: "mood",
      breakdown: "情绪 (qíng xù) - mood",
    },
    {
      char: "请求",
      pinyin: "qǐng qiú",
      meaning: "request",
      breakdown: "请求 (qǐng qiú) - request",
    },
    {
      char: "庆祝",
      pinyin: "qìng zhù",
      meaning: "to celebrate",
      breakdown: "庆祝 (qìng zhù) - to celebrate",
    },
    {
      char: "球迷",
      pinyin: "qiú mí",
      meaning: "soccer fan",
      breakdown: "球迷 (qiú mí) - soccer fan",
    },
    {
      char: "趋势",
      pinyin: "qū shì",
      meaning: "trend",
      breakdown: "趋势 (qū shì) - trend",
    },
    {
      char: "娶",
      pinyin: "qǔ",
      meaning: "to take a wife",
      breakdown: "娶 (qǔ) - to take a wife",
    },
    {
      char: "取消",
      pinyin: "qǔ xiāo",
      meaning: "to cancel",
      breakdown: "取消 (qǔ xiāo) - to cancel",
    },
    {
      char: "去世",
      pinyin: "qù shì",
      meaning: "to pass away",
      breakdown: "去世 (qù shì) - to pass away",
    },
    {
      char: "圈",
      pinyin: "quān",
      meaning: "circle",
      breakdown: "圈 (quān) - circle",
    },
    {
      char: "全面",
      pinyin: "quán miàn",
      meaning: "all-around",
      breakdown: "全面 (quán miàn) - all-around",
    },
    {
      char: "权力",
      pinyin: "quán lì",
      meaning: "power",
      breakdown: "权力 (quán lì) - power",
    },
    {
      char: "权利",
      pinyin: "quán lì",
      meaning: "power",
      breakdown: "权利 (quán lì) - power",
    },
    {
      char: "劝",
      pinyin: "quàn",
      meaning: "to advise",
      breakdown: "劝 (quàn) - to advise",
    },
    {
      char: "缺乏",
      pinyin: "quē fá",
      meaning: "shortage",
      breakdown: "缺乏 (quē fá) - shortage",
    },
    {
      char: "确定",
      pinyin: "què dìng",
      meaning: "definite",
      breakdown: "确定 (què dìng) - definite",
    },
    {
      char: "确认",
      pinyin: "què rèn",
      meaning: "to confirm",
      breakdown: "确认 (què rèn) - to confirm",
    },
    {
      char: "燃烧",
      pinyin: "rán shāo",
      meaning: "to ignite",
      breakdown: "燃烧 (rán shāo) - to ignite",
    },
    {
      char: "嚷",
      pinyin: "rǎng",
      meaning: "blurt out",
      breakdown: "嚷 (rǎng) - blurt out",
    },
    {
      char: "绕",
      pinyin: "rào",
      meaning: "to wind",
      breakdown: "绕 (rào) - to wind",
    },
    {
      char: "热爱",
      pinyin: "rè ài",
      meaning: "to love ardently",
      breakdown: "热爱 (rè ài) - to love ardently",
    },
    {
      char: "热烈",
      pinyin: "rè liè",
      meaning: "warm (welcome etc)",
      breakdown: "热烈 (rè liè) - warm (welcome etc)",
    },
    {
      char: "热心",
      pinyin: "rè xīn",
      meaning: "enthusiasm",
      breakdown: "热心 (rè xīn) - enthusiasm",
    },
    {
      char: "人才",
      pinyin: "rén cái",
      meaning: "a person's talent",
      breakdown: "人才 (rén cái) - a person's talent",
    },
    {
      char: "人口",
      pinyin: "rén kǒu",
      meaning: "population",
      breakdown: "人口 (rén kǒu) - population",
    },
    {
      char: "人类",
      pinyin: "rén lèi",
      meaning: "humanity",
      breakdown: "人类 (rén lèi) - humanity",
    },
    {
      char: "人生",
      pinyin: "rén shēng",
      meaning: "life (one's time on earth)",
      breakdown: "人生 (rén shēng) - life (one's time on earth)",
    },
    {
      char: "人事",
      pinyin: "rén shì",
      meaning: "human affairs",
      breakdown: "人事 (rén shì) - human affairs",
    },
    {
      char: "人物",
      pinyin: "rén wù",
      meaning: "person",
      breakdown: "人物 (rén wù) - person",
    },
    {
      char: "人员",
      pinyin: "rén yuán",
      meaning: "staff",
      breakdown: "人员 (rén yuán) - staff",
    },
    {
      char: "忍不住",
      pinyin: "rěn bu zhù",
      meaning: "cannot help",
      breakdown: "忍不住 (rěn bu zhù) - cannot help",
    },
    {
      char: "日常",
      pinyin: "rì cháng",
      meaning: "daily",
      breakdown: "日常 (rì cháng) - daily",
    },
    {
      char: "日程",
      pinyin: "rì chéng",
      meaning: "schedule",
      breakdown: "日程 (rì chéng) - schedule",
    },
    {
      char: "日历",
      pinyin: "rì lì",
      meaning: "calendar",
      breakdown: "日历 (rì lì) - calendar",
    },
    {
      char: "日期",
      pinyin: "rì qī",
      meaning: "date",
      breakdown: "日期 (rì qī) - date",
    },
    {
      char: "日用品",
      pinyin: "rì yòng pǐn",
      meaning: "articles for daily use",
      breakdown: "日用品 (rì yòng pǐn) - articles for daily use",
    },
    {
      char: "融化",
      pinyin: "róng huà",
      meaning: "to melt",
      breakdown: "融化 (róng huà) - to melt",
    },
    {
      char: "荣幸",
      pinyin: "róng xìng",
      meaning: "honored",
      breakdown: "荣幸 (róng xìng) - honored",
    },
    {
      char: "荣誉",
      pinyin: "róng yù",
      meaning: "honor",
      breakdown: "荣誉 (róng yù) - honor",
    },
    {
      char: "如何",
      pinyin: "rú hé",
      meaning: "how",
      breakdown: "如何 (rú hé) - how",
    },
    {
      char: "如今",
      pinyin: "rú jīn",
      meaning: "nowadays",
      breakdown: "如今 (rú jīn) - nowadays",
    },
    {
      char: "软件",
      pinyin: "ruǎn jiàn",
      meaning: "(computer) software",
      breakdown: "软件 (ruǎn jiàn) - (computer) software",
    },
    {
      char: "弱",
      pinyin: "ruò",
      meaning: "weak",
      breakdown: "弱 (ruò) - weak",
    },
    {
      char: "洒",
      pinyin: "sǎ",
      meaning: "to sprinkle",
      breakdown: "洒 (sǎ) - to sprinkle",
    },
    {
      char: "嗓子",
      pinyin: "sǎng zi",
      meaning: "throat",
      breakdown: "嗓子 (sǎng zi) - throat",
    },
    {
      char: "杀",
      pinyin: "shā",
      meaning: "to kill",
      breakdown: "杀 (shā) - to kill",
    },
    {
      char: "沙漠",
      pinyin: "shā mò",
      meaning: "desert",
      breakdown: "沙漠 (shā mò) - desert",
    },
    {
      char: "沙滩",
      pinyin: "shā tān",
      meaning: "beach",
      breakdown: "沙滩 (shā tān) - beach",
    },
    {
      char: "傻",
      pinyin: "shǎ",
      meaning: "foolish",
      breakdown: "傻 (shǎ) - foolish",
    },
    {
      char: "晒",
      pinyin: "shài",
      meaning: "to dry in the sun",
      breakdown: "晒 (shài) - to dry in the sun",
    },
    {
      char: "删除",
      pinyin: "shān chú",
      meaning: "to delete",
      breakdown: "删除 (shān chú) - to delete",
    },
    {
      char: "闪电",
      pinyin: "shǎn diàn",
      meaning: "lightning",
      breakdown: "闪电 (shǎn diàn) - lightning",
    },
    {
      char: "善良",
      pinyin: "shàn liáng",
      meaning: "good and honest",
      breakdown: "善良 (shàn liáng) - good and honest",
    },
    {
      char: "善于",
      pinyin: "shàn yú",
      meaning: "to be good at",
      breakdown: "善于 (shàn yú) - to be good at",
    },
    {
      char: "扇子",
      pinyin: "shān zi",
      meaning: "fan",
      breakdown: "扇子 (shān zi) - fan",
    },
    {
      char: "商品",
      pinyin: "shāng pǐn",
      meaning: "good",
      breakdown: "商品 (shāng pǐn) - good",
    },
    {
      char: "商业",
      pinyin: "shāng yè",
      meaning: "business",
      breakdown: "商业 (shāng yè) - business",
    },
    {
      char: "上当",
      pinyin: "shàng dàng",
      meaning: "taken in (by sb's deceit)",
      breakdown: "上当 (shàng dàng) - taken in (by sb's deceit)",
    },
    {
      char: "勺子",
      pinyin: "sháo zi",
      meaning: "scoop",
      breakdown: "勺子 (sháo zi) - scoop",
    },
    {
      char: "蛇",
      pinyin: "shé",
      meaning: "snake",
      breakdown: "蛇 (shé) - snake",
    },
    {
      char: "舌头",
      pinyin: "shé tou",
      meaning: "tongue",
      breakdown: "舌头 (shé tou) - tongue",
    },
    {
      char: "舍不得",
      pinyin: "shě bu de",
      meaning: "to hate to do sth",
      breakdown: "舍不得 (shě bu de) - to hate to do sth",
    },
    {
      char: "设备",
      pinyin: "shè bèi",
      meaning: "equipment",
      breakdown: "设备 (shè bèi) - equipment",
    },
    {
      char: "设计",
      pinyin: "shè jì",
      meaning: "plan",
      breakdown: "设计 (shè jì) - plan",
    },
    {
      char: "设施",
      pinyin: "shè shī",
      meaning: "facilities",
      breakdown: "设施 (shè shī) - facilities",
    },
    {
      char: "射击",
      pinyin: "shè jī",
      meaning: "to shoot",
      breakdown: "射击 (shè jī) - to shoot",
    },
    {
      char: "摄影",
      pinyin: "shè yǐng",
      meaning: "to take a photograph",
      breakdown: "摄影 (shè yǐng) - to take a photograph",
    },
    {
      char: "伸",
      pinyin: "shēn",
      meaning: "to stretch",
      breakdown: "伸 (shēn) - to stretch",
    },
    {
      char: "深刻",
      pinyin: "shēn kè",
      meaning: "profound",
      breakdown: "深刻 (shēn kè) - profound",
    },
    {
      char: "身材",
      pinyin: "shēn cái",
      meaning: "stature",
      breakdown: "身材 (shēn cái) - stature",
    },
    {
      char: "身份",
      pinyin: "shēn fèn",
      meaning: "identity",
      breakdown: "身份 (shēn fèn) - identity",
    },
    {
      char: "神话",
      pinyin: "shén huà",
      meaning: "legend",
      breakdown: "神话 (shén huà) - legend",
    },
    {
      char: "神经",
      pinyin: "shén jīng",
      meaning: "nerve",
      breakdown: "神经 (shén jīng) - nerve",
    },
    {
      char: "神秘",
      pinyin: "shén mì",
      meaning: "mysterious",
      breakdown: "神秘 (shén mì) - mysterious",
    },
    {
      char: "升",
      pinyin: "shēng",
      meaning: "variant of 升[shēng]",
      breakdown: "升 (shēng) - variant of 升[shēng]",
    },
    {
      char: "生产",
      pinyin: "shēng chǎn",
      meaning: "childbirth",
      breakdown: "生产 (shēng chǎn) - childbirth",
    },
    {
      char: "生动",
      pinyin: "shēng dòng",
      meaning: "vivid",
      breakdown: "生动 (shēng dòng) - vivid",
    },
    {
      char: "声调",
      pinyin: "shēng diào",
      meaning: "tone",
      breakdown: "声调 (shēng diào) - tone",
    },
    {
      char: "绳子",
      pinyin: "shéng zi",
      meaning: "cord",
      breakdown: "绳子 (shéng zi) - cord",
    },
    {
      char: "省略",
      pinyin: "shěng lvè",
      meaning: "to leave out",
      breakdown: "省略 (shěng lvè) - to leave out",
    },
    {
      char: "胜利",
      pinyin: "shèng lì",
      meaning: "victory",
      breakdown: "胜利 (shèng lì) - victory",
    },
    {
      char: "诗",
      pinyin: "shī",
      meaning: "poem",
      breakdown: "诗 (shī) - poem",
    },
    {
      char: "失眠",
      pinyin: "shī mián",
      meaning: "to suffer from insomnia",
      breakdown: "失眠 (shī mián) - to suffer from insomnia",
    },
    {
      char: "失去",
      pinyin: "shī qù",
      meaning: "to lose",
      breakdown: "失去 (shī qù) - to lose",
    },
    {
      char: "失业",
      pinyin: "shī yè",
      meaning: "unemployment",
      breakdown: "失业 (shī yè) - unemployment",
    },
    {
      char: "时代",
      pinyin: "shí dài",
      meaning: "age",
      breakdown: "时代 (shí dài) - age",
    },
    {
      char: "时刻",
      pinyin: "shí kè",
      meaning: "moment",
      breakdown: "时刻 (shí kè) - moment",
    },
    {
      char: "时髦",
      pinyin: "shí máo",
      meaning: "in vogue",
      breakdown: "时髦 (shí máo) - in vogue",
    },
    {
      char: "时期",
      pinyin: "shí qī",
      meaning: "period",
      breakdown: "时期 (shí qī) - period",
    },
    {
      char: "时尚",
      pinyin: "shí shàng",
      meaning: "fashion",
      breakdown: "时尚 (shí shàng) - fashion",
    },
    {
      char: "实话",
      pinyin: "shí huà",
      meaning: "truth",
      breakdown: "实话 (shí huà) - truth",
    },
    {
      char: "实践",
      pinyin: "shí jiàn",
      meaning: "to practice",
      breakdown: "实践 (shí jiàn) - to practice",
    },
    {
      char: "实习",
      pinyin: "shí xí",
      meaning: "to practice",
      breakdown: "实习 (shí xí) - to practice",
    },
    {
      char: "实现",
      pinyin: "shí xiàn",
      meaning: "to achieve",
      breakdown: "实现 (shí xiàn) - to achieve",
    },
    {
      char: "实行",
      pinyin: "shí xíng",
      meaning: "to implement",
      breakdown: "实行 (shí xíng) - to implement",
    },
    {
      char: "实验",
      pinyin: "shí yàn",
      meaning: "experiment",
      breakdown: "实验 (shí yàn) - experiment",
    },
    {
      char: "实用",
      pinyin: "shí yòng",
      meaning: "practical",
      breakdown: "实用 (shí yòng) - practical",
    },
    {
      char: "食物",
      pinyin: "shí wù",
      meaning: "food",
      breakdown: "食物 (shí wù) - food",
    },
    {
      char: "石头",
      pinyin: "shí tou",
      meaning: "stone",
      breakdown: "石头 (shí tou) - stone",
    },
    {
      char: "使劲儿",
      pinyin: "shǐ jìn ér",
      meaning: "Rearing",
      breakdown: "使劲儿 (shǐ jìn ér) - Rearing",
    },
    {
      char: "始终",
      pinyin: "shǐ zhōng",
      meaning: "from beginning to end",
      breakdown: "始终 (shǐ zhōng) - from beginning to end",
    },
    {
      char: "是否",
      pinyin: "shì fǒu",
      meaning: "whether (or not)",
      breakdown: "是否 (shì fǒu) - whether (or not)",
    },
    {
      char: "试卷",
      pinyin: "shì juàn",
      meaning: "examination paper",
      breakdown: "试卷 (shì juàn) - examination paper",
    },
    {
      char: "士兵",
      pinyin: "shì bīng",
      meaning: "soldier",
      breakdown: "士兵 (shì bīng) - soldier",
    },
    {
      char: "似的",
      pinyin: "shì de",
      meaning: "seems as if",
      breakdown: "似的 (shì de) - seems as if",
    },
    {
      char: "事实",
      pinyin: "shì shí",
      meaning: "fact",
      breakdown: "事实 (shì shí) - fact",
    },
    {
      char: "事物",
      pinyin: "shì wù",
      meaning: "thing",
      breakdown: "事物 (shì wù) - thing",
    },
    {
      char: "事先",
      pinyin: "shì xiān",
      meaning: "in advance",
      breakdown: "事先 (shì xiān) - in advance",
    },
    {
      char: "收获",
      pinyin: "shōu huò",
      meaning: "to harvest",
      breakdown: "收获 (shōu huò) - to harvest",
    },
    {
      char: "收据",
      pinyin: "shōu jù",
      meaning: "receipt",
      breakdown: "收据 (shōu jù) - receipt",
    },
    {
      char: "手工",
      pinyin: "shǒu gōng",
      meaning: "handwork",
      breakdown: "手工 (shǒu gōng) - handwork",
    },
    {
      char: "手术",
      pinyin: "shǒu shù",
      meaning: "(surgical) operation",
      breakdown: "手术 (shǒu shù) - (surgical) operation",
    },
    {
      char: "手套",
      pinyin: "shǒu tào",
      meaning: "glove",
      breakdown: "手套 (shǒu tào) - glove",
    },
    {
      char: "手续",
      pinyin: "shǒu xù",
      meaning: "procedure",
      breakdown: "手续 (shǒu xù) - procedure",
    },
    {
      char: "手指",
      pinyin: "shǒu zhǐ",
      meaning: "finger",
      breakdown: "手指 (shǒu zhǐ) - finger",
    },
    {
      char: "受伤",
      pinyin: "shòu shāng",
      meaning: "to sustain injuries",
      breakdown: "受伤 (shòu shāng) - to sustain injuries",
    },
    {
      char: "寿命",
      pinyin: "shòu mìng",
      meaning: "life span",
      breakdown: "寿命 (shòu mìng) - life span",
    },
    {
      char: "书架",
      pinyin: "shū jià",
      meaning: "bookshelf",
      breakdown: "书架 (shū jià) - bookshelf",
    },
    {
      char: "输入",
      pinyin: "shū rù",
      meaning: "to import",
      breakdown: "输入 (shū rù) - to import",
    },
    {
      char: "蔬菜",
      pinyin: "shū cài",
      meaning: "vegetables",
      breakdown: "蔬菜 (shū cài) - vegetables",
    },
    {
      char: "舒适",
      pinyin: "shū shì",
      meaning: "cozy",
      breakdown: "舒适 (shū shì) - cozy",
    },
    {
      char: "梳子",
      pinyin: "shū zi",
      meaning: "comb",
      breakdown: "梳子 (shū zi) - comb",
    },
    {
      char: "熟练",
      pinyin: "shú liàn",
      meaning: "practiced",
      breakdown: "熟练 (shú liàn) - practiced",
    },
    {
      char: "鼠标",
      pinyin: "shǔ biāo",
      meaning: "mouse (computing)",
      breakdown: "鼠标 (shǔ biāo) - mouse (computing)",
    },
    {
      char: "属于",
      pinyin: "shǔ yú",
      meaning: "to be classified as",
      breakdown: "属于 (shǔ yú) - to be classified as",
    },
    {
      char: "数据",
      pinyin: "shù jù",
      meaning: "data",
      breakdown: "数据 (shù jù) - data",
    },
    {
      char: "数码",
      pinyin: "shù mǎ",
      meaning: "number",
      breakdown: "数码 (shù mǎ) - number",
    },
    {
      char: "摔",
      pinyin: "shuāi",
      meaning: "to throw down",
      breakdown: "摔 (shuāi) - to throw down",
    },
    {
      char: "甩",
      pinyin: "shuǎi",
      meaning: "to throw",
      breakdown: "甩 (shuǎi) - to throw",
    },
    {
      char: "双方",
      pinyin: "shuāng fāng",
      meaning: "bilateral",
      breakdown: "双方 (shuāng fāng) - bilateral",
    },
    {
      char: "税",
      pinyin: "shuì",
      meaning: "taxes",
      breakdown: "税 (shuì) - taxes",
    },
    {
      char: "说不定",
      pinyin: "shuō bu dìng",
      meaning: "can't say for sure",
      breakdown: "说不定 (shuō bu dìng) - can't say for sure",
    },
    {
      char: "说服",
      pinyin: "shuō fú",
      meaning: "to persuade",
      breakdown: "说服 (shuō fú) - to persuade",
    },
    {
      char: "撕",
      pinyin: "sī",
      meaning: "to tear",
      breakdown: "撕 (sī) - to tear",
    },
    {
      char: "丝绸",
      pinyin: "sī chóu",
      meaning: "silk cloth",
      breakdown: "丝绸 (sī chóu) - silk cloth",
    },
    {
      char: "丝毫",
      pinyin: "sī háo",
      meaning: "the slightest amount or degree",
      breakdown: "丝毫 (sī háo) - the slightest amount or degree",
    },
    {
      char: "思考",
      pinyin: "sī kǎo",
      meaning: "to reflect on",
      breakdown: "思考 (sī kǎo) - to reflect on",
    },
    {
      char: "思想",
      pinyin: "sī xiǎng",
      meaning: "thought",
      breakdown: "思想 (sī xiǎng) - thought",
    },
    {
      char: "私人",
      pinyin: "sī rén",
      meaning: "private",
      breakdown: "私人 (sī rén) - private",
    },
    {
      char: "似乎",
      pinyin: "sì hū",
      meaning: "apparently",
      breakdown: "似乎 (sì hū) - apparently",
    },
    {
      char: "寺庙",
      pinyin: "sì miào",
      meaning: "temple",
      breakdown: "寺庙 (sì miào) - temple",
    },
    {
      char: "宿舍",
      pinyin: "sù shè",
      meaning: "dormitory",
      breakdown: "宿舍 (sù shè) - dormitory",
    },
    {
      char: "随时",
      pinyin: "suí shí",
      meaning: "at any time",
      breakdown: "随时 (suí shí) - at any time",
    },
    {
      char: "碎",
      pinyin: "suì",
      meaning: "to break down",
      breakdown: "碎 (suì) - to break down",
    },
    {
      char: "损失",
      pinyin: "sǔn shī",
      meaning: "loss",
      breakdown: "损失 (sǔn shī) - loss",
    },
    {
      char: "缩短",
      pinyin: "suō duǎn",
      meaning: "to curtail",
      breakdown: "缩短 (suō duǎn) - to curtail",
    },
    {
      char: "缩小",
      pinyin: "suō xiǎo",
      meaning: "to reduce",
      breakdown: "缩小 (suō xiǎo) - to reduce",
    },
    {
      char: "锁",
      pinyin: "suǒ",
      meaning: "to lock up",
      breakdown: "锁 (suǒ) - to lock up",
    },
    {
      char: "所",
      pinyin: "suǒ",
      meaning: "actually",
      breakdown: "所 (suǒ) - actually",
    },
    {
      char: "所谓",
      pinyin: "suǒ wèi",
      meaning: "so-called",
      breakdown: "所谓 (suǒ wèi) - so-called",
    },
    {
      char: "塔",
      pinyin: "tǎ",
      meaning: "pagoda",
      breakdown: "塔 (tǎ) - pagoda",
    },
    {
      char: "台阶",
      pinyin: "tái jiē",
      meaning: "steps",
      breakdown: "台阶 (tái jiē) - steps",
    },
    {
      char: "太极拳",
      pinyin: "tài jí quán",
      meaning: "shadowboxing or Taiji",
      breakdown: "太极拳 (tài jí quán) - shadowboxing or Taiji",
    },
    {
      char: "太太",
      pinyin: "tài tai",
      meaning: "married woman",
      breakdown: "太太 (tài tai) - married woman",
    },
    {
      char: "谈判",
      pinyin: "tán pàn",
      meaning: "to negotiate",
      breakdown: "谈判 (tán pàn) - to negotiate",
    },
    {
      char: "坦率",
      pinyin: "tǎn shuài",
      meaning: "frank (discussion)",
      breakdown: "坦率 (tǎn shuài) - frank (discussion)",
    },
    {
      char: "烫",
      pinyin: "tàng",
      meaning: "to scald",
      breakdown: "烫 (tàng) - to scald",
    },
    {
      char: "桃",
      pinyin: "táo",
      meaning: "peach",
      breakdown: "桃 (táo) - peach",
    },
    {
      char: "逃",
      pinyin: "táo",
      meaning: "to escape",
      breakdown: "逃 (táo) - to escape",
    },
    {
      char: "逃避",
      pinyin: "táo bì",
      meaning: "to escape",
      breakdown: "逃避 (táo bì) - to escape",
    },
    {
      char: "套",
      pinyin: "tào",
      meaning: "cover",
      breakdown: "套 (tào) - cover",
    },
    {
      char: "特殊",
      pinyin: "tè shū",
      meaning: "special",
      breakdown: "特殊 (tè shū) - special",
    },
    {
      char: "特意",
      pinyin: "tè yì",
      meaning: "specially",
      breakdown: "特意 (tè yì) - specially",
    },
    {
      char: "特征",
      pinyin: "tè zhēng",
      meaning: "characteristic",
      breakdown: "特征 (tè zhēng) - characteristic",
    },
    {
      char: "疼爱",
      pinyin: "téng ài",
      meaning: "to love dearly",
      breakdown: "疼爱 (téng ài) - to love dearly",
    },
    {
      char: "提",
      pinyin: "tí",
      meaning: "to carry (hanging down from the hand)",
      breakdown: "提 (tí) - to carry (hanging down from the hand)",
    },
    {
      char: "提倡",
      pinyin: "tí chàng",
      meaning: "to promote",
      breakdown: "提倡 (tí chàng) - to promote",
    },
    {
      char: "提纲",
      pinyin: "tí gāng",
      meaning: "the key point",
      breakdown: "提纲 (tí gāng) - the key point",
    },
    {
      char: "提问",
      pinyin: "tí wèn",
      meaning: "to question",
      breakdown: "提问 (tí wèn) - to question",
    },
    {
      char: "题目",
      pinyin: "tí mù",
      meaning: "subject",
      breakdown: "题目 (tí mù) - subject",
    },
    {
      char: "体会",
      pinyin: "tǐ huì",
      meaning: "to know from experience",
      breakdown: "体会 (tǐ huì) - to know from experience",
    },
    {
      char: "体积",
      pinyin: "tǐ jī",
      meaning: "volume",
      breakdown: "体积 (tǐ jī) - volume",
    },
    {
      char: "体贴",
      pinyin: "tǐ tiē",
      meaning: "considerate (of other people's needs)",
      breakdown: "体贴 (tǐ tiē) - considerate (of other people's needs)",
    },
    {
      char: "体现",
      pinyin: "tǐ xiàn",
      meaning: "to embody",
      breakdown: "体现 (tǐ xiàn) - to embody",
    },
    {
      char: "体验",
      pinyin: "tǐ yàn",
      meaning: "to experience for oneself",
      breakdown: "体验 (tǐ yàn) - to experience for oneself",
    },
    {
      char: "天空",
      pinyin: "tiān kōng",
      meaning: "sky",
      breakdown: "天空 (tiān kōng) - sky",
    },
    {
      char: "天真",
      pinyin: "tiān zhēn",
      meaning: "naive",
      breakdown: "天真 (tiān zhēn) - naive",
    },
    {
      char: "田野",
      pinyin: "tián yě",
      meaning: "field",
      breakdown: "田野 (tián yě) - field",
    },
    {
      char: "调皮",
      pinyin: "tiáo pí",
      meaning: "naughty",
      breakdown: "调皮 (tiáo pí) - naughty",
    },
    {
      char: "调整",
      pinyin: "tiáo zhěng",
      meaning: "to adjust",
      breakdown: "调整 (tiáo zhěng) - to adjust",
    },
    {
      char: "挑战",
      pinyin: "tiǎo zhàn",
      meaning: "to challenge",
      breakdown: "挑战 (tiǎo zhàn) - to challenge",
    },
    {
      char: "通常",
      pinyin: "tōng cháng",
      meaning: "regular",
      breakdown: "通常 (tōng cháng) - regular",
    },
    {
      char: "通讯",
      pinyin: "tōng xùn",
      meaning: "communications",
      breakdown: "通讯 (tōng xùn) - communications",
    },
    {
      char: "铜",
      pinyin: "tóng",
      meaning: "copper (chemistry)",
      breakdown: "铜 (tóng) - copper (chemistry)",
    },
    {
      char: "同时",
      pinyin: "tóng shí",
      meaning: "at the same time",
      breakdown: "同时 (tóng shí) - at the same time",
    },
    {
      char: "统一",
      pinyin: "tǒng yī",
      meaning: "to unify",
      breakdown: "统一 (tǒng yī) - to unify",
    },
    {
      char: "统治",
      pinyin: "tǒng zhì",
      meaning: "to rule (a country)",
      breakdown: "统治 (tǒng zhì) - to rule (a country)",
    },
    {
      char: "痛苦",
      pinyin: "tòng kǔ",
      meaning: "pain",
      breakdown: "痛苦 (tòng kǔ) - pain",
    },
    {
      char: "痛快",
      pinyin: "tòng kuài",
      meaning: "overjoyed",
      breakdown: "痛快 (tòng kuài) - overjoyed",
    },
    {
      char: "投资",
      pinyin: "tóu zī",
      meaning: "investment",
      breakdown: "投资 (tóu zī) - investment",
    },
    {
      char: "透明",
      pinyin: "tòu míng",
      meaning: "transparent",
      breakdown: "透明 (tòu míng) - transparent",
    },
    {
      char: "突出",
      pinyin: "tū chū",
      meaning: "prominent",
      breakdown: "突出 (tū chū) - prominent",
    },
    {
      char: "土地",
      pinyin: "tǔ dì",
      meaning: "land",
      breakdown: "土地 (tǔ dì) - land",
    },
    {
      char: "土豆",
      pinyin: "tǔ dòu",
      meaning: "potato",
      breakdown: "土豆 (tǔ dòu) - potato",
    },
    {
      char: "吐",
      pinyin: "tù",
      meaning: "to vomit",
      breakdown: "吐 (tù) - to vomit",
    },
    {
      char: "兔子",
      pinyin: "tù zi",
      meaning: "hare",
      breakdown: "兔子 (tù zi) - hare",
    },
    {
      char: "团",
      pinyin: "tuán",
      meaning: "dumpling",
      breakdown: "团 (tuán) - dumpling",
    },
    {
      char: "推辞",
      pinyin: "tuī cí",
      meaning: "to decline (an appointment)",
      breakdown: "推辞 (tuī cí) - to decline (an appointment)",
    },
    {
      char: "推广",
      pinyin: "tuī guǎng",
      meaning: "to extend",
      breakdown: "推广 (tuī guǎng) - to extend",
    },
    {
      char: "推荐",
      pinyin: "tuī jiàn",
      meaning: "to recommend",
      breakdown: "推荐 (tuī jiàn) - to recommend",
    },
    {
      char: "退",
      pinyin: "tuì",
      meaning: "to retreat",
      breakdown: "退 (tuì) - to retreat",
    },
    {
      char: "退步",
      pinyin: "tuì bù",
      meaning: "to do less well than before",
      breakdown: "退步 (tuì bù) - to do less well than before",
    },
    {
      char: "退休",
      pinyin: "tuì xiū",
      meaning: "to retire",
      breakdown: "退休 (tuì xiū) - to retire",
    },
    {
      char: "歪",
      pinyin: "wāi",
      meaning: "askew",
      breakdown: "歪 (wāi) - askew",
    },
    {
      char: "外交",
      pinyin: "wài jiāo",
      meaning: "diplomacy",
      breakdown: "外交 (wài jiāo) - diplomacy",
    },
    {
      char: "弯",
      pinyin: "wān",
      meaning: "bend",
      breakdown: "弯 (wān) - bend",
    },
    {
      char: "完美",
      pinyin: "wán měi",
      meaning: "perfect",
      breakdown: "完美 (wán měi) - perfect",
    },
    {
      char: "完善",
      pinyin: "wán shàn",
      meaning: "perfect",
      breakdown: "完善 (wán shàn) - perfect",
    },
    {
      char: "完整",
      pinyin: "wán zhěng",
      meaning: "complete",
      breakdown: "完整 (wán zhěng) - complete",
    },
    {
      char: "玩具",
      pinyin: "wán jù",
      meaning: "plaything",
      breakdown: "玩具 (wán jù) - plaything",
    },
    {
      char: "万一",
      pinyin: "wàn yī",
      meaning: "just in case",
      breakdown: "万一 (wàn yī) - just in case",
    },
    {
      char: "王子",
      pinyin: "wáng zǐ",
      meaning: "prince",
      breakdown: "王子 (wáng zǐ) - prince",
    },
    {
      char: "往返",
      pinyin: "wǎng fǎn",
      meaning: "to go back and forth",
      breakdown: "往返 (wǎng fǎn) - to go back and forth",
    },
    {
      char: "微笑",
      pinyin: "wēi xiào",
      meaning: "smile",
      breakdown: "微笑 (wēi xiào) - smile",
    },
    {
      char: "威胁",
      pinyin: "wēi xié",
      meaning: "to threaten",
      breakdown: "威胁 (wēi xié) - to threaten",
    },
    {
      char: "危害",
      pinyin: "wēi hài",
      meaning: "to jeopardize",
      breakdown: "危害 (wēi hài) - to jeopardize",
    },
    {
      char: "违反",
      pinyin: "wéi fǎn",
      meaning: "to violate (a law)",
      breakdown: "违反 (wéi fǎn) - to violate (a law)",
    },
    {
      char: "维护",
      pinyin: "wéi hù",
      meaning: "to defend",
      breakdown: "维护 (wéi hù) - to defend",
    },
    {
      char: "围巾",
      pinyin: "wéi jīn",
      meaning: "scarf",
      breakdown: "围巾 (wéi jīn) - scarf",
    },
    {
      char: "围绕",
      pinyin: "wéi rào",
      meaning: "to revolve around",
      breakdown: "围绕 (wéi rào) - to revolve around",
    },
    {
      char: "唯一",
      pinyin: "wéi yī",
      meaning: "only",
      breakdown: "唯一 (wéi yī) - only",
    },
    {
      char: "尾巴",
      pinyin: "wěi ba",
      meaning: "tail",
      breakdown: "尾巴 (wěi ba) - tail",
    },
    {
      char: "伟大",
      pinyin: "wěi dà",
      meaning: "great",
      breakdown: "伟大 (wěi dà) - great",
    },
    {
      char: "委屈",
      pinyin: "wěi qu",
      meaning: "to feel wronged",
      breakdown: "委屈 (wěi qu) - to feel wronged",
    },
    {
      char: "委托",
      pinyin: "wěi tuō",
      meaning: "to entrust",
      breakdown: "委托 (wěi tuō) - to entrust",
    },
    {
      char: "胃",
      pinyin: "wèi",
      meaning: "stomach",
      breakdown: "胃 (wèi) - stomach",
    },
    {
      char: "位置",
      pinyin: "wèi zhi",
      meaning: "position",
      breakdown: "位置 (wèi zhi) - position",
    },
    {
      char: "未必",
      pinyin: "wèi bì",
      meaning: "not necessarily",
      breakdown: "未必 (wèi bì) - not necessarily",
    },
    {
      char: "未来",
      pinyin: "wèi lái",
      meaning: "future",
      breakdown: "未来 (wèi lái) - future",
    },
    {
      char: "卫生间",
      pinyin: "wèi shēng jiān",
      meaning: "bathroom",
      breakdown: "卫生间 (wèi shēng jiān) - bathroom",
    },
    {
      char: "温暖",
      pinyin: "wēn nuǎn",
      meaning: "warm",
      breakdown: "温暖 (wēn nuǎn) - warm",
    },
    {
      char: "温柔",
      pinyin: "wēn róu",
      meaning: "gentle and soft",
      breakdown: "温柔 (wēn róu) - gentle and soft",
    },
    {
      char: "闻",
      pinyin: "wén",
      meaning: "to hear",
      breakdown: "闻 (wén) - to hear",
    },
    {
      char: "文件",
      pinyin: "wén jiàn",
      meaning: "document",
      breakdown: "文件 (wén jiàn) - document",
    },
    {
      char: "文具",
      pinyin: "wén jù",
      meaning: "stationery",
      breakdown: "文具 (wén jù) - stationery",
    },
    {
      char: "文明",
      pinyin: "wén míng",
      meaning: "civilized",
      breakdown: "文明 (wén míng) - civilized",
    },
    {
      char: "文学",
      pinyin: "wén xué",
      meaning: "literature",
      breakdown: "文学 (wén xué) - literature",
    },
    {
      char: "吻",
      pinyin: "wěn",
      meaning: "kiss",
      breakdown: "吻 (wěn) - kiss",
    },
    {
      char: "稳定",
      pinyin: "wěn dìng",
      meaning: "steady",
      breakdown: "稳定 (wěn dìng) - steady",
    },
    {
      char: "问候",
      pinyin: "wèn hòu",
      meaning: "to give one's respects",
      breakdown: "问候 (wèn hòu) - to give one's respects",
    },
    {
      char: "卧室",
      pinyin: "wò shì",
      meaning: "bedroom",
      breakdown: "卧室 (wò shì) - bedroom",
    },
    {
      char: "屋子",
      pinyin: "wū zi",
      meaning: "house",
      breakdown: "屋子 (wū zi) - house",
    },
    {
      char: "无奈",
      pinyin: "wú nài",
      meaning: "helpless",
      breakdown: "无奈 (wú nài) - helpless",
    },
    {
      char: "无数",
      pinyin: "wú shù",
      meaning: "countless",
      breakdown: "无数 (wú shù) - countless",
    },
    {
      char: "武器",
      pinyin: "wǔ qì",
      meaning: "weapon",
      breakdown: "武器 (wǔ qì) - weapon",
    },
    {
      char: "武术",
      pinyin: "wǔ shù",
      meaning: "military skill or technique (in former times)",
      breakdown:
        "武术 (wǔ shù) - military skill or technique (in former times)",
    },
    { char: "雾", pinyin: "wù", meaning: "fog", breakdown: "雾 (wù) - fog" },
    {
      char: "物理",
      pinyin: "wù lǐ",
      meaning: "physics",
      breakdown: "物理 (wù lǐ) - physics",
    },
    {
      char: "物质",
      pinyin: "wù zhì",
      meaning: "matter",
      breakdown: "物质 (wù zhì) - matter",
    },
    {
      char: "吸收",
      pinyin: "xī shōu",
      meaning: "to absorb",
      breakdown: "吸收 (xī shōu) - to absorb",
    },
    {
      char: "系",
      pinyin: "xì",
      meaning: "to connect",
      breakdown: "系 (xì) - to connect",
    },
    {
      char: "系统",
      pinyin: "xì tǒng",
      meaning: "system",
      breakdown: "系统 (xì tǒng) - system",
    },
    {
      char: "细节",
      pinyin: "xì jié",
      meaning: "details",
      breakdown: "细节 (xì jié) - details",
    },
    {
      char: "戏剧",
      pinyin: "xì jù",
      meaning: "drama",
      breakdown: "戏剧 (xì jù) - drama",
    },
    {
      char: "瞎",
      pinyin: "xiā",
      meaning: "blind",
      breakdown: "瞎 (xiā) - blind",
    },
    {
      char: "吓",
      pinyin: "xià",
      meaning: "to frighten",
      breakdown: "吓 (xià) - to frighten",
    },
    {
      char: "下载",
      pinyin: "xià zǎi",
      meaning: "to download",
      breakdown: "下载 (xià zǎi) - to download",
    },
    {
      char: "鲜艳",
      pinyin: "xiān yàn",
      meaning: "bright-colored",
      breakdown: "鲜艳 (xiān yàn) - bright-colored",
    },
    {
      char: "显得",
      pinyin: "xiǎn de",
      meaning: "to seem",
      breakdown: "显得 (xiǎn de) - to seem",
    },
    {
      char: "显然",
      pinyin: "xiǎn rán",
      meaning: "clear",
      breakdown: "显然 (xiǎn rán) - clear",
    },
    {
      char: "显示",
      pinyin: "xiǎn shì",
      meaning: "to show",
      breakdown: "显示 (xiǎn shì) - to show",
    },
    {
      char: "县",
      pinyin: "xiàn",
      meaning: "county",
      breakdown: "县 (xiàn) - county",
    },
    {
      char: "现金",
      pinyin: "xiàn jīn",
      meaning: "cash",
      breakdown: "现金 (xiàn jīn) - cash",
    },
    {
      char: "现实",
      pinyin: "xiàn shí",
      meaning: "reality",
      breakdown: "现实 (xiàn shí) - reality",
    },
    {
      char: "现象",
      pinyin: "xiàn xiàng",
      meaning: "appearance",
      breakdown: "现象 (xiàn xiàng) - appearance",
    },
    {
      char: "相处",
      pinyin: "xiāng chǔ",
      meaning: "to be in contact with",
      breakdown: "相处 (xiāng chǔ) - to be in contact with",
    },
    {
      char: "相当",
      pinyin: "xiāng dāng",
      meaning: "equivalent to",
      breakdown: "相当 (xiāng dāng) - equivalent to",
    },
    {
      char: "相对",
      pinyin: "xiāng duì",
      meaning: "relatively",
      breakdown: "相对 (xiāng duì) - relatively",
    },
    {
      char: "相关",
      pinyin: "xiāng guān",
      meaning: "to be interrelated",
      breakdown: "相关 (xiāng guān) - to be interrelated",
    },
    {
      char: "相似",
      pinyin: "xiāng sì",
      meaning: "to resemble",
      breakdown: "相似 (xiāng sì) - to resemble",
    },
    {
      char: "想念",
      pinyin: "xiǎng niàn",
      meaning: "to miss",
      breakdown: "想念 (xiǎng niàn) - to miss",
    },
    {
      char: "想象",
      pinyin: "xiǎng xiàng",
      meaning: "to imagine",
      breakdown: "想象 (xiǎng xiàng) - to imagine",
    },
    {
      char: "享受",
      pinyin: "xiǎng shòu",
      meaning: "to enjoy",
      breakdown: "享受 (xiǎng shòu) - to enjoy",
    },
    {
      char: "项",
      pinyin: "xiàng",
      meaning: "back of neck",
      breakdown: "项 (xiàng) - back of neck",
    },
    {
      char: "项链",
      pinyin: "xiàng liàn",
      meaning: "necklace",
      breakdown: "项链 (xiàng liàn) - necklace",
    },
    {
      char: "项目",
      pinyin: "xiàng mù",
      meaning: "item",
      breakdown: "项目 (xiàng mù) - item",
    },
    {
      char: "橡皮",
      pinyin: "xiàng pí",
      meaning: "rubber",
      breakdown: "橡皮 (xiàng pí) - rubber",
    },
    {
      char: "象棋",
      pinyin: "xiàng qí",
      meaning: "Chinese chess",
      breakdown: "象棋 (xiàng qí) - Chinese chess",
    },
    {
      char: "象征",
      pinyin: "xiàng zhēng",
      meaning: "emblem",
      breakdown: "象征 (xiàng zhēng) - emblem",
    },
    {
      char: "消费",
      pinyin: "xiāo fèi",
      meaning: "to consume",
      breakdown: "消费 (xiāo fèi) - to consume",
    },
    {
      char: "消化",
      pinyin: "xiāo huà",
      meaning: "to digest",
      breakdown: "消化 (xiāo huà) - to digest",
    },
    {
      char: "消灭",
      pinyin: "xiāo miè",
      meaning: "to put an end to",
      breakdown: "消灭 (xiāo miè) - to put an end to",
    },
    {
      char: "消失",
      pinyin: "xiāo shī",
      meaning: "to disappear",
      breakdown: "消失 (xiāo shī) - to disappear",
    },
    {
      char: "销售",
      pinyin: "xiāo shòu",
      meaning: "to sell",
      breakdown: "销售 (xiāo shòu) - to sell",
    },
    {
      char: "小吃",
      pinyin: "xiǎo chī",
      meaning: "snack",
      breakdown: "小吃 (xiǎo chī) - snack",
    },
    {
      char: "小伙子",
      pinyin: "xiǎo huǒ zi",
      meaning: "young man",
      breakdown: "小伙子 (xiǎo huǒ zi) - young man",
    },
    {
      char: "小麦",
      pinyin: "xiǎo mài",
      meaning: "wheat",
      breakdown: "小麦 (xiǎo mài) - wheat",
    },
    {
      char: "小气",
      pinyin: "xiǎo qì",
      meaning: "stingy",
      breakdown: "小气 (xiǎo qì) - stingy",
    },
    {
      char: "小偷",
      pinyin: "xiǎo tōu",
      meaning: "thief",
      breakdown: "小偷 (xiǎo tōu) - thief",
    },
    {
      char: "效率",
      pinyin: "xiào lǜ",
      meaning: "efficiency",
      breakdown: "效率 (xiào lǜ) - efficiency",
    },
    {
      char: "孝顺",
      pinyin: "xiào shùn",
      meaning: "filial piety",
      breakdown: "孝顺 (xiào shùn) - filial piety",
    },
    {
      char: "歇",
      pinyin: "xiē",
      meaning: "to rest",
      breakdown: "歇 (xiē) - to rest",
    },
    {
      char: "斜",
      pinyin: "xié",
      meaning: "inclined",
      breakdown: "斜 (xié) - inclined",
    },
    {
      char: "协调",
      pinyin: "xié tiáo",
      meaning: "to coordinate",
      breakdown: "协调 (xié tiáo) - to coordinate",
    },
    {
      char: "心理",
      pinyin: "xīn lǐ",
      meaning: "mental",
      breakdown: "心理 (xīn lǐ) - mental",
    },
    {
      char: "心脏",
      pinyin: "xīn zàng",
      meaning: "heart",
      breakdown: "心脏 (xīn zàng) - heart",
    },
    {
      char: "欣赏",
      pinyin: "xīn shǎng",
      meaning: "to appreciate",
      breakdown: "欣赏 (xīn shǎng) - to appreciate",
    },
    {
      char: "信封",
      pinyin: "xìn fēng",
      meaning: "envelope",
      breakdown: "信封 (xìn fēng) - envelope",
    },
    {
      char: "信号",
      pinyin: "xìn hào",
      meaning: "signal",
      breakdown: "信号 (xìn hào) - signal",
    },
    {
      char: "信息",
      pinyin: "xìn xī",
      meaning: "information",
      breakdown: "信息 (xìn xī) - information",
    },
    {
      char: "行动",
      pinyin: "xíng dòng",
      meaning: "operation",
      breakdown: "行动 (xíng dòng) - operation",
    },
    {
      char: "行人",
      pinyin: "xíng rén",
      meaning: "pedestrian",
      breakdown: "行人 (xíng rén) - pedestrian",
    },
    {
      char: "行为",
      pinyin: "xíng wéi",
      meaning: "action",
      breakdown: "行为 (xíng wéi) - action",
    },
    {
      char: "形成",
      pinyin: "xíng chéng",
      meaning: "to form",
      breakdown: "形成 (xíng chéng) - to form",
    },
    {
      char: "形容",
      pinyin: "xíng róng",
      meaning: "to describe",
      breakdown: "形容 (xíng róng) - to describe",
    },
    {
      char: "形式",
      pinyin: "xíng shì",
      meaning: "form",
      breakdown: "形式 (xíng shì) - form",
    },
    {
      char: "形势",
      pinyin: "xíng shì",
      meaning: "circumstances",
      breakdown: "形势 (xíng shì) - circumstances",
    },
    {
      char: "形象",
      pinyin: "xíng xiàng",
      meaning: "image",
      breakdown: "形象 (xíng xiàng) - image",
    },
    {
      char: "形状",
      pinyin: "xíng zhuàng",
      meaning: "form",
      breakdown: "形状 (xíng zhuàng) - form",
    },
    {
      char: "性质",
      pinyin: "xìng zhì",
      meaning: "nature",
      breakdown: "性质 (xìng zhì) - nature",
    },
    {
      char: "幸亏",
      pinyin: "xìng kuī",
      meaning: "fortunately",
      breakdown: "幸亏 (xìng kuī) - fortunately",
    },
    {
      char: "幸运",
      pinyin: "xìng yùn",
      meaning: "fortunate",
      breakdown: "幸运 (xìng yùn) - fortunate",
    },
    {
      char: "胸",
      pinyin: "xiōng",
      meaning: "chest",
      breakdown: "胸 (xiōng) - chest",
    },
    {
      char: "兄弟",
      pinyin: "xiōng dì",
      meaning: "brothers",
      breakdown: "兄弟 (xiōng dì) - brothers",
    },
    {
      char: "雄伟",
      pinyin: "xióng wěi",
      meaning: "grand",
      breakdown: "雄伟 (xióng wěi) - grand",
    },
    {
      char: "修改",
      pinyin: "xiū gǎi",
      meaning: "to amend",
      breakdown: "修改 (xiū gǎi) - to amend",
    },
    {
      char: "休闲",
      pinyin: "xiū xián",
      meaning: "leisure",
      breakdown: "休闲 (xiū xián) - leisure",
    },
    {
      char: "虚心",
      pinyin: "xū xīn",
      meaning: "modest",
      breakdown: "虚心 (xū xīn) - modest",
    },
    {
      char: "叙述",
      pinyin: "xù shù",
      meaning: "to relate (a story or information)",
      breakdown: "叙述 (xù shù) - to relate (a story or information)",
    },
    {
      char: "宣布",
      pinyin: "xuān bù",
      meaning: "to declare",
      breakdown: "宣布 (xuān bù) - to declare",
    },
    {
      char: "宣传",
      pinyin: "xuān chuán",
      meaning: "to disseminate",
      breakdown: "宣传 (xuān chuán) - to disseminate",
    },
    {
      char: "选举",
      pinyin: "xuǎn jǔ",
      meaning: "to elect",
      breakdown: "选举 (xuǎn jǔ) - to elect",
    },
    {
      char: "学期",
      pinyin: "xué qī",
      meaning: "term",
      breakdown: "学期 (xué qī) - term",
    },
    {
      char: "学术",
      pinyin: "xué shù",
      meaning: "learning",
      breakdown: "学术 (xué shù) - learning",
    },
    {
      char: "学问",
      pinyin: "xué wèn",
      meaning: "learning",
      breakdown: "学问 (xué wèn) - learning",
    },
    {
      char: "寻找",
      pinyin: "xún zhǎo",
      meaning: "to seek",
      breakdown: "寻找 (xún zhǎo) - to seek",
    },
    {
      char: "询问",
      pinyin: "xún wèn",
      meaning: "to inquire",
      breakdown: "询问 (xún wèn) - to inquire",
    },
    {
      char: "训练",
      pinyin: "xùn liàn",
      meaning: "to train",
      breakdown: "训练 (xùn liàn) - to train",
    },
    {
      char: "迅速",
      pinyin: "xùn sù",
      meaning: "rapid",
      breakdown: "迅速 (xùn sù) - rapid",
    },
    {
      char: "延长",
      pinyin: "yán cháng",
      meaning: "to prolong",
      breakdown: "延长 (yán cháng) - to prolong",
    },
    {
      char: "严肃",
      pinyin: "yán sù",
      meaning: "solemn",
      breakdown: "严肃 (yán sù) - solemn",
    },
    {
      char: "宴会",
      pinyin: "yàn huì",
      meaning: "banquet",
      breakdown: "宴会 (yàn huì) - banquet",
    },
    {
      char: "阳台",
      pinyin: "yáng tái",
      meaning: "balcony",
      breakdown: "阳台 (yáng tái) - balcony",
    },
    {
      char: "痒",
      pinyin: "yǎng",
      meaning: "to itch",
      breakdown: "痒 (yǎng) - to itch",
    },
    {
      char: "样式",
      pinyin: "yàng shì",
      meaning: "type",
      breakdown: "样式 (yàng shì) - type",
    },
    {
      char: "腰",
      pinyin: "yāo",
      meaning: "waist",
      breakdown: "腰 (yāo) - waist",
    },
    {
      char: "摇",
      pinyin: "yáo",
      meaning: "to shake",
      breakdown: "摇 (yáo) - to shake",
    },
    {
      char: "咬",
      pinyin: "yǎo",
      meaning: "to bite",
      breakdown: "咬 (yǎo) - to bite",
    },
    {
      char: "要不",
      pinyin: "yào bù",
      meaning: "otherwise",
      breakdown: "要不 (yào bù) - otherwise",
    },
    {
      char: "要是",
      pinyin: "yào shi",
      meaning: "if",
      breakdown: "要是 (yào shi) - if",
    },
    {
      char: "夜",
      pinyin: "yè",
      meaning: "night",
      breakdown: "夜 (yè) - night",
    },
    {
      char: "液体",
      pinyin: "yè tǐ",
      meaning: "liquid",
      breakdown: "液体 (yè tǐ) - liquid",
    },
    {
      char: "业务",
      pinyin: "yè wù",
      meaning: "business",
      breakdown: "业务 (yè wù) - business",
    },
    {
      char: "业余",
      pinyin: "yè yú",
      meaning: "spare time",
      breakdown: "业余 (yè yú) - spare time",
    },
    {
      char: "依然",
      pinyin: "yī rán",
      meaning: "still",
      breakdown: "依然 (yī rán) - still",
    },
    {
      char: "一辈子",
      pinyin: "yī bèi zi",
      meaning: "(for) a lifetime",
      breakdown: "一辈子 (yī bèi zi) - (for) a lifetime",
    },
    {
      char: "一旦",
      pinyin: "yī dàn",
      meaning: "in case (sth happens)",
      breakdown: "一旦 (yī dàn) - in case (sth happens)",
    },
    {
      char: "一路",
      pinyin: "yī lù",
      meaning: "the whole journey",
      breakdown: "一路 (yī lù) - the whole journey",
    },
    {
      char: "一致",
      pinyin: "yī zhì",
      meaning: "unanimous",
      breakdown: "一致 (yī zhì) - unanimous",
    },
    {
      char: "遗憾",
      pinyin: "yí hàn",
      meaning: "regret",
      breakdown: "遗憾 (yí hàn) - regret",
    },
    {
      char: "移动",
      pinyin: "yí dòng",
      meaning: "to move",
      breakdown: "移动 (yí dòng) - to move",
    },
    {
      char: "移民",
      pinyin: "yí mín",
      meaning: "to immigrate",
      breakdown: "移民 (yí mín) - to immigrate",
    },
    {
      char: "疑问",
      pinyin: "yí wèn",
      meaning: "question",
      breakdown: "疑问 (yí wèn) - question",
    },
    {
      char: "乙",
      pinyin: "yǐ",
      meaning: "second of 10 heavenly stems 十天干",
      breakdown: "乙 (yǐ) - second of 10 heavenly stems 十天干",
    },
    {
      char: "以及",
      pinyin: "yǐ jí",
      meaning: "as well as",
      breakdown: "以及 (yǐ jí) - as well as",
    },
    {
      char: "以来",
      pinyin: "yǐ lái",
      meaning: "since (a previous event)",
      breakdown: "以来 (yǐ lái) - since (a previous event)",
    },
    {
      char: "意外",
      pinyin: "yì wài",
      meaning: "unexpected",
      breakdown: "意外 (yì wài) - unexpected",
    },
    {
      char: "意义",
      pinyin: "yì yì",
      meaning: "sense",
      breakdown: "意义 (yì yì) - sense",
    },
    {
      char: "议论",
      pinyin: "yì lùn",
      meaning: "to comment",
      breakdown: "议论 (yì lùn) - to comment",
    },
    {
      char: "义务",
      pinyin: "yì wù",
      meaning: "duty",
      breakdown: "义务 (yì wù) - duty",
    },
    {
      char: "因而",
      pinyin: "yīn ér",
      meaning: "therefore",
      breakdown: "因而 (yīn ér) - therefore",
    },
    {
      char: "因素",
      pinyin: "yīn sù",
      meaning: "element",
      breakdown: "因素 (yīn sù) - element",
    },
    {
      char: "银",
      pinyin: "yín",
      meaning: "silver",
      breakdown: "银 (yín) - silver",
    },
    {
      char: "英俊",
      pinyin: "yīng jùn",
      meaning: "handsome",
      breakdown: "英俊 (yīng jùn) - handsome",
    },
    {
      char: "英雄",
      pinyin: "yīng xióng",
      meaning: "hero",
      breakdown: "英雄 (yīng xióng) - hero",
    },
    {
      char: "迎接",
      pinyin: "yíng jiē",
      meaning: "to meet",
      breakdown: "迎接 (yíng jiē) - to meet",
    },
    {
      char: "营养",
      pinyin: "yíng yǎng",
      meaning: "nutrition",
      breakdown: "营养 (yíng yǎng) - nutrition",
    },
    {
      char: "营业",
      pinyin: "yíng yè",
      meaning: "to do business",
      breakdown: "营业 (yíng yè) - to do business",
    },
    {
      char: "影子",
      pinyin: "yǐng zi",
      meaning: "shadow",
      breakdown: "影子 (yǐng zi) - shadow",
    },
    {
      char: "硬币",
      pinyin: "yìng bì",
      meaning: "coin",
      breakdown: "硬币 (yìng bì) - coin",
    },
    {
      char: "硬件",
      pinyin: "yìng jiàn",
      meaning: "hardware",
      breakdown: "硬件 (yìng jiàn) - hardware",
    },
    {
      char: "应付",
      pinyin: "yìng fu",
      meaning: "to deal with",
      breakdown: "应付 (yìng fu) - to deal with",
    },
    {
      char: "应聘",
      pinyin: "yìng pìn",
      meaning: "to accept a job offer",
      breakdown: "应聘 (yìng pìn) - to accept a job offer",
    },
    {
      char: "应用",
      pinyin: "yìng yòng",
      meaning: "to use",
      breakdown: "应用 (yìng yòng) - to use",
    },
    {
      char: "拥抱",
      pinyin: "yōng bào",
      meaning: "to embrace",
      breakdown: "拥抱 (yōng bào) - to embrace",
    },
    {
      char: "拥挤",
      pinyin: "yōng jǐ",
      meaning: "crowded",
      breakdown: "拥挤 (yōng jǐ) - crowded",
    },
    {
      char: "勇气",
      pinyin: "yǒng qì",
      meaning: "courage",
      breakdown: "勇气 (yǒng qì) - courage",
    },
    {
      char: "用途",
      pinyin: "yòng tú",
      meaning: "use",
      breakdown: "用途 (yòng tú) - use",
    },
    {
      char: "优惠",
      pinyin: "yōu huì",
      meaning: "preferential",
      breakdown: "优惠 (yōu huì) - preferential",
    },
    {
      char: "优美",
      pinyin: "yōu měi",
      meaning: "graceful",
      breakdown: "优美 (yōu měi) - graceful",
    },
    {
      char: "优势",
      pinyin: "yōu shì",
      meaning: "superiority",
      breakdown: "优势 (yōu shì) - superiority",
    },
    {
      char: "悠久",
      pinyin: "yōu jiǔ",
      meaning: "established",
      breakdown: "悠久 (yōu jiǔ) - established",
    },
    {
      char: "邮局",
      pinyin: "yóu jú",
      meaning: "post office",
      breakdown: "邮局 (yóu jú) - post office",
    },
    {
      char: "游览",
      pinyin: "yóu lǎn",
      meaning: "to go sight-seeing",
      breakdown: "游览 (yóu lǎn) - to go sight-seeing",
    },
    {
      char: "油炸",
      pinyin: "yóu zhá",
      meaning: "to deep fry",
      breakdown: "油炸 (yóu zhá) - to deep fry",
    },
    {
      char: "犹豫",
      pinyin: "yóu yù",
      meaning: "to hesitate",
      breakdown: "犹豫 (yóu yù) - to hesitate",
    },
    {
      char: "有利",
      pinyin: "yǒu lì",
      meaning: "advantageous",
      breakdown: "有利 (yǒu lì) - advantageous",
    },
    {
      char: "幼儿园",
      pinyin: "yòu ér yuán",
      meaning: "kindergarten",
      breakdown: "幼儿园 (yòu ér yuán) - kindergarten",
    },
    {
      char: "娱乐",
      pinyin: "yú lè",
      meaning: "to entertain",
      breakdown: "娱乐 (yú lè) - to entertain",
    },
    {
      char: "与其",
      pinyin: "yǔ qí",
      meaning: "rather than...",
      breakdown: "与其 (yǔ qí) - rather than...",
    },
    {
      char: "语气",
      pinyin: "yǔ qì",
      meaning: "tone",
      breakdown: "语气 (yǔ qì) - tone",
    },
    {
      char: "宇宙",
      pinyin: "yǔ zhòu",
      meaning: "universe",
      breakdown: "宇宙 (yǔ zhòu) - universe",
    },
    {
      char: "预报",
      pinyin: "yù bào",
      meaning: "forecast",
      breakdown: "预报 (yù bào) - forecast",
    },
    {
      char: "预订",
      pinyin: "yù dìng",
      meaning: "to place an order",
      breakdown: "预订 (yù dìng) - to place an order",
    },
    {
      char: "预防",
      pinyin: "yù fáng",
      meaning: "to prevent",
      breakdown: "预防 (yù fáng) - to prevent",
    },
    {
      char: "玉米",
      pinyin: "yù mǐ",
      meaning: "corn",
      breakdown: "玉米 (yù mǐ) - corn",
    },
    {
      char: "元旦",
      pinyin: "yuán dàn",
      meaning: "New Year's Day",
      breakdown: "元旦 (yuán dàn) - New Year's Day",
    },
    {
      char: "原料",
      pinyin: "yuán liào",
      meaning: "raw material",
      breakdown: "原料 (yuán liào) - raw material",
    },
    {
      char: "原则",
      pinyin: "yuán zé",
      meaning: "principle",
      breakdown: "原则 (yuán zé) - principle",
    },
    {
      char: "缘故",
      pinyin: "yuán gù",
      meaning: "reason",
      breakdown: "缘故 (yuán gù) - reason",
    },
    {
      char: "愿望",
      pinyin: "yuàn wàng",
      meaning: "desire",
      breakdown: "愿望 (yuàn wàng) - desire",
    },
    {
      char: "晕",
      pinyin: "yūn",
      meaning: "confused",
      breakdown: "晕 (yūn) - confused",
    },
    {
      char: "运气",
      pinyin: "yùn qi",
      meaning: "luck (good or bad)",
      breakdown: "运气 (yùn qi) - luck (good or bad)",
    },
    {
      char: "运输",
      pinyin: "yùn shū",
      meaning: "transport",
      breakdown: "运输 (yùn shū) - transport",
    },
    {
      char: "运用",
      pinyin: "yùn yòng",
      meaning: "to use",
      breakdown: "运用 (yùn yòng) - to use",
    },
    {
      char: "灾害",
      pinyin: "zāi hài",
      meaning: "disastrous damage",
      breakdown: "灾害 (zāi hài) - disastrous damage",
    },
    {
      char: "再三",
      pinyin: "zài sān",
      meaning: "over and over again",
      breakdown: "再三 (zài sān) - over and over again",
    },
    {
      char: "赞成",
      pinyin: "zàn chéng",
      meaning: "to approve",
      breakdown: "赞成 (zàn chéng) - to approve",
    },
    {
      char: "赞美",
      pinyin: "zàn měi",
      meaning: "to admire",
      breakdown: "赞美 (zàn měi) - to admire",
    },
    {
      char: "糟糕",
      pinyin: "zāo gāo",
      meaning: "too bad",
      breakdown: "糟糕 (zāo gāo) - too bad",
    },
    {
      char: "造成",
      pinyin: "zào chéng",
      meaning: "to bring about",
      breakdown: "造成 (zào chéng) - to bring about",
    },
    {
      char: "则",
      pinyin: "zé",
      meaning:
        "conjunction used to express contrast with a previous sentence or clause",
      breakdown:
        "则 (zé) - conjunction used to express contrast with a previous sentence or clause",
    },
    {
      char: "责备",
      pinyin: "zé bèi",
      meaning: "to blame",
      breakdown: "责备 (zé bèi) - to blame",
    },
    {
      char: "摘",
      pinyin: "zhāi",
      meaning: "to take",
      breakdown: "摘 (zhāi) - to take",
    },
    {
      char: "粘贴",
      pinyin: "zhān tiē",
      meaning: "to stick",
      breakdown: "粘贴 (zhān tiē) - to stick",
    },
    {
      char: "展开",
      pinyin: "zhǎn kāi",
      meaning: "to unfold",
      breakdown: "展开 (zhǎn kāi) - to unfold",
    },
    {
      char: "展览",
      pinyin: "zhǎn lǎn",
      meaning: "to put on display",
      breakdown: "展览 (zhǎn lǎn) - to put on display",
    },
    {
      char: "战争",
      pinyin: "zhàn zhēng",
      meaning: "war",
      breakdown: "战争 (zhàn zhēng) - war",
    },
    {
      char: "占线",
      pinyin: "zhàn xiàn",
      meaning: "busy (telephone line)",
      breakdown: "占线 (zhàn xiàn) - busy (telephone line)",
    },
    {
      char: "涨",
      pinyin: "zhǎng",
      meaning: "to rise (of prices)",
      breakdown: "涨 (zhǎng) - to rise (of prices)",
    },
    {
      char: "掌握",
      pinyin: "zhǎng wò",
      meaning: "to grasp (often fig.)",
      breakdown: "掌握 (zhǎng wò) - to grasp (often fig.)",
    },
    {
      char: "账户",
      pinyin: "zhàng hù",
      meaning: "bank account",
      breakdown: "账户 (zhàng hù) - bank account",
    },
    {
      char: "招待",
      pinyin: "zhāo dài",
      meaning: "to receive (guests)",
      breakdown: "招待 (zhāo dài) - to receive (guests)",
    },
    {
      char: "着凉",
      pinyin: "zháo liáng",
      meaning: "to catch cold",
      breakdown: "着凉 (zháo liáng) - to catch cold",
    },
    {
      char: "照常",
      pinyin: "zhào cháng",
      meaning: "(business etc) as usual",
      breakdown: "照常 (zhào cháng) - (business etc) as usual",
    },
    {
      char: "召开",
      pinyin: "zhào kāi",
      meaning: "to convene (a conference or meeting)",
      breakdown: "召开 (zhào kāi) - to convene (a conference or meeting)",
    },
    {
      char: "哲学",
      pinyin: "zhé xué",
      meaning: "philosophy",
      breakdown: "哲学 (zhé xué) - philosophy",
    },
    {
      char: "真理",
      pinyin: "zhēn lǐ",
      meaning: "truth",
      breakdown: "真理 (zhēn lǐ) - truth",
    },
    {
      char: "真实",
      pinyin: "zhēn shí",
      meaning: "true",
      breakdown: "真实 (zhēn shí) - true",
    },
    {
      char: "针对",
      pinyin: "zhēn duì",
      meaning: "to be directed against",
      breakdown: "针对 (zhēn duì) - to be directed against",
    },
    {
      char: "珍惜",
      pinyin: "zhēn xī",
      meaning: "to treasure",
      breakdown: "珍惜 (zhēn xī) - to treasure",
    },
    {
      char: "诊断",
      pinyin: "zhěn duàn",
      meaning: "diagnosis",
      breakdown: "诊断 (zhěn duàn) - diagnosis",
    },
    {
      char: "枕头",
      pinyin: "zhěn tou",
      meaning: "pillow",
      breakdown: "枕头 (zhěn tou) - pillow",
    },
    {
      char: "阵",
      pinyin: "zhèn",
      meaning: "disposition of troops",
      breakdown: "阵 (zhèn) - disposition of troops",
    },
    {
      char: "振动",
      pinyin: "zhèn dòng",
      meaning: "vibration",
      breakdown: "振动 (zhèn dòng) - vibration",
    },
    {
      char: "睁",
      pinyin: "zhēng",
      meaning: "to open (one's eyes)",
      breakdown: "睁 (zhēng) - to open (one's eyes)",
    },
    {
      char: "争论",
      pinyin: "zhēng lùn",
      meaning: "to argue",
      breakdown: "争论 (zhēng lùn) - to argue",
    },
    {
      char: "争取",
      pinyin: "zhēng qǔ",
      meaning: "to fight for",
      breakdown: "争取 (zhēng qǔ) - to fight for",
    },
    {
      char: "征求",
      pinyin: "zhēng qiú",
      meaning: "to solicit",
      breakdown: "征求 (zhēng qiú) - to solicit",
    },
    {
      char: "整个",
      pinyin: "zhěng gè",
      meaning: "whole",
      breakdown: "整个 (zhěng gè) - whole",
    },
    {
      char: "整体",
      pinyin: "zhěng tǐ",
      meaning: "whole entity",
      breakdown: "整体 (zhěng tǐ) - whole entity",
    },
    {
      char: "正",
      pinyin: "zhèng",
      meaning: "just (right)",
      breakdown: "正 (zhèng) - just (right)",
    },
    {
      char: "政策",
      pinyin: "zhèng cè",
      meaning: "policy",
      breakdown: "政策 (zhèng cè) - policy",
    },
    {
      char: "政府",
      pinyin: "zhèng fǔ",
      meaning: "government",
      breakdown: "政府 (zhèng fǔ) - government",
    },
    {
      char: "政治",
      pinyin: "zhèng zhì",
      meaning: "politics",
      breakdown: "政治 (zhèng zhì) - politics",
    },
    {
      char: "证件",
      pinyin: "zhèng jiàn",
      meaning: "paperwork",
      breakdown: "证件 (zhèng jiàn) - paperwork",
    },
    {
      char: "证据",
      pinyin: "zhèng jù",
      meaning: "evidence",
      breakdown: "证据 (zhèng jù) - evidence",
    },
    {
      char: "挣钱",
      pinyin: "zhèng qián",
      meaning: "to make money",
      breakdown: "挣钱 (zhèng qián) - to make money",
    },
    {
      char: "支",
      pinyin: "zhī",
      meaning: "to support",
      breakdown: "支 (zhī) - to support",
    },
    {
      char: "支票",
      pinyin: "zhī piào",
      meaning: "check (bank)",
      breakdown: "支票 (zhī piào) - check (bank)",
    },
    {
      char: "直",
      pinyin: "zhí",
      meaning: "straight",
      breakdown: "直 (zhí) - straight",
    },
    {
      char: "执行",
      pinyin: "zhí xíng",
      meaning: "to implement",
      breakdown: "执行 (zhí xíng) - to implement",
    },
    {
      char: "执照",
      pinyin: "zhí zhào",
      meaning: "a license",
      breakdown: "执照 (zhí zhào) - a license",
    },
    {
      char: "指导",
      pinyin: "zhǐ dǎo",
      meaning: "to guide",
      breakdown: "指导 (zhǐ dǎo) - to guide",
    },
    {
      char: "指挥",
      pinyin: "zhǐ huī",
      meaning: "to conduct",
      breakdown: "指挥 (zhǐ huī) - to conduct",
    },
    {
      char: "制定",
      pinyin: "zhì dìng",
      meaning: "to draw up",
      breakdown: "制定 (zhì dìng) - to draw up",
    },
    {
      char: "制度",
      pinyin: "zhì dù",
      meaning: "system (e.g. political)",
      breakdown: "制度 (zhì dù) - system (e.g. political)",
    },
    {
      char: "制作",
      pinyin: "zhì zuò",
      meaning: "to make",
      breakdown: "制作 (zhì zuò) - to make",
    },
    {
      char: "智慧",
      pinyin: "zhì huì",
      meaning: "wisdom",
      breakdown: "智慧 (zhì huì) - wisdom",
    },
    {
      char: "至今",
      pinyin: "zhì jīn",
      meaning: "so far",
      breakdown: "至今 (zhì jīn) - so far",
    },
    {
      char: "至于",
      pinyin: "zhì yú",
      meaning: "as for",
      breakdown: "至于 (zhì yú) - as for",
    },
    {
      char: "治疗",
      pinyin: "zhì liáo",
      meaning: "to treat",
      breakdown: "治疗 (zhì liáo) - to treat",
    },
    {
      char: "志愿者",
      pinyin: "zhì yuàn zhě",
      meaning: "volunteer",
      breakdown: "志愿者 (zhì yuàn zhě) - volunteer",
    },
    {
      char: "秩序",
      pinyin: "zhì xù",
      meaning: "order (orderly)",
      breakdown: "秩序 (zhì xù) - order (orderly)",
    },
    {
      char: "钟",
      pinyin: "zhōng",
      meaning: "clock",
      breakdown: "钟 (zhōng) - clock",
    },
    {
      char: "中介",
      pinyin: "zhōng jiè",
      meaning: "to act as intermediary",
      breakdown: "中介 (zhōng jiè) - to act as intermediary",
    },
    {
      char: "中心",
      pinyin: "zhōng xīn",
      meaning: "center",
      breakdown: "中心 (zhōng xīn) - center",
    },
    {
      char: "中旬",
      pinyin: "zhōng xún",
      meaning: "middle third of a month",
      breakdown: "中旬 (zhōng xún) - middle third of a month",
    },
    {
      char: "重",
      pinyin: "zhòng",
      meaning: "heavy",
      breakdown: "重 (zhòng) - heavy",
    },
    {
      char: "重量",
      pinyin: "zhòng liàng",
      meaning: "weight",
      breakdown: "重量 (zhòng liàng) - weight",
    },
    {
      char: "周到",
      pinyin: "zhōu dao",
      meaning: "thoughtful",
      breakdown: "周到 (zhōu dao) - thoughtful",
    },
    {
      char: "逐步",
      pinyin: "zhú bù",
      meaning: "progressively",
      breakdown: "逐步 (zhú bù) - progressively",
    },
    {
      char: "竹子",
      pinyin: "zhú zi",
      meaning: "bamboo",
      breakdown: "竹子 (zhú zi) - bamboo",
    },
    {
      char: "煮",
      pinyin: "zhǔ",
      meaning: "to cook",
      breakdown: "煮 (zhǔ) - to cook",
    },
    {
      char: "主持",
      pinyin: "zhǔ chí",
      meaning: "to take charge of",
      breakdown: "主持 (zhǔ chí) - to take charge of",
    },
    {
      char: "主观",
      pinyin: "zhǔ guān",
      meaning: "subjective",
      breakdown: "主观 (zhǔ guān) - subjective",
    },
    {
      char: "主人",
      pinyin: "zhǔ rén",
      meaning: "master",
      breakdown: "主人 (zhǔ rén) - master",
    },
    {
      char: "主席",
      pinyin: "zhǔ xí",
      meaning: "chairperson",
      breakdown: "主席 (zhǔ xí) - chairperson",
    },
    {
      char: "主张",
      pinyin: "zhǔ zhāng",
      meaning: "to advocate",
      breakdown: "主张 (zhǔ zhāng) - to advocate",
    },
    {
      char: "嘱咐",
      pinyin: "zhǔ fù",
      meaning: "to tell",
      breakdown: "嘱咐 (zhǔ fù) - to tell",
    },
    {
      char: "祝福",
      pinyin: "zhù fú",
      meaning: "blessings",
      breakdown: "祝福 (zhù fú) - blessings",
    },
    {
      char: "注册",
      pinyin: "zhù cè",
      meaning: "to register",
      breakdown: "注册 (zhù cè) - to register",
    },
    {
      char: "抓紧",
      pinyin: "zhuā jǐn",
      meaning: "to grasp firmly",
      breakdown: "抓紧 (zhuā jǐn) - to grasp firmly",
    },
    {
      char: "专家",
      pinyin: "zhuān jiā",
      meaning: "expert",
      breakdown: "专家 (zhuān jiā) - expert",
    },
    {
      char: "专心",
      pinyin: "zhuān xīn",
      meaning: "to concentrate",
      breakdown: "专心 (zhuān xīn) - to concentrate",
    },
    {
      char: "转变",
      pinyin: "zhuǎn biàn",
      meaning: "to change",
      breakdown: "转变 (zhuǎn biàn) - to change",
    },
    {
      char: "转告",
      pinyin: "zhuǎn gào",
      meaning: "to pass on",
      breakdown: "转告 (zhuǎn gào) - to pass on",
    },
    {
      char: "装",
      pinyin: "zhuāng",
      meaning: "adornment",
      breakdown: "装 (zhuāng) - adornment",
    },
    {
      char: "装饰",
      pinyin: "zhuāng shì",
      meaning: "to decorate",
      breakdown: "装饰 (zhuāng shì) - to decorate",
    },
    {
      char: "状况",
      pinyin: "zhuàng kuàng",
      meaning: "condition",
      breakdown: "状况 (zhuàng kuàng) - condition",
    },
    {
      char: "状态",
      pinyin: "zhuàng tài",
      meaning: "state of affairs",
      breakdown: "状态 (zhuàng tài) - state of affairs",
    },
    {
      char: "追求",
      pinyin: "zhuī qiú",
      meaning: "to pursue (a goal etc) stubbornly",
      breakdown: "追求 (zhuī qiú) - to pursue (a goal etc) stubbornly",
    },
    {
      char: "资格",
      pinyin: "zī gé",
      meaning: "qualifications",
      breakdown: "资格 (zī gé) - qualifications",
    },
    {
      char: "资金",
      pinyin: "zī jīn",
      meaning: "funds",
      breakdown: "资金 (zī jīn) - funds",
    },
    {
      char: "资料",
      pinyin: "zī liào",
      meaning: "material",
      breakdown: "资料 (zī liào) - material",
    },
    {
      char: "资源",
      pinyin: "zī yuán",
      meaning: "natural resource (such as water or minerals)",
      breakdown:
        "资源 (zī yuán) - natural resource (such as water or minerals)",
    },
    {
      char: "姿势",
      pinyin: "zī shì",
      meaning: "posture",
      breakdown: "姿势 (zī shì) - posture",
    },
    {
      char: "咨询",
      pinyin: "zī xún",
      meaning: "to consult",
      breakdown: "咨询 (zī xún) - to consult",
    },
    {
      char: "紫",
      pinyin: "zǐ",
      meaning: "purple",
      breakdown: "紫 (zǐ) - purple",
    },
    {
      char: "字幕",
      pinyin: "zì mù",
      meaning: "caption",
      breakdown: "字幕 (zì mù) - caption",
    },
    {
      char: "自从",
      pinyin: "zì cóng",
      meaning: "since (a time)",
      breakdown: "自从 (zì cóng) - since (a time)",
    },
    {
      char: "自动",
      pinyin: "zì dòng",
      meaning: "automatic",
      breakdown: "自动 (zì dòng) - automatic",
    },
    {
      char: "自豪",
      pinyin: "zì háo",
      meaning: "(feel a sense of) pride",
      breakdown: "自豪 (zì háo) - (feel a sense of) pride",
    },
    {
      char: "自觉",
      pinyin: "zì jué",
      meaning: "conscious",
      breakdown: "自觉 (zì jué) - conscious",
    },
    {
      char: "自私",
      pinyin: "zì sī",
      meaning: "selfish",
      breakdown: "自私 (zì sī) - selfish",
    },
    {
      char: "自信",
      pinyin: "zì xìn",
      meaning: "to have confidence in oneself",
      breakdown: "自信 (zì xìn) - to have confidence in oneself",
    },
    {
      char: "自由",
      pinyin: "zì yóu",
      meaning: "freedom",
      breakdown: "自由 (zì yóu) - freedom",
    },
    {
      char: "自愿",
      pinyin: "zì yuàn",
      meaning: "voluntary",
      breakdown: "自愿 (zì yuàn) - voluntary",
    },
    {
      char: "综合",
      pinyin: "zōng hé",
      meaning: "comprehensive",
      breakdown: "综合 (zōng hé) - comprehensive",
    },
    {
      char: "宗教",
      pinyin: "zōng jiào",
      meaning: "religion",
      breakdown: "宗教 (zōng jiào) - religion",
    },
    {
      char: "总裁",
      pinyin: "zǒng cái",
      meaning: "chairman",
      breakdown: "总裁 (zǒng cái) - chairman",
    },
    {
      char: "总共",
      pinyin: "zǒng gòng",
      meaning: "altogether",
      breakdown: "总共 (zǒng gòng) - altogether",
    },
    {
      char: "总理",
      pinyin: "zǒng lǐ",
      meaning: "premier",
      breakdown: "总理 (zǒng lǐ) - premier",
    },
    {
      char: "总算",
      pinyin: "zǒng suàn",
      meaning: "at long last",
      breakdown: "总算 (zǒng suàn) - at long last",
    },
    {
      char: "总统",
      pinyin: "zǒng tǒng",
      meaning: "president (of a country)",
      breakdown: "总统 (zǒng tǒng) - president (of a country)",
    },
    {
      char: "总之",
      pinyin: "zǒng zhī",
      meaning: "in a word",
      breakdown: "总之 (zǒng zhī) - in a word",
    },
    {
      char: "组合",
      pinyin: "zǔ hé",
      meaning: "to assemble",
      breakdown: "组合 (zǔ hé) - to assemble",
    },
    {
      char: "阻止",
      pinyin: "zǔ zhǐ",
      meaning: "to prevent",
      breakdown: "阻止 (zǔ zhǐ) - to prevent",
    },
    {
      char: "祖国",
      pinyin: "zǔ guó",
      meaning: "ancestral land CL:個|个[gè]",
      breakdown: "祖国 (zǔ guó) - ancestral land CL:個|个[gè]",
    },
    {
      char: "祖先",
      pinyin: "zǔ xiān",
      meaning: "ancestor",
      breakdown: "祖先 (zǔ xiān) - ancestor",
    },
    {
      char: "醉",
      pinyin: "zuì",
      meaning: "intoxicated",
      breakdown: "醉 (zuì) - intoxicated",
    },
    {
      char: "最初",
      pinyin: "zuì chū",
      meaning: "first",
      breakdown: "最初 (zuì chū) - first",
    },
    {
      char: "罪犯",
      pinyin: "zuì fàn",
      meaning: "criminal",
      breakdown: "罪犯 (zuì fàn) - criminal",
    },
    {
      char: "尊敬",
      pinyin: "zūn jìng",
      meaning: "respect",
      breakdown: "尊敬 (zūn jìng) - respect",
    },
    {
      char: "遵守",
      pinyin: "zūn shǒu",
      meaning: "to comply with",
      breakdown: "遵守 (zūn shǒu) - to comply with",
    },
    {
      char: "作品",
      pinyin: "zuò pǐn",
      meaning: "work (of art)",
      breakdown: "作品 (zuò pǐn) - work (of art)",
    },
    {
      char: "作为",
      pinyin: "zuò wéi",
      meaning: "one's conduct",
      breakdown: "作为 (zuò wéi) - one's conduct",
    },
  ],
  hsk6: [
    {
      char: "哎哟",
      pinyin: "āi yō",
      meaning: "hey",
      breakdown: "哎哟 (āi yō) - hey",
    },
    {
      char: "挨",
      pinyin: "ái",
      meaning: "to suffer",
      breakdown: "挨 (ái) - to suffer",
    },
    {
      char: "癌症",
      pinyin: "ái zhèng",
      meaning: "cancer",
      breakdown: "癌症 (ái zhèng) - cancer",
    },
    {
      char: "爱不释手",
      pinyin: "ài bù shì shǒu",
      meaning: "to love sth too much to part with it (idiom)",
      breakdown:
        "爱不释手 (ài bù shì shǒu) - to love sth too much to part with it (idiom)",
    },
    {
      char: "爱戴",
      pinyin: "ài dài",
      meaning: "to love and respect",
      breakdown: "爱戴 (ài dài) - to love and respect",
    },
    {
      char: "暧昧",
      pinyin: "ài mèi",
      meaning: "vague",
      breakdown: "暧昧 (ài mèi) - vague",
    },
    {
      char: "安居乐业",
      pinyin: "ān jū lè yè",
      meaning: "live in peace and work happily (idiom)",
      breakdown:
        "安居乐业 (ān jū lè yè) - live in peace and work happily (idiom)",
    },
    {
      char: "安宁",
      pinyin: "ān níng",
      meaning: "peaceful",
      breakdown: "安宁 (ān níng) - peaceful",
    },
    {
      char: "安详",
      pinyin: "ān xiáng",
      meaning: "serene",
      breakdown: "安详 (ān xiáng) - serene",
    },
    {
      char: "安置",
      pinyin: "ān zhì",
      meaning: "to find a place for",
      breakdown: "安置 (ān zhì) - to find a place for",
    },
    {
      char: "暗示",
      pinyin: "àn shì",
      meaning: "to hint",
      breakdown: "暗示 (àn shì) - to hint",
    },
    {
      char: "案件",
      pinyin: "àn jiàn",
      meaning: "law case",
      breakdown: "案件 (àn jiàn) - law case",
    },
    {
      char: "案例",
      pinyin: "àn lì",
      meaning: "case (law)",
      breakdown: "案例 (àn lì) - case (law)",
    },
    {
      char: "按摩",
      pinyin: "àn mó",
      meaning: "massage",
      breakdown: "按摩 (àn mó) - massage",
    },
    {
      char: "昂贵",
      pinyin: "áng guì",
      meaning: "expensive",
      breakdown: "昂贵 (áng guì) - expensive",
    },
    {
      char: "凹凸",
      pinyin: "āo tū",
      meaning: "bumpy",
      breakdown: "凹凸 (āo tū) - bumpy",
    },
    {
      char: "熬",
      pinyin: "áo",
      meaning: "to cook on a slow fire",
      breakdown: "熬 (áo) - to cook on a slow fire",
    },
    {
      char: "奥秘",
      pinyin: "ào mì",
      meaning: "secret",
      breakdown: "奥秘 (ào mì) - secret",
    },
    {
      char: "扒",
      pinyin: "bā",
      meaning: "to hold on to",
      breakdown: "扒 (bā) - to hold on to",
    },
    { char: "疤", pinyin: "bā", meaning: "scar", breakdown: "疤 (bā) - scar" },
    {
      char: "巴不得",
      pinyin: "bā bù dé",
      meaning: "to be eager for",
      breakdown: "巴不得 (bā bù dé) - to be eager for",
    },
    {
      char: "巴结",
      pinyin: "bā jie",
      meaning: "to fawn on",
      breakdown: "巴结 (bā jie) - to fawn on",
    },
    {
      char: "拔苗助长",
      pinyin: "bá miáo zhù zhǎng",
      meaning: "to spoil things through excessive enthusiasm (idiom)",
      breakdown:
        "拔苗助长 (bá miáo zhù zhǎng) - to spoil things through excessive enthusiasm (idiom)",
    },
    {
      char: "把关",
      pinyin: "bǎ guān",
      meaning: "to guard a pass",
      breakdown: "把关 (bǎ guān) - to guard a pass",
    },
    {
      char: "把手",
      pinyin: "bǎ shǒu",
      meaning: "handle",
      breakdown: "把手 (bǎ shǒu) - handle",
    },
    {
      char: "把戏",
      pinyin: "bǎ xì",
      meaning: "acrobatics",
      breakdown: "把戏 (bǎ xì) - acrobatics",
    },
    {
      char: "霸道",
      pinyin: "bà dào",
      meaning: "the Way of the Hegemon",
      breakdown: "霸道 (bà dào) - the Way of the Hegemon",
    },
    {
      char: "罢工",
      pinyin: "bà gōng",
      meaning: "a strike",
      breakdown: "罢工 (bà gōng) - a strike",
    },
    {
      char: "掰",
      pinyin: "bāi",
      meaning: "to break with both hands",
      breakdown: "掰 (bāi) - to break with both hands",
    },
    {
      char: "百分点",
      pinyin: "bǎi fēn diǎn",
      meaning: "percentage point",
      breakdown: "百分点 (bǎi fēn diǎn) - percentage point",
    },
    {
      char: "摆脱",
      pinyin: "bǎi tuō",
      meaning: "to break away from",
      breakdown: "摆脱 (bǎi tuō) - to break away from",
    },
    {
      char: "拜访",
      pinyin: "bài fǎng",
      meaning: "to pay a visit",
      breakdown: "拜访 (bài fǎng) - to pay a visit",
    },
    {
      char: "拜年",
      pinyin: "bài nián",
      meaning: "pay a New Year call",
      breakdown: "拜年 (bài nián) - pay a New Year call",
    },
    {
      char: "拜托",
      pinyin: "bài tuō",
      meaning: "to request sb to do sth",
      breakdown: "拜托 (bài tuō) - to request sb to do sth",
    },
    {
      char: "败坏",
      pinyin: "bài huài",
      meaning: "to ruin",
      breakdown: "败坏 (bài huài) - to ruin",
    },
    {
      char: "颁布",
      pinyin: "bān bù",
      meaning: "to issue",
      breakdown: "颁布 (bān bù) - to issue",
    },
    {
      char: "颁发",
      pinyin: "bān fā",
      meaning: "to issue",
      breakdown: "颁发 (bān fā) - to issue",
    },
    {
      char: "斑纹",
      pinyin: "bān wén",
      meaning: "stripe",
      breakdown: "斑纹 (bān wén) - stripe",
    },
    {
      char: "版本",
      pinyin: "bǎn běn",
      meaning: "version",
      breakdown: "版本 (bǎn běn) - version",
    },
    {
      char: "半途而废",
      pinyin: "bàn tú ér fèi",
      meaning: "to give up halfway (idiom); leave sth unfinished",
      breakdown:
        "半途而废 (bàn tú ér fèi) - to give up halfway (idiom); leave sth unfinished",
    },
    {
      char: "伴侣",
      pinyin: "bàn lǚ",
      meaning: "companion",
      breakdown: "伴侣 (bàn lǚ) - companion",
    },
    {
      char: "伴随",
      pinyin: "bàn suí",
      meaning: "to accompany",
      breakdown: "伴随 (bàn suí) - to accompany",
    },
    {
      char: "扮演",
      pinyin: "bàn yǎn",
      meaning: "to play the role of",
      breakdown: "扮演 (bàn yǎn) - to play the role of",
    },
    {
      char: "绑架",
      pinyin: "bǎng jià",
      meaning: "to kidnap",
      breakdown: "绑架 (bǎng jià) - to kidnap",
    },
    {
      char: "榜样",
      pinyin: "bǎng yàng",
      meaning: "example",
      breakdown: "榜样 (bǎng yàng) - example",
    },
    {
      char: "磅",
      pinyin: "bàng",
      meaning: "see 磅秤 scale",
      breakdown: "磅 (bàng) - see 磅秤 scale",
    },
    {
      char: "包庇",
      pinyin: "bāo bì",
      meaning: "to shield",
      breakdown: "包庇 (bāo bì) - to shield",
    },
    {
      char: "包袱",
      pinyin: "bāo fu",
      meaning: "cloth-wrapper",
      breakdown: "包袱 (bāo fu) - cloth-wrapper",
    },
    {
      char: "包围",
      pinyin: "bāo wéi",
      meaning: "to surround",
      breakdown: "包围 (bāo wéi) - to surround",
    },
    {
      char: "包装",
      pinyin: "bāo zhuāng",
      meaning: "to pack",
      breakdown: "包装 (bāo zhuāng) - to pack",
    },
    {
      char: "饱和",
      pinyin: "bǎo hé",
      meaning: "saturation",
      breakdown: "饱和 (bǎo hé) - saturation",
    },
    {
      char: "饱经沧桑",
      pinyin: "bǎo jīng cāng sāng",
      meaning: "having lived through many changes",
      breakdown:
        "饱经沧桑 (bǎo jīng cāng sāng) - having lived through many changes",
    },
    {
      char: "保管",
      pinyin: "bǎo guǎn",
      meaning: "to assure",
      breakdown: "保管 (bǎo guǎn) - to assure",
    },
    {
      char: "保密",
      pinyin: "bǎo mì",
      meaning: "to keep sth confidential",
      breakdown: "保密 (bǎo mì) - to keep sth confidential",
    },
    {
      char: "保姆",
      pinyin: "bǎo mǔ",
      meaning: "nanny",
      breakdown: "保姆 (bǎo mǔ) - nanny",
    },
    {
      char: "保守",
      pinyin: "bǎo shǒu",
      meaning: "(politically) conservative",
      breakdown: "保守 (bǎo shǒu) - (politically) conservative",
    },
    {
      char: "保卫",
      pinyin: "bǎo wèi",
      meaning: "to defend",
      breakdown: "保卫 (bǎo wèi) - to defend",
    },
    {
      char: "保养",
      pinyin: "bǎo yǎng",
      meaning: "to take good care of (or conserve) one's health",
      breakdown:
        "保养 (bǎo yǎng) - to take good care of (or conserve) one's health",
    },
    {
      char: "保障",
      pinyin: "bǎo zhàng",
      meaning: "to ensure",
      breakdown: "保障 (bǎo zhàng) - to ensure",
    },
    {
      char: "保重",
      pinyin: "bǎo zhòng",
      meaning: "to take care of oneself",
      breakdown: "保重 (bǎo zhòng) - to take care of oneself",
    },
    {
      char: "抱负",
      pinyin: "bào fù",
      meaning: "aspiration",
      breakdown: "抱负 (bào fù) - aspiration",
    },
    {
      char: "抱怨",
      pinyin: "bào yuàn",
      meaning: "to complain",
      breakdown: "抱怨 (bào yuàn) - to complain",
    },
    {
      char: "报仇",
      pinyin: "bào chóu",
      meaning: "to take revenge",
      breakdown: "报仇 (bào chóu) - to take revenge",
    },
    {
      char: "报酬",
      pinyin: "bào chóu",
      meaning: "reward",
      breakdown: "报酬 (bào chóu) - reward",
    },
    {
      char: "报答",
      pinyin: "bào dá",
      meaning: "to repay",
      breakdown: "报答 (bào dá) - to repay",
    },
    {
      char: "报到",
      pinyin: "bào dào",
      meaning: "to report for duty",
      breakdown: "报到 (bào dào) - to report for duty",
    },
    {
      char: "报复",
      pinyin: "bào fù",
      meaning: "to make reprisals",
      breakdown: "报复 (bào fù) - to make reprisals",
    },
    {
      char: "报社",
      pinyin: "bào shè",
      meaning: "general office of a newspaper",
      breakdown: "报社 (bào shè) - general office of a newspaper",
    },
    {
      char: "报销",
      pinyin: "bào xiāo",
      meaning: "to submit an expense account",
      breakdown: "报销 (bào xiāo) - to submit an expense account",
    },
    {
      char: "爆发",
      pinyin: "bào fā",
      meaning: "to break out",
      breakdown: "爆发 (bào fā) - to break out",
    },
    {
      char: "爆炸",
      pinyin: "bào zhà",
      meaning: "explosion",
      breakdown: "爆炸 (bào zhà) - explosion",
    },
    {
      char: "曝光",
      pinyin: "bào guāng",
      meaning: "light meter",
      breakdown: "曝光 (bào guāng) - light meter",
    },
    {
      char: "暴力",
      pinyin: "bào lì",
      meaning: "violence",
      breakdown: "暴力 (bào lì) - violence",
    },
    {
      char: "暴露",
      pinyin: "bào lù",
      meaning: "to expose",
      breakdown: "暴露 (bào lù) - to expose",
    },
    {
      char: "悲哀",
      pinyin: "bēi āi",
      meaning: "grieved",
      breakdown: "悲哀 (bēi āi) - grieved",
    },
    {
      char: "悲惨",
      pinyin: "bēi cǎn",
      meaning: "miserable",
      breakdown: "悲惨 (bēi cǎn) - miserable",
    },
    {
      char: "卑鄙",
      pinyin: "bēi bǐ",
      meaning: "base",
      breakdown: "卑鄙 (bēi bǐ) - base",
    },
    {
      char: "北极",
      pinyin: "běi jí",
      meaning: "the North Pole",
      breakdown: "北极 (běi jí) - the North Pole",
    },
    {
      char: "被动",
      pinyin: "bèi dòng",
      meaning: "passive",
      breakdown: "被动 (bèi dòng) - passive",
    },
    {
      char: "被告",
      pinyin: "bèi gào",
      meaning: "defendant",
      breakdown: "被告 (bèi gào) - defendant",
    },
    {
      char: "背叛",
      pinyin: "bèi pàn",
      meaning: "to betray",
      breakdown: "背叛 (bèi pàn) - to betray",
    },
    {
      char: "背诵",
      pinyin: "bèi sòng",
      meaning: "recite",
      breakdown: "背诵 (bèi sòng) - recite",
    },
    {
      char: "备份",
      pinyin: "bèi fèn",
      meaning: "backup",
      breakdown: "备份 (bèi fèn) - backup",
    },
    {
      char: "备忘录",
      pinyin: "bèi wàng lù",
      meaning: "memorandum",
      breakdown: "备忘录 (bèi wàng lù) - memorandum",
    },
    {
      char: "贝壳",
      pinyin: "bèi ké",
      meaning: "shell",
      breakdown: "贝壳 (bèi ké) - shell",
    },
    {
      char: "奔波",
      pinyin: "bēn bō",
      meaning: "to rush about",
      breakdown: "奔波 (bēn bō) - to rush about",
    },
    {
      char: "奔驰",
      pinyin: "bēn chí",
      meaning: "to run quickly",
      breakdown: "奔驰 (bēn chí) - to run quickly",
    },
    {
      char: "本能",
      pinyin: "běn néng",
      meaning: "instinct",
      breakdown: "本能 (běn néng) - instinct",
    },
    {
      char: "本钱",
      pinyin: "běn qián",
      meaning: "capital",
      breakdown: "本钱 (běn qián) - capital",
    },
    {
      char: "本人",
      pinyin: "běn rén",
      meaning: "the person himself",
      breakdown: "本人 (běn rén) - the person himself",
    },
    {
      char: "本身",
      pinyin: "běn shēn",
      meaning: "itself",
      breakdown: "本身 (běn shēn) - itself",
    },
    {
      char: "本事",
      pinyin: "běn shi",
      meaning: "ability",
      breakdown: "本事 (běn shi) - ability",
    },
    {
      char: "本着",
      pinyin: "běn zhe",
      meaning: "based on...",
      breakdown: "本着 (běn zhe) - based on...",
    },
    {
      char: "笨拙",
      pinyin: "bèn zhuō",
      meaning: "clumsy",
      breakdown: "笨拙 (bèn zhuō) - clumsy",
    },
    {
      char: "崩溃",
      pinyin: "bēng kuì",
      meaning: "to collapse",
      breakdown: "崩溃 (bēng kuì) - to collapse",
    },
    {
      char: "甭",
      pinyin: "béng",
      meaning: "need not",
      breakdown: "甭 (béng) - need not",
    },
    {
      char: "蹦",
      pinyin: "bèng",
      meaning: "to jump",
      breakdown: "蹦 (bèng) - to jump",
    },
    {
      char: "迸发",
      pinyin: "bèng fā",
      meaning: "to burst forth",
      breakdown: "迸发 (bèng fā) - to burst forth",
    },
    {
      char: "逼迫",
      pinyin: "bī pò",
      meaning: "to force",
      breakdown: "逼迫 (bī pò) - to force",
    },
    {
      char: "鼻涕",
      pinyin: "bí tì",
      meaning: "nasal mucus",
      breakdown: "鼻涕 (bí tì) - nasal mucus",
    },
    {
      char: "比方",
      pinyin: "bǐ fang",
      meaning: "analogy",
      breakdown: "比方 (bǐ fang) - analogy",
    },
    {
      char: "比喻",
      pinyin: "bǐ yù",
      meaning: "to compare",
      breakdown: "比喻 (bǐ yù) - to compare",
    },
    {
      char: "比重",
      pinyin: "bǐ zhòng",
      meaning: "proportion",
      breakdown: "比重 (bǐ zhòng) - proportion",
    },
    { char: "臂", pinyin: "bì", meaning: "arm", breakdown: "臂 (bì) - arm" },
    {
      char: "弊病",
      pinyin: "bì bìng",
      meaning: "malady",
      breakdown: "弊病 (bì bìng) - malady",
    },
    {
      char: "弊端",
      pinyin: "bì duān",
      meaning: "malpractice",
      breakdown: "弊端 (bì duān) - malpractice",
    },
    {
      char: "必定",
      pinyin: "bì dìng",
      meaning: "be bound to",
      breakdown: "必定 (bì dìng) - be bound to",
    },
    {
      char: "闭塞",
      pinyin: "bì sè",
      meaning: "to stop up",
      breakdown: "闭塞 (bì sè) - to stop up",
    },
    {
      char: "碧玉",
      pinyin: "bì yù",
      meaning: "jasper",
      breakdown: "碧玉 (bì yù) - jasper",
    },
    {
      char: "鞭策",
      pinyin: "biān cè",
      meaning: "to spur on",
      breakdown: "鞭策 (biān cè) - to spur on",
    },
    {
      char: "编织",
      pinyin: "biān zhī",
      meaning: "to weave",
      breakdown: "编织 (biān zhī) - to weave",
    },
    {
      char: "边疆",
      pinyin: "biān jiāng",
      meaning: "border area",
      breakdown: "边疆 (biān jiāng) - border area",
    },
    {
      char: "边界",
      pinyin: "biān jiè",
      meaning: "boundary",
      breakdown: "边界 (biān jiè) - boundary",
    },
    {
      char: "边境",
      pinyin: "biān jìng",
      meaning: "frontier",
      breakdown: "边境 (biān jìng) - frontier",
    },
    {
      char: "边缘",
      pinyin: "biān yuán",
      meaning: "edge",
      breakdown: "边缘 (biān yuán) - edge",
    },
    {
      char: "扁",
      pinyin: "biǎn",
      meaning: "flat",
      breakdown: "扁 (biǎn) - flat",
    },
    {
      char: "贬低",
      pinyin: "biǎn dī",
      meaning: "to belittle",
      breakdown: "贬低 (biǎn dī) - to belittle",
    },
    {
      char: "贬义",
      pinyin: "biǎn yì",
      meaning: "derogatory sense",
      breakdown: "贬义 (biǎn yì) - derogatory sense",
    },
    {
      char: "遍布",
      pinyin: "biàn bù",
      meaning: "to cover the whole (area)",
      breakdown: "遍布 (biàn bù) - to cover the whole (area)",
    },
    {
      char: "便利",
      pinyin: "biàn lì",
      meaning: "convenient",
      breakdown: "便利 (biàn lì) - convenient",
    },
    {
      char: "便条",
      pinyin: "biàn tiáo",
      meaning: "(informal) note",
      breakdown: "便条 (biàn tiáo) - (informal) note",
    },
    {
      char: "便于",
      pinyin: "biàn yú",
      meaning: "easy to",
      breakdown: "便于 (biàn yú) - easy to",
    },
    {
      char: "变故",
      pinyin: "biàn gù",
      meaning: "an unforeseen event",
      breakdown: "变故 (biàn gù) - an unforeseen event",
    },
    {
      char: "变迁",
      pinyin: "biàn qiān",
      meaning: "changes",
      breakdown: "变迁 (biàn qiān) - changes",
    },
    {
      char: "变质",
      pinyin: "biàn zhì",
      meaning: "to degenerate",
      breakdown: "变质 (biàn zhì) - to degenerate",
    },
    {
      char: "辩护",
      pinyin: "biàn hù",
      meaning: "to speak in defense of",
      breakdown: "辩护 (biàn hù) - to speak in defense of",
    },
    {
      char: "辩解",
      pinyin: "biàn jiě",
      meaning: "to explain",
      breakdown: "辩解 (biàn jiě) - to explain",
    },
    {
      char: "辩证",
      pinyin: "biàn zhèng",
      meaning: "to investigate",
      breakdown: "辩证 (biàn zhèng) - to investigate",
    },
    {
      char: "辨认",
      pinyin: "biàn rèn",
      meaning: "to recognize",
      breakdown: "辨认 (biàn rèn) - to recognize",
    },
    {
      char: "辫子",
      pinyin: "biàn zi",
      meaning: "plait",
      breakdown: "辫子 (biàn zi) - plait",
    },
    {
      char: "标本",
      pinyin: "biāo běn",
      meaning: "specimen",
      breakdown: "标本 (biāo běn) - specimen",
    },
    {
      char: "标记",
      pinyin: "biāo jì",
      meaning: "sign",
      breakdown: "标记 (biāo jì) - sign",
    },
    {
      char: "标题",
      pinyin: "biāo tí",
      meaning: "title",
      breakdown: "标题 (biāo tí) - title",
    },
    {
      char: "飙升",
      pinyin: "biāo shēng",
      meaning: "to rise rapidly",
      breakdown: "飙升 (biāo shēng) - to rise rapidly",
    },
    {
      char: "表决",
      pinyin: "biǎo jué",
      meaning: "to decide by vote",
      breakdown: "表决 (biǎo jué) - to decide by vote",
    },
    {
      char: "表态",
      pinyin: "biǎo tài",
      meaning: "to declare one's position",
      breakdown: "表态 (biǎo tài) - to declare one's position",
    },
    {
      char: "表彰",
      pinyin: "biǎo zhāng",
      meaning: "to honor",
      breakdown: "表彰 (biǎo zhāng) - to honor",
    },
    {
      char: "憋",
      pinyin: "biē",
      meaning: "to choke",
      breakdown: "憋 (biē) - to choke",
    },
    {
      char: "别墅",
      pinyin: "bié shù",
      meaning: "villa",
      breakdown: "别墅 (bié shù) - villa",
    },
    {
      char: "别致",
      pinyin: "bié zhì",
      meaning: "variant of 別緻|别致[bié zhì]",
      breakdown: "别致 (bié zhì) - variant of 別緻|别致[bié zhì]",
    },
    {
      char: "别扭",
      pinyin: "biè niu",
      meaning: "awkward",
      breakdown: "别扭 (biè niu) - awkward",
    },
    {
      char: "濒临",
      pinyin: "bīn lín",
      meaning: "on the verge of",
      breakdown: "濒临 (bīn lín) - on the verge of",
    },
    {
      char: "冰雹",
      pinyin: "bīng báo",
      meaning: "hail",
      breakdown: "冰雹 (bīng báo) - hail",
    },
    {
      char: "并存",
      pinyin: "bìng cún",
      meaning: "to exist at the same time",
      breakdown: "并存 (bìng cún) - to exist at the same time",
    },
    {
      char: "并非",
      pinyin: "bìng fēi",
      meaning: "really isn't",
      breakdown: "并非 (bìng fēi) - really isn't",
    },
    {
      char: "并列",
      pinyin: "bìng liè",
      meaning: "to stand side by side",
      breakdown: "并列 (bìng liè) - to stand side by side",
    },
    {
      char: "拨打",
      pinyin: "bō dǎ",
      meaning: "to call",
      breakdown: "拨打 (bō dǎ) - to call",
    },
    {
      char: "播放",
      pinyin: "bō fàng",
      meaning: "to broadcast",
      breakdown: "播放 (bō fàng) - to broadcast",
    },
    {
      char: "播种",
      pinyin: "bō zhǒng",
      meaning: "to sow seeds",
      breakdown: "播种 (bō zhǒng) - to sow seeds",
    },
    {
      char: "波浪",
      pinyin: "bō làng",
      meaning: "wave",
      breakdown: "波浪 (bō làng) - wave",
    },
    {
      char: "波涛汹涌",
      pinyin: "bō tāo xiōng yǒng",
      meaning: "waves surging forth",
      breakdown: "波涛汹涌 (bō tāo xiōng yǒng) - waves surging forth",
    },
    {
      char: "剥削",
      pinyin: "bō xuē",
      meaning: "to exploit",
      breakdown: "剥削 (bō xuē) - to exploit",
    },
    {
      char: "博大精深",
      pinyin: "bó dà jīng shēn",
      meaning: "wide-ranging and profound",
      breakdown: "博大精深 (bó dà jīng shēn) - wide-ranging and profound",
    },
    {
      char: "博览会",
      pinyin: "bó lǎn huì",
      meaning: "exposition",
      breakdown: "博览会 (bó lǎn huì) - exposition",
    },
    {
      char: "搏斗",
      pinyin: "bó dòu",
      meaning: "to wrestle",
      breakdown: "搏斗 (bó dòu) - to wrestle",
    },
    {
      char: "伯母",
      pinyin: "bó mǔ",
      meaning: "wife of father's elder brother",
      breakdown: "伯母 (bó mǔ) - wife of father's elder brother",
    },
    {
      char: "薄弱",
      pinyin: "bó ruò",
      meaning: "weak",
      breakdown: "薄弱 (bó ruò) - weak",
    },
    {
      char: "不顾",
      pinyin: "bù gù",
      meaning: "in spite of",
      breakdown: "不顾 (bù gù) - in spite of",
    },
    {
      char: "不愧",
      pinyin: "bù kuì",
      meaning: "to be worthy of",
      breakdown: "不愧 (bù kuì) - to be worthy of",
    },
    {
      char: "不料",
      pinyin: "bù liào",
      meaning: "unexpectedly",
      breakdown: "不料 (bù liào) - unexpectedly",
    },
    {
      char: "不像话",
      pinyin: "bù xiàng huà",
      meaning: "unreasonable",
      breakdown: "不像话 (bù xiàng huà) - unreasonable",
    },
    {
      char: "不屑一顾",
      pinyin: "bù xiè yī gù",
      meaning: "to disdain as beneath contempt",
      breakdown: "不屑一顾 (bù xiè yī gù) - to disdain as beneath contempt",
    },
    {
      char: "补偿",
      pinyin: "bǔ cháng",
      meaning: "to compensate",
      breakdown: "补偿 (bǔ cháng) - to compensate",
    },
    {
      char: "补救",
      pinyin: "bǔ jiù",
      meaning: "to remedy",
      breakdown: "补救 (bǔ jiù) - to remedy",
    },
    {
      char: "补贴",
      pinyin: "bǔ tiē",
      meaning: "to subsidize",
      breakdown: "补贴 (bǔ tiē) - to subsidize",
    },
    {
      char: "哺乳",
      pinyin: "bǔ rǔ",
      meaning: "breast feeding",
      breakdown: "哺乳 (bǔ rǔ) - breast feeding",
    },
    {
      char: "捕捉",
      pinyin: "bǔ zhuō",
      meaning: "to catch",
      breakdown: "捕捉 (bǔ zhuō) - to catch",
    },
    {
      char: "不得已",
      pinyin: "bù dé yǐ",
      meaning: "to act against one's will",
      breakdown: "不得已 (bù dé yǐ) - to act against one's will",
    },
    {
      char: "不妨",
      pinyin: "bù fáng",
      meaning: "there is no harm in",
      breakdown: "不妨 (bù fáng) - there is no harm in",
    },
    {
      char: "不敢当",
      pinyin: "bù gǎn dāng",
      meaning:
        "lit. I dare not (accept the honor); fig. I don't deserve your praise",
      breakdown:
        "不敢当 (bù gǎn dāng) - lit. I dare not (accept the honor); fig. I don't deserve your praise",
    },
    {
      char: "不禁",
      pinyin: "bù jīn",
      meaning: "can't help (doing sth)",
      breakdown: "不禁 (bù jīn) - can't help (doing sth)",
    },
    {
      char: "不堪",
      pinyin: "bù kān",
      meaning: "cannot bear",
      breakdown: "不堪 (bù kān) - cannot bear",
    },
    {
      char: "不可思议",
      pinyin: "bù kě sī yì",
      meaning: "inconceivable (idiom); unimaginable",
      breakdown: "不可思议 (bù kě sī yì) - inconceivable (idiom); unimaginable",
    },
    {
      char: "不时",
      pinyin: "bù shí",
      meaning: "from time to time",
      breakdown: "不时 (bù shí) - from time to time",
    },
    {
      char: "不惜",
      pinyin: "bù xī",
      meaning: "not stint",
      breakdown: "不惜 (bù xī) - not stint",
    },
    {
      char: "不相上下",
      pinyin: "bù xiāng shàng xià",
      meaning: "equally matched",
      breakdown: "不相上下 (bù xiāng shàng xià) - equally matched",
    },
    {
      char: "不言而喻",
      pinyin: "bù yán ér yù",
      meaning: "it goes without saying",
      breakdown: "不言而喻 (bù yán ér yù) - it goes without saying",
    },
    {
      char: "不由得",
      pinyin: "bù yóu de",
      meaning: "can't help",
      breakdown: "不由得 (bù yóu de) - can't help",
    },
    {
      char: "不择手段",
      pinyin: "bù zé shǒu duàn",
      meaning: "by fair means or foul",
      breakdown: "不择手段 (bù zé shǒu duàn) - by fair means or foul",
    },
    {
      char: "不止",
      pinyin: "bù zhǐ",
      meaning: "incessantly",
      breakdown: "不止 (bù zhǐ) - incessantly",
    },
    {
      char: "布告",
      pinyin: "bù gào",
      meaning: "posting on a bulletin board",
      breakdown: "布告 (bù gào) - posting on a bulletin board",
    },
    {
      char: "布局",
      pinyin: "bù jú",
      meaning: "arrangement",
      breakdown: "布局 (bù jú) - arrangement",
    },
    {
      char: "布置",
      pinyin: "bù zhì",
      meaning: "to put in order",
      breakdown: "布置 (bù zhì) - to put in order",
    },
    {
      char: "步伐",
      pinyin: "bù fá",
      meaning: "pace",
      breakdown: "步伐 (bù fá) - pace",
    },
    {
      char: "部署",
      pinyin: "bù shǔ",
      meaning: "to dispose",
      breakdown: "部署 (bù shǔ) - to dispose",
    },
    {
      char: "部位",
      pinyin: "bù wèi",
      meaning: "position",
      breakdown: "部位 (bù wèi) - position",
    },
    {
      char: "才干",
      pinyin: "cái gàn",
      meaning: "ability",
      breakdown: "才干 (cái gàn) - ability",
    },
    {
      char: "财富",
      pinyin: "cái fù",
      meaning: "wealth",
      breakdown: "财富 (cái fù) - wealth",
    },
    {
      char: "财务",
      pinyin: "cái wù",
      meaning: "financial affairs",
      breakdown: "财务 (cái wù) - financial affairs",
    },
    {
      char: "财政",
      pinyin: "cái zhèng",
      meaning: "finances (public)",
      breakdown: "财政 (cái zhèng) - finances (public)",
    },
    {
      char: "裁缝",
      pinyin: "cái féng",
      meaning: "tailor",
      breakdown: "裁缝 (cái féng) - tailor",
    },
    {
      char: "裁判",
      pinyin: "cái pàn",
      meaning: "judgment",
      breakdown: "裁判 (cái pàn) - judgment",
    },
    {
      char: "裁员",
      pinyin: "cái yuán",
      meaning: "to cut staff",
      breakdown: "裁员 (cái yuán) - to cut staff",
    },
    {
      char: "采购",
      pinyin: "cǎi gòu",
      meaning: "to procure (for an enterprise etc)",
      breakdown: "采购 (cǎi gòu) - to procure (for an enterprise etc)",
    },
    {
      char: "采集",
      pinyin: "cǎi jí",
      meaning: "to gather",
      breakdown: "采集 (cǎi jí) - to gather",
    },
    {
      char: "采纳",
      pinyin: "cǎi nà",
      meaning: "to accept",
      breakdown: "采纳 (cǎi nà) - to accept",
    },
    {
      char: "彩票",
      pinyin: "cǎi piào",
      meaning: "lottery ticket",
      breakdown: "彩票 (cǎi piào) - lottery ticket",
    },
    {
      char: "参谋",
      pinyin: "cān móu",
      meaning: "staff officer",
      breakdown: "参谋 (cān móu) - staff officer",
    },
    {
      char: "参照",
      pinyin: "cān zhào",
      meaning: "to consult a reference",
      breakdown: "参照 (cān zhào) - to consult a reference",
    },
    {
      char: "残酷",
      pinyin: "cán kù",
      meaning: "cruel",
      breakdown: "残酷 (cán kù) - cruel",
    },
    {
      char: "残留",
      pinyin: "cán liú",
      meaning: "to remain",
      breakdown: "残留 (cán liú) - to remain",
    },
    {
      char: "残忍",
      pinyin: "cán rěn",
      meaning: "cruel",
      breakdown: "残忍 (cán rěn) - cruel",
    },
    {
      char: "灿烂",
      pinyin: "càn làn",
      meaning: "to glitter",
      breakdown: "灿烂 (càn làn) - to glitter",
    },
    {
      char: "舱",
      pinyin: "cāng",
      meaning: "cabin",
      breakdown: "舱 (cāng) - cabin",
    },
    {
      char: "苍白",
      pinyin: "cāng bái",
      meaning: "pale",
      breakdown: "苍白 (cāng bái) - pale",
    },
    {
      char: "仓促",
      pinyin: "cāng cù",
      meaning: "all of a sudden",
      breakdown: "仓促 (cāng cù) - all of a sudden",
    },
    {
      char: "仓库",
      pinyin: "cāng kù",
      meaning: "depot",
      breakdown: "仓库 (cāng kù) - depot",
    },
    {
      char: "操劳",
      pinyin: "cāo láo",
      meaning: "to work hard",
      breakdown: "操劳 (cāo láo) - to work hard",
    },
    {
      char: "操练",
      pinyin: "cāo liàn",
      meaning: "drill",
      breakdown: "操练 (cāo liàn) - drill",
    },
    {
      char: "操纵",
      pinyin: "cāo zòng",
      meaning: "to operate",
      breakdown: "操纵 (cāo zòng) - to operate",
    },
    {
      char: "操作",
      pinyin: "cāo zuò",
      meaning: "to work",
      breakdown: "操作 (cāo zuò) - to work",
    },
    {
      char: "嘈杂",
      pinyin: "cáo zá",
      meaning: "noisy",
      breakdown: "嘈杂 (cáo zá) - noisy",
    },
    {
      char: "草案",
      pinyin: "cǎo àn",
      meaning: "draft (legislation)",
      breakdown: "草案 (cǎo àn) - draft (legislation)",
    },
    {
      char: "草率",
      pinyin: "cǎo shuài",
      meaning: "careless",
      breakdown: "草率 (cǎo shuài) - careless",
    },
    {
      char: "策划",
      pinyin: "cè huà",
      meaning: "to plot",
      breakdown: "策划 (cè huà) - to plot",
    },
    {
      char: "策略",
      pinyin: "cè lvè",
      meaning: "tactics",
      breakdown: "策略 (cè lvè) - tactics",
    },
    {
      char: "测量",
      pinyin: "cè liáng",
      meaning: "survey",
      breakdown: "测量 (cè liáng) - survey",
    },
    {
      char: "侧面",
      pinyin: "cè miàn",
      meaning: "lateral side",
      breakdown: "侧面 (cè miàn) - lateral side",
    },
    {
      char: "层出不穷",
      pinyin: "céng chū bù qióng",
      meaning: "more and more emerge",
      breakdown: "层出不穷 (céng chū bù qióng) - more and more emerge",
    },
    {
      char: "层次",
      pinyin: "céng cì",
      meaning: "arrangement of ideas",
      breakdown: "层次 (céng cì) - arrangement of ideas",
    },
    {
      char: "差距",
      pinyin: "chā jù",
      meaning: "disparity",
      breakdown: "差距 (chā jù) - disparity",
    },
    {
      char: "查获",
      pinyin: "chá huò",
      meaning: "to investigate and capture (a criminal)",
      breakdown: "查获 (chá huò) - to investigate and capture (a criminal)",
    },
    {
      char: "岔",
      pinyin: "chà",
      meaning: "fork in road",
      breakdown: "岔 (chà) - fork in road",
    },
    {
      char: "刹那",
      pinyin: "chà nà",
      meaning: "an instant (Sanskrit: ksana)",
      breakdown: "刹那 (chà nà) - an instant (Sanskrit: ksana)",
    },
    {
      char: "诧异",
      pinyin: "chà yì",
      meaning: "flabbergasted",
      breakdown: "诧异 (chà yì) - flabbergasted",
    },
    {
      char: "柴油",
      pinyin: "chái yóu",
      meaning: "diesel fuel",
      breakdown: "柴油 (chái yóu) - diesel fuel",
    },
    {
      char: "搀",
      pinyin: "chān",
      meaning: "to assist by the arm",
      breakdown: "搀 (chān) - to assist by the arm",
    },
    {
      char: "馋",
      pinyin: "chán",
      meaning: "gluttonous",
      breakdown: "馋 (chán) - gluttonous",
    },
    {
      char: "缠绕",
      pinyin: "chán rào",
      meaning: "twisting",
      breakdown: "缠绕 (chán rào) - twisting",
    },
    {
      char: "产业",
      pinyin: "chǎn yè",
      meaning: "industry",
      breakdown: "产业 (chǎn yè) - industry",
    },
    {
      char: "阐述",
      pinyin: "chǎn shù",
      meaning: "to expound (a position)",
      breakdown: "阐述 (chǎn shù) - to expound (a position)",
    },
    {
      char: "颤抖",
      pinyin: "chàn dǒu",
      meaning: "to shudder",
      breakdown: "颤抖 (chàn dǒu) - to shudder",
    },
    {
      char: "猖狂",
      pinyin: "chāng kuáng",
      meaning: "savage",
      breakdown: "猖狂 (chāng kuáng) - savage",
    },
    {
      char: "昌盛",
      pinyin: "chāng shèng",
      meaning: "prosperous",
      breakdown: "昌盛 (chāng shèng) - prosperous",
    },
    {
      char: "尝试",
      pinyin: "cháng shì",
      meaning: "to try",
      breakdown: "尝试 (cháng shì) - to try",
    },
    {
      char: "偿还",
      pinyin: "cháng huán",
      meaning: "to repay",
      breakdown: "偿还 (cháng huán) - to repay",
    },
    {
      char: "常年",
      pinyin: "cháng nián",
      meaning: "all year round",
      breakdown: "常年 (cháng nián) - all year round",
    },
    {
      char: "常务",
      pinyin: "cháng wù",
      meaning: "routine",
      breakdown: "常务 (cháng wù) - routine",
    },
    {
      char: "场合",
      pinyin: "chǎng hé",
      meaning: "situation",
      breakdown: "场合 (chǎng hé) - situation",
    },
    {
      char: "场面",
      pinyin: "chǎng miàn",
      meaning: "scene",
      breakdown: "场面 (chǎng miàn) - scene",
    },
    {
      char: "场所",
      pinyin: "chǎng suǒ",
      meaning: "location",
      breakdown: "场所 (chǎng suǒ) - location",
    },
    {
      char: "敞开",
      pinyin: "chǎng kāi",
      meaning: "to open wide",
      breakdown: "敞开 (chǎng kāi) - to open wide",
    },
    {
      char: "倡导",
      pinyin: "chàng dǎo",
      meaning: "to advocate",
      breakdown: "倡导 (chàng dǎo) - to advocate",
    },
    {
      char: "倡议",
      pinyin: "chàng yì",
      meaning: "to suggest",
      breakdown: "倡议 (chàng yì) - to suggest",
    },
    {
      char: "畅通",
      pinyin: "chàng tōng",
      meaning: "unimpeded",
      breakdown: "畅通 (chàng tōng) - unimpeded",
    },
    {
      char: "畅销",
      pinyin: "chàng xiāo",
      meaning: "to sell well",
      breakdown: "畅销 (chàng xiāo) - to sell well",
    },
    {
      char: "超级",
      pinyin: "chāo jí",
      meaning: "super-",
      breakdown: "超级 (chāo jí) - super-",
    },
    {
      char: "超越",
      pinyin: "chāo yuè",
      meaning: "to surpass",
      breakdown: "超越 (chāo yuè) - to surpass",
    },
    {
      char: "钞票",
      pinyin: "chāo piào",
      meaning: "paper money",
      breakdown: "钞票 (chāo piào) - paper money",
    },
    {
      char: "潮流",
      pinyin: "cháo liú",
      meaning: "tide",
      breakdown: "潮流 (cháo liú) - tide",
    },
    {
      char: "潮湿",
      pinyin: "cháo shī",
      meaning: "damp",
      breakdown: "潮湿 (cháo shī) - damp",
    },
    {
      char: "嘲笑",
      pinyin: "cháo xiào",
      meaning: "to jeer at",
      breakdown: "嘲笑 (cháo xiào) - to jeer at",
    },
    {
      char: "撤退",
      pinyin: "chè tuì",
      meaning: "to retreat",
      breakdown: "撤退 (chè tuì) - to retreat",
    },
    {
      char: "撤销",
      pinyin: "chè xiāo",
      meaning: "to repeal",
      breakdown: "撤销 (chè xiāo) - to repeal",
    },
    {
      char: "沉淀",
      pinyin: "chén diàn",
      meaning: "to settle",
      breakdown: "沉淀 (chén diàn) - to settle",
    },
    {
      char: "沉闷",
      pinyin: "chén mèn",
      meaning: "oppressive (of weather)",
      breakdown: "沉闷 (chén mèn) - oppressive (of weather)",
    },
    {
      char: "沉思",
      pinyin: "chén sī",
      meaning: "to contemplate",
      breakdown: "沉思 (chén sī) - to contemplate",
    },
    {
      char: "沉重",
      pinyin: "chén zhòng",
      meaning: "heavy",
      breakdown: "沉重 (chén zhòng) - heavy",
    },
    {
      char: "沉着",
      pinyin: "chén zhuó",
      meaning: "steady",
      breakdown: "沉着 (chén zhuó) - steady",
    },
    {
      char: "陈旧",
      pinyin: "chén jiù",
      meaning: "old-fashioned",
      breakdown: "陈旧 (chén jiù) - old-fashioned",
    },
    {
      char: "陈列",
      pinyin: "chén liè",
      meaning: "to display",
      breakdown: "陈列 (chén liè) - to display",
    },
    {
      char: "陈述",
      pinyin: "chén shù",
      meaning: "an assertion",
      breakdown: "陈述 (chén shù) - an assertion",
    },
    {
      char: "称心如意",
      pinyin: "chèn xīn rú yì",
      meaning: "after one's heart (idiom); gratifying and satisfactory",
      breakdown:
        "称心如意 (chèn xīn rú yì) - after one's heart (idiom); gratifying and satisfactory",
    },
    {
      char: "称号",
      pinyin: "chēng hào",
      meaning: "name",
      breakdown: "称号 (chēng hào) - name",
    },
    {
      char: "盛",
      pinyin: "chéng",
      meaning: "to hold",
      breakdown: "盛 (chéng) - to hold",
    },
    {
      char: "橙",
      pinyin: "chéng",
      meaning: "orange tree",
      breakdown: "橙 (chéng) - orange tree",
    },
    {
      char: "乘务员",
      pinyin: "chéng wù yuán",
      meaning: "attendant on an airplane",
      breakdown: "乘务员 (chéng wù yuán) - attendant on an airplane",
    },
    {
      char: "承办",
      pinyin: "chéng bàn",
      meaning: "to undertake",
      breakdown: "承办 (chéng bàn) - to undertake",
    },
    {
      char: "承包",
      pinyin: "chéng bāo",
      meaning: "to contract",
      breakdown: "承包 (chéng bāo) - to contract",
    },
    {
      char: "承诺",
      pinyin: "chéng nuò",
      meaning: "to promise",
      breakdown: "承诺 (chéng nuò) - to promise",
    },
    {
      char: "城堡",
      pinyin: "chéng bǎo",
      meaning: "castle",
      breakdown: "城堡 (chéng bǎo) - castle",
    },
    {
      char: "成本",
      pinyin: "chéng běn",
      meaning: "(manufacturing)",
      breakdown: "成本 (chéng běn) - (manufacturing)",
    },
    {
      char: "成交",
      pinyin: "chéng jiāo",
      meaning: "to complete a contract",
      breakdown: "成交 (chéng jiāo) - to complete a contract",
    },
    {
      char: "成天",
      pinyin: "chéng tiān",
      meaning: "(coll.) all day long",
      breakdown: "成天 (chéng tiān) - (coll.) all day long",
    },
    {
      char: "成效",
      pinyin: "chéng xiào",
      meaning: "effect",
      breakdown: "成效 (chéng xiào) - effect",
    },
    {
      char: "成心",
      pinyin: "chéng xīn",
      meaning: "intentional",
      breakdown: "成心 (chéng xīn) - intentional",
    },
    {
      char: "成员",
      pinyin: "chéng yuán",
      meaning: "member",
      breakdown: "成员 (chéng yuán) - member",
    },
    {
      char: "惩罚",
      pinyin: "chéng fá",
      meaning: "penalty",
      breakdown: "惩罚 (chéng fá) - penalty",
    },
    {
      char: "诚挚",
      pinyin: "chéng zhì",
      meaning: "sincere",
      breakdown: "诚挚 (chéng zhì) - sincere",
    },
    {
      char: "澄清",
      pinyin: "chéng qīng",
      meaning: "clear (of liquid)",
      breakdown: "澄清 (chéng qīng) - clear (of liquid)",
    },
    {
      char: "呈现",
      pinyin: "chéng xiàn",
      meaning: "to appear",
      breakdown: "呈现 (chéng xiàn) - to appear",
    },
    {
      char: "秤",
      pinyin: "chèng",
      meaning: "steelyard",
      breakdown: "秤 (chèng) - steelyard",
    },
    {
      char: "吃苦",
      pinyin: "chī kǔ",
      meaning: "to bear",
      breakdown: "吃苦 (chī kǔ) - to bear",
    },
    {
      char: "吃力",
      pinyin: "chī lì",
      meaning: "to entail strenuous effort",
      breakdown: "吃力 (chī lì) - to entail strenuous effort",
    },
    {
      char: "迟缓",
      pinyin: "chí huǎn",
      meaning: "slow",
      breakdown: "迟缓 (chí huǎn) - slow",
    },
    {
      char: "迟疑",
      pinyin: "chí yí",
      meaning: "to hesitate",
      breakdown: "迟疑 (chí yí) - to hesitate",
    },
    {
      char: "持久",
      pinyin: "chí jiǔ",
      meaning: "lasting",
      breakdown: "持久 (chí jiǔ) - lasting",
    },
    {
      char: "池塘",
      pinyin: "chí táng",
      meaning: "pool",
      breakdown: "池塘 (chí táng) - pool",
    },
    {
      char: "赤道",
      pinyin: "chì dào",
      meaning: "equator (of the earth or astronomical body)",
      breakdown: "赤道 (chì dào) - equator (of the earth or astronomical body)",
    },
    {
      char: "赤字",
      pinyin: "chì zì",
      meaning: "(financial) deficit",
      breakdown: "赤字 (chì zì) - (financial) deficit",
    },
    {
      char: "冲动",
      pinyin: "chōng dòng",
      meaning: "to have an urge",
      breakdown: "冲动 (chōng dòng) - to have an urge",
    },
    {
      char: "冲击",
      pinyin: "chōng jī",
      meaning: "an attack",
      breakdown: "冲击 (chōng jī) - an attack",
    },
    {
      char: "冲突",
      pinyin: "chōng tū",
      meaning: "conflict",
      breakdown: "冲突 (chōng tū) - conflict",
    },
    {
      char: "充当",
      pinyin: "chōng dāng",
      meaning: "to serve as",
      breakdown: "充当 (chōng dāng) - to serve as",
    },
    {
      char: "充沛",
      pinyin: "chōng pèi",
      meaning: "abundant",
      breakdown: "充沛 (chōng pèi) - abundant",
    },
    {
      char: "充实",
      pinyin: "chōng shí",
      meaning: "rich",
      breakdown: "充实 (chōng shí) - rich",
    },
    {
      char: "充足",
      pinyin: "chōng zú",
      meaning: "adequate",
      breakdown: "充足 (chōng zú) - adequate",
    },
    {
      char: "崇拜",
      pinyin: "chóng bài",
      meaning: "to worship",
      breakdown: "崇拜 (chóng bài) - to worship",
    },
    {
      char: "崇高",
      pinyin: "chóng gāo",
      meaning: "majestic",
      breakdown: "崇高 (chóng gāo) - majestic",
    },
    {
      char: "崇敬",
      pinyin: "chóng jìng",
      meaning: "to revere",
      breakdown: "崇敬 (chóng jìng) - to revere",
    },
    {
      char: "重叠",
      pinyin: "chóng dié",
      meaning: "to overlap",
      breakdown: "重叠 (chóng dié) - to overlap",
    },
    {
      char: "重阳节",
      pinyin: "Chóng yáng jié",
      meaning: "Double Ninth or Yang Festival",
      breakdown: "重阳节 (Chóng yáng jié) - Double Ninth or Yang Festival",
    },
    {
      char: "抽空",
      pinyin: "chōu kòng",
      meaning: "to find the time to do sth",
      breakdown: "抽空 (chōu kòng) - to find the time to do sth",
    },
    {
      char: "筹备",
      pinyin: "chóu bèi",
      meaning: "preparations",
      breakdown: "筹备 (chóu bèi) - preparations",
    },
    {
      char: "踌躇",
      pinyin: "chóu chú",
      meaning: "to hesitate",
      breakdown: "踌躇 (chóu chú) - to hesitate",
    },
    {
      char: "稠密",
      pinyin: "chóu mì",
      meaning: "dense",
      breakdown: "稠密 (chóu mì) - dense",
    },
    {
      char: "丑恶",
      pinyin: "chǒu è",
      meaning: "ugly",
      breakdown: "丑恶 (chǒu è) - ugly",
    },
    {
      char: "出路",
      pinyin: "chū lù",
      meaning: "a way out (of a difficulty etc)",
      breakdown: "出路 (chū lù) - a way out (of a difficulty etc)",
    },
    {
      char: "出卖",
      pinyin: "chū mài",
      meaning: "to offer for sale",
      breakdown: "出卖 (chū mài) - to offer for sale",
    },
    {
      char: "出身",
      pinyin: "chū shēn",
      meaning: "to be born of",
      breakdown: "出身 (chū shēn) - to be born of",
    },
    {
      char: "出神",
      pinyin: "chū shén",
      meaning: "entranced",
      breakdown: "出神 (chū shén) - entranced",
    },
    {
      char: "出息",
      pinyin: "chū xi",
      meaning: "future prospects",
      breakdown: "出息 (chū xi) - future prospects",
    },
    {
      char: "出洋相",
      pinyin: "chū yáng xiàng",
      meaning: "to make a fool of oneself",
      breakdown: "出洋相 (chū yáng xiàng) - to make a fool of oneself",
    },
    {
      char: "初步",
      pinyin: "chū bù",
      meaning: "initial",
      breakdown: "初步 (chū bù) - initial",
    },
    {
      char: "储备",
      pinyin: "chǔ bèi",
      meaning: "reserves",
      breakdown: "储备 (chǔ bèi) - reserves",
    },
    {
      char: "储存",
      pinyin: "chǔ cún",
      meaning: "stockpile",
      breakdown: "储存 (chǔ cún) - stockpile",
    },
    {
      char: "储蓄",
      pinyin: "chǔ xù",
      meaning: "to deposit money",
      breakdown: "储蓄 (chǔ xù) - to deposit money",
    },
    {
      char: "处分",
      pinyin: "chǔ fèn",
      meaning: "to discipline sb",
      breakdown: "处分 (chǔ fèn) - to discipline sb",
    },
    {
      char: "处境",
      pinyin: "chǔ jìng",
      meaning: "plight",
      breakdown: "处境 (chǔ jìng) - plight",
    },
    {
      char: "处置",
      pinyin: "chǔ zhì",
      meaning: "to handle",
      breakdown: "处置 (chǔ zhì) - to handle",
    },
    {
      char: "触犯",
      pinyin: "chù fàn",
      meaning: "to offend",
      breakdown: "触犯 (chù fàn) - to offend",
    },
    {
      char: "穿越",
      pinyin: "chuān yuè",
      meaning: "to pass through",
      breakdown: "穿越 (chuān yuè) - to pass through",
    },
    {
      char: "川流不息",
      pinyin: "chuān liú bù xī",
      meaning: "the stream flows without stopping (idiom); unending flow",
      breakdown:
        "川流不息 (chuān liú bù xī) - the stream flows without stopping (idiom); unending flow",
    },
    {
      char: "船舶",
      pinyin: "chuán bó",
      meaning: "shipping",
      breakdown: "船舶 (chuán bó) - shipping",
    },
    {
      char: "传达",
      pinyin: "chuán dá",
      meaning: "to pass on",
      breakdown: "传达 (chuán dá) - to pass on",
    },
    {
      char: "传单",
      pinyin: "chuán dān",
      meaning: "leaflet",
      breakdown: "传单 (chuán dān) - leaflet",
    },
    {
      char: "传授",
      pinyin: "chuán shòu",
      meaning: "to impart",
      breakdown: "传授 (chuán shòu) - to impart",
    },
    {
      char: "喘气",
      pinyin: "chuǎn qì",
      meaning: "to breathe deeply",
      breakdown: "喘气 (chuǎn qì) - to breathe deeply",
    },
    {
      char: "串",
      pinyin: "chuàn",
      meaning: "to string together",
      breakdown: "串 (chuàn) - to string together",
    },
    {
      char: "床单",
      pinyin: "chuáng dān",
      meaning: "bed sheet",
      breakdown: "床单 (chuáng dān) - bed sheet",
    },
    {
      char: "创立",
      pinyin: "chuàng lì",
      meaning: "to establish",
      breakdown: "创立 (chuàng lì) - to establish",
    },
    {
      char: "创新",
      pinyin: "chuàng xīn",
      meaning: "innovation",
      breakdown: "创新 (chuàng xīn) - innovation",
    },
    {
      char: "创业",
      pinyin: "chuàng yè",
      meaning: "to begin an undertaking",
      breakdown: "创业 (chuàng yè) - to begin an undertaking",
    },
    {
      char: "创作",
      pinyin: "chuàng zuò",
      meaning: "to create",
      breakdown: "创作 (chuàng zuò) - to create",
    },
    {
      char: "吹牛",
      pinyin: "chuī niú",
      meaning: "to talk big",
      breakdown: "吹牛 (chuī niú) - to talk big",
    },
    {
      char: "吹捧",
      pinyin: "chuī pěng",
      meaning: "to flatter",
      breakdown: "吹捧 (chuī pěng) - to flatter",
    },
    {
      char: "锤",
      pinyin: "chuí",
      meaning: "hammer",
      breakdown: "锤 (chuí) - hammer",
    },
    {
      char: "垂直",
      pinyin: "chuí zhí",
      meaning: "perpendicular",
      breakdown: "垂直 (chuí zhí) - perpendicular",
    },
    {
      char: "纯粹",
      pinyin: "chún cuì",
      meaning: "purely",
      breakdown: "纯粹 (chún cuì) - purely",
    },
    {
      char: "纯洁",
      pinyin: "chún jié",
      meaning: "pure",
      breakdown: "纯洁 (chún jié) - pure",
    },
    {
      char: "词汇",
      pinyin: "cí huì",
      meaning: "vocabulary",
      breakdown: "词汇 (cí huì) - vocabulary",
    },
    {
      char: "慈祥",
      pinyin: "cí xiáng",
      meaning: "kindly",
      breakdown: "慈祥 (cí xiáng) - kindly",
    },
    {
      char: "雌雄",
      pinyin: "cí xióng",
      meaning: "male and female",
      breakdown: "雌雄 (cí xióng) - male and female",
    },
    {
      char: "刺",
      pinyin: "cì",
      meaning: "thorn",
      breakdown: "刺 (cì) - thorn",
    },
    {
      char: "次品",
      pinyin: "cì pǐn",
      meaning: "substandard products",
      breakdown: "次品 (cì pǐn) - substandard products",
    },
    {
      char: "次序",
      pinyin: "cì xù",
      meaning: "sequence",
      breakdown: "次序 (cì xù) - sequence",
    },
    {
      char: "伺候",
      pinyin: "cì hòu",
      meaning: "to serve",
      breakdown: "伺候 (cì hòu) - to serve",
    },
    {
      char: "丛",
      pinyin: "cóng",
      meaning: "cluster",
      breakdown: "丛 (cóng) - cluster",
    },
    {
      char: "从容不迫",
      pinyin: "cóng róng bù pò",
      meaning: "calm",
      breakdown: "从容不迫 (cóng róng bù pò) - calm",
    },
    {
      char: "凑合",
      pinyin: "còu he",
      meaning: "to bring together",
      breakdown: "凑合 (còu he) - to bring together",
    },
    {
      char: "粗鲁",
      pinyin: "cū lǔ",
      meaning: "crude",
      breakdown: "粗鲁 (cū lǔ) - crude",
    },
    {
      char: "窜",
      pinyin: "cuàn",
      meaning: "to flee",
      breakdown: "窜 (cuàn) - to flee",
    },
    {
      char: "摧残",
      pinyin: "cuī cán",
      meaning: "to ravage",
      breakdown: "摧残 (cuī cán) - to ravage",
    },
    {
      char: "脆弱",
      pinyin: "cuì ruò",
      meaning: "weak",
      breakdown: "脆弱 (cuì ruò) - weak",
    },
    {
      char: "搓",
      pinyin: "cuō",
      meaning: "to rub or roll between the hands or fingers",
      breakdown: "搓 (cuō) - to rub or roll between the hands or fingers",
    },
    {
      char: "磋商",
      pinyin: "cuō shāng",
      meaning: "to consult",
      breakdown: "磋商 (cuō shāng) - to consult",
    },
    {
      char: "挫折",
      pinyin: "cuò zhé",
      meaning: "setback",
      breakdown: "挫折 (cuò zhé) - setback",
    },
    {
      char: "搭",
      pinyin: "dā",
      meaning: "to put up",
      breakdown: "搭 (dā) - to put up",
    },
    {
      char: "搭档",
      pinyin: "dā dàng",
      meaning: "to cooperate",
      breakdown: "搭档 (dā dàng) - to cooperate",
    },
    {
      char: "搭配",
      pinyin: "dā pèi",
      meaning: "to pair up",
      breakdown: "搭配 (dā pèi) - to pair up",
    },
    {
      char: "答辩",
      pinyin: "dá biàn",
      meaning: "to reply (to an accusation)",
      breakdown: "答辩 (dá biàn) - to reply (to an accusation)",
    },
    {
      char: "答复",
      pinyin: "dá fù",
      meaning: "to answer",
      breakdown: "答复 (dá fù) - to answer",
    },
    {
      char: "达成",
      pinyin: "dá chéng",
      meaning: "to reach (an agreement)",
      breakdown: "达成 (dá chéng) - to reach (an agreement)",
    },
    {
      char: "打包",
      pinyin: "dǎ bāo",
      meaning: "to wrap",
      breakdown: "打包 (dǎ bāo) - to wrap",
    },
    {
      char: "打官司",
      pinyin: "dǎ guān si",
      meaning: "to file a lawsuit",
      breakdown: "打官司 (dǎ guān si) - to file a lawsuit",
    },
    {
      char: "打击",
      pinyin: "dǎ jī",
      meaning: "to hit",
      breakdown: "打击 (dǎ jī) - to hit",
    },
    {
      char: "打架",
      pinyin: "dǎ jià",
      meaning: "to fight",
      breakdown: "打架 (dǎ jià) - to fight",
    },
    {
      char: "打量",
      pinyin: "dǎ liang",
      meaning: "to size sb up",
      breakdown: "打量 (dǎ liang) - to size sb up",
    },
    {
      char: "打猎",
      pinyin: "dǎ liè",
      meaning: "to go hunting",
      breakdown: "打猎 (dǎ liè) - to go hunting",
    },
    {
      char: "打仗",
      pinyin: "dǎ zhàng",
      meaning: "to fight a battle",
      breakdown: "打仗 (dǎ zhàng) - to fight a battle",
    },
    {
      char: "大不了",
      pinyin: "dà bù liǎo",
      meaning: "at worst",
      breakdown: "大不了 (dà bù liǎo) - at worst",
    },
    {
      char: "大臣",
      pinyin: "dà chén",
      meaning: "chancellor (of a monarchy)",
      breakdown: "大臣 (dà chén) - chancellor (of a monarchy)",
    },
    {
      char: "大伙儿",
      pinyin: "dà huǒ r",
      meaning: "erhua variant of 大伙[dà huǒ]",
      breakdown: "大伙儿 (dà huǒ r) - erhua variant of 大伙[dà huǒ]",
    },
    {
      char: "大厦",
      pinyin: "dà shà",
      meaning: "large building",
      breakdown: "大厦 (dà shà) - large building",
    },
    {
      char: "大肆",
      pinyin: "dà sì",
      meaning: "wantonly",
      breakdown: "大肆 (dà sì) - wantonly",
    },
    {
      char: "大体",
      pinyin: "dà tǐ",
      meaning: "in general",
      breakdown: "大体 (dà tǐ) - in general",
    },
    {
      char: "大意",
      pinyin: "dà yi",
      meaning: "careless",
      breakdown: "大意 (dà yi) - careless",
    },
    {
      char: "大致",
      pinyin: "dà zhì",
      meaning: "more or less",
      breakdown: "大致 (dà zhì) - more or less",
    },
    {
      char: "歹徒",
      pinyin: "dǎi tú",
      meaning: "evil-doer",
      breakdown: "歹徒 (dǎi tú) - evil-doer",
    },
    {
      char: "带领",
      pinyin: "dài lǐng",
      meaning: "to guide",
      breakdown: "带领 (dài lǐng) - to guide",
    },
    {
      char: "代价",
      pinyin: "dài jià",
      meaning: "price",
      breakdown: "代价 (dài jià) - price",
    },
    {
      char: "代理",
      pinyin: "dài lǐ",
      meaning: "to act on behalf of sb in a responsible position",
      breakdown:
        "代理 (dài lǐ) - to act on behalf of sb in a responsible position",
    },
    {
      char: "逮捕",
      pinyin: "dài bǔ",
      meaning: "to arrest",
      breakdown: "逮捕 (dài bǔ) - to arrest",
    },
    {
      char: "怠慢",
      pinyin: "dài màn",
      meaning: "to slight",
      breakdown: "怠慢 (dài màn) - to slight",
    },
    {
      char: "担保",
      pinyin: "dān bǎo",
      meaning: "to guarantee",
      breakdown: "担保 (dān bǎo) - to guarantee",
    },
    {
      char: "胆怯",
      pinyin: "dǎn qiè",
      meaning: "timid",
      breakdown: "胆怯 (dǎn qiè) - timid",
    },
    {
      char: "淡季",
      pinyin: "dàn jì",
      meaning: "off season",
      breakdown: "淡季 (dàn jì) - off season",
    },
    {
      char: "淡水",
      pinyin: "dàn shuǐ",
      meaning: "potable water (water with low salt content)",
      breakdown:
        "淡水 (dàn shuǐ) - potable water (water with low salt content)",
    },
    {
      char: "蛋白质",
      pinyin: "dàn bái zhì",
      meaning: "protein",
      breakdown: "蛋白质 (dàn bái zhì) - protein",
    },
    {
      char: "诞辰",
      pinyin: "dàn chén",
      meaning: "birthday",
      breakdown: "诞辰 (dàn chén) - birthday",
    },
    {
      char: "诞生",
      pinyin: "dàn shēng",
      meaning: "to be born",
      breakdown: "诞生 (dàn shēng) - to be born",
    },
    {
      char: "当场",
      pinyin: "dāng chǎng",
      meaning: "at the scene",
      breakdown: "当场 (dāng chǎng) - at the scene",
    },
    {
      char: "当初",
      pinyin: "dāng chū",
      meaning: "at that time",
      breakdown: "当初 (dāng chū) - at that time",
    },
    {
      char: "当面",
      pinyin: "dāng miàn",
      meaning: "to sb's face",
      breakdown: "当面 (dāng miàn) - to sb's face",
    },
    {
      char: "当前",
      pinyin: "dāng qián",
      meaning: "current",
      breakdown: "当前 (dāng qián) - current",
    },
    {
      char: "当事人",
      pinyin: "dāng shì rén",
      meaning: "persons involved or implicated",
      breakdown: "当事人 (dāng shì rén) - persons involved or implicated",
    },
    {
      char: "当务之急",
      pinyin: "dāng wù zhī jí",
      meaning: "top priority job",
      breakdown: "当务之急 (dāng wù zhī jí) - top priority job",
    },
    {
      char: "当心",
      pinyin: "dāng xīn",
      meaning: "to take care",
      breakdown: "当心 (dāng xīn) - to take care",
    },
    {
      char: "当选",
      pinyin: "dāng xuǎn",
      meaning: "to be elected",
      breakdown: "当选 (dāng xuǎn) - to be elected",
    },
    {
      char: "党",
      pinyin: "dǎng",
      meaning: "party",
      breakdown: "党 (dǎng) - party",
    },
    {
      char: "档案",
      pinyin: "dàng àn",
      meaning: "file",
      breakdown: "档案 (dàng àn) - file",
    },
    {
      char: "档次",
      pinyin: "dàng cì",
      meaning: "grade",
      breakdown: "档次 (dàng cì) - grade",
    },
    {
      char: "岛屿",
      pinyin: "dǎo yǔ",
      meaning: "island",
      breakdown: "岛屿 (dǎo yǔ) - island",
    },
    {
      char: "倒闭",
      pinyin: "dǎo bì",
      meaning: "to go bankrupt",
      breakdown: "倒闭 (dǎo bì) - to go bankrupt",
    },
    {
      char: "导弹",
      pinyin: "dǎo dàn",
      meaning: "guided missile",
      breakdown: "导弹 (dǎo dàn) - guided missile",
    },
    {
      char: "导航",
      pinyin: "dǎo háng",
      meaning: "navigation",
      breakdown: "导航 (dǎo háng) - navigation",
    },
    {
      char: "导向",
      pinyin: "dǎo xiàng",
      meaning: "to be oriented towards",
      breakdown: "导向 (dǎo xiàng) - to be oriented towards",
    },
    {
      char: "捣乱",
      pinyin: "dǎo luàn",
      meaning: "to disturb",
      breakdown: "捣乱 (dǎo luàn) - to disturb",
    },
    {
      char: "稻谷",
      pinyin: "dào gǔ",
      meaning: "rice crops",
      breakdown: "稻谷 (dào gǔ) - rice crops",
    },
    {
      char: "盗窃",
      pinyin: "dào qiè",
      meaning: "to steal",
      breakdown: "盗窃 (dào qiè) - to steal",
    },
    {
      char: "得不偿失",
      pinyin: "dé bù cháng shī",
      meaning: "(saying) the gains do not make up for the losses",
      breakdown:
        "得不偿失 (dé bù cháng shī) - (saying) the gains do not make up for the losses",
    },
    {
      char: "得力",
      pinyin: "dé lì",
      meaning: "able",
      breakdown: "得力 (dé lì) - able",
    },
    {
      char: "得天独厚",
      pinyin: "dé tiān dú hòu",
      meaning: "(of an area) rich in resources",
      breakdown: "得天独厚 (dé tiān dú hòu) - (of an area) rich in resources",
    },
    {
      char: "得罪",
      pinyin: "dé zuì",
      meaning: "to commit an offense",
      breakdown: "得罪 (dé zuì) - to commit an offense",
    },
    {
      char: "蹬",
      pinyin: "dēng",
      meaning: "to step on",
      breakdown: "蹬 (dēng) - to step on",
    },
    {
      char: "灯笼",
      pinyin: "dēng lóng",
      meaning: "lantern",
      breakdown: "灯笼 (dēng lóng) - lantern",
    },
    {
      char: "登陆",
      pinyin: "dēng lù",
      meaning: "to land",
      breakdown: "登陆 (dēng lù) - to land",
    },
    {
      char: "登录",
      pinyin: "dēng lù",
      meaning: "to register",
      breakdown: "登录 (dēng lù) - to register",
    },
    {
      char: "等级",
      pinyin: "děng jí",
      meaning: "grade",
      breakdown: "等级 (děng jí) - grade",
    },
    {
      char: "瞪",
      pinyin: "dèng",
      meaning: "to open (one's eyes) wide",
      breakdown: "瞪 (dèng) - to open (one's eyes) wide",
    },
    {
      char: "堤坝",
      pinyin: "dī bà",
      meaning: "dam",
      breakdown: "堤坝 (dī bà) - dam",
    },
    {
      char: "敌视",
      pinyin: "dí shì",
      meaning: "hostile",
      breakdown: "敌视 (dí shì) - hostile",
    },
    {
      char: "抵达",
      pinyin: "dǐ dá",
      meaning: "to arrive",
      breakdown: "抵达 (dǐ dá) - to arrive",
    },
    {
      char: "抵抗",
      pinyin: "dǐ kàng",
      meaning: "to resist",
      breakdown: "抵抗 (dǐ kàng) - to resist",
    },
    {
      char: "抵制",
      pinyin: "dǐ zhì",
      meaning: "to resist",
      breakdown: "抵制 (dǐ zhì) - to resist",
    },
    {
      char: "递增",
      pinyin: "dì zēng",
      meaning: "to increase by degrees",
      breakdown: "递增 (dì zēng) - to increase by degrees",
    },
    {
      char: "地步",
      pinyin: "dì bù",
      meaning: "condition",
      breakdown: "地步 (dì bù) - condition",
    },
    {
      char: "地势",
      pinyin: "dì shì",
      meaning: "terrain",
      breakdown: "地势 (dì shì) - terrain",
    },
    {
      char: "地质",
      pinyin: "dì zhì",
      meaning: "geology",
      breakdown: "地质 (dì zhì) - geology",
    },
    {
      char: "颠簸",
      pinyin: "diān bǒ",
      meaning: "to shake",
      breakdown: "颠簸 (diān bǒ) - to shake",
    },
    {
      char: "颠倒",
      pinyin: "diān dǎo",
      meaning: "to turn upside-down",
      breakdown: "颠倒 (diān dǎo) - to turn upside-down",
    },
    {
      char: "点缀",
      pinyin: "diǎn zhuì",
      meaning: "to decorate",
      breakdown: "点缀 (diǎn zhuì) - to decorate",
    },
    {
      char: "典礼",
      pinyin: "diǎn lǐ",
      meaning: "celebration",
      breakdown: "典礼 (diǎn lǐ) - celebration",
    },
    {
      char: "典型",
      pinyin: "diǎn xíng",
      meaning: "model",
      breakdown: "典型 (diǎn xíng) - model",
    },
    {
      char: "垫",
      pinyin: "diàn",
      meaning: "pad",
      breakdown: "垫 (diàn) - pad",
    },
    {
      char: "电源",
      pinyin: "diàn yuán",
      meaning: "electric power source",
      breakdown: "电源 (diàn yuán) - electric power source",
    },
    {
      char: "奠定",
      pinyin: "diàn dìng",
      meaning: "to establish",
      breakdown: "奠定 (diàn dìng) - to establish",
    },
    {
      char: "惦记",
      pinyin: "diàn jì",
      meaning: "to think of",
      breakdown: "惦记 (diàn jì) - to think of",
    },
    {
      char: "叼",
      pinyin: "diāo",
      meaning: "to hold in the mouth",
      breakdown: "叼 (diāo) - to hold in the mouth",
    },
    {
      char: "雕刻",
      pinyin: "diāo kè",
      meaning: "to carve",
      breakdown: "雕刻 (diāo kè) - to carve",
    },
    {
      char: "雕塑",
      pinyin: "diāo sù",
      meaning: "a statue",
      breakdown: "雕塑 (diāo sù) - a statue",
    },
    {
      char: "吊",
      pinyin: "diào",
      meaning: "a string of 100 cash (arch.)",
      breakdown: "吊 (diào) - a string of 100 cash (arch.)",
    },
    {
      char: "调动",
      pinyin: "diào dòng",
      meaning: "to transfer",
      breakdown: "调动 (diào dòng) - to transfer",
    },
    {
      char: "跌",
      pinyin: "diē",
      meaning: "to drop",
      breakdown: "跌 (diē) - to drop",
    },
    {
      char: "盯",
      pinyin: "dīng",
      meaning: "to watch attentively",
      breakdown: "盯 (dīng) - to watch attentively",
    },
    {
      char: "叮嘱",
      pinyin: "dīng zhǔ",
      meaning: "to warn repeatedly",
      breakdown: "叮嘱 (dīng zhǔ) - to warn repeatedly",
    },
    {
      char: "定期",
      pinyin: "dìng qī",
      meaning: "regularly",
      breakdown: "定期 (dìng qī) - regularly",
    },
    {
      char: "定义",
      pinyin: "dìng yì",
      meaning: "definition",
      breakdown: "定义 (dìng yì) - definition",
    },
    {
      char: "丢人",
      pinyin: "diū rén",
      meaning: "to lose face",
      breakdown: "丢人 (diū rén) - to lose face",
    },
    {
      char: "丢三落四",
      pinyin: "diū sān là sì",
      meaning: "forgetful",
      breakdown: "丢三落四 (diū sān là sì) - forgetful",
    },
    {
      char: "东道主",
      pinyin: "dōng dào zhǔ",
      meaning: "host",
      breakdown: "东道主 (dōng dào zhǔ) - host",
    },
    {
      char: "东张西望",
      pinyin: "dōng zhāng xī wàng",
      meaning: "to look in all directions (idiom)",
      breakdown:
        "东张西望 (dōng zhāng xī wàng) - to look in all directions (idiom)",
    },
    {
      char: "董事长",
      pinyin: "dǒng shì zhǎng",
      meaning: "chairman of the board",
      breakdown: "董事长 (dǒng shì zhǎng) - chairman of the board",
    },
    {
      char: "栋",
      pinyin: "dòng",
      meaning: "classifier for houses or buildings",
      breakdown: "栋 (dòng) - classifier for houses or buildings",
    },
    {
      char: "冻结",
      pinyin: "dòng jié",
      meaning: "to freeze (loan)",
      breakdown: "冻结 (dòng jié) - to freeze (loan)",
    },
    {
      char: "洞穴",
      pinyin: "dòng xué",
      meaning: "cave",
      breakdown: "洞穴 (dòng xué) - cave",
    },
    {
      char: "动荡",
      pinyin: "dòng dàng",
      meaning: "unrest (social or political)",
      breakdown: "动荡 (dòng dàng) - unrest (social or political)",
    },
    {
      char: "动机",
      pinyin: "dòng jī",
      meaning: "motor",
      breakdown: "动机 (dòng jī) - motor",
    },
    {
      char: "动静",
      pinyin: "dòng jìng",
      meaning: "sound of activity or people talking",
      breakdown: "动静 (dòng jìng) - sound of activity or people talking",
    },
    {
      char: "动力",
      pinyin: "dòng lì",
      meaning: "power",
      breakdown: "动力 (dòng lì) - power",
    },
    {
      char: "动脉",
      pinyin: "dòng mài",
      meaning: "artery",
      breakdown: "动脉 (dòng mài) - artery",
    },
    {
      char: "动身",
      pinyin: "dòng shēn",
      meaning: "to go on a journey",
      breakdown: "动身 (dòng shēn) - to go on a journey",
    },
    {
      char: "动手",
      pinyin: "dòng shǒu",
      meaning: "to set about (a task)",
      breakdown: "动手 (dòng shǒu) - to set about (a task)",
    },
    {
      char: "动态",
      pinyin: "dòng tài",
      meaning: "development",
      breakdown: "动态 (dòng tài) - development",
    },
    {
      char: "动员",
      pinyin: "dòng yuán",
      meaning: "to mobilize",
      breakdown: "动员 (dòng yuán) - to mobilize",
    },
    {
      char: "兜",
      pinyin: "dōu",
      meaning: "pocket",
      breakdown: "兜 (dōu) - pocket",
    },
    {
      char: "陡峭",
      pinyin: "dǒu qiào",
      meaning: "precipitous",
      breakdown: "陡峭 (dǒu qiào) - precipitous",
    },
    {
      char: "斗争",
      pinyin: "dòu zhēng",
      meaning: "a struggle",
      breakdown: "斗争 (dòu zhēng) - a struggle",
    },
    {
      char: "督促",
      pinyin: "dū cù",
      meaning: "to supervise and urge completion of a task",
      breakdown: "督促 (dū cù) - to supervise and urge completion of a task",
    },
    {
      char: "都市",
      pinyin: "dū shì",
      meaning: "city",
      breakdown: "都市 (dū shì) - city",
    },
    {
      char: "独裁",
      pinyin: "dú cái",
      meaning: "dictatorship",
      breakdown: "独裁 (dú cái) - dictatorship",
    },
    {
      char: "毒品",
      pinyin: "dú pǐn",
      meaning: "drugs",
      breakdown: "毒品 (dú pǐn) - drugs",
    },
    {
      char: "赌博",
      pinyin: "dǔ bó",
      meaning: "to gamble",
      breakdown: "赌博 (dǔ bó) - to gamble",
    },
    {
      char: "堵塞",
      pinyin: "dǔ sè",
      meaning: "to block",
      breakdown: "堵塞 (dǔ sè) - to block",
    },
    {
      char: "杜绝",
      pinyin: "dù jué",
      meaning: "to put an end to",
      breakdown: "杜绝 (dù jué) - to put an end to",
    },
    {
      char: "端",
      pinyin: "duān",
      meaning: "end",
      breakdown: "端 (duān) - end",
    },
    {
      char: "端午节",
      pinyin: "Duān wǔ jié",
      meaning: "the Dragon Boat Festival (5th day of the 5th lunar month)",
      breakdown:
        "端午节 (Duān wǔ jié) - the Dragon Boat Festival (5th day of the 5th lunar month)",
    },
    {
      char: "端正",
      pinyin: "duān zhèng",
      meaning: "upright",
      breakdown: "端正 (duān zhèng) - upright",
    },
    {
      char: "短促",
      pinyin: "duǎn cù",
      meaning: "short in time",
      breakdown: "短促 (duǎn cù) - short in time",
    },
    {
      char: "断定",
      pinyin: "duàn dìng",
      meaning: "to conclude",
      breakdown: "断定 (duàn dìng) - to conclude",
    },
    {
      char: "断断续续",
      pinyin: "duàn duàn xù xù",
      meaning: "intermittent",
      breakdown: "断断续续 (duàn duàn xù xù) - intermittent",
    },
    {
      char: "断绝",
      pinyin: "duàn jué",
      meaning: "to sever",
      breakdown: "断绝 (duàn jué) - to sever",
    },
    {
      char: "堆积",
      pinyin: "duī jī",
      meaning: "to pile up",
      breakdown: "堆积 (duī jī) - to pile up",
    },
    {
      char: "对策",
      pinyin: "duì cè",
      meaning: "countermeasure for dealing with a situation",
      breakdown: "对策 (duì cè) - countermeasure for dealing with a situation",
    },
    {
      char: "对称",
      pinyin: "duì chèn",
      meaning: "symmetry",
      breakdown: "对称 (duì chèn) - symmetry",
    },
    {
      char: "对付",
      pinyin: "duì fu",
      meaning: "to handle",
      breakdown: "对付 (duì fu) - to handle",
    },
    {
      char: "对抗",
      pinyin: "duì kàng",
      meaning: "to withstand",
      breakdown: "对抗 (duì kàng) - to withstand",
    },
    {
      char: "对立",
      pinyin: "duì lì",
      meaning: "to oppose",
      breakdown: "对立 (duì lì) - to oppose",
    },
    {
      char: "对联",
      pinyin: "duì lián",
      meaning: "rhyming couplet",
      breakdown: "对联 (duì lián) - rhyming couplet",
    },
    {
      char: "对应",
      pinyin: "duì yìng",
      meaning: "to correspond",
      breakdown: "对应 (duì yìng) - to correspond",
    },
    {
      char: "对照",
      pinyin: "duì zhào",
      meaning: "to contrast",
      breakdown: "对照 (duì zhào) - to contrast",
    },
    {
      char: "兑换",
      pinyin: "duì huàn",
      meaning: "to convert",
      breakdown: "兑换 (duì huàn) - to convert",
    },
    {
      char: "兑现",
      pinyin: "duì xiàn",
      meaning: "(of a cheque etc) to cash",
      breakdown: "兑现 (duì xiàn) - (of a cheque etc) to cash",
    },
    {
      char: "队伍",
      pinyin: "duì wǔ",
      meaning: "ranks",
      breakdown: "队伍 (duì wǔ) - ranks",
    },
    {
      char: "顿时",
      pinyin: "dùn shí",
      meaning: "immediately",
      breakdown: "顿时 (dùn shí) - immediately",
    },
    {
      char: "多元化",
      pinyin: "duō yuán huà",
      meaning: "diversification",
      breakdown: "多元化 (duō yuán huà) - diversification",
    },
    {
      char: "哆嗦",
      pinyin: "duō suo",
      meaning: "to tremble",
      breakdown: "哆嗦 (duō suo) - to tremble",
    },
    {
      char: "堕落",
      pinyin: "duò luò",
      meaning: "to morally degenerate",
      breakdown: "堕落 (duò luò) - to morally degenerate",
    },
    {
      char: "额外",
      pinyin: "é wài",
      meaning: "extra",
      breakdown: "额外 (é wài) - extra",
    },
    {
      char: "恶心",
      pinyin: "è xīn",
      meaning: "bad habit",
      breakdown: "恶心 (è xīn) - bad habit",
    },
    {
      char: "恶化",
      pinyin: "è huà",
      meaning: "to worsen",
      breakdown: "恶化 (è huà) - to worsen",
    },
    {
      char: "遏制",
      pinyin: "è zhì",
      meaning: "to check",
      breakdown: "遏制 (è zhì) - to check",
    },
    {
      char: "恩怨",
      pinyin: "ēn yuàn",
      meaning: "(feeling of) resentment",
      breakdown: "恩怨 (ēn yuàn) - (feeling of) resentment",
    },
    {
      char: "而已",
      pinyin: "ér yǐ",
      meaning: "that's all",
      breakdown: "而已 (ér yǐ) - that's all",
    },
    {
      char: "耳环",
      pinyin: "ěr huán",
      meaning: "earring",
      breakdown: "耳环 (ěr huán) - earring",
    },
    {
      char: "二氧化碳",
      pinyin: "èr yǎng huà tàn",
      meaning: "carbon dioxide CO2",
      breakdown: "二氧化碳 (èr yǎng huà tàn) - carbon dioxide CO2",
    },
    {
      char: "发布",
      pinyin: "fā bù",
      meaning: "to release",
      breakdown: "发布 (fā bù) - to release",
    },
    {
      char: "发财",
      pinyin: "fā cái",
      meaning: "to get rich",
      breakdown: "发财 (fā cái) - to get rich",
    },
    {
      char: "发呆",
      pinyin: "fā dāi",
      meaning: "to stare blankly",
      breakdown: "发呆 (fā dāi) - to stare blankly",
    },
    {
      char: "发动",
      pinyin: "fā dòng",
      meaning: "to start",
      breakdown: "发动 (fā dòng) - to start",
    },
    {
      char: "发火",
      pinyin: "fā huǒ",
      meaning: "to catch fire",
      breakdown: "发火 (fā huǒ) - to catch fire",
    },
    {
      char: "发觉",
      pinyin: "fā jué",
      meaning: "to find",
      breakdown: "发觉 (fā jué) - to find",
    },
    {
      char: "发射",
      pinyin: "fā shè",
      meaning: "to shoot (a projectile)",
      breakdown: "发射 (fā shè) - to shoot (a projectile)",
    },
    {
      char: "发誓",
      pinyin: "fā shì",
      meaning: "to vow",
      breakdown: "发誓 (fā shì) - to vow",
    },
    {
      char: "发行",
      pinyin: "fā xíng",
      meaning: "to publish",
      breakdown: "发行 (fā xíng) - to publish",
    },
    {
      char: "发炎",
      pinyin: "fā yán",
      meaning: "to become inflamed",
      breakdown: "发炎 (fā yán) - to become inflamed",
    },
    {
      char: "发扬",
      pinyin: "fā yáng",
      meaning: "to develop",
      breakdown: "发扬 (fā yáng) - to develop",
    },
    {
      char: "发育",
      pinyin: "fā yù",
      meaning: "to develop",
      breakdown: "发育 (fā yù) - to develop",
    },
    {
      char: "法人",
      pinyin: "fǎ rén",
      meaning: "legal person",
      breakdown: "法人 (fǎ rén) - legal person",
    },
    {
      char: "番",
      pinyin: "fān",
      meaning: "foreign",
      breakdown: "番 (fān) - foreign",
    },
    {
      char: "繁华",
      pinyin: "fán huá",
      meaning: "flourishing",
      breakdown: "繁华 (fán huá) - flourishing",
    },
    {
      char: "繁忙",
      pinyin: "fán máng",
      meaning: "busy",
      breakdown: "繁忙 (fán máng) - busy",
    },
    {
      char: "繁体字",
      pinyin: "fán tǐ zì",
      meaning: "traditional Chinese character",
      breakdown: "繁体字 (fán tǐ zì) - traditional Chinese character",
    },
    {
      char: "繁殖",
      pinyin: "fán zhí",
      meaning: "to breed",
      breakdown: "繁殖 (fán zhí) - to breed",
    },
    {
      char: "反驳",
      pinyin: "fǎn bó",
      meaning: "to retort",
      breakdown: "反驳 (fǎn bó) - to retort",
    },
    {
      char: "反常",
      pinyin: "fǎn cháng",
      meaning: "unusual",
      breakdown: "反常 (fǎn cháng) - unusual",
    },
    {
      char: "反倒",
      pinyin: "fǎn dào",
      meaning: "but on the contrary",
      breakdown: "反倒 (fǎn dào) - but on the contrary",
    },
    {
      char: "反动",
      pinyin: "fǎn dòng",
      meaning: "reaction",
      breakdown: "反动 (fǎn dòng) - reaction",
    },
    {
      char: "反感",
      pinyin: "fǎn gǎn",
      meaning: "to be disgusted with",
      breakdown: "反感 (fǎn gǎn) - to be disgusted with",
    },
    {
      char: "反抗",
      pinyin: "fǎn kàng",
      meaning: "to resist",
      breakdown: "反抗 (fǎn kàng) - to resist",
    },
    {
      char: "反馈",
      pinyin: "fǎn kuì",
      meaning: "to send back information",
      breakdown: "反馈 (fǎn kuì) - to send back information",
    },
    {
      char: "反面",
      pinyin: "fǎn miàn",
      meaning: "reverse side",
      breakdown: "反面 (fǎn miàn) - reverse side",
    },
    {
      char: "反射",
      pinyin: "fǎn shè",
      meaning: "to reflect",
      breakdown: "反射 (fǎn shè) - to reflect",
    },
    {
      char: "反思",
      pinyin: "fǎn sī",
      meaning: "to think back over sth",
      breakdown: "反思 (fǎn sī) - to think back over sth",
    },
    {
      char: "反问",
      pinyin: "fǎn wèn",
      meaning: "to ask (a question) in reply",
      breakdown: "反问 (fǎn wèn) - to ask (a question) in reply",
    },
    {
      char: "反之",
      pinyin: "fǎn zhī",
      meaning: "on the other hand...",
      breakdown: "反之 (fǎn zhī) - on the other hand...",
    },
    {
      char: "范畴",
      pinyin: "fàn chóu",
      meaning: "category",
      breakdown: "范畴 (fàn chóu) - category",
    },
    {
      char: "泛滥",
      pinyin: "fàn làn",
      meaning: "to be in flood",
      breakdown: "泛滥 (fàn làn) - to be in flood",
    },
    {
      char: "贩卖",
      pinyin: "fàn mài",
      meaning: "to sell",
      breakdown: "贩卖 (fàn mài) - to sell",
    },
    {
      char: "方位",
      pinyin: "fāng wèi",
      meaning: "direction",
      breakdown: "方位 (fāng wèi) - direction",
    },
    {
      char: "方言",
      pinyin: "fāng yán",
      meaning: "dialect",
      breakdown: "方言 (fāng yán) - dialect",
    },
    {
      char: "方针",
      pinyin: "fāng zhēn",
      meaning: "policy",
      breakdown: "方针 (fāng zhēn) - policy",
    },
    {
      char: "防守",
      pinyin: "fáng shǒu",
      meaning: "to defend",
      breakdown: "防守 (fáng shǒu) - to defend",
    },
    {
      char: "防疫",
      pinyin: "fáng yì",
      meaning: "disease prevention",
      breakdown: "防疫 (fáng yì) - disease prevention",
    },
    {
      char: "防御",
      pinyin: "fáng yù",
      meaning: "defense",
      breakdown: "防御 (fáng yù) - defense",
    },
    {
      char: "防止",
      pinyin: "fáng zhǐ",
      meaning: "to prevent",
      breakdown: "防止 (fáng zhǐ) - to prevent",
    },
    {
      char: "防治",
      pinyin: "fáng zhì",
      meaning: "prevention and cure",
      breakdown: "防治 (fáng zhì) - prevention and cure",
    },
    {
      char: "纺织",
      pinyin: "fǎng zhī",
      meaning: "spinning and weaving",
      breakdown: "纺织 (fǎng zhī) - spinning and weaving",
    },
    {
      char: "放大",
      pinyin: "fàng dà",
      meaning: "to enlarge",
      breakdown: "放大 (fàng dà) - to enlarge",
    },
    {
      char: "放射",
      pinyin: "fàng shè",
      meaning: "to radiate",
      breakdown: "放射 (fàng shè) - to radiate",
    },
    {
      char: "放手",
      pinyin: "fàng shǒu",
      meaning: "to let go one's hold",
      breakdown: "放手 (fàng shǒu) - to let go one's hold",
    },
    {
      char: "非法",
      pinyin: "fēi fǎ",
      meaning: "illegal",
      breakdown: "非法 (fēi fǎ) - illegal",
    },
    {
      char: "飞禽走兽",
      pinyin: "fēi qín zǒu shòu",
      meaning: "birds and animals",
      breakdown: "飞禽走兽 (fēi qín zǒu shòu) - birds and animals",
    },
    {
      char: "飞翔",
      pinyin: "fēi xiáng",
      meaning: "to fly",
      breakdown: "飞翔 (fēi xiáng) - to fly",
    },
    {
      char: "飞跃",
      pinyin: "fēi yuè",
      meaning: "to leap",
      breakdown: "飞跃 (fēi yuè) - to leap",
    },
    {
      char: "肥沃",
      pinyin: "féi wò",
      meaning: "fertile",
      breakdown: "肥沃 (féi wò) - fertile",
    },
    {
      char: "诽谤",
      pinyin: "fěi bàng",
      meaning: "to slander",
      breakdown: "诽谤 (fěi bàng) - to slander",
    },
    {
      char: "匪徒",
      pinyin: "fěi tú",
      meaning: "gangster",
      breakdown: "匪徒 (fěi tú) - gangster",
    },
    {
      char: "废除",
      pinyin: "fèi chú",
      meaning: "to abolish",
      breakdown: "废除 (fèi chú) - to abolish",
    },
    {
      char: "废墟",
      pinyin: "fèi xū",
      meaning: "ruins",
      breakdown: "废墟 (fèi xū) - ruins",
    },
    {
      char: "沸腾",
      pinyin: "fèi téng",
      meaning: "boiling",
      breakdown: "沸腾 (fèi téng) - boiling",
    },
    {
      char: "分辨",
      pinyin: "fēn biàn",
      meaning: "to distinguish",
      breakdown: "分辨 (fēn biàn) - to distinguish",
    },
    {
      char: "分寸",
      pinyin: "fēn cùn",
      meaning: "propriety",
      breakdown: "分寸 (fēn cùn) - propriety",
    },
    {
      char: "分红",
      pinyin: "fēn hóng",
      meaning: "a bonus",
      breakdown: "分红 (fēn hóng) - a bonus",
    },
    {
      char: "分解",
      pinyin: "fēn jiě",
      meaning: "to resolve",
      breakdown: "分解 (fēn jiě) - to resolve",
    },
    {
      char: "分裂",
      pinyin: "fēn liè",
      meaning: "to split up",
      breakdown: "分裂 (fēn liè) - to split up",
    },
    {
      char: "分泌",
      pinyin: "fēn mì",
      meaning: "to secrete",
      breakdown: "分泌 (fēn mì) - to secrete",
    },
    {
      char: "分明",
      pinyin: "fēn míng",
      meaning: "clearly demarcated",
      breakdown: "分明 (fēn míng) - clearly demarcated",
    },
    {
      char: "分歧",
      pinyin: "fēn qí",
      meaning: "difference (of opinion)",
      breakdown: "分歧 (fēn qí) - difference (of opinion)",
    },
    {
      char: "分散",
      pinyin: "fēn sàn",
      meaning: "to scatter",
      breakdown: "分散 (fēn sàn) - to scatter",
    },
    {
      char: "分手",
      pinyin: "fēn shǒu",
      meaning: "to split up",
      breakdown: "分手 (fēn shǒu) - to split up",
    },
    {
      char: "吩咐",
      pinyin: "fēn fù",
      meaning: "to tell",
      breakdown: "吩咐 (fēn fù) - to tell",
    },
    {
      char: "坟墓",
      pinyin: "fén mù",
      meaning: "sepulcher",
      breakdown: "坟墓 (fén mù) - sepulcher",
    },
    {
      char: "粉末",
      pinyin: "fěn mò",
      meaning: "fine powder",
      breakdown: "粉末 (fěn mò) - fine powder",
    },
    {
      char: "粉色",
      pinyin: "fěn sè",
      meaning: "white",
      breakdown: "粉色 (fěn sè) - white",
    },
    {
      char: "粉碎",
      pinyin: "fěn suì",
      meaning: "to crush",
      breakdown: "粉碎 (fěn suì) - to crush",
    },
    {
      char: "分量",
      pinyin: "fèn liang",
      meaning: "quantity",
      breakdown: "分量 (fèn liang) - quantity",
    },
    {
      char: "风暴",
      pinyin: "fēng bào",
      meaning: "storm",
      breakdown: "风暴 (fēng bào) - storm",
    },
    {
      char: "风度",
      pinyin: "fēng dù",
      meaning: "elegance (for men)",
      breakdown: "风度 (fēng dù) - elegance (for men)",
    },
    {
      char: "风光",
      pinyin: "fēng guāng",
      meaning: "scene",
      breakdown: "风光 (fēng guāng) - scene",
    },
    {
      char: "风气",
      pinyin: "fēng qì",
      meaning: "general mood",
      breakdown: "风气 (fēng qì) - general mood",
    },
    {
      char: "风趣",
      pinyin: "fēng qù",
      meaning: "humor",
      breakdown: "风趣 (fēng qù) - humor",
    },
    {
      char: "风土人情",
      pinyin: "fēng tǔ rén qíng",
      meaning: "local conditions and customs (idiom)",
      breakdown:
        "风土人情 (fēng tǔ rén qíng) - local conditions and customs (idiom)",
    },
    {
      char: "风味",
      pinyin: "fēng wèi",
      meaning: "local flavor",
      breakdown: "风味 (fēng wèi) - local flavor",
    },
    {
      char: "封闭",
      pinyin: "fēng bì",
      meaning: "to seal",
      breakdown: "封闭 (fēng bì) - to seal",
    },
    {
      char: "封建",
      pinyin: "fēng jiàn",
      meaning: "system of enfeoffment",
      breakdown: "封建 (fēng jiàn) - system of enfeoffment",
    },
    {
      char: "封锁",
      pinyin: "fēng suǒ",
      meaning: "to blockade",
      breakdown: "封锁 (fēng suǒ) - to blockade",
    },
    {
      char: "丰满",
      pinyin: "fēng mǎn",
      meaning: "ample",
      breakdown: "丰满 (fēng mǎn) - ample",
    },
    {
      char: "丰盛",
      pinyin: "fēng shèng",
      meaning: "rich",
      breakdown: "丰盛 (fēng shèng) - rich",
    },
    {
      char: "丰收",
      pinyin: "fēng shōu",
      meaning: "bumper harvest",
      breakdown: "丰收 (fēng shōu) - bumper harvest",
    },
    {
      char: "锋利",
      pinyin: "fēng lì",
      meaning: "sharp (e.g. knife blade)",
      breakdown: "锋利 (fēng lì) - sharp (e.g. knife blade)",
    },
    {
      char: "逢",
      pinyin: "féng",
      meaning: "to meet by chance",
      breakdown: "逢 (féng) - to meet by chance",
    },
    {
      char: "奉献",
      pinyin: "fèng xiàn",
      meaning: "to consecrate",
      breakdown: "奉献 (fèng xiàn) - to consecrate",
    },
    {
      char: "否决",
      pinyin: "fǒu jué",
      meaning: "veto",
      breakdown: "否决 (fǒu jué) - veto",
    },
    {
      char: "夫妇",
      pinyin: "fū fù",
      meaning: "a (married) couple",
      breakdown: "夫妇 (fū fù) - a (married) couple",
    },
    {
      char: "夫人",
      pinyin: "fū ren",
      meaning: "lady",
      breakdown: "夫人 (fū ren) - lady",
    },
    {
      char: "敷衍",
      pinyin: "fū yǎn",
      meaning: "to elaborate (on a theme)",
      breakdown: "敷衍 (fū yǎn) - to elaborate (on a theme)",
    },
    {
      char: "幅度",
      pinyin: "fú dù",
      meaning: "width",
      breakdown: "幅度 (fú dù) - width",
    },
    {
      char: "服气",
      pinyin: "fú qì",
      meaning: "to be convinced",
      breakdown: "服气 (fú qì) - to be convinced",
    },
    {
      char: "符号",
      pinyin: "fú hào",
      meaning: "symbol",
      breakdown: "符号 (fú hào) - symbol",
    },
    {
      char: "福利",
      pinyin: "fú lì",
      meaning: "(material) welfare",
      breakdown: "福利 (fú lì) - (material) welfare",
    },
    {
      char: "福气",
      pinyin: "fú qi",
      meaning: "good fortune",
      breakdown: "福气 (fú qi) - good fortune",
    },
    {
      char: "俘虏",
      pinyin: "fú lǔ",
      meaning: "captive",
      breakdown: "俘虏 (fú lǔ) - captive",
    },
    {
      char: "辐射",
      pinyin: "fú shè",
      meaning: "radiation",
      breakdown: "辐射 (fú shè) - radiation",
    },
    {
      char: "腐败",
      pinyin: "fǔ bài",
      meaning: "corruption",
      breakdown: "腐败 (fǔ bài) - corruption",
    },
    {
      char: "腐烂",
      pinyin: "fǔ làn",
      meaning: "to rot",
      breakdown: "腐烂 (fǔ làn) - to rot",
    },
    {
      char: "腐蚀",
      pinyin: "fǔ shí",
      meaning: "corrosion",
      breakdown: "腐蚀 (fǔ shí) - corrosion",
    },
    {
      char: "腐朽",
      pinyin: "fǔ xiǔ",
      meaning: "rotten",
      breakdown: "腐朽 (fǔ xiǔ) - rotten",
    },
    {
      char: "辅助",
      pinyin: "fǔ zhù",
      meaning: "to assist",
      breakdown: "辅助 (fǔ zhù) - to assist",
    },
    {
      char: "抚养",
      pinyin: "fǔ yǎng",
      meaning: "to foster",
      breakdown: "抚养 (fǔ yǎng) - to foster",
    },
    {
      char: "俯仰",
      pinyin: "fǔ yǎng",
      meaning: "lowering and raising of the head",
      breakdown: "俯仰 (fǔ yǎng) - lowering and raising of the head",
    },
    {
      char: "富裕",
      pinyin: "fù yù",
      meaning: "prosperous",
      breakdown: "富裕 (fù yù) - prosperous",
    },
    {
      char: "副",
      pinyin: "fù",
      meaning: "secondary",
      breakdown: "副 (fù) - secondary",
    },
    {
      char: "副作用",
      pinyin: "fù zuò yòng",
      meaning: "side effect",
      breakdown: "副作用 (fù zuò yòng) - side effect",
    },
    {
      char: "负担",
      pinyin: "fù dān",
      meaning: "burden",
      breakdown: "负担 (fù dān) - burden",
    },
    {
      char: "覆盖",
      pinyin: "fù gài",
      meaning: "to cover",
      breakdown: "覆盖 (fù gài) - to cover",
    },
    {
      char: "附和",
      pinyin: "fù hè",
      meaning: "to parrot",
      breakdown: "附和 (fù hè) - to parrot",
    },
    {
      char: "附件",
      pinyin: "fù jiàn",
      meaning: "enclosure",
      breakdown: "附件 (fù jiàn) - enclosure",
    },
    {
      char: "附属",
      pinyin: "fù shǔ",
      meaning: "subsidiary",
      breakdown: "附属 (fù shǔ) - subsidiary",
    },
    {
      char: "复活",
      pinyin: "fù huó",
      meaning: "resurrection",
      breakdown: "复活 (fù huó) - resurrection",
    },
    {
      char: "复兴",
      pinyin: "fù xīng",
      meaning: "to revive",
      breakdown: "复兴 (fù xīng) - to revive",
    },
    {
      char: "腹泻",
      pinyin: "fù xiè",
      meaning: "diarrhea",
      breakdown: "腹泻 (fù xiè) - diarrhea",
    },
    {
      char: "赋予",
      pinyin: "fù yǔ",
      meaning: "to assign",
      breakdown: "赋予 (fù yǔ) - to assign",
    },
    {
      char: "改良",
      pinyin: "gǎi liáng",
      meaning: "to improve",
      breakdown: "改良 (gǎi liáng) - to improve",
    },
    {
      char: "盖章",
      pinyin: "gài zhāng",
      meaning: "to affix a seal (to sth)",
      breakdown: "盖章 (gài zhāng) - to affix a seal (to sth)",
    },
    {
      char: "干旱",
      pinyin: "gān hàn",
      meaning: "drought",
      breakdown: "干旱 (gān hàn) - drought",
    },
    {
      char: "干扰",
      pinyin: "gān rǎo",
      meaning: "to interfere",
      breakdown: "干扰 (gān rǎo) - to interfere",
    },
    {
      char: "干涉",
      pinyin: "gān shè",
      meaning: "to interfere",
      breakdown: "干涉 (gān shè) - to interfere",
    },
    {
      char: "干预",
      pinyin: "gān yù",
      meaning: "to meddle",
      breakdown: "干预 (gān yù) - to meddle",
    },
    {
      char: "尴尬",
      pinyin: "gān gà",
      meaning: "awkward",
      breakdown: "尴尬 (gān gà) - awkward",
    },
    {
      char: "甘心",
      pinyin: "gān xīn",
      meaning: "to be willing to",
      breakdown: "甘心 (gān xīn) - to be willing to",
    },
    {
      char: "感慨",
      pinyin: "gǎn kǎi",
      meaning: "to sigh with sorrow",
      breakdown: "感慨 (gǎn kǎi) - to sigh with sorrow",
    },
    {
      char: "感染",
      pinyin: "gǎn rǎn",
      meaning: "infection",
      breakdown: "感染 (gǎn rǎn) - infection",
    },
    {
      char: "干劲",
      pinyin: "gàn jìn",
      meaning: "enthusiasm for doing sth",
      breakdown: "干劲 (gàn jìn) - enthusiasm for doing sth",
    },
    {
      char: "纲领",
      pinyin: "gāng lǐng",
      meaning: "program",
      breakdown: "纲领 (gāng lǐng) - program",
    },
    {
      char: "港口",
      pinyin: "gǎng kǒu",
      meaning: "port",
      breakdown: "港口 (gǎng kǒu) - port",
    },
    {
      char: "港湾",
      pinyin: "gǎng wān",
      meaning: "natural harbor",
      breakdown: "港湾 (gǎng wān) - natural harbor",
    },
    {
      char: "岗位",
      pinyin: "gǎng wèi",
      meaning: "a post",
      breakdown: "岗位 (gǎng wèi) - a post",
    },
    {
      char: "杠杆",
      pinyin: "gàng gǎn",
      meaning: "lever",
      breakdown: "杠杆 (gàng gǎn) - lever",
    },
    {
      char: "高超",
      pinyin: "gāo chāo",
      meaning: "excellent",
      breakdown: "高超 (gāo chāo) - excellent",
    },
    {
      char: "高潮",
      pinyin: "gāo cháo",
      meaning: "high tide",
      breakdown: "高潮 (gāo cháo) - high tide",
    },
    {
      char: "高峰",
      pinyin: "gāo fēng",
      meaning: "peak",
      breakdown: "高峰 (gāo fēng) - peak",
    },
    {
      char: "高考",
      pinyin: "gāo kǎo",
      meaning:
        "college entrance exam (abbr. for 普通高等學校招生全國統一考試|普通高等学校招生全国统一考试)",
      breakdown:
        "高考 (gāo kǎo) - college entrance exam (abbr. for 普通高等學校招生全國統一考試|普通高等学校招生全国统一考试)",
    },
    {
      char: "高明",
      pinyin: "gāo míng",
      meaning: "brilliant",
      breakdown: "高明 (gāo míng) - brilliant",
    },
    {
      char: "高尚",
      pinyin: "gāo shàng",
      meaning: "noble",
      breakdown: "高尚 (gāo shàng) - noble",
    },
    {
      char: "高涨",
      pinyin: "gāo zhǎng",
      meaning: "upsurge",
      breakdown: "高涨 (gāo zhǎng) - upsurge",
    },
    {
      char: "稿件",
      pinyin: "gǎo jiàn",
      meaning: "rough draft",
      breakdown: "稿件 (gǎo jiàn) - rough draft",
    },
    {
      char: "告辞",
      pinyin: "gào cí",
      meaning: "to say goodbye",
      breakdown: "告辞 (gào cí) - to say goodbye",
    },
    {
      char: "告诫",
      pinyin: "gào jiè",
      meaning: "to warn",
      breakdown: "告诫 (gào jiè) - to warn",
    },
    {
      char: "割",
      pinyin: "gē",
      meaning: "to cut",
      breakdown: "割 (gē) - to cut",
    },
    {
      char: "搁",
      pinyin: "gē",
      meaning: "to place",
      breakdown: "搁 (gē) - to place",
    },
    {
      char: "疙瘩",
      pinyin: "gē da",
      meaning: "swelling or lump on skin",
      breakdown: "疙瘩 (gē da) - swelling or lump on skin",
    },
    {
      char: "歌颂",
      pinyin: "gē sòng",
      meaning: "to sing the praises of",
      breakdown: "歌颂 (gē sòng) - to sing the praises of",
    },
    {
      char: "隔阂",
      pinyin: "gé hé",
      meaning: "estrangement",
      breakdown: "隔阂 (gé hé) - estrangement",
    },
    {
      char: "隔离",
      pinyin: "gé lí",
      meaning: "to separate",
      breakdown: "隔离 (gé lí) - to separate",
    },
    {
      char: "格局",
      pinyin: "gé jú",
      meaning: "structure",
      breakdown: "格局 (gé jú) - structure",
    },
    {
      char: "格式",
      pinyin: "gé shì",
      meaning: "form",
      breakdown: "格式 (gé shì) - form",
    },
    {
      char: "个体",
      pinyin: "gè tǐ",
      meaning: "individual",
      breakdown: "个体 (gè tǐ) - individual",
    },
    {
      char: "各抒己见",
      pinyin: "gè shū jǐ jiàn",
      meaning: "everyone gives their own view",
      breakdown: "各抒己见 (gè shū jǐ jiàn) - everyone gives their own view",
    },
    {
      char: "根深蒂固",
      pinyin: "gēn shēn dì gù",
      meaning: "deep-rooted (problem etc)",
      breakdown: "根深蒂固 (gēn shēn dì gù) - deep-rooted (problem etc)",
    },
    {
      char: "根源",
      pinyin: "gēn yuán",
      meaning: "origin",
      breakdown: "根源 (gēn yuán) - origin",
    },
    {
      char: "跟前",
      pinyin: "gēn qián",
      meaning: "in front of",
      breakdown: "跟前 (gēn qián) - in front of",
    },
    {
      char: "跟随",
      pinyin: "gēn suí",
      meaning: "to follow",
      breakdown: "跟随 (gēn suí) - to follow",
    },
    {
      char: "跟踪",
      pinyin: "gēn zōng",
      meaning: "to follow sb's tracks",
      breakdown: "跟踪 (gēn zōng) - to follow sb's tracks",
    },
    {
      char: "耕地",
      pinyin: "gēng dì",
      meaning: "arable land",
      breakdown: "耕地 (gēng dì) - arable land",
    },
    {
      char: "更新",
      pinyin: "gēng xīn",
      meaning: "to replace the old with new",
      breakdown: "更新 (gēng xīn) - to replace the old with new",
    },
    {
      char: "更正",
      pinyin: "gēng zhèng",
      meaning: "to correct",
      breakdown: "更正 (gēng zhèng) - to correct",
    },
    {
      char: "公安局",
      pinyin: "gōng ān jú",
      meaning: "public security bureau",
      breakdown: "公安局 (gōng ān jú) - public security bureau",
    },
    {
      char: "公道",
      pinyin: "gōng dao",
      meaning: "fair",
      breakdown: "公道 (gōng dao) - fair",
    },
    {
      char: "公告",
      pinyin: "gōng gào",
      meaning: "post",
      breakdown: "公告 (gōng gào) - post",
    },
    {
      char: "公关",
      pinyin: "gōng guān",
      meaning: "public relations",
      breakdown: "公关 (gōng guān) - public relations",
    },
    {
      char: "公民",
      pinyin: "gōng mín",
      meaning: "citizen",
      breakdown: "公民 (gōng mín) - citizen",
    },
    {
      char: "公婆",
      pinyin: "gōng pó",
      meaning: "husband's parents",
      breakdown: "公婆 (gōng pó) - husband's parents",
    },
    {
      char: "公然",
      pinyin: "gōng rán",
      meaning: "openly",
      breakdown: "公然 (gōng rán) - openly",
    },
    {
      char: "公认",
      pinyin: "gōng rèn",
      meaning: "publicly known (to be)",
      breakdown: "公认 (gōng rèn) - publicly known (to be)",
    },
    {
      char: "公式",
      pinyin: "gōng shì",
      meaning: "formula",
      breakdown: "公式 (gōng shì) - formula",
    },
    {
      char: "公务",
      pinyin: "gōng wù",
      meaning: "official business",
      breakdown: "公务 (gōng wù) - official business",
    },
    {
      char: "公正",
      pinyin: "gōng zhèng",
      meaning: "just",
      breakdown: "公正 (gōng zhèng) - just",
    },
    {
      char: "公证",
      pinyin: "gōng zhèng",
      meaning: "notarization",
      breakdown: "公证 (gōng zhèng) - notarization",
    },
    {
      char: "供不应求",
      pinyin: "gōng bù yìng qiú",
      meaning: "supply does not meet demand",
      breakdown: "供不应求 (gōng bù yìng qiú) - supply does not meet demand",
    },
    {
      char: "供给",
      pinyin: "gōng jǐ",
      meaning: "to furnish",
      breakdown: "供给 (gōng jǐ) - to furnish",
    },
    {
      char: "工夫",
      pinyin: "gōng fu",
      meaning: "time",
      breakdown: "工夫 (gōng fu) - time",
    },
    {
      char: "工艺品",
      pinyin: "gōng yì pǐn",
      meaning: "handicraft article",
      breakdown: "工艺品 (gōng yì pǐn) - handicraft article",
    },
    {
      char: "宫殿",
      pinyin: "gōng diàn",
      meaning: "palace",
      breakdown: "宫殿 (gōng diàn) - palace",
    },
    {
      char: "功课",
      pinyin: "gōng kè",
      meaning: "homework",
      breakdown: "功课 (gōng kè) - homework",
    },
    {
      char: "功劳",
      pinyin: "gōng láo",
      meaning: "contribution",
      breakdown: "功劳 (gōng láo) - contribution",
    },
    {
      char: "功效",
      pinyin: "gōng xiào",
      meaning: "efficacy",
      breakdown: "功效 (gōng xiào) - efficacy",
    },
    {
      char: "攻击",
      pinyin: "gōng jī",
      meaning: "to attack",
      breakdown: "攻击 (gōng jī) - to attack",
    },
    {
      char: "攻克",
      pinyin: "gōng kè",
      meaning: "to capture",
      breakdown: "攻克 (gōng kè) - to capture",
    },
    {
      char: "恭敬",
      pinyin: "gōng jìng",
      meaning: "deferential",
      breakdown: "恭敬 (gōng jìng) - deferential",
    },
    {
      char: "巩固",
      pinyin: "gǒng gù",
      meaning: "to consolidate",
      breakdown: "巩固 (gǒng gù) - to consolidate",
    },
    {
      char: "共和国",
      pinyin: "gòng hé guó",
      meaning: "republic",
      breakdown: "共和国 (gòng hé guó) - republic",
    },
    {
      char: "共计",
      pinyin: "gòng jì",
      meaning: "to sum up to",
      breakdown: "共计 (gòng jì) - to sum up to",
    },
    {
      char: "共鸣",
      pinyin: "gòng míng",
      meaning: "resonance (physics)",
      breakdown: "共鸣 (gòng míng) - resonance (physics)",
    },
    {
      char: "勾结",
      pinyin: "gōu jié",
      meaning: "to collude with",
      breakdown: "勾结 (gōu jié) - to collude with",
    },
    {
      char: "钩子",
      pinyin: "gōu zi",
      meaning: "hook",
      breakdown: "钩子 (gōu zi) - hook",
    },
    {
      char: "构思",
      pinyin: "gòu sī",
      meaning: "to design",
      breakdown: "构思 (gòu sī) - to design",
    },
    {
      char: "孤独",
      pinyin: "gū dú",
      meaning: "lonely",
      breakdown: "孤独 (gū dú) - lonely",
    },
    {
      char: "孤立",
      pinyin: "gū lì",
      meaning: "isolate",
      breakdown: "孤立 (gū lì) - isolate",
    },
    {
      char: "辜负",
      pinyin: "gū fù",
      meaning: "to fail to live up (to expectations)",
      breakdown: "辜负 (gū fù) - to fail to live up (to expectations)",
    },
    {
      char: "姑且",
      pinyin: "gū qiě",
      meaning: "temporarily",
      breakdown: "姑且 (gū qiě) - temporarily",
    },
    {
      char: "古董",
      pinyin: "gǔ dǒng",
      meaning: "curio",
      breakdown: "古董 (gǔ dǒng) - curio",
    },
    {
      char: "古怪",
      pinyin: "gǔ guài",
      meaning: "eccentric",
      breakdown: "古怪 (gǔ guài) - eccentric",
    },
    {
      char: "股东",
      pinyin: "gǔ dōng",
      meaning: "shareholder",
      breakdown: "股东 (gǔ dōng) - shareholder",
    },
    {
      char: "股份",
      pinyin: "gǔ fèn",
      meaning: "a share (in a company)",
      breakdown: "股份 (gǔ fèn) - a share (in a company)",
    },
    {
      char: "鼓动",
      pinyin: "gǔ dòng",
      meaning: "to agitate",
      breakdown: "鼓动 (gǔ dòng) - to agitate",
    },
    {
      char: "骨干",
      pinyin: "gǔ gàn",
      meaning: "diaphysis (long segment of a bone)",
      breakdown: "骨干 (gǔ gàn) - diaphysis (long segment of a bone)",
    },
    {
      char: "固然",
      pinyin: "gù rán",
      meaning: "admittedly (it's true that...)",
      breakdown: "固然 (gù rán) - admittedly (it's true that...)",
    },
    {
      char: "固有",
      pinyin: "gù yǒu",
      meaning: "intrinsic to sth",
      breakdown: "固有 (gù yǒu) - intrinsic to sth",
    },
    {
      char: "固执",
      pinyin: "gù zhí",
      meaning: "obstinate",
      breakdown: "固执 (gù zhí) - obstinate",
    },
    {
      char: "顾虑",
      pinyin: "gù lǜ",
      meaning: "misgivings",
      breakdown: "顾虑 (gù lǜ) - misgivings",
    },
    {
      char: "顾问",
      pinyin: "gù wèn",
      meaning: "adviser",
      breakdown: "顾问 (gù wèn) - adviser",
    },
    {
      char: "故乡",
      pinyin: "gù xiāng",
      meaning: "home",
      breakdown: "故乡 (gù xiāng) - home",
    },
    {
      char: "故障",
      pinyin: "gù zhàng",
      meaning: "malfunction",
      breakdown: "故障 (gù zhàng) - malfunction",
    },
    {
      char: "拐杖",
      pinyin: "guǎi zhàng",
      meaning: "crutches",
      breakdown: "拐杖 (guǎi zhàng) - crutches",
    },
    {
      char: "关照",
      pinyin: "guān zhào",
      meaning: "to take care",
      breakdown: "关照 (guān zhào) - to take care",
    },
    {
      char: "官方",
      pinyin: "guān fāng",
      meaning: "official",
      breakdown: "官方 (guān fāng) - official",
    },
    {
      char: "观光",
      pinyin: "guān guāng",
      meaning: "to tour",
      breakdown: "观光 (guān guāng) - to tour",
    },
    {
      char: "管辖",
      pinyin: "guǎn xiá",
      meaning: "to administer",
      breakdown: "管辖 (guǎn xiá) - to administer",
    },
    {
      char: "罐",
      pinyin: "guàn",
      meaning: "can",
      breakdown: "罐 (guàn) - can",
    },
    {
      char: "贯彻",
      pinyin: "guàn chè",
      meaning: "to implement",
      breakdown: "贯彻 (guàn chè) - to implement",
    },
    {
      char: "灌溉",
      pinyin: "guàn gài",
      meaning: "to irrigate",
      breakdown: "灌溉 (guàn gài) - to irrigate",
    },
    {
      char: "惯例",
      pinyin: "guàn lì",
      meaning: "convention",
      breakdown: "惯例 (guàn lì) - convention",
    },
    {
      char: "光彩",
      pinyin: "guāng cǎi",
      meaning: "luster",
      breakdown: "光彩 (guāng cǎi) - luster",
    },
    {
      char: "光辉",
      pinyin: "guāng huī",
      meaning: "radiance",
      breakdown: "光辉 (guāng huī) - radiance",
    },
    {
      char: "光芒",
      pinyin: "guāng máng",
      meaning: "rays of light",
      breakdown: "光芒 (guāng máng) - rays of light",
    },
    {
      char: "广阔",
      pinyin: "guǎng kuò",
      meaning: "wide",
      breakdown: "广阔 (guǎng kuò) - wide",
    },
    {
      char: "规范",
      pinyin: "guī fàn",
      meaning: "norm",
      breakdown: "规范 (guī fàn) - norm",
    },
    {
      char: "规格",
      pinyin: "guī gé",
      meaning: "standard",
      breakdown: "规格 (guī gé) - standard",
    },
    {
      char: "规划",
      pinyin: "guī huà",
      meaning: "to plan (how to do sth)",
      breakdown: "规划 (guī huà) - to plan (how to do sth)",
    },
    {
      char: "规章",
      pinyin: "guī zhāng",
      meaning: "rule",
      breakdown: "规章 (guī zhāng) - rule",
    },
    {
      char: "归根到底",
      pinyin: "guī gēn dào dǐ",
      meaning: "(saying) to sum it up...",
      breakdown: "归根到底 (guī gēn dào dǐ) - (saying) to sum it up...",
    },
    {
      char: "归还",
      pinyin: "guī huán",
      meaning: "to return sth",
      breakdown: "归还 (guī huán) - to return sth",
    },
    {
      char: "归纳",
      pinyin: "guī nà",
      meaning: "to sum up",
      breakdown: "归纳 (guī nà) - to sum up",
    },
    {
      char: "轨道",
      pinyin: "guǐ dào",
      meaning: "orbit",
      breakdown: "轨道 (guǐ dào) - orbit",
    },
    {
      char: "跪",
      pinyin: "guì",
      meaning: "to kneel",
      breakdown: "跪 (guì) - to kneel",
    },
    {
      char: "贵族",
      pinyin: "guì zú",
      meaning: "lord",
      breakdown: "贵族 (guì zú) - lord",
    },
    {
      char: "棍棒",
      pinyin: "gùn bàng",
      meaning: "club",
      breakdown: "棍棒 (gùn bàng) - club",
    },
    {
      char: "国防",
      pinyin: "guó fáng",
      meaning: "national defense",
      breakdown: "国防 (guó fáng) - national defense",
    },
    {
      char: "国务院",
      pinyin: "Guó Wù Yuàn",
      meaning: "State Council (PRC)",
      breakdown: "国务院 (Guó Wù Yuàn) - State Council (PRC)",
    },
    {
      char: "果断",
      pinyin: "guǒ duàn",
      meaning: "firm",
      breakdown: "果断 (guǒ duàn) - firm",
    },
    {
      char: "过度",
      pinyin: "guò dù",
      meaning: "excessive",
      breakdown: "过度 (guò dù) - excessive",
    },
    {
      char: "过渡",
      pinyin: "guò dù",
      meaning: "to cross over (by ferry)",
      breakdown: "过渡 (guò dù) - to cross over (by ferry)",
    },
    {
      char: "过奖",
      pinyin: "guò jiǎng",
      meaning: "to over-praise",
      breakdown: "过奖 (guò jiǎng) - to over-praise",
    },
    {
      char: "过滤",
      pinyin: "guò lǜ",
      meaning: "to filter",
      breakdown: "过滤 (guò lǜ) - to filter",
    },
    {
      char: "过失",
      pinyin: "guò shī",
      meaning: "defect",
      breakdown: "过失 (guò shī) - defect",
    },
    {
      char: "过问",
      pinyin: "guò wèn",
      meaning: "to show an interest in",
      breakdown: "过问 (guò wèn) - to show an interest in",
    },
    {
      char: "过瘾",
      pinyin: "guò yǐn",
      meaning: "to satisfy a craving",
      breakdown: "过瘾 (guò yǐn) - to satisfy a craving",
    },
    {
      char: "过于",
      pinyin: "guò yú",
      meaning: "too much",
      breakdown: "过于 (guò yú) - too much",
    },
    {
      char: "嗨",
      pinyin: "hāi",
      meaning: "oh alas",
      breakdown: "嗨 (hāi) - oh alas",
    },
    {
      char: "海拔",
      pinyin: "hǎi bá",
      meaning: "height above sea level",
      breakdown: "海拔 (hǎi bá) - height above sea level",
    },
    {
      char: "海滨",
      pinyin: "hǎi bīn",
      meaning: "shore",
      breakdown: "海滨 (hǎi bīn) - shore",
    },
    {
      char: "含糊",
      pinyin: "hán hú",
      meaning: "obscurity",
      breakdown: "含糊 (hán hú) - obscurity",
    },
    {
      char: "含义",
      pinyin: "hán yì",
      meaning: "meaning (implicit in a phrase)",
      breakdown: "含义 (hán yì) - meaning (implicit in a phrase)",
    },
    {
      char: "寒暄",
      pinyin: "hán xuān",
      meaning: "exchanging conventional greetings",
      breakdown: "寒暄 (hán xuān) - exchanging conventional greetings",
    },
    {
      char: "罕见",
      pinyin: "hǎn jiàn",
      meaning: "rare",
      breakdown: "罕见 (hǎn jiàn) - rare",
    },
    {
      char: "捍卫",
      pinyin: "hàn wèi",
      meaning: "to defend",
      breakdown: "捍卫 (hàn wèi) - to defend",
    },
    {
      char: "航空",
      pinyin: "háng kōng",
      meaning: "aviation",
      breakdown: "航空 (háng kōng) - aviation",
    },
    {
      char: "航天",
      pinyin: "háng tiān",
      meaning: "space flight",
      breakdown: "航天 (háng tiān) - space flight",
    },
    {
      char: "航行",
      pinyin: "háng xíng",
      meaning: "to sail",
      breakdown: "航行 (háng xíng) - to sail",
    },
    {
      char: "行列",
      pinyin: "háng liè",
      meaning: "procession",
      breakdown: "行列 (háng liè) - procession",
    },
    {
      char: "豪迈",
      pinyin: "háo mài",
      meaning: "bold",
      breakdown: "豪迈 (háo mài) - bold",
    },
    {
      char: "毫米",
      pinyin: "háo mǐ",
      meaning: "millimeter",
      breakdown: "毫米 (háo mǐ) - millimeter",
    },
    {
      char: "毫无",
      pinyin: "háo wú",
      meaning: "not in the least",
      breakdown: "毫无 (háo wú) - not in the least",
    },
    {
      char: "号召",
      pinyin: "hào zhào",
      meaning: "to call",
      breakdown: "号召 (hào zhào) - to call",
    },
    {
      char: "耗费",
      pinyin: "hào fèi",
      meaning: "to waste",
      breakdown: "耗费 (hào fèi) - to waste",
    },
    {
      char: "好客",
      pinyin: "hào kè",
      meaning: "hospitality",
      breakdown: "好客 (hào kè) - hospitality",
    },
    {
      char: "呵",
      pinyin: "hē",
      meaning: "expel breath",
      breakdown: "呵 (hē) - expel breath",
    },
    {
      char: "和蔼",
      pinyin: "hé ǎi",
      meaning: "kindly",
      breakdown: "和蔼 (hé ǎi) - kindly",
    },
    {
      char: "和解",
      pinyin: "hé jiě",
      meaning: "to settle (a dispute out of court)",
      breakdown: "和解 (hé jiě) - to settle (a dispute out of court)",
    },
    {
      char: "和睦",
      pinyin: "hé mù",
      meaning: "peaceful relations",
      breakdown: "和睦 (hé mù) - peaceful relations",
    },
    {
      char: "和气",
      pinyin: "hé qi",
      meaning: "friendly",
      breakdown: "和气 (hé qi) - friendly",
    },
    {
      char: "和谐",
      pinyin: "hé xié",
      meaning: "harmonious",
      breakdown: "和谐 (hé xié) - harmonious",
    },
    {
      char: "合并",
      pinyin: "hé bìng",
      meaning: "to merge",
      breakdown: "合并 (hé bìng) - to merge",
    },
    {
      char: "合成",
      pinyin: "hé chéng",
      meaning: "to compose",
      breakdown: "合成 (hé chéng) - to compose",
    },
    {
      char: "合乎",
      pinyin: "hé hū",
      meaning: "to accord with",
      breakdown: "合乎 (hé hū) - to accord with",
    },
    {
      char: "合伙",
      pinyin: "hé huǒ",
      meaning: "to act jointly",
      breakdown: "合伙 (hé huǒ) - to act jointly",
    },
    {
      char: "合身",
      pinyin: "hé shēn",
      meaning: "well-fitting (of clothes)",
      breakdown: "合身 (hé shēn) - well-fitting (of clothes)",
    },
    {
      char: "合算",
      pinyin: "hé suàn",
      meaning: "worthwhile",
      breakdown: "合算 (hé suàn) - worthwhile",
    },
    { char: "嘿", pinyin: "hēi", meaning: "hey", breakdown: "嘿 (hēi) - hey" },
    {
      char: "痕迹",
      pinyin: "hén jì",
      meaning: "vestige",
      breakdown: "痕迹 (hén jì) - vestige",
    },
    {
      char: "狠心",
      pinyin: "hěn xīn",
      meaning: "callous",
      breakdown: "狠心 (hěn xīn) - callous",
    },
    {
      char: "恨不得",
      pinyin: "hèn bu dé",
      meaning: "wishing one could do sth",
      breakdown: "恨不得 (hèn bu dé) - wishing one could do sth",
    },
    {
      char: "哼",
      pinyin: "hēng",
      meaning: "to groan",
      breakdown: "哼 (hēng) - to groan",
    },
    {
      char: "哄",
      pinyin: "hōng",
      meaning: "roar of laughter (onomatopoeia)",
      breakdown: "哄 (hōng) - roar of laughter (onomatopoeia)",
    },
    {
      char: "烘",
      pinyin: "hōng",
      meaning: "to bake",
      breakdown: "烘 (hōng) - to bake",
    },
    {
      char: "轰动",
      pinyin: "hōng dòng",
      meaning: "to cause a sensation",
      breakdown: "轰动 (hōng dòng) - to cause a sensation",
    },
    {
      char: "红包",
      pinyin: "hóng bāo",
      meaning: "lit. money wrapped in red as a gift",
      breakdown: "红包 (hóng bāo) - lit. money wrapped in red as a gift",
    },
    {
      char: "宏观",
      pinyin: "hóng guān",
      meaning: "macro-",
      breakdown: "宏观 (hóng guān) - macro-",
    },
    {
      char: "宏伟",
      pinyin: "hóng wěi",
      meaning: "grand",
      breakdown: "宏伟 (hóng wěi) - grand",
    },
    {
      char: "洪水",
      pinyin: "hóng shuǐ",
      meaning: "deluge",
      breakdown: "洪水 (hóng shuǐ) - deluge",
    },
    {
      char: "喉咙",
      pinyin: "hóu lóng",
      meaning: "throat",
      breakdown: "喉咙 (hóu lóng) - throat",
    },
    {
      char: "吼",
      pinyin: "hǒu",
      meaning: "roar or howl of an animal",
      breakdown: "吼 (hǒu) - roar or howl of an animal",
    },
    {
      char: "后代",
      pinyin: "hòu dài",
      meaning: "posterity",
      breakdown: "后代 (hòu dài) - posterity",
    },
    {
      char: "后顾之忧",
      pinyin: "hòu gù zhī yōu",
      meaning:
        "fears of trouble in the rear (idiom); family worries (obstructing freedom of action)",
      breakdown:
        "后顾之忧 (hòu gù zhī yōu) - fears of trouble in the rear (idiom); family worries (obstructing freedom of action)",
    },
    {
      char: "后勤",
      pinyin: "hòu qín",
      meaning: "logistics",
      breakdown: "后勤 (hòu qín) - logistics",
    },
    {
      char: "候选",
      pinyin: "hòu xuǎn",
      meaning: "candidate",
      breakdown: "候选 (hòu xuǎn) - candidate",
    },
    {
      char: "忽略",
      pinyin: "hū lvè",
      meaning: "to neglect",
      breakdown: "忽略 (hū lvè) - to neglect",
    },
    {
      char: "呼啸",
      pinyin: "hū xiào",
      meaning: "to whistle",
      breakdown: "呼啸 (hū xiào) - to whistle",
    },
    {
      char: "呼吁",
      pinyin: "hū yù",
      meaning: "to call on (sb to do sth)",
      breakdown: "呼吁 (hū yù) - to call on (sb to do sth)",
    },
    {
      char: "胡乱",
      pinyin: "hú luàn",
      meaning: "careless",
      breakdown: "胡乱 (hú luàn) - careless",
    },
    {
      char: "湖泊",
      pinyin: "hú pō",
      meaning: "lake",
      breakdown: "湖泊 (hú pō) - lake",
    },
    {
      char: "互联网",
      pinyin: "Hù lián wǎng",
      meaning: "the Internet",
      breakdown: "互联网 (Hù lián wǎng) - the Internet",
    },
    {
      char: "花瓣",
      pinyin: "huā bàn",
      meaning: "petal",
      breakdown: "花瓣 (huā bàn) - petal",
    },
    {
      char: "华丽",
      pinyin: "huá lì",
      meaning: "gorgeous",
      breakdown: "华丽 (huá lì) - gorgeous",
    },
    {
      char: "华侨",
      pinyin: "huá qiáo",
      meaning: "overseas Chinese",
      breakdown: "华侨 (huá qiáo) - overseas Chinese",
    },
    {
      char: "画蛇添足",
      pinyin: "huà shé tiān zú",
      meaning:
        "lit. draw legs on a snake (idiom); fig. to ruin the effect by adding sth superfluous",
      breakdown:
        "画蛇添足 (huà shé tiān zú) - lit. draw legs on a snake (idiom); fig. to ruin the effect by adding sth superfluous",
    },
    {
      char: "化肥",
      pinyin: "huà féi",
      meaning: "fertilizer",
      breakdown: "化肥 (huà féi) - fertilizer",
    },
    {
      char: "化石",
      pinyin: "huà shí",
      meaning: "fossil",
      breakdown: "化石 (huà shí) - fossil",
    },
    {
      char: "化验",
      pinyin: "huà yàn",
      meaning: "laboratory test",
      breakdown: "化验 (huà yàn) - laboratory test",
    },
    {
      char: "化妆",
      pinyin: "huà zhuāng",
      meaning: "to put on makeup",
      breakdown: "化妆 (huà zhuāng) - to put on makeup",
    },
    {
      char: "划分",
      pinyin: "huà fēn",
      meaning: "to divide",
      breakdown: "划分 (huà fēn) - to divide",
    },
    {
      char: "话筒",
      pinyin: "huà tǒng",
      meaning: "microphone",
      breakdown: "话筒 (huà tǒng) - microphone",
    },
    {
      char: "怀孕",
      pinyin: "huái yùn",
      meaning: "pregnant",
      breakdown: "怀孕 (huái yùn) - pregnant",
    },
    {
      char: "欢乐",
      pinyin: "huān lè",
      meaning: "gaiety",
      breakdown: "欢乐 (huān lè) - gaiety",
    },
    {
      char: "还原",
      pinyin: "huán yuán",
      meaning: "to restore to the original state",
      breakdown: "还原 (huán yuán) - to restore to the original state",
    },
    {
      char: "环节",
      pinyin: "huán jié",
      meaning: "round segment",
      breakdown: "环节 (huán jié) - round segment",
    },
    {
      char: "缓和",
      pinyin: "huǎn hé",
      meaning: "to ease (tension)",
      breakdown: "缓和 (huǎn hé) - to ease (tension)",
    },
    {
      char: "患者",
      pinyin: "huàn zhě",
      meaning: "patient",
      breakdown: "患者 (huàn zhě) - patient",
    },
    {
      char: "荒凉",
      pinyin: "huāng liáng",
      meaning: "desolate",
      breakdown: "荒凉 (huāng liáng) - desolate",
    },
    {
      char: "荒谬",
      pinyin: "huāng miù",
      meaning: "absurd",
      breakdown: "荒谬 (huāng miù) - absurd",
    },
    {
      char: "荒唐",
      pinyin: "huāng táng",
      meaning: "beyond belief",
      breakdown: "荒唐 (huāng táng) - beyond belief",
    },
    {
      char: "慌忙",
      pinyin: "huāng máng",
      meaning: "in a great rush",
      breakdown: "慌忙 (huāng máng) - in a great rush",
    },
    {
      char: "黄昏",
      pinyin: "huáng hūn",
      meaning: "dusk",
      breakdown: "黄昏 (huáng hūn) - dusk",
    },
    {
      char: "恍然大悟",
      pinyin: "huǎng rán dà wù",
      meaning: "to suddenly realize",
      breakdown: "恍然大悟 (huǎng rán dà wù) - to suddenly realize",
    },
    {
      char: "挥霍",
      pinyin: "huī huò",
      meaning: "to squander money",
      breakdown: "挥霍 (huī huò) - to squander money",
    },
    {
      char: "辉煌",
      pinyin: "huī huáng",
      meaning: "splendid",
      breakdown: "辉煌 (huī huáng) - splendid",
    },
    {
      char: "回报",
      pinyin: "huí bào",
      meaning: "(in) return",
      breakdown: "回报 (huí bào) - (in) return",
    },
    {
      char: "回避",
      pinyin: "huí bì",
      meaning: "to shun",
      breakdown: "回避 (huí bì) - to shun",
    },
    {
      char: "回顾",
      pinyin: "huí gù",
      meaning: "to look back",
      breakdown: "回顾 (huí gù) - to look back",
    },
    {
      char: "回收",
      pinyin: "huí shōu",
      meaning: "to recycle",
      breakdown: "回收 (huí shōu) - to recycle",
    },
    {
      char: "悔恨",
      pinyin: "huǐ hèn",
      meaning: "remorse",
      breakdown: "悔恨 (huǐ hèn) - remorse",
    },
    {
      char: "毁灭",
      pinyin: "huǐ miè",
      meaning: "to perish",
      breakdown: "毁灭 (huǐ miè) - to perish",
    },
    {
      char: "会晤",
      pinyin: "huì wù",
      meaning: "to meet",
      breakdown: "会晤 (huì wù) - to meet",
    },
    {
      char: "汇报",
      pinyin: "huì bào",
      meaning: "to report",
      breakdown: "汇报 (huì bào) - to report",
    },
    {
      char: "贿赂",
      pinyin: "huì lù",
      meaning: "to bribe",
      breakdown: "贿赂 (huì lù) - to bribe",
    },
    {
      char: "昏迷",
      pinyin: "hūn mí",
      meaning: "to lose consciousness",
      breakdown: "昏迷 (hūn mí) - to lose consciousness",
    },
    {
      char: "浑身",
      pinyin: "hún shēn",
      meaning: "all over",
      breakdown: "浑身 (hún shēn) - all over",
    },
    {
      char: "混合",
      pinyin: "hùn hé",
      meaning: "to mix",
      breakdown: "混合 (hùn hé) - to mix",
    },
    {
      char: "混乱",
      pinyin: "hùn luàn",
      meaning: "confusion",
      breakdown: "混乱 (hùn luàn) - confusion",
    },
    {
      char: "混淆",
      pinyin: "hùn xiáo",
      meaning: "to obscure",
      breakdown: "混淆 (hùn xiáo) - to obscure",
    },
    {
      char: "混浊",
      pinyin: "hùn zhuó",
      meaning: "turbid",
      breakdown: "混浊 (hùn zhuó) - turbid",
    },
    {
      char: "活该",
      pinyin: "huó gāi",
      meaning: "(coll.) serve sb right",
      breakdown: "活该 (huó gāi) - (coll.) serve sb right",
    },
    {
      char: "活力",
      pinyin: "huó lì",
      meaning: "energy",
      breakdown: "活力 (huó lì) - energy",
    },
    {
      char: "火箭",
      pinyin: "huǒ jiàn",
      meaning: "rocket",
      breakdown: "火箭 (huǒ jiàn) - rocket",
    },
    {
      char: "火焰",
      pinyin: "huǒ yàn",
      meaning: "blaze",
      breakdown: "火焰 (huǒ yàn) - blaze",
    },
    {
      char: "火药",
      pinyin: "huǒ yào",
      meaning: "gunpowder",
      breakdown: "火药 (huǒ yào) - gunpowder",
    },
    {
      char: "货币",
      pinyin: "huò bì",
      meaning: "currency",
      breakdown: "货币 (huò bì) - currency",
    },
    {
      char: "或许",
      pinyin: "huò xǔ",
      meaning: "perhaps",
      breakdown: "或许 (huò xǔ) - perhaps",
    },
    {
      char: "基地",
      pinyin: "jī dì",
      meaning: "base (of operations)",
      breakdown: "基地 (jī dì) - base (of operations)",
    },
    {
      char: "基金",
      pinyin: "jī jīn",
      meaning: "fund",
      breakdown: "基金 (jī jīn) - fund",
    },
    {
      char: "基因",
      pinyin: "jī yīn",
      meaning: "gene (loanword)",
      breakdown: "基因 (jī yīn) - gene (loanword)",
    },
    {
      char: "机动",
      pinyin: "jī dòng",
      meaning: "locomotive",
      breakdown: "机动 (jī dòng) - locomotive",
    },
    {
      char: "机构",
      pinyin: "jī gòu",
      meaning: "mechanism",
      breakdown: "机构 (jī gòu) - mechanism",
    },
    {
      char: "机关",
      pinyin: "jī guān",
      meaning: "mechanism",
      breakdown: "机关 (jī guān) - mechanism",
    },
    {
      char: "机灵",
      pinyin: "jī líng",
      meaning: "clever",
      breakdown: "机灵 (jī líng) - clever",
    },
    {
      char: "机密",
      pinyin: "jī mì",
      meaning: "secret",
      breakdown: "机密 (jī mì) - secret",
    },
    {
      char: "机械",
      pinyin: "jī xiè",
      meaning: "machine",
      breakdown: "机械 (jī xiè) - machine",
    },
    {
      char: "机遇",
      pinyin: "jī yù",
      meaning: "opportunity",
      breakdown: "机遇 (jī yù) - opportunity",
    },
    {
      char: "机智",
      pinyin: "jī zhì",
      meaning: "quick-witted",
      breakdown: "机智 (jī zhì) - quick-witted",
    },
    {
      char: "激发",
      pinyin: "jī fā",
      meaning: "to arouse",
      breakdown: "激发 (jī fā) - to arouse",
    },
    {
      char: "激励",
      pinyin: "jī lì",
      meaning: "to encourage",
      breakdown: "激励 (jī lì) - to encourage",
    },
    {
      char: "激情",
      pinyin: "jī qíng",
      meaning: "passion",
      breakdown: "激情 (jī qíng) - passion",
    },
    {
      char: "饥饿",
      pinyin: "jī è",
      meaning: "hunger",
      breakdown: "饥饿 (jī è) - hunger",
    },
    {
      char: "讥笑",
      pinyin: "jī xiào",
      meaning: "to sneer",
      breakdown: "讥笑 (jī xiào) - to sneer",
    },
    {
      char: "极端",
      pinyin: "jí duān",
      meaning: "extreme",
      breakdown: "极端 (jí duān) - extreme",
    },
    {
      char: "极限",
      pinyin: "jí xiàn",
      meaning: "limit",
      breakdown: "极限 (jí xiàn) - limit",
    },
    {
      char: "即便",
      pinyin: "jí biàn",
      meaning: "even if",
      breakdown: "即便 (jí biàn) - even if",
    },
    {
      char: "即将",
      pinyin: "jí jiāng",
      meaning: "on the eve of",
      breakdown: "即将 (jí jiāng) - on the eve of",
    },
    {
      char: "级别",
      pinyin: "jí bié",
      meaning: "(military) rank",
      breakdown: "级别 (jí bié) - (military) rank",
    },
    {
      char: "疾病",
      pinyin: "jí bìng",
      meaning: "disease",
      breakdown: "疾病 (jí bìng) - disease",
    },
    {
      char: "嫉妒",
      pinyin: "jí dù",
      meaning: "to be jealous",
      breakdown: "嫉妒 (jí dù) - to be jealous",
    },
    {
      char: "及早",
      pinyin: "jí zǎo",
      meaning: "at the earliest possible time",
      breakdown: "及早 (jí zǎo) - at the earliest possible time",
    },
    {
      char: "急功近利",
      pinyin: "jí gōng jìn lì",
      meaning: "seeking instant benefit (idiom); shortsighted vision",
      breakdown:
        "急功近利 (jí gōng jìn lì) - seeking instant benefit (idiom); shortsighted vision",
    },
    {
      char: "急剧",
      pinyin: "jí jù",
      meaning: "rapid",
      breakdown: "急剧 (jí jù) - rapid",
    },
    {
      char: "急切",
      pinyin: "jí qiè",
      meaning: "eager",
      breakdown: "急切 (jí qiè) - eager",
    },
    {
      char: "急于求成",
      pinyin: "jí yú qiú chéng",
      meaning: "anxious for quick results (idiom); to demand instant success",
      breakdown:
        "急于求成 (jí yú qiú chéng) - anxious for quick results (idiom); to demand instant success",
    },
    {
      char: "急躁",
      pinyin: "jí zào",
      meaning: "irritable",
      breakdown: "急躁 (jí zào) - irritable",
    },
    {
      char: "籍贯",
      pinyin: "jí guàn",
      meaning: "one's native place",
      breakdown: "籍贯 (jí guàn) - one's native place",
    },
    {
      char: "集团",
      pinyin: "jí tuán",
      meaning: "group",
      breakdown: "集团 (jí tuán) - group",
    },
    {
      char: "吉祥",
      pinyin: "jí xiáng",
      meaning: "lucky",
      breakdown: "吉祥 (jí xiáng) - lucky",
    },
    {
      char: "给予",
      pinyin: "jǐ yǔ",
      meaning: "to accord",
      breakdown: "给予 (jǐ yǔ) - to accord",
    },
    {
      char: "寄托",
      pinyin: "jì tuō",
      meaning: "to have sb look after sb",
      breakdown: "寄托 (jì tuō) - to have sb look after sb",
    },
    {
      char: "继承",
      pinyin: "jì chéng",
      meaning: "to inherit",
      breakdown: "继承 (jì chéng) - to inherit",
    },
    {
      char: "继往开来",
      pinyin: "jì wǎng kāi lái",
      meaning:
        "to follow the past and herald the future (idiom); part of a historical transition",
      breakdown:
        "继往开来 (jì wǎng kāi lái) - to follow the past and herald the future (idiom); part of a historical transition",
    },
    {
      char: "记性",
      pinyin: "jì xìng",
      meaning: "memory",
      breakdown: "记性 (jì xìng) - memory",
    },
    {
      char: "记载",
      pinyin: "jì zǎi",
      meaning: "to write down",
      breakdown: "记载 (jì zǎi) - to write down",
    },
    {
      char: "季度",
      pinyin: "jì dù",
      meaning: "quarter of a year",
      breakdown: "季度 (jì dù) - quarter of a year",
    },
    {
      char: "季军",
      pinyin: "jì jūn",
      meaning: "third in a race",
      breakdown: "季军 (jì jūn) - third in a race",
    },
    {
      char: "计较",
      pinyin: "jì jiào",
      meaning: "to bother about",
      breakdown: "计较 (jì jiào) - to bother about",
    },
    {
      char: "忌讳",
      pinyin: "jì huì",
      meaning: "taboo",
      breakdown: "忌讳 (jì huì) - taboo",
    },
    {
      char: "寂静",
      pinyin: "jì jìng",
      meaning: "quiet",
      breakdown: "寂静 (jì jìng) - quiet",
    },
    {
      char: "纪要",
      pinyin: "jì yào",
      meaning: "minutes",
      breakdown: "纪要 (jì yào) - minutes",
    },
    {
      char: "技能",
      pinyin: "jì néng",
      meaning: "technical ability",
      breakdown: "技能 (jì néng) - technical ability",
    },
    {
      char: "技巧",
      pinyin: "jì qiǎo",
      meaning: "skill",
      breakdown: "技巧 (jì qiǎo) - skill",
    },
    {
      char: "迹象",
      pinyin: "jì xiàng",
      meaning: "mark",
      breakdown: "迹象 (jì xiàng) - mark",
    },
    {
      char: "家常",
      pinyin: "jiā cháng",
      meaning: "the daily life of a family",
      breakdown: "家常 (jiā cháng) - the daily life of a family",
    },
    {
      char: "家伙",
      pinyin: "jiā huo",
      meaning: "household dish",
      breakdown: "家伙 (jiā huo) - household dish",
    },
    {
      char: "家属",
      pinyin: "jiā shǔ",
      meaning: "family member",
      breakdown: "家属 (jiā shǔ) - family member",
    },
    {
      char: "家喻户晓",
      pinyin: "jiā yù hù xiǎo",
      meaning: "understood by everyone (idiom); well known",
      breakdown:
        "家喻户晓 (jiā yù hù xiǎo) - understood by everyone (idiom); well known",
    },
    {
      char: "加工",
      pinyin: "jiā gōng",
      meaning: "to process",
      breakdown: "加工 (jiā gōng) - to process",
    },
    {
      char: "加剧",
      pinyin: "jiā jù",
      meaning: "to intensify",
      breakdown: "加剧 (jiā jù) - to intensify",
    },
    {
      char: "佳肴",
      pinyin: "jiā yáo",
      meaning: "fine food",
      breakdown: "佳肴 (jiā yáo) - fine food",
    },
    {
      char: "夹杂",
      pinyin: "jiā zá",
      meaning: "to mix together (disparate substances)",
      breakdown: "夹杂 (jiā zá) - to mix together (disparate substances)",
    },
    {
      char: "假设",
      pinyin: "jiǎ shè",
      meaning: "suppose that...",
      breakdown: "假设 (jiǎ shè) - suppose that...",
    },
    {
      char: "假使",
      pinyin: "jiǎ shǐ",
      meaning: "if",
      breakdown: "假使 (jiǎ shǐ) - if",
    },
    {
      char: "坚定",
      pinyin: "jiān dìng",
      meaning: "firm",
      breakdown: "坚定 (jiān dìng) - firm",
    },
    {
      char: "坚固",
      pinyin: "jiān gù",
      meaning: "firm",
      breakdown: "坚固 (jiān gù) - firm",
    },
    {
      char: "坚韧",
      pinyin: "jiān rèn",
      meaning: "tough and durable",
      breakdown: "坚韧 (jiān rèn) - tough and durable",
    },
    {
      char: "坚实",
      pinyin: "jiān shí",
      meaning: "firm and substantial",
      breakdown: "坚实 (jiān shí) - firm and substantial",
    },
    {
      char: "坚硬",
      pinyin: "jiān yìng",
      meaning: "hard",
      breakdown: "坚硬 (jiān yìng) - hard",
    },
    {
      char: "监督",
      pinyin: "jiān dū",
      meaning: "to control",
      breakdown: "监督 (jiān dū) - to control",
    },
    {
      char: "监视",
      pinyin: "jiān shì",
      meaning: "to monitor",
      breakdown: "监视 (jiān shì) - to monitor",
    },
    {
      char: "监狱",
      pinyin: "jiān yù",
      meaning: "prison",
      breakdown: "监狱 (jiān yù) - prison",
    },
    {
      char: "尖端",
      pinyin: "jiān duān",
      meaning: "sharp pointed end",
      breakdown: "尖端 (jiān duān) - sharp pointed end",
    },
    {
      char: "艰难",
      pinyin: "jiān nán",
      meaning: "difficult",
      breakdown: "艰难 (jiān nán) - difficult",
    },
    {
      char: "兼职",
      pinyin: "jiān zhí",
      meaning: "to hold concurrent posts",
      breakdown: "兼职 (jiān zhí) - to hold concurrent posts",
    },
    {
      char: "拣",
      pinyin: "jiǎn",
      meaning: "to choose",
      breakdown: "拣 (jiǎn) - to choose",
    },
    {
      char: "剪彩",
      pinyin: "jiǎn cǎi",
      meaning: "to cut the ribbon (at a launching or opening ceremony)",
      breakdown:
        "剪彩 (jiǎn cǎi) - to cut the ribbon (at a launching or opening ceremony)",
    },
    {
      char: "检讨",
      pinyin: "jiǎn tǎo",
      meaning: "to examine or inspect",
      breakdown: "检讨 (jiǎn tǎo) - to examine or inspect",
    },
    {
      char: "检验",
      pinyin: "jiǎn yàn",
      meaning: "to inspect",
      breakdown: "检验 (jiǎn yàn) - to inspect",
    },
    {
      char: "简化",
      pinyin: "jiǎn huà",
      meaning: "to simplify",
      breakdown: "简化 (jiǎn huà) - to simplify",
    },
    {
      char: "简陋",
      pinyin: "jiǎn lòu",
      meaning: "simple and crude (of a room or building)",
      breakdown: "简陋 (jiǎn lòu) - simple and crude (of a room or building)",
    },
    {
      char: "简体字",
      pinyin: "jiǎn tǐ zì",
      meaning: "simplified Chinese character",
      breakdown: "简体字 (jiǎn tǐ zì) - simplified Chinese character",
    },
    {
      char: "简要",
      pinyin: "jiǎn yào",
      meaning: "concise",
      breakdown: "简要 (jiǎn yào) - concise",
    },
    {
      char: "溅",
      pinyin: "jiàn",
      meaning: "splash",
      breakdown: "溅 (jiàn) - splash",
    },
    {
      char: "鉴别",
      pinyin: "jiàn bié",
      meaning: "to differentiate",
      breakdown: "鉴别 (jiàn bié) - to differentiate",
    },
    {
      char: "鉴定",
      pinyin: "jiàn dìng",
      meaning: "to appraise",
      breakdown: "鉴定 (jiàn dìng) - to appraise",
    },
    {
      char: "鉴于",
      pinyin: "jiàn yú",
      meaning: "in view of",
      breakdown: "鉴于 (jiàn yú) - in view of",
    },
    {
      char: "间谍",
      pinyin: "jiàn dié",
      meaning: "spy",
      breakdown: "间谍 (jiàn dié) - spy",
    },
    {
      char: "间隔",
      pinyin: "jiàn gé",
      meaning: "compartment",
      breakdown: "间隔 (jiàn gé) - compartment",
    },
    {
      char: "间接",
      pinyin: "jiàn jiē",
      meaning: "indirect",
      breakdown: "间接 (jiàn jiē) - indirect",
    },
    {
      char: "见多识广",
      pinyin: "jiàn duō shí guǎng",
      meaning: "experienced and knowledgeable (idiom)",
      breakdown:
        "见多识广 (jiàn duō shí guǎng) - experienced and knowledgeable (idiom)",
    },
    {
      char: "见解",
      pinyin: "jiàn jiě",
      meaning: "opinion",
      breakdown: "见解 (jiàn jiě) - opinion",
    },
    {
      char: "见闻",
      pinyin: "jiàn wén",
      meaning: "what one sees and hears",
      breakdown: "见闻 (jiàn wén) - what one sees and hears",
    },
    {
      char: "见义勇为",
      pinyin: "jiàn yì yǒng wéi",
      meaning: "to see what is right and act courageously (idiom)",
      breakdown:
        "见义勇为 (jiàn yì yǒng wéi) - to see what is right and act courageously (idiom)",
    },
    {
      char: "健全",
      pinyin: "jiàn quán",
      meaning: "robust",
      breakdown: "健全 (jiàn quán) - robust",
    },
    {
      char: "践踏",
      pinyin: "jiàn tà",
      meaning: "to trample",
      breakdown: "践踏 (jiàn tà) - to trample",
    },
    {
      char: "舰艇",
      pinyin: "jiàn tǐng",
      meaning: "warship",
      breakdown: "舰艇 (jiàn tǐng) - warship",
    },
    {
      char: "将近",
      pinyin: "jiāng jìn",
      meaning: "almost",
      breakdown: "将近 (jiāng jìn) - almost",
    },
    {
      char: "将军",
      pinyin: "jiāng jūn",
      meaning: "general",
      breakdown: "将军 (jiāng jūn) - general",
    },
    {
      char: "僵硬",
      pinyin: "jiāng yìng",
      meaning: "stiff",
      breakdown: "僵硬 (jiāng yìng) - stiff",
    },
    {
      char: "桨",
      pinyin: "jiǎng",
      meaning: "oar",
      breakdown: "桨 (jiǎng) - oar",
    },
    {
      char: "奖励",
      pinyin: "jiǎng lì",
      meaning: "to reward",
      breakdown: "奖励 (jiǎng lì) - to reward",
    },
    {
      char: "奖赏",
      pinyin: "jiǎng shǎng",
      meaning: "reward",
      breakdown: "奖赏 (jiǎng shǎng) - reward",
    },
    {
      char: "降临",
      pinyin: "jiàng lín",
      meaning: "to descend to",
      breakdown: "降临 (jiàng lín) - to descend to",
    },
    {
      char: "交叉",
      pinyin: "jiāo chā",
      meaning: "to cross",
      breakdown: "交叉 (jiāo chā) - to cross",
    },
    {
      char: "交代",
      pinyin: "jiāo dài",
      meaning: "to hand over",
      breakdown: "交代 (jiāo dài) - to hand over",
    },
    {
      char: "交涉",
      pinyin: "jiāo shè",
      meaning: "to negotiate",
      breakdown: "交涉 (jiāo shè) - to negotiate",
    },
    {
      char: "交往",
      pinyin: "jiāo wǎng",
      meaning: "to associate",
      breakdown: "交往 (jiāo wǎng) - to associate",
    },
    {
      char: "交易",
      pinyin: "jiāo yì",
      meaning: "(business) transaction",
      breakdown: "交易 (jiāo yì) - (business) transaction",
    },
    {
      char: "焦点",
      pinyin: "jiāo diǎn",
      meaning: "focus",
      breakdown: "焦点 (jiāo diǎn) - focus",
    },
    {
      char: "焦急",
      pinyin: "jiāo jí",
      meaning: "anxiety",
      breakdown: "焦急 (jiāo jí) - anxiety",
    },
    {
      char: "娇气",
      pinyin: "jiāo qì",
      meaning: "delicate",
      breakdown: "娇气 (jiāo qì) - delicate",
    },
    {
      char: "角落",
      pinyin: "jiǎo luò",
      meaning: "nook",
      breakdown: "角落 (jiǎo luò) - nook",
    },
    {
      char: "搅拌",
      pinyin: "jiǎo bàn",
      meaning: "to stir",
      breakdown: "搅拌 (jiǎo bàn) - to stir",
    },
    {
      char: "缴纳",
      pinyin: "jiǎo nà",
      meaning: "to pay (taxes etc)",
      breakdown: "缴纳 (jiǎo nà) - to pay (taxes etc)",
    },
    {
      char: "教养",
      pinyin: "jiào yǎng",
      meaning: "to train",
      breakdown: "教养 (jiào yǎng) - to train",
    },
    {
      char: "较量",
      pinyin: "jiào liàng",
      meaning: "to have a contest with sb",
      breakdown: "较量 (jiào liàng) - to have a contest with sb",
    },
    { char: "皆", pinyin: "jiē", meaning: "all", breakdown: "皆 (jiē) - all" },
    {
      char: "接连",
      pinyin: "jiē lián",
      meaning: "on end",
      breakdown: "接连 (jiē lián) - on end",
    },
    {
      char: "阶层",
      pinyin: "jiē céng",
      meaning: "hierarchy",
      breakdown: "阶层 (jiē céng) - hierarchy",
    },
    {
      char: "揭发",
      pinyin: "jiē fā",
      meaning: "to expose",
      breakdown: "揭发 (jiē fā) - to expose",
    },
    {
      char: "揭露",
      pinyin: "jiē lù",
      meaning: "to expose",
      breakdown: "揭露 (jiē lù) - to expose",
    },
    {
      char: "节奏",
      pinyin: "jié zòu",
      meaning: "rhythm",
      breakdown: "节奏 (jié zòu) - rhythm",
    },
    {
      char: "杰出",
      pinyin: "jié chū",
      meaning: "outstanding",
      breakdown: "杰出 (jié chū) - outstanding",
    },
    {
      char: "结晶",
      pinyin: "jié jīng",
      meaning: "crystallization",
      breakdown: "结晶 (jié jīng) - crystallization",
    },
    {
      char: "结局",
      pinyin: "jié jú",
      meaning: "conclusion",
      breakdown: "结局 (jié jú) - conclusion",
    },
    {
      char: "结算",
      pinyin: "jié suàn",
      meaning: "to settle a bill",
      breakdown: "结算 (jié suàn) - to settle a bill",
    },
    {
      char: "竭尽全力",
      pinyin: "jié jìn quán lì",
      meaning: "to spare no effort (idiom); to do one's utmost",
      breakdown:
        "竭尽全力 (jié jìn quán lì) - to spare no effort (idiom); to do one's utmost",
    },
    {
      char: "截至",
      pinyin: "jié zhì",
      meaning: "up to (a time)",
      breakdown: "截至 (jié zhì) - up to (a time)",
    },
    {
      char: "解除",
      pinyin: "jiě chú",
      meaning: "to remove",
      breakdown: "解除 (jiě chú) - to remove",
    },
    {
      char: "解雇",
      pinyin: "jiě gù",
      meaning: "to fire",
      breakdown: "解雇 (jiě gù) - to fire",
    },
    {
      char: "解剖",
      pinyin: "jiě pōu",
      meaning: "to dissect (an animal)",
      breakdown: "解剖 (jiě pōu) - to dissect (an animal)",
    },
    {
      char: "解散",
      pinyin: "jiě sàn",
      meaning: "to dissolve",
      breakdown: "解散 (jiě sàn) - to dissolve",
    },
    {
      char: "解体",
      pinyin: "jiě tǐ",
      meaning: "to break up into components",
      breakdown: "解体 (jiě tǐ) - to break up into components",
    },
    {
      char: "借鉴",
      pinyin: "jiè jiàn",
      meaning: "to use other people's experience",
      breakdown: "借鉴 (jiè jiàn) - to use other people's experience",
    },
    {
      char: "借助",
      pinyin: "jiè zhù",
      meaning: "to draw support from",
      breakdown: "借助 (jiè zhù) - to draw support from",
    },
    {
      char: "戒备",
      pinyin: "jiè bèi",
      meaning: "to take precautions",
      breakdown: "戒备 (jiè bèi) - to take precautions",
    },
    {
      char: "界限",
      pinyin: "jiè xiàn",
      meaning: "boundary",
      breakdown: "界限 (jiè xiàn) - boundary",
    },
    {
      char: "津津有味",
      pinyin: "jīn jīn yǒu wèi",
      meaning: "with keen interest pleasure (idiom); with gusto",
      breakdown:
        "津津有味 (jīn jīn yǒu wèi) - with keen interest pleasure (idiom); with gusto",
    },
    {
      char: "金融",
      pinyin: "jīn róng",
      meaning: "banking",
      breakdown: "金融 (jīn róng) - banking",
    },
    {
      char: "紧密",
      pinyin: "jǐn mì",
      meaning: "inseparably close",
      breakdown: "紧密 (jǐn mì) - inseparably close",
    },
    {
      char: "紧迫",
      pinyin: "jǐn pò",
      meaning: "pressing",
      breakdown: "紧迫 (jǐn pò) - pressing",
    },
    {
      char: "尽快",
      pinyin: "jǐn kuài",
      meaning: "as quickly as possible",
      breakdown: "尽快 (jǐn kuài) - as quickly as possible",
    },
    {
      char: "锦绣前程",
      pinyin: "jǐn xiù qián chéng",
      meaning: "bright future",
      breakdown: "锦绣前程 (jǐn xiù qián chéng) - bright future",
    },
    {
      char: "进而",
      pinyin: "jìn ér",
      meaning: "and then (what follows next)",
      breakdown: "进而 (jìn ér) - and then (what follows next)",
    },
    {
      char: "进攻",
      pinyin: "jìn gōng",
      meaning: "to attack",
      breakdown: "进攻 (jìn gōng) - to attack",
    },
    {
      char: "进化",
      pinyin: "jìn huà",
      meaning: "evolution",
      breakdown: "进化 (jìn huà) - evolution",
    },
    {
      char: "进展",
      pinyin: "jìn zhǎn",
      meaning: "to make headway",
      breakdown: "进展 (jìn zhǎn) - to make headway",
    },
    {
      char: "近来",
      pinyin: "jìn lái",
      meaning: "recently",
      breakdown: "近来 (jìn lái) - recently",
    },
    {
      char: "近视",
      pinyin: "jìn shì",
      meaning: "shortsighted",
      breakdown: "近视 (jìn shì) - shortsighted",
    },
    {
      char: "浸泡",
      pinyin: "jìn pào",
      meaning: "to steep",
      breakdown: "浸泡 (jìn pào) - to steep",
    },
    {
      char: "晋升",
      pinyin: "jìn shēng",
      meaning: "to promote to a higher position",
      breakdown: "晋升 (jìn shēng) - to promote to a higher position",
    },
    {
      char: "劲头",
      pinyin: "jìn tóu",
      meaning: "enthusiasm",
      breakdown: "劲头 (jìn tóu) - enthusiasm",
    },
    {
      char: "茎",
      pinyin: "jīng",
      meaning: "stalk",
      breakdown: "茎 (jīng) - stalk",
    },
    {
      char: "精打细算",
      pinyin: "jīng dǎ xì suàn",
      meaning: "(saying) meticulous planning and careful accounting",
      breakdown:
        "精打细算 (jīng dǎ xì suàn) - (saying) meticulous planning and careful accounting",
    },
    {
      char: "精华",
      pinyin: "jīng huá",
      meaning: "best feature",
      breakdown: "精华 (jīng huá) - best feature",
    },
    {
      char: "精简",
      pinyin: "jīng jiǎn",
      meaning: "to simplify",
      breakdown: "精简 (jīng jiǎn) - to simplify",
    },
    {
      char: "精密",
      pinyin: "jīng mì",
      meaning: "accuracy",
      breakdown: "精密 (jīng mì) - accuracy",
    },
    {
      char: "精确",
      pinyin: "jīng què",
      meaning: "accurate",
      breakdown: "精确 (jīng què) - accurate",
    },
    {
      char: "精通",
      pinyin: "jīng tōng",
      meaning: "proficient",
      breakdown: "精通 (jīng tōng) - proficient",
    },
    {
      char: "精心",
      pinyin: "jīng xīn",
      meaning: "with utmost care",
      breakdown: "精心 (jīng xīn) - with utmost care",
    },
    {
      char: "精益求精",
      pinyin: "jīng yì qiú jīng",
      meaning:
        "to perfect sth that is already outstanding (idiom); constantly improving",
      breakdown:
        "精益求精 (jīng yì qiú jīng) - to perfect sth that is already outstanding (idiom); constantly improving",
    },
    {
      char: "精致",
      pinyin: "jīng zhì",
      meaning: "delicate",
      breakdown: "精致 (jīng zhì) - delicate",
    },
    {
      char: "经费",
      pinyin: "jīng fèi",
      meaning: "funds",
      breakdown: "经费 (jīng fèi) - funds",
    },
    {
      char: "经商",
      pinyin: "jīng shāng",
      meaning: "to trade",
      breakdown: "经商 (jīng shāng) - to trade",
    },
    {
      char: "经纬",
      pinyin: "jīng wěi",
      meaning: "warp and woof",
      breakdown: "经纬 (jīng wěi) - warp and woof",
    },
    {
      char: "惊动",
      pinyin: "jīng dòng",
      meaning: "alarm",
      breakdown: "惊动 (jīng dòng) - alarm",
    },
    {
      char: "惊奇",
      pinyin: "jīng qí",
      meaning: "to be amazed",
      breakdown: "惊奇 (jīng qí) - to be amazed",
    },
    {
      char: "惊讶",
      pinyin: "jīng yà",
      meaning: "amazed",
      breakdown: "惊讶 (jīng yà) - amazed",
    },
    {
      char: "兢兢业业",
      pinyin: "jīng jīng yè yè",
      meaning: "cautious and conscientious",
      breakdown: "兢兢业业 (jīng jīng yè yè) - cautious and conscientious",
    },
    {
      char: "井",
      pinyin: "jǐng",
      meaning: "a well",
      breakdown: "井 (jǐng) - a well",
    },
    {
      char: "警告",
      pinyin: "jǐng gào",
      meaning: "to warn",
      breakdown: "警告 (jǐng gào) - to warn",
    },
    {
      char: "警惕",
      pinyin: "jǐng tì",
      meaning: "to be on the alert",
      breakdown: "警惕 (jǐng tì) - to be on the alert",
    },
    {
      char: "颈椎",
      pinyin: "jǐng zhuī",
      meaning: "cervical vertebra",
      breakdown: "颈椎 (jǐng zhuī) - cervical vertebra",
    },
    {
      char: "敬礼",
      pinyin: "jìng lǐ",
      meaning: "to salute",
      breakdown: "敬礼 (jìng lǐ) - to salute",
    },
    {
      char: "境界",
      pinyin: "jìng jiè",
      meaning: "boundary",
      breakdown: "境界 (jìng jiè) - boundary",
    },
    {
      char: "竞赛",
      pinyin: "jìng sài",
      meaning: "race",
      breakdown: "竞赛 (jìng sài) - race",
    },
    {
      char: "竞选",
      pinyin: "jìng xuǎn",
      meaning: "to take part in an election",
      breakdown: "竞选 (jìng xuǎn) - to take part in an election",
    },
    {
      char: "镜头",
      pinyin: "jìng tóu",
      meaning: "camera lens",
      breakdown: "镜头 (jìng tóu) - camera lens",
    },
    {
      char: "纠纷",
      pinyin: "jiū fēn",
      meaning: "a dispute",
      breakdown: "纠纷 (jiū fēn) - a dispute",
    },
    {
      char: "纠正",
      pinyin: "jiū zhèng",
      meaning: "to correct",
      breakdown: "纠正 (jiū zhèng) - to correct",
    },
    {
      char: "酒精",
      pinyin: "jiǔ jīng",
      meaning: "alcohol",
      breakdown: "酒精 (jiǔ jīng) - alcohol",
    },
    {
      char: "救济",
      pinyin: "jiù jì",
      meaning: "emergency relief",
      breakdown: "救济 (jiù jì) - emergency relief",
    },
    {
      char: "就近",
      pinyin: "jiù jìn",
      meaning: "nearby",
      breakdown: "就近 (jiù jìn) - nearby",
    },
    {
      char: "就业",
      pinyin: "jiù yè",
      meaning: "looking for employment",
      breakdown: "就业 (jiù yè) - looking for employment",
    },
    {
      char: "就职",
      pinyin: "jiù zhí",
      meaning: "to take office",
      breakdown: "就职 (jiù zhí) - to take office",
    },
    {
      char: "鞠躬",
      pinyin: "jū gōng",
      meaning: "to bow",
      breakdown: "鞠躬 (jū gōng) - to bow",
    },
    {
      char: "拘留",
      pinyin: "jū liú",
      meaning: "to detain (a prisoner)",
      breakdown: "拘留 (jū liú) - to detain (a prisoner)",
    },
    {
      char: "拘束",
      pinyin: "jū shù",
      meaning: "to restrict",
      breakdown: "拘束 (jū shù) - to restrict",
    },
    {
      char: "居住",
      pinyin: "jū zhù",
      meaning: "to reside",
      breakdown: "居住 (jū zhù) - to reside",
    },
    {
      char: "局部",
      pinyin: "jú bù",
      meaning: "part",
      breakdown: "局部 (jú bù) - part",
    },
    {
      char: "局面",
      pinyin: "jú miàn",
      meaning: "aspect",
      breakdown: "局面 (jú miàn) - aspect",
    },
    {
      char: "局势",
      pinyin: "jú shì",
      meaning: "situation",
      breakdown: "局势 (jú shì) - situation",
    },
    {
      char: "局限",
      pinyin: "jú xiàn",
      meaning: "to limit",
      breakdown: "局限 (jú xiàn) - to limit",
    },
    {
      char: "举动",
      pinyin: "jǔ dòng",
      meaning: "act",
      breakdown: "举动 (jǔ dòng) - act",
    },
    {
      char: "举世闻名",
      pinyin: "jǔ shì wén míng",
      meaning: "(saying) world famous",
      breakdown: "举世闻名 (jǔ shì wén míng) - (saying) world famous",
    },
    {
      char: "举世瞩目",
      pinyin: "jǔ shì zhǔ mù",
      meaning: "to receive worldwide attention",
      breakdown: "举世瞩目 (jǔ shì zhǔ mù) - to receive worldwide attention",
    },
    {
      char: "举足轻重",
      pinyin: "jǔ zú qīng zhòng",
      meaning:
        "a foot's move sways the balance (idiom); to hold the balance of power",
      breakdown:
        "举足轻重 (jǔ zú qīng zhòng) - a foot's move sways the balance (idiom); to hold the balance of power",
    },
    {
      char: "咀嚼",
      pinyin: "jǔ jué",
      meaning: "to chew",
      breakdown: "咀嚼 (jǔ jué) - to chew",
    },
    {
      char: "沮丧",
      pinyin: "jǔ sàng",
      meaning: "dispirited",
      breakdown: "沮丧 (jǔ sàng) - dispirited",
    },
    {
      char: "剧本",
      pinyin: "jù běn",
      meaning: "script for play",
      breakdown: "剧本 (jù běn) - script for play",
    },
    {
      char: "剧烈",
      pinyin: "jù liè",
      meaning: "violent",
      breakdown: "剧烈 (jù liè) - violent",
    },
    {
      char: "聚精会神",
      pinyin: "jù jīng huì shén",
      meaning: "to concentrate one's attention (idiom)",
      breakdown:
        "聚精会神 (jù jīng huì shén) - to concentrate one's attention (idiom)",
    },
    {
      char: "据悉",
      pinyin: "jù xī",
      meaning: "according to reports",
      breakdown: "据悉 (jù xī) - according to reports",
    },
    {
      char: "决策",
      pinyin: "jué cè",
      meaning: "strategic decision",
      breakdown: "决策 (jué cè) - strategic decision",
    },
    {
      char: "觉悟",
      pinyin: "jué wù",
      meaning: "consciousness",
      breakdown: "觉悟 (jué wù) - consciousness",
    },
    {
      char: "觉醒",
      pinyin: "jué xǐng",
      meaning: "to awaken",
      breakdown: "觉醒 (jué xǐng) - to awaken",
    },
    {
      char: "绝望",
      pinyin: "jué wàng",
      meaning: "desperation",
      breakdown: "绝望 (jué wàng) - desperation",
    },
    {
      char: "军队",
      pinyin: "jūn duì",
      meaning: "army troops",
      breakdown: "军队 (jūn duì) - army troops",
    },
    {
      char: "卡通",
      pinyin: "kǎ tōng",
      meaning: "cartoon",
      breakdown: "卡通 (kǎ tōng) - cartoon",
    },
    {
      char: "开采",
      pinyin: "kāi cǎi",
      meaning: "to extract (ore or other resource from a mine)",
      breakdown:
        "开采 (kāi cǎi) - to extract (ore or other resource from a mine)",
    },
    {
      char: "开除",
      pinyin: "kāi chú",
      meaning: "to expel",
      breakdown: "开除 (kāi chú) - to expel",
    },
    {
      char: "开阔",
      pinyin: "kāi kuò",
      meaning: "wide",
      breakdown: "开阔 (kāi kuò) - wide",
    },
    {
      char: "开朗",
      pinyin: "kāi lǎng",
      meaning: "spacious and well-lit",
      breakdown: "开朗 (kāi lǎng) - spacious and well-lit",
    },
    {
      char: "开明",
      pinyin: "kāi míng",
      meaning: "enlightened",
      breakdown: "开明 (kāi míng) - enlightened",
    },
    {
      char: "开辟",
      pinyin: "kāi pì",
      meaning: "to open up",
      breakdown: "开辟 (kāi pì) - to open up",
    },
    {
      char: "开水",
      pinyin: "kāi shuǐ",
      meaning: "boiled water",
      breakdown: "开水 (kāi shuǐ) - boiled water",
    },
    {
      char: "开拓",
      pinyin: "kāi tuò",
      meaning: "to break new ground (for agriculture)",
      breakdown: "开拓 (kāi tuò) - to break new ground (for agriculture)",
    },
    {
      char: "开展",
      pinyin: "kāi zhǎn",
      meaning: "(begin to) develop",
      breakdown: "开展 (kāi zhǎn) - (begin to) develop",
    },
    {
      char: "开支",
      pinyin: "kāi zhī",
      meaning: "expenditures",
      breakdown: "开支 (kāi zhī) - expenditures",
    },
    {
      char: "刊登",
      pinyin: "kān dēng",
      meaning: "to carry a story",
      breakdown: "刊登 (kān dēng) - to carry a story",
    },
    {
      char: "刊物",
      pinyin: "kān wù",
      meaning: "publication",
      breakdown: "刊物 (kān wù) - publication",
    },
    {
      char: "勘探",
      pinyin: "kān tàn",
      meaning: "exploration",
      breakdown: "勘探 (kān tàn) - exploration",
    },
    {
      char: "看待",
      pinyin: "kàn dài",
      meaning: "to look upon",
      breakdown: "看待 (kàn dài) - to look upon",
    },
    {
      char: "看望",
      pinyin: "kàn wàng",
      meaning: "to visit",
      breakdown: "看望 (kàn wàng) - to visit",
    },
    {
      char: "慷慨",
      pinyin: "kāng kǎi",
      meaning: "vehement",
      breakdown: "慷慨 (kāng kǎi) - vehement",
    },
    {
      char: "扛",
      pinyin: "káng",
      meaning: "to carry on one's shoulder",
      breakdown: "扛 (káng) - to carry on one's shoulder",
    },
    {
      char: "考察",
      pinyin: "kǎo chá",
      meaning: "to inspect",
      breakdown: "考察 (kǎo chá) - to inspect",
    },
    {
      char: "考古",
      pinyin: "kǎo gǔ",
      meaning: "archaeology",
      breakdown: "考古 (kǎo gǔ) - archaeology",
    },
    {
      char: "考核",
      pinyin: "kǎo hé",
      meaning: "to examine",
      breakdown: "考核 (kǎo hé) - to examine",
    },
    {
      char: "考验",
      pinyin: "kǎo yàn",
      meaning: "to test",
      breakdown: "考验 (kǎo yàn) - to test",
    },
    {
      char: "靠拢",
      pinyin: "kào lǒng",
      meaning: "to draw close to",
      breakdown: "靠拢 (kào lǒng) - to draw close to",
    },
    {
      char: "磕",
      pinyin: "kē",
      meaning: "to tap",
      breakdown: "磕 (kē) - to tap",
    },
    {
      char: "颗粒",
      pinyin: "kē lì",
      meaning: "kernel",
      breakdown: "颗粒 (kē lì) - kernel",
    },
    {
      char: "科目",
      pinyin: "kē mù",
      meaning: "subject",
      breakdown: "科目 (kē mù) - subject",
    },
    {
      char: "渴望",
      pinyin: "kě wàng",
      meaning: "to thirst for",
      breakdown: "渴望 (kě wàng) - to thirst for",
    },
    {
      char: "可观",
      pinyin: "kě guān",
      meaning: "considerable",
      breakdown: "可观 (kě guān) - considerable",
    },
    {
      char: "可口",
      pinyin: "kě kǒu",
      meaning: "tasty",
      breakdown: "可口 (kě kǒu) - tasty",
    },
    {
      char: "可恶",
      pinyin: "kě wù",
      meaning: "repulsive",
      breakdown: "可恶 (kě wù) - repulsive",
    },
    {
      char: "可笑",
      pinyin: "kě xiào",
      meaning: "funny",
      breakdown: "可笑 (kě xiào) - funny",
    },
    {
      char: "可行",
      pinyin: "kě xíng",
      meaning: "feasible",
      breakdown: "可行 (kě xíng) - feasible",
    },
    {
      char: "刻不容缓",
      pinyin: "kè bù róng huǎn",
      meaning: "to brook no delay",
      breakdown: "刻不容缓 (kè bù róng huǎn) - to brook no delay",
    },
    {
      char: "课题",
      pinyin: "kè tí",
      meaning: "task",
      breakdown: "课题 (kè tí) - task",
    },
    {
      char: "客户",
      pinyin: "kè hù",
      meaning: "client",
      breakdown: "客户 (kè hù) - client",
    },
    {
      char: "啃",
      pinyin: "kěn",
      meaning: "to gnaw",
      breakdown: "啃 (kěn) - to gnaw",
    },
    {
      char: "恳切",
      pinyin: "kěn qiè",
      meaning: "earnest",
      breakdown: "恳切 (kěn qiè) - earnest",
    },
    {
      char: "坑",
      pinyin: "kēng",
      meaning: "hole",
      breakdown: "坑 (kēng) - hole",
    },
    {
      char: "空洞",
      pinyin: "kōng dòng",
      meaning: "cavity",
      breakdown: "空洞 (kōng dòng) - cavity",
    },
    {
      char: "空前绝后",
      pinyin: "kōng qián jué hòu",
      meaning: "unprecedented and never to be duplicated",
      breakdown:
        "空前绝后 (kōng qián jué hòu) - unprecedented and never to be duplicated",
    },
    {
      char: "空想",
      pinyin: "kōng xiǎng",
      meaning: "daydream",
      breakdown: "空想 (kōng xiǎng) - daydream",
    },
    {
      char: "空虚",
      pinyin: "kōng xū",
      meaning: "hollow",
      breakdown: "空虚 (kōng xū) - hollow",
    },
    {
      char: "孔",
      pinyin: "kǒng",
      meaning: "hole",
      breakdown: "孔 (kǒng) - hole",
    },
    {
      char: "恐吓",
      pinyin: "kǒng hè",
      meaning: "to threaten",
      breakdown: "恐吓 (kǒng hè) - to threaten",
    },
    {
      char: "恐惧",
      pinyin: "kǒng jù",
      meaning: "fear",
      breakdown: "恐惧 (kǒng jù) - fear",
    },
    {
      char: "空白",
      pinyin: "kòng bái",
      meaning: "blank space",
      breakdown: "空白 (kòng bái) - blank space",
    },
    {
      char: "空隙",
      pinyin: "kòng xì",
      meaning: "crack",
      breakdown: "空隙 (kòng xì) - crack",
    },
    {
      char: "口气",
      pinyin: "kǒu qì",
      meaning: "tone of voice",
      breakdown: "口气 (kǒu qì) - tone of voice",
    },
    {
      char: "口腔",
      pinyin: "kǒu qiāng",
      meaning: "oral cavity",
      breakdown: "口腔 (kǒu qiāng) - oral cavity",
    },
    {
      char: "口头",
      pinyin: "kǒu tóu",
      meaning: "oral",
      breakdown: "口头 (kǒu tóu) - oral",
    },
    {
      char: "口音",
      pinyin: "kǒu yīn",
      meaning: "oral speech sounds (linguistics)",
      breakdown: "口音 (kǒu yīn) - oral speech sounds (linguistics)",
    },
    {
      char: "枯竭",
      pinyin: "kū jié",
      meaning: "used up",
      breakdown: "枯竭 (kū jié) - used up",
    },
    {
      char: "枯燥",
      pinyin: "kū zào",
      meaning: "dry and dull",
      breakdown: "枯燥 (kū zào) - dry and dull",
    },
    {
      char: "苦尽甘来",
      pinyin: "kǔ jìn gān lái",
      meaning: "bitterness finishes",
      breakdown: "苦尽甘来 (kǔ jìn gān lái) - bitterness finishes",
    },
    {
      char: "挎",
      pinyin: "kuà",
      meaning: "to carry (esp. slung over the arm)",
      breakdown: "挎 (kuà) - to carry (esp. slung over the arm)",
    },
    {
      char: "跨",
      pinyin: "kuà",
      meaning: "to step across",
      breakdown: "跨 (kuà) - to step across",
    },
    {
      char: "快活",
      pinyin: "kuài huo",
      meaning: "happy",
      breakdown: "快活 (kuài huo) - happy",
    },
    {
      char: "宽敞",
      pinyin: "kuān chang",
      meaning: "spacious",
      breakdown: "宽敞 (kuān chang) - spacious",
    },
    {
      char: "款待",
      pinyin: "kuǎn dài",
      meaning: "to entertain",
      breakdown: "款待 (kuǎn dài) - to entertain",
    },
    {
      char: "款式",
      pinyin: "kuǎn shì",
      meaning: "pattern",
      breakdown: "款式 (kuǎn shì) - pattern",
    },
    {
      char: "筐",
      pinyin: "kuāng",
      meaning: "basket",
      breakdown: "筐 (kuāng) - basket",
    },
    {
      char: "旷课",
      pinyin: "kuàng kè",
      meaning: "to play truant",
      breakdown: "旷课 (kuàng kè) - to play truant",
    },
    {
      char: "框架",
      pinyin: "kuàng jià",
      meaning: "frame",
      breakdown: "框架 (kuàng jià) - frame",
    },
    {
      char: "况且",
      pinyin: "kuàng qiě",
      meaning: "moreover",
      breakdown: "况且 (kuàng qiě) - moreover",
    },
    {
      char: "亏待",
      pinyin: "kuī dài",
      meaning: "to treat sb unfairly",
      breakdown: "亏待 (kuī dài) - to treat sb unfairly",
    },
    {
      char: "亏损",
      pinyin: "kuī sǔn",
      meaning: "deficit",
      breakdown: "亏损 (kuī sǔn) - deficit",
    },
    {
      char: "昆虫",
      pinyin: "kūn chóng",
      meaning: "insect",
      breakdown: "昆虫 (kūn chóng) - insect",
    },
    {
      char: "捆绑",
      pinyin: "kǔn bǎng",
      meaning: "to bind",
      breakdown: "捆绑 (kǔn bǎng) - to bind",
    },
    {
      char: "扩充",
      pinyin: "kuò chōng",
      meaning: "to expand",
      breakdown: "扩充 (kuò chōng) - to expand",
    },
    {
      char: "扩散",
      pinyin: "kuò sàn",
      meaning: "to spread",
      breakdown: "扩散 (kuò sàn) - to spread",
    },
    {
      char: "扩张",
      pinyin: "kuò zhāng",
      meaning: "expansion",
      breakdown: "扩张 (kuò zhāng) - expansion",
    },
    {
      char: "喇叭",
      pinyin: "lǎ ba",
      meaning: "horn (automobile etc)",
      breakdown: "喇叭 (lǎ ba) - horn (automobile etc)",
    },
    {
      char: "啦",
      pinyin: "la",
      meaning: "sentence-final particle",
      breakdown: "啦 (la) - sentence-final particle",
    },
    {
      char: "来历",
      pinyin: "lái lì",
      meaning: "history",
      breakdown: "来历 (lái lì) - history",
    },
    {
      char: "来源",
      pinyin: "lái yuán",
      meaning: "source (of information etc)",
      breakdown: "来源 (lái yuán) - source (of information etc)",
    },
    {
      char: "栏目",
      pinyin: "lán mù",
      meaning:
        "regular column or segment (in a publication or broadcast program)",
      breakdown:
        "栏目 (lán mù) - regular column or segment (in a publication or broadcast program)",
    },
    {
      char: "懒惰",
      pinyin: "lǎn duò",
      meaning: "idle",
      breakdown: "懒惰 (lǎn duò) - idle",
    },
    {
      char: "狼狈",
      pinyin: "láng bèi",
      meaning: "in a difficult situation",
      breakdown: "狼狈 (láng bèi) - in a difficult situation",
    },
    {
      char: "朗读",
      pinyin: "lǎng dú",
      meaning: "read aloud",
      breakdown: "朗读 (lǎng dú) - read aloud",
    },
    {
      char: "捞",
      pinyin: "lāo",
      meaning: "to fish up",
      breakdown: "捞 (lāo) - to fish up",
    },
    {
      char: "唠叨",
      pinyin: "láo dao",
      meaning: "to prattle",
      breakdown: "唠叨 (láo dao) - to prattle",
    },
    {
      char: "牢固",
      pinyin: "láo gù",
      meaning: "firm",
      breakdown: "牢固 (láo gù) - firm",
    },
    {
      char: "牢骚",
      pinyin: "láo sāo",
      meaning: "discontent",
      breakdown: "牢骚 (láo sāo) - discontent",
    },
    {
      char: "乐趣",
      pinyin: "lè qù",
      meaning: "delight",
      breakdown: "乐趣 (lè qù) - delight",
    },
    {
      char: "乐意",
      pinyin: "lè yì",
      meaning: "to be willing to do sth",
      breakdown: "乐意 (lè yì) - to be willing to do sth",
    },
    {
      char: "雷达",
      pinyin: "léi dá",
      meaning: "radar (loanword)",
      breakdown: "雷达 (léi dá) - radar (loanword)",
    },
    {
      char: "类似",
      pinyin: "lèi sì",
      meaning: "similar",
      breakdown: "类似 (lèi sì) - similar",
    },
    {
      char: "冷淡",
      pinyin: "lěng dàn",
      meaning: "cold",
      breakdown: "冷淡 (lěng dàn) - cold",
    },
    {
      char: "冷酷",
      pinyin: "lěng kù",
      meaning: "grim",
      breakdown: "冷酷 (lěng kù) - grim",
    },
    {
      char: "冷却",
      pinyin: "lěng què",
      meaning: "to cool off",
      breakdown: "冷却 (lěng què) - to cool off",
    },
    {
      char: "愣",
      pinyin: "lèng",
      meaning: "to look distracted",
      breakdown: "愣 (lèng) - to look distracted",
    },
    {
      char: "黎明",
      pinyin: "lí míng",
      meaning: "dawn",
      breakdown: "黎明 (lí míng) - dawn",
    },
    {
      char: "里程碑",
      pinyin: "lǐ chéng bēi",
      meaning: "milestone",
      breakdown: "里程碑 (lǐ chéng bēi) - milestone",
    },
    {
      char: "礼节",
      pinyin: "lǐ jié",
      meaning: "etiquette",
      breakdown: "礼节 (lǐ jié) - etiquette",
    },
    {
      char: "理睬",
      pinyin: "lǐ cǎi",
      meaning: "to heed",
      breakdown: "理睬 (lǐ cǎi) - to heed",
    },
    {
      char: "理所当然",
      pinyin: "lǐ suǒ dāng rán",
      meaning:
        "as it should be by rights (idiom); proper and to be expected as a matter of course",
      breakdown:
        "理所当然 (lǐ suǒ dāng rán) - as it should be by rights (idiom); proper and to be expected as a matter of course",
    },
    {
      char: "理直气壮",
      pinyin: "lǐ zhí qì zhuàng",
      meaning:
        "in the right and self-confident (idiom); bold and confident with justice on one's side",
      breakdown:
        "理直气壮 (lǐ zhí qì zhuàng) - in the right and self-confident (idiom); bold and confident with justice on one's side",
    },
    {
      char: "理智",
      pinyin: "lǐ zhì",
      meaning: "reason",
      breakdown: "理智 (lǐ zhì) - reason",
    },
    {
      char: "立场",
      pinyin: "lì chǎng",
      meaning: "position",
      breakdown: "立场 (lì chǎng) - position",
    },
    {
      char: "立交桥",
      pinyin: "lì jiāo qiáo",
      meaning: "overpass",
      breakdown: "立交桥 (lì jiāo qiáo) - overpass",
    },
    {
      char: "立体",
      pinyin: "lì tǐ",
      meaning: "three-dimensional",
      breakdown: "立体 (lì tǐ) - three-dimensional",
    },
    {
      char: "立足",
      pinyin: "lì zú",
      meaning: "to stand",
      breakdown: "立足 (lì zú) - to stand",
    },
    {
      char: "历代",
      pinyin: "lì dài",
      meaning: "successive generations",
      breakdown: "历代 (lì dài) - successive generations",
    },
    {
      char: "历来",
      pinyin: "lì lái",
      meaning: "always",
      breakdown: "历来 (lì lái) - always",
    },
    {
      char: "利害",
      pinyin: "lì hài",
      meaning: "pros and cons",
      breakdown: "利害 (lì hài) - pros and cons",
    },
    {
      char: "利率",
      pinyin: "lì lǜ",
      meaning: "interest rates",
      breakdown: "利率 (lì lǜ) - interest rates",
    },
    {
      char: "力所能及",
      pinyin: "lì suǒ néng jí",
      meaning:
        "as far as one's capabilities extend (idiom); to the best of one's ability",
      breakdown:
        "力所能及 (lì suǒ néng jí) - as far as one's capabilities extend (idiom); to the best of one's ability",
    },
    {
      char: "力图",
      pinyin: "lì tú",
      meaning: "to try hard to",
      breakdown: "力图 (lì tú) - to try hard to",
    },
    {
      char: "力争",
      pinyin: "lì zhēng",
      meaning: "to work hard for",
      breakdown: "力争 (lì zhēng) - to work hard for",
    },
    {
      char: "例外",
      pinyin: "lì wài",
      meaning: "(make an) exception",
      breakdown: "例外 (lì wài) - (make an) exception",
    },
    {
      char: "连年",
      pinyin: "lián nián",
      meaning: "successive years",
      breakdown: "连年 (lián nián) - successive years",
    },
    {
      char: "连锁",
      pinyin: "lián suǒ",
      meaning: "to interlock",
      breakdown: "连锁 (lián suǒ) - to interlock",
    },
    {
      char: "连同",
      pinyin: "lián tóng",
      meaning: "together with",
      breakdown: "连同 (lián tóng) - together with",
    },
    {
      char: "联欢",
      pinyin: "lián huān",
      meaning: "have a get-together",
      breakdown: "联欢 (lián huān) - have a get-together",
    },
    {
      char: "联络",
      pinyin: "lián luò",
      meaning: "communication",
      breakdown: "联络 (lián luò) - communication",
    },
    {
      char: "联盟",
      pinyin: "lián méng",
      meaning: "alliance",
      breakdown: "联盟 (lián méng) - alliance",
    },
    {
      char: "联想",
      pinyin: "lián xiǎng",
      meaning: "to associate (cognitively)",
      breakdown: "联想 (lián xiǎng) - to associate (cognitively)",
    },
    {
      char: "廉洁",
      pinyin: "lián jié",
      meaning: "honest",
      breakdown: "廉洁 (lián jié) - honest",
    },
    {
      char: "良心",
      pinyin: "liáng xīn",
      meaning: "conscience",
      breakdown: "良心 (liáng xīn) - conscience",
    },
    {
      char: "晾",
      pinyin: "liàng",
      meaning: "to dry in the air",
      breakdown: "晾 (liàng) - to dry in the air",
    },
    {
      char: "谅解",
      pinyin: "liàng jiě",
      meaning: "to understand",
      breakdown: "谅解 (liàng jiě) - to understand",
    },
    {
      char: "辽阔",
      pinyin: "liáo kuò",
      meaning: "vast",
      breakdown: "辽阔 (liáo kuò) - vast",
    },
    {
      char: "列举",
      pinyin: "liè jǔ",
      meaning: "a list",
      breakdown: "列举 (liè jǔ) - a list",
    },
    {
      char: "淋",
      pinyin: "lín",
      meaning: "to drain",
      breakdown: "淋 (lín) - to drain",
    },
    {
      char: "临床",
      pinyin: "lín chuáng",
      meaning: "clinical",
      breakdown: "临床 (lín chuáng) - clinical",
    },
    {
      char: "吝啬",
      pinyin: "lìn sè",
      meaning: "stingy",
      breakdown: "吝啬 (lìn sè) - stingy",
    },
    {
      char: "零星",
      pinyin: "líng xīng",
      meaning: "fragmentary",
      breakdown: "零星 (líng xīng) - fragmentary",
    },
    {
      char: "凌晨",
      pinyin: "líng chén",
      meaning: "very early in the morning",
      breakdown: "凌晨 (líng chén) - very early in the morning",
    },
    {
      char: "灵感",
      pinyin: "líng gǎn",
      meaning: "inspiration",
      breakdown: "灵感 (líng gǎn) - inspiration",
    },
    {
      char: "灵魂",
      pinyin: "líng hún",
      meaning: "soul",
      breakdown: "灵魂 (líng hún) - soul",
    },
    {
      char: "灵敏",
      pinyin: "líng mǐn",
      meaning: "smart",
      breakdown: "灵敏 (líng mǐn) - smart",
    },
    {
      char: "伶俐",
      pinyin: "líng lì",
      meaning: "clever",
      breakdown: "伶俐 (líng lì) - clever",
    },
    {
      char: "领会",
      pinyin: "lǐng huì",
      meaning: "to understand",
      breakdown: "领会 (lǐng huì) - to understand",
    },
    {
      char: "领事馆",
      pinyin: "lǐng shì guǎn",
      meaning: "consulate",
      breakdown: "领事馆 (lǐng shì guǎn) - consulate",
    },
    {
      char: "领土",
      pinyin: "lǐng tǔ",
      meaning: "territory",
      breakdown: "领土 (lǐng tǔ) - territory",
    },
    {
      char: "领悟",
      pinyin: "lǐng wù",
      meaning: "to understand",
      breakdown: "领悟 (lǐng wù) - to understand",
    },
    {
      char: "领先",
      pinyin: "lǐng xiān",
      meaning: "to lead",
      breakdown: "领先 (lǐng xiān) - to lead",
    },
    {
      char: "领袖",
      pinyin: "lǐng xiù",
      meaning: "leader",
      breakdown: "领袖 (lǐng xiù) - leader",
    },
    {
      char: "溜",
      pinyin: "liū",
      meaning: "to slip away",
      breakdown: "溜 (liū) - to slip away",
    },
    {
      char: "留恋",
      pinyin: "liú liàn",
      meaning: "reluctant to leave",
      breakdown: "留恋 (liú liàn) - reluctant to leave",
    },
    {
      char: "留念",
      pinyin: "liú niàn",
      meaning: "to keep as a souvenir",
      breakdown: "留念 (liú niàn) - to keep as a souvenir",
    },
    {
      char: "留神",
      pinyin: "liú shén",
      meaning: "to take care",
      breakdown: "留神 (liú shén) - to take care",
    },
    {
      char: "流浪",
      pinyin: "liú làng",
      meaning: "to drift about",
      breakdown: "流浪 (liú làng) - to drift about",
    },
    {
      char: "流露",
      pinyin: "liú lù",
      meaning: "to express",
      breakdown: "流露 (liú lù) - to express",
    },
    {
      char: "流氓",
      pinyin: "liú máng",
      meaning: "rogue",
      breakdown: "流氓 (liú máng) - rogue",
    },
    {
      char: "流通",
      pinyin: "liú tōng",
      meaning: "to circulate",
      breakdown: "流通 (liú tōng) - to circulate",
    },
    {
      char: "聋哑",
      pinyin: "lóng yǎ",
      meaning: "deaf and dumb",
      breakdown: "聋哑 (lóng yǎ) - deaf and dumb",
    },
    {
      char: "隆重",
      pinyin: "lóng zhòng",
      meaning: "grand",
      breakdown: "隆重 (lóng zhòng) - grand",
    },
    {
      char: "垄断",
      pinyin: "lǒng duàn",
      meaning: "to enjoy market dominance",
      breakdown: "垄断 (lǒng duàn) - to enjoy market dominance",
    },
    {
      char: "笼罩",
      pinyin: "lǒng zhào",
      meaning: "to envelop",
      breakdown: "笼罩 (lǒng zhào) - to envelop",
    },
    {
      char: "搂",
      pinyin: "lǒu",
      meaning: "to hug",
      breakdown: "搂 (lǒu) - to hug",
    },
    {
      char: "炉灶",
      pinyin: "lú zào",
      meaning: "stove",
      breakdown: "炉灶 (lú zào) - stove",
    },
    {
      char: "轮船",
      pinyin: "lún chuán",
      meaning: "steamship",
      breakdown: "轮船 (lún chuán) - steamship",
    },
    {
      char: "轮廓",
      pinyin: "lún kuò",
      meaning: "an outline",
      breakdown: "轮廓 (lún kuò) - an outline",
    },
    {
      char: "轮胎",
      pinyin: "lún tāi",
      meaning: "tire",
      breakdown: "轮胎 (lún tāi) - tire",
    },
    {
      char: "论坛",
      pinyin: "lùn tán",
      meaning: "forum (for discussion)",
      breakdown: "论坛 (lùn tán) - forum (for discussion)",
    },
    {
      char: "论证",
      pinyin: "lùn zhèng",
      meaning: "to prove a point",
      breakdown: "论证 (lùn zhèng) - to prove a point",
    },
    {
      char: "啰唆",
      pinyin: "luō suō",
      meaning: "see 囉嗦|啰嗦[luō suo]",
      breakdown: "啰唆 (luō suō) - see 囉嗦|啰嗦[luō suo]",
    },
    {
      char: "螺丝钉",
      pinyin: "luó sī dīng",
      meaning: "screw",
      breakdown: "螺丝钉 (luó sī dīng) - screw",
    },
    {
      char: "落成",
      pinyin: "luò chéng",
      meaning: "to complete a construction project",
      breakdown: "落成 (luò chéng) - to complete a construction project",
    },
    {
      char: "落实",
      pinyin: "luò shí",
      meaning: "practical",
      breakdown: "落实 (luò shí) - practical",
    },
    {
      char: "络绎不绝",
      pinyin: "luò yì bù jué",
      meaning: "continuously; in an endless stream (idiom)",
      breakdown:
        "络绎不绝 (luò yì bù jué) - continuously; in an endless stream (idiom)",
    },
    {
      char: "屡次",
      pinyin: "lǚ cì",
      meaning: "repeatedly",
      breakdown: "屡次 (lǚ cì) - repeatedly",
    },
    {
      char: "履行",
      pinyin: "lǚ xíng",
      meaning: "to fulfill (one's obligations)",
      breakdown: "履行 (lǚ xíng) - to fulfill (one's obligations)",
    },
    {
      char: "掠夺",
      pinyin: "lvè duó",
      meaning: "to plunder",
      breakdown: "掠夺 (lvè duó) - to plunder",
    },
    {
      char: "略微",
      pinyin: "lvè wēi",
      meaning: "a little bit",
      breakdown: "略微 (lvè wēi) - a little bit",
    },
    {
      char: "麻痹",
      pinyin: "má bì",
      meaning: "paralysis",
      breakdown: "麻痹 (má bì) - paralysis",
    },
    {
      char: "麻木",
      pinyin: "má mù",
      meaning: "numb",
      breakdown: "麻木 (má mù) - numb",
    },
    {
      char: "麻醉",
      pinyin: "má zuì",
      meaning: "anesthesia",
      breakdown: "麻醉 (má zuì) - anesthesia",
    },
    {
      char: "码头",
      pinyin: "mǎ tóu",
      meaning: "dock",
      breakdown: "码头 (mǎ tóu) - dock",
    },
    {
      char: "嘛",
      pinyin: "ma",
      meaning: "modal particle indicating that sth is obvious",
      breakdown: "嘛 (ma) - modal particle indicating that sth is obvious",
    },
    {
      char: "埋伏",
      pinyin: "mái fú",
      meaning: "to ambush",
      breakdown: "埋伏 (mái fú) - to ambush",
    },
    {
      char: "埋没",
      pinyin: "mái mò",
      meaning: "to engulf",
      breakdown: "埋没 (mái mò) - to engulf",
    },
    {
      char: "埋葬",
      pinyin: "mái zàng",
      meaning: "to bury",
      breakdown: "埋葬 (mái zàng) - to bury",
    },
    {
      char: "迈",
      pinyin: "mài",
      meaning: "take a step",
      breakdown: "迈 (mài) - take a step",
    },
    {
      char: "脉搏",
      pinyin: "mài bó",
      meaning: "a pulse (both medical and figurative)",
      breakdown: "脉搏 (mài bó) - a pulse (both medical and figurative)",
    },
    {
      char: "埋怨",
      pinyin: "mán yuàn",
      meaning: "to complain",
      breakdown: "埋怨 (mán yuàn) - to complain",
    },
    {
      char: "慢性",
      pinyin: "màn xìng",
      meaning: "slow and patient",
      breakdown: "慢性 (màn xìng) - slow and patient",
    },
    {
      char: "漫长",
      pinyin: "màn cháng",
      meaning: "very long",
      breakdown: "漫长 (màn cháng) - very long",
    },
    {
      char: "漫画",
      pinyin: "màn huà",
      meaning: "caricature",
      breakdown: "漫画 (màn huà) - caricature",
    },
    {
      char: "蔓延",
      pinyin: "màn yán",
      meaning: "to extend",
      breakdown: "蔓延 (màn yán) - to extend",
    },
    {
      char: "忙碌",
      pinyin: "máng lù",
      meaning: "busy",
      breakdown: "忙碌 (máng lù) - busy",
    },
    {
      char: "茫茫",
      pinyin: "máng máng",
      meaning: "boundless",
      breakdown: "茫茫 (máng máng) - boundless",
    },
    {
      char: "茫然",
      pinyin: "máng rán",
      meaning: "blankly",
      breakdown: "茫然 (máng rán) - blankly",
    },
    {
      char: "盲目",
      pinyin: "máng mù",
      meaning: "blind",
      breakdown: "盲目 (máng mù) - blind",
    },
    {
      char: "冒充",
      pinyin: "mào chōng",
      meaning: "to feign",
      breakdown: "冒充 (mào chōng) - to feign",
    },
    {
      char: "茂盛",
      pinyin: "mào shèng",
      meaning: "lush",
      breakdown: "茂盛 (mào shèng) - lush",
    },
    {
      char: "枚",
      pinyin: "méi",
      meaning: "classifier for coins",
      breakdown: "枚 (méi) - classifier for coins",
    },
    {
      char: "没辙",
      pinyin: "méi zhé",
      meaning: "(idiom) unable to solve; no way to escape a problem",
      breakdown:
        "没辙 (méi zhé) - (idiom) unable to solve; no way to escape a problem",
    },
    {
      char: "媒介",
      pinyin: "méi jiè",
      meaning: "media",
      breakdown: "媒介 (méi jiè) - media",
    },
    {
      char: "媒体",
      pinyin: "méi tǐ",
      meaning: "media",
      breakdown: "媒体 (méi tǐ) - media",
    },
    {
      char: "美观",
      pinyin: "měi guān",
      meaning: "pleasing to the eye",
      breakdown: "美观 (měi guān) - pleasing to the eye",
    },
    {
      char: "美满",
      pinyin: "měi mǎn",
      meaning: "happy",
      breakdown: "美满 (měi mǎn) - happy",
    },
    {
      char: "美妙",
      pinyin: "měi miào",
      meaning: "beautiful",
      breakdown: "美妙 (měi miào) - beautiful",
    },
    {
      char: "门诊",
      pinyin: "mén zhěn",
      meaning: "outpatient service",
      breakdown: "门诊 (mén zhěn) - outpatient service",
    },
    {
      char: "蒙",
      pinyin: "méng",
      meaning: "to cover",
      breakdown: "蒙 (méng) - to cover",
    },
    {
      char: "萌芽",
      pinyin: "méng yá",
      meaning: "sprout",
      breakdown: "萌芽 (méng yá) - sprout",
    },
    {
      char: "猛烈",
      pinyin: "měng liè",
      meaning: "fierce",
      breakdown: "猛烈 (měng liè) - fierce",
    },
    {
      char: "梦想",
      pinyin: "mèng xiǎng",
      meaning: "(figuratively) to dream of",
      breakdown: "梦想 (mèng xiǎng) - (figuratively) to dream of",
    },
    {
      char: "眯",
      pinyin: "mī",
      meaning: "to narrow one's eyes",
      breakdown: "眯 (mī) - to narrow one's eyes",
    },
    {
      char: "弥补",
      pinyin: "mí bǔ",
      meaning: "to complement",
      breakdown: "弥补 (mí bǔ) - to complement",
    },
    {
      char: "弥漫",
      pinyin: "mí màn",
      meaning: "variant of 彌漫|弥漫[mí màn]",
      breakdown: "弥漫 (mí màn) - variant of 彌漫|弥漫[mí màn]",
    },
    {
      char: "迷惑",
      pinyin: "mí huo",
      meaning: "to puzzle",
      breakdown: "迷惑 (mí huo) - to puzzle",
    },
    {
      char: "迷人",
      pinyin: "mí rén",
      meaning: "fascinating",
      breakdown: "迷人 (mí rén) - fascinating",
    },
    {
      char: "迷失",
      pinyin: "mí shī",
      meaning: "lost",
      breakdown: "迷失 (mí shī) - lost",
    },
    {
      char: "迷信",
      pinyin: "mí xìn",
      meaning: "superstition",
      breakdown: "迷信 (mí xìn) - superstition",
    },
    {
      char: "密度",
      pinyin: "mì dù",
      meaning: "density",
      breakdown: "密度 (mì dù) - density",
    },
    {
      char: "密封",
      pinyin: "mì fēng",
      meaning: "to seal up",
      breakdown: "密封 (mì fēng) - to seal up",
    },
    {
      char: "免得",
      pinyin: "miǎn de",
      meaning: "so as not to",
      breakdown: "免得 (miǎn de) - so as not to",
    },
    {
      char: "免疫",
      pinyin: "miǎn yì",
      meaning: "immunity (to disease)",
      breakdown: "免疫 (miǎn yì) - immunity (to disease)",
    },
    {
      char: "勉励",
      pinyin: "miǎn lì",
      meaning: "to encourage",
      breakdown: "勉励 (miǎn lì) - to encourage",
    },
    {
      char: "勉强",
      pinyin: "miǎn qiǎng",
      meaning: "to do with difficulty",
      breakdown: "勉强 (miǎn qiǎng) - to do with difficulty",
    },
    {
      char: "面貌",
      pinyin: "miàn mào",
      meaning: "appearance",
      breakdown: "面貌 (miàn mào) - appearance",
    },
    {
      char: "面子",
      pinyin: "miàn zi",
      meaning: "outer surface",
      breakdown: "面子 (miàn zi) - outer surface",
    },
    {
      char: "描绘",
      pinyin: "miáo huì",
      meaning: "to describe",
      breakdown: "描绘 (miáo huì) - to describe",
    },
    {
      char: "渺小",
      pinyin: "miǎo xiǎo",
      meaning: "minute",
      breakdown: "渺小 (miǎo xiǎo) - minute",
    },
    {
      char: "蔑视",
      pinyin: "miè shì",
      meaning: "to loathe",
      breakdown: "蔑视 (miè shì) - to loathe",
    },
    {
      char: "灭亡",
      pinyin: "miè wáng",
      meaning: "to be destroyed",
      breakdown: "灭亡 (miè wáng) - to be destroyed",
    },
    {
      char: "民间",
      pinyin: "mín jiān",
      meaning: "among the people",
      breakdown: "民间 (mín jiān) - among the people",
    },
    {
      char: "民用",
      pinyin: "mín yòng",
      meaning: "(for) civilian use",
      breakdown: "民用 (mín yòng) - (for) civilian use",
    },
    {
      char: "敏感",
      pinyin: "mǐn gǎn",
      meaning: "sensitive",
      breakdown: "敏感 (mǐn gǎn) - sensitive",
    },
    {
      char: "敏捷",
      pinyin: "mǐn jié",
      meaning: "nimble",
      breakdown: "敏捷 (mǐn jié) - nimble",
    },
    {
      char: "敏锐",
      pinyin: "mǐn ruì",
      meaning: "keen",
      breakdown: "敏锐 (mǐn ruì) - keen",
    },
    {
      char: "明明",
      pinyin: "míng míng",
      meaning: "obviously",
      breakdown: "明明 (míng míng) - obviously",
    },
    {
      char: "名次",
      pinyin: "míng cì",
      meaning: "position in a ranking of names",
      breakdown: "名次 (míng cì) - position in a ranking of names",
    },
    {
      char: "名额",
      pinyin: "míng é",
      meaning: "quota",
      breakdown: "名额 (míng é) - quota",
    },
    {
      char: "名副其实",
      pinyin: "míng fù qí shí",
      meaning: "not just in name only",
      breakdown: "名副其实 (míng fù qí shí) - not just in name only",
    },
    {
      char: "名誉",
      pinyin: "míng yù",
      meaning: "fame",
      breakdown: "名誉 (míng yù) - fame",
    },
    {
      char: "命名",
      pinyin: "mìng míng",
      meaning: "to give a name to",
      breakdown: "命名 (mìng míng) - to give a name to",
    },
    {
      char: "摸索",
      pinyin: "mō suo",
      meaning: "to feel about",
      breakdown: "摸索 (mō suo) - to feel about",
    },
    {
      char: "膜",
      pinyin: "mó",
      meaning: "membrane",
      breakdown: "膜 (mó) - membrane",
    },
    {
      char: "摩擦",
      pinyin: "mó cā",
      meaning: "friction",
      breakdown: "摩擦 (mó cā) - friction",
    },
    {
      char: "磨合",
      pinyin: "mó hé",
      meaning: "to break in",
      breakdown: "磨合 (mó hé) - to break in",
    },
    {
      char: "模范",
      pinyin: "mó fàn",
      meaning: "model",
      breakdown: "模范 (mó fàn) - model",
    },
    {
      char: "模式",
      pinyin: "mó shì",
      meaning: "mode",
      breakdown: "模式 (mó shì) - mode",
    },
    {
      char: "模型",
      pinyin: "mó xíng",
      meaning: "model",
      breakdown: "模型 (mó xíng) - model",
    },
    {
      char: "魔鬼",
      pinyin: "mó guǐ",
      meaning: "devil",
      breakdown: "魔鬼 (mó guǐ) - devil",
    },
    {
      char: "魔术",
      pinyin: "mó shù",
      meaning: "magic",
      breakdown: "魔术 (mó shù) - magic",
    },
    {
      char: "抹杀",
      pinyin: "mǒ shā",
      meaning: "to erase",
      breakdown: "抹杀 (mǒ shā) - to erase",
    },
    {
      char: "莫名其妙",
      pinyin: "mò míng qí miào",
      meaning: "unfathomable mystery (idiom); subtle and ineffable",
      breakdown:
        "莫名其妙 (mò míng qí miào) - unfathomable mystery (idiom); subtle and ineffable",
    },
    {
      char: "默默",
      pinyin: "mò mò",
      meaning: "in silence",
      breakdown: "默默 (mò mò) - in silence",
    },
    {
      char: "墨水儿",
      pinyin: "mò shuǐ r",
      meaning: "erhua variant of 墨水",
      breakdown: "墨水儿 (mò shuǐ r) - erhua variant of 墨水",
    },
    {
      char: "谋求",
      pinyin: "móu qiú",
      meaning: "to seek",
      breakdown: "谋求 (móu qiú) - to seek",
    },
    {
      char: "模样",
      pinyin: "mú yàng",
      meaning: "look",
      breakdown: "模样 (mú yàng) - look",
    },
    {
      char: "母语",
      pinyin: "mǔ yǔ",
      meaning: "native language",
      breakdown: "母语 (mǔ yǔ) - native language",
    },
    {
      char: "目睹",
      pinyin: "mù dǔ",
      meaning: "to witness",
      breakdown: "目睹 (mù dǔ) - to witness",
    },
    {
      char: "目光",
      pinyin: "mù guāng",
      meaning: "sight",
      breakdown: "目光 (mù guāng) - sight",
    },
    {
      char: "沐浴",
      pinyin: "mù yù",
      meaning: "to take a bath",
      breakdown: "沐浴 (mù yù) - to take a bath",
    },
    {
      char: "拿手",
      pinyin: "ná shǒu",
      meaning: "expert in",
      breakdown: "拿手 (ná shǒu) - expert in",
    },
    {
      char: "纳闷儿",
      pinyin: "nà mèn r",
      meaning: "puzzled",
      breakdown: "纳闷儿 (nà mèn r) - puzzled",
    },
    {
      char: "耐用",
      pinyin: "nài yòng",
      meaning: "durable",
      breakdown: "耐用 (nài yòng) - durable",
    },
    {
      char: "难得",
      pinyin: "nán dé",
      meaning: "seldom",
      breakdown: "难得 (nán dé) - seldom",
    },
    {
      char: "难堪",
      pinyin: "nán kān",
      meaning: "hard to take",
      breakdown: "难堪 (nán kān) - hard to take",
    },
    {
      char: "难免",
      pinyin: "nán miǎn",
      meaning: "hard to avoid",
      breakdown: "难免 (nán miǎn) - hard to avoid",
    },
    {
      char: "难能可贵",
      pinyin: "nán néng kě guì",
      meaning: "rare and precious",
      breakdown: "难能可贵 (nán néng kě guì) - rare and precious",
    },
    {
      char: "恼火",
      pinyin: "nǎo huǒ",
      meaning: "to get angry",
      breakdown: "恼火 (nǎo huǒ) - to get angry",
    },
    {
      char: "内涵",
      pinyin: "nèi hán",
      meaning: "meaning",
      breakdown: "内涵 (nèi hán) - meaning",
    },
    {
      char: "内幕",
      pinyin: "nèi mù",
      meaning: "inside story",
      breakdown: "内幕 (nèi mù) - inside story",
    },
    {
      char: "内在",
      pinyin: "nèi zài",
      meaning: "intrinsic",
      breakdown: "内在 (nèi zài) - intrinsic",
    },
    {
      char: "能量",
      pinyin: "néng liàng",
      meaning: "energy",
      breakdown: "能量 (néng liàng) - energy",
    },
    {
      char: "嗯",
      pinyin: "en",
      meaning: "interjection indicating approval",
      breakdown: "嗯 (en) - interjection indicating approval",
    },
    {
      char: "拟定",
      pinyin: "nǐ dìng",
      meaning: "to draw up",
      breakdown: "拟定 (nǐ dìng) - to draw up",
    },
    {
      char: "年度",
      pinyin: "nián dù",
      meaning: "year (e.g. school year)",
      breakdown: "年度 (nián dù) - year (e.g. school year)",
    },
    {
      char: "捏",
      pinyin: "niē",
      meaning: "to pinch (with one's fingers)",
      breakdown: "捏 (niē) - to pinch (with one's fingers)",
    },
    {
      char: "拧",
      pinyin: "níng",
      meaning: "to pinch",
      breakdown: "拧 (níng) - to pinch",
    },
    {
      char: "凝固",
      pinyin: "níng gù",
      meaning: "to freeze",
      breakdown: "凝固 (níng gù) - to freeze",
    },
    {
      char: "凝聚",
      pinyin: "níng jù",
      meaning: "to condense",
      breakdown: "凝聚 (níng jù) - to condense",
    },
    {
      char: "凝视",
      pinyin: "níng shì",
      meaning: "to gaze at",
      breakdown: "凝视 (níng shì) - to gaze at",
    },
    {
      char: "宁肯",
      pinyin: "nìng kěn",
      meaning: "would rather...",
      breakdown: "宁肯 (nìng kěn) - would rather...",
    },
    {
      char: "宁愿",
      pinyin: "nìng yuàn",
      meaning: "would rather",
      breakdown: "宁愿 (nìng yuàn) - would rather",
    },
    {
      char: "纽扣儿",
      pinyin: "niǔ kòu ér",
      meaning: "Buttons children",
      breakdown: "纽扣儿 (niǔ kòu ér) - Buttons children",
    },
    {
      char: "扭转",
      pinyin: "niǔ zhuǎn",
      meaning: "to reverse",
      breakdown: "扭转 (niǔ zhuǎn) - to reverse",
    },
    {
      char: "浓厚",
      pinyin: "nóng hòu",
      meaning: "dense",
      breakdown: "浓厚 (nóng hòu) - dense",
    },
    {
      char: "农历",
      pinyin: "nóng lì",
      meaning: "the traditional Chinese calendar",
      breakdown: "农历 (nóng lì) - the traditional Chinese calendar",
    },
    {
      char: "奴隶",
      pinyin: "nú lì",
      meaning: "slave",
      breakdown: "奴隶 (nú lì) - slave",
    },
    {
      char: "挪",
      pinyin: "nuó",
      meaning: "to shift",
      breakdown: "挪 (nuó) - to shift",
    },
    {
      char: "虐待",
      pinyin: "nvè dài",
      meaning: "to mistreat",
      breakdown: "虐待 (nvè dài) - to mistreat",
    },
    {
      char: "哦",
      pinyin: "ò",
      meaning: "oh (interjection indicating that one has just learned sth)",
      breakdown:
        "哦 (ò) - oh (interjection indicating that one has just learned sth)",
    },
    {
      char: "殴打",
      pinyin: "ōu dǎ",
      meaning: "to beat up",
      breakdown: "殴打 (ōu dǎ) - to beat up",
    },
    {
      char: "欧洲",
      pinyin: "Oū zhōu",
      meaning: "Europe",
      breakdown: "欧洲 (Oū zhōu) - Europe",
    },
    {
      char: "呕吐",
      pinyin: "ǒu tù",
      meaning: "to vomit",
      breakdown: "呕吐 (ǒu tù) - to vomit",
    },
    {
      char: "趴",
      pinyin: "pā",
      meaning: "to lie on one's stomach",
      breakdown: "趴 (pā) - to lie on one's stomach",
    },
    {
      char: "排斥",
      pinyin: "pái chì",
      meaning: "to reject",
      breakdown: "排斥 (pái chì) - to reject",
    },
    {
      char: "排除",
      pinyin: "pái chú",
      meaning: "to eliminate",
      breakdown: "排除 (pái chú) - to eliminate",
    },
    {
      char: "排放",
      pinyin: "pái fàng",
      meaning: "emission",
      breakdown: "排放 (pái fàng) - emission",
    },
    {
      char: "徘徊",
      pinyin: "pái huái",
      meaning: "to dither",
      breakdown: "徘徊 (pái huái) - to dither",
    },
    {
      char: "派别",
      pinyin: "pài bié",
      meaning: "denomination",
      breakdown: "派别 (pài bié) - denomination",
    },
    {
      char: "派遣",
      pinyin: "pài qiǎn",
      meaning: "to send (on a mission)",
      breakdown: "派遣 (pài qiǎn) - to send (on a mission)",
    },
    {
      char: "攀登",
      pinyin: "pān dēng",
      meaning: "to climb",
      breakdown: "攀登 (pān dēng) - to climb",
    },
    {
      char: "盘旋",
      pinyin: "pán xuán",
      meaning: "to spiral",
      breakdown: "盘旋 (pán xuán) - to spiral",
    },
    {
      char: "畔",
      pinyin: "pàn",
      meaning: "bank",
      breakdown: "畔 (pàn) - bank",
    },
    {
      char: "判决",
      pinyin: "pàn jué",
      meaning: "judgment (by a court of law)",
      breakdown: "判决 (pàn jué) - judgment (by a court of law)",
    },
    {
      char: "庞大",
      pinyin: "páng dà",
      meaning: "huge",
      breakdown: "庞大 (páng dà) - huge",
    },
    {
      char: "抛弃",
      pinyin: "pāo qì",
      meaning: "to abandon",
      breakdown: "抛弃 (pāo qì) - to abandon",
    },
    {
      char: "泡沫",
      pinyin: "pào mò",
      meaning: "foam",
      breakdown: "泡沫 (pào mò) - foam",
    },
    {
      char: "培训",
      pinyin: "péi xùn",
      meaning: "to cultivate",
      breakdown: "培训 (péi xùn) - to cultivate",
    },
    {
      char: "培育",
      pinyin: "péi yù",
      meaning: "to train",
      breakdown: "培育 (péi yù) - to train",
    },
    {
      char: "配备",
      pinyin: "pèi bèi",
      meaning: "to allocate",
      breakdown: "配备 (pèi bèi) - to allocate",
    },
    {
      char: "配偶",
      pinyin: "pèi ǒu",
      meaning: "consort",
      breakdown: "配偶 (pèi ǒu) - consort",
    },
    {
      char: "配套",
      pinyin: "pèi tào",
      meaning: "to form a complete set",
      breakdown: "配套 (pèi tào) - to form a complete set",
    },
    {
      char: "盆地",
      pinyin: "pén dì",
      meaning: "basin (low-lying geographical feature)",
      breakdown: "盆地 (pén dì) - basin (low-lying geographical feature)",
    },
    {
      char: "烹饪",
      pinyin: "pēng rèn",
      meaning: "cooking",
      breakdown: "烹饪 (pēng rèn) - cooking",
    },
    {
      char: "捧",
      pinyin: "pěng",
      meaning: "to clasp",
      breakdown: "捧 (pěng) - to clasp",
    },
    {
      char: "劈",
      pinyin: "pī",
      meaning: "to hack",
      breakdown: "劈 (pī) - to hack",
    },
    {
      char: "批发",
      pinyin: "pī fā",
      meaning: "wholesale",
      breakdown: "批发 (pī fā) - wholesale",
    },
    {
      char: "批判",
      pinyin: "pī pàn",
      meaning: "to criticize",
      breakdown: "批判 (pī pàn) - to criticize",
    },
    {
      char: "疲惫",
      pinyin: "pí bèi",
      meaning: "beaten",
      breakdown: "疲惫 (pí bèi) - beaten",
    },
    {
      char: "疲倦",
      pinyin: "pí juàn",
      meaning: "to tire",
      breakdown: "疲倦 (pí juàn) - to tire",
    },
    {
      char: "皮革",
      pinyin: "pí gé",
      meaning: "leather",
      breakdown: "皮革 (pí gé) - leather",
    },
    {
      char: "屁股",
      pinyin: "pì gu",
      meaning: "buttocks",
      breakdown: "屁股 (pì gu) - buttocks",
    },
    {
      char: "譬如",
      pinyin: "pì rú",
      meaning: "for example",
      breakdown: "譬如 (pì rú) - for example",
    },
    {
      char: "偏差",
      pinyin: "piān chā",
      meaning: "bias",
      breakdown: "偏差 (piān chā) - bias",
    },
    {
      char: "偏见",
      pinyin: "piān jiàn",
      meaning: "prejudice",
      breakdown: "偏见 (piān jiàn) - prejudice",
    },
    {
      char: "偏僻",
      pinyin: "piān pì",
      meaning: "remote",
      breakdown: "偏僻 (piān pì) - remote",
    },
    {
      char: "偏偏",
      pinyin: "piān piān",
      meaning: "sth turns out just the opposite of what one would expect",
      breakdown:
        "偏偏 (piān piān) - sth turns out just the opposite of what one would expect",
    },
    {
      char: "片断",
      pinyin: "piàn duàn",
      meaning: "section",
      breakdown: "片断 (piàn duàn) - section",
    },
    {
      char: "片刻",
      pinyin: "piàn kè",
      meaning: "short period of time",
      breakdown: "片刻 (piàn kè) - short period of time",
    },
    {
      char: "飘扬",
      pinyin: "piāo yáng",
      meaning: "to wave",
      breakdown: "飘扬 (piāo yáng) - to wave",
    },
    {
      char: "漂浮",
      pinyin: "piāo fú",
      meaning: "to float",
      breakdown: "漂浮 (piāo fú) - to float",
    },
    {
      char: "拼搏",
      pinyin: "pīn bó",
      meaning: "to struggle",
      breakdown: "拼搏 (pīn bó) - to struggle",
    },
    {
      char: "拼命",
      pinyin: "pīn mìng",
      meaning: "to do one's utmost",
      breakdown: "拼命 (pīn mìng) - to do one's utmost",
    },
    {
      char: "频繁",
      pinyin: "pín fán",
      meaning: "frequently",
      breakdown: "频繁 (pín fán) - frequently",
    },
    {
      char: "频率",
      pinyin: "pín lǜ",
      meaning: "frequency",
      breakdown: "频率 (pín lǜ) - frequency",
    },
    {
      char: "贫乏",
      pinyin: "pín fá",
      meaning: "lack",
      breakdown: "贫乏 (pín fá) - lack",
    },
    {
      char: "贫困",
      pinyin: "pín kùn",
      meaning: "impoverished",
      breakdown: "贫困 (pín kùn) - impoverished",
    },
    {
      char: "品尝",
      pinyin: "pǐn cháng",
      meaning: "to taste a small amount",
      breakdown: "品尝 (pǐn cháng) - to taste a small amount",
    },
    {
      char: "品德",
      pinyin: "pǐn dé",
      meaning: "moral character",
      breakdown: "品德 (pǐn dé) - moral character",
    },
    {
      char: "品行",
      pinyin: "pǐn xíng",
      meaning: "behavior",
      breakdown: "品行 (pǐn xíng) - behavior",
    },
    {
      char: "品质",
      pinyin: "pǐn zhì",
      meaning: "quality",
      breakdown: "品质 (pǐn zhì) - quality",
    },
    {
      char: "平凡",
      pinyin: "píng fán",
      meaning: "commonplace",
      breakdown: "平凡 (píng fán) - commonplace",
    },
    {
      char: "平面",
      pinyin: "píng miàn",
      meaning: "plane (flat surface)",
      breakdown: "平面 (píng miàn) - plane (flat surface)",
    },
    {
      char: "平坦",
      pinyin: "píng tǎn",
      meaning: "level",
      breakdown: "平坦 (píng tǎn) - level",
    },
    {
      char: "平行",
      pinyin: "píng xíng",
      meaning: "parallel",
      breakdown: "平行 (píng xíng) - parallel",
    },
    {
      char: "平原",
      pinyin: "píng yuán",
      meaning: "field",
      breakdown: "平原 (píng yuán) - field",
    },
    {
      char: "评估",
      pinyin: "píng gū",
      meaning: "to evaluate",
      breakdown: "评估 (píng gū) - to evaluate",
    },
    {
      char: "评论",
      pinyin: "píng lùn",
      meaning: "to comment on",
      breakdown: "评论 (píng lùn) - to comment on",
    },
    {
      char: "屏障",
      pinyin: "píng zhàng",
      meaning: "protective screen",
      breakdown: "屏障 (píng zhàng) - protective screen",
    },
    {
      char: "坡",
      pinyin: "pō",
      meaning: "slope",
      breakdown: "坡 (pō) - slope",
    },
    {
      char: "泼",
      pinyin: "pō",
      meaning: "to splash",
      breakdown: "泼 (pō) - to splash",
    },
    {
      char: "颇",
      pinyin: "pō",
      meaning: "rather",
      breakdown: "颇 (pō) - rather",
    },
    {
      char: "破例",
      pinyin: "pò lì",
      meaning: "to make an exception",
      breakdown: "破例 (pò lì) - to make an exception",
    },
    {
      char: "迫不及待",
      pinyin: "pò bù jí dài",
      meaning: "impatient (idiom); in a hurry",
      breakdown: "迫不及待 (pò bù jí dài) - impatient (idiom); in a hurry",
    },
    {
      char: "迫害",
      pinyin: "pò hài",
      meaning: "to persecute",
      breakdown: "迫害 (pò hài) - to persecute",
    },
    {
      char: "魄力",
      pinyin: "pò lì",
      meaning: "courage",
      breakdown: "魄力 (pò lì) - courage",
    },
    {
      char: "扑",
      pinyin: "pū",
      meaning: "to throw oneself at",
      breakdown: "扑 (pū) - to throw oneself at",
    },
    {
      char: "铺",
      pinyin: "pū",
      meaning: "to spread",
      breakdown: "铺 (pū) - to spread",
    },
    {
      char: "普及",
      pinyin: "pǔ jí",
      meaning: "popular",
      breakdown: "普及 (pǔ jí) - popular",
    },
    {
      char: "朴实",
      pinyin: "pǔ shí",
      meaning: "plain",
      breakdown: "朴实 (pǔ shí) - plain",
    },
    {
      char: "瀑布",
      pinyin: "pù bù",
      meaning: "waterfall",
      breakdown: "瀑布 (pù bù) - waterfall",
    },
    {
      char: "期望",
      pinyin: "qī wàng",
      meaning: "to have expectations",
      breakdown: "期望 (qī wàng) - to have expectations",
    },
    {
      char: "期限",
      pinyin: "qī xiàn",
      meaning: "time limit",
      breakdown: "期限 (qī xiàn) - time limit",
    },
    {
      char: "欺负",
      pinyin: "qī fu",
      meaning: "to bully",
      breakdown: "欺负 (qī fu) - to bully",
    },
    {
      char: "欺骗",
      pinyin: "qī piàn",
      meaning: "to deceive",
      breakdown: "欺骗 (qī piàn) - to deceive",
    },
    {
      char: "凄凉",
      pinyin: "qī liáng",
      meaning: "desolate",
      breakdown: "凄凉 (qī liáng) - desolate",
    },
    {
      char: "奇妙",
      pinyin: "qí miào",
      meaning: "fantastic",
      breakdown: "奇妙 (qí miào) - fantastic",
    },
    {
      char: "旗袍",
      pinyin: "qí páo",
      meaning: "Chinese-style dress",
      breakdown: "旗袍 (qí páo) - Chinese-style dress",
    },
    {
      char: "旗帜",
      pinyin: "qí zhì",
      meaning: "ensign",
      breakdown: "旗帜 (qí zhì) - ensign",
    },
    {
      char: "齐全",
      pinyin: "qí quán",
      meaning: "complete",
      breakdown: "齐全 (qí quán) - complete",
    },
    {
      char: "齐心协力",
      pinyin: "qí xīn xié lì",
      meaning:
        "to work with a common purpose (idiom); to make concerted efforts",
      breakdown:
        "齐心协力 (qí xīn xié lì) - to work with a common purpose (idiom); to make concerted efforts",
    },
    {
      char: "歧视",
      pinyin: "qí shì",
      meaning: "to discriminate against",
      breakdown: "歧视 (qí shì) - to discriminate against",
    },
    {
      char: "起草",
      pinyin: "qǐ cǎo",
      meaning: "draft (a bill)",
      breakdown: "起草 (qǐ cǎo) - draft (a bill)",
    },
    {
      char: "起初",
      pinyin: "qǐ chū",
      meaning: "originally",
      breakdown: "起初 (qǐ chū) - originally",
    },
    {
      char: "起伏",
      pinyin: "qǐ fú",
      meaning: "to move up and down",
      breakdown: "起伏 (qǐ fú) - to move up and down",
    },
    {
      char: "起哄",
      pinyin: "qǐ hòng",
      meaning: "to heckle",
      breakdown: "起哄 (qǐ hòng) - to heckle",
    },
    {
      char: "起码",
      pinyin: "qǐ mǎ",
      meaning: "at the minimum",
      breakdown: "起码 (qǐ mǎ) - at the minimum",
    },
    {
      char: "起义",
      pinyin: "qǐ yì",
      meaning: "uprising",
      breakdown: "起义 (qǐ yì) - uprising",
    },
    {
      char: "起源",
      pinyin: "qǐ yuán",
      meaning: "origin",
      breakdown: "起源 (qǐ yuán) - origin",
    },
    {
      char: "启程",
      pinyin: "qǐ chéng",
      meaning: "to set out on a journey",
      breakdown: "启程 (qǐ chéng) - to set out on a journey",
    },
    {
      char: "启示",
      pinyin: "qǐ shì",
      meaning: "enlightenment",
      breakdown: "启示 (qǐ shì) - enlightenment",
    },
    {
      char: "启事",
      pinyin: "qǐ shì",
      meaning: "announcement (written)",
      breakdown: "启事 (qǐ shì) - announcement (written)",
    },
    {
      char: "乞丐",
      pinyin: "qǐ gài",
      meaning: "beggar",
      breakdown: "乞丐 (qǐ gài) - beggar",
    },
    {
      char: "岂有此理",
      pinyin: "qǐ yǒu cǐ lǐ",
      meaning: "how can this be so? (idiom); preposterous",
      breakdown:
        "岂有此理 (qǐ yǒu cǐ lǐ) - how can this be so? (idiom); preposterous",
    },
    {
      char: "器材",
      pinyin: "qì cái",
      meaning: "equipment",
      breakdown: "器材 (qì cái) - equipment",
    },
    {
      char: "器官",
      pinyin: "qì guān",
      meaning: "organ (part of body tissue)",
      breakdown: "器官 (qì guān) - organ (part of body tissue)",
    },
    {
      char: "气概",
      pinyin: "qì gài",
      meaning: "lofty quality",
      breakdown: "气概 (qì gài) - lofty quality",
    },
    {
      char: "气功",
      pinyin: "qì gōng",
      meaning: "qigong",
      breakdown: "气功 (qì gōng) - qigong",
    },
    {
      char: "气魄",
      pinyin: "qì pò",
      meaning: "spirit",
      breakdown: "气魄 (qì pò) - spirit",
    },
    {
      char: "气色",
      pinyin: "qì sè",
      meaning: "complexion",
      breakdown: "气色 (qì sè) - complexion",
    },
    {
      char: "气势",
      pinyin: "qì shì",
      meaning: "imposing manner",
      breakdown: "气势 (qì shì) - imposing manner",
    },
    {
      char: "气味",
      pinyin: "qì wèi",
      meaning: "odor",
      breakdown: "气味 (qì wèi) - odor",
    },
    {
      char: "气象",
      pinyin: "qì xiàng",
      meaning: "meteorological feature",
      breakdown: "气象 (qì xiàng) - meteorological feature",
    },
    {
      char: "气压",
      pinyin: "qì yā",
      meaning: "atmospheric pressure",
      breakdown: "气压 (qì yā) - atmospheric pressure",
    },
    {
      char: "迄今为止",
      pinyin: "qì jīn wéi zhǐ",
      meaning: "so far",
      breakdown: "迄今为止 (qì jīn wéi zhǐ) - so far",
    },
    {
      char: "掐",
      pinyin: "qiā",
      meaning: "to pick (flowers)",
      breakdown: "掐 (qiā) - to pick (flowers)",
    },
    {
      char: "恰当",
      pinyin: "qià dàng",
      meaning: "appropriate",
      breakdown: "恰当 (qià dàng) - appropriate",
    },
    {
      char: "恰到好处",
      pinyin: "qià dào hǎo chù",
      meaning: "it's just perfect",
      breakdown: "恰到好处 (qià dào hǎo chù) - it's just perfect",
    },
    {
      char: "恰巧",
      pinyin: "qià qiǎo",
      meaning: "fortunately",
      breakdown: "恰巧 (qià qiǎo) - fortunately",
    },
    {
      char: "洽谈",
      pinyin: "qià tán",
      meaning: "to discuss",
      breakdown: "洽谈 (qià tán) - to discuss",
    },
    {
      char: "牵扯",
      pinyin: "qiān chě",
      meaning: "to involve",
      breakdown: "牵扯 (qiān chě) - to involve",
    },
    {
      char: "牵制",
      pinyin: "qiān zhì",
      meaning: "to control",
      breakdown: "牵制 (qiān zhì) - to control",
    },
    {
      char: "千方百计",
      pinyin: "qiān fāng bǎi jì",
      meaning: "lit. thousand ways",
      breakdown: "千方百计 (qiān fāng bǎi jì) - lit. thousand ways",
    },
    {
      char: "签订",
      pinyin: "qiān dìng",
      meaning: "to agree to and sign (a treaty etc)",
      breakdown: "签订 (qiān dìng) - to agree to and sign (a treaty etc)",
    },
    {
      char: "签署",
      pinyin: "qiān shǔ",
      meaning: "to sign (an agreement)",
      breakdown: "签署 (qiān shǔ) - to sign (an agreement)",
    },
    {
      char: "迁就",
      pinyin: "qiān jiù",
      meaning: "to yield",
      breakdown: "迁就 (qiān jiù) - to yield",
    },
    {
      char: "迁徙",
      pinyin: "qiān xǐ",
      meaning: "to migrate",
      breakdown: "迁徙 (qiān xǐ) - to migrate",
    },
    {
      char: "谦逊",
      pinyin: "qiān xùn",
      meaning: "humble",
      breakdown: "谦逊 (qiān xùn) - humble",
    },
    {
      char: "前景",
      pinyin: "qián jǐng",
      meaning: "foreground",
      breakdown: "前景 (qián jǐng) - foreground",
    },
    {
      char: "前提",
      pinyin: "qián tí",
      meaning: "premise",
      breakdown: "前提 (qián tí) - premise",
    },
    {
      char: "潜力",
      pinyin: "qián lì",
      meaning: "potential",
      breakdown: "潜力 (qián lì) - potential",
    },
    {
      char: "潜水",
      pinyin: "qián shuǐ",
      meaning: "to dive",
      breakdown: "潜水 (qián shuǐ) - to dive",
    },
    {
      char: "潜移默化",
      pinyin: "qián yí mò huà",
      meaning: "imperceptible influence",
      breakdown: "潜移默化 (qián yí mò huà) - imperceptible influence",
    },
    {
      char: "谴责",
      pinyin: "qiǎn zé",
      meaning: "to denounce",
      breakdown: "谴责 (qiǎn zé) - to denounce",
    },
    {
      char: "强制",
      pinyin: "qiáng zhì",
      meaning: "to enforce",
      breakdown: "强制 (qiáng zhì) - to enforce",
    },
    {
      char: "抢劫",
      pinyin: "qiǎng jié",
      meaning: "to rob",
      breakdown: "抢劫 (qiǎng jié) - to rob",
    },
    {
      char: "抢救",
      pinyin: "qiǎng jiù",
      meaning: "rescue",
      breakdown: "抢救 (qiǎng jiù) - rescue",
    },
    {
      char: "强迫",
      pinyin: "qiǎng pò",
      meaning: "to compel",
      breakdown: "强迫 (qiǎng pò) - to compel",
    },
    {
      char: "桥梁",
      pinyin: "qiáo liáng",
      meaning: "bridge",
      breakdown: "桥梁 (qiáo liáng) - bridge",
    },
    {
      char: "翘",
      pinyin: "qiào",
      meaning: "to stick up",
      breakdown: "翘 (qiào) - to stick up",
    },
    {
      char: "锲而不舍",
      pinyin: "qiè ér bù shě",
      meaning:
        "to chip away at a task and not abandon it (idiom); to chisel away at sth",
      breakdown:
        "锲而不舍 (qiè ér bù shě) - to chip away at a task and not abandon it (idiom); to chisel away at sth",
    },
    {
      char: "切实",
      pinyin: "qiè shí",
      meaning: "feasible",
      breakdown: "切实 (qiè shí) - feasible",
    },
    {
      char: "亲热",
      pinyin: "qīn rè",
      meaning: "affectionate",
      breakdown: "亲热 (qīn rè) - affectionate",
    },
    {
      char: "亲身",
      pinyin: "qīn shēn",
      meaning: "personal",
      breakdown: "亲身 (qīn shēn) - personal",
    },
    {
      char: "侵犯",
      pinyin: "qīn fàn",
      meaning: "to infringe on",
      breakdown: "侵犯 (qīn fàn) - to infringe on",
    },
    {
      char: "钦佩",
      pinyin: "qīn pèi",
      meaning: "to admire",
      breakdown: "钦佩 (qīn pèi) - to admire",
    },
    {
      char: "勤俭",
      pinyin: "qín jiǎn",
      meaning: "hardworking and frugal",
      breakdown: "勤俭 (qín jiǎn) - hardworking and frugal",
    },
    {
      char: "勤恳",
      pinyin: "qín kěn",
      meaning: "diligent and attentive",
      breakdown: "勤恳 (qín kěn) - diligent and attentive",
    },
    {
      char: "氢",
      pinyin: "qīng",
      meaning: "hydrogen (chemistry)",
      breakdown: "氢 (qīng) - hydrogen (chemistry)",
    },
    {
      char: "轻而易举",
      pinyin: "qīng ér yì jǔ",
      meaning: "easy",
      breakdown: "轻而易举 (qīng ér yì jǔ) - easy",
    },
    {
      char: "清澈",
      pinyin: "qīng chè",
      meaning: "clear",
      breakdown: "清澈 (qīng chè) - clear",
    },
    {
      char: "清晨",
      pinyin: "qīng chén",
      meaning: "early morning",
      breakdown: "清晨 (qīng chén) - early morning",
    },
    {
      char: "清除",
      pinyin: "qīng chú",
      meaning: "to eliminate",
      breakdown: "清除 (qīng chú) - to eliminate",
    },
    {
      char: "清洁",
      pinyin: "qīng jié",
      meaning: "clean",
      breakdown: "清洁 (qīng jié) - clean",
    },
    {
      char: "清理",
      pinyin: "qīng lǐ",
      meaning: "to clear up",
      breakdown: "清理 (qīng lǐ) - to clear up",
    },
    {
      char: "清晰",
      pinyin: "qīng xī",
      meaning: "clear",
      breakdown: "清晰 (qīng xī) - clear",
    },
    {
      char: "清醒",
      pinyin: "qīng xǐng",
      meaning: "clear-headed",
      breakdown: "清醒 (qīng xǐng) - clear-headed",
    },
    {
      char: "清真",
      pinyin: "qīng zhēn",
      meaning: "Islamic",
      breakdown: "清真 (qīng zhēn) - Islamic",
    },
    {
      char: "倾听",
      pinyin: "qīng tīng",
      meaning: "to listen attentively",
      breakdown: "倾听 (qīng tīng) - to listen attentively",
    },
    {
      char: "倾向",
      pinyin: "qīng xiàng",
      meaning: "trend",
      breakdown: "倾向 (qīng xiàng) - trend",
    },
    {
      char: "倾斜",
      pinyin: "qīng xié",
      meaning: "to incline",
      breakdown: "倾斜 (qīng xié) - to incline",
    },
    {
      char: "晴朗",
      pinyin: "qíng lǎng",
      meaning: "sunny and cloudless",
      breakdown: "晴朗 (qíng lǎng) - sunny and cloudless",
    },
    {
      char: "情报",
      pinyin: "qíng bào",
      meaning: "(spy) intelligence",
      breakdown: "情报 (qíng bào) - (spy) intelligence",
    },
    {
      char: "情节",
      pinyin: "qíng jié",
      meaning: "plot",
      breakdown: "情节 (qíng jié) - plot",
    },
    {
      char: "情理",
      pinyin: "qíng lǐ",
      meaning: "reason",
      breakdown: "情理 (qíng lǐ) - reason",
    },
    {
      char: "情形",
      pinyin: "qíng xing",
      meaning: "circumstances",
      breakdown: "情形 (qíng xing) - circumstances",
    },
    {
      char: "请柬",
      pinyin: "qǐng jiǎn",
      meaning: "invitation card",
      breakdown: "请柬 (qǐng jiǎn) - invitation card",
    },
    {
      char: "请教",
      pinyin: "qǐng jiào",
      meaning: "to ask for guidance",
      breakdown: "请教 (qǐng jiào) - to ask for guidance",
    },
    {
      char: "请示",
      pinyin: "qǐng shì",
      meaning: "to ask for instructions",
      breakdown: "请示 (qǐng shì) - to ask for instructions",
    },
    {
      char: "请帖",
      pinyin: "qǐng tiě",
      meaning: "invitation card",
      breakdown: "请帖 (qǐng tiě) - invitation card",
    },
    {
      char: "丘陵",
      pinyin: "qiū líng",
      meaning: "hills",
      breakdown: "丘陵 (qiū líng) - hills",
    },
    {
      char: "区分",
      pinyin: "qū fēn",
      meaning: "to differentiate",
      breakdown: "区分 (qū fēn) - to differentiate",
    },
    {
      char: "区域",
      pinyin: "qū yù",
      meaning: "area",
      breakdown: "区域 (qū yù) - area",
    },
    {
      char: "屈服",
      pinyin: "qū fú",
      meaning: "to surrender",
      breakdown: "屈服 (qū fú) - to surrender",
    },
    {
      char: "曲折",
      pinyin: "qū zhé",
      meaning: "complicated",
      breakdown: "曲折 (qū zhé) - complicated",
    },
    {
      char: "驱逐",
      pinyin: "qū zhú",
      meaning: "to expel",
      breakdown: "驱逐 (qū zhú) - to expel",
    },
    {
      char: "渠道",
      pinyin: "qú dào",
      meaning: "irrigation ditch",
      breakdown: "渠道 (qú dào) - irrigation ditch",
    },
    {
      char: "取缔",
      pinyin: "qǔ dì",
      meaning: "to ban",
      breakdown: "取缔 (qǔ dì) - to ban",
    },
    {
      char: "曲子",
      pinyin: "qǔ zi",
      meaning: "poem for singing",
      breakdown: "曲子 (qǔ zi) - poem for singing",
    },
    {
      char: "趣味",
      pinyin: "qù wèi",
      meaning: "fun",
      breakdown: "趣味 (qù wèi) - fun",
    },
    {
      char: "圈套",
      pinyin: "quān tào",
      meaning: "trap",
      breakdown: "圈套 (quān tào) - trap",
    },
    {
      char: "全局",
      pinyin: "quán jú",
      meaning: "overall situation",
      breakdown: "全局 (quán jú) - overall situation",
    },
    {
      char: "全力以赴",
      pinyin: "quán lì yǐ fù",
      meaning: "to do at all costs",
      breakdown: "全力以赴 (quán lì yǐ fù) - to do at all costs",
    },
    {
      char: "权衡",
      pinyin: "quán héng",
      meaning: "to weigh",
      breakdown: "权衡 (quán héng) - to weigh",
    },
    {
      char: "权威",
      pinyin: "quán wēi",
      meaning: "authority",
      breakdown: "权威 (quán wēi) - authority",
    },
    {
      char: "权益",
      pinyin: "quán yì",
      meaning: "rights and benefits",
      breakdown: "权益 (quán yì) - rights and benefits",
    },
    {
      char: "拳头",
      pinyin: "quán tou",
      meaning: "fist",
      breakdown: "拳头 (quán tou) - fist",
    },
    {
      char: "犬",
      pinyin: "quǎn",
      meaning: "dog",
      breakdown: "犬 (quǎn) - dog",
    },
    {
      char: "缺口",
      pinyin: "quē kǒu",
      meaning: "nick",
      breakdown: "缺口 (quē kǒu) - nick",
    },
    {
      char: "缺席",
      pinyin: "quē xí",
      meaning: "absence",
      breakdown: "缺席 (quē xí) - absence",
    },
    {
      char: "缺陷",
      pinyin: "quē xiàn",
      meaning: "defect",
      breakdown: "缺陷 (quē xiàn) - defect",
    },
    {
      char: "瘸",
      pinyin: "qué",
      meaning: "lame",
      breakdown: "瘸 (qué) - lame",
    },
    {
      char: "确保",
      pinyin: "què bǎo",
      meaning: "to ensure",
      breakdown: "确保 (què bǎo) - to ensure",
    },
    {
      char: "确立",
      pinyin: "què lì",
      meaning: "to establish",
      breakdown: "确立 (què lì) - to establish",
    },
    {
      char: "确切",
      pinyin: "què qiè",
      meaning: "definite",
      breakdown: "确切 (què qiè) - definite",
    },
    {
      char: "确信",
      pinyin: "què xìn",
      meaning: "to be convinced",
      breakdown: "确信 (què xìn) - to be convinced",
    },
    {
      char: "群众",
      pinyin: "qún zhòng",
      meaning: "mass",
      breakdown: "群众 (qún zhòng) - mass",
    },
    {
      char: "染",
      pinyin: "rǎn",
      meaning: "to dye",
      breakdown: "染 (rǎn) - to dye",
    },
    {
      char: "让步",
      pinyin: "ràng bù",
      meaning: "to concede",
      breakdown: "让步 (ràng bù) - to concede",
    },
    {
      char: "饶恕",
      pinyin: "ráo shù",
      meaning: "to forgive",
      breakdown: "饶恕 (ráo shù) - to forgive",
    },
    {
      char: "扰乱",
      pinyin: "rǎo luàn",
      meaning: "to disturb",
      breakdown: "扰乱 (rǎo luàn) - to disturb",
    },
    {
      char: "惹祸",
      pinyin: "rě huò",
      meaning: "stirring up trouble",
      breakdown: "惹祸 (rě huò) - stirring up trouble",
    },
    {
      char: "热泪盈眶",
      pinyin: "rè lèi yíng kuàng",
      meaning: "eyes brimming with tears of excitement (idiom)",
      breakdown:
        "热泪盈眶 (rè lèi yíng kuàng) - eyes brimming with tears of excitement (idiom)",
    },
    {
      char: "热门",
      pinyin: "rè mén",
      meaning: "popular",
      breakdown: "热门 (rè mén) - popular",
    },
    {
      char: "人道",
      pinyin: "rén dào",
      meaning: "human sympathy",
      breakdown: "人道 (rén dào) - human sympathy",
    },
    {
      char: "人格",
      pinyin: "rén gé",
      meaning: "personality",
      breakdown: "人格 (rén gé) - personality",
    },
    {
      char: "人工",
      pinyin: "rén gōng",
      meaning: "artificial",
      breakdown: "人工 (rén gōng) - artificial",
    },
    {
      char: "人家",
      pinyin: "rén jia",
      meaning: "other people",
      breakdown: "人家 (rén jia) - other people",
    },
    {
      char: "人间",
      pinyin: "rén jiān",
      meaning: "the human world",
      breakdown: "人间 (rén jiān) - the human world",
    },
    {
      char: "人士",
      pinyin: "rén shì",
      meaning: "person",
      breakdown: "人士 (rén shì) - person",
    },
    {
      char: "人为",
      pinyin: "rén wéi",
      meaning: "artificial",
      breakdown: "人为 (rén wéi) - artificial",
    },
    {
      char: "人性",
      pinyin: "rén xìng",
      meaning: "human nature",
      breakdown: "人性 (rén xìng) - human nature",
    },
    {
      char: "人质",
      pinyin: "rén zhì",
      meaning: "hostage",
      breakdown: "人质 (rén zhì) - hostage",
    },
    {
      char: "仁慈",
      pinyin: "rén cí",
      meaning: "benevolent",
      breakdown: "仁慈 (rén cí) - benevolent",
    },
    {
      char: "忍耐",
      pinyin: "rěn nài",
      meaning: "to show restraint",
      breakdown: "忍耐 (rěn nài) - to show restraint",
    },
    {
      char: "忍受",
      pinyin: "rěn shòu",
      meaning: "to bear",
      breakdown: "忍受 (rěn shòu) - to bear",
    },
    {
      char: "认定",
      pinyin: "rèn dìng",
      meaning: "to maintain (that sth is true)",
      breakdown: "认定 (rèn dìng) - to maintain (that sth is true)",
    },
    {
      char: "认可",
      pinyin: "rèn kě",
      meaning: "to approve",
      breakdown: "认可 (rèn kě) - to approve",
    },
    {
      char: "任命",
      pinyin: "rèn mìng",
      meaning: "to appoint and nominate",
      breakdown: "任命 (rèn mìng) - to appoint and nominate",
    },
    {
      char: "任性",
      pinyin: "rèn xìng",
      meaning: "willful",
      breakdown: "任性 (rèn xìng) - willful",
    },
    {
      char: "任意",
      pinyin: "rèn yì",
      meaning: "arbitrary",
      breakdown: "任意 (rèn yì) - arbitrary",
    },
    {
      char: "任重道远",
      pinyin: "rèn zhòng dào yuǎn",
      meaning: "a heavy load and a long road",
      breakdown: "任重道远 (rèn zhòng dào yuǎn) - a heavy load and a long road",
    },
    {
      char: "仍旧",
      pinyin: "réng jiù",
      meaning: "still (remaining)",
      breakdown: "仍旧 (réng jiù) - still (remaining)",
    },
    {
      char: "日新月异",
      pinyin: "rì xīn yuè yì",
      meaning: "daily renewal",
      breakdown: "日新月异 (rì xīn yuè yì) - daily renewal",
    },
    {
      char: "日益",
      pinyin: "rì yì",
      meaning: "day by day",
      breakdown: "日益 (rì yì) - day by day",
    },
    {
      char: "融洽",
      pinyin: "róng qià",
      meaning: "harmonious",
      breakdown: "融洽 (róng qià) - harmonious",
    },
    {
      char: "溶解",
      pinyin: "róng jiě",
      meaning: "to dissolve",
      breakdown: "溶解 (róng jiě) - to dissolve",
    },
    {
      char: "容貌",
      pinyin: "róng mào",
      meaning: "one's appearance",
      breakdown: "容貌 (róng mào) - one's appearance",
    },
    {
      char: "容纳",
      pinyin: "róng nà",
      meaning: "to hold",
      breakdown: "容纳 (róng nà) - to hold",
    },
    {
      char: "容器",
      pinyin: "róng qì",
      meaning: "receptacle",
      breakdown: "容器 (róng qì) - receptacle",
    },
    {
      char: "容忍",
      pinyin: "róng rěn",
      meaning: "to put up with",
      breakdown: "容忍 (róng rěn) - to put up with",
    },
    {
      char: "揉",
      pinyin: "róu",
      meaning: "to knead",
      breakdown: "揉 (róu) - to knead",
    },
    {
      char: "柔和",
      pinyin: "róu hé",
      meaning: "gentle",
      breakdown: "柔和 (róu hé) - gentle",
    },
    {
      char: "弱点",
      pinyin: "ruò diǎn",
      meaning: "weak point",
      breakdown: "弱点 (ruò diǎn) - weak point",
    },
    {
      char: "若干",
      pinyin: "ruò gān",
      meaning: "a certain number or amount",
      breakdown: "若干 (ruò gān) - a certain number or amount",
    },
    {
      char: "撒谎",
      pinyin: "sā huǎng",
      meaning: "to tell lies",
      breakdown: "撒谎 (sā huǎng) - to tell lies",
    },
    {
      char: "腮",
      pinyin: "sāi",
      meaning: "cheek",
      breakdown: "腮 (sāi) - cheek",
    },
    {
      char: "三角",
      pinyin: "sān jiǎo",
      meaning: "triangle",
      breakdown: "三角 (sān jiǎo) - triangle",
    },
    {
      char: "散文",
      pinyin: "sǎn wén",
      meaning: "prose",
      breakdown: "散文 (sǎn wén) - prose",
    },
    {
      char: "散布",
      pinyin: "sàn bù",
      meaning: "to disseminate",
      breakdown: "散布 (sàn bù) - to disseminate",
    },
    {
      char: "散发",
      pinyin: "sàn fā",
      meaning: "to distribute",
      breakdown: "散发 (sàn fā) - to distribute",
    },
    {
      char: "丧失",
      pinyin: "sàng shī",
      meaning: "to lose",
      breakdown: "丧失 (sàng shī) - to lose",
    },
    {
      char: "嫂子",
      pinyin: "sǎo zi",
      meaning: "(informal) older brother's wife",
      breakdown: "嫂子 (sǎo zi) - (informal) older brother's wife",
    },
    {
      char: "色彩",
      pinyin: "sè cǎi",
      meaning: "tint",
      breakdown: "色彩 (sè cǎi) - tint",
    },
    {
      char: "刹车",
      pinyin: "shā chē",
      meaning: "to brake (when driving)",
      breakdown: "刹车 (shā chē) - to brake (when driving)",
    },
    {
      char: "啥",
      pinyin: "shá",
      meaning: "dialectal equivalent of 什麼|什么[shén me]",
      breakdown: "啥 (shá) - dialectal equivalent of 什麼|什么[shén me]",
    },
    {
      char: "筛选",
      pinyin: "shāi xuǎn",
      meaning: "to filter",
      breakdown: "筛选 (shāi xuǎn) - to filter",
    },
    {
      char: "山脉",
      pinyin: "shān mài",
      meaning: "mountain range",
      breakdown: "山脉 (shān mài) - mountain range",
    },
    {
      char: "闪烁",
      pinyin: "shǎn shuò",
      meaning: "flickering",
      breakdown: "闪烁 (shǎn shuò) - flickering",
    },
    {
      char: "擅长",
      pinyin: "shàn cháng",
      meaning: "to be good at",
      breakdown: "擅长 (shàn cháng) - to be good at",
    },
    {
      char: "擅自",
      pinyin: "shàn zì",
      meaning: "without permission",
      breakdown: "擅自 (shàn zì) - without permission",
    },
    {
      char: "商标",
      pinyin: "shāng biāo",
      meaning: "trademark",
      breakdown: "商标 (shāng biāo) - trademark",
    },
    {
      char: "伤脑筋",
      pinyin: "shāng nǎo jīn",
      meaning: "knotty",
      breakdown: "伤脑筋 (shāng nǎo jīn) - knotty",
    },
    {
      char: "上级",
      pinyin: "shàng jí",
      meaning: "higher authorities",
      breakdown: "上级 (shàng jí) - higher authorities",
    },
    {
      char: "上进心",
      pinyin: "shàng jìn xīn",
      meaning: "motivation",
      breakdown: "上进心 (shàng jìn xīn) - motivation",
    },
    {
      char: "上任",
      pinyin: "shàng rèn",
      meaning: "to take office",
      breakdown: "上任 (shàng rèn) - to take office",
    },
    {
      char: "上瘾",
      pinyin: "shàng yǐn",
      meaning: "to get into a habit",
      breakdown: "上瘾 (shàng yǐn) - to get into a habit",
    },
    {
      char: "上游",
      pinyin: "shàng yóu",
      meaning: "upper reaches (of a river)",
      breakdown: "上游 (shàng yóu) - upper reaches (of a river)",
    },
    {
      char: "捎",
      pinyin: "shāo",
      meaning: "to bring sth to sb",
      breakdown: "捎 (shāo) - to bring sth to sb",
    },
    {
      char: "梢",
      pinyin: "shāo",
      meaning: "tip of branch",
      breakdown: "梢 (shāo) - tip of branch",
    },
    {
      char: "哨",
      pinyin: "shào",
      meaning: "a whistle",
      breakdown: "哨 (shào) - a whistle",
    },
    {
      char: "奢侈",
      pinyin: "shē chǐ",
      meaning: "luxurious",
      breakdown: "奢侈 (shē chǐ) - luxurious",
    },
    {
      char: "设立",
      pinyin: "shè lì",
      meaning: "to set up",
      breakdown: "设立 (shè lì) - to set up",
    },
    {
      char: "设想",
      pinyin: "shè xiǎng",
      meaning: "to imagine",
      breakdown: "设想 (shè xiǎng) - to imagine",
    },
    {
      char: "设置",
      pinyin: "shè zhì",
      meaning: "to set up",
      breakdown: "设置 (shè zhì) - to set up",
    },
    {
      char: "社区",
      pinyin: "shè qū",
      meaning: "community",
      breakdown: "社区 (shè qū) - community",
    },
    {
      char: "涉及",
      pinyin: "shè jí",
      meaning: "to involve",
      breakdown: "涉及 (shè jí) - to involve",
    },
    {
      char: "摄取",
      pinyin: "shè qǔ",
      meaning: "absorb (nutrition)",
      breakdown: "摄取 (shè qǔ) - absorb (nutrition)",
    },
    {
      char: "摄氏度",
      pinyin: "shè shì dù",
      meaning: "degrees centigrade",
      breakdown: "摄氏度 (shè shì dù) - degrees centigrade",
    },
    {
      char: "深奥",
      pinyin: "shēn ào",
      meaning: "profound",
      breakdown: "深奥 (shēn ào) - profound",
    },
    {
      char: "深沉",
      pinyin: "shēn chén",
      meaning: "deep",
      breakdown: "深沉 (shēn chén) - deep",
    },
    {
      char: "深情厚谊",
      pinyin: "shēn qíng hòu yì",
      meaning: "deep friendship",
      breakdown: "深情厚谊 (shēn qíng hòu yì) - deep friendship",
    },
    {
      char: "申报",
      pinyin: "shēn bào",
      meaning: "to report (to the authorities)",
      breakdown: "申报 (shēn bào) - to report (to the authorities)",
    },
    {
      char: "绅士",
      pinyin: "shēn shì",
      meaning: "gentleman",
      breakdown: "绅士 (shēn shì) - gentleman",
    },
    {
      char: "呻吟",
      pinyin: "shēn yín",
      meaning: "to moan",
      breakdown: "呻吟 (shēn yín) - to moan",
    },
    {
      char: "神奇",
      pinyin: "shén qí",
      meaning: "magical",
      breakdown: "神奇 (shén qí) - magical",
    },
    {
      char: "神气",
      pinyin: "shén qì",
      meaning: "expression",
      breakdown: "神气 (shén qì) - expression",
    },
    {
      char: "神情",
      pinyin: "shén qíng",
      meaning: "look",
      breakdown: "神情 (shén qíng) - look",
    },
    {
      char: "神色",
      pinyin: "shén sè",
      meaning: "expression",
      breakdown: "神色 (shén sè) - expression",
    },
    {
      char: "神圣",
      pinyin: "shén shèng",
      meaning: "divine",
      breakdown: "神圣 (shén shèng) - divine",
    },
    {
      char: "神态",
      pinyin: "shén tài",
      meaning: "appearance",
      breakdown: "神态 (shén tài) - appearance",
    },
    {
      char: "神仙",
      pinyin: "shén xiān",
      meaning: "Daoist immortal",
      breakdown: "神仙 (shén xiān) - Daoist immortal",
    },
    {
      char: "审查",
      pinyin: "shěn chá",
      meaning: "to examine",
      breakdown: "审查 (shěn chá) - to examine",
    },
    {
      char: "审理",
      pinyin: "shěn lǐ",
      meaning: "to hear (a case)",
      breakdown: "审理 (shěn lǐ) - to hear (a case)",
    },
    {
      char: "审美",
      pinyin: "shěn měi",
      meaning: "esthetics",
      breakdown: "审美 (shěn měi) - esthetics",
    },
    {
      char: "审判",
      pinyin: "shěn pàn",
      meaning: "a trial",
      breakdown: "审判 (shěn pàn) - a trial",
    },
    {
      char: "渗透",
      pinyin: "shèn tòu",
      meaning: "to permeate",
      breakdown: "渗透 (shèn tòu) - to permeate",
    },
    {
      char: "慎重",
      pinyin: "shèn zhòng",
      meaning: "cautious",
      breakdown: "慎重 (shèn zhòng) - cautious",
    },
    {
      char: "生存",
      pinyin: "shēng cún",
      meaning: "to exist",
      breakdown: "生存 (shēng cún) - to exist",
    },
    {
      char: "生机",
      pinyin: "shēng jī",
      meaning: "opportunity to live",
      breakdown: "生机 (shēng jī) - opportunity to live",
    },
    {
      char: "生理",
      pinyin: "shēng lǐ",
      meaning: "physiology",
      breakdown: "生理 (shēng lǐ) - physiology",
    },
    {
      char: "生疏",
      pinyin: "shēng shū",
      meaning: "unfamiliar",
      breakdown: "生疏 (shēng shū) - unfamiliar",
    },
    {
      char: "生态",
      pinyin: "shēng tài",
      meaning: "way of life",
      breakdown: "生态 (shēng tài) - way of life",
    },
    {
      char: "生物",
      pinyin: "shēng wù",
      meaning: "organism",
      breakdown: "生物 (shēng wù) - organism",
    },
    {
      char: "生效",
      pinyin: "shēng xiào",
      meaning: "to take effect",
      breakdown: "生效 (shēng xiào) - to take effect",
    },
    {
      char: "生锈",
      pinyin: "shēng xiù",
      meaning: "to rust",
      breakdown: "生锈 (shēng xiù) - to rust",
    },
    {
      char: "生育",
      pinyin: "shēng yù",
      meaning: "to bear",
      breakdown: "生育 (shēng yù) - to bear",
    },
    {
      char: "牲畜",
      pinyin: "shēng chù",
      meaning: "domesticated animals",
      breakdown: "牲畜 (shēng chù) - domesticated animals",
    },
    {
      char: "声明",
      pinyin: "shēng míng",
      meaning: "statement",
      breakdown: "声明 (shēng míng) - statement",
    },
    {
      char: "声势",
      pinyin: "shēng shì",
      meaning: "fame and power",
      breakdown: "声势 (shēng shì) - fame and power",
    },
    {
      char: "声誉",
      pinyin: "shēng yù",
      meaning: "reputation",
      breakdown: "声誉 (shēng yù) - reputation",
    },
    {
      char: "省会",
      pinyin: "shěng huì",
      meaning: "provincial capital",
      breakdown: "省会 (shěng huì) - provincial capital",
    },
    {
      char: "盛产",
      pinyin: "shèng chǎn",
      meaning: "superabundant",
      breakdown: "盛产 (shèng chǎn) - superabundant",
    },
    {
      char: "盛开",
      pinyin: "shèng kāi",
      meaning: "blooming",
      breakdown: "盛开 (shèng kāi) - blooming",
    },
    {
      char: "盛情",
      pinyin: "shèng qíng",
      meaning: "great kindness",
      breakdown: "盛情 (shèng qíng) - great kindness",
    },
    {
      char: "盛行",
      pinyin: "shèng xíng",
      meaning: "to be in vogue",
      breakdown: "盛行 (shèng xíng) - to be in vogue",
    },
    {
      char: "胜负",
      pinyin: "shèng fù",
      meaning: "victory or defeat",
      breakdown: "胜负 (shèng fù) - victory or defeat",
    },
    {
      char: "失误",
      pinyin: "shī wù",
      meaning: "lapse",
      breakdown: "失误 (shī wù) - lapse",
    },
    {
      char: "失踪",
      pinyin: "shī zōng",
      meaning: "to be missing",
      breakdown: "失踪 (shī zōng) - to be missing",
    },
    {
      char: "师范",
      pinyin: "shī fàn",
      meaning: "teacher-training",
      breakdown: "师范 (shī fàn) - teacher-training",
    },
    {
      char: "施加",
      pinyin: "shī jiā",
      meaning: "to exert (effort or pressure)",
      breakdown: "施加 (shī jiā) - to exert (effort or pressure)",
    },
    {
      char: "施展",
      pinyin: "shī zhǎn",
      meaning: "to use fully",
      breakdown: "施展 (shī zhǎn) - to use fully",
    },
    {
      char: "尸体",
      pinyin: "shī tǐ",
      meaning: "dead body",
      breakdown: "尸体 (shī tǐ) - dead body",
    },
    {
      char: "拾",
      pinyin: "shí",
      meaning: "to pick up",
      breakdown: "拾 (shí) - to pick up",
    },
    {
      char: "十足",
      pinyin: "shí zú",
      meaning: "ample",
      breakdown: "十足 (shí zú) - ample",
    },
    {
      char: "识别",
      pinyin: "shí bié",
      meaning: "to distinguish",
      breakdown: "识别 (shí bié) - to distinguish",
    },
    {
      char: "时差",
      pinyin: "shí chā",
      meaning: "time difference",
      breakdown: "时差 (shí chā) - time difference",
    },
    {
      char: "时常",
      pinyin: "shí cháng",
      meaning: "often",
      breakdown: "时常 (shí cháng) - often",
    },
    {
      char: "时而",
      pinyin: "shí ér",
      meaning: "occasionally",
      breakdown: "时而 (shí ér) - occasionally",
    },
    {
      char: "时光",
      pinyin: "shí guāng",
      meaning: "time",
      breakdown: "时光 (shí guāng) - time",
    },
    {
      char: "时机",
      pinyin: "shí jī",
      meaning: "fortunate timing",
      breakdown: "时机 (shí jī) - fortunate timing",
    },
    {
      char: "时事",
      pinyin: "shí shì",
      meaning: "current trends",
      breakdown: "时事 (shí shì) - current trends",
    },
    {
      char: "时装",
      pinyin: "shí zhuāng",
      meaning: "the latest fashion in clothes",
      breakdown: "时装 (shí zhuāng) - the latest fashion in clothes",
    },
    {
      char: "实惠",
      pinyin: "shí huì",
      meaning: "tangible benefit",
      breakdown: "实惠 (shí huì) - tangible benefit",
    },
    {
      char: "实力",
      pinyin: "shí lì",
      meaning: "strength",
      breakdown: "实力 (shí lì) - strength",
    },
    {
      char: "实施",
      pinyin: "shí shī",
      meaning: "to implement",
      breakdown: "实施 (shí shī) - to implement",
    },
    {
      char: "实事求是",
      pinyin: "shí shì qiú shì",
      meaning: "to seek truth from facts (idiom)",
      breakdown:
        "实事求是 (shí shì qiú shì) - to seek truth from facts (idiom)",
    },
    {
      char: "实质",
      pinyin: "shí zhì",
      meaning: "substance",
      breakdown: "实质 (shí zhì) - substance",
    },
    {
      char: "石油",
      pinyin: "shí yóu",
      meaning: "oil",
      breakdown: "石油 (shí yóu) - oil",
    },
    {
      char: "使命",
      pinyin: "shǐ mìng",
      meaning: "mission (diplomatic or other)",
      breakdown: "使命 (shǐ mìng) - mission (diplomatic or other)",
    },
    {
      char: "是非",
      pinyin: "shì fēi",
      meaning: "right and wrong",
      breakdown: "是非 (shì fēi) - right and wrong",
    },
    {
      char: "试图",
      pinyin: "shì tú",
      meaning: "to attempt",
      breakdown: "试图 (shì tú) - to attempt",
    },
    {
      char: "试验",
      pinyin: "shì yàn",
      meaning: "experiment",
      breakdown: "试验 (shì yàn) - experiment",
    },
    {
      char: "势必",
      pinyin: "shì bì",
      meaning: "to be bound to",
      breakdown: "势必 (shì bì) - to be bound to",
    },
    {
      char: "势力",
      pinyin: "shì li",
      meaning: "power",
      breakdown: "势力 (shì li) - power",
    },
    {
      char: "世代",
      pinyin: "shì dài",
      meaning: "generation",
      breakdown: "世代 (shì dài) - generation",
    },
    {
      char: "世界观",
      pinyin: "shì jiè guān",
      meaning: "worldview",
      breakdown: "世界观 (shì jiè guān) - worldview",
    },
    {
      char: "示范",
      pinyin: "shì fàn",
      meaning: "to demonstrate",
      breakdown: "示范 (shì fàn) - to demonstrate",
    },
    {
      char: "示威",
      pinyin: "shì wēi",
      meaning: "to demonstrate (as a protest)",
      breakdown: "示威 (shì wēi) - to demonstrate (as a protest)",
    },
    {
      char: "示意",
      pinyin: "shì yì",
      meaning: "to hint",
      breakdown: "示意 (shì yì) - to hint",
    },
    {
      char: "释放",
      pinyin: "shì fàng",
      meaning: "to release",
      breakdown: "释放 (shì fàng) - to release",
    },
    {
      char: "事故",
      pinyin: "shì gù",
      meaning: "accident",
      breakdown: "事故 (shì gù) - accident",
    },
    {
      char: "事迹",
      pinyin: "shì jì",
      meaning: "deed",
      breakdown: "事迹 (shì jì) - deed",
    },
    {
      char: "事件",
      pinyin: "shì jiàn",
      meaning: "event",
      breakdown: "事件 (shì jiàn) - event",
    },
    {
      char: "事态",
      pinyin: "shì tài",
      meaning: "situation",
      breakdown: "事态 (shì tài) - situation",
    },
    {
      char: "事务",
      pinyin: "shì wù",
      meaning: "(political)",
      breakdown: "事务 (shì wù) - (political)",
    },
    {
      char: "事项",
      pinyin: "shì xiàng",
      meaning: "matter",
      breakdown: "事项 (shì xiàng) - matter",
    },
    {
      char: "事业",
      pinyin: "shì yè",
      meaning: "undertaking",
      breakdown: "事业 (shì yè) - undertaking",
    },
    {
      char: "适宜",
      pinyin: "shì yí",
      meaning: "suitable",
      breakdown: "适宜 (shì yí) - suitable",
    },
    {
      char: "视力",
      pinyin: "shì lì",
      meaning: "vision",
      breakdown: "视力 (shì lì) - vision",
    },
    {
      char: "视线",
      pinyin: "shì xiàn",
      meaning: "line of sight",
      breakdown: "视线 (shì xiàn) - line of sight",
    },
    {
      char: "视野",
      pinyin: "shì yě",
      meaning: "field of view",
      breakdown: "视野 (shì yě) - field of view",
    },
    {
      char: "逝世",
      pinyin: "shì shì",
      meaning: "to pass away",
      breakdown: "逝世 (shì shì) - to pass away",
    },
    {
      char: "收藏",
      pinyin: "shōu cáng",
      meaning: "to hoard",
      breakdown: "收藏 (shōu cáng) - to hoard",
    },
    {
      char: "收缩",
      pinyin: "shōu suō",
      meaning: "to pull back",
      breakdown: "收缩 (shōu suō) - to pull back",
    },
    {
      char: "收益",
      pinyin: "shōu yì",
      meaning: "earnings",
      breakdown: "收益 (shōu yì) - earnings",
    },
    {
      char: "收音机",
      pinyin: "shōu yīn jī",
      meaning: "radio",
      breakdown: "收音机 (shōu yīn jī) - radio",
    },
    {
      char: "手法",
      pinyin: "shǒu fǎ",
      meaning: "technique",
      breakdown: "手法 (shǒu fǎ) - technique",
    },
    {
      char: "手势",
      pinyin: "shǒu shì",
      meaning: "gesture",
      breakdown: "手势 (shǒu shì) - gesture",
    },
    {
      char: "手艺",
      pinyin: "shǒu yì",
      meaning: "craftmanship",
      breakdown: "手艺 (shǒu yì) - craftmanship",
    },
    {
      char: "首要",
      pinyin: "shǒu yào",
      meaning: "the most important",
      breakdown: "首要 (shǒu yào) - the most important",
    },
    {
      char: "守护",
      pinyin: "shǒu hù",
      meaning: "to guard",
      breakdown: "守护 (shǒu hù) - to guard",
    },
    {
      char: "受罪",
      pinyin: "shòu zuì",
      meaning: "to endure",
      breakdown: "受罪 (shòu zuì) - to endure",
    },
    {
      char: "授予",
      pinyin: "shòu yǔ",
      meaning: "to award",
      breakdown: "授予 (shòu yǔ) - to award",
    },
    {
      char: "书法",
      pinyin: "shū fǎ",
      meaning: "calligraphy",
      breakdown: "书法 (shū fǎ) - calligraphy",
    },
    {
      char: "书籍",
      pinyin: "shū jí",
      meaning: "books",
      breakdown: "书籍 (shū jí) - books",
    },
    {
      char: "书记",
      pinyin: "shū ji",
      meaning: "secretary",
      breakdown: "书记 (shū ji) - secretary",
    },
    {
      char: "书面",
      pinyin: "shū miàn",
      meaning: "in writing",
      breakdown: "书面 (shū miàn) - in writing",
    },
    {
      char: "舒畅",
      pinyin: "shū chàng",
      meaning: "happy",
      breakdown: "舒畅 (shū chàng) - happy",
    },
    {
      char: "疏忽",
      pinyin: "shū hu",
      meaning: "to neglect",
      breakdown: "疏忽 (shū hu) - to neglect",
    },
    {
      char: "数",
      pinyin: "shǔ",
      meaning: "to count",
      breakdown: "数 (shǔ) - to count",
    },
    {
      char: "竖",
      pinyin: "shù",
      meaning: "to erect",
      breakdown: "竖 (shù) - to erect",
    },
    {
      char: "束",
      pinyin: "shù",
      meaning: "to bind",
      breakdown: "束 (shù) - to bind",
    },
    {
      char: "束缚",
      pinyin: "shù fù",
      meaning: "to bind",
      breakdown: "束缚 (shù fù) - to bind",
    },
    {
      char: "树立",
      pinyin: "shù lì",
      meaning: "to set up",
      breakdown: "树立 (shù lì) - to set up",
    },
    {
      char: "数额",
      pinyin: "shù é",
      meaning: "amount",
      breakdown: "数额 (shù é) - amount",
    },
    {
      char: "数目",
      pinyin: "shù mù",
      meaning: "amount",
      breakdown: "数目 (shù mù) - amount",
    },
    {
      char: "耍",
      pinyin: "shuǎ",
      meaning: "to play with",
      breakdown: "耍 (shuǎ) - to play with",
    },
    {
      char: "衰老",
      pinyin: "shuāi lǎo",
      meaning: "to age",
      breakdown: "衰老 (shuāi lǎo) - to age",
    },
    {
      char: "衰退",
      pinyin: "shuāi tuì",
      meaning: "to decline",
      breakdown: "衰退 (shuāi tuì) - to decline",
    },
    {
      char: "率领",
      pinyin: "shuài lǐng",
      meaning: "to lead",
      breakdown: "率领 (shuài lǐng) - to lead",
    },
    {
      char: "涮",
      pinyin: "shuàn",
      meaning: "to rinse",
      breakdown: "涮 (shuàn) - to rinse",
    },
    {
      char: "双胞胎",
      pinyin: "shuāng bāo tāi",
      meaning: "twin",
      breakdown: "双胞胎 (shuāng bāo tāi) - twin",
    },
    {
      char: "爽快",
      pinyin: "shuǎng kuai",
      meaning: "refreshed",
      breakdown: "爽快 (shuǎng kuai) - refreshed",
    },
    {
      char: "水利",
      pinyin: "shuǐ lì",
      meaning: "water conservancy",
      breakdown: "水利 (shuǐ lì) - water conservancy",
    },
    {
      char: "水龙头",
      pinyin: "shuǐ lóng tóu",
      meaning: "faucet",
      breakdown: "水龙头 (shuǐ lóng tóu) - faucet",
    },
    {
      char: "水泥",
      pinyin: "shuǐ ní",
      meaning: "cement",
      breakdown: "水泥 (shuǐ ní) - cement",
    },
    {
      char: "司法",
      pinyin: "sī fǎ",
      meaning: "judicial",
      breakdown: "司法 (sī fǎ) - judicial",
    },
    {
      char: "司令",
      pinyin: "sī lìng",
      meaning: "commanding officer",
      breakdown: "司令 (sī lìng) - commanding officer",
    },
    {
      char: "思念",
      pinyin: "sī niàn",
      meaning: "to think of",
      breakdown: "思念 (sī niàn) - to think of",
    },
    {
      char: "思索",
      pinyin: "sī suǒ",
      meaning: "to think deeply",
      breakdown: "思索 (sī suǒ) - to think deeply",
    },
    {
      char: "思维",
      pinyin: "sī wéi",
      meaning: "(line of) thought",
      breakdown: "思维 (sī wéi) - (line of) thought",
    },
    {
      char: "思绪",
      pinyin: "sī xù",
      meaning: "train of thought",
      breakdown: "思绪 (sī xù) - train of thought",
    },
    {
      char: "私自",
      pinyin: "sī zì",
      meaning: "private",
      breakdown: "私自 (sī zì) - private",
    },
    {
      char: "斯文",
      pinyin: "sī wén",
      meaning: "refined",
      breakdown: "斯文 (sī wén) - refined",
    },
    {
      char: "死亡",
      pinyin: "sǐ wáng",
      meaning: "to die",
      breakdown: "死亡 (sǐ wáng) - to die",
    },
    {
      char: "四肢",
      pinyin: "sì zhī",
      meaning: "the four limbs of the body",
      breakdown: "四肢 (sì zhī) - the four limbs of the body",
    },
    {
      char: "肆无忌惮",
      pinyin: "sì wú jì dàn",
      meaning: "absolutely unrestrained",
      breakdown: "肆无忌惮 (sì wú jì dàn) - absolutely unrestrained",
    },
    {
      char: "饲养",
      pinyin: "sì yǎng",
      meaning: "to raise",
      breakdown: "饲养 (sì yǎng) - to raise",
    },
    {
      char: "耸",
      pinyin: "sǒng",
      meaning: "to excite",
      breakdown: "耸 (sǒng) - to excite",
    },
    {
      char: "艘",
      pinyin: "sōu",
      meaning: "classifier for ships",
      breakdown: "艘 (sōu) - classifier for ships",
    },
    {
      char: "搜索",
      pinyin: "sōu suǒ",
      meaning: "to search",
      breakdown: "搜索 (sōu suǒ) - to search",
    },
    {
      char: "苏醒",
      pinyin: "sū xǐng",
      meaning: "to wake up",
      breakdown: "苏醒 (sū xǐng) - to wake up",
    },
    {
      char: "俗话",
      pinyin: "sú huà",
      meaning: "common saying",
      breakdown: "俗话 (sú huà) - common saying",
    },
    {
      char: "塑造",
      pinyin: "sù zào",
      meaning: "to model",
      breakdown: "塑造 (sù zào) - to model",
    },
    {
      char: "素食",
      pinyin: "sù shí",
      meaning: "vegetables",
      breakdown: "素食 (sù shí) - vegetables",
    },
    {
      char: "素质",
      pinyin: "sù zhì",
      meaning: "inner quality",
      breakdown: "素质 (sù zhì) - inner quality",
    },
    {
      char: "诉讼",
      pinyin: "sù sòng",
      meaning: "lawsuit",
      breakdown: "诉讼 (sù sòng) - lawsuit",
    },
    {
      char: "算了",
      pinyin: "suàn le",
      meaning: "let it be",
      breakdown: "算了 (suàn le) - let it be",
    },
    {
      char: "算数",
      pinyin: "suàn shù",
      meaning: "to count numbers",
      breakdown: "算数 (suàn shù) - to count numbers",
    },
    {
      char: "随即",
      pinyin: "suí jí",
      meaning: "immediately",
      breakdown: "随即 (suí jí) - immediately",
    },
    {
      char: "随身",
      pinyin: "suí shēn",
      meaning: "to (carry) on one's person",
      breakdown: "随身 (suí shēn) - to (carry) on one's person",
    },
    {
      char: "随手",
      pinyin: "suí shǒu",
      meaning: "conveniently",
      breakdown: "随手 (suí shǒu) - conveniently",
    },
    {
      char: "随意",
      pinyin: "suí yì",
      meaning: "as one wishes",
      breakdown: "随意 (suí yì) - as one wishes",
    },
    {
      char: "岁月",
      pinyin: "suì yuè",
      meaning: "years",
      breakdown: "岁月 (suì yuè) - years",
    },
    {
      char: "隧道",
      pinyin: "suì dào",
      meaning: "tunnel",
      breakdown: "隧道 (suì dào) - tunnel",
    },
    {
      char: "损坏",
      pinyin: "sǔn huài",
      meaning: "to damage",
      breakdown: "损坏 (sǔn huài) - to damage",
    },
    {
      char: "索赔",
      pinyin: "suǒ péi",
      meaning: "to ask for compensation",
      breakdown: "索赔 (suǒ péi) - to ask for compensation",
    },
    {
      char: "索性",
      pinyin: "suǒ xìng",
      meaning: "you might as well (do it)",
      breakdown: "索性 (suǒ xìng) - you might as well (do it)",
    },
    {
      char: "塌",
      pinyin: "tā",
      meaning: "collapse",
      breakdown: "塌 (tā) - collapse",
    },
    {
      char: "踏实",
      pinyin: "tā shi",
      meaning: "practical",
      breakdown: "踏实 (tā shi) - practical",
    },
    {
      char: "台风",
      pinyin: "tái fēng",
      meaning: "hurricane",
      breakdown: "台风 (tái fēng) - hurricane",
    },
    {
      char: "太空",
      pinyin: "tài kōng",
      meaning: "outer space",
      breakdown: "太空 (tài kōng) - outer space",
    },
    {
      char: "泰斗",
      pinyin: "tài dǒu",
      meaning: "leading scholar of his time",
      breakdown: "泰斗 (tài dǒu) - leading scholar of his time",
    },
    {
      char: "瘫痪",
      pinyin: "tān huàn",
      meaning: "paralysis",
      breakdown: "瘫痪 (tān huàn) - paralysis",
    },
    {
      char: "贪婪",
      pinyin: "tān lán",
      meaning: "avaricious",
      breakdown: "贪婪 (tān lán) - avaricious",
    },
    {
      char: "贪污",
      pinyin: "tān wū",
      meaning: "corruption",
      breakdown: "贪污 (tān wū) - corruption",
    },
    {
      char: "摊儿",
      pinyin: "tān r",
      meaning: "erhua variant of 攤|摊[tān]",
      breakdown: "摊儿 (tān r) - erhua variant of 攤|摊[tān]",
    },
    {
      char: "弹性",
      pinyin: "tán xìng",
      meaning: "flexibility",
      breakdown: "弹性 (tán xìng) - flexibility",
    },
    {
      char: "坦白",
      pinyin: "tǎn bái",
      meaning: "honest",
      breakdown: "坦白 (tǎn bái) - honest",
    },
    {
      char: "探测",
      pinyin: "tàn cè",
      meaning: "to probe",
      breakdown: "探测 (tàn cè) - to probe",
    },
    {
      char: "探索",
      pinyin: "tàn suǒ",
      meaning: "to explore",
      breakdown: "探索 (tàn suǒ) - to explore",
    },
    {
      char: "探讨",
      pinyin: "tàn tǎo",
      meaning: "to investigate",
      breakdown: "探讨 (tàn tǎo) - to investigate",
    },
    {
      char: "探望",
      pinyin: "tàn wàng",
      meaning: "to visit",
      breakdown: "探望 (tàn wàng) - to visit",
    },
    {
      char: "叹气",
      pinyin: "tàn qì",
      meaning: "to sigh",
      breakdown: "叹气 (tàn qì) - to sigh",
    },
    {
      char: "糖葫芦",
      pinyin: "táng hú lu",
      meaning: "sugar-coated Chinese hawthorn fruit on a stick",
      breakdown:
        "糖葫芦 (táng hú lu) - sugar-coated Chinese hawthorn fruit on a stick",
    },
    {
      char: "倘若",
      pinyin: "tǎng ruò",
      meaning: "provided that",
      breakdown: "倘若 (tǎng ruò) - provided that",
    },
    {
      char: "掏",
      pinyin: "tāo",
      meaning: "variant of 掏[tāo]",
      breakdown: "掏 (tāo) - variant of 掏[tāo]",
    },
    {
      char: "滔滔不绝",
      pinyin: "tāo tāo bù jué",
      meaning: "unceasing torrent (idiom)",
      breakdown: "滔滔不绝 (tāo tāo bù jué) - unceasing torrent (idiom)",
    },
    {
      char: "陶瓷",
      pinyin: "táo cí",
      meaning: "pottery and porcelain",
      breakdown: "陶瓷 (táo cí) - pottery and porcelain",
    },
    {
      char: "淘气",
      pinyin: "táo qì",
      meaning: "naughty",
      breakdown: "淘气 (táo qì) - naughty",
    },
    {
      char: "淘汰",
      pinyin: "táo tài",
      meaning: "to wash out",
      breakdown: "淘汰 (táo tài) - to wash out",
    },
    {
      char: "讨价还价",
      pinyin: "tǎo jià huán jià",
      meaning: "to haggle over price",
      breakdown: "讨价还价 (tǎo jià huán jià) - to haggle over price",
    },
    {
      char: "特长",
      pinyin: "tè cháng",
      meaning: "personal strength",
      breakdown: "特长 (tè cháng) - personal strength",
    },
    {
      char: "特定",
      pinyin: "tè dìng",
      meaning: "special",
      breakdown: "特定 (tè dìng) - special",
    },
    {
      char: "特色",
      pinyin: "tè sè",
      meaning: "characteristic",
      breakdown: "特色 (tè sè) - characteristic",
    },
    {
      char: "提拔",
      pinyin: "tí bá",
      meaning: "to promote to a higher job",
      breakdown: "提拔 (tí bá) - to promote to a higher job",
    },
    {
      char: "提炼",
      pinyin: "tí liàn",
      meaning: "to extract (ore)",
      breakdown: "提炼 (tí liàn) - to extract (ore)",
    },
    {
      char: "提示",
      pinyin: "tí shì",
      meaning: "to prompt",
      breakdown: "提示 (tí shì) - to prompt",
    },
    {
      char: "提议",
      pinyin: "tí yì",
      meaning: "proposal",
      breakdown: "提议 (tí yì) - proposal",
    },
    {
      char: "题材",
      pinyin: "tí cái",
      meaning: "subject matter",
      breakdown: "题材 (tí cái) - subject matter",
    },
    {
      char: "体谅",
      pinyin: "tǐ liàng",
      meaning: "to empathize",
      breakdown: "体谅 (tǐ liàng) - to empathize",
    },
    {
      char: "体面",
      pinyin: "tǐ miàn",
      meaning: "dignity",
      breakdown: "体面 (tǐ miàn) - dignity",
    },
    {
      char: "体系",
      pinyin: "tǐ xì",
      meaning: "system",
      breakdown: "体系 (tǐ xì) - system",
    },
    {
      char: "天才",
      pinyin: "tiān cái",
      meaning: "talent",
      breakdown: "天才 (tiān cái) - talent",
    },
    {
      char: "天伦之乐",
      pinyin: "tiān lún zhī lè",
      meaning: "family love and joy",
      breakdown: "天伦之乐 (tiān lún zhī lè) - family love and joy",
    },
    {
      char: "天然气",
      pinyin: "tiān rán qì",
      meaning: "natural gas",
      breakdown: "天然气 (tiān rán qì) - natural gas",
    },
    {
      char: "天生",
      pinyin: "tiān shēng",
      meaning: "nature",
      breakdown: "天生 (tiān shēng) - nature",
    },
    {
      char: "天堂",
      pinyin: "tiān táng",
      meaning: "paradise",
      breakdown: "天堂 (tiān táng) - paradise",
    },
    {
      char: "天文",
      pinyin: "tiān wén",
      meaning: "astronomy",
      breakdown: "天文 (tiān wén) - astronomy",
    },
    {
      char: "田径",
      pinyin: "tián jìng",
      meaning: "track and field (athletics)",
      breakdown: "田径 (tián jìng) - track and field (athletics)",
    },
    {
      char: "舔",
      pinyin: "tiǎn",
      meaning: "to lick",
      breakdown: "舔 (tiǎn) - to lick",
    },
    {
      char: "挑剔",
      pinyin: "tiāo ti",
      meaning: "picky",
      breakdown: "挑剔 (tiāo ti) - picky",
    },
    {
      char: "条款",
      pinyin: "tiáo kuǎn",
      meaning: "clause (of contract or law)",
      breakdown: "条款 (tiáo kuǎn) - clause (of contract or law)",
    },
    {
      char: "条理",
      pinyin: "tiáo lǐ",
      meaning: "arrangement",
      breakdown: "条理 (tiáo lǐ) - arrangement",
    },
    {
      char: "条约",
      pinyin: "tiáo yuē",
      meaning: "treaty",
      breakdown: "条约 (tiáo yuē) - treaty",
    },
    {
      char: "调和",
      pinyin: "tiáo hé",
      meaning: "harmonious",
      breakdown: "调和 (tiáo hé) - harmonious",
    },
    {
      char: "调剂",
      pinyin: "tiáo jì",
      meaning: "to adjust",
      breakdown: "调剂 (tiáo jì) - to adjust",
    },
    {
      char: "调节",
      pinyin: "tiáo jié",
      meaning: "to adjust",
      breakdown: "调节 (tiáo jié) - to adjust",
    },
    {
      char: "调解",
      pinyin: "tiáo jiě",
      meaning: "to mediate",
      breakdown: "调解 (tiáo jiě) - to mediate",
    },
    {
      char: "调料",
      pinyin: "tiáo liào",
      meaning: "condiment",
      breakdown: "调料 (tiáo liào) - condiment",
    },
    {
      char: "挑拨",
      pinyin: "tiǎo bō",
      meaning: "to incite disharmony",
      breakdown: "挑拨 (tiǎo bō) - to incite disharmony",
    },
    {
      char: "挑衅",
      pinyin: "tiǎo xìn",
      meaning: "to provoke",
      breakdown: "挑衅 (tiǎo xìn) - to provoke",
    },
    {
      char: "跳跃",
      pinyin: "tiào yuè",
      meaning: "to jump",
      breakdown: "跳跃 (tiào yuè) - to jump",
    },
    {
      char: "停泊",
      pinyin: "tíng bó",
      meaning: "to anchor",
      breakdown: "停泊 (tíng bó) - to anchor",
    },
    {
      char: "停顿",
      pinyin: "tíng dùn",
      meaning: "to halt",
      breakdown: "停顿 (tíng dùn) - to halt",
    },
    {
      char: "停滞",
      pinyin: "tíng zhì",
      meaning: "stagnation",
      breakdown: "停滞 (tíng zhì) - stagnation",
    },
    {
      char: "亭子",
      pinyin: "tíng zi",
      meaning: "pavilion",
      breakdown: "亭子 (tíng zi) - pavilion",
    },
    {
      char: "挺拔",
      pinyin: "tǐng bá",
      meaning: "tall and straight",
      breakdown: "挺拔 (tǐng bá) - tall and straight",
    },
    {
      char: "通货",
      pinyin: "tōng huò",
      meaning: "currency",
      breakdown: "通货 (tōng huò) - currency",
    },
    {
      char: "通俗",
      pinyin: "tōng sú",
      meaning: "common",
      breakdown: "通俗 (tōng sú) - common",
    },
    {
      char: "通用",
      pinyin: "tōng yòng",
      meaning: "common (use)",
      breakdown: "通用 (tōng yòng) - common (use)",
    },
    {
      char: "铜矿",
      pinyin: "tóng kuàng",
      meaning: "Copper",
      breakdown: "铜矿 (tóng kuàng) - Copper",
    },
    {
      char: "同胞",
      pinyin: "tóng bāo",
      meaning: "born of the same parents",
      breakdown: "同胞 (tóng bāo) - born of the same parents",
    },
    {
      char: "同志",
      pinyin: "tóng zhì",
      meaning: "comrade",
      breakdown: "同志 (tóng zhì) - comrade",
    },
    {
      char: "童话",
      pinyin: "tóng huà",
      meaning: "children's fairy tales",
      breakdown: "童话 (tóng huà) - children's fairy tales",
    },
    {
      char: "统筹兼顾",
      pinyin: "tǒng chóu jiān gù",
      meaning: "an overall plan taking into account all factors",
      breakdown:
        "统筹兼顾 (tǒng chóu jiān gù) - an overall plan taking into account all factors",
    },
    {
      char: "统计",
      pinyin: "tǒng jì",
      meaning: "statistics",
      breakdown: "统计 (tǒng jì) - statistics",
    },
    {
      char: "统统",
      pinyin: "tǒng tǒng",
      meaning: "totally",
      breakdown: "统统 (tǒng tǒng) - totally",
    },
    {
      char: "投机",
      pinyin: "tóu jī",
      meaning: "to speculate (on financial markets)",
      breakdown: "投机 (tóu jī) - to speculate (on financial markets)",
    },
    {
      char: "投票",
      pinyin: "tóu piào",
      meaning: "to vote",
      breakdown: "投票 (tóu piào) - to vote",
    },
    {
      char: "投降",
      pinyin: "tóu xiáng",
      meaning: "to surrender",
      breakdown: "投降 (tóu xiáng) - to surrender",
    },
    {
      char: "投掷",
      pinyin: "tóu zhì",
      meaning: "to throw sth a long distance",
      breakdown: "投掷 (tóu zhì) - to throw sth a long distance",
    },
    { char: "秃", pinyin: "tū", meaning: "bald", breakdown: "秃 (tū) - bald" },
    {
      char: "突破",
      pinyin: "tū pò",
      meaning: "to break through",
      breakdown: "突破 (tū pò) - to break through",
    },
    {
      char: "图案",
      pinyin: "tú àn",
      meaning: "design",
      breakdown: "图案 (tú àn) - design",
    },
    {
      char: "徒弟",
      pinyin: "tú dì",
      meaning: "apprentice",
      breakdown: "徒弟 (tú dì) - apprentice",
    },
    {
      char: "途径",
      pinyin: "tú jìng",
      meaning: "way",
      breakdown: "途径 (tú jìng) - way",
    },
    {
      char: "涂抹",
      pinyin: "tú mǒ",
      meaning: "to paint",
      breakdown: "涂抹 (tú mǒ) - to paint",
    },
    {
      char: "土壤",
      pinyin: "tǔ rǎng",
      meaning: "soil",
      breakdown: "土壤 (tǔ rǎng) - soil",
    },
    {
      char: "团结",
      pinyin: "tuán jié",
      meaning: "a rally",
      breakdown: "团结 (tuán jié) - a rally",
    },
    {
      char: "团体",
      pinyin: "tuán tǐ",
      meaning: "group",
      breakdown: "团体 (tuán tǐ) - group",
    },
    {
      char: "团圆",
      pinyin: "tuán yuán",
      meaning: "to have a reunion",
      breakdown: "团圆 (tuán yuán) - to have a reunion",
    },
    {
      char: "推测",
      pinyin: "tuī cè",
      meaning: "speculation",
      breakdown: "推测 (tuī cè) - speculation",
    },
    {
      char: "推翻",
      pinyin: "tuī fān",
      meaning: "to overthrow",
      breakdown: "推翻 (tuī fān) - to overthrow",
    },
    {
      char: "推理",
      pinyin: "tuī lǐ",
      meaning: "reasoning",
      breakdown: "推理 (tuī lǐ) - reasoning",
    },
    {
      char: "推论",
      pinyin: "tuī lùn",
      meaning: "to infer",
      breakdown: "推论 (tuī lùn) - to infer",
    },
    {
      char: "推销",
      pinyin: "tuī xiāo",
      meaning: "to market",
      breakdown: "推销 (tuī xiāo) - to market",
    },
    {
      char: "吞咽",
      pinyin: "tūn yàn",
      meaning: "to swallow",
      breakdown: "吞咽 (tūn yàn) - to swallow",
    },
    {
      char: "脱离",
      pinyin: "tuō lí",
      meaning: "to separate oneself from",
      breakdown: "脱离 (tuō lí) - to separate oneself from",
    },
    {
      char: "拖延",
      pinyin: "tuō yán",
      meaning: "to adjourn",
      breakdown: "拖延 (tuō yán) - to adjourn",
    },
    {
      char: "托运",
      pinyin: "tuō yùn",
      meaning: "to consign (goods)",
      breakdown: "托运 (tuō yùn) - to consign (goods)",
    },
    {
      char: "妥当",
      pinyin: "tuǒ dang",
      meaning: "appropriate",
      breakdown: "妥当 (tuǒ dang) - appropriate",
    },
    {
      char: "妥善",
      pinyin: "tuǒ shàn",
      meaning: "appropriate",
      breakdown: "妥善 (tuǒ shàn) - appropriate",
    },
    {
      char: "妥协",
      pinyin: "tuǒ xié",
      meaning: "to compromise",
      breakdown: "妥协 (tuǒ xié) - to compromise",
    },
    {
      char: "椭圆",
      pinyin: "tuǒ yuán",
      meaning: "oval",
      breakdown: "椭圆 (tuǒ yuán) - oval",
    },
    {
      char: "唾沫",
      pinyin: "tuò mo",
      meaning: "spittle",
      breakdown: "唾沫 (tuò mo) - spittle",
    },
    {
      char: "挖掘",
      pinyin: "wā jué",
      meaning: "to excavate",
      breakdown: "挖掘 (wā jué) - to excavate",
    },
    {
      char: "娃娃",
      pinyin: "wá wa",
      meaning: "baby",
      breakdown: "娃娃 (wá wa) - baby",
    },
    {
      char: "瓦解",
      pinyin: "wǎ jiě",
      meaning: "to collapse",
      breakdown: "瓦解 (wǎ jiě) - to collapse",
    },
    {
      char: "哇",
      pinyin: "wa",
      meaning: "replaces 啊 when following the vowel 'u' or 'ao'",
      breakdown: "哇 (wa) - replaces 啊 when following the vowel 'u' or 'ao'",
    },
    {
      char: "歪曲",
      pinyin: "wāi qū",
      meaning: "to distort",
      breakdown: "歪曲 (wāi qū) - to distort",
    },
    {
      char: "外表",
      pinyin: "wài biǎo",
      meaning: "external",
      breakdown: "外表 (wài biǎo) - external",
    },
    {
      char: "外行",
      pinyin: "wài háng",
      meaning: "layman",
      breakdown: "外行 (wài háng) - layman",
    },
    {
      char: "外界",
      pinyin: "wài jiè",
      meaning: "the outside world",
      breakdown: "外界 (wài jiè) - the outside world",
    },
    {
      char: "外向",
      pinyin: "wài xiàng",
      meaning: "outward-looking",
      breakdown: "外向 (wài xiàng) - outward-looking",
    },
    {
      char: "丸",
      pinyin: "wán",
      meaning: "pill",
      breakdown: "丸 (wán) - pill",
    },
    {
      char: "完备",
      pinyin: "wán bèi",
      meaning: "faultless",
      breakdown: "完备 (wán bèi) - faultless",
    },
    {
      char: "完毕",
      pinyin: "wán bì",
      meaning: "to finish",
      breakdown: "完毕 (wán bì) - to finish",
    },
    {
      char: "玩弄",
      pinyin: "wán nòng",
      meaning: "to play with",
      breakdown: "玩弄 (wán nòng) - to play with",
    },
    {
      char: "玩意儿",
      pinyin: "wán yì r",
      meaning: "erhua variant of 玩意[wán yì]",
      breakdown: "玩意儿 (wán yì r) - erhua variant of 玩意[wán yì]",
    },
    {
      char: "顽固",
      pinyin: "wán gù",
      meaning: "stubborn",
      breakdown: "顽固 (wán gù) - stubborn",
    },
    {
      char: "顽强",
      pinyin: "wán qiáng",
      meaning: "tenacious",
      breakdown: "顽强 (wán qiáng) - tenacious",
    },
    {
      char: "挽回",
      pinyin: "wǎn huí",
      meaning: "to retrieve",
      breakdown: "挽回 (wǎn huí) - to retrieve",
    },
    {
      char: "挽救",
      pinyin: "wǎn jiù",
      meaning: "to save",
      breakdown: "挽救 (wǎn jiù) - to save",
    },
    {
      char: "惋惜",
      pinyin: "wǎn xī",
      meaning: "to feel sorry for a person over sth that should have happened",
      breakdown:
        "惋惜 (wǎn xī) - to feel sorry for a person over sth that should have happened",
    },
    {
      char: "万分",
      pinyin: "wàn fēn",
      meaning: "very much",
      breakdown: "万分 (wàn fēn) - very much",
    },
    {
      char: "往常",
      pinyin: "wǎng cháng",
      meaning: "habitually (in the past)",
      breakdown: "往常 (wǎng cháng) - habitually (in the past)",
    },
    {
      char: "往事",
      pinyin: "wǎng shì",
      meaning: "past events",
      breakdown: "往事 (wǎng shì) - past events",
    },
    {
      char: "网络",
      pinyin: "wǎng luò",
      meaning: "network (computing)",
      breakdown: "网络 (wǎng luò) - network (computing)",
    },
    {
      char: "妄想",
      pinyin: "wàng xiǎng",
      meaning: "to attempt vainly",
      breakdown: "妄想 (wàng xiǎng) - to attempt vainly",
    },
    {
      char: "微不足道",
      pinyin: "wēi bù zú dào",
      meaning: "negligible",
      breakdown: "微不足道 (wēi bù zú dào) - negligible",
    },
    {
      char: "微观",
      pinyin: "wēi guān",
      meaning: "micro-",
      breakdown: "微观 (wēi guān) - micro-",
    },
    {
      char: "威风",
      pinyin: "wēi fēng",
      meaning: "might",
      breakdown: "威风 (wēi fēng) - might",
    },
    {
      char: "威力",
      pinyin: "wēi lì",
      meaning: "might",
      breakdown: "威力 (wēi lì) - might",
    },
    {
      char: "威望",
      pinyin: "wēi wàng",
      meaning: "prestige",
      breakdown: "威望 (wēi wàng) - prestige",
    },
    {
      char: "威信",
      pinyin: "wēi xìn",
      meaning: "prestige",
      breakdown: "威信 (wēi xìn) - prestige",
    },
    {
      char: "危机",
      pinyin: "wēi jī",
      meaning: "crisis",
      breakdown: "危机 (wēi jī) - crisis",
    },
    {
      char: "违背",
      pinyin: "wéi bèi",
      meaning: "to violate",
      breakdown: "违背 (wéi bèi) - to violate",
    },
    {
      char: "维持",
      pinyin: "wéi chí",
      meaning: "to keep",
      breakdown: "维持 (wéi chí) - to keep",
    },
    {
      char: "维生素",
      pinyin: "wéi shēng sù",
      meaning: "vitamin",
      breakdown: "维生素 (wéi shēng sù) - vitamin",
    },
    {
      char: "维修",
      pinyin: "wéi xiū",
      meaning: "maintenance (of equipment)",
      breakdown: "维修 (wéi xiū) - maintenance (of equipment)",
    },
    {
      char: "唯独",
      pinyin: "wéi dú",
      meaning: "only",
      breakdown: "唯独 (wéi dú) - only",
    },
    {
      char: "为难",
      pinyin: "wéi nán",
      meaning: "to feel embarrassed or awkward",
      breakdown: "为难 (wéi nán) - to feel embarrassed or awkward",
    },
    {
      char: "为期",
      pinyin: "wéi qī",
      meaning: "(to be done) by (a certain date)",
      breakdown: "为期 (wéi qī) - (to be done) by (a certain date)",
    },
    {
      char: "为首",
      pinyin: "wéi shǒu",
      meaning: "head",
      breakdown: "为首 (wéi shǒu) - head",
    },
    {
      char: "委员",
      pinyin: "wěi yuán",
      meaning: "committee member",
      breakdown: "委员 (wěi yuán) - committee member",
    },
    {
      char: "伪造",
      pinyin: "wěi zào",
      meaning: "to forge",
      breakdown: "伪造 (wěi zào) - to forge",
    },
    {
      char: "胃口",
      pinyin: "wèi kǒu",
      meaning: "appetite",
      breakdown: "胃口 (wèi kǒu) - appetite",
    },
    {
      char: "位于",
      pinyin: "wèi yú",
      meaning: "to be located at",
      breakdown: "位于 (wèi yú) - to be located at",
    },
    {
      char: "未免",
      pinyin: "wèi miǎn",
      meaning: "unavoidable",
      breakdown: "未免 (wèi miǎn) - unavoidable",
    },
    {
      char: "畏惧",
      pinyin: "wèi jù",
      meaning: "to fear",
      breakdown: "畏惧 (wèi jù) - to fear",
    },
    {
      char: "卫星",
      pinyin: "wèi xīng",
      meaning: "(space) satellite",
      breakdown: "卫星 (wèi xīng) - (space) satellite",
    },
    {
      char: "慰问",
      pinyin: "wèi wèn",
      meaning: "to express sympathy",
      breakdown: "慰问 (wèi wèn) - to express sympathy",
    },
    {
      char: "温带",
      pinyin: "wēn dài",
      meaning: "temperate zone",
      breakdown: "温带 (wēn dài) - temperate zone",
    },
    {
      char: "温和",
      pinyin: "wēn hé",
      meaning: "mild",
      breakdown: "温和 (wēn hé) - mild",
    },
    {
      char: "文凭",
      pinyin: "wén píng",
      meaning: "diploma",
      breakdown: "文凭 (wén píng) - diploma",
    },
    {
      char: "文物",
      pinyin: "wén wù",
      meaning: "cultural relic",
      breakdown: "文物 (wén wù) - cultural relic",
    },
    {
      char: "文献",
      pinyin: "wén xiàn",
      meaning: "document",
      breakdown: "文献 (wén xiàn) - document",
    },
    {
      char: "文雅",
      pinyin: "wén yǎ",
      meaning: "elegant",
      breakdown: "文雅 (wén yǎ) - elegant",
    },
    {
      char: "文艺",
      pinyin: "wén yì",
      meaning: "literature and art",
      breakdown: "文艺 (wén yì) - literature and art",
    },
    {
      char: "问世",
      pinyin: "wèn shì",
      meaning: "to be published",
      breakdown: "问世 (wèn shì) - to be published",
    },
    { char: "窝", pinyin: "wō", meaning: "nest", breakdown: "窝 (wō) - nest" },
    {
      char: "乌黑",
      pinyin: "wū hēi",
      meaning: "jet-black",
      breakdown: "乌黑 (wū hēi) - jet-black",
    },
    {
      char: "污蔑",
      pinyin: "wū miè",
      meaning: "to slander",
      breakdown: "污蔑 (wū miè) - to slander",
    },
    {
      char: "诬陷",
      pinyin: "wū xiàn",
      meaning: "to entrap",
      breakdown: "诬陷 (wū xiàn) - to entrap",
    },
    {
      char: "无比",
      pinyin: "wú bǐ",
      meaning: "incomparable",
      breakdown: "无比 (wú bǐ) - incomparable",
    },
    {
      char: "无偿",
      pinyin: "wú cháng",
      meaning: "free",
      breakdown: "无偿 (wú cháng) - free",
    },
    {
      char: "无耻",
      pinyin: "wú chǐ",
      meaning: "without any sense of shame",
      breakdown: "无耻 (wú chǐ) - without any sense of shame",
    },
    {
      char: "无从",
      pinyin: "wú cóng",
      meaning: "not to have access",
      breakdown: "无从 (wú cóng) - not to have access",
    },
    {
      char: "无动于衷",
      pinyin: "wú dòng yú zhōng",
      meaning: "aloof",
      breakdown: "无动于衷 (wú dòng yú zhōng) - aloof",
    },
    {
      char: "无非",
      pinyin: "wú fēi",
      meaning: "only",
      breakdown: "无非 (wú fēi) - only",
    },
    {
      char: "无精打采",
      pinyin: "wú jīng dǎ cǎi",
      meaning: "dispirited and downcast (idiom); listless",
      breakdown:
        "无精打采 (wú jīng dǎ cǎi) - dispirited and downcast (idiom); listless",
    },
    {
      char: "无可奉告",
      pinyin: "wú kě fèng gào",
      meaning: "(idiom) 'no comment'",
      breakdown: "无可奉告 (wú kě fèng gào) - (idiom) 'no comment'",
    },
    {
      char: "无可奈何",
      pinyin: "wú kě nài hé",
      meaning: "have no way out",
      breakdown: "无可奈何 (wú kě nài hé) - have no way out",
    },
    {
      char: "无赖",
      pinyin: "wú lài",
      meaning: "hoodlum",
      breakdown: "无赖 (wú lài) - hoodlum",
    },
    {
      char: "无理取闹",
      pinyin: "wú lǐ qǔ nào",
      meaning:
        "to make trouble without reason (idiom); to be deliberately provocative",
      breakdown:
        "无理取闹 (wú lǐ qǔ nào) - to make trouble without reason (idiom); to be deliberately provocative",
    },
    {
      char: "无能为力",
      pinyin: "wú néng wéi lì",
      meaning: "impotent (idiom)",
      breakdown: "无能为力 (wú néng wéi lì) - impotent (idiom)",
    },
    {
      char: "无穷无尽",
      pinyin: "wú qióng wú jìn",
      meaning: "vast and limitless (idiom); endless span of time",
      breakdown:
        "无穷无尽 (wú qióng wú jìn) - vast and limitless (idiom); endless span of time",
    },
    {
      char: "无微不至",
      pinyin: "wú wēi bù zhì",
      meaning: "in every possible way (idiom); meticulous",
      breakdown:
        "无微不至 (wú wēi bù zhì) - in every possible way (idiom); meticulous",
    },
    {
      char: "无忧无虑",
      pinyin: "wú yōu wú lǜ",
      meaning: "carefree and without worries (idiom)",
      breakdown:
        "无忧无虑 (wú yōu wú lǜ) - carefree and without worries (idiom)",
    },
    {
      char: "无知",
      pinyin: "wú zhī",
      meaning: "ignorant",
      breakdown: "无知 (wú zhī) - ignorant",
    },
    {
      char: "舞蹈",
      pinyin: "wǔ dǎo",
      meaning: "dance",
      breakdown: "舞蹈 (wǔ dǎo) - dance",
    },
    {
      char: "武侠",
      pinyin: "wǔ xiá",
      meaning: "martial arts chivalry (Chinese literary)",
      breakdown: "武侠 (wǔ xiá) - martial arts chivalry (Chinese literary)",
    },
    {
      char: "武装",
      pinyin: "wǔ zhuāng",
      meaning: "arms",
      breakdown: "武装 (wǔ zhuāng) - arms",
    },
    {
      char: "侮辱",
      pinyin: "wǔ rǔ",
      meaning: "to insult",
      breakdown: "侮辱 (wǔ rǔ) - to insult",
    },
    {
      char: "勿",
      pinyin: "wù",
      meaning: "do not",
      breakdown: "勿 (wù) - do not",
    },
    {
      char: "务必",
      pinyin: "wù bì",
      meaning: "must",
      breakdown: "务必 (wù bì) - must",
    },
    {
      char: "务实",
      pinyin: "wù shí",
      meaning: "pragmatic",
      breakdown: "务实 (wù shí) - pragmatic",
    },
    {
      char: "误差",
      pinyin: "wù chā",
      meaning: "difference",
      breakdown: "误差 (wù chā) - difference",
    },
    {
      char: "误解",
      pinyin: "wù jiě",
      meaning: "to misunderstand",
      breakdown: "误解 (wù jiě) - to misunderstand",
    },
    {
      char: "物美价廉",
      pinyin: "wù měi jià lián",
      meaning: "good quality and cheap",
      breakdown: "物美价廉 (wù měi jià lián) - good quality and cheap",
    },
    {
      char: "物资",
      pinyin: "wù zī",
      meaning: "goods",
      breakdown: "物资 (wù zī) - goods",
    },
    {
      char: "溪",
      pinyin: "xī",
      meaning: "variant of 溪",
      breakdown: "溪 (xī) - variant of 溪",
    },
    {
      char: "膝盖",
      pinyin: "xī gài",
      meaning: "knee",
      breakdown: "膝盖 (xī gài) - knee",
    },
    {
      char: "熄灭",
      pinyin: "xī miè",
      meaning: "to stop burning",
      breakdown: "熄灭 (xī miè) - to stop burning",
    },
    {
      char: "吸取",
      pinyin: "xī qǔ",
      meaning: "to absorb",
      breakdown: "吸取 (xī qǔ) - to absorb",
    },
    {
      char: "昔日",
      pinyin: "xī rì",
      meaning: "formerly",
      breakdown: "昔日 (xī rì) - formerly",
    },
    {
      char: "牺牲",
      pinyin: "xī shēng",
      meaning: "to sacrifice oneself",
      breakdown: "牺牲 (xī shēng) - to sacrifice oneself",
    },
    {
      char: "夕阳",
      pinyin: "xī yáng",
      meaning: "sunset",
      breakdown: "夕阳 (xī yáng) - sunset",
    },
    {
      char: "媳妇",
      pinyin: "xí fù",
      meaning: "daughter-in-law",
      breakdown: "媳妇 (xí fù) - daughter-in-law",
    },
    {
      char: "习俗",
      pinyin: "xí sú",
      meaning: "custom",
      breakdown: "习俗 (xí sú) - custom",
    },
    {
      char: "袭击",
      pinyin: "xí jī",
      meaning: "attack (esp. surprise attack)",
      breakdown: "袭击 (xí jī) - attack (esp. surprise attack)",
    },
    {
      char: "喜闻乐见",
      pinyin: "xǐ wén lè jiàn",
      meaning: "a delight to see (idiom); an attractive spectacle",
      breakdown:
        "喜闻乐见 (xǐ wén lè jiàn) - a delight to see (idiom); an attractive spectacle",
    },
    {
      char: "喜悦",
      pinyin: "xǐ yuè",
      meaning: "happy",
      breakdown: "喜悦 (xǐ yuè) - happy",
    },
    {
      char: "系列",
      pinyin: "xì liè",
      meaning: "series",
      breakdown: "系列 (xì liè) - series",
    },
    {
      char: "细胞",
      pinyin: "xì bāo",
      meaning: "cell (biology)",
      breakdown: "细胞 (xì bāo) - cell (biology)",
    },
    {
      char: "细菌",
      pinyin: "xì jūn",
      meaning: "bacterium",
      breakdown: "细菌 (xì jūn) - bacterium",
    },
    {
      char: "细致",
      pinyin: "xì zhì",
      meaning: "delicate",
      breakdown: "细致 (xì zhì) - delicate",
    },
    {
      char: "霞",
      pinyin: "xiá",
      meaning: "red clouds",
      breakdown: "霞 (xiá) - red clouds",
    },
    {
      char: "狭隘",
      pinyin: "xiá ài",
      meaning: "narrow",
      breakdown: "狭隘 (xiá ài) - narrow",
    },
    {
      char: "狭窄",
      pinyin: "xiá zhǎi",
      meaning: "narrow",
      breakdown: "狭窄 (xiá zhǎi) - narrow",
    },
    {
      char: "峡谷",
      pinyin: "xiá gǔ",
      meaning: "canyon",
      breakdown: "峡谷 (xiá gǔ) - canyon",
    },
    {
      char: "夏令营",
      pinyin: "xià lìng yíng",
      meaning: "summer camp",
      breakdown: "夏令营 (xià lìng yíng) - summer camp",
    },
    {
      char: "下属",
      pinyin: "xià shǔ",
      meaning: "subordinate",
      breakdown: "下属 (xià shǔ) - subordinate",
    },
    {
      char: "先进",
      pinyin: "xiān jìn",
      meaning: "advanced (technology)",
      breakdown: "先进 (xiān jìn) - advanced (technology)",
    },
    {
      char: "先前",
      pinyin: "xiān qián",
      meaning: "before",
      breakdown: "先前 (xiān qián) - before",
    },
    {
      char: "鲜明",
      pinyin: "xiān míng",
      meaning: "bright",
      breakdown: "鲜明 (xiān míng) - bright",
    },
    {
      char: "掀起",
      pinyin: "xiān qǐ",
      meaning: "to lift",
      breakdown: "掀起 (xiān qǐ) - to lift",
    },
    {
      char: "纤维",
      pinyin: "xiān wéi",
      meaning: "fiber",
      breakdown: "纤维 (xiān wéi) - fiber",
    },
    {
      char: "弦",
      pinyin: "xián",
      meaning: "bow string",
      breakdown: "弦 (xián) - bow string",
    },
    {
      char: "嫌",
      pinyin: "xián",
      meaning: "to dislike",
      breakdown: "嫌 (xián) - to dislike",
    },
    {
      char: "嫌疑",
      pinyin: "xián yí",
      meaning: "suspicion",
      breakdown: "嫌疑 (xián yí) - suspicion",
    },
    {
      char: "闲话",
      pinyin: "xián huà",
      meaning: "digression",
      breakdown: "闲话 (xián huà) - digression",
    },
    {
      char: "贤惠",
      pinyin: "xián huì",
      meaning: "chaste",
      breakdown: "贤惠 (xián huì) - chaste",
    },
    {
      char: "衔接",
      pinyin: "xián jiē",
      meaning: "to join together",
      breakdown: "衔接 (xián jiē) - to join together",
    },
    {
      char: "显著",
      pinyin: "xiǎn zhù",
      meaning: "outstanding",
      breakdown: "显著 (xiǎn zhù) - outstanding",
    },
    {
      char: "现场",
      pinyin: "xiàn chǎng",
      meaning: "lit. actual location",
      breakdown: "现场 (xiàn chǎng) - lit. actual location",
    },
    {
      char: "现成",
      pinyin: "xiàn chéng",
      meaning: "ready-made",
      breakdown: "现成 (xiàn chéng) - ready-made",
    },
    {
      char: "现状",
      pinyin: "xiàn zhuàng",
      meaning: "current situation",
      breakdown: "现状 (xiàn zhuàng) - current situation",
    },
    {
      char: "宪法",
      pinyin: "xiàn fǎ",
      meaning: "constitution (of a country)",
      breakdown: "宪法 (xiàn fǎ) - constitution (of a country)",
    },
    {
      char: "陷害",
      pinyin: "xiàn hài",
      meaning: "to entrap",
      breakdown: "陷害 (xiàn hài) - to entrap",
    },
    {
      char: "陷入",
      pinyin: "xiàn rù",
      meaning: "to sink into",
      breakdown: "陷入 (xiàn rù) - to sink into",
    },
    {
      char: "馅儿",
      pinyin: "xiàn r",
      meaning: "erhua variant of 餡|馅",
      breakdown: "馅儿 (xiàn r) - erhua variant of 餡|馅",
    },
    {
      char: "线索",
      pinyin: "xiàn suǒ",
      meaning: "trail",
      breakdown: "线索 (xiàn suǒ) - trail",
    },
    {
      char: "相差",
      pinyin: "xiāng chà",
      meaning: "to differ",
      breakdown: "相差 (xiāng chà) - to differ",
    },
    {
      char: "相等",
      pinyin: "xiāng děng",
      meaning: "equal",
      breakdown: "相等 (xiāng děng) - equal",
    },
    {
      char: "相辅相成",
      pinyin: "xiāng fǔ xiāng chéng",
      meaning: "to complement one another (idiom)",
      breakdown:
        "相辅相成 (xiāng fǔ xiāng chéng) - to complement one another (idiom)",
    },
    {
      char: "相应",
      pinyin: "xiāng yìng",
      meaning: "to correspond",
      breakdown: "相应 (xiāng yìng) - to correspond",
    },
    {
      char: "镶嵌",
      pinyin: "xiāng qiàn",
      meaning: "to inlay",
      breakdown: "镶嵌 (xiāng qiàn) - to inlay",
    },
    {
      char: "乡镇",
      pinyin: "xiāng zhèn",
      meaning: "village",
      breakdown: "乡镇 (xiāng zhèn) - village",
    },
    {
      char: "想方设法",
      pinyin: "xiǎng fāng shè fǎ",
      meaning:
        "to think up every possible method (idiom); to devise ways and means",
      breakdown:
        "想方设法 (xiǎng fāng shè fǎ) - to think up every possible method (idiom); to devise ways and means",
    },
    {
      char: "响亮",
      pinyin: "xiǎng liàng",
      meaning: "loud and clear",
      breakdown: "响亮 (xiǎng liàng) - loud and clear",
    },
    {
      char: "响应",
      pinyin: "xiǎng yìng",
      meaning: "respond to",
      breakdown: "响应 (xiǎng yìng) - respond to",
    },
    {
      char: "巷",
      pinyin: "xiàng",
      meaning: "lane",
      breakdown: "巷 (xiàng) - lane",
    },
    {
      char: "向导",
      pinyin: "xiàng dǎo",
      meaning: "guide",
      breakdown: "向导 (xiàng dǎo) - guide",
    },
    {
      char: "向来",
      pinyin: "xiàng lái",
      meaning: "always (previously)",
      breakdown: "向来 (xiàng lái) - always (previously)",
    },
    {
      char: "向往",
      pinyin: "xiàng wǎng",
      meaning: "to yearn for",
      breakdown: "向往 (xiàng wǎng) - to yearn for",
    },
    {
      char: "消除",
      pinyin: "xiāo chú",
      meaning: "to eliminate",
      breakdown: "消除 (xiāo chú) - to eliminate",
    },
    {
      char: "消毒",
      pinyin: "xiāo dú",
      meaning: "to disinfect",
      breakdown: "消毒 (xiāo dú) - to disinfect",
    },
    {
      char: "消防",
      pinyin: "xiāo fáng",
      meaning: "fire-fighting",
      breakdown: "消防 (xiāo fáng) - fire-fighting",
    },
    {
      char: "消耗",
      pinyin: "xiāo hào",
      meaning: "to use up",
      breakdown: "消耗 (xiāo hào) - to use up",
    },
    {
      char: "消极",
      pinyin: "xiāo jí",
      meaning: "negative",
      breakdown: "消极 (xiāo jí) - negative",
    },
    {
      char: "销毁",
      pinyin: "xiāo huǐ",
      meaning: "to destroy (by melting or burning)",
      breakdown: "销毁 (xiāo huǐ) - to destroy (by melting or burning)",
    },
    {
      char: "小心翼翼",
      pinyin: "xiǎo xīn yì yì",
      meaning: "cautious and solemn (idiom); very carefully",
      breakdown:
        "小心翼翼 (xiǎo xīn yì yì) - cautious and solemn (idiom); very carefully",
    },
    {
      char: "效益",
      pinyin: "xiào yì",
      meaning: "benefit",
      breakdown: "效益 (xiào yì) - benefit",
    },
    {
      char: "肖像",
      pinyin: "xiào xiàng",
      meaning: "portrait",
      breakdown: "肖像 (xiào xiàng) - portrait",
    },
    {
      char: "携带",
      pinyin: "xié dài",
      meaning: "to carry (on one's person)",
      breakdown: "携带 (xié dài) - to carry (on one's person)",
    },
    {
      char: "协会",
      pinyin: "xié huì",
      meaning: "an association",
      breakdown: "协会 (xié huì) - an association",
    },
    {
      char: "协商",
      pinyin: "xié shāng",
      meaning: "to consult with",
      breakdown: "协商 (xié shāng) - to consult with",
    },
    {
      char: "协议",
      pinyin: "xié yì",
      meaning: "agreement",
      breakdown: "协议 (xié yì) - agreement",
    },
    {
      char: "协助",
      pinyin: "xié zhù",
      meaning: "to provide assistance",
      breakdown: "协助 (xié zhù) - to provide assistance",
    },
    {
      char: "写作",
      pinyin: "xiě zuò",
      meaning: "writing",
      breakdown: "写作 (xiě zuò) - writing",
    },
    {
      char: "屑",
      pinyin: "xiè",
      meaning: "bits",
      breakdown: "屑 (xiè) - bits",
    },
    {
      char: "谢绝",
      pinyin: "xiè jué",
      meaning: "to refuse politely",
      breakdown: "谢绝 (xiè jué) - to refuse politely",
    },
    {
      char: "泄露",
      pinyin: "xiè lù",
      meaning: "to leak (information)",
      breakdown: "泄露 (xiè lù) - to leak (information)",
    },
    {
      char: "泄气",
      pinyin: "xiè qì",
      meaning: "to leak (gas)",
      breakdown: "泄气 (xiè qì) - to leak (gas)",
    },
    {
      char: "新陈代谢",
      pinyin: "xīn chén dài xiè",
      meaning: "metabolism (biology)",
      breakdown: "新陈代谢 (xīn chén dài xiè) - metabolism (biology)",
    },
    {
      char: "新郎",
      pinyin: "xīn láng",
      meaning: "bridegroom",
      breakdown: "新郎 (xīn láng) - bridegroom",
    },
    {
      char: "新娘",
      pinyin: "xīn niáng",
      meaning: "bride",
      breakdown: "新娘 (xīn niáng) - bride",
    },
    {
      char: "新颖",
      pinyin: "xīn yǐng",
      meaning: "lit. new bud",
      breakdown: "新颖 (xīn yǐng) - lit. new bud",
    },
    {
      char: "心得",
      pinyin: "xīn dé",
      meaning: "knowledge gained",
      breakdown: "心得 (xīn dé) - knowledge gained",
    },
    {
      char: "心灵",
      pinyin: "xīn líng",
      meaning: "bright",
      breakdown: "心灵 (xīn líng) - bright",
    },
    {
      char: "心态",
      pinyin: "xīn tài",
      meaning: "attitude (of the heart)",
      breakdown: "心态 (xīn tài) - attitude (of the heart)",
    },
    {
      char: "心疼",
      pinyin: "xīn téng",
      meaning: "to love dearly",
      breakdown: "心疼 (xīn téng) - to love dearly",
    },
    {
      char: "心血",
      pinyin: "xīn xuè",
      meaning: "heart's blood",
      breakdown: "心血 (xīn xuè) - heart's blood",
    },
    {
      char: "心眼儿",
      pinyin: "xīn yǎn r",
      meaning: "one's thoughts",
      breakdown: "心眼儿 (xīn yǎn r) - one's thoughts",
    },
    {
      char: "辛勤",
      pinyin: "xīn qín",
      meaning: "hardworking",
      breakdown: "辛勤 (xīn qín) - hardworking",
    },
    {
      char: "欣慰",
      pinyin: "xīn wèi",
      meaning: "to be gratified",
      breakdown: "欣慰 (xīn wèi) - to be gratified",
    },
    {
      char: "欣欣向荣",
      pinyin: "xīn xīn xiàng róng",
      meaning: "luxuriant growth (idiom); flourishing",
      breakdown:
        "欣欣向荣 (xīn xīn xiàng róng) - luxuriant growth (idiom); flourishing",
    },
    {
      char: "薪水",
      pinyin: "xīn shuǐ",
      meaning: "salary",
      breakdown: "薪水 (xīn shuǐ) - salary",
    },
    {
      char: "信赖",
      pinyin: "xìn lài",
      meaning: "to trust",
      breakdown: "信赖 (xìn lài) - to trust",
    },
    {
      char: "信念",
      pinyin: "xìn niàn",
      meaning: "faith",
      breakdown: "信念 (xìn niàn) - faith",
    },
    {
      char: "信仰",
      pinyin: "xìn yǎng",
      meaning: "to believe in (a religion)",
      breakdown: "信仰 (xìn yǎng) - to believe in (a religion)",
    },
    {
      char: "信誉",
      pinyin: "xìn yù",
      meaning: "prestige",
      breakdown: "信誉 (xìn yù) - prestige",
    },
    {
      char: "腥",
      pinyin: "xīng",
      meaning: "fishy (smell)",
      breakdown: "腥 (xīng) - fishy (smell)",
    },
    {
      char: "兴隆",
      pinyin: "xīng lóng",
      meaning: "prosperous",
      breakdown: "兴隆 (xīng lóng) - prosperous",
    },
    {
      char: "兴旺",
      pinyin: "xīng wàng",
      meaning: "prosperous",
      breakdown: "兴旺 (xīng wàng) - prosperous",
    },
    {
      char: "行政",
      pinyin: "xíng zhèng",
      meaning: "administrative",
      breakdown: "行政 (xíng zhèng) - administrative",
    },
    {
      char: "形态",
      pinyin: "xíng tài",
      meaning: "shape",
      breakdown: "形态 (xíng tài) - shape",
    },
    {
      char: "刑事",
      pinyin: "xíng shì",
      meaning: "criminal",
      breakdown: "刑事 (xíng shì) - criminal",
    },
    {
      char: "性感",
      pinyin: "xìng gǎn",
      meaning: "sex appeal",
      breakdown: "性感 (xìng gǎn) - sex appeal",
    },
    {
      char: "性命",
      pinyin: "xìng mìng",
      meaning: "life",
      breakdown: "性命 (xìng mìng) - life",
    },
    {
      char: "性能",
      pinyin: "xìng néng",
      meaning: "function",
      breakdown: "性能 (xìng néng) - function",
    },
    {
      char: "性情",
      pinyin: "xìng qíng",
      meaning: "nature",
      breakdown: "性情 (xìng qíng) - nature",
    },
    {
      char: "幸好",
      pinyin: "xìng hǎo",
      meaning: "fortunately",
      breakdown: "幸好 (xìng hǎo) - fortunately",
    },
    {
      char: "兴高采烈",
      pinyin: "xīng gāo cǎi liè",
      meaning: "happy and excited (idiom); in high spirits",
      breakdown:
        "兴高采烈 (xīng gāo cǎi liè) - happy and excited (idiom); in high spirits",
    },
    {
      char: "兴致勃勃",
      pinyin: "xìng zhì bó bó",
      meaning: "to become exhilarated (idiom); in high spirits",
      breakdown:
        "兴致勃勃 (xìng zhì bó bó) - to become exhilarated (idiom); in high spirits",
    },
    {
      char: "胸怀",
      pinyin: "xiōng huái",
      meaning: "one's bosom (the seat of emotions)",
      breakdown: "胸怀 (xiōng huái) - one's bosom (the seat of emotions)",
    },
    {
      char: "胸膛",
      pinyin: "xiōng táng",
      meaning: "chest",
      breakdown: "胸膛 (xiōng táng) - chest",
    },
    {
      char: "凶恶",
      pinyin: "xiōng è",
      meaning: "variant of 兇惡|凶恶",
      breakdown: "凶恶 (xiōng è) - variant of 兇惡|凶恶",
    },
    {
      char: "凶手",
      pinyin: "xiōng shǒu",
      meaning: "murderer",
      breakdown: "凶手 (xiōng shǒu) - murderer",
    },
    {
      char: "雄厚",
      pinyin: "xióng hòu",
      meaning: "robust",
      breakdown: "雄厚 (xióng hòu) - robust",
    },
    {
      char: "修复",
      pinyin: "xiū fù",
      meaning: "to restore",
      breakdown: "修复 (xiū fù) - to restore",
    },
    {
      char: "修建",
      pinyin: "xiū jiàn",
      meaning: "to build",
      breakdown: "修建 (xiū jiàn) - to build",
    },
    {
      char: "修理",
      pinyin: "xiū lǐ",
      meaning: "to repair",
      breakdown: "修理 (xiū lǐ) - to repair",
    },
    {
      char: "羞耻",
      pinyin: "xiū chǐ",
      meaning: "(a feeling of) shame",
      breakdown: "羞耻 (xiū chǐ) - (a feeling of) shame",
    },
    {
      char: "休养",
      pinyin: "xiū yǎng",
      meaning: "to recuperate",
      breakdown: "休养 (xiū yǎng) - to recuperate",
    },
    {
      char: "绣",
      pinyin: "xiù",
      meaning: "to embroider",
      breakdown: "绣 (xiù) - to embroider",
    },
    {
      char: "嗅觉",
      pinyin: "xiù jué",
      meaning: "sense of smell",
      breakdown: "嗅觉 (xiù jué) - sense of smell",
    },
    {
      char: "虚假",
      pinyin: "xū jiǎ",
      meaning: "false",
      breakdown: "虚假 (xū jiǎ) - false",
    },
    {
      char: "虚荣",
      pinyin: "xū róng",
      meaning: "vanity",
      breakdown: "虚荣 (xū róng) - vanity",
    },
    {
      char: "虚伪",
      pinyin: "xū wěi",
      meaning: "false",
      breakdown: "虚伪 (xū wěi) - false",
    },
    {
      char: "需求",
      pinyin: "xū qiú",
      meaning: "requirement",
      breakdown: "需求 (xū qiú) - requirement",
    },
    {
      char: "须知",
      pinyin: "xū zhī",
      meaning: "prerequisites",
      breakdown: "须知 (xū zhī) - prerequisites",
    },
    {
      char: "许可",
      pinyin: "xǔ kě",
      meaning: "to allow",
      breakdown: "许可 (xǔ kě) - to allow",
    },
    {
      char: "酗酒",
      pinyin: "xù jiǔ",
      meaning: "heavy drinking",
      breakdown: "酗酒 (xù jiǔ) - heavy drinking",
    },
    {
      char: "畜牧",
      pinyin: "xù mù",
      meaning: "to raise animals",
      breakdown: "畜牧 (xù mù) - to raise animals",
    },
    {
      char: "序言",
      pinyin: "xù yán",
      meaning: "preface",
      breakdown: "序言 (xù yán) - preface",
    },
    {
      char: "宣誓",
      pinyin: "xuān shì",
      meaning: "to swear an oath (of office)",
      breakdown: "宣誓 (xuān shì) - to swear an oath (of office)",
    },
    {
      char: "宣扬",
      pinyin: "xuān yáng",
      meaning: "to proclaim",
      breakdown: "宣扬 (xuān yáng) - to proclaim",
    },
    {
      char: "悬挂",
      pinyin: "xuán guà",
      meaning: "to suspend",
      breakdown: "悬挂 (xuán guà) - to suspend",
    },
    {
      char: "悬念",
      pinyin: "xuán niàn",
      meaning: "suspense in a movie",
      breakdown: "悬念 (xuán niàn) - suspense in a movie",
    },
    {
      char: "悬崖峭壁",
      pinyin: "xuán yá qiào bì",
      meaning: "sheer cliffs and precipitous rock faces (idiom)",
      breakdown:
        "悬崖峭壁 (xuán yá qiào bì) - sheer cliffs and precipitous rock faces (idiom)",
    },
    {
      char: "旋律",
      pinyin: "xuán lǜ",
      meaning: "melody",
      breakdown: "旋律 (xuán lǜ) - melody",
    },
    {
      char: "旋转",
      pinyin: "xuán zhuǎn",
      meaning: "to rotate",
      breakdown: "旋转 (xuán zhuǎn) - to rotate",
    },
    {
      char: "选拔",
      pinyin: "xuǎn bá",
      meaning: "to select the best",
      breakdown: "选拔 (xuǎn bá) - to select the best",
    },
    {
      char: "选手",
      pinyin: "xuǎn shǒu",
      meaning: "athlete",
      breakdown: "选手 (xuǎn shǒu) - athlete",
    },
    {
      char: "削弱",
      pinyin: "xuē ruò",
      meaning: "to weaken",
      breakdown: "削弱 (xuē ruò) - to weaken",
    },
    {
      char: "学历",
      pinyin: "xué lì",
      meaning: "educational background",
      breakdown: "学历 (xué lì) - educational background",
    },
    {
      char: "学说",
      pinyin: "xué shuō",
      meaning: "theory",
      breakdown: "学说 (xué shuō) - theory",
    },
    {
      char: "学位",
      pinyin: "xué wèi",
      meaning: "academic degree",
      breakdown: "学位 (xué wèi) - academic degree",
    },
    {
      char: "雪上加霜",
      pinyin: "xuě shàng jiā shuāng",
      meaning: "to add hail to snow (idiom); one disaster on top of another",
      breakdown:
        "雪上加霜 (xuě shàng jiā shuāng) - to add hail to snow (idiom); one disaster on top of another",
    },
    {
      char: "血压",
      pinyin: "xuè yā",
      meaning: "blood pressure",
      breakdown: "血压 (xuè yā) - blood pressure",
    },
    {
      char: "熏陶",
      pinyin: "xūn táo",
      meaning: "to seep in",
      breakdown: "熏陶 (xūn táo) - to seep in",
    },
    {
      char: "循环",
      pinyin: "xún huán",
      meaning: "to cycle",
      breakdown: "循环 (xún huán) - to cycle",
    },
    {
      char: "循序渐进",
      pinyin: "xún xù jiàn jìn",
      meaning: "in sequence",
      breakdown: "循序渐进 (xún xù jiàn jìn) - in sequence",
    },
    {
      char: "巡逻",
      pinyin: "xún luó",
      meaning: "to patrol (police)",
      breakdown: "巡逻 (xún luó) - to patrol (police)",
    },
    {
      char: "寻觅",
      pinyin: "xún mì",
      meaning: "to look for",
      breakdown: "寻觅 (xún mì) - to look for",
    },
    {
      char: "押金",
      pinyin: "yā jīn",
      meaning: "deposit",
      breakdown: "押金 (yā jīn) - deposit",
    },
    {
      char: "压迫",
      pinyin: "yā pò",
      meaning: "to oppress",
      breakdown: "压迫 (yā pò) - to oppress",
    },
    {
      char: "压岁钱",
      pinyin: "yā suì qián",
      meaning: "money given to children as new year present",
      breakdown:
        "压岁钱 (yā suì qián) - money given to children as new year present",
    },
    {
      char: "压缩",
      pinyin: "yā suō",
      meaning: "to compress",
      breakdown: "压缩 (yā suō) - to compress",
    },
    {
      char: "压抑",
      pinyin: "yā yì",
      meaning: "to constrain or repress emotions",
      breakdown: "压抑 (yā yì) - to constrain or repress emotions",
    },
    {
      char: "压榨",
      pinyin: "yā zhà",
      meaning: "to press",
      breakdown: "压榨 (yā zhà) - to press",
    },
    {
      char: "压制",
      pinyin: "yā zhì",
      meaning: "to suppress",
      breakdown: "压制 (yā zhì) - to suppress",
    },
    {
      char: "亚军",
      pinyin: "yà jūn",
      meaning: "second place (in a sports contest)",
      breakdown: "亚军 (yà jūn) - second place (in a sports contest)",
    },
    {
      char: "烟花",
      pinyin: "yān huā",
      meaning: "fireworks",
      breakdown: "烟花 (yān huā) - fireworks",
    },
    {
      char: "淹没",
      pinyin: "yān mò",
      meaning: "to submerge",
      breakdown: "淹没 (yān mò) - to submerge",
    },
    {
      char: "延期",
      pinyin: "yán qī",
      meaning: "to delay",
      breakdown: "延期 (yán qī) - to delay",
    },
    {
      char: "延伸",
      pinyin: "yán shēn",
      meaning: "to extend",
      breakdown: "延伸 (yán shēn) - to extend",
    },
    {
      char: "延续",
      pinyin: "yán xù",
      meaning: "to continue",
      breakdown: "延续 (yán xù) - to continue",
    },
    {
      char: "严寒",
      pinyin: "yán hán",
      meaning: "bitter cold",
      breakdown: "严寒 (yán hán) - bitter cold",
    },
    {
      char: "严禁",
      pinyin: "yán jìn",
      meaning: "strictly prohibit",
      breakdown: "严禁 (yán jìn) - strictly prohibit",
    },
    {
      char: "严峻",
      pinyin: "yán jùn",
      meaning: "grim",
      breakdown: "严峻 (yán jùn) - grim",
    },
    {
      char: "严厉",
      pinyin: "yán lì",
      meaning: "severe",
      breakdown: "严厉 (yán lì) - severe",
    },
    {
      char: "严密",
      pinyin: "yán mì",
      meaning: "strict",
      breakdown: "严密 (yán mì) - strict",
    },
    {
      char: "沿海",
      pinyin: "yán hǎi",
      meaning: "coastal",
      breakdown: "沿海 (yán hǎi) - coastal",
    },
    {
      char: "言论",
      pinyin: "yán lùn",
      meaning: "speech",
      breakdown: "言论 (yán lùn) - speech",
    },
    {
      char: "炎热",
      pinyin: "yán rè",
      meaning: "blistering hot",
      breakdown: "炎热 (yán rè) - blistering hot",
    },
    {
      char: "岩石",
      pinyin: "yán shí",
      meaning: "rock",
      breakdown: "岩石 (yán shí) - rock",
    },
    {
      char: "演变",
      pinyin: "yǎn biàn",
      meaning: "to develop",
      breakdown: "演变 (yǎn biàn) - to develop",
    },
    {
      char: "演讲",
      pinyin: "yǎn jiǎng",
      meaning: "lecture",
      breakdown: "演讲 (yǎn jiǎng) - lecture",
    },
    {
      char: "演习",
      pinyin: "yǎn xí",
      meaning: "maneuver",
      breakdown: "演习 (yǎn xí) - maneuver",
    },
    {
      char: "演绎",
      pinyin: "yǎn yì",
      meaning: "to deduce",
      breakdown: "演绎 (yǎn yì) - to deduce",
    },
    {
      char: "演奏",
      pinyin: "yǎn zòu",
      meaning: "to play a musical instrument",
      breakdown: "演奏 (yǎn zòu) - to play a musical instrument",
    },
    {
      char: "掩盖",
      pinyin: "yǎn gài",
      meaning: "to conceal",
      breakdown: "掩盖 (yǎn gài) - to conceal",
    },
    {
      char: "掩护",
      pinyin: "yǎn hù",
      meaning: "to screen",
      breakdown: "掩护 (yǎn hù) - to screen",
    },
    {
      char: "掩饰",
      pinyin: "yǎn shì",
      meaning: "to conceal a fault",
      breakdown: "掩饰 (yǎn shì) - to conceal a fault",
    },
    {
      char: "眼光",
      pinyin: "yǎn guāng",
      meaning: "gaze",
      breakdown: "眼光 (yǎn guāng) - gaze",
    },
    {
      char: "眼色",
      pinyin: "yǎn sè",
      meaning: "a wink",
      breakdown: "眼色 (yǎn sè) - a wink",
    },
    {
      char: "眼神",
      pinyin: "yǎn shén",
      meaning: "expression or emotion showing in one's eyes",
      breakdown:
        "眼神 (yǎn shén) - expression or emotion showing in one's eyes",
    },
    {
      char: "眼下",
      pinyin: "yǎn xià",
      meaning: "now",
      breakdown: "眼下 (yǎn xià) - now",
    },
    {
      char: "验收",
      pinyin: "yàn shōu",
      meaning: "to check on receipt",
      breakdown: "验收 (yàn shōu) - to check on receipt",
    },
    {
      char: "验证",
      pinyin: "yàn zhèng",
      meaning: "to inspect and verify",
      breakdown: "验证 (yàn zhèng) - to inspect and verify",
    },
    {
      char: "厌恶",
      pinyin: "yàn wù",
      meaning: "to loathe",
      breakdown: "厌恶 (yàn wù) - to loathe",
    },
    {
      char: "氧气",
      pinyin: "yǎng qì",
      meaning: "oxygen",
      breakdown: "氧气 (yǎng qì) - oxygen",
    },
    {
      char: "样品",
      pinyin: "yàng pǐn",
      meaning: "sample",
      breakdown: "样品 (yàng pǐn) - sample",
    },
    {
      char: "摇摆",
      pinyin: "yáo bǎi",
      meaning: "to sway",
      breakdown: "摇摆 (yáo bǎi) - to sway",
    },
    {
      char: "摇滚",
      pinyin: "yáo gǔn",
      meaning: "to shake and boil",
      breakdown: "摇滚 (yáo gǔn) - to shake and boil",
    },
    {
      char: "摇晃",
      pinyin: "yáo huàng",
      meaning: "to rock",
      breakdown: "摇晃 (yáo huàng) - to rock",
    },
    {
      char: "遥控",
      pinyin: "yáo kòng",
      meaning: "remote control",
      breakdown: "遥控 (yáo kòng) - remote control",
    },
    {
      char: "遥远",
      pinyin: "yáo yuǎn",
      meaning: "distant",
      breakdown: "遥远 (yáo yuǎn) - distant",
    },
    {
      char: "谣言",
      pinyin: "yáo yán",
      meaning: "rumor",
      breakdown: "谣言 (yáo yán) - rumor",
    },
    {
      char: "咬牙切齿",
      pinyin: "yǎo yá qiè chǐ",
      meaning: "gnashing one's teeth (idiom); displaying extreme anger",
      breakdown:
        "咬牙切齿 (yǎo yá qiè chǐ) - gnashing one's teeth (idiom); displaying extreme anger",
    },
    {
      char: "要不然",
      pinyin: "yào bù rán",
      meaning: "otherwise",
      breakdown: "要不然 (yào bù rán) - otherwise",
    },
    {
      char: "要点",
      pinyin: "yào diǎn",
      meaning: "main point",
      breakdown: "要点 (yào diǎn) - main point",
    },
    {
      char: "要命",
      pinyin: "yào mìng",
      meaning: "to cause sb's death",
      breakdown: "要命 (yào mìng) - to cause sb's death",
    },
    {
      char: "要素",
      pinyin: "yào sù",
      meaning: "essential factor",
      breakdown: "要素 (yào sù) - essential factor",
    },
    {
      char: "耀眼",
      pinyin: "yào yǎn",
      meaning: "to dazzle",
      breakdown: "耀眼 (yào yǎn) - to dazzle",
    },
    {
      char: "野蛮",
      pinyin: "yě mán",
      meaning: "barbarous",
      breakdown: "野蛮 (yě mán) - barbarous",
    },
    {
      char: "野心",
      pinyin: "yě xīn",
      meaning: "ambition",
      breakdown: "野心 (yě xīn) - ambition",
    },
    {
      char: "一流",
      pinyin: "yī liú",
      meaning: "top quality",
      breakdown: "一流 (yī liú) - top quality",
    },
    {
      char: "依次",
      pinyin: "yī cì",
      meaning: "in order",
      breakdown: "依次 (yī cì) - in order",
    },
    {
      char: "依旧",
      pinyin: "yī jiù",
      meaning: "as before",
      breakdown: "依旧 (yī jiù) - as before",
    },
    {
      char: "依据",
      pinyin: "yī jù",
      meaning: "according to",
      breakdown: "依据 (yī jù) - according to",
    },
    {
      char: "依靠",
      pinyin: "yī kào",
      meaning: "to rely on sth (for support etc)",
      breakdown: "依靠 (yī kào) - to rely on sth (for support etc)",
    },
    {
      char: "依赖",
      pinyin: "yī lài",
      meaning: "to depend on",
      breakdown: "依赖 (yī lài) - to depend on",
    },
    {
      char: "依托",
      pinyin: "yī tuō",
      meaning: "to rely on",
      breakdown: "依托 (yī tuō) - to rely on",
    },
    {
      char: "衣裳",
      pinyin: "yī shang",
      meaning: "clothes",
      breakdown: "衣裳 (yī shang) - clothes",
    },
    {
      char: "一度",
      pinyin: "yī dù",
      meaning: "for a time",
      breakdown: "一度 (yī dù) - for a time",
    },
    {
      char: "一贯",
      pinyin: "yī guàn",
      meaning: "consistent",
      breakdown: "一贯 (yī guàn) - consistent",
    },
    {
      char: "一律",
      pinyin: "yī lǜ",
      meaning: "same",
      breakdown: "一律 (yī lǜ) - same",
    },
    {
      char: "一目了然",
      pinyin: "yī mù liǎo rán",
      meaning: "obvious at a glance (idiom)",
      breakdown: "一目了然 (yī mù liǎo rán) - obvious at a glance (idiom)",
    },
    {
      char: "一向",
      pinyin: "yī xiàng",
      meaning: "always (previously)",
      breakdown: "一向 (yī xiàng) - always (previously)",
    },
    {
      char: "一再",
      pinyin: "yī zài",
      meaning: "repeatedly",
      breakdown: "一再 (yī zài) - repeatedly",
    },
    {
      char: "遗产",
      pinyin: "yí chǎn",
      meaning: "heritage",
      breakdown: "遗产 (yí chǎn) - heritage",
    },
    {
      char: "遗传",
      pinyin: "yí chuán",
      meaning: "heredity",
      breakdown: "遗传 (yí chuán) - heredity",
    },
    {
      char: "遗留",
      pinyin: "yí liú",
      meaning: "(leave or be a) legacy",
      breakdown: "遗留 (yí liú) - (leave or be a) legacy",
    },
    {
      char: "遗失",
      pinyin: "yí shī",
      meaning: "to lose",
      breakdown: "遗失 (yí shī) - to lose",
    },
    {
      char: "疑惑",
      pinyin: "yí huò",
      meaning: "to doubt",
      breakdown: "疑惑 (yí huò) - to doubt",
    },
    {
      char: "仪器",
      pinyin: "yí qì",
      meaning: "instrument",
      breakdown: "仪器 (yí qì) - instrument",
    },
    {
      char: "仪式",
      pinyin: "yí shì",
      meaning: "ceremony",
      breakdown: "仪式 (yí shì) - ceremony",
    },
    {
      char: "以便",
      pinyin: "yǐ biàn",
      meaning: "so that",
      breakdown: "以便 (yǐ biàn) - so that",
    },
    {
      char: "以免",
      pinyin: "yǐ miǎn",
      meaning: "in order to avoid",
      breakdown: "以免 (yǐ miǎn) - in order to avoid",
    },
    {
      char: "以往",
      pinyin: "yǐ wǎng",
      meaning: "in the past",
      breakdown: "以往 (yǐ wǎng) - in the past",
    },
    {
      char: "以至",
      pinyin: "yǐ zhì",
      meaning: "down to",
      breakdown: "以至 (yǐ zhì) - down to",
    },
    {
      char: "以致",
      pinyin: "yǐ zhì",
      meaning: "to such an extent as to",
      breakdown: "以致 (yǐ zhì) - to such an extent as to",
    },
    { char: "亦", pinyin: "yì", meaning: "also", breakdown: "亦 (yì) - also" },
    { char: "翼", pinyin: "yì", meaning: "wing", breakdown: "翼 (yì) - wing" },
    {
      char: "一帆风顺",
      pinyin: "yī fān fēng shùn",
      meaning: "propitious wind throughout the journey (idiom)",
      breakdown:
        "一帆风顺 (yī fān fēng shùn) - propitious wind throughout the journey (idiom)",
    },
    {
      char: "一举两得",
      pinyin: "yī jǔ liǎng dé",
      meaning: "one move",
      breakdown: "一举两得 (yī jǔ liǎng dé) - one move",
    },
    {
      char: "一如既往",
      pinyin: "yī rú jì wǎng",
      meaning: "just as in the past (idiom); as before",
      breakdown:
        "一如既往 (yī rú jì wǎng) - just as in the past (idiom); as before",
    },
    {
      char: "一丝不苟",
      pinyin: "yī sī bù gǒu",
      meaning: "not one thread loose (idiom); strictly according to the rules",
      breakdown:
        "一丝不苟 (yī sī bù gǒu) - not one thread loose (idiom); strictly according to the rules",
    },
    {
      char: "异常",
      pinyin: "yì cháng",
      meaning: "exceptional",
      breakdown: "异常 (yì cháng) - exceptional",
    },
    {
      char: "意料",
      pinyin: "yì liào",
      meaning: "to anticipate",
      breakdown: "意料 (yì liào) - to anticipate",
    },
    {
      char: "意识",
      pinyin: "yì shí",
      meaning: "consciousness",
      breakdown: "意识 (yì shí) - consciousness",
    },
    {
      char: "意图",
      pinyin: "yì tú",
      meaning: "intent",
      breakdown: "意图 (yì tú) - intent",
    },
    {
      char: "意味着",
      pinyin: "yì wèi zhe",
      meaning: "to signify",
      breakdown: "意味着 (yì wèi zhe) - to signify",
    },
    {
      char: "意向",
      pinyin: "yì xiàng",
      meaning: "intention",
      breakdown: "意向 (yì xiàng) - intention",
    },
    {
      char: "意志",
      pinyin: "yì zhì",
      meaning: "will",
      breakdown: "意志 (yì zhì) - will",
    },
    {
      char: "毅力",
      pinyin: "yì lì",
      meaning: "perseverance",
      breakdown: "毅力 (yì lì) - perseverance",
    },
    {
      char: "毅然",
      pinyin: "yì rán",
      meaning: "firmly",
      breakdown: "毅然 (yì rán) - firmly",
    },
    {
      char: "抑制",
      pinyin: "yì zhì",
      meaning: "to inhibit",
      breakdown: "抑制 (yì zhì) - to inhibit",
    },
    {
      char: "阴谋",
      pinyin: "yīn móu",
      meaning: "plot",
      breakdown: "阴谋 (yīn móu) - plot",
    },
    {
      char: "音响",
      pinyin: "yīn xiǎng",
      meaning: "speakers or speaker (electronic)",
      breakdown: "音响 (yīn xiǎng) - speakers or speaker (electronic)",
    },
    {
      char: "隐蔽",
      pinyin: "yǐn bì",
      meaning: "to conceal",
      breakdown: "隐蔽 (yǐn bì) - to conceal",
    },
    {
      char: "隐患",
      pinyin: "yǐn huàn",
      meaning: "a danger concealed within sth",
      breakdown: "隐患 (yǐn huàn) - a danger concealed within sth",
    },
    {
      char: "隐瞒",
      pinyin: "yǐn mán",
      meaning: "to conceal",
      breakdown: "隐瞒 (yǐn mán) - to conceal",
    },
    {
      char: "隐私",
      pinyin: "yǐn sī",
      meaning: "secrets",
      breakdown: "隐私 (yǐn sī) - secrets",
    },
    {
      char: "隐约",
      pinyin: "yǐn yuē",
      meaning: "vague",
      breakdown: "隐约 (yǐn yuē) - vague",
    },
    {
      char: "引导",
      pinyin: "yǐn dǎo",
      meaning: "to guide",
      breakdown: "引导 (yǐn dǎo) - to guide",
    },
    {
      char: "引擎",
      pinyin: "yǐn qíng",
      meaning: "engine (loanword)",
      breakdown: "引擎 (yǐn qíng) - engine (loanword)",
    },
    {
      char: "引用",
      pinyin: "yǐn yòng",
      meaning: "to quote",
      breakdown: "引用 (yǐn yòng) - to quote",
    },
    {
      char: "饮食",
      pinyin: "yǐn shí",
      meaning: "food and drink",
      breakdown: "饮食 (yǐn shí) - food and drink",
    },
    {
      char: "印刷",
      pinyin: "yìn shuā",
      meaning: "print",
      breakdown: "印刷 (yìn shuā) - print",
    },
    {
      char: "婴儿",
      pinyin: "yīng ér",
      meaning: "infant",
      breakdown: "婴儿 (yīng ér) - infant",
    },
    {
      char: "英明",
      pinyin: "yīng míng",
      meaning: "wise",
      breakdown: "英明 (yīng míng) - wise",
    },
    {
      char: "英勇",
      pinyin: "yīng yǒng",
      meaning: "bravery",
      breakdown: "英勇 (yīng yǒng) - bravery",
    },
    {
      char: "迎面",
      pinyin: "yíng miàn",
      meaning: "directly",
      breakdown: "迎面 (yíng miàn) - directly",
    },
    {
      char: "盈利",
      pinyin: "yíng lì",
      meaning: "profit",
      breakdown: "盈利 (yíng lì) - profit",
    },
    {
      char: "荧屏",
      pinyin: "yíng píng",
      meaning: "fluorescent screen",
      breakdown: "荧屏 (yíng píng) - fluorescent screen",
    },
    {
      char: "应酬",
      pinyin: "yìng chou",
      meaning: "social niceties",
      breakdown: "应酬 (yìng chou) - social niceties",
    },
    {
      char: "应邀",
      pinyin: "yìng yāo",
      meaning: "at sb's invitation",
      breakdown: "应邀 (yìng yāo) - at sb's invitation",
    },
    {
      char: "拥护",
      pinyin: "yōng hù",
      meaning: "to endorse",
      breakdown: "拥护 (yōng hù) - to endorse",
    },
    {
      char: "拥有",
      pinyin: "yōng yǒu",
      meaning: "to have",
      breakdown: "拥有 (yōng yǒu) - to have",
    },
    {
      char: "庸俗",
      pinyin: "yōng sú",
      meaning: "filthy",
      breakdown: "庸俗 (yōng sú) - filthy",
    },
    {
      char: "勇于",
      pinyin: "yǒng yú",
      meaning: "to dare to",
      breakdown: "勇于 (yǒng yú) - to dare to",
    },
    {
      char: "永恒",
      pinyin: "yǒng héng",
      meaning: "eternal",
      breakdown: "永恒 (yǒng héng) - eternal",
    },
    {
      char: "涌现",
      pinyin: "yǒng xiàn",
      meaning: "to emerge in large numbers",
      breakdown: "涌现 (yǒng xiàn) - to emerge in large numbers",
    },
    {
      char: "踊跃",
      pinyin: "yǒng yuè",
      meaning: "to leap",
      breakdown: "踊跃 (yǒng yuè) - to leap",
    },
    {
      char: "用功",
      pinyin: "yòng gōng",
      meaning: "diligent",
      breakdown: "用功 (yòng gōng) - diligent",
    },
    {
      char: "用户",
      pinyin: "yòng hù",
      meaning: "user",
      breakdown: "用户 (yòng hù) - user",
    },
    {
      char: "优胜劣汰",
      pinyin: "yōu shèng liè tài",
      meaning: "survival of the fittest (idiom)",
      breakdown:
        "优胜劣汰 (yōu shèng liè tài) - survival of the fittest (idiom)",
    },
    {
      char: "优先",
      pinyin: "yōu xiān",
      meaning: "priority",
      breakdown: "优先 (yōu xiān) - priority",
    },
    {
      char: "优异",
      pinyin: "yōu yì",
      meaning: "exceptional",
      breakdown: "优异 (yōu yì) - exceptional",
    },
    {
      char: "优越",
      pinyin: "yōu yuè",
      meaning: "superior",
      breakdown: "优越 (yōu yuè) - superior",
    },
    {
      char: "忧郁",
      pinyin: "yōu yù",
      meaning: "sullen",
      breakdown: "忧郁 (yōu yù) - sullen",
    },
    {
      char: "油腻",
      pinyin: "yóu nì",
      meaning: "grease",
      breakdown: "油腻 (yóu nì) - grease",
    },
    {
      char: "油漆",
      pinyin: "yóu qī",
      meaning: "oil paints",
      breakdown: "油漆 (yóu qī) - oil paints",
    },
    {
      char: "犹如",
      pinyin: "yóu rú",
      meaning: "similar to",
      breakdown: "犹如 (yóu rú) - similar to",
    },
    {
      char: "有条不紊",
      pinyin: "yǒu tiáo bù wěn",
      meaning: "regular and thorough (idiom); methodically arranged",
      breakdown:
        "有条不紊 (yǒu tiáo bù wěn) - regular and thorough (idiom); methodically arranged",
    },
    {
      char: "幼稚",
      pinyin: "yòu zhì",
      meaning: "young",
      breakdown: "幼稚 (yòu zhì) - young",
    },
    {
      char: "诱惑",
      pinyin: "yòu huò",
      meaning: "to entice",
      breakdown: "诱惑 (yòu huò) - to entice",
    },
    {
      char: "愚蠢",
      pinyin: "yú chǔn",
      meaning: "silly",
      breakdown: "愚蠢 (yú chǔn) - silly",
    },
    {
      char: "愚昧",
      pinyin: "yú mèi",
      meaning: "ignorant",
      breakdown: "愚昧 (yú mèi) - ignorant",
    },
    {
      char: "舆论",
      pinyin: "yú lùn",
      meaning: "public opinion",
      breakdown: "舆论 (yú lùn) - public opinion",
    },
    {
      char: "渔民",
      pinyin: "yú mín",
      meaning: "fisherman",
      breakdown: "渔民 (yú mín) - fisherman",
    },
    {
      char: "与日俱增",
      pinyin: "yǔ rì jù zēng",
      meaning: "to increase steadily",
      breakdown: "与日俱增 (yǔ rì jù zēng) - to increase steadily",
    },
    {
      char: "羽绒服",
      pinyin: "yǔ róng fú",
      meaning: "down-filled garment",
      breakdown: "羽绒服 (yǔ róng fú) - down-filled garment",
    },
    {
      char: "予以",
      pinyin: "yǔ yǐ",
      meaning: "to give",
      breakdown: "予以 (yǔ yǐ) - to give",
    },
    {
      char: "愈",
      pinyin: "yù",
      meaning: "to heal",
      breakdown: "愈 (yù) - to heal",
    },
    {
      char: "预料",
      pinyin: "yù liào",
      meaning: "to forecast",
      breakdown: "预料 (yù liào) - to forecast",
    },
    {
      char: "预期",
      pinyin: "yù qī",
      meaning: "to expect",
      breakdown: "预期 (yù qī) - to expect",
    },
    {
      char: "预赛",
      pinyin: "yù sài",
      meaning: "preliminary competition",
      breakdown: "预赛 (yù sài) - preliminary competition",
    },
    {
      char: "预算",
      pinyin: "yù suàn",
      meaning: "budget",
      breakdown: "预算 (yù suàn) - budget",
    },
    {
      char: "预先",
      pinyin: "yù xiān",
      meaning: "beforehand",
      breakdown: "预先 (yù xiān) - beforehand",
    },
    {
      char: "预言",
      pinyin: "yù yán",
      meaning: "to predict",
      breakdown: "预言 (yù yán) - to predict",
    },
    {
      char: "预兆",
      pinyin: "yù zhào",
      meaning: "omen",
      breakdown: "预兆 (yù zhào) - omen",
    },
    {
      char: "欲望",
      pinyin: "yù wàng",
      meaning: "desire",
      breakdown: "欲望 (yù wàng) - desire",
    },
    {
      char: "寓言",
      pinyin: "yù yán",
      meaning: "fable",
      breakdown: "寓言 (yù yán) - fable",
    },
    {
      char: "冤枉",
      pinyin: "yuān wang",
      meaning: "hatred",
      breakdown: "冤枉 (yuān wang) - hatred",
    },
    {
      char: "元首",
      pinyin: "yuán shǒu",
      meaning: "head of state",
      breakdown: "元首 (yuán shǒu) - head of state",
    },
    {
      char: "元素",
      pinyin: "yuán sù",
      meaning: "element",
      breakdown: "元素 (yuán sù) - element",
    },
    {
      char: "元宵节",
      pinyin: "Yuán xiāo jié",
      meaning: "Lantern Festival",
      breakdown: "元宵节 (Yuán xiāo jié) - Lantern Festival",
    },
    {
      char: "圆满",
      pinyin: "yuán mǎn",
      meaning: "satisfactory",
      breakdown: "圆满 (yuán mǎn) - satisfactory",
    },
    {
      char: "原告",
      pinyin: "yuán gào",
      meaning: "complainant",
      breakdown: "原告 (yuán gào) - complainant",
    },
    {
      char: "原理",
      pinyin: "yuán lǐ",
      meaning: "principle",
      breakdown: "原理 (yuán lǐ) - principle",
    },
    {
      char: "原始",
      pinyin: "yuán shǐ",
      meaning: "first",
      breakdown: "原始 (yuán shǐ) - first",
    },
    {
      char: "原先",
      pinyin: "yuán xiān",
      meaning: "former",
      breakdown: "原先 (yuán xiān) - former",
    },
    {
      char: "园林",
      pinyin: "yuán lín",
      meaning: "gardens",
      breakdown: "园林 (yuán lín) - gardens",
    },
    {
      char: "源泉",
      pinyin: "yuán quán",
      meaning: "fountainhead",
      breakdown: "源泉 (yuán quán) - fountainhead",
    },
    {
      char: "约束",
      pinyin: "yuē shù",
      meaning: "to restrict",
      breakdown: "约束 (yuē shù) - to restrict",
    },
    {
      char: "岳父",
      pinyin: "yuè fù",
      meaning: "wife's father",
      breakdown: "岳父 (yuè fù) - wife's father",
    },
    {
      char: "乐谱",
      pinyin: "yuè pǔ",
      meaning: "a musical score",
      breakdown: "乐谱 (yuè pǔ) - a musical score",
    },
    {
      char: "熨",
      pinyin: "yùn",
      meaning: "an iron",
      breakdown: "熨 (yùn) - an iron",
    },
    {
      char: "蕴藏",
      pinyin: "yùn cáng",
      meaning: "to hold in store",
      breakdown: "蕴藏 (yùn cáng) - to hold in store",
    },
    {
      char: "运算",
      pinyin: "yùn suàn",
      meaning: "(mathematical) operation",
      breakdown: "运算 (yùn suàn) - (mathematical) operation",
    },
    {
      char: "运行",
      pinyin: "yùn xíng",
      meaning: "to be in motion",
      breakdown: "运行 (yùn xíng) - to be in motion",
    },
    {
      char: "酝酿",
      pinyin: "yùn niàng",
      meaning: "(of alcohol) to ferment",
      breakdown: "酝酿 (yùn niàng) - (of alcohol) to ferment",
    },
    {
      char: "孕育",
      pinyin: "yùn yù",
      meaning: "to be pregnant",
      breakdown: "孕育 (yùn yù) - to be pregnant",
    },
    {
      char: "砸",
      pinyin: "zá",
      meaning: "smash",
      breakdown: "砸 (zá) - smash",
    },
    {
      char: "杂技",
      pinyin: "zá jì",
      meaning: "acrobatics",
      breakdown: "杂技 (zá jì) - acrobatics",
    },
    {
      char: "杂交",
      pinyin: "zá jiāo",
      meaning: "a hybrid",
      breakdown: "杂交 (zá jiāo) - a hybrid",
    },
    {
      char: "咋",
      pinyin: "zǎ",
      meaning: "dialectal equivalent of 怎麼|怎么[zěn me]",
      breakdown: "咋 (zǎ) - dialectal equivalent of 怎麼|怎么[zěn me]",
    },
    {
      char: "灾难",
      pinyin: "zāi nàn",
      meaning: "disaster",
      breakdown: "灾难 (zāi nàn) - disaster",
    },
    {
      char: "栽培",
      pinyin: "zāi péi",
      meaning: "to grow",
      breakdown: "栽培 (zāi péi) - to grow",
    },
    {
      char: "宰",
      pinyin: "zǎi",
      meaning: "to slaughter livestock",
      breakdown: "宰 (zǎi) - to slaughter livestock",
    },
    {
      char: "在乎",
      pinyin: "zài hu",
      meaning: "determined by",
      breakdown: "在乎 (zài hu) - determined by",
    },
    {
      char: "在意",
      pinyin: "zài yì",
      meaning: "to care about",
      breakdown: "在意 (zài yì) - to care about",
    },
    {
      char: "再接再厉",
      pinyin: "zài jiē zài lì",
      meaning: "to continue the struggle (idiom); to persist",
      breakdown:
        "再接再厉 (zài jiē zài lì) - to continue the struggle (idiom); to persist",
    },
    {
      char: "攒",
      pinyin: "zǎn",
      meaning: "to collect",
      breakdown: "攒 (zǎn) - to collect",
    },
    {
      char: "赞叹",
      pinyin: "zàn tàn",
      meaning: "to sigh or gasp in admiration",
      breakdown: "赞叹 (zàn tàn) - to sigh or gasp in admiration",
    },
    {
      char: "赞同",
      pinyin: "zàn tóng",
      meaning: "to approve of",
      breakdown: "赞同 (zàn tóng) - to approve of",
    },
    {
      char: "赞扬",
      pinyin: "zàn yáng",
      meaning: "to praise",
      breakdown: "赞扬 (zàn yáng) - to praise",
    },
    {
      char: "赞助",
      pinyin: "zàn zhù",
      meaning: "to support",
      breakdown: "赞助 (zàn zhù) - to support",
    },
    {
      char: "暂且",
      pinyin: "zàn qiě",
      meaning: "for now",
      breakdown: "暂且 (zàn qiě) - for now",
    },
    {
      char: "糟蹋",
      pinyin: "zāo tà",
      meaning: "to waste",
      breakdown: "糟蹋 (zāo tà) - to waste",
    },
    {
      char: "遭受",
      pinyin: "zāo shòu",
      meaning: "to suffer",
      breakdown: "遭受 (zāo shòu) - to suffer",
    },
    {
      char: "遭殃",
      pinyin: "zāo yāng",
      meaning: "to suffer a calamity",
      breakdown: "遭殃 (zāo yāng) - to suffer a calamity",
    },
    {
      char: "遭遇",
      pinyin: "zāo yù",
      meaning: "to meet with",
      breakdown: "遭遇 (zāo yù) - to meet with",
    },
    {
      char: "造反",
      pinyin: "zào fǎn",
      meaning: "to rebel",
      breakdown: "造反 (zào fǎn) - to rebel",
    },
    {
      char: "造型",
      pinyin: "zào xíng",
      meaning: "modeling",
      breakdown: "造型 (zào xíng) - modeling",
    },
    {
      char: "噪音",
      pinyin: "zào yīn",
      meaning: "rumble",
      breakdown: "噪音 (zào yīn) - rumble",
    },
    {
      char: "责怪",
      pinyin: "zé guài",
      meaning: "to blame",
      breakdown: "责怪 (zé guài) - to blame",
    },
    {
      char: "贼",
      pinyin: "zéi",
      meaning: "thief",
      breakdown: "贼 (zéi) - thief",
    },
    {
      char: "增添",
      pinyin: "zēng tiān",
      meaning: "to add",
      breakdown: "增添 (zēng tiān) - to add",
    },
    {
      char: "赠送",
      pinyin: "zèng sòng",
      meaning: "to present as a gift",
      breakdown: "赠送 (zèng sòng) - to present as a gift",
    },
    {
      char: "渣",
      pinyin: "zhā",
      meaning: "slag (in mining or smelting)",
      breakdown: "渣 (zhā) - slag (in mining or smelting)",
    },
    {
      char: "扎",
      pinyin: "zhā",
      meaning: "to prick",
      breakdown: "扎 (zhā) - to prick",
    },
    {
      char: "扎实",
      pinyin: "zhā shi",
      meaning: "strong",
      breakdown: "扎实 (zhā shi) - strong",
    },
    {
      char: "眨",
      pinyin: "zhǎ",
      meaning: "to blink",
      breakdown: "眨 (zhǎ) - to blink",
    },
    {
      char: "诈骗",
      pinyin: "zhà piàn",
      meaning: "to defraud",
      breakdown: "诈骗 (zhà piàn) - to defraud",
    },
    {
      char: "摘要",
      pinyin: "zhāi yào",
      meaning: "summary",
      breakdown: "摘要 (zhāi yào) - summary",
    },
    {
      char: "债券",
      pinyin: "zhài quàn",
      meaning: "bond",
      breakdown: "债券 (zhài quàn) - bond",
    },
    {
      char: "沾光",
      pinyin: "zhān guāng",
      meaning: "to bask in the light",
      breakdown: "沾光 (zhān guāng) - to bask in the light",
    },
    {
      char: "瞻仰",
      pinyin: "zhān yǎng",
      meaning: "to revere",
      breakdown: "瞻仰 (zhān yǎng) - to revere",
    },
    {
      char: "斩钉截铁",
      pinyin: "zhǎn dīng jié tiě",
      meaning:
        "to chop the nail and slice the iron (idiom); resolute and decisive",
      breakdown:
        "斩钉截铁 (zhǎn dīng jié tiě) - to chop the nail and slice the iron (idiom); resolute and decisive",
    },
    {
      char: "展示",
      pinyin: "zhǎn shì",
      meaning: "to reveal",
      breakdown: "展示 (zhǎn shì) - to reveal",
    },
    {
      char: "展望",
      pinyin: "zhǎn wàng",
      meaning: "outlook",
      breakdown: "展望 (zhǎn wàng) - outlook",
    },
    {
      char: "展现",
      pinyin: "zhǎn xiàn",
      meaning: "to come out",
      breakdown: "展现 (zhǎn xiàn) - to come out",
    },
    {
      char: "崭新",
      pinyin: "zhǎn xīn",
      meaning: "brand new",
      breakdown: "崭新 (zhǎn xīn) - brand new",
    },
    {
      char: "战斗",
      pinyin: "zhàn dòu",
      meaning: "to fight",
      breakdown: "战斗 (zhàn dòu) - to fight",
    },
    {
      char: "战略",
      pinyin: "zhàn lvè",
      meaning: "strategy",
      breakdown: "战略 (zhàn lvè) - strategy",
    },
    {
      char: "战术",
      pinyin: "zhàn shù",
      meaning: "tactics",
      breakdown: "战术 (zhàn shù) - tactics",
    },
    {
      char: "战役",
      pinyin: "zhàn yì",
      meaning: "military campaign",
      breakdown: "战役 (zhàn yì) - military campaign",
    },
    {
      char: "占据",
      pinyin: "zhàn jù",
      meaning: "to occupy",
      breakdown: "占据 (zhàn jù) - to occupy",
    },
    {
      char: "占领",
      pinyin: "zhàn lǐng",
      meaning: "to occupy (a territory)",
      breakdown: "占领 (zhàn lǐng) - to occupy (a territory)",
    },
    {
      char: "占有",
      pinyin: "zhàn yǒu",
      meaning: "to have",
      breakdown: "占有 (zhàn yǒu) - to have",
    },
    {
      char: "章程",
      pinyin: "zhāng chéng",
      meaning: "rules",
      breakdown: "章程 (zhāng chéng) - rules",
    },
    {
      char: "长辈",
      pinyin: "zhǎng bèi",
      meaning: "one's elders",
      breakdown: "长辈 (zhǎng bèi) - one's elders",
    },
    {
      char: "障碍",
      pinyin: "zhàng ài",
      meaning: "barrier",
      breakdown: "障碍 (zhàng ài) - barrier",
    },
    {
      char: "帐篷",
      pinyin: "zhàng peng",
      meaning: "tent",
      breakdown: "帐篷 (zhàng peng) - tent",
    },
    {
      char: "招收",
      pinyin: "zhāo shōu",
      meaning: "to hire",
      breakdown: "招收 (zhāo shōu) - to hire",
    },
    {
      char: "招投标",
      pinyin: "zhāo tóu biāo",
      meaning: "bid inviting and bid offering",
      breakdown: "招投标 (zhāo tóu biāo) - bid inviting and bid offering",
    },
    {
      char: "朝气蓬勃",
      pinyin: "zhāo qì péng bó",
      meaning: "full of youthful energy (idiom); vigorous",
      breakdown:
        "朝气蓬勃 (zhāo qì péng bó) - full of youthful energy (idiom); vigorous",
    },
    {
      char: "着迷",
      pinyin: "zháo mí",
      meaning: "to be fascinated",
      breakdown: "着迷 (zháo mí) - to be fascinated",
    },
    {
      char: "沼泽",
      pinyin: "zhǎo zé",
      meaning: "marsh",
      breakdown: "沼泽 (zhǎo zé) - marsh",
    },
    {
      char: "照料",
      pinyin: "zhào liào",
      meaning: "to tend",
      breakdown: "照料 (zhào liào) - to tend",
    },
    {
      char: "照样",
      pinyin: "zhào yàng",
      meaning: "as before",
      breakdown: "照样 (zhào yàng) - as before",
    },
    {
      char: "照耀",
      pinyin: "zhào yào",
      meaning: "to shine",
      breakdown: "照耀 (zhào yào) - to shine",
    },
    {
      char: "照应",
      pinyin: "zhào yìng",
      meaning: "to correlate with",
      breakdown: "照应 (zhào yìng) - to correlate with",
    },
    {
      char: "遮挡",
      pinyin: "zhē dǎng",
      meaning: "to shelter",
      breakdown: "遮挡 (zhē dǎng) - to shelter",
    },
    {
      char: "折腾",
      pinyin: "zhē teng",
      meaning: "to toss from side to side (e.g. sleeplessly)",
      breakdown:
        "折腾 (zhē teng) - to toss from side to side (e.g. sleeplessly)",
    },
    {
      char: "折",
      pinyin: "zhé",
      meaning: "variant of 折[zhé]",
      breakdown: "折 (zhé) - variant of 折[zhé]",
    },
    {
      char: "折磨",
      pinyin: "zhé mó",
      meaning: "to persecute",
      breakdown: "折磨 (zhé mó) - to persecute",
    },
    {
      char: "真相",
      pinyin: "zhēn xiàng",
      meaning: "the truth about sth",
      breakdown: "真相 (zhēn xiàng) - the truth about sth",
    },
    {
      char: "真挚",
      pinyin: "zhēn zhì",
      meaning: "sincere",
      breakdown: "真挚 (zhēn zhì) - sincere",
    },
    {
      char: "珍贵",
      pinyin: "zhēn guì",
      meaning: "precious",
      breakdown: "珍贵 (zhēn guì) - precious",
    },
    {
      char: "珍稀",
      pinyin: "zhēn xī",
      meaning: "rare",
      breakdown: "珍稀 (zhēn xī) - rare",
    },
    {
      char: "珍珠",
      pinyin: "zhēn zhū",
      meaning: "pearl",
      breakdown: "珍珠 (zhēn zhū) - pearl",
    },
    {
      char: "侦探",
      pinyin: "zhēn tàn",
      meaning: "detective",
      breakdown: "侦探 (zhēn tàn) - detective",
    },
    {
      char: "斟酌",
      pinyin: "zhēn zhuó",
      meaning: "to consider",
      breakdown: "斟酌 (zhēn zhuó) - to consider",
    },
    {
      char: "阵地",
      pinyin: "zhèn dì",
      meaning: "position",
      breakdown: "阵地 (zhèn dì) - position",
    },
    {
      char: "阵容",
      pinyin: "zhèn róng",
      meaning: "troop arrangement",
      breakdown: "阵容 (zhèn róng) - troop arrangement",
    },
    {
      char: "镇定",
      pinyin: "zhèn dìng",
      meaning: "calm",
      breakdown: "镇定 (zhèn dìng) - calm",
    },
    {
      char: "镇静",
      pinyin: "zhèn jìng",
      meaning: "calm",
      breakdown: "镇静 (zhèn jìng) - calm",
    },
    {
      char: "镇压",
      pinyin: "zhèn yā",
      meaning: "suppression",
      breakdown: "镇压 (zhèn yā) - suppression",
    },
    {
      char: "振奋",
      pinyin: "zhèn fèn",
      meaning: "to stir oneself up",
      breakdown: "振奋 (zhèn fèn) - to stir oneself up",
    },
    {
      char: "振兴",
      pinyin: "zhèn xīng",
      meaning: "to revive",
      breakdown: "振兴 (zhèn xīng) - to revive",
    },
    {
      char: "震惊",
      pinyin: "zhèn jīng",
      meaning: "to shock",
      breakdown: "震惊 (zhèn jīng) - to shock",
    },
    {
      char: "争端",
      pinyin: "zhēng duān",
      meaning: "dispute",
      breakdown: "争端 (zhēng duān) - dispute",
    },
    {
      char: "争夺",
      pinyin: "zhēng duó",
      meaning: "to fight over",
      breakdown: "争夺 (zhēng duó) - to fight over",
    },
    {
      char: "争气",
      pinyin: "zhēng qì",
      meaning: "to work hard for sth",
      breakdown: "争气 (zhēng qì) - to work hard for sth",
    },
    {
      char: "争先恐后",
      pinyin: "zhēng xiān kǒng hòu",
      meaning:
        "striving to be first and fearing to be last (idiom); outdoing one another",
      breakdown:
        "争先恐后 (zhēng xiān kǒng hòu) - striving to be first and fearing to be last (idiom); outdoing one another",
    },
    {
      char: "争议",
      pinyin: "zhēng yì",
      meaning: "controversy",
      breakdown: "争议 (zhēng yì) - controversy",
    },
    {
      char: "蒸发",
      pinyin: "zhēng fā",
      meaning: "to evaporate",
      breakdown: "蒸发 (zhēng fā) - to evaporate",
    },
    {
      char: "征服",
      pinyin: "zhēng fú",
      meaning: "to conquer",
      breakdown: "征服 (zhēng fú) - to conquer",
    },
    {
      char: "征收",
      pinyin: "zhēng shōu",
      meaning: "to levy (a fine)",
      breakdown: "征收 (zhēng shōu) - to levy (a fine)",
    },
    {
      char: "正月",
      pinyin: "zhēng yuè",
      meaning: "first month of the lunar year",
      breakdown: "正月 (zhēng yuè) - first month of the lunar year",
    },
    {
      char: "挣扎",
      pinyin: "zhēng zhá",
      meaning: "to struggle",
      breakdown: "挣扎 (zhēng zhá) - to struggle",
    },
    {
      char: "整顿",
      pinyin: "zhěng dùn",
      meaning: "to tidy up",
      breakdown: "整顿 (zhěng dùn) - to tidy up",
    },
    {
      char: "正当",
      pinyin: "zhèng dāng",
      meaning: "honest",
      breakdown: "正当 (zhèng dāng) - honest",
    },
    {
      char: "正负",
      pinyin: "zhèng fù",
      meaning: "positive and negative",
      breakdown: "正负 (zhèng fù) - positive and negative",
    },
    {
      char: "正规",
      pinyin: "zhèng guī",
      meaning: "regular",
      breakdown: "正规 (zhèng guī) - regular",
    },
    {
      char: "正经",
      pinyin: "zhèng jīng",
      meaning: "decent",
      breakdown: "正经 (zhèng jīng) - decent",
    },
    {
      char: "正气",
      pinyin: "zhèng qì",
      meaning: "healthy environment",
      breakdown: "正气 (zhèng qì) - healthy environment",
    },
    {
      char: "正义",
      pinyin: "zhèng yì",
      meaning: "justice",
      breakdown: "正义 (zhèng yì) - justice",
    },
    {
      char: "政权",
      pinyin: "zhèng quán",
      meaning: "regime",
      breakdown: "政权 (zhèng quán) - regime",
    },
    {
      char: "证实",
      pinyin: "zhèng shí",
      meaning: "to confirm (sth to be true)",
      breakdown: "证实 (zhèng shí) - to confirm (sth to be true)",
    },
    {
      char: "证书",
      pinyin: "zhèng shū",
      meaning: "credentials",
      breakdown: "证书 (zhèng shū) - credentials",
    },
    {
      char: "郑重",
      pinyin: "zhèng zhòng",
      meaning: "serious",
      breakdown: "郑重 (zhèng zhòng) - serious",
    },
    {
      char: "症状",
      pinyin: "zhèng zhuàng",
      meaning: "symptom (of an illness)",
      breakdown: "症状 (zhèng zhuàng) - symptom (of an illness)",
    },
    {
      char: "枝",
      pinyin: "zhī",
      meaning: "branch",
      breakdown: "枝 (zhī) - branch",
    },
    {
      char: "支撑",
      pinyin: "zhī chēng",
      meaning: "to prop up",
      breakdown: "支撑 (zhī chēng) - to prop up",
    },
    {
      char: "支出",
      pinyin: "zhī chū",
      meaning: "to spend",
      breakdown: "支出 (zhī chū) - to spend",
    },
    {
      char: "支流",
      pinyin: "zhī liú",
      meaning: "tributary (river)",
      breakdown: "支流 (zhī liú) - tributary (river)",
    },
    {
      char: "支配",
      pinyin: "zhī pèi",
      meaning: "to control",
      breakdown: "支配 (zhī pèi) - to control",
    },
    {
      char: "支援",
      pinyin: "zhī yuán",
      meaning: "to provide assistance",
      breakdown: "支援 (zhī yuán) - to provide assistance",
    },
    {
      char: "支柱",
      pinyin: "zhī zhù",
      meaning: "mainstay",
      breakdown: "支柱 (zhī zhù) - mainstay",
    },
    {
      char: "知觉",
      pinyin: "zhī jué",
      meaning: "perception",
      breakdown: "知觉 (zhī jué) - perception",
    },
    {
      char: "知足常乐",
      pinyin: "zhī zú cháng lè",
      meaning: "satisfied with what one has (idiom)",
      breakdown:
        "知足常乐 (zhī zú cháng lè) - satisfied with what one has (idiom)",
    },
    {
      char: "脂肪",
      pinyin: "zhī fáng",
      meaning: "body fat",
      breakdown: "脂肪 (zhī fáng) - body fat",
    },
    {
      char: "直播",
      pinyin: "zhí bō",
      meaning: "live broadcast (not recorded)",
      breakdown: "直播 (zhí bō) - live broadcast (not recorded)",
    },
    {
      char: "值班",
      pinyin: "zhí bān",
      meaning: "to work a shift",
      breakdown: "值班 (zhí bān) - to work a shift",
    },
    {
      char: "殖民地",
      pinyin: "zhí mín dì",
      meaning: "colony",
      breakdown: "殖民地 (zhí mín dì) - colony",
    },
    {
      char: "职能",
      pinyin: "zhí néng",
      meaning: "function",
      breakdown: "职能 (zhí néng) - function",
    },
    {
      char: "职位",
      pinyin: "zhí wèi",
      meaning: "post",
      breakdown: "职位 (zhí wèi) - post",
    },
    {
      char: "职务",
      pinyin: "zhí wù",
      meaning: "post",
      breakdown: "职务 (zhí wù) - post",
    },
    {
      char: "指标",
      pinyin: "zhǐ biāo",
      meaning: "norm",
      breakdown: "指标 (zhǐ biāo) - norm",
    },
    {
      char: "指定",
      pinyin: "zhǐ dìng",
      meaning: "to appoint",
      breakdown: "指定 (zhǐ dìng) - to appoint",
    },
    {
      char: "指甲",
      pinyin: "zhǐ jia",
      meaning: "fingernail",
      breakdown: "指甲 (zhǐ jia) - fingernail",
    },
    {
      char: "指令",
      pinyin: "zhǐ lìng",
      meaning: "order",
      breakdown: "指令 (zhǐ lìng) - order",
    },
    {
      char: "指南针",
      pinyin: "zhǐ nán zhēn",
      meaning: "compass",
      breakdown: "指南针 (zhǐ nán zhēn) - compass",
    },
    {
      char: "指示",
      pinyin: "zhǐ shì",
      meaning: "to point out",
      breakdown: "指示 (zhǐ shì) - to point out",
    },
    {
      char: "指望",
      pinyin: "zhǐ wàng",
      meaning: "to hope for sth",
      breakdown: "指望 (zhǐ wàng) - to hope for sth",
    },
    {
      char: "指责",
      pinyin: "zhǐ zé",
      meaning: "to criticize",
      breakdown: "指责 (zhǐ zé) - to criticize",
    },
    {
      char: "治安",
      pinyin: "zhì ān",
      meaning: "law and order",
      breakdown: "治安 (zhì ān) - law and order",
    },
    {
      char: "治理",
      pinyin: "zhì lǐ",
      meaning: "to govern",
      breakdown: "治理 (zhì lǐ) - to govern",
    },
    {
      char: "制裁",
      pinyin: "zhì cái",
      meaning: "to punish",
      breakdown: "制裁 (zhì cái) - to punish",
    },
    {
      char: "制订",
      pinyin: "zhì dìng",
      meaning: "to work out",
      breakdown: "制订 (zhì dìng) - to work out",
    },
    {
      char: "制服",
      pinyin: "zhì fú",
      meaning: "to subdue",
      breakdown: "制服 (zhì fú) - to subdue",
    },
    {
      char: "制约",
      pinyin: "zhì yuē",
      meaning: "to restrict",
      breakdown: "制约 (zhì yuē) - to restrict",
    },
    {
      char: "制止",
      pinyin: "zhì zhǐ",
      meaning: "to curb",
      breakdown: "制止 (zhì zhǐ) - to curb",
    },
    {
      char: "致辞",
      pinyin: "zhì cí",
      meaning: "to express in words or writing",
      breakdown: "致辞 (zhì cí) - to express in words or writing",
    },
    {
      char: "致力于",
      pinyin: "zhì lì yú",
      meaning: "Committed to",
      breakdown: "致力于 (zhì lì yú) - Committed to",
    },
    {
      char: "致使",
      pinyin: "zhì shǐ",
      meaning: "to cause",
      breakdown: "致使 (zhì shǐ) - to cause",
    },
    {
      char: "智力",
      pinyin: "zhì lì",
      meaning: "intelligence",
      breakdown: "智力 (zhì lì) - intelligence",
    },
    {
      char: "智能",
      pinyin: "zhì néng",
      meaning: "intelligent",
      breakdown: "智能 (zhì néng) - intelligent",
    },
    {
      char: "智商",
      pinyin: "zhì shāng",
      meaning: "IQ (intelligence quotient)",
      breakdown: "智商 (zhì shāng) - IQ (intelligence quotient)",
    },
    {
      char: "滞留",
      pinyin: "zhì liú",
      meaning: "to detain",
      breakdown: "滞留 (zhì liú) - to detain",
    },
    {
      char: "志气",
      pinyin: "zhì qì",
      meaning: "ambition",
      breakdown: "志气 (zhì qì) - ambition",
    },
    {
      char: "忠诚",
      pinyin: "zhōng chéng",
      meaning: "devoted",
      breakdown: "忠诚 (zhōng chéng) - devoted",
    },
    {
      char: "忠实",
      pinyin: "zhōng shí",
      meaning: "faithful",
      breakdown: "忠实 (zhōng shí) - faithful",
    },
    {
      char: "终点",
      pinyin: "zhōng diǎn",
      meaning: "the end",
      breakdown: "终点 (zhōng diǎn) - the end",
    },
    {
      char: "终究",
      pinyin: "zhōng jiū",
      meaning: "in the end",
      breakdown: "终究 (zhōng jiū) - in the end",
    },
    {
      char: "终年",
      pinyin: "zhōng nián",
      meaning: "entire year",
      breakdown: "终年 (zhōng nián) - entire year",
    },
    {
      char: "终身",
      pinyin: "zhōng shēn",
      meaning: "lifelong",
      breakdown: "终身 (zhōng shēn) - lifelong",
    },
    {
      char: "终止",
      pinyin: "zhōng zhǐ",
      meaning: "to stop",
      breakdown: "终止 (zhōng zhǐ) - to stop",
    },
    {
      char: "中断",
      pinyin: "zhōng duàn",
      meaning: "to cut short",
      breakdown: "中断 (zhōng duàn) - to cut short",
    },
    {
      char: "中立",
      pinyin: "zhōng lì",
      meaning: "neutral",
      breakdown: "中立 (zhōng lì) - neutral",
    },
    {
      char: "中央",
      pinyin: "zhōng yāng",
      meaning: "central",
      breakdown: "中央 (zhōng yāng) - central",
    },
    {
      char: "衷心",
      pinyin: "zhōng xīn",
      meaning: "heartfelt",
      breakdown: "衷心 (zhōng xīn) - heartfelt",
    },
    {
      char: "种子",
      pinyin: "zhǒng zi",
      meaning: "seed",
      breakdown: "种子 (zhǒng zi) - seed",
    },
    {
      char: "种族",
      pinyin: "zhǒng zú",
      meaning: "race",
      breakdown: "种族 (zhǒng zú) - race",
    },
    {
      char: "肿瘤",
      pinyin: "zhǒng liú",
      meaning: "tumor",
      breakdown: "肿瘤 (zhǒng liú) - tumor",
    },
    {
      char: "重心",
      pinyin: "zhòng xīn",
      meaning: "center of gravity",
      breakdown: "重心 (zhòng xīn) - center of gravity",
    },
    {
      char: "众所周知",
      pinyin: "zhòng suǒ zhōu zhī",
      meaning: "see 眾所周知|众所周知[zhòng suǒ zhōu zhī]",
      breakdown:
        "众所周知 (zhòng suǒ zhōu zhī) - see 眾所周知|众所周知[zhòng suǒ zhōu zhī]",
    },
    {
      char: "州",
      pinyin: "zhōu",
      meaning: "prefecture",
      breakdown: "州 (zhōu) - prefecture",
    },
    {
      char: "舟",
      pinyin: "zhōu",
      meaning: "boat",
      breakdown: "舟 (zhōu) - boat",
    },
    {
      char: "粥",
      pinyin: "zhōu",
      meaning: "congee",
      breakdown: "粥 (zhōu) - congee",
    },
    {
      char: "周边",
      pinyin: "zhōu biān",
      meaning: "periphery",
      breakdown: "周边 (zhōu biān) - periphery",
    },
    {
      char: "周密",
      pinyin: "zhōu mì",
      meaning: "careful",
      breakdown: "周密 (zhōu mì) - careful",
    },
    {
      char: "周年",
      pinyin: "zhōu nián",
      meaning: "anniversary",
      breakdown: "周年 (zhōu nián) - anniversary",
    },
    {
      char: "周期",
      pinyin: "zhōu qī",
      meaning: "period",
      breakdown: "周期 (zhōu qī) - period",
    },
    {
      char: "周折",
      pinyin: "zhōu zhé",
      meaning: "complication",
      breakdown: "周折 (zhōu zhé) - complication",
    },
    {
      char: "周转",
      pinyin: "zhōu zhuǎn",
      meaning: "turnover (in cash or personnel)",
      breakdown: "周转 (zhōu zhuǎn) - turnover (in cash or personnel)",
    },
    {
      char: "皱纹",
      pinyin: "zhòu wén",
      meaning: "wrinkle",
      breakdown: "皱纹 (zhòu wén) - wrinkle",
    },
    {
      char: "昼夜",
      pinyin: "zhòu yè",
      meaning: "day and night",
      breakdown: "昼夜 (zhòu yè) - day and night",
    },
    {
      char: "株",
      pinyin: "zhū",
      meaning: "tree trunk",
      breakdown: "株 (zhū) - tree trunk",
    },
    {
      char: "诸位",
      pinyin: "zhū wèi",
      meaning: "(pron) everyone",
      breakdown: "诸位 (zhū wèi) - (pron) everyone",
    },
    {
      char: "逐年",
      pinyin: "zhú nián",
      meaning: "year after year",
      breakdown: "逐年 (zhú nián) - year after year",
    },
    {
      char: "拄",
      pinyin: "zhǔ",
      meaning: "to lean on",
      breakdown: "拄 (zhǔ) - to lean on",
    },
    {
      char: "主办",
      pinyin: "zhǔ bàn",
      meaning: "to organize",
      breakdown: "主办 (zhǔ bàn) - to organize",
    },
    {
      char: "主导",
      pinyin: "zhǔ dǎo",
      meaning: "to lead",
      breakdown: "主导 (zhǔ dǎo) - to lead",
    },
    {
      char: "主管",
      pinyin: "zhǔ guǎn",
      meaning: "in charge",
      breakdown: "主管 (zhǔ guǎn) - in charge",
    },
    {
      char: "主流",
      pinyin: "zhǔ liú",
      meaning: "main stream (of a river)",
      breakdown: "主流 (zhǔ liú) - main stream (of a river)",
    },
    {
      char: "主权",
      pinyin: "zhǔ quán",
      meaning: "sovereignty",
      breakdown: "主权 (zhǔ quán) - sovereignty",
    },
    {
      char: "主题",
      pinyin: "zhǔ tí",
      meaning: "theme",
      breakdown: "主题 (zhǔ tí) - theme",
    },
    {
      char: "住宅",
      pinyin: "zhù zhái",
      meaning: "residence",
      breakdown: "住宅 (zhù zhái) - residence",
    },
    {
      char: "注射",
      pinyin: "zhù shè",
      meaning: "injection",
      breakdown: "注射 (zhù shè) - injection",
    },
    {
      char: "注视",
      pinyin: "zhù shì",
      meaning: "to watch attentively",
      breakdown: "注视 (zhù shì) - to watch attentively",
    },
    {
      char: "注释",
      pinyin: "zhù shì",
      meaning: "marginal notes",
      breakdown: "注释 (zhù shì) - marginal notes",
    },
    {
      char: "注重",
      pinyin: "zhù zhòng",
      meaning: "to pay attention to",
      breakdown: "注重 (zhù zhòng) - to pay attention to",
    },
    {
      char: "助理",
      pinyin: "zhù lǐ",
      meaning: "assistant",
      breakdown: "助理 (zhù lǐ) - assistant",
    },
    {
      char: "助手",
      pinyin: "zhù shǒu",
      meaning: "assistant",
      breakdown: "助手 (zhù shǒu) - assistant",
    },
    {
      char: "著作",
      pinyin: "zhù zuò",
      meaning: "to write",
      breakdown: "著作 (zhù zuò) - to write",
    },
    {
      char: "驻扎",
      pinyin: "zhù zhā",
      meaning: "to station",
      breakdown: "驻扎 (zhù zhā) - to station",
    },
    {
      char: "铸造",
      pinyin: "zhù zào",
      meaning: "to cast (pour metal into a mold)",
      breakdown: "铸造 (zhù zào) - to cast (pour metal into a mold)",
    },
    {
      char: "拽",
      pinyin: "zhuài",
      meaning: "to pull",
      breakdown: "拽 (zhuài) - to pull",
    },
    {
      char: "专长",
      pinyin: "zhuān cháng",
      meaning: "specialty",
      breakdown: "专长 (zhuān cháng) - specialty",
    },
    {
      char: "专程",
      pinyin: "zhuān chéng",
      meaning: "special-purpose trip",
      breakdown: "专程 (zhuān chéng) - special-purpose trip",
    },
    {
      char: "专科",
      pinyin: "zhuān kē",
      meaning: "specialized subject",
      breakdown: "专科 (zhuān kē) - specialized subject",
    },
    {
      char: "专利",
      pinyin: "zhuān lì",
      meaning: "patent",
      breakdown: "专利 (zhuān lì) - patent",
    },
    {
      char: "专题",
      pinyin: "zhuān tí",
      meaning: "special topic",
      breakdown: "专题 (zhuān tí) - special topic",
    },
    {
      char: "砖瓦",
      pinyin: "zhuān wǎ",
      meaning: "tiles and bricks",
      breakdown: "砖瓦 (zhuān wǎ) - tiles and bricks",
    },
    {
      char: "转达",
      pinyin: "zhuǎn dá",
      meaning: "to pass on",
      breakdown: "转达 (zhuǎn dá) - to pass on",
    },
    {
      char: "转让",
      pinyin: "zhuǎn ràng",
      meaning: "transfer (technology)",
      breakdown: "转让 (zhuǎn ràng) - transfer (technology)",
    },
    {
      char: "转移",
      pinyin: "zhuǎn yí",
      meaning: "to shift",
      breakdown: "转移 (zhuǎn yí) - to shift",
    },
    {
      char: "转折",
      pinyin: "zhuǎn zhé",
      meaning: "shift in the trend of events",
      breakdown: "转折 (zhuǎn zhé) - shift in the trend of events",
    },
    {
      char: "传记",
      pinyin: "zhuàn jì",
      meaning: "biography",
      breakdown: "传记 (zhuàn jì) - biography",
    },
    {
      char: "装备",
      pinyin: "zhuāng bèi",
      meaning: "equipment",
      breakdown: "装备 (zhuāng bèi) - equipment",
    },
    {
      char: "装卸",
      pinyin: "zhuāng xiè",
      meaning: "to load or unload",
      breakdown: "装卸 (zhuāng xiè) - to load or unload",
    },
    {
      char: "庄严",
      pinyin: "zhuāng yán",
      meaning: "stately",
      breakdown: "庄严 (zhuāng yán) - stately",
    },
    {
      char: "庄重",
      pinyin: "zhuāng zhòng",
      meaning: "grave",
      breakdown: "庄重 (zhuāng zhòng) - grave",
    },
    {
      char: "幢",
      pinyin: "zhuàng",
      meaning: "classifier for buildings",
      breakdown: "幢 (zhuàng) - classifier for buildings",
    },
    {
      char: "壮观",
      pinyin: "zhuàng guān",
      meaning: "spectacular",
      breakdown: "壮观 (zhuàng guān) - spectacular",
    },
    {
      char: "壮丽",
      pinyin: "zhuàng lì",
      meaning: "magnificence",
      breakdown: "壮丽 (zhuàng lì) - magnificence",
    },
    {
      char: "壮烈",
      pinyin: "zhuàng liè",
      meaning: "brave",
      breakdown: "壮烈 (zhuàng liè) - brave",
    },
    {
      char: "追悼",
      pinyin: "zhuī dào",
      meaning: "to mourn",
      breakdown: "追悼 (zhuī dào) - to mourn",
    },
    {
      char: "追究",
      pinyin: "zhuī jiū",
      meaning: "to investigate",
      breakdown: "追究 (zhuī jiū) - to investigate",
    },
    {
      char: "准则",
      pinyin: "zhǔn zé",
      meaning: "norm",
      breakdown: "准则 (zhǔn zé) - norm",
    },
    {
      char: "琢磨",
      pinyin: "zhuó mó",
      meaning: "to carve and polish (jade)",
      breakdown: "琢磨 (zhuó mó) - to carve and polish (jade)",
    },
    {
      char: "着手",
      pinyin: "zhuó shǒu",
      meaning: "to put one's hand to it",
      breakdown: "着手 (zhuó shǒu) - to put one's hand to it",
    },
    {
      char: "着想",
      pinyin: "zhuó xiǎng",
      meaning: "to give thought (to others)",
      breakdown: "着想 (zhuó xiǎng) - to give thought (to others)",
    },
    {
      char: "着重",
      pinyin: "zhuó zhòng",
      meaning: "put emphasis on",
      breakdown: "着重 (zhuó zhòng) - put emphasis on",
    },
    {
      char: "卓越",
      pinyin: "zhuó yuè",
      meaning: "outstanding",
      breakdown: "卓越 (zhuó yuè) - outstanding",
    },
    {
      char: "资本",
      pinyin: "zī běn",
      meaning: "capital (economics)",
      breakdown: "资本 (zī běn) - capital (economics)",
    },
    {
      char: "资产",
      pinyin: "zī chǎn",
      meaning: "property",
      breakdown: "资产 (zī chǎn) - property",
    },
    {
      char: "资深",
      pinyin: "zī shēn",
      meaning: "senior (in terms of depth of accumulated experience)",
      breakdown:
        "资深 (zī shēn) - senior (in terms of depth of accumulated experience)",
    },
    {
      char: "资助",
      pinyin: "zī zhù",
      meaning: "to subsidize",
      breakdown: "资助 (zī zhù) - to subsidize",
    },
    {
      char: "姿态",
      pinyin: "zī tài",
      meaning: "attitude",
      breakdown: "姿态 (zī tài) - attitude",
    },
    {
      char: "滋味",
      pinyin: "zī wèi",
      meaning: "taste",
      breakdown: "滋味 (zī wèi) - taste",
    },
    {
      char: "滋长",
      pinyin: "zī zhǎng",
      meaning: "to grow (usually of abstract things)",
      breakdown: "滋长 (zī zhǎng) - to grow (usually of abstract things)",
    },
    {
      char: "子弹",
      pinyin: "zǐ dàn",
      meaning: "bullet",
      breakdown: "子弹 (zǐ dàn) - bullet",
    },
    {
      char: "字母",
      pinyin: "zì mǔ",
      meaning: "letter (of the alphabet)",
      breakdown: "字母 (zì mǔ) - letter (of the alphabet)",
    },
    {
      char: "自卑",
      pinyin: "zì bēi",
      meaning: "feeling inferior",
      breakdown: "自卑 (zì bēi) - feeling inferior",
    },
    {
      char: "自发",
      pinyin: "zì fā",
      meaning: "spontaneous",
      breakdown: "自发 (zì fā) - spontaneous",
    },
    {
      char: "自力更生",
      pinyin: "zì lì gēng shēng",
      meaning: "regeneration through one's own effort (idiom)",
      breakdown:
        "自力更生 (zì lì gēng shēng) - regeneration through one's own effort (idiom)",
    },
    {
      char: "自满",
      pinyin: "zì mǎn",
      meaning: "complacent",
      breakdown: "自满 (zì mǎn) - complacent",
    },
    {
      char: "自主",
      pinyin: "zì zhǔ",
      meaning: "independent",
      breakdown: "自主 (zì zhǔ) - independent",
    },
    {
      char: "踪迹",
      pinyin: "zōng jì",
      meaning: "tracks",
      breakdown: "踪迹 (zōng jì) - tracks",
    },
    {
      char: "宗旨",
      pinyin: "zōng zhǐ",
      meaning: "objective",
      breakdown: "宗旨 (zōng zhǐ) - objective",
    },
    {
      char: "棕色",
      pinyin: "zōng sè",
      meaning: "brown",
      breakdown: "棕色 (zōng sè) - brown",
    },
    {
      char: "总而言之",
      pinyin: "zǒng ér yán zhī",
      meaning: "in short",
      breakdown: "总而言之 (zǒng ér yán zhī) - in short",
    },
    {
      char: "总和",
      pinyin: "zǒng hé",
      meaning: "sum",
      breakdown: "总和 (zǒng hé) - sum",
    },
    {
      char: "纵横",
      pinyin: "zòng héng",
      meaning: "lit. warp and weft in weaving; vertically and horizontal",
      breakdown:
        "纵横 (zòng héng) - lit. warp and weft in weaving; vertically and horizontal",
    },
    {
      char: "走廊",
      pinyin: "zǒu láng",
      meaning: "corridor",
      breakdown: "走廊 (zǒu láng) - corridor",
    },
    {
      char: "走漏",
      pinyin: "zǒu lòu",
      meaning: "to leak (of information)",
      breakdown: "走漏 (zǒu lòu) - to leak (of information)",
    },
    {
      char: "走私",
      pinyin: "zǒu sī",
      meaning: "to smuggle",
      breakdown: "走私 (zǒu sī) - to smuggle",
    },
    {
      char: "揍",
      pinyin: "zòu",
      meaning: "to beat up",
      breakdown: "揍 (zòu) - to beat up",
    },
    {
      char: "租赁",
      pinyin: "zū lìn",
      meaning: "to rent",
      breakdown: "租赁 (zū lìn) - to rent",
    },
    {
      char: "足以",
      pinyin: "zú yǐ",
      meaning: "sufficient to...",
      breakdown: "足以 (zú yǐ) - sufficient to...",
    },
    {
      char: "组",
      pinyin: "zǔ",
      meaning: "to form",
      breakdown: "组 (zǔ) - to form",
    },
    {
      char: "阻碍",
      pinyin: "zǔ ài",
      meaning: "to obstruct",
      breakdown: "阻碍 (zǔ ài) - to obstruct",
    },
    {
      char: "阻拦",
      pinyin: "zǔ lán",
      meaning: "to stop",
      breakdown: "阻拦 (zǔ lán) - to stop",
    },
    {
      char: "阻挠",
      pinyin: "zǔ náo",
      meaning: "to thwart",
      breakdown: "阻挠 (zǔ náo) - to thwart",
    },
    {
      char: "祖父",
      pinyin: "zǔ fù",
      meaning: "father's father",
      breakdown: "祖父 (zǔ fù) - father's father",
    },
    {
      char: "钻研",
      pinyin: "zuān yán",
      meaning: "to study meticulously",
      breakdown: "钻研 (zuān yán) - to study meticulously",
    },
    {
      char: "钻石",
      pinyin: "zuàn shí",
      meaning: "diamond",
      breakdown: "钻石 (zuàn shí) - diamond",
    },
    {
      char: "嘴唇",
      pinyin: "zuǐ chún",
      meaning: "lip",
      breakdown: "嘴唇 (zuǐ chún) - lip",
    },
    {
      char: "尊严",
      pinyin: "zūn yán",
      meaning: "dignity",
      breakdown: "尊严 (zūn yán) - dignity",
    },
    {
      char: "遵循",
      pinyin: "zūn xún",
      meaning: "to follow",
      breakdown: "遵循 (zūn xún) - to follow",
    },
    {
      char: "左右",
      pinyin: "zuǒ yòu",
      meaning: "left and right",
      breakdown: "左右 (zuǒ yòu) - left and right",
    },
    {
      char: "做东",
      pinyin: "zuò dōng",
      meaning: "to act as host",
      breakdown: "做东 (zuò dōng) - to act as host",
    },
    {
      char: "做主",
      pinyin: "zuò zhǔ",
      meaning: "make the decision",
      breakdown: "做主 (zuò zhǔ) - make the decision",
    },
    {
      char: "座右铭",
      pinyin: "zuò yòu míng",
      meaning: "motto",
      breakdown: "座右铭 (zuò yòu míng) - motto",
    },
    {
      char: "作弊",
      pinyin: "zuò bì",
      meaning: "to practice fraud",
      breakdown: "作弊 (zuò bì) - to practice fraud",
    },
    {
      char: "作废",
      pinyin: "zuò fèi",
      meaning: "to become invalid",
      breakdown: "作废 (zuò fèi) - to become invalid",
    },
    {
      char: "作风",
      pinyin: "zuò fēng",
      meaning: "style",
      breakdown: "作风 (zuò fēng) - style",
    },
  ],
};

// Function to switch HSK level
function switchLevel(level) {
  currentLevel = level;
  vocabulary = hskVocabulary[level];

  // Clear cached filtered vocabulary for random mode
  filteredVocabulary = [];

  // Update word count for current level
  if (document.getElementById("wordCount")) {
    document.getElementById("wordCount").textContent =
      vocabulary.length + " Words";
  }

  // Update word counts for all HSK levels
  updateAllWordCounts();

  // Update button styles
  const levels = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"];
  levels.forEach((lvl) => {
    const btn = document.getElementById(`btn${lvl.toUpperCase()}`);
    const wordCount = document.getElementById(`wordCount${lvl.toUpperCase()}`);
    if (btn) {
      if (lvl === level) {
        btn.classList.add("active");
        if (wordCount) wordCount.classList.remove("hidden");
      } else {
        btn.classList.remove("active");
        if (wordCount) wordCount.classList.add("hidden");
      }
    }
  });

  // Deactivate Advanced Grammar button when HSK level is selected
  const advancedGrammarBtn = document.getElementById("btnAdvancedGrammar");
  const advancedGrammarWordCount = document.getElementById(
    "wordCountAdvancedGrammar",
  );
  if (advancedGrammarBtn) {
    advancedGrammarBtn.classList.remove("active");
    if (advancedGrammarWordCount)
      advancedGrammarWordCount.classList.add("hidden");
  }

  // Reset current character index
  currentCharIndex = 0;

  // Reset view all mode, pagination, and re-render vocabulary cards
  showAllWordsMode = false;
  currentVocabPage = 1;
  renderVocabCards(false);

  // Update visual learning section
  updateLearnTab();

  // Reset flashcards
  resetFlashcards();

  // Reset quiz if it's in progress
  if (typeof quizQuestions !== "undefined") {
    quizQuestions = [];
    currentQuizIndex = 0;
    quizScore = 0;
    quizCorrectCount = 0;
    quizWrongCount = 0;
    quizWrongAnswers = [];
    quizAnswered = false;

    // Update quiz level display
    const quizLevelDisplay = document.getElementById("quizLevelDisplay");
    if (quizLevelDisplay) {
      quizLevelDisplay.textContent = currentLevel.toUpperCase();
    }

    // Reset quiz UI to not started state
    const quizNotStarted = document.getElementById("quizNotStarted");
    const quizInProgress = document.getElementById("quizInProgress");
    const quizCompleted = document.getElementById("quizCompleted");

    if (quizNotStarted) quizNotStarted.classList.remove("hidden");
    if (quizInProgress) quizInProgress.classList.add("hidden");
    if (quizCompleted) quizCompleted.classList.add("hidden");
  }
}

// Function to switch to Advanced Grammar
function switchToAdvancedGrammar() {
  // Deactivate all HSK level buttons
  const levels = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"];
  levels.forEach((lvl) => {
    const btn = document.getElementById(`btn${lvl.toUpperCase()}`);
    const wordCount = document.getElementById(`wordCount${lvl.toUpperCase()}`);
    if (btn) {
      btn.classList.remove("active");
      if (wordCount) wordCount.classList.add("hidden");
    }
  });

  // Activate Advanced Grammar button
  const advancedGrammarBtn = document.getElementById("btnAdvancedGrammar");
  const advancedGrammarWordCount = document.getElementById(
    "wordCountAdvancedGrammar",
  );
  if (advancedGrammarBtn) {
    advancedGrammarBtn.classList.add("active");
    if (advancedGrammarWordCount)
      advancedGrammarWordCount.classList.remove("hidden");
  }

  // Set current level to advanced grammar
  currentLevel = "advanced-grammar";

  // Show a notification or message
  alert(
    "Advanced Grammar mode coming soon! This feature will help you master complex Chinese grammar patterns.",
  );
}

// Function to show tabs
function showTab(tabName) {
  // Hide all tabs
  const tabs = [
    "learn",
    "flashcards",
    "practice",
    "ai-tutor",
    "progress",
    "me",
  ];
  tabs.forEach((tab) => {
    const tabElement = document.getElementById(`${tab}Tab`);
    if (tabElement) {
      tabElement.classList.add("hidden");
    }
  });

  // Show selected tab
  const selectedTab = document.getElementById(`${tabName}Tab`);
  if (selectedTab) {
    selectedTab.classList.remove("hidden");
  }

  // Update button styles
  const tabButtons = {
    learn: "tabLearn",
    flashcards: "tabFlashcards",
    practice: "tabPractice",
    "ai-tutor": "tabAI",
    progress: "tabProgress",
    me: "tabMe",
  };

  tabs.forEach((tab) => {
    const btn = document.getElementById(tabButtons[tab]);
    if (btn) {
      if (tab === tabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  });

  // Show/hide HSK level selector and search bar based on tab
  const hskLevelSelector = document.getElementById("hskLevelSelector");
  const searchBar = document.getElementById("searchBar");

  if (tabName === "ai-tutor" || tabName === "progress" || tabName === "me") {
    if (hskLevelSelector) hskLevelSelector.classList.add("hidden");
    if (searchBar) searchBar.classList.add("hidden");
  } else {
    if (hskLevelSelector) hskLevelSelector.classList.remove("hidden");
    if (searchBar) searchBar.classList.remove("hidden");
  }

  // Render progress tab content when navigating to it
  if (tabName === "progress") {
    renderProgressTab();
  }

  // Render me tab content when navigating to it
  if (tabName === "me") {
    renderMeTab();
  }
}

// Render vocabulary cards
let showAllWordsMode = false;
let currentVocabPage = 1;
const WORDS_PER_PAGE = 10;

// Function to explain word with AI tutor
function explainWordWithAI(character, pinyin, meaning) {
  // Switch to AI tutor tab
  showTab("ai-tutor");

  // Wait a bit for the tab to load
  setTimeout(() => {
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
      // Set the message asking for explanation
      chatInput.value = `Please explain the Chinese character "${character}" (pinyin: ${pinyin}, meaning: ${meaning}). Include its usage, common phrases, and any cultural context.`;

      // Focus the input
      chatInput.focus();

      // Optional: Auto-send the message
      // sendMessage();
    }
  }, 100);
}

function renderVocabCards(showAll = false) {
  const container = document.getElementById("vocabCards");
  if (!container) {
    console.error("vocabCards container not found");
    return;
  }

  container.innerHTML = "";

  // Safety check for vocabulary
  if (!vocabulary || vocabulary.length === 0) {
    container.innerHTML =
      '<div class="text-center text-gray-500 py-4">No vocabulary loaded. Please select an HSK level.</div>';
    return;
  }

  let wordsToShow;
  let totalPages = 1;

  if (showAll) {
    // Calculate total pages
    totalPages = Math.ceil(vocabulary.length / WORDS_PER_PAGE);
    const startIndex = (currentVocabPage - 1) * WORDS_PER_PAGE;
    const endIndex = startIndex + WORDS_PER_PAGE;
    wordsToShow = vocabulary.slice(startIndex, endIndex);
  } else {
    // Show only 10 words initially
    wordsToShow = vocabulary.slice(0, WORDS_PER_PAGE);
  }

  wordsToShow.forEach((word, index) => {
    const card = document.createElement("div");
    card.className =
      "bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm transition-all hover:shadow-md";
    card.title = "Click to view | Double-click to ask AI";
    const globalIndex = showAll
      ? (currentVocabPage - 1) * WORDS_PER_PAGE + index
      : index;
    card.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="text-lg font-bold text-blue-600 dark:text-blue-400 w-8">${globalIndex + 1}</div>
        <div>
          <div class="text-3xl font-bold text-gray-800 dark:text-white mb-1">${word.char}</div>
          <div class="text-lg text-gray-600 dark:text-gray-300">${word.pinyin}</div>
        </div>
        <div class="ml-auto text-right flex items-center gap-2">
          <div class="text-sm text-gray-700 dark:text-gray-200">${word.meaning}</div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="event.stopPropagation(); copyVocabWord('${word.char}', '${word.pinyin}', '${word.meaning}', this)" class="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1" title="Copy word">
            📋
          </button>
          <button onclick="event.stopPropagation(); shareVocabWord('${word.char}', '${word.pinyin}', '${word.meaning}', this)" class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1" title="Share word">
            🔗
          </button>
          <button onclick="event.stopPropagation(); speakChinese('${word.char}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1" title="Listen">
            🔊
          </button>
        </div>
      </div>
    `;
    // Single click: Show in visual learning
    card.onclick = () => {
      currentCharIndex = globalIndex;
      updateLearnTab();
    };

    // Double click: Explain with AI tutor
    card.ondblclick = (e) => {
      e.stopPropagation();
      explainWordWithAI(word.char, word.pinyin, word.meaning);
    };
    container.appendChild(card);
  });

  // Add "More" button at the bottom if in showAll mode and there are more pages
  if (showAll && totalPages > 1) {
    const paginationDiv = document.createElement("div");
    paginationDiv.id = "vocabPagination";
    paginationDiv.className =
      "mt-4 pt-4 border-t border-gray-200 dark:border-gray-600";

    // Page info
    const pageInfo = document.createElement("div");
    pageInfo.className =
      "text-center text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium";
    pageInfo.textContent = `Page ${currentVocabPage} of ${totalPages} (${vocabulary.length} words)`;
    paginationDiv.appendChild(pageInfo);

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex justify-center gap-2";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className =
      "btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed";
    prevBtn.disabled = currentVocabPage === 1;
    prevBtn.innerHTML = "← Previous";
    prevBtn.onclick = () => {
      if (currentVocabPage > 1) {
        currentVocabPage--;
        renderVocabCards(true);
        setTimeout(() => {
          const vocabContainer = document.getElementById("vocabCards");
          if (vocabContainer) {
            vocabContainer.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      }
    };
    buttonContainer.appendChild(prevBtn);

    // Page indicator
    const pageIndicator = document.createElement("span");
    pageIndicator.className =
      "px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300";
    pageIndicator.textContent = `${currentVocabPage} / ${totalPages}`;
    buttonContainer.appendChild(pageIndicator);

    // Next/More button
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn-primary text-sm py-2 px-4";
    if (currentVocabPage < totalPages) {
      nextBtn.innerHTML = "More →";
    } else {
      nextBtn.innerHTML = "Last Page";
      nextBtn.classList.remove("btn-primary");
      nextBtn.classList.add("btn-secondary");
      nextBtn.disabled = true;
    }
    nextBtn.onclick = () => {
      if (currentVocabPage < totalPages) {
        currentVocabPage++;
        renderVocabCards(true);
        setTimeout(() => {
          const vocabContainer = document.getElementById("vocabCards");
          if (vocabContainer) {
            vocabContainer.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      }
    };
    buttonContainer.appendChild(nextBtn);

    paginationDiv.appendChild(buttonContainer);
    container.appendChild(paginationDiv);
  }

  // Update button text and state
  const viewAllBtn = document.getElementById("viewAllBtn");
  if (viewAllBtn) {
    showAllWordsMode = showAll;

    // Get level display name (e.g., "HSK 1", "HSK 2", etc.)
    const levelDisplayName = currentLevel.toUpperCase().replace("HSK", "HSK ");

    viewAllBtn.innerHTML = showAll
      ? "<span>📝</span><span>View Less</span>"
      : `<span>📋</span><span>View All ${levelDisplayName}</span>`;
  }
}

// Render progress tab
function renderProgressTab() {
  // Update overall statistics
  updateOverallStatistics();

  // Render HSK level progress
  renderHSKProgress();

  // Render today's study activity
  renderTodayStudyActivity();

  // Render achievements
  renderAchievements();
}

// Render today's study activity
function renderTodayStudyActivity() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentActivities = userProgress.studyLog.filter(
    (entry) => new Date(entry.timestamp) >= twentyFourHoursAgo,
  );

  // Group activities by word
  const activitiesByWord = {};
  recentActivities.forEach((activity) => {
    if (!activitiesByWord[activity.word]) {
      activitiesByWord[activity.word] = {
        word: activity.word,
        pinyin: activity.pinyin || "",
        meaning: activity.meaning || "",
        level: activity.level || "",
        listenCount: 0,
        studyCount: 0,
        flashcardCount: 0,
        quizCount: 0,
        times: [],
      };
    }

    if (activity.type === "listen") {
      activitiesByWord[activity.word].listenCount++;
    } else if (activity.type === "study") {
      activitiesByWord[activity.word].studyCount++;
    } else if (activity.type === "flashcard") {
      activitiesByWord[activity.word].flashcardCount =
        (activitiesByWord[activity.word].flashcardCount || 0) + 1;
    } else if (activity.type === "quiz") {
      activitiesByWord[activity.word].quizCount =
        (activitiesByWord[activity.word].quizCount || 0) + 1;
    }

    activitiesByWord[activity.word].times.push({
      time: activity.time,
      type: activity.type,
    });
  });

  // Convert to array and sort by most recent activity
  const sortedActivities = Object.values(activitiesByWord).sort((a, b) => {
    // Get the last activity time for each word
    const aLastActivity = a.times[a.times.length - 1];
    const bLastActivity = b.times[b.times.length - 1];

    if (!aLastActivity || !bLastActivity) {
      return 0;
    }

    // Convert times to Date objects for comparison
    const aTime = new Date(`2000-01-01 ${aLastActivity.time}`);
    const bTime = new Date(`2000-01-01 ${bLastActivity.time}`);

    // Sort by most recent first
    return bTime - aTime;
  });

  // Find or create container
  let activityContainer = document.getElementById("todayActivities");
  if (!activityContainer) {
    // Create container if it doesn't exist
    const statsCard = document.querySelector("#progressTab .card");
    if (statsCard) {
      activityContainer = document.createElement("div");
      activityContainer.id = "todayActivities";
      activityContainer.className = "mt-6";

      statsCard.appendChild(activityContainer);
    } else {
      return;
    }
  }

  // Render today's activities
  activityContainer.innerHTML = `
    <h2 class="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
      <span class="text-xl">📝</span> Today's Study Activity
    </h2>
    ${
      sortedActivities.length > 0
        ? `
      <div class="space-y-3">
        ${sortedActivities
          .map((activity) => {
            const total =
              (activity.listenCount || 0) +
              (activity.studyCount || 0) +
              (activity.flashcardCount || 0) +
              (activity.quizCount || 0);
            const recentTimes = activity.times
              .slice(-3)
              .map((t) => t.time)
              .join(", ");
            const hasMoreTimes = activity.times.length > 3;

            return `
            <div class="p-4 glass rounded-2xl">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2 py-1 rounded-full ${
                    activity.level === "hsk1"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : activity.level === "hsk2"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : activity.level === "hsk3"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                          : activity.level === "hsk4"
                            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                            : activity.level === "hsk5"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  }">
                    ${activity.level ? activity.level.toUpperCase().replace("HSK", "HSK ") : ""}
                  </span>
                  <span class="text-lg font-bold text-primary-500 dark:text-primary-400">${activity.word}</span>
                </div>
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  ${activity.studyCount > 0 ? `📖 Studied ${activity.studyCount}x ` : ""}
                  ${activity.listenCount > 0 ? `🔊 Listened ${activity.listenCount}x` : ""}
                  ${activity.flashcardCount > 0 ? `🎴 Flashcards ${activity.flashcardCount}x` : ""}
                  ${activity.quizCount > 0 ? `✍️ Quiz ${activity.quizCount}x` : ""}
                </span>
              </div>
              ${activity.pinyin ? `<div class="text-sm text-gray-600 dark:text-gray-300 mb-1">${activity.pinyin}</div>` : ""}
              ${activity.meaning ? `<div class="text-sm text-gray-700 dark:text-gray-200 mb-2">${activity.meaning}</div>` : ""}
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ${recentTimes}${hasMoreTimes ? "..." : ""}
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `
        : `
      <div class="p-4 glass rounded-2xl text-center">
        <div class="text-4xl mb-2">📚</div>
        <div class="text-gray-500 dark:text-gray-400">No study activity in the last 24 hours</div>
        <div class="text-sm text-gray-400 dark:text-gray-500 mt-1">Start studying to track your progress!</div>
      </div>
    `
    }
  `;
}

// Update overall statistics
function updateOverallStatistics() {
  // Calculate total characters studied
  const totalCharsStudied = userProgress.studiedChars.size;

  // Calculate overall accuracy
  let totalQuestions = 0;
  let totalCorrect = 0;

  Object.values(userProgress.hskLevels).forEach((level) => {
    totalQuestions += level.totalQuestions;
    totalCorrect += level.correctAnswers;
  });

  const accuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Calculate practice time (placeholder - would need actual time tracking)
  const practiceTime = Math.floor(userProgress.points / 10); // Simplified: 10 points = 1 minute

  // Update DOM elements
  if (document.getElementById("statsChars")) {
    document.getElementById("statsChars").textContent = totalCharsStudied;
  }

  if (document.getElementById("statsAccuracy")) {
    document.getElementById("statsAccuracy").textContent = accuracy + "%";
  }

  if (document.getElementById("statsTime")) {
    document.getElementById("statsTime").textContent = practiceTime + " min";
  }

  if (document.getElementById("statsStreak")) {
    document.getElementById("statsStreak").textContent =
      userProgress.streak + " days";
  }
}

// Render HSK level progress
function renderHSKProgress() {
  const hskProgressContainer = document.getElementById("hskProgress");
  if (!hskProgressContainer) return;

  hskProgressContainer.innerHTML = "";

  const hskLevels = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"];
  const levelNames = {
    hsk1: "HSK 1",
    hsk2: "HSK 2",
    hsk3: "HSK 3",
    hsk4: "HSK 4",
    hsk5: "HSK 5",
    hsk6: "HSK 6",
  };

  hskLevels.forEach((level) => {
    const levelData = userProgress.hskLevels[level] || {
      charsLearned: 0,
      quizzesCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
    };

    // Get total words for this level
    const totalWords = hskVocabulary[level] ? hskVocabulary[level].length : 0;
    const progress =
      totalWords > 0
        ? Math.round((levelData.charsLearned / totalWords) * 100)
        : 0;

    const levelElement = document.createElement("div");
    levelElement.className = "p-4 glass rounded-2xl";
    levelElement.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${levelNames[level]}</span>
        <span class="text-sm font-bold text-primary-500 dark:text-primary-400">${progress}%</span>
      </div>
      <div class="progress-bar mb-2">
        <div class="progress-bar-fill" style="width: ${progress}%"></div>
      </div>
      <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-medium">
        <span>${levelData.charsLearned}/${totalWords} words</span>
        <span>${levelData.quizzesCompleted} quizzes</span>
      </div>
    `;

    hskProgressContainer.appendChild(levelElement);
  });
}

// Render achievements
function renderAchievements() {
  const achievementsContainer = document.getElementById("achievements");
  if (!achievementsContainer) return;

  achievementsContainer.innerHTML = "";

  achievements.forEach((achievement) => {
    const achievementElement = document.createElement("div");
    achievementElement.className = `p-4 rounded-2xl ${achievement.unlocked ? "bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 border border-primary-300 dark:border-primary-700" : "bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"}`;

    achievementElement.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-3xl">${achievement.icon}</div>
        <div>
          <div class="text-sm font-bold text-gray-900 dark:text-white">${achievement.name}</div>
          <div class="text-xs text-gray-600 dark:text-gray-400">${achievement.desc}</div>
        </div>
        <div class="ml-auto">
          <div class="text-sm font-bold ${achievement.unlocked ? "text-green-500" : "text-gray-400 dark:text-gray-500"}">
            ${achievement.unlocked ? "✓" : "🔒"}
          </div>
        </div>
      </div>
    `;

    achievementsContainer.appendChild(achievementElement);
  });
}

// Render Me tab
function renderMeTab() {
  // Update total words learned
  const totalWordsElement = document.getElementById("meTotalWords");
  if (totalWordsElement) {
    const totalWords = userProgress.studiedChars.size;
    totalWordsElement.textContent = totalWords;
  }

  // Update total quizzes taken
  const totalQuizzesElement = document.getElementById("meTotalQuizzes");
  if (totalQuizzesElement) {
    let totalQuizzes = 0;
    Object.values(userProgress.hskLevels).forEach((level) => {
      totalQuizzes += level.totalQuestions;
    });
    totalQuizzesElement.textContent = totalQuizzes;
  }
}

// Clear all data
function clearAllData() {
  if (
    confirm(
      "Are you sure you want to clear all your progress? This action cannot be undone.",
    )
  ) {
    localStorage.removeItem("xuetongProgress");
    localStorage.removeItem("xuetongSearchHistory");
    localStorage.removeItem("xuetongFlashcardProgress");

    // Reset user progress to default
    userProgress = {
      level: 1,
      xp: 0,
      streak: 0,
      lastStudyDate: null,
      studiedChars: new Set(),
      hskLevels: {
        hsk1: { totalQuestions: 0, correctAnswers: 0 },
        hsk2: { totalQuestions: 0, correctAnswers: 0 },
        hsk3: { totalQuestions: 0, correctAnswers: 0 },
        hsk4: { totalQuestions: 0, correctAnswers: 0 },
        hsk5: { totalQuestions: 0, correctAnswers: 0 },
        hsk6: { totalQuestions: 0, correctAnswers: 0 },
      },
      wordMastery: {
        hsk1: {},
        hsk2: {},
        hsk3: {},
        hsk4: {},
        hsk5: {},
        hsk6: {},
      },
      studyLog: [],
    };

    // Update displays
    updateStreakDisplay();
    updateXPDisplay();
    updatePointsDisplay();

    alert("All data has been cleared successfully!");

    // Refresh the current tab
    renderMeTab();
  }
}

// Export progress data
function exportData() {
  const dataToExport = {
    progress: {
      level: userProgress.level,
      xp: userProgress.xp,
      streak: userProgress.streak,
      lastStudyDate: userProgress.lastStudyDate,
      studiedChars: Array.from(userProgress.studiedChars),
    },
    hskLevels: userProgress.hskLevels,
    wordMastery: userProgress.wordMastery,
    exportDate: new Date().toISOString(),
    appVersion: "1.0.0",
  };

  const dataStr = JSON.stringify(dataToExport, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `xuetong-progress-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  alert("Progress exported successfully!");
}

// Show export modal
function showExportModal() {
  const modal = document.getElementById("exportModal");
  const modalContent = document.getElementById("exportModalContent");

  if (modal && modalContent) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    setTimeout(() => {
      modalContent.classList.remove("scale-95", "opacity-0");
      modalContent.classList.add("scale-100", "opacity-100");
    }, 10);
  }
}

// Close export modal
function closeExportModal() {
  const modal = document.getElementById("exportModal");
  const modalContent = document.getElementById("exportModalContent");

  if (modal && modalContent) {
    modalContent.classList.remove("scale-100", "opacity-100");
    modalContent.classList.add("scale-95", "opacity-0");

    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 300);
  }
}

// Export to Excel (XLSX)
function exportToExcel() {
  try {
    const data = [];

    // Add progress summary
    data.push(["Progress Summary"]);
    data.push(["Field", "Value"]);
    data.push(["Level", userProgress.level]);
    data.push(["XP", userProgress.xp]);
    data.push(["Streak", userProgress.streak + " days"]);
    data.push(["Total Words Studied", userProgress.studiedChars.size]);
    data.push(["Last Study Date", userProgress.lastStudyDate || "Never"]);
    data.push([]);

    // Add HSK level progress
    data.push(["HSK Level Progress"]);
    data.push(["Level", "Total Questions", "Correct Answers", "Accuracy"]);

    Object.keys(userProgress.hskLevels).forEach((level) => {
      const levelData = userProgress.hskLevels[level];
      const accuracy =
        levelData.totalQuestions > 0
          ? Math.round(
              (levelData.correctAnswers / levelData.totalQuestions) * 100,
            ) + "%"
          : "0%";

      data.push([
        level.toUpperCase().replace("HSK", "HSK "),
        levelData.totalQuestions,
        levelData.correctAnswers,
        accuracy,
      ]);
    });

    data.push([]);

    // Add studied words
    data.push(["Studied Words"]);
    data.push(["Character", "Word Count"]);
    data.push([
      Array.from(userProgress.studiedChars).join(", "),
      userProgress.studiedChars.size,
    ]);
    data.push([]);

    // Add export info
    data.push(["Export Information"]);
    data.push(["Export Date", new Date().toLocaleString()]);
    data.push(["App Version", "1.0.0"]);

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "XueTong Progress");

    // Download file
    XLSX.writeFile(
      wb,
      `xuetong-progress-${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    closeExportModal();
    alert("Excel file exported successfully!");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Error exporting to Excel. Please try again.");
  }
}

// Export to PDF
function exportToPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(24);
    doc.setTextColor(102, 126, 234);
    doc.text("XueTong 学通 - Progress Report", 105, 20, { align: "center" });

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Exported on: ${new Date().toLocaleString()}`, 105, 30, {
      align: "center",
    });

    // Progress Summary Table
    const progressData = [
      ["Field", "Value"],
      ["Level", userProgress.level.toString()],
      ["XP", userProgress.xp.toString()],
      ["Streak", userProgress.streak + " days"],
      ["Total Words Studied", userProgress.studiedChars.size.toString()],
      [
        "Last Study Date",
        userProgress.lastStudyDate
          ? new Date(userProgress.lastStudyDate).toLocaleDateString()
          : "Never",
      ],
    ];

    doc.autoTable({
      startY: 40,
      head: [["Field", "Value"]],
      body: progressData.slice(1),
      theme: "grid",
      headStyles: { fillColor: [102, 126, 234], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    // HSK Level Progress Table
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(16);
    doc.setTextColor(102, 126, 234);
    doc.text("HSK Level Progress", 14, finalY);

    const hskData = [["Level", "Total Questions", "Correct", "Accuracy"]];

    Object.keys(userProgress.hskLevels).forEach((level) => {
      const levelData = userProgress.hskLevels[level];
      const accuracy =
        levelData.totalQuestions > 0
          ? Math.round(
              (levelData.correctAnswers / levelData.totalQuestions) * 100,
            ) + "%"
          : "0%";

      hskData.push([
        level.toUpperCase().replace("HSK", "HSK "),
        levelData.totalQuestions.toString(),
        levelData.correctAnswers.toString(),
        accuracy,
      ]);
    });

    doc.autoTable({
      startY: finalY + 10,
      head: [["Level", "Total Questions", "Correct", "Accuracy"]],
      body: hskData.slice(1),
      theme: "grid",
      headStyles: { fillColor: [102, 126, 234], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `XueTong 学通 v1.0.0 - Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    }

    // Download file
    doc.save(`xuetong-progress-${new Date().toISOString().split("T")[0]}.pdf`);

    closeExportModal();
    alert("PDF file exported successfully!");
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    alert("Error exporting to PDF. Please try again.");
  }
}

// Export to JSON
function exportToJSON() {
  exportData();
}

// Progress and stats functions
function loadProgress() {
  const savedProgress = localStorage.getItem("xuetongProgress");
  if (savedProgress) {
    const parsed = JSON.parse(savedProgress);
    // Merge with default structure to handle new fields
    userProgress = {
      ...userProgress,
      ...parsed,
      studiedChars: new Set(parsed.studiedChars || []),
      // Initialize wordMastery if it doesn't exist (backward compatibility)
      wordMastery: parsed.wordMastery || {
        hsk1: {},
        hsk2: {},
        hsk3: {},
        hsk4: {},
        hsk5: {},
        hsk6: {},
      },
      // Initialize studyLog if it doesn't exist (backward compatibility)
      studyLog: parsed.studyLog || [],
    };
    updateStreakDisplay();
    updateXPDisplay();
  }
}

function saveProgress() {
  const toSave = {
    ...userProgress,
    studiedChars: Array.from(userProgress.studiedChars),
    studyLog: userProgress.studyLog,
  };
  localStorage.setItem("xuetongProgress", JSON.stringify(toSave));
}

function updateStreakDisplay() {
  const streakElement = document.getElementById("streak");
  if (streakElement) {
    streakElement.textContent = userProgress.streak + "🔥";
  }
}

function updateXPDisplay() {
  // Check for level up
  while (userProgress.xp >= 100) {
    userProgress.xp -= 100;
    userProgress.level++;
  }

  const currentXPElement = document.getElementById("currentXP");
  const xpNeededElement = document.getElementById("xpNeeded");
  const xpBarElement = document.getElementById("xpBar");
  const nextLevelElement = document.getElementById("nextLevel");

  if (currentXPElement) currentXPElement.textContent = userProgress.xp;
  if (xpNeededElement) xpNeededElement.textContent = 100;
  if (xpBarElement) xpBarElement.style.width = userProgress.xp + "%";
  if (nextLevelElement) nextLevelElement.textContent = userProgress.level + 1;

  // Save progress after level up
  saveProgress();
}

// Update points display in header
function updatePointsDisplay() {
  const pointsElement = document.getElementById("points");
  const levelElement = document.getElementById("level");

  if (pointsElement) {
    pointsElement.textContent = userProgress.points + "⭐";
  }

  if (levelElement) {
    levelElement.textContent = userProgress.level + "📚";
  }
}

// Update word counts for all HSK level buttons
function updateAllWordCounts() {
  const levels = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"];
  levels.forEach((level) => {
    const countElement = document.getElementById(
      `wordCount${level.toUpperCase()}`,
    );
    if (countElement && hskVocabulary[level]) {
      countElement.textContent = hskVocabulary[level].length + " Words";
    }
  });
}

// Character navigation in Learn tab
function previousChar() {
  if (currentCharIndex > 0) {
    currentCharIndex--;
    updateLearnTab();
  }
}

function nextChar() {
  if (currentCharIndex < vocabulary.length - 1) {
    currentCharIndex++;
    updateLearnTab();
  }
}

function updateLearnTab() {
  // Safety check for vocabulary
  if (!vocabulary || vocabulary.length === 0) {
    console.warn("updateLearnTab: vocabulary is empty");
    return;
  }

  const word = vocabulary[currentCharIndex];

  // Safety check for word
  if (!word) {
    console.warn("updateLearnTab: word not found at index", currentCharIndex);
    return;
  }

  // Track word study
  trackWordStudy(word);

  // Update visual learning section
  if (document.getElementById("bigCharacter")) {
    document.getElementById("bigCharacter").textContent = word.char;
  }
  if (document.getElementById("charPinyin")) {
    document.getElementById("charPinyin").textContent = word.pinyin;
  }
  if (document.getElementById("charMeaning")) {
    document.getElementById("charMeaning").textContent = word.meaning;
  }
  if (document.getElementById("charBreakdown")) {
    document.getElementById("charBreakdown").innerHTML =
      `<strong class="text-primary-500 dark:text-primary-400">Character breakdown:</strong> ${word.breakdown}`;
  }

  // Update navigation section
  if (document.getElementById("learnChar")) {
    document.getElementById("learnChar").textContent = word.char;
  }
  if (document.getElementById("learnPinyin")) {
    document.getElementById("learnPinyin").textContent = word.pinyin;
  }
  if (document.getElementById("learnMeaning")) {
    document.getElementById("learnMeaning").textContent = word.meaning;
  }
  if (document.getElementById("currentIndexNum")) {
    document.getElementById("currentIndexNum").textContent =
      currentCharIndex + 1;
  }
}

// Track word study activity
function trackWordStudy(word) {
  // Get current time
  const now = new Date();
  const timestamp = now.toISOString();
  const dateString = now.toDateString();
  const timeString = now.toLocaleTimeString();

  // Add to study log
  userProgress.studyLog.push({
    type: "study",
    word: word.char,
    pinyin: word.pinyin,
    meaning: word.meaning,
    level: currentLevel,
    timestamp: timestamp,
    date: dateString,
    time: timeString,
  });

  // Add word to studied chars set
  const isNewStudy = !userProgress.studiedChars.has(word.char);
  userProgress.studiedChars.add(word.char);

  // Update per-level chars learned if this is first time studying this word
  if (isNewStudy) {
    if (!userProgress.hskLevels[currentLevel]) {
      userProgress.hskLevels[currentLevel] = {
        charsLearned: 0,
        quizzesCompleted: 0,
        totalQuestions: 0,
        correctAnswers: 0,
      };
    }
    userProgress.hskLevels[currentLevel].charsLearned++;
  }

  // Update streak
  if (userProgress.lastStudyDate !== dateString) {
    userProgress.streak++;
    userProgress.lastStudyDate = dateString;
    updateStreakDisplay();
  }

  // Save progress
  saveProgress();
}

function showAllWords() {
  if (showAllWordsMode) {
    // Switching from View All to View Less
    showAllWordsMode = false;
    currentVocabPage = 1;
    renderVocabCards(false);
  } else {
    // Switching from View Less to View All
    showAllWordsMode = true;
    currentVocabPage = 1;
    renderVocabCards(true);
  }
}

// Flashcard functions (variables declared at top of file)

// Word mastery status constants
const WORD_STATUS = {
  NEW: "new",
  LEARNING: "learning",
  KNOWN: "known",
};

// Helper functions for word mastery tracking
function getWordStatus(word, level = currentLevel) {
  if (!userProgress.wordMastery || !userProgress.wordMastery[level]) {
    return WORD_STATUS.NEW;
  }
  return userProgress.wordMastery[level][word.char] || WORD_STATUS.NEW;
}

function setWordStatus(word, status, level = currentLevel) {
  if (!userProgress.wordMastery) {
    userProgress.wordMastery = {
      hsk1: {},
      hsk2: {},
      hsk3: {},
      hsk4: {},
      hsk5: {},
      hsk6: {},
    };
  }
  if (!userProgress.wordMastery[level]) {
    userProgress.wordMastery[level] = {};
  }
  userProgress.wordMastery[level][word.char] = status;
  saveProgress();
  updateFlashcardStats();
}

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get filtered vocabulary based on current mode
function getFilteredVocabulary() {
  const mastery = userProgress.wordMastery[currentLevel] || {};

  switch (flashcardMode) {
    case "sequential":
      // Use original vocabulary array
      return vocabulary;

    case "random":
      // Only shuffle if filteredVocabulary is empty (not yet initialized)
      // This prevents reshuffling on every call
      if (filteredVocabulary.length === 0) {
        console.log("Shuffling vocabulary for random mode...");
        filteredVocabulary = shuffleArray(vocabulary);
      }
      return filteredVocabulary;

    case "unlearned":
      // Filter to only show words that are 'new' (not marked as known or learning)
      return vocabulary.filter((word) => {
        const status = mastery[word.char];
        return !status || status === "new";
      });

    default:
      return vocabulary;
  }
}

// Function to toggle flashcard settings panel
function showFlashcardSettings() {
  const panel = document.getElementById("flashcardSettingsPanel");
  if (panel) {
    panel.classList.toggle("hidden");
  }
}

function setFlashcardPracticeMode(mode) {
  flashcardPracticeMode = mode;

  // Update button active states
  const practiceButtons = {
    character: "btnPracticeChar",
    pinyin: "btnPracticePinyin",
    meaning: "btnPracticeMeaning",
  };

  // Remove active class from all practice mode buttons
  Object.values(practiceButtons).forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.remove("active");
  });

  // Add active class to selected button
  const activeBtn = document.getElementById(practiceButtons[mode]);
  if (activeBtn) activeBtn.classList.add("active");

  resetFlashcards();
}

function setFlashcardMode(mode) {
  flashcardMode = mode;

  // Clear cached filtered vocabulary when mode changes
  filteredVocabulary = [];

  // Update button active states
  const shuffleButtons = {
    random: "btnFlashRandom",
    sequential: "btnFlashSequential",
    unlearned: "btnFlashUnlearned",
  };

  // Remove active class from all shuffle mode buttons
  Object.values(shuffleButtons).forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.remove("active");
  });

  // Add active class to selected button
  const activeBtn = document.getElementById(shuffleButtons[mode]);
  if (activeBtn) activeBtn.classList.add("active");

  resetFlashcards();
}

function resetFlashcards() {
  currentFlashcardIndex = 0;
  isCardFlipped = false;
  updateFlashcardDisplay();
}

function flipCard() {
  isCardFlipped = !isCardFlipped;
  const flashcard = document.getElementById("flashcardInner");
  if (flashcard) {
    if (isCardFlipped) {
      flashcard.classList.add("flipped");
    } else {
      flashcard.classList.remove("flipped");
    }
  }
  updateFlashcardDisplay();
}

function updateFlashcardDisplay() {
  // Get filtered vocabulary based on current shuffle mode
  const currentVocab = getFilteredVocabulary();

  // Handle empty filtered list
  if (currentVocab.length === 0) {
    const flashcardChar = document.getElementById("flashcardChar");
    const totalCardsNum = document.getElementById("totalCardsNum");
    if (flashcardChar) {
      flashcardChar.textContent = "No new words";
      flashcardChar.style.fontSize = "2rem";
    }
    if (totalCardsNum) totalCardsNum.textContent = "0";
    return;
  }

  // Ensure index is within bounds
  if (currentFlashcardIndex >= currentVocab.length) {
    currentFlashcardIndex = 0;
  }

  const word = currentVocab[currentFlashcardIndex];
  currentFlashcardChar = word.char; // Store for Listen button
  const flashcardChar = document.getElementById("flashcardChar");
  const flashcardPinyin = document.getElementById("flashcardPinyin");
  const flashcardMeaning = document.getElementById("flashcardMeaning");
  const flashcardCharBack = document.getElementById("flashcardCharBack");
  const flashcardBreakdown = document.getElementById("flashcardBreakdown");
  const currentCardNum = document.getElementById("currentCardNum");
  const totalCardsNum = document.getElementById("totalCardsNum");

  // Reset flashcardChar font classes to default (will be adjusted based on mode)
  if (flashcardChar) {
    flashcardChar.classList.remove(
      "text-2xl",
      "md:text-4xl",
      "text-4xl",
      "md:text-6xl",
    );
    flashcardChar.classList.add("text-7xl", "md:text-9xl");
    flashcardChar.style.fontSize = ""; // Clear inline style
  }

  // Update progress indicators
  if (currentCardNum) {
    currentCardNum.textContent = currentFlashcardIndex + 1;
  }
  if (totalCardsNum) {
    totalCardsNum.textContent = currentVocab.length;
  }

  // Update progress bar
  const progressBar = document.getElementById("flashcardProgressBar");
  const progressText = document.getElementById("flashcardProgress");
  if (progressBar && currentVocab.length > 0) {
    const progress = ((currentFlashcardIndex + 1) / currentVocab.length) * 100;
    progressBar.style.width = progress + "%";
    if (progressText) {
      progressText.textContent = Math.round(progress) + "% Complete";
    }
  }

  // Reset font size in case it was changed for "No new words" message
  if (flashcardChar) {
    flashcardChar.style.fontSize = "";
  }

  // Display content based on practice mode
  if (!isCardFlipped) {
    // FRONT SIDE - show content based on practice mode
    switch (flashcardPracticeMode) {
      case "character":
        // Show Chinese character on front
        if (flashcardChar) {
          flashcardChar.textContent = word.char;
        }
        break;

      case "pinyin":
        // Show Pinyin on front
        if (flashcardChar) {
          flashcardChar.textContent = word.pinyin;
        }
        break;

      case "meaning":
        // Show English meaning on front (smaller font for longer text)
        if (flashcardChar) {
          flashcardChar.textContent = word.meaning;
          flashcardChar.classList.add("text-2xl", "md:text-4xl");
          flashcardChar.classList.remove("text-7xl", "md:text-9xl");
        }
        break;
    }

    // Adjust font size for character mode
    if (flashcardPracticeMode === "character" && flashcardChar) {
      flashcardChar.classList.remove("text-2xl", "md:text-4xl");
      flashcardChar.classList.add("text-7xl", "md:text-9xl");
    }

    // Adjust font size for pinyin mode
    if (flashcardPracticeMode === "pinyin" && flashcardChar) {
      flashcardChar.classList.remove("text-7xl", "md:text-9xl");
      flashcardChar.classList.add("text-4xl", "md:text-6xl");
    }

    // Hide back side elements on front
    if (flashcardPinyin) flashcardPinyin.classList.add("hidden");
    if (flashcardMeaning) flashcardMeaning.classList.add("hidden");
  } else {
    // BACK SIDE - show appropriate content based on practice mode
    switch (flashcardPracticeMode) {
      case "character":
        // Front was Chinese character, Back shows Pinyin + Meaning + Breakdown
        if (flashcardCharBack) {
          flashcardCharBack.textContent = "";
          flashcardCharBack.classList.add("hidden");
        }
        if (flashcardPinyin) {
          flashcardPinyin.classList.remove("hidden");
          flashcardPinyin.textContent = word.pinyin;
        }
        if (flashcardMeaning) {
          flashcardMeaning.classList.remove("hidden");
          flashcardMeaning.textContent = word.meaning;
        }
        if (flashcardBreakdown) {
          flashcardBreakdown.innerHTML = `<strong class="text-primary-500 dark:text-primary-400">Breakdown:</strong> ${word.breakdown}`;
        }
        break;

      case "pinyin":
        // Front was Pinyin, Back shows Character + Meaning + Breakdown
        if (flashcardCharBack) {
          flashcardCharBack.textContent = word.char;
          flashcardCharBack.classList.remove("hidden");
        }
        if (flashcardPinyin) {
          flashcardPinyin.classList.add("hidden"); // Already shown on front
        }
        if (flashcardMeaning) {
          flashcardMeaning.classList.remove("hidden");
          flashcardMeaning.textContent = word.meaning;
        }
        if (flashcardBreakdown) {
          flashcardBreakdown.innerHTML = `<strong class="text-primary-500 dark:text-primary-400">Breakdown:</strong> ${word.breakdown}`;
        }
        break;

      case "meaning":
        // Front was English meaning, Back shows Character + Pinyin + Breakdown
        if (flashcardCharBack) {
          flashcardCharBack.textContent = word.char;
          flashcardCharBack.classList.remove("hidden");
        }
        if (flashcardPinyin) {
          flashcardPinyin.classList.remove("hidden");
          flashcardPinyin.textContent = word.pinyin;
        }
        if (flashcardMeaning) {
          flashcardMeaning.classList.add("hidden"); // Already shown on front
        }
        if (flashcardBreakdown) {
          flashcardBreakdown.innerHTML = `<strong class="text-primary-500 dark:text-primary-400">Breakdown:</strong> ${word.breakdown}`;
        }
        break;
    }
  }

  // Update flashcard level display
  const flashcardLevel = document.getElementById("flashcardLevel");
  if (flashcardLevel) {
    const levelName = currentLevel.toUpperCase().replace("HSK", "HSK ");
    flashcardLevel.textContent = levelName;
  }

  // Update front side HSK level display
  const flashcardLevelFront = document.getElementById("flashcardLevelFront");
  if (flashcardLevelFront) {
    const levelName = currentLevel.toUpperCase().replace("HSK", "HSK ");
    flashcardLevelFront.textContent = levelName;
  }
}

function previousFlashcard() {
  const currentVocab = getFilteredVocabulary();
  if (currentFlashcardIndex > 0) {
    currentFlashcardIndex--;
    isCardFlipped = false;
    const flashcard = document.getElementById("flashcardInner");
    if (flashcard) flashcard.classList.remove("flipped");
    updateFlashcardDisplay();
  }
}

function nextFlashcard() {
  const currentVocab = getFilteredVocabulary();
  if (currentVocab.length === 0) return;

  if (currentFlashcardIndex < currentVocab.length - 1) {
    currentFlashcardIndex++;
    isCardFlipped = false;
    const flashcard = document.getElementById("flashcardInner");
    if (flashcard) flashcard.classList.remove("flipped");
    updateFlashcardDisplay();

    // Track flashcard activity
    const word = currentVocab[currentFlashcardIndex];
    trackFlashcardActivity(word);
  }
}

function trackFlashcardActivity(word) {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateString = now.toDateString();
  const timeString = now.toLocaleTimeString();

  userProgress.studyLog.push({
    type: "flashcard",
    word: word.char,
    pinyin: word.pinyin,
    meaning: word.meaning,
    level: currentLevel,
    timestamp: timestamp,
    date: dateString,
    time: timeString,
  });

  // Award XP for flashcard activity (1 XP per flashcard)
  userProgress.xp += 1;
  userProgress.points += 1;
  updateXPDisplay();
  updatePointsDisplay();

  // Update streak
  if (userProgress.lastStudyDate !== dateString) {
    userProgress.streak++;
    userProgress.lastStudyDate = dateString;
    updateStreakDisplay();
  }

  saveProgress();
}

function trackQuizActivity(word) {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateString = now.toDateString();
  const timeString = now.toLocaleTimeString();

  userProgress.studyLog.push({
    type: "quiz",
    word: word.char,
    pinyin: word.pinyin,
    meaning: word.meaning,
    level: currentLevel,
    timestamp: timestamp,
    date: dateString,
    time: timeString,
  });

  // Award XP for quiz activity (1 XP per question)
  userProgress.xp += 1;
  userProgress.points += 1;
  updateXPDisplay();
  updatePointsDisplay();

  // Update streak
  if (userProgress.lastStudyDate !== dateString) {
    userProgress.streak++;
    userProgress.lastStudyDate = dateString;
    updateStreakDisplay();
  }

  saveProgress();
}

// Mark card as known or learning
function markCard(status) {
  const currentVocab = getFilteredVocabulary();
  if (currentVocab.length === 0) return;

  const word = currentVocab[currentFlashcardIndex];

  // Initialize wordMastery for current level if it doesn't exist
  if (!userProgress.wordMastery[currentLevel]) {
    userProgress.wordMastery[currentLevel] = {};
  }

  // Update word status
  const previousStatus = userProgress.wordMastery[currentLevel][word.char];
  userProgress.wordMastery[currentLevel][word.char] = status;

  // Award XP and points if marking as known for the first time
  if (status === "known" && previousStatus !== "known") {
    userProgress.xp += 5;
    userProgress.points += 10;
    userProgress.totalCharsLearned++;

    // Update per-level chars learned
    if (!userProgress.hskLevels[currentLevel]) {
      userProgress.hskLevels[currentLevel] = {
        charsLearned: 0,
        quizzesCompleted: 0,
        totalQuestions: 0,
        correctAnswers: 0,
      };
    }
    userProgress.hskLevels[currentLevel].charsLearned++;

    // Update streak
    const today = new Date().toDateString();
    if (userProgress.lastStudyDate !== today) {
      userProgress.streak++;
      userProgress.lastStudyDate = today;
    }

    // Update displays
    updateXPDisplay();
    updateStreakDisplay();
    updatePointsDisplay();
  }

  // Save progress
  saveProgress();

  // Update statistics
  updateFlashcardStats();

  // Clear cached vocabulary if in unlearned mode to reflect the change
  if (flashcardMode === "unlearned") {
    filteredVocabulary = [];
  }

  // Move to next card if not at the end
  if (currentFlashcardIndex < currentVocab.length - 1) {
    nextFlashcard();
  } else {
    // If at the end, stay on current card but update display
    isCardFlipped = false;
    const flashcard = document.getElementById("flashcardInner");
    if (flashcard) flashcard.classList.remove("flipped");
    updateFlashcardDisplay();
  }
}

// Update flashcard statistics (Known, Learning, New counts)
function updateFlashcardStats() {
  const mastery = userProgress.wordMastery[currentLevel] || {};

  let knownCount = 0;
  let learningCount = 0;
  let newCount = 0;

  const knownWords = [];
  const learningWords = [];

  // Count words by status and collect them
  vocabulary.forEach((word) => {
    const status = mastery[word.char];
    if (status === "known") {
      knownCount++;
      knownWords.push(word);
    } else if (status === "learning") {
      learningCount++;
      learningWords.push(word);
    } else {
      newCount++;
    }
  });

  // Update display elements
  const knownElement = document.getElementById("knownCount");
  const learningElement = document.getElementById("learningCount");
  const newElement = document.getElementById("newCount");

  if (knownElement) knownElement.textContent = knownCount;
  if (learningElement) learningElement.textContent = learningCount;
  if (newElement) newElement.textContent = newCount;

  // Update the word lists
  updateKnownWordsList(knownWords);
  updateLearningWordsList(learningWords);
}

// Update Known Words List
function updateKnownWordsList(words) {
  const container = document.getElementById("knownWordsList");
  if (!container) return;

  if (words.length === 0) {
    container.innerHTML =
      '<span class="text-sm text-gray-500 dark:text-gray-400">No words marked as known yet</span>';
    return;
  }

  container.innerHTML = words
    .map(
      (word) => `
    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors" onclick="speakChinese('${word.char}')" title="${word.pinyin} - ${word.meaning}">
      ${word.char}
      <span class="text-xs opacity-70">🔊</span>
    </span>
  `,
    )
    .join("");
}

// Update Learning Words List
function updateLearningWordsList(words) {
  const container = document.getElementById("learningWordsList");
  if (!container) return;

  if (words.length === 0) {
    container.innerHTML =
      '<span class="text-sm text-gray-500 dark:text-gray-400">No words marked as learning yet</span>';
    return;
  }

  container.innerHTML = words
    .map(
      (word) => `
    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors" onclick="speakChinese('${word.char}')" title="${word.pinyin} - ${word.meaning}">
      ${word.char}
      <span class="text-xs opacity-70">🔊</span>
    </span>
  `,
    )
    .join("");
}

// Toggle Known Words Section
function toggleKnownSection() {
  const section = document.getElementById("knownWordsSection");
  if (section) {
    section.classList.toggle("hidden");
  }
}

// Toggle Learning Words Section
function toggleLearningSection() {
  const section = document.getElementById("learningWordsSection");
  if (section) {
    section.classList.toggle("hidden");
  }
}

// Quiz/Practice functions
let quizType = "char-to-meaning";
let quizMode = "random";
let quizQuestionCount = 10;
let quizTimerSeconds = 0;
let quizQuestions = [];
let currentQuizIndex = 0;
let quizScore = 0;
let quizCorrectCount = 0;
let quizWrongCount = 0;
let quizWrongAnswers = [];
let quizTimerInterval = null;
let quizCurrentTime = 0;
let quizAnswered = false;

// Show/Hide Quiz Settings
function showQuizSettings() {
  const panel = document.getElementById("quizSettingsPanel");
  if (panel) {
    panel.classList.toggle("hidden");
  }
}

// Set Question Count
function setQuizQuestionCount(count) {
  quizQuestionCount = count;
  // Update button states
  ["btnQ10", "btnQ15", "btnQ20", "btnQ30"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("active");
  });
  const activeBtn = document.getElementById("btnQ" + count);
  if (activeBtn) activeBtn.classList.add("active");
}

// Set Quiz Type
function setQuizType(type) {
  quizType = type;
  // Update button states
  [
    "btnQuizCharMeaning",
    "btnQuizCharPinyin",
    "btnQuizMeaningChar",
    "btnQuizListening",
  ].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("active");
  });
  const typeMap = {
    "char-to-meaning": "btnQuizCharMeaning",
    "char-to-pinyin": "btnQuizCharPinyin",
    "meaning-to-char": "btnQuizMeaningChar",
    listening: "btnQuizListening",
  };
  const activeBtn = document.getElementById(typeMap[type]);
  if (activeBtn) activeBtn.classList.add("active");
}

// Set Quiz Mode
function setQuizMode(mode) {
  quizMode = mode;
  // Update button states
  ["btnQuizRandom", "btnQuizSequential"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("active");
  });
  const activeBtn = document.getElementById(
    "btnQuiz" + (mode === "random" ? "Random" : "Sequential"),
  );
  if (activeBtn) activeBtn.classList.add("active");
}

// Set Quiz Timer
function setQuizTimer(seconds) {
  quizTimerSeconds = seconds;
  // Update button states
  [
    "btnTimerOff",
    "btnTimer5min",
    "btnTimer10min",
    "btnTimer15min",
    "btnTimer20min",
  ].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("active");
  });
  const timerMap = {
    0: "btnTimerOff",
    300: "btnTimer5min",
    600: "btnTimer10min",
    900: "btnTimer15min",
    1200: "btnTimer20min",
  };
  const activeBtn = document.getElementById(timerMap[seconds]);
  if (activeBtn) activeBtn.classList.add("active");
}

// Start Quiz
function startQuiz() {
  // Initialize timer tracking for share feature
  if (typeof initQuizTimerTracking === "function") {
    initQuizTimerTracking();
  }
  // Get vocabulary for current HSK level
  const levelVocab = vocabulary || hskVocabulary[currentLevel] || [];
  if (levelVocab.length === 0) {
    alert("No vocabulary available for this level!");
    return;
  }

  // Generate questions
  quizQuestions = [];
  const shuffledVocab = [...levelVocab];

  if (quizMode === "random") {
    shuffledVocab.sort(() => Math.random() - 0.5);
  }

  const questionCount = Math.min(quizQuestionCount, shuffledVocab.length);
  for (let i = 0; i < questionCount; i++) {
    quizQuestions.push({
      word: shuffledVocab[i],
      answered: false,
      correct: false,
      selectedAnswer: null,
    });
  }

  // Reset state
  currentQuizIndex = 0;
  quizScore = 0;
  quizCorrectCount = 0;
  quizWrongCount = 0;
  quizWrongAnswers = [];
  quizAnswered = false;

  // Update UI
  document.getElementById("quizNotStarted").classList.add("hidden");
  document.getElementById("quizCompleted").classList.add("hidden");
  document.getElementById("quizInProgress").classList.remove("hidden");
  document.getElementById("quizSettingsPanel").classList.add("hidden");
  document.getElementById("quizLevelDisplay").textContent =
    currentLevel.toUpperCase();
  document.getElementById("totalQuestions").textContent = quizQuestions.length;

  // Start timer if enabled
  if (quizTimerSeconds > 0) {
    startQuizTimer();
  } else {
    document.getElementById("quizTimerDisplay").classList.add("hidden");
  }

  // Display first question
  displayQuizQuestion();
}

// Start Quiz Timer
function startQuizTimer() {
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
  }

  quizCurrentTime = quizTimerSeconds;
  updateTimerDisplay();
  document.getElementById("quizTimerDisplay").classList.remove("hidden");

  quizTimerInterval = setInterval(() => {
    quizCurrentTime--;
    updateTimerDisplay();

    if (quizCurrentTime <= 0) {
      clearInterval(quizTimerInterval);
      // Time's up - mark as wrong and move to next
      if (!quizAnswered) {
        handleTimeUp();
      }
    }
  }, 1000);
}

// Update Timer Display
function updateTimerDisplay() {
  const minutes = Math.floor(quizCurrentTime / 60);
  const seconds = quizCurrentTime % 60;
  const timerValue = document.getElementById("timerValue");
  if (timerValue) {
    timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // Change color when low on time
  const timerDisplay = document.getElementById("quizTimerDisplay");
  if (timerDisplay) {
    if (quizCurrentTime <= 10) {
      timerDisplay.classList.add("text-red-500");
      timerDisplay.classList.remove("text-orange-500");
    } else if (quizCurrentTime <= 30) {
      timerDisplay.classList.add("text-orange-500");
    }
  }
}

// Handle Time Up - Global timer expired, end quiz
function handleTimeUp() {
  // Mark current question as wrong if not answered
  if (currentQuizIndex < quizQuestions.length) {
    const currentQuestion = quizQuestions[currentQuizIndex];
    if (!currentQuestion.answered) {
      currentQuestion.answered = true;
      currentQuestion.correct = false;
      quizWrongCount++;
      quizWrongAnswers.push(currentQuestion.word);
    }
  }

  // End the quiz - time's up for the whole quiz
  finishQuiz();
}

// Display Quiz Question
function displayQuizQuestion() {
  if (currentQuizIndex >= quizQuestions.length) {
    finishQuiz();
    return;
  }

  const currentQuestion = quizQuestions[currentQuizIndex];
  const word = currentQuestion.word;
  quizAnswered = currentQuestion.answered;

  // Timer continues running - no reset per question
  // Timer was started once at quiz start and runs continuously

  // Update progress
  document.getElementById("questionNum").textContent = currentQuizIndex + 1;
  document.getElementById("quizScore").textContent = quizScore;
  const progressPercent = ((currentQuizIndex + 1) / quizQuestions.length) * 100;
  document.getElementById("quizProgress").style.width = progressPercent + "%";

  // Generate question and options based on type
  let questionText = "";
  let correctOptionText = "";
  let characterDisplay = "";

  switch (quizType) {
    case "char-to-meaning":
      characterDisplay = word.char;
      questionText = "What does this character mean?";
      correctOptionText = word.meaning;
      break;
    case "char-to-pinyin":
      characterDisplay = word.char;
      questionText = "What is the pinyin for this character?";
      correctOptionText = word.pinyin;
      break;
    case "meaning-to-char":
      characterDisplay = word.meaning;
      questionText = "Which character means this?";
      correctOptionText = word.char;
      break;
    case "listening":
      characterDisplay = "🔊";
      questionText = "Listen and select the correct character";
      correctOptionText = word.char;
      // Auto-play audio
      setTimeout(() => speakChinese(word.char), 300);
      break;
  }

  // Update display
  document.getElementById("quizCharacter").textContent = characterDisplay;
  document.getElementById("quizQuestion").textContent = questionText;

  // Show/hide listen button
  const speakBtn = document.getElementById("quizSpeakBtn");
  if (quizType === "listening") {
    speakBtn.classList.remove("hidden");
    speakBtn.onclick = () => speakChinese(word.char);
  } else {
    speakBtn.classList.add("hidden");
  }

  // Generate options
  const options = generateQuizOptions(word, correctOptionText);

  // Display options
  const optionsContainer = document.getElementById("quizOptions");
  optionsContainer.innerHTML = "";

  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className =
      "quiz-option p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-primary-500 transition-all text-left font-medium";
    button.innerHTML = `<span class="text-lg">${option}</span>`;
    button.id = "quizOption" + index;

    if (currentQuestion.answered) {
      // Show previous answer state
      if (option === correctOptionText) {
        button.classList.add("quiz-option-correct");
        button.classList.remove("border-gray-200", "dark:border-gray-600");
        button.classList.add(
          "border-green-500",
          "bg-green-50",
          "dark:bg-green-900/30",
        );
      } else if (
        option === currentQuestion.selectedAnswer &&
        !currentQuestion.correct
      ) {
        button.classList.add("quiz-option-incorrect");
        button.classList.remove("border-gray-200", "dark:border-gray-600");
        button.classList.add(
          "border-red-500",
          "bg-red-50",
          "dark:bg-red-900/30",
        );
      }
      button.disabled = true;
    } else {
      button.onclick = () => selectQuizAnswer(option, correctOptionText, word);
    }

    optionsContainer.appendChild(button);
  });

  // Update navigation buttons
  updateQuizNavigation();

  // Hide feedback
  document.getElementById("quizFeedback").classList.add("hidden");
  document.getElementById("nextQuizBtn").classList.add("hidden");
  document.getElementById("finishQuizBtn").classList.add("hidden");

  // If already answered, show the next button
  if (currentQuestion.answered) {
    showNextButton();
  }
}

// Generate Quiz Options
function generateQuizOptions(correctWord, correctOption) {
  const levelVocab = vocabulary || hskVocabulary[currentLevel] || [];
  const options = [correctOption];

  while (options.length < 4) {
    const randomWord =
      levelVocab[Math.floor(Math.random() * levelVocab.length)];
    let optionText = "";

    switch (quizType) {
      case "char-to-meaning":
        optionText = randomWord.meaning;
        break;
      case "char-to-pinyin":
        optionText = randomWord.pinyin;
        break;
      case "meaning-to-char":
      case "listening":
        optionText = randomWord.char;
        break;
    }

    if (!options.includes(optionText)) {
      options.push(optionText);
    }
  }

  // Shuffle options
  return options.sort(() => Math.random() - 0.5);
}

// Select Quiz Answer
function selectQuizAnswer(selectedAnswer, correctAnswer, word) {
  if (quizAnswered) return;

  quizAnswered = true;

  // Track quiz activity
  trackQuizActivity(word);

  // Timer continues running - do not clear

  const currentQuestion = quizQuestions[currentQuizIndex];
  currentQuestion.answered = true;
  currentQuestion.selectedAnswer = selectedAnswer;

  const isCorrect = selectedAnswer === correctAnswer;
  currentQuestion.correct = isCorrect;

  // Update score
  if (isCorrect) {
    quizScore += 10;
    quizCorrectCount++;
    userProgress.xp += 10;
    userProgress.correctAnswers++;
    updateXPDisplay();
    saveProgress();
  } else {
    quizWrongCount++;
    quizWrongAnswers.push(word);
  }

  // Update display
  document.getElementById("quizScore").textContent = quizScore;

  // Highlight options
  const buttons = document.querySelectorAll("#quizOptions button");
  buttons.forEach((btn) => {
    const btnText = btn.textContent.trim();
    btn.disabled = true;

    if (btnText === correctAnswer) {
      btn.classList.remove("border-gray-200", "dark:border-gray-600");
      btn.classList.add(
        "border-green-500",
        "bg-green-50",
        "dark:bg-green-900/30",
      );
    } else if (btnText === selectedAnswer && !isCorrect) {
      btn.classList.remove("border-gray-200", "dark:border-gray-600");
      btn.classList.add("border-red-500", "bg-red-50", "dark:bg-red-900/30");
    }
  });

  // Show feedback
  showQuizFeedback(isCorrect, word);
  showNextButton();

  // Auto-advance to next question after 1 second if correct
  if (isCorrect) {
    setTimeout(() => {
      if (currentQuizIndex < quizQuestions.length - 1) {
        nextQuizQuestion();
      } else {
        finishQuiz();
      }
    }, 1000);
  }
}

// Show Quiz Feedback
function showQuizFeedback(isCorrect, word) {
  const feedback = document.getElementById("quizFeedback");
  feedback.classList.remove("hidden");

  if (isCorrect) {
    feedback.className =
      "mt-5 md:mt-6 p-4 rounded-xl text-center font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700";
    feedback.innerHTML = `
      <div class="text-2xl mb-2">✅ Correct!</div>
      <div class="text-sm">${word.char} (${word.pinyin}) - ${word.meaning}</div>
    `;
  } else {
    feedback.className =
      "mt-5 md:mt-6 p-4 rounded-xl text-center font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700";
    feedback.innerHTML = `
      <div class="text-2xl mb-2">❌ Incorrect</div>
      <div class="text-sm">Correct answer: ${word.char} (${word.pinyin}) - ${word.meaning}</div>
      <button onclick="retryCurrentQuestion()" class="mt-3 btn-warning text-sm py-2 px-4">🔄 Try Again</button>
    `;
  }
}

// Show Next Button
function showNextButton() {
  const nextBtn = document.getElementById("nextQuizBtn");
  const finishBtn = document.getElementById("finishQuizBtn");

  if (currentQuizIndex < quizQuestions.length - 1) {
    nextBtn.classList.remove("hidden");
    finishBtn.classList.add("hidden");
  } else {
    nextBtn.classList.add("hidden");
    finishBtn.classList.remove("hidden");
  }
}

// Update Quiz Navigation
function updateQuizNavigation() {
  const prevBtn = document.getElementById("prevQuizBtn");
  if (prevBtn) {
    prevBtn.disabled = currentQuizIndex === 0;
    prevBtn.classList.toggle("opacity-50", currentQuizIndex === 0);
  }
}

// Next Quiz Question
function nextQuizQuestion() {
  if (currentQuizIndex < quizQuestions.length - 1) {
    currentQuizIndex++;
    displayQuizQuestion();
  }
}

// Previous Quiz Question
function previousQuizQuestion() {
  if (currentQuizIndex > 0) {
    currentQuizIndex--;
    displayQuizQuestion();
  }
}

// Retry Current Question
function retryCurrentQuestion() {
  const currentQuestion = quizQuestions[currentQuizIndex];
  currentQuestion.answered = false;
  currentQuestion.correct = false;
  currentQuestion.selectedAnswer = null;
  quizAnswered = false;

  // Remove from wrong answers if it was there
  const idx = quizWrongAnswers.findIndex(
    (w) => w.char === currentQuestion.word.char,
  );
  if (idx > -1) {
    quizWrongAnswers.splice(idx, 1);
    quizWrongCount--;
  }

  // Timer continues running - no reset
  displayQuizQuestion();
}

// Finish Quiz
function finishQuiz() {
  clearInterval(quizTimerInterval);

  // Hide quiz in progress
  document.getElementById("quizInProgress").classList.add("hidden");
  document.getElementById("quizCompleted").classList.remove("hidden");

  // Calculate results
  const totalQuestions = quizQuestions.length;
  const accuracy =
    totalQuestions > 0
      ? Math.round((quizCorrectCount / totalQuestions) * 100)
      : 0;

  // Display results
  document.getElementById("finalScore").textContent =
    `${quizScore}/${totalQuestions * 10}`;
  document.getElementById("finalAccuracy").textContent = `${accuracy}%`;
  document.getElementById("finalCorrect").textContent = quizCorrectCount;
  document.getElementById("finalWrong").textContent = quizWrongCount;

  // Update user progress
  if (totalQuestions > 0) {
    // Award XP and points based on performance
    const baseXP = totalQuestions * 2;
    const bonusXP = Math.round((accuracy / 100) * totalQuestions * 3);
    const totalXP = baseXP + bonusXP;
    const points = totalQuestions * 5;

    userProgress.xp += totalXP;
    userProgress.points += points;

    // Update streak
    const today = new Date().toDateString();
    if (userProgress.lastStudyDate !== today) {
      userProgress.streak++;
      userProgress.lastStudyDate = today;
    }

    // Update HSK level progress
    if (!userProgress.hskLevels[currentLevel]) {
      userProgress.hskLevels[currentLevel] = {
        charsLearned: 0,
        quizzesCompleted: 0,
        totalQuestions: 0,
        correctAnswers: 0,
      };
    }

    userProgress.hskLevels[currentLevel].quizzesCompleted++;
    userProgress.hskLevels[currentLevel].totalQuestions += totalQuestions;
    userProgress.hskLevels[currentLevel].correctAnswers += quizCorrectCount;

    // Update displays
    updateXPDisplay();
    updateStreakDisplay();
    updatePointsDisplay();

    // Save progress
    saveProgress();
  }

  // Show retry wrong button if there are wrong answers
  const retryBtn = document.getElementById("retryWrongBtn");
  if (quizWrongAnswers.length > 0) {
    retryBtn.classList.remove("hidden");
    retryBtn.textContent = `🔄 Retry ${quizWrongAnswers.length} Wrong Answers`;
  } else {
    retryBtn.classList.add("hidden");
  }
}

// Retry Wrong Answers
function retryWrongAnswers() {
  if (quizWrongAnswers.length === 0) return;

  // Create new quiz with only wrong answers
  quizQuestions = quizWrongAnswers.map((word) => ({
    word: word,
    answered: false,
    correct: false,
    selectedAnswer: null,
  }));

  // Reset state
  currentQuizIndex = 0;
  quizScore = 0;
  quizCorrectCount = 0;
  quizWrongCount = 0;
  quizWrongAnswers = [];
  quizAnswered = false;

  // Update UI
  document.getElementById("quizCompleted").classList.add("hidden");
  document.getElementById("quizInProgress").classList.remove("hidden");
  document.getElementById("totalQuestions").textContent = quizQuestions.length;

  // Start timer if enabled
  if (quizTimerSeconds > 0) {
    startQuizTimer();
  }

  displayQuizQuestion();
}

// Speak Quiz Word
function speakQuizWord() {
  if (quizQuestions[currentQuizIndex]) {
    speakChinese(quizQuestions[currentQuizIndex].word.char);
  }
}

// AI Tutor functions
let chatHistory = [];

function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const chatContainer = document.getElementById("chatMessages");

  // Add user message
  const userMessage = document.createElement("div");
  userMessage.className = "flex justify-end mb-4";
  userMessage.innerHTML = `
    <div class="bg-blue-500 text-white rounded-2xl rounded-br-md p-4 max-w-md">
      ${escapeHtml(message)}
    </div>
  `;
  chatContainer.appendChild(userMessage);

  input.value = "";

  // Show loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "flex justify-start mb-4";
  loadingDiv.id = "aiLoading";
  loadingDiv.innerHTML = `
    <div class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-2xl rounded-bl-md p-4 max-w-md">
      <div class="flex gap-1">
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
      </div>
    </div>
  `;
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Add to history
  chatHistory.push({ role: "user", content: message });

  // Call backend API
  fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: message,
      history: chatHistory.slice(-10),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Remove loading
      const loading = document.getElementById("aiLoading");
      if (loading) loading.remove();

      if (data.error) {
        showAIError(data.error);
        return;
      }

      // Add AI response
      const aiResponse = data.reply || "Sorry, I could not understand that.";
      chatHistory.push({ role: "assistant", content: aiResponse });

      const aiMessage = document.createElement("div");
      aiMessage.className = "flex justify-start mb-4";
      aiMessage.id = "ai-msg-" + Date.now();
      const msgId = aiMessage.id;
      aiMessage.innerHTML = `
      <div class="flex flex-col max-w-md">
        <div class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-2xl rounded-bl-md p-4 whitespace-pre-wrap">${escapeHtml(aiResponse)}</div>
        <div class="flex gap-2 mt-1">
          <button onclick="copyMessage('${msgId}')" class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
            Copy
          </button>
          <button onclick="regenerateResponse('${msgId}', '${escapeHtml(message).replace(/'/g, "\\'")}'  )" class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
            Regenerate
          </button>
        </div>
      </div>
    `;
      chatContainer.appendChild(aiMessage);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    })
    .catch((error) => {
      console.error("Error:", error);
      const loading = document.getElementById("aiLoading");
      if (loading) loading.remove();
      showAIError(
        "Could not connect to AI server. Make sure the backend is running.",
      );
    });
}

function showAIError(errorMsg) {
  const chatContainer = document.getElementById("chatMessages");
  const errorDiv = document.createElement("div");
  errorDiv.className = "flex justify-start mb-4";
  errorDiv.innerHTML = `
    <div class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-2xl rounded-bl-md p-4 max-w-md">
      <strong>Error:</strong> ${escapeHtml(errorMsg)}
    </div>
  `;
  chatContainer.appendChild(errorDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function fillPresetMessage(message) {
  const input = document.getElementById("chatInput");
  input.value = message;
  input.focus();
}

function clearChatHistory() {
  const chatContainer = document.getElementById("chatMessages");
  chatContainer.innerHTML = `
    <div class="flex gap-3">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-primary-500/30">
        AI
      </div>
      <div class="glass rounded-2xl rounded-tl-none p-4 max-w-[85%]">
        <p class="text-gray-800 dark:text-gray-100 text-sm md:text-base font-medium">
          你好! I'm your Chinese tutor. I can help you with:
        </p>
        <ul class="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1 font-medium">
          <li>• Practicing conversations</li>
          <li>• Explaining grammar</li>
          <li>• Pronunciation tips</li>
          <li>• Cultural insights</li>
        </ul>
        <p class="mt-2 text-gray-800 dark:text-gray-100 text-sm md:text-base font-medium">
          What would you like to practice today?
        </p>
      </div>
    </div>
  `;
  chatHistory = [];
}

// Movable AI Tutor Popup Functions
let aiTutorPopupVisible = false;

// AI Tutor Notification System
const notificationMessages = [
  "Use me",
  "Do you have any question, buddy?",
  "Need help with Chinese?",
  "Let's practice together!",
  "How can I assist you today?",
];
let notificationIndex = 0;
let notificationInterval = null;

function showNotification(text) {
  const notification = document.getElementById("aiTutorNotification");
  const notificationText = document.getElementById("aiTutorNotificationText");

  if (notification && notificationText) {
    notificationText.textContent = text;
    notification.classList.remove(
      "opacity-0",
      "transform",
      "translate-y-2",
      "pointer-events-none",
    );
    notification.classList.add(
      "opacity-100",
      "transform",
      "translate-y-0",
      "pointer-events-auto",
    );

    // Auto-dismiss after 2-3 seconds
    setTimeout(
      () => {
        dismissNotification();
      },
      2000 + Math.random() * 1000,
    ); // 2-3 seconds
  }
}

function dismissNotification() {
  const notification = document.getElementById("aiTutorNotification");
  if (notification) {
    notification.classList.add(
      "opacity-0",
      "transform",
      "translate-y-2",
      "pointer-events-none",
    );
    notification.classList.remove(
      "opacity-100",
      "transform",
      "translate-y-0",
      "pointer-events-auto",
    );
  }
}

function startNotificationSystem() {
  // Show initial notification
  showNotification("I am Your AI Tutor");

  // Start interval for subsequent notifications
  notificationInterval = setInterval(
    () => {
      notificationIndex = (notificationIndex + 1) % notificationMessages.length;
      showNotification(notificationMessages[notificationIndex]);
    },
    3 * 60 * 1000,
  ); // 3 minutes in milliseconds
}

function stopNotificationSystem() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

function toggleAITutorPopup() {
  const popup = document.getElementById("aiTutorPopup");
  const btn = document.getElementById("floatingAITutorBtn");

  aiTutorPopupVisible = !aiTutorPopupVisible;

  if (aiTutorPopupVisible) {
    popup.classList.remove("hidden");
    btn.classList.add("scale-0");
    dismissNotification(); // Hide notification when popup opens
  } else {
    popup.classList.add("hidden");
    btn.classList.remove("scale-0");
  }
}

function closeAITutorPopup() {
  const popup = document.getElementById("aiTutorPopup");
  const btn = document.getElementById("floatingAITutorBtn");

  aiTutorPopupVisible = false;
  popup.classList.add("hidden");
  btn.classList.remove("scale-0");
}

function sendPopupMessage() {
  const input = document.getElementById("popupChatInput");
  const message = input.value.trim();
  if (!message) return;

  const chatContainer = document.getElementById("popupChatMessages");

  const userMessage = document.createElement("div");
  userMessage.className = "flex justify-end mb-3";
  userMessage.innerHTML = `
    <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-md p-3 max-w-[85%]">
      ${escapeHtml(message)}
    </div>
  `;
  chatContainer.appendChild(userMessage);

  input.value = "";

  const loadingDiv = document.createElement("div");
  loadingDiv.id = "popupAILoading";
  loadingDiv.className = "flex justify-start mb-3";
  loadingDiv.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      AI
    </div>
    <div class="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md p-3">
      <div class="flex gap-1">
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      </div>
    </div>
  `;
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  console.log("Sending popup message:", message);

  fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: message }),
  })
    .then((response) => {
      console.log("Response status:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log("Response data:", data);
      const loading = document.getElementById("popupAILoading");
      if (loading) loading.remove();

      if (data.error) {
        showPopupAIError(data.error);
        return;
      }

      const aiMessage = document.createElement("div");
      aiMessage.className = "flex gap-3 mb-3";
      aiMessage.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          AI
        </div>
        <div class="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none p-3 max-w-[85%]">
          <p class="text-gray-800 dark:text-gray-100 text-sm whitespace-pre-wrap">${escapeHtml(data.reply)}</p>
        </div>
      `;
      chatContainer.appendChild(aiMessage);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    })
    .catch((error) => {
      console.error("Error:", error);
      const loading = document.getElementById("popupAILoading");
      if (loading) loading.remove();
      showPopupAIError(
        "Could not connect to AI server. Make sure the backend is running.",
      );
    });
}

function showPopupAIError(errorMsg) {
  const chatContainer = document.getElementById("popupChatMessages");
  const errorDiv = document.createElement("div");
  errorDiv.className = "flex justify-start mb-3";
  errorDiv.innerHTML = `
    <div class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-2xl rounded-bl-md p-3 max-w-[85%]">
      <strong>Error:</strong> ${escapeHtml(errorMsg)}
    </div>
  `;
  chatContainer.appendChild(errorDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Drag functionality for AI Tutor Popup
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let draggedElement = null;

document.addEventListener("DOMContentLoaded", function () {
  const popupHeader = document.getElementById("aiTutorPopupHeader");
  const popup = document.getElementById("aiTutorPopup");

  if (popupHeader && popup) {
    popupHeader.addEventListener("mousedown", startDrag);
    popupHeader.addEventListener("touchstart", startDrag, { passive: false });
  }

  document.addEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag, { passive: false });

  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);

  // Initialize AI tutor notification system
  initAITutorNotification();

  checkSharedWord();
});

// AI Tutor Notification System
const aiTutorMessages = [
  "Ready to learn Chinese? I'm here to help! 🎯",
  "Practice makes perfect! Let's start today. 📚",
  "Need help with pronunciation? Just ask! 🔊",
  "HSK vocabulary made easy with practice! ✨",
  "Consistency is key to mastering Chinese! 🗝️",
  "I can help with grammar, conversations, and more! 💬",
  "Let's make today productive! 🚀",
  "Chinese characters are beautiful! Let's explore! 🎨",
  "Every word learned is progress! Keep going! 📈",
  "I'm your personal AI Chinese tutor! 🤖",
];

let lastNotificationIndex = -1;

function initAITutorNotification() {
  // Show first notification after 1 minute
  setTimeout(() => {
    showAITutorNotification();
  }, 60000);

  // Also show a test notification immediately to verify it works
  setTimeout(() => {
    showAITutorNotification();
  }, 1000);
}

function showAITutorNotification() {
  const notification = document.getElementById("aiTutorNotification");
  const notificationText = document.getElementById("aiTutorNotificationText");

  if (!notification || !notificationText) return;

  // Get next message (cycling through messages)
  lastNotificationIndex = (lastNotificationIndex + 1) % aiTutorMessages.length;
  const message = aiTutorMessages[lastNotificationIndex];

  // Update text
  notificationText.textContent = message;

  // Show notification
  notification.classList.remove("hidden");

  // Auto-hide after 8 seconds
  setTimeout(() => {
    hideAITutorNotification();
  }, 8000);
}

function hideAITutorNotification() {
  const notification = document.getElementById("aiTutorNotification");
  if (notification) {
    notification.classList.add("hidden");
  }
}

// Schedule notifications every 1 minute
setInterval(() => {
  showAITutorNotification();
}, 60000);

checkSharedWord();

function startDrag(e) {
  const popup = document.getElementById("aiTutorPopup");
  if (!popup) return;

  isDragging = true;
  draggedElement = popup;

  const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

  const rect = popup.getBoundingClientRect();
  dragOffsetX = clientX - rect.left;
  dragOffsetY = clientY - rect.top;

  popup.style.transition = "none";
  e.preventDefault();
}

function drag(e) {
  if (!isDragging || !draggedElement) return;

  const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

  let newX = clientX - dragOffsetX;
  let newY = clientY - dragOffsetY;

  const maxX = window.innerWidth - draggedElement.offsetWidth;
  const maxY = window.innerHeight - draggedElement.offsetHeight;

  newX = Math.max(0, Math.min(newX, maxX));
  newY = Math.max(0, Math.min(newY, maxY));

  draggedElement.style.left = newX + "px";
  draggedElement.style.top = newY + "px";
  draggedElement.style.right = "auto";

  e.preventDefault();
}

function endDrag() {
  if (draggedElement) {
    draggedElement.style.transition = "all 0.3s ease";
  }
  isDragging = false;
  draggedElement = null;
}

function copyMessage(msgId) {
  const msgElement = document.getElementById(msgId);
  const textContent = msgElement.querySelector(
    ".whitespace-pre-wrap",
  ).textContent;
  navigator.clipboard.writeText(textContent).then(() => {
    // Show copied feedback
    const btn = msgElement.querySelector("button");
    const originalText = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  });
}

function regenerateResponse(msgId, originalMessage) {
  const msgElement = document.getElementById(msgId);
  const textDiv = msgElement.querySelector(".whitespace-pre-wrap");

  // Show loading
  textDiv.innerHTML = `
    <div class="flex gap-1">
      <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
      <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
      <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
    </div>
  `;

  // Call API again
  fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: originalMessage,
      history: chatHistory.slice(-2),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.reply) {
        textDiv.textContent = data.reply;
      } else {
        textDiv.textContent = "Sorry, could not regenerate response.";
      }
    })
    .catch((error) => {
      textDiv.textContent = "Error regenerating response.";
    });
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

// Search across all HSK levels
function performSearch(query) {
  const trimmedQuery = query.trim().toLowerCase();
  const clearBtn = document.getElementById("clearSearchBtn");

  if (trimmedQuery === "") {
    clearSearch();
    return;
  }

  // Show clear button
  if (clearBtn) clearBtn.classList.remove("hidden");

  const results = [];

  // Search through all HSK levels
  const levels = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"];
  const levelNames = {
    hsk1: "HSK 1",
    hsk2: "HSK 2",
    hsk3: "HSK 3",
    hsk4: "HSK 4",
    hsk5: "HSK 5",
    hsk6: "HSK 6",
  };

  // Check if searching by HSK number (e.g., "hsk1", "hsk 2", "1", "2", etc.)
  let hskLevelFilter = null;
  const hskMatch = trimmedQuery.match(/hsk\s*(\d)|^(\d)$/i);
  if (hskMatch) {
    const levelNum = hskMatch[1] || hskMatch[2];
    if (levelNum >= 1 && levelNum <= 6) {
      hskLevelFilter = `hsk${levelNum}`;
    }
  }

  for (const level of levels) {
    // If filtering by HSK level, only search that level
    if (hskLevelFilter && level !== hskLevelFilter) continue;

    const vocab = hskVocabulary[level];
    if (!vocab) continue;

    for (const word of vocab) {
      let matchFound = false;
      let matchType = "";

      // Search by Chinese character
      if (word.char && word.char.toLowerCase().includes(trimmedQuery)) {
        matchFound = true;
        matchType = "Chinese Character";
      }

      // Search by Pinyin (remove tone marks for comparison)
      if (word.pinyin) {
        const pinyinNoTones = removeTones(word.pinyin.toLowerCase());
        const queryNoTones = removeTones(trimmedQuery);
        if (
          pinyinNoTones.includes(queryNoTones) ||
          word.pinyin.toLowerCase().includes(trimmedQuery)
        ) {
          matchFound = true;
          matchType = "Pinyin";
        }
      }

      // Search by English meaning
      if (word.meaning && word.meaning.toLowerCase().includes(trimmedQuery)) {
        matchFound = true;
        matchType = "English Meaning";
      }

      // If searching by HSK number, match all words in that level
      if (hskLevelFilter) {
        matchFound = true;
        matchType = "HSK Level";
      }

      if (matchFound) {
        results.push({
          ...word,
          level: level,
          levelName: levelNames[level],
          matchType: matchType,
        });
      }
    }
  }

  // Display results
  displaySearchResults(results, trimmedQuery);
}

// Remove tone marks from pinyin for easier searching
function removeTones(str) {
  const toneMap = {
    ā: "a",
    á: "a",
    ǎ: "a",
    à: "a",
    ē: "e",
    é: "e",
    ě: "e",
    è: "e",
    ī: "i",
    í: "i",
    ǐ: "i",
    ì: "i",
    ō: "o",
    ó: "o",
    ǒ: "o",
    ò: "o",
    ū: "u",
    ú: "u",
    ǔ: "u",
    ù: "u",
    ǖ: "v",
    ǘ: "v",
    ǚ: "v",
    ǜ: "v",
    ü: "v",
    ń: "n",
    ň: "n",
    ǹ: "n",
    ḿ: "m",
  };

  return str.replace(
    /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/g,
    (match) => toneMap[match] || match,
  );
}

// Display search results
function displaySearchResults(results, query) {
  const searchTab = document.getElementById("searchResultsTab");
  const resultsContainer = document.getElementById("searchResults");
  const resultCount = document.getElementById("searchResultCount");

  if (!searchTab || !resultsContainer) return;

  // Hide all other tabs and show search results
  const tabs = ["learn", "flashcards", "practice", "ai-tutor", "progress"];
  tabs.forEach((tab) => {
    const tabElement = document.getElementById(`${tab}Tab`);
    if (tabElement) tabElement.classList.add("hidden");
  });

  searchTab.classList.remove("hidden");

  // Update result count
  if (resultCount) {
    resultCount.textContent = `Found ${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`;
  }

  // Clear previous results
  resultsContainer.innerHTML = "";

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <div class="text-4xl mb-4">🔍</div>
        <p>No results found for "${query}"</p>
        <p class="text-sm mt-2">Try searching with Chinese characters, Pinyin, or English meaning</p>
      </div>
    `;
    return;
  }

  // Display each result
  results.forEach((word, index) => {
    const resultCard = document.createElement("div");
    resultCard.className =
      "bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer";
    resultCard.onclick = () => showWordDetails(word);

    resultCard.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="text-4xl font-bold text-gray-800 dark:text-white">${word.char}</div>
          <div>
            <div class="text-lg font-semibold text-blue-600 dark:text-blue-400">${word.pinyin}</div>
            <div class="text-gray-600 dark:text-gray-300">${word.meaning}</div>
          </div>
        </div>
        <div class="text-right flex items-center gap-3">
          <button onclick="event.stopPropagation(); speakChinese('${word.char}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1">
            🔊
          </button>
          <div>
            <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              word.level === "hsk1"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : word.level === "hsk2"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : word.level === "hsk3"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : word.level === "hsk4"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      : word.level === "hsk5"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            }">
              ${word.levelName}
            </span>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Matched: ${word.matchType}</div>
          </div>
        </div>
      </div>
      ${
        word.breakdown
          ? `
        <div class="mt-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
          <strong>Breakdown:</strong> ${word.breakdown}
        </div>
      `
          : ""
      }
    `;

    resultsContainer.appendChild(resultCard);
  });
}

// Show word details and switch to that HSK level
function showWordDetails(word) {
  // Switch to the word's HSK level
  switchLevel(word.level);

  // Find the word in the vocabulary and set it as current
  const vocab = hskVocabulary[word.level];
  const wordIndex = vocab.findIndex((w) => w.char === word.char);

  if (wordIndex !== -1) {
    currentCharIndex = wordIndex;
    updateLearnTab();

    // Show the learn tab
    showTab("learn");

    // Clear search
    clearSearch();
  }
}

// Clear search and return to normal view
function clearSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const searchTab = document.getElementById("searchResultsTab");

  if (searchInput) searchInput.value = "";
  if (clearBtn) clearBtn.classList.add("hidden");
  if (searchTab) searchTab.classList.add("hidden");

  // Show the learn tab
  showTab("learn");
}

// ==========================================
// ADVANCED SEARCH FUNCTIONALITY
// ==========================================

let searchHistory = [];
let advancedSearchVisible = false;

// Toggle advanced search options
function toggleAdvancedSearch() {
  const options = document.getElementById("advancedSearchOptions");
  const icon = document.getElementById("advancedSearchIcon");

  if (options) {
    advancedSearchVisible = !advancedSearchVisible;
    if (advancedSearchVisible) {
      options.classList.remove("hidden");
      if (icon) icon.textContent = "▼";
    } else {
      options.classList.add("hidden");
      if (icon) icon.textContent = "▶";
    }
  }
}

// Get selected HSK levels
function getSelectedLevels() {
  const levels = [];
  for (let i = 1; i <= 6; i++) {
    const checkbox = document.getElementById(`filterHSK${i}`);
    if (checkbox && checkbox.checked) {
      levels.push(`hsk${i}`);
    }
  }
  return levels;
}

// Get search field options
function getSearchFields() {
  return {
    char: document.getElementById("searchInChar")?.checked ?? true,
    pinyin: document.getElementById("searchInPinyin")?.checked ?? true,
    meaning: document.getElementById("searchInMeaning")?.checked ?? true,
  };
}

// Get sort option
function getSortOption() {
  return document.getElementById("sortResults")?.value ?? "relevance";
}

// Get additional options
function getAdditionalOptions() {
  return {
    exactMatch: document.getElementById("exactMatch")?.checked ?? false,
    caseSensitive: document.getElementById("caseSensitive")?.checked ?? false,
  };
}

// Advanced search with filters
function performAdvancedSearch(query) {
  const trimmedQuery = query.trim();
  const clearBtn = document.getElementById("clearSearchBtn");

  if (trimmedQuery === "") {
    clearSearch();
    return;
  }

  // Show clear button
  if (clearBtn) clearBtn.classList.remove("hidden");

  // Add to search history
  addToSearchHistory(trimmedQuery);

  const results = [];
  const selectedLevels = getSelectedLevels();
  const searchFields = getSearchFields();
  const options = getAdditionalOptions();

  const levelNames = {
    hsk1: "HSK 1",
    hsk2: "HSK 2",
    hsk3: "HSK 3",
    hsk4: "HSK 4",
    hsk5: "HSK 5",
    hsk6: "HSK 6",
  };

  // Prepare query based on options
  let searchQuery = options.caseSensitive
    ? trimmedQuery
    : trimmedQuery.toLowerCase();

  for (const level of selectedLevels) {
    const vocab = hskVocabulary[level];
    if (!vocab) continue;

    for (const word of vocab) {
      let matchFound = false;
      let matchType = "";
      let relevanceScore = 0;

      // Search by Chinese character
      if (searchFields.char && word.char) {
        const charToMatch = options.caseSensitive
          ? word.char
          : word.char.toLowerCase();
        if (options.exactMatch) {
          if (charToMatch === searchQuery) {
            matchFound = true;
            matchType = "Chinese Character (Exact)";
            relevanceScore = 100;
          }
        } else {
          if (charToMatch.includes(searchQuery)) {
            matchFound = true;
            matchType = "Chinese Character";
            relevanceScore = charToMatch === searchQuery ? 100 : 50;
          }
        }
      }

      // Search by Pinyin
      if (searchFields.pinyin && word.pinyin && !matchFound) {
        const pinyinToMatch = options.caseSensitive
          ? word.pinyin
          : word.pinyin.toLowerCase();
        const pinyinNoTones = removeTones(pinyinToMatch);
        const queryNoTones = removeTones(searchQuery);

        if (options.exactMatch) {
          if (pinyinToMatch === searchQuery || pinyinNoTones === queryNoTones) {
            matchFound = true;
            matchType = "Pinyin (Exact)";
            relevanceScore = 90;
          }
        } else {
          if (
            pinyinToMatch.includes(searchQuery) ||
            pinyinNoTones.includes(queryNoTones)
          ) {
            matchFound = true;
            matchType = "Pinyin";
            relevanceScore = pinyinToMatch === searchQuery ? 90 : 40;
          }
        }
      }

      // Search by English meaning
      if (searchFields.meaning && word.meaning && !matchFound) {
        const meaningToMatch = options.caseSensitive
          ? word.meaning
          : word.meaning.toLowerCase();
        if (options.exactMatch) {
          if (meaningToMatch === searchQuery) {
            matchFound = true;
            matchType = "English Meaning (Exact)";
            relevanceScore = 80;
          }
        } else {
          if (meaningToMatch.includes(searchQuery)) {
            matchFound = true;
            matchType = "English Meaning";
            relevanceScore = meaningToMatch === searchQuery ? 80 : 30;
          }
        }
      }

      if (matchFound) {
        results.push({
          ...word,
          level: level,
          levelName: levelNames[level],
          matchType: matchType,
          relevanceScore: relevanceScore,
        });
      }
    }
  }

  // Sort results
  sortResults(results);

  // Display results
  displaySearchResults(results, trimmedQuery);
}

// Sort results based on selected option
function sortResults(results) {
  const sortOption = getSortOption();

  switch (sortOption) {
    case "relevance":
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      break;
    case "level-asc":
      results.sort((a, b) => {
        const levelA = parseInt(a.level.replace("hsk", ""));
        const levelB = parseInt(b.level.replace("hsk", ""));
        return levelA - levelB;
      });
      break;
    case "level-desc":
      results.sort((a, b) => {
        const levelA = parseInt(a.level.replace("hsk", ""));
        const levelB = parseInt(b.level.replace("hsk", ""));
        return levelB - levelA;
      });
      break;
    case "char-asc":
      results.sort((a, b) => a.char.localeCompare(b.char, "zh-CN"));
      break;
    case "pinyin-asc":
      results.sort((a, b) => {
        const pinyinA = a.pinyin || "";
        const pinyinB = b.pinyin || "";
        return pinyinA.localeCompare(pinyinB);
      });
      break;
  }
}

// Search history management
function addToSearchHistory(query) {
  // Remove if already exists
  searchHistory = searchHistory.filter((q) => q !== query);
  // Add to beginning
  searchHistory.unshift(query);
  // Keep only last 10 searches
  if (searchHistory.length > 10) {
    searchHistory = searchHistory.slice(0, 10);
  }
  // Save to localStorage
  saveSearchHistory();
}

function saveSearchHistory() {
  try {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  } catch (e) {
    console.log("Could not save search history");
  }
}

function loadSearchHistory() {
  try {
    const saved = localStorage.getItem("searchHistory");
    if (saved) {
      searchHistory = JSON.parse(saved);
    }
  } catch (e) {
    console.log("Could not load search history");
  }
}

function getSearchHistory() {
  return searchHistory;
}

function clearSearchHistory() {
  searchHistory = [];
  saveSearchHistory();
}

// Override the original performSearch to use advanced search
function performSearch(query) {
  performAdvancedSearch(query);
}

// Initialize search history on load
loadSearchHistory();

// ==========================================
// ENHANCED SEARCH DISPLAY & PAGINATION
// ==========================================

let currentSearchResults = [];
let currentPage = 1;
const resultsPerPage = 20;

// Display search results with pagination
function displaySearchResults(results, query) {
  const searchTab = document.getElementById("searchResultsTab");
  const resultsContainer = document.getElementById("searchResults");
  const resultCount = document.getElementById("searchResultCount");
  const filtersSummary = document.getElementById("searchFiltersSummary");
  const paginationContainer = document.getElementById("searchPagination");

  if (!searchTab || !resultsContainer) return;

  // Store results for pagination
  currentSearchResults = results;
  currentPage = 1;

  // Hide all other tabs and show search results
  const tabs = ["learn", "flashcards", "practice", "ai-tutor", "progress"];
  tabs.forEach((tab) => {
    const tabElement = document.getElementById(`${tab}Tab`);
    if (tabElement) tabElement.classList.add("hidden");
  });

  searchTab.classList.remove("hidden");

  // Update result count
  if (resultCount) {
    resultCount.textContent = `Found ${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`;
  }

  // Show filters summary
  if (filtersSummary) {
    const selectedLevels = getSelectedLevels()
      .map((l) => l.toUpperCase().replace("HSK", "HSK "))
      .join(", ");
    const searchFields = [];
    if (document.getElementById("searchInChar")?.checked)
      searchFields.push("Chinese");
    if (document.getElementById("searchInPinyin")?.checked)
      searchFields.push("Pinyin");
    if (document.getElementById("searchInMeaning")?.checked)
      searchFields.push("English");
    const options = getAdditionalOptions();
    const sortOption = getSortOption();

    let summary = `Searching in: ${searchFields.join(", ")} | Levels: ${selectedLevels} | Sort: ${sortOption}`;
    if (options.exactMatch) summary += " | Exact Match";
    if (options.caseSensitive) summary += " | Case Sensitive";

    filtersSummary.textContent = summary;
  }

  // Show search history
  showSearchHistory();

  // Render current page
  renderCurrentPage();

  // Render pagination
  renderPagination();
}

// Render current page of results
function renderCurrentPage() {
  const resultsContainer = document.getElementById("searchResults");
  if (!resultsContainer) return;

  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const pageResults = currentSearchResults.slice(startIndex, endIndex);

  resultsContainer.innerHTML = "";

  if (currentSearchResults.length === 0) {
    resultsContainer.innerHTML = `
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <div class="text-4xl mb-4">🔍</div>
        <p>No results found</p>
        <p class="text-sm mt-2">Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }

  // Display each result
  pageResults.forEach((word, index) => {
    const resultCard = document.createElement("div");
    resultCard.className =
      "bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer";
    resultCard.onclick = () => showWordDetails(word);

    resultCard.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="text-4xl font-bold text-gray-800 dark:text-white">${word.char}</div>
          <div>
            <div class="text-lg font-semibold text-blue-600 dark:text-blue-400">${word.pinyin}</div>
            <div class="text-gray-600 dark:text-gray-300">${word.meaning}</div>
          </div>
        </div>
        <div class="text-right flex items-center gap-3">
          <button onclick="event.stopPropagation(); speakChinese('${word.char}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold transition-all flex items-center gap-1">
            🔊
          </button>
          <div>
            <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${getLevelBadgeClass(word.level)}">
              ${word.levelName}
            </span>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Matched: ${word.matchType}</div>
          </div>
        </div>
      </div>
      ${
        word.breakdown
          ? `
        <div class="mt-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
          <strong>Breakdown:</strong> ${word.breakdown}
        </div>
      `
          : ""
      }
    `;

    resultsContainer.appendChild(resultCard);
  });
}

// Get level badge class
function getLevelBadgeClass(level) {
  const classes = {
    hsk1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    hsk2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    hsk3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    hsk4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    hsk5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    hsk6: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return classes[level] || classes["hsk1"];
}

// ==========================================
// PAGINATION & SEARCH HISTORY FUNCTIONS
// ==========================================

// Render pagination controls
function renderPagination() {
  const paginationContainer = document.getElementById("searchPagination");
  if (!paginationContainer) return;

  const totalPages = Math.ceil(currentSearchResults.length / resultsPerPage);

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let html = "";

  // Previous button
  if (currentPage > 1) {
    html +=
      '<button onclick="goToPage(' +
      (currentPage - 1) +
      ')" class="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all">Prev</button>';
  } else {
    html +=
      '<button disabled class="px-3 py-1 rounded-lg bg-gray-200 text-gray-400 cursor-not-allowed">Prev</button>';
  }

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html +=
        '<button class="px-3 py-1 rounded-lg bg-blue-500 text-white">' +
        i +
        "</button>";
    } else if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      html +=
        '<button onclick="goToPage(' +
        i +
        ')" class="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all">' +
        i +
        "</button>";
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += '<span class="px-2 text-gray-500">...</span>';
    }
  }

  // Next button
  if (currentPage < totalPages) {
    html +=
      '<button onclick="goToPage(' +
      (currentPage + 1) +
      ')" class="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all">Next</button>';
  } else {
    html +=
      '<button disabled class="px-3 py-1 rounded-lg bg-gray-200 text-gray-400 cursor-not-allowed">Next</button>';
  }

  html +=
    '<span class="ml-4 text-sm text-gray-500 dark:text-gray-400">Page ' +
    currentPage +
    " of " +
    totalPages +
    "</span>";

  paginationContainer.innerHTML = html;
}

// Go to specific page
function goToPage(page) {
  const totalPages = Math.ceil(currentSearchResults.length / resultsPerPage);
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  renderCurrentPage();
  renderPagination();

  const searchTab = document.getElementById("searchResultsTab");
  if (searchTab) {
    searchTab.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Show search history
function showSearchHistory() {
  const historyContainer = document.getElementById("searchHistoryContainer");
  const historyList = document.getElementById("searchHistoryList");

  if (!historyContainer || !historyList) return;

  const history = getSearchHistory();

  if (history.length === 0) {
    historyContainer.classList.add("hidden");
    return;
  }

  historyContainer.classList.remove("hidden");

  let html = "";
  history.forEach(function (query) {
    html +=
      "<button onclick=\"quickSearch('" +
      query.replace(/'/g, "\\'") +
      '\')" class="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-all">' +
      query +
      "</button>";
  });

  historyList.innerHTML = html;
}

// Quick search from history
function quickSearch(query) {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.value = query;
    performSearch(query);
  }
}

// Clear search history UI
function clearSearchHistoryUI() {
  clearSearchHistory();
  showSearchHistory();
}

// Export search results to CSV
function exportSearchResults() {
  if (currentSearchResults.length === 0) return;

  let csv = "Chinese,Pinyin,Meaning,HSK Level,Breakdown\n";
  currentSearchResults.forEach(function (word) {
    csv +=
      '"' +
      word.char +
      '","' +
      word.pinyin +
      '","' +
      word.meaning +
      '","' +
      word.levelName +
      '","' +
      (word.breakdown || "") +
      '"\n';
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "search_results.csv";
  link.click();
}

// Settings Modal Functions
function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.remove("hidden");
    updateLogoPreview();
    updateFaviconPreview();
  }
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// Logo Upload Functions
function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image file.");
    return;
  }

  // Read file as base64
  const reader = new FileReader();
  reader.onload = function (e) {
    const logoData = e.target.result;

    // Save to localStorage
    localStorage.setItem("customLogo", logoData);

    // Update logo display
    updateLogoDisplay(logoData);
    updateLogoPreview();
  };
  reader.readAsDataURL(file);
}

function updateLogoDisplay(logoData) {
  const logoImage = document.getElementById("logoImage");
  const logoText = document.getElementById("logoText");

  if (logoImage && logoText) {
    if (logoData) {
      logoImage.src = logoData;
      logoImage.classList.remove("hidden");
      logoText.classList.add("hidden");
    } else {
      logoImage.classList.add("hidden");
      logoText.classList.remove("hidden");
    }
  }
}

function updateLogoPreview() {
  const logoData = localStorage.getItem("customLogo");
  const logoPreviewImage = document.getElementById("logoPreviewImage");
  const logoPreviewText = document.getElementById("logoPreviewText");

  if (logoPreviewImage && logoPreviewText) {
    if (logoData) {
      logoPreviewImage.src = logoData;
      logoPreviewImage.classList.remove("hidden");
      logoPreviewText.classList.add("hidden");
    } else {
      logoPreviewImage.classList.add("hidden");
      logoPreviewText.classList.remove("hidden");
    }
  }
}

function resetLogo() {
  localStorage.removeItem("customLogo");
  updateLogoDisplay(null);
  updateLogoPreview();
}

// Favicon Upload Functions
function handleFaviconUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image file.");
    return;
  }

  // Read file as base64
  const reader = new FileReader();
  reader.onload = function (e) {
    const faviconData = e.target.result;

    // Save to localStorage
    localStorage.setItem("customFavicon", faviconData);

    // Update favicon display
    updateFaviconDisplay(faviconData);
    updateFaviconPreview();
  };
  reader.readAsDataURL(file);
}

function updateFaviconDisplay(faviconData) {
  const favicon = document.getElementById("favicon");
  if (favicon) {
    if (faviconData) {
      favicon.href = faviconData;
    } else {
      // Reset to default emoji favicon
      favicon.href =
        "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>学</text></svg>";
    }
  }
}

function updateFaviconPreview() {
  const faviconData = localStorage.getItem("customFavicon");
  const faviconPreviewImage = document.getElementById("faviconPreviewImage");
  const faviconPreviewText = document.getElementById("faviconPreviewText");

  if (faviconPreviewImage && faviconPreviewText) {
    if (faviconData) {
      faviconPreviewImage.src = faviconData;
      faviconPreviewImage.classList.remove("hidden");
      faviconPreviewText.classList.add("hidden");
    } else {
      faviconPreviewImage.classList.add("hidden");
      faviconPreviewText.classList.remove("hidden");
    }
  }
}

function resetFavicon() {
  localStorage.removeItem("customFavicon");
  updateFaviconDisplay(null);
  updateFaviconPreview();
}

// Load saved logo and favicon on page load
function loadCustomBranding() {
  const savedLogo = localStorage.getItem("customLogo");
  const savedFavicon = localStorage.getItem("customFavicon");

  if (savedLogo) {
    updateLogoDisplay(savedLogo);
  }

  if (savedFavicon) {
    updateFaviconDisplay(savedFavicon);
  }
}

// About Modal Functions
function showAboutModal() {
  const modal = document.getElementById("aboutModal");
  const modalContent = document.getElementById("aboutModalContent");

  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    // Animate in
    setTimeout(() => {
      if (modalContent) {
        modalContent.classList.remove("scale-95", "opacity-0");
        modalContent.classList.add("scale-100", "opacity-100");
      }
    }, 10);
  }
}

function closeAboutModal() {
  const modal = document.getElementById("aboutModal");
  const modalContent = document.getElementById("aboutModalContent");

  if (modalContent) {
    modalContent.classList.remove("scale-100", "opacity-100");
    modalContent.classList.add("scale-95", "opacity-0");
  }

  // Wait for animation to finish before hiding
  setTimeout(() => {
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }, 300);
}

// Close about modal when pressing Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeAboutModal();
  }
});

// Main initialization on page load
document.addEventListener("DOMContentLoaded", function () {
  loadProgress();
  loadCustomBranding();
  initializeUI();
  startNotificationSystem();
  startOnlineTracking();
});

// Online users tracking
function startOnlineTracking() {
  // Generate or get unique user ID
  let userId = localStorage.getItem("xuetong_user_id");
  if (!userId) {
    userId =
      "user-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("xuetong_user_id", userId);
  }

  // Ping server immediately to register as online
  pingServer(userId);

  // Update count immediately
  updateOnlineCount();

  // Update every 30 seconds
  setInterval(updateOnlineCount, 30000);

  // Ping server to stay online
  setInterval(() => pingServer(userId), 60000); // Every minute
}

function updateOnlineCount() {
  fetch("http://localhost:3000/api/online-count")
    .then((response) => response.json())
    .then((data) => {
      const onlineCountElement = document.getElementById("onlineCount");
      if (onlineCountElement) {
        onlineCountElement.textContent = data.count || 0;
        console.log("Online count updated:", data.count);
      }
    })
    .catch((error) => {
      console.error("Failed to fetch online count:", error);
    });
}

function pingServer(userId) {
  console.log("Pinging server with userId:", userId);
  fetch("http://localhost:3000/api/ping", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId: userId }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Ping successful:", data);
    })
    .catch((error) => {
      console.error("Failed to ping server:", error);
    });
}
