// ========================================
// Modern Share Results Feature
// ========================================

// Share state
let shareResultData = {
  score: 0,
  totalQuestions: 0,
  accuracy: 0,
  correct: 0,
  wrong: 0,
  timeTaken: 0,
  level: 'HSK 1',
  date: '',
  quizType: ''
};

// Quiz timer tracking
let quizStartTime = 0;

// Initialize timer start when quiz begins
function initQuizTimerTracking() {
  quizStartTime = Date.now();
}

// Get elapsed time in seconds
function getQuizElapsedTime() {
  if (quizStartTime === 0) return 0;
  return Math.floor((Date.now() - quizStartTime) / 1000);
}

// Format time as MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format time as X min Y sec
function formatTimeLong(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} seconds`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
}

// Detect device type
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Detect platform
function getPlatform() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  if (/android/i.test(userAgent)) return 'android';
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return 'ios';
  return 'desktop';
}

// Open Share Modal
function openShareModal() {
  // Capture current quiz results
  const totalQuestions = quizQuestions.length || 10;
  shareResultData = {
    score: quizScore || 0,
    totalQuestions: totalQuestions,
    accuracy: totalQuestions > 0 ? Math.round((quizCorrectCount / totalQuestions) * 100) : 0,
    correct: quizCorrectCount || 0,
    wrong: quizWrongCount || 0,
    timeTaken: getQuizElapsedTime(),
    level: currentLevel ? currentLevel.toUpperCase() : 'HSK 1',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    quizType: getQuizTypeName(quizType)
  };

  // Show modal with animation
  const modal = document.getElementById('shareModal');
  const modalContent = modal.querySelector('.share-modal-content');
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  // Trigger animation
  setTimeout(() => {
    modalContent.classList.add('share-modal-open');
  }, 10);
  
  document.body.style.overflow = 'hidden';

  // Generate share image
  setTimeout(() => generateShareImage(), 100);
  
  // Track analytics
  trackShareEvent('modal_opened');
}

// Get quiz type display name
function getQuizTypeName(type) {
  const types = {
    'char-to-meaning': 'Character → Meaning',
    'char-to-pinyin': 'Character → Pinyin',
    'meaning-to-char': 'Meaning → Character',
    'listening': 'Listening Quiz'
  };
  return types[type] || 'Chinese Quiz';
}

// Close Share Modal
function closeShareModal() {
  const modal = document.getElementById('shareModal');
  const modalContent = modal.querySelector('.share-modal-content');
  
  modalContent.classList.remove('share-modal-open');
  modalContent.classList.add('share-modal-close');
  
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modalContent.classList.remove('share-modal-close');
    document.body.style.overflow = '';
  }, 300);
}

// Generate Share Image using Canvas (High Resolution)
function generateShareImage() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // High resolution for social media (Instagram Story size)
  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  // Background gradient - Modern purple to pink
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(0.3, '#764ba2');
  gradient.addColorStop(0.6, '#f093fb');
  gradient.addColorStop(1, '#f5576c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add decorative elements
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffffff';
  
  // Large circles
  ctx.beginPath();
  ctx.arc(width * 0.15, height * 0.08, width * 0.35, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.92, width * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Medium circles
  ctx.beginPath();
  ctx.arc(width * 0.9, height * 0.15, width * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(width * 0.1, height * 0.85, width * 0.18, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalAlpha = 1;

  // White card background
  const cardX = 60;
  const cardY = 280;
  const cardWidth = width - 120;
  const cardHeight = height - 400;
  
  // Card shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 30;
  
  // Draw rounded rectangle for card
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 50);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // App Logo/Name at top
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('XueTong 学通', width / 2, 120);
  
  // Subtitle
  ctx.font = '28px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText('Smart Learning for Chinese Mastery', width / 2, 170);
  
  // Decorative line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 100, 200);
  ctx.lineTo(width / 2 + 100, 200);
  ctx.stroke();

  // Quiz Completed Title
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 72px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎉 Quiz Completed!', width / 2, cardY + 100);

  // Score Circle
  const circleX = width / 2;
  const circleY = cardY + 320;
  const circleRadius = 130;
  
  // Score circle background
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#f3f4f6';
  ctx.fill();
  
  // Score circle progress arc
  const progress = shareResultData.accuracy / 100;
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
  
  // Gradient for progress arc
  const progressGradient = ctx.createLinearGradient(
    circleX - circleRadius, circleY,
    circleX + circleRadius, circleY
  );
  progressGradient.addColorStop(0, '#10b981');
  progressGradient.addColorStop(1, '#059669');
  ctx.strokeStyle = progressGradient;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.stroke();
  
  // Score text
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 72px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${shareResultData.accuracy}%`, circleX, circleY - 15);
  
  ctx.font = '28px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Accuracy', circleX, circleY + 40);

  // Stats Grid
  const statsY = cardY + 540;
  const statWidth = (cardWidth - 120) / 3;
  const stats = [
    { label: 'Score', value: `${shareResultData.correct}/${shareResultData.totalQuestions}`, color: '#667eea', icon: '⭐' },
    { label: 'Correct', value: shareResultData.correct.toString(), color: '#10b981', icon: '✓' },
    { label: 'Wrong', value: shareResultData.wrong.toString(), color: '#ef4444', icon: '✗' }
  ];

  stats.forEach((stat, index) => {
    const x = cardX + 60 + (index * statWidth) + (statWidth / 2);
    
    // Icon
    ctx.font = '48px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(stat.icon, x, statsY);
    
    // Value
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 56px Inter, system-ui, sans-serif';
    ctx.fillText(stat.value, x, statsY + 65);
    
    // Label
    ctx.fillStyle = '#6b7280';
    ctx.font = '26px Inter, system-ui, sans-serif';
    ctx.fillText(stat.label, x, statsY + 130);
  });

  // Additional Info
  const infoY = statsY + 220;
  ctx.fillStyle = '#9ca3af';
  ctx.font = '28px Inter, system-ui, sans-serif';
  ctx.fillText(`${shareResultData.level} • ${shareResultData.quizType}`, width / 2, infoY);
  ctx.fillText(`Time: ${formatTimeLong(shareResultData.timeTaken)} • ${shareResultData.date}`, width / 2, infoY + 45);

  // Performance Badge
  const badgeY = infoY + 120;
  let badgeText = '';
  let badgeColor = '';
  
  if (shareResultData.accuracy >= 90) {
    badgeText = '🏆 Excellent Performance!';
    badgeColor = '#fbbf24';
  } else if (shareResultData.accuracy >= 70) {
    badgeText = '👏 Great Job!';
    badgeColor = '#10b981';
  } else if (shareResultData.accuracy >= 50) {
    badgeText = '💪 Keep Practicing!';
    badgeColor = '#3b82f6';
  } else {
    badgeText = '📚 Keep Learning!';
    badgeColor = '#8b5cf6';
  }
  
  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 36px Inter, system-ui, sans-serif';
  ctx.fillText(badgeText, width / 2, badgeY);

  // Call to Action
  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 32px Inter, system-ui, sans-serif';
  ctx.fillText('Try this quiz in XueTong!', width / 2, cardY + cardHeight - 100);

  // App URL
  ctx.fillStyle = '#9ca3af';
  ctx.font = '24px Inter, system-ui, sans-serif';
  ctx.fillText('xuetong.app', width / 2, cardY + cardHeight - 55);
  
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Get share image as blob
async function getShareImageBlob() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) return null;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png', 1.0);
  });
}

