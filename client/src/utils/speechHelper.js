// Speech Synthesis and Recognition Helper Utility

// Pre-warm SpeechSynthesis voices
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          window.speechSynthesis.getVoices();
        } catch (e) {}
      };
    }
  } catch (e) {}
}

export const getLocaleForLang = (lang = "en") => {
  const map = {
    en: "en-IN",
    hi: "hi-IN",
    kn: "kn-IN",
  };
  return map[lang] || "en-IN";
};

/**
 * Speaks text using Web Speech API Synthesis and triggers onEnd callback.
 */
export const speakText = (text, lang = "en", onEnd = null) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) setTimeout(onEnd, 200);
    return null;
  }

  // Cancel prior speech cleanly
  try {
    window.speechSynthesis.cancel();
  } catch (e) {}

  if (!text || !text.trim()) {
    if (onEnd) setTimeout(onEnd, 50);
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const locale = getLocaleForLang(lang);
  utterance.lang = locale;
  utterance.rate = 1.05; // Natural conversational pace
  utterance.pitch = 1.0;

  // Try to find a voice matching the language/country
  try {
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) => v.lang === locale || v.lang.replace('_', '-').startsWith(locale.substring(0, 2))
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  } catch (e) {}

  let hasEnded = false;
  let watchdogTimer = null;
  let resumeInterval = null;

  const finish = () => {
    if (!hasEnded) {
      hasEnded = true;
      if (watchdogTimer) clearTimeout(watchdogTimer);
      if (resumeInterval) clearInterval(resumeInterval);
      if (onEnd) onEnd();
    }
  };

  utterance.onend = finish;
  utterance.onerror = (e) => {
    console.warn("Speech synthesis notice:", e);
    finish();
  };

  // Chromium watchdog: prevent Chrome from freezing queue
  resumeInterval = setInterval(() => {
    try {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    } catch (e) {}
  }, 3500);

  // Watchdog timer calculated from text length so speech never hangs the app
  const wordCount = text.split(/\s+/).length;
  const maxExpectedMs = Math.max(3000, Math.ceil(wordCount * 450) + 2000);
  watchdogTimer = setTimeout(() => {
    if (!hasEnded) {
      console.warn("Speech synthesis watchdog triggered completion.");
      finish();
    }
  }, maxExpectedMs);

  // Resume synthesis if browser paused it
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (e) {}

  // Small delay to ensure browser speech engine accepts utterance
  setTimeout(() => {
    try {
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn("Error calling speak:", err);
      finish();
    }
  }, 40);

  return utterance;
};

export const cancelSpeech = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
};

/**
 * Checks if Speech Recognition is supported in the browser.
 */
export const isSpeechRecognitionSupported = () => {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

/**
 * Checks if user's speech is a request to log out.
 */
export const isLogoutCommand = (transcript = "") => {
  if (!transcript) return false;
  const clean = transcript.toLowerCase().trim();
  const logoutWords = [
    "logout", "log out", "sign out", "signout", "exit", "quit", "leave",
    "ಲಾಗ್ ಔಟ್", "ನಿರ್ಗಮಿಸು", "ಮುಕ್ತಾಯ",
    "लॉग आउट", "साइन आउट", "बाहर निकलें", "लॉगआउट"
  ];
  return logoutWords.some(w => clean === w || clean.includes(w));
};

/**
 * Checks if user's speech is a request to view or check applications.
 */
export const isApplicationsCommand = (transcript = "") => {
  if (!transcript) return false;
  const clean = transcript.toLowerCase().trim();
  const appWords = [
    "application", "applications", "my application", "my applications", "status",
    "check application", "check status", "application status", "my status",
    "ಅರ್ಜಿ", "ಅರ್ಜಿಗಳು", "ನನ್ನ ಅರ್ಜಿ", "ನನ್ನ ಅರ್ಜಿಗಳು", "ಸ್ಥಿತಿ", "ಅರ್ಜಿ ಸ್ಥಿತಿ",
    "आवेदन", "मेरे आवेदन", "स्थिति", "आवेदन की स्थिति", "मेरी स्थिति"
  ];
  return appWords.some(w => clean === w || clean.includes(w));
};

/**
 * Checks if user's speech is asking for help or to repeat instructions.
 */
export const isHelpCommand = (transcript = "") => {
  if (!transcript) return false;
  const clean = transcript.toLowerCase().trim();
  const helpWords = [
    "help", "repeat", "options", "what can i say", "what to do", "menu", "instructions", "again",
    "ಸಹಾಯ", "ಮತ್ತೆ ಹೇಳಿ", "ಆಯ್ಕೆಗಳು", "ಸೂಚನೆಗಳು", "ಏನು ಮಾಡಬೇಕು",
    "मदद", "सहायता", "दोबारा", "विकल्प", "निर्देश", "क्या करें"
  ];
  return helpWords.some(w => clean === w || clean.includes(w));
};

/**
 * Helper to match user voice input with available services.
 */
export const matchSpokenService = (transcript, services = []) => {
  if (!transcript) return null;

  const activeServices = (services && services.length > 0) ? services : [
    { id: "income-certificate", name: { en: "Income Certificate", kn: "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ", hi: "आय प्रमाण पत्र" } },
    { id: "pension-certificate", name: { en: "Pension Certificate", kn: "ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ", hi: "पेंशन प्रमाण पत्र" } },
    { id: "disability-certificate", name: { en: "Disability Certificate", kn: "ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ", hi: "दिव्यांगता प्रमाण पत्र" } },
  ];

  const clean = transcript.toLowerCase().trim();

  // Explicit keywords mapping including ordinals and colloquial names
  const keywordMap = [
    {
      id: "income-certificate",
      keywords: [
        "income", "income certificate", "revenue", "revenue certificate", "salary", "salary certificate",
        "earnings", "annual income", "third", "three", "3",
        "ಆದಾಯ", "ಇನ್‌ಕಮ್", "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ", "ಆದಾಯ ಪ್ರಮಾಣ ಪತ್ರ", "ಸಂಬಳ", "ಮೂರನೇ", "ಮೂರು",
        "आय", "इनकम", "आय प्रमाण पत्र", "आय प्रमाण", "वेतन", "तीसरा", "तीन"
      ]
    },
    {
      id: "pension-certificate",
      keywords: [
        "pension", "pension certificate", "old age", "old age pension", "widow", "widow pension",
        "senior citizen", "first", "one", "1",
        "ವೃದ್ಧಾಪ್ಯ", "ಪಿಂಚಣಿ", "ವಿಧವೆ", "ಪೆಂಶನ್", "ವೃದ್ಧಾಪ್ಯ ವೇತನ", "ಮೊದಲ", "ಒಂದು",
        "पेंशन", "वृद्धावस्था", "विधवा", "पेंशन प्रमाण पत्र", "पहला", "एक"
      ]
    },
    {
      id: "disability-certificate",
      keywords: [
        "disability", "disability certificate", "disabled", "handicap", "handicapped", "udid",
        "udid card", "second", "two", "2",
        "ಅಂಗವಿಕಲ", "ವಿಕಲಾಂಗ", "ದಿವ್ಯಾಂಗ", "ಅಂಗವಿಕಲ ಪ್ರಮಾಣಪತ್ರ", "ಎರಡನೇ", "ಎರಡು",
        "दिव्यांग", "विकलांग", "दिव्यांगता प्रमाण पत्र", "विकलांगता", "दूसरा", "दो"
      ]
    }
  ];

  for (const item of keywordMap) {
    if (item.keywords.some(k => clean === k || clean.includes(k.toLowerCase()))) {
      const match = activeServices.find(s => s.id === item.id);
      if (match) return match;
    }
  }

  // Generic name matching
  for (const s of activeServices) {
    const sId = s.id?.toLowerCase();
    if (sId && clean.includes(sId)) return s;

    if (typeof s.name === "string" && clean.includes(s.name.toLowerCase())) {
      return s;
    }

    if (s.name && typeof s.name === "object") {
      for (const val of Object.values(s.name)) {
        if (typeof val === "string" && clean.includes(val.toLowerCase())) {
          return s;
        }
      }
    }
  }

  return null;
};

/**
 * Checks if user's voice input signifies affirmative confirmation ("yes", "correct", etc.)
 */
export const isConfirmationAffirmative = (transcript = "") => {
  if (!transcript) return false;
  const clean = transcript
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .trim();

  const yesWords = [
    "yes", "yeah", "yep", "yup", "ya", "correct", "confirm", "confirmed", "sure", "ok", "okay",
    "right", "fine", "proceed", "submit", "submitting", "accept", "true", "done", "next",
    "perfect", "good", "haan", "ha", "sahi", "theek", "theek hai", "ji haan", "haudhu",
    "haudu", "sari", "aaytu", "khachita", "mundhuvari", "yes please",
    "ಹೌದು", "ಸರಿ", "ಖಚಿತ", "ಮುಂದುವರಿಯಿರಿ", "ಸಲ್ಲಿಸಿ", "ಆಯ್ತು", "ಹಾ",
    "हाँ", "सही", "पुष्टि", "ठीक", "आगे", "जमा", "सबमिट", "हां"
  ];

  const tokens = clean.split(/\s+/);
  return yesWords.some(w => clean === w || clean.includes(w) || tokens.includes(w));
};

/**
 * Checks if user's voice input signifies negative confirmation ("no", "wrong", etc.)
 */
export const isConfirmationNegative = (transcript = "") => {
  if (!transcript) return false;
  const clean = transcript
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .trim();

  const noWords = [
    "no", "nope", "nah", "wrong", "change", "incorrect", "cancel", "repeat", "retry",
    "false", "redo", "not correct", "illa", "thappu", "beda", "matthe",
    "nahi", "galat", "na", "badlo", "dobara", "phir se", "no change", "no wrong",
    "ಇಲ್ಲ", "ತಪ್ಪು", "ಬೇಡ", "ಮತ್ತೆ",
    "नहीं", "गलत", "ना", "बदलो", "दोबारा", "नाही"
  ];

  const tokens = clean.split(/\s+/);
  return noWords.some(w => clean === w || clean.includes(w) || tokens.includes(w));
};