// Get share image as data URL
function getShareImageDataUrl() {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) return '';
  return canvas.toDataURL('image/png', 1.0);
}

// Download Share Image
async function downloadShareImage() {
  showShareLoading(true);
  
  try {
    // Generate image first
    await generateShareImage();
    
    const dataUrl = getShareImageDataUrl();
    const link = document.createElement('a');
    link.download = `xuetong-quiz-result-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('✓ Report downloaded successfully!', 'success');
    trackShareEvent('download');
  } catch (error) {
    console.error('Download error:', error);
    showToast('Failed to download. Please try again.', 'error');
  }
  
  showShareLoading(false);
}

// Show Toast Notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('shareToast');
  const toastMessage = document.getElementById('shareToastMessage');
  const toastIcon = document.getElementById('shareToastIcon');
  
  if (toast && toastMessage) {
    toastMessage.textContent = message;
    
    // Set icon based on type
    if (toastIcon) {
      if (type === 'success') {
        toastIcon.textContent = '✓';
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 px-6 py-3 rounded-full shadow-lg bg-green-500 text-white animate-slide-up';
      } else if (type === 'error') {
        toastIcon.textContent = '✗';
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 px-6 py-3 rounded-full shadow-lg bg-red-500 text-white animate-slide-up';
      } else {
        toastIcon.textContent = 'ℹ';
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 px-6 py-3 rounded-full shadow-lg glass animate-slide-up';
      }
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

// Show Loading
function showShareLoading(show) {
  const overlay = document.getElementById('shareLoadingOverlay');
  if (overlay) {
    if (show) {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
    } else {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }
  }
}

// Share to WeChat Moments
async function shareToWeChatMoments() {
  showShareLoading(true);
  trackShareEvent('wechat');
  
  try {
    const isMobile = isMobileDevice();
    
    // Download image first
    await downloadShareImage();
    
    if (isMobile) {
      // Try to open WeChat app
      setTimeout(() => {
        window.location.href = 'weixin://';
        setTimeout(() => {
          showToast('Open WeChat and share the downloaded image to Moments', 'info');
        }, 1000);
      }, 500);
    } else {
      showToast('Image downloaded! Open WeChat and share to Moments', 'info');
    }
  } catch (error) {
    showToast('Failed to share. Please try again.', 'error');
  }
  
  showShareLoading(false);
}

// Share to Facebook
async function shareToFacebook() {
  showShareLoading(true);
  trackShareEvent('facebook');
  
  try {
    const isMobile = isMobileDevice();
    const text = `I just scored ${shareResultData.accuracy}% on my ${shareResultData.level} Chinese quiz in XueTong! 🎉 #XueTong #ChineseLearning #HSK`;
    const url = encodeURIComponent(window.location.href);
    
    if (isMobile) {
      // Mobile: Try Facebook app first
      const fbAppUrl = `fb://share?link=${url}`;
      
      // Try to open Facebook app
      window.location.href = fbAppUrl;
      
      // Fallback to web after 2 seconds
      setTimeout(() => {
        const fbWebUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(text)}`;
        window.open(fbWebUrl, '_blank', 'width=600,height=400');
      }, 2000);
    } else {
      // Desktop: Open Facebook share dialog
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    
    showToast('Opening Facebook...', 'info');
  } catch (error) {
    showToast('Failed to share. Please try again.', 'error');
  }
  
  showShareLoading(false);
}

// Share to Instagram
async function shareToInstagram() {
  showShareLoading(true);
  trackShareEvent('instagram');
  
  try {
    const isMobile = isMobileDevice();
    
    // Download image first
    await downloadShareImage();
    
    if (isMobile) {
      // Try to open Instagram app
      setTimeout(() => {
        window.location.href = 'instagram://';
        setTimeout(() => {
          showToast('Open Instagram and share the downloaded image to your Story', 'info');
        }, 1000);
      }, 500);
    } else {
      showToast('Image downloaded! Open Instagram and share to your Story', 'info');
    }
  } catch (error) {
    showToast('Failed to share. Please try again.', 'error');
  }
  
  showShareLoading(false);
}

// Share to WhatsApp
async function shareToWhatsApp() {
  showShareLoading(true);
  trackShareEvent('whatsapp');
  
  try {
    const isMobile = isMobileDevice();
    const text = `I just scored ${shareResultData.accuracy}% (${shareResultData.correct}/${shareResultData.totalQuestions}) on my ${shareResultData.level} Chinese quiz in XueTong! 🎉\n\nTry it yourself: ${window.location.href}\n\n#XueTong #ChineseLearning #HSK`;
    
    if (isMobile) {
      // Mobile: Try WhatsApp app first
      const whatsappAppUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
      window.location.href = whatsappAppUrl;
      
      // Fallback to web after 2 seconds
      setTimeout(() => {
        const whatsappWebUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappWebUrl, '_blank');
      }, 2000);
    } else {
      // Desktop: Open WhatsApp Web
      const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    }
    
    showToast('Opening WhatsApp...', 'info');
  } catch (error) {
    showToast('Failed to share. Please try again.', 'error');
  }
  
  showShareLoading(false);
}

// Share to Douyin
async function shareToDouyin() {
  showShareLoading(true);
  trackShareEvent('douyin');
  
  try {
    // Download image first
    await downloadShareImage();
    
    showToast('Image downloaded! Open Douyin and share the image', 'info');
  } catch (error) {
    showToast('Failed to share. Please try again.', 'error');
  }
  
  showShareLoading(false);
}

// Copy Share Link
async function copyShareLink() {
  showShareLoading(true);
  trackShareEvent('copy_link');
  
  try {
    // Generate a shareable URL with result parameters
    const shareParams = new URLSearchParams({
      level: shareResultData.level,
      score: shareResultData.correct,
      total: shareResultData.totalQuestions,
      accuracy: shareResultData.accuracy,
      type: quizType,
      date: shareResultData.date
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${btoa(shareParams.toString())}`;

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    
    showToast('✓ Link copied successfully!', 'success');
  } catch (error) {
    showToast('Failed to copy. Please try again.', 'error');
  }
  
  showShareLoading(false);
}

// Native Share (Web Share API)
async function nativeShare() {
  trackShareEvent('native_share');
  
  if (navigator.share) {
    try {
      const blob = await getShareImageBlob();
      const file = new File([blob], 'xuetong-quiz-result.png', { type: 'image/png' });

      await navigator.share({
        title: 'XueTong Quiz Result',
        text: `I scored ${shareResultData.accuracy}% on my ${shareResultData.level} Chinese quiz!`,
        files: [file]
      });
      
      showToast('✓ Shared successfully!', 'success');
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Fallback to text-only share
        try {
          await navigator.share({
            title: 'XueTong Quiz Result',
            text: `I scored ${shareResultData.accuracy}% (${shareResultData.correct}/${shareResultData.totalQuestions}) on my ${shareResultData.level} Chinese quiz in XueTong! 🎉 Try it yourself: ${window.location.href}`,
            url: window.location.href
          });
          
          showToast('✓ Shared successfully!', 'success');
        } catch (e) {
          showToast('Failed to share. Please try again.', 'error');
        }
      }
    }
  } else {
    showToast('Native sharing not supported on this device', 'info');
  }
}

// Track Share Event (Analytics)
function trackShareEvent(action) {
  console.log('Share Event:', action, shareResultData);
  
  // You can integrate with your analytics service here
  // Example: Google Analytics, Mixpanel, etc.
  if (typeof gtag !== 'undefined') {
    gtag('event', 'share', {
      'method': action,
      'content_type': 'quiz_result',
      'level': shareResultData.level,
      'accuracy': shareResultData.accuracy
    });
  }
}

// Check for shared result on page load
function checkSharedResult() {
  const urlParams = new URLSearchParams(window.location.search);
  const shareData = urlParams.get('share');

  if (shareData) {
    try {
      const decoded = atob(shareData);
      const params = new URLSearchParams(decoded);
      console.log('Shared result:', {
        level: params.get('level'),
        score: params.get('score'),
        total: params.get('total'),
        accuracy: params.get('accuracy'),
        type: params.get('type'),
        date: params.get('date')
      });
      // Could show a "View Friend's Result" modal here
    } catch (e) {
      console.error('Invalid share data');
    }
  }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('shareModal');
  if (!modal.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      closeShareModal();
    }
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkSharedResult();
});
