import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  speakText,
  cancelSpeech,
  getLocaleForLang,
  matchSpokenService,
  isConfirmationAffirmative,
  isConfirmationNegative,
  isLogoutCommand,
  isApplicationsCommand,
  isHelpCommand,
  isSpeechRecognitionSupported
} from "../utils/speechHelper";
import { API_BASE_URL } from "../config";

const STATIC_SERVICES = [
  { id: "income-certificate", name: { en: "Income Certificate", kn: "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ", hi: "आय प्रमाण पत्र" }, icon: "💰", category: "Revenue" },
  { id: "pension-certificate", name: { en: "Pension Certificate", kn: "ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ", hi: "पेंशन प्रमाण पत्र" }, icon: "📜", category: "Social Welfare" },
  { id: "disability-certificate", name: { en: "Disability Certificate", kn: "ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ", hi: "दिव्यांगता प्रमाण पत्र" }, icon: "♿", category: "Healthcare" }
];

export default function DashboardVoiceAssistant({
  user,
  services = [],
  applications = [],
  logout,
  lang = "en",
  token
}) {
  const navigate = useNavigate();

  // Form-filling assistant states - matching ServiceForm.jsx architecture
  const [currentValue, setCurrentValue] = useState("");
  const [voiceMode, setVoiceMode] = useState("idle"); // 'idle' | 'asking_greeting' | 'listening_choice' | 'asking_confirmation' | 'listening_confirmation' | 'navigating' | 'speaking'
  const [assistantSpeech, setAssistantSpeech] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [userSaidText, setUserSaidText] = useState("");
  const [pendingService, setPendingService] = useState(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const userName = user?.name || "User";

  // Synchronous State Refs - matching ServiceForm.jsx
  const isMountedRef = useRef(true);
  const recognitionRef = useRef(null);
  const restartTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const activeModeRef = useRef("idle");
  const activeCallbackRef = useRef(null);

  const pendingServiceRef = useRef(null);
  const servicesRef = useRef(services);
  const applicationsRef = useRef(applications);
  const tokenRef = useRef(token);
  const langRef = useRef(lang);
  const userNameRef = useRef(userName);
  const logoutRef = useRef(logout);
  const currentValueRef = useRef(currentValue);

  // Sync state to refs
  useEffect(() => {
    servicesRef.current = services && services.length > 0 ? services : STATIC_SERVICES;
  }, [services]);

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    currentValueRef.current = currentValue;
  }, [currentValue]);

  const translations = {
    en: {
      badge: "Voice & Accessible Service Navigator",
      title: "Which public service would you like to apply for?",
      subtitle: "Speak naturally into your microphone or type your desired service.",
      inputLabel: "Spoken or Typed Service Choice",
      inputPlaceholder: "Speak into microphone (e.g. Pension, Disability, Income) or type...",
      repeatQuestion: "Repeat Options",
      startMic: "Start Listening",
      stopMic: "Stop Listening",
      youSaid: "You said:",
      detected: "Detected service:",
      confirmTitle: "Voice Confirmation",
      confirm: "Yes, Open Application",
      tryAgain: "No, Choose Another",
      sayYesNo: "Say 'Yes' to confirm or 'No' to re-enter.",
      continueBtn: "Continue to Application Form",
      micDenied: "Microphone access is blocked. Click the microphone button to enable it.",
      notFound: "Could not find that service. Please choose Income, Pension, or Disability Certificate."
    },
    hi: {
      badge: "ध्वनि एवं सुलभ सेवा नेविगेटर",
      title: "आप किस सरकारी सेवा के लिए आवेदन करना चाहते हैं?",
      subtitle: "माइक में स्वाभाविक रूप से बोलें या अपनी इच्छित सेवा का नाम लिखें।",
      inputLabel: "बोली गई या लिखी गई सेवा",
      inputPlaceholder: "माइक में बोलें (जैसे पेंशन, दिव्यांगता, आय) या लिखें...",
      repeatQuestion: "विकल्प दोबारा सुनें",
      startMic: "सुनना शुरू करें",
      stopMic: "सुनना बंद करें",
      youSaid: "आपने कहा:",
      detected: "पहचानी गई सेवा:",
      confirmTitle: "ध्वनि पुष्टि",
      confirm: "हाँ, आवेदन फॉर्म खोलें",
      tryAgain: "नहीं, दूसरी सेवा चुनें",
      sayYesNo: "पुष्टि के लिए 'हाँ' कहें या दोबारा बोलने के लिए 'नहीं' कहें।",
      continueBtn: "आवेदन फॉर्म पर आगे बढ़ें",
      micDenied: "माइक्रोफ़ोन पहुंच अवरुद्ध है। अनुमति देने के लिए माइक बटन पर क्लिक करें।",
      notFound: "सेवा नहीं मिली। कृपया आय, पेंशन या दिव्यांगता प्रमाण पत्र चुनें।"
    },
    kn: {
      badge: "ಧ್ವನಿ ಮತ್ತು ಪ್ರವೇಶಿಸಬಹುದಾದ ಸೇವಾ ಸಹಾಯಕ",
      title: "ನೀವು ಯಾವ ಸಾರ್ವಜನಿಕ ಸೇವೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೀರಿ?",
      subtitle: "ಮೈಕ್ರೊಫೋನ್‌ನಲ್ಲಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ ಅಥವಾ ನೀವು ಬಯಸಿದ ಸೇವೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ.",
      inputLabel: "ಹೇಳಿದ ಅಥವಾ ಟೈಪ್ ಮಾಡಿದ ಸೇವಾ ಆಯ್ಕೆ",
      inputPlaceholder: "ಮಾತನಾಡಿ (ಉದಾ: ಪಿಂಚಣಿ, ವಿಕಲಾಂಗತಾ, ಆದಾಯ) ಅಥವಾ ಟೈಪ್ ಮಾಡಿ...",
      repeatQuestion: "ಆಯ್ಕೆಗಳನ್ನು ಮತ್ತೆ ಕೇಳಿ",
      startMic: "ಕೇಳಲು ಪ್ರಾರಂಭಿಸಿ",
      stopMic: "ಕೇಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ",
      youSaid: "ನೀವು ಹೇಳಿದ್ದು:",
      detected: "ಗುರುತಿಸಲಾದ ಸೇವೆ:",
      confirmTitle: "ಧ್ವನಿ ದೃಢೀಕರಣ",
      confirm: "ಹೌದು, ಅರ್ಜಿ ನಮೂನೆ ತೆರೆಯಿರಿ",
      tryAgain: "ಇಲ್ಲ, ಬೇರೆ ಆಯ್ಕೆಮಾಡಿ",
      sayYesNo: "ದೃಢೀಕರಿಸಲು 'ಹೌದು' ಅಥವಾ ಮತ್ತೊಮ್ಮೆ ಹೇಳಲು 'ಇಲ್ಲ' ಎಂದು ಹೇಳಿ.",
      continueBtn: "ಅರ್ಜಿ ನಮೂನೆಗೆ ಮುಂದುವರಿಯಿರಿ",
      micDenied: "ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಅನುಮತಿಸಲು ಮೈಕ್ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.",
      notFound: "ಸೇವೆ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಆದಾಯ, ಪಿಂಚಣಿ ಅಥವಾ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ."
    }
  };

  const t = translations[lang] || translations.en;

  // Complete recognition shutdown - matching ServiceForm.jsx
  const stopListening = useCallback(() => {
    activeModeRef.current = "idle";
    activeCallbackRef.current = null;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setIsMicActive(false);
  }, []);

  // Forward declarations
  const askGreetingRef = useRef();
  const askForConfirmationRef = useRef();
  const handleConfirmationResponseRef = useRef();
  const handleChoiceSpokenRef = useRef();

  // Robust Speech Recognition Controller with Auto Keep-Alive - matching ServiceForm.jsx
  const startRecognition = useCallback((modeToSet, onResultCallback) => {
    if (!isSpeechRecognitionSupported()) return;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    activeModeRef.current = modeToSet;
    activeCallbackRef.current = onResultCallback;
    setVoiceMode(modeToSet);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = getLocaleForLang(langRef.current);

    rec.onstart = () => {
      if (!isMountedRef.current) return;
      setIsMicActive(true);
      setMicPermissionDenied(false);
    };

    rec.onerror = (e) => {
      if (!isMountedRef.current) return;
      console.warn("[DashboardVoice] Recognition notice:", e.error);

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicPermissionDenied(true);
        setIsMicActive(false);
        activeModeRef.current = "idle";
        return; // Do NOT loop infinitely on permission denied!
      }

      // If unexpected error occurs while still waiting for user speech, auto retry once
      if (activeModeRef.current === modeToSet) {
        restartTimerRef.current = setTimeout(() => {
          if (activeModeRef.current === modeToSet && isMountedRef.current) {
            try {
              rec.start();
            } catch (err) {}
          }
        }, 400);
      }
    };

    rec.onend = () => {
      if (!isMountedRef.current) return;
      setIsMicActive(false);

      // Auto restart if mode is still active and no permission denial
      if (activeModeRef.current === modeToSet) {
        restartTimerRef.current = setTimeout(() => {
          if (activeModeRef.current === modeToSet && isMountedRef.current) {
            try {
              rec.start();
            } catch (err) {}
          }
        }, 350);
      }
    };

    rec.onresult = (event) => {
      if (!isMountedRef.current || activeModeRef.current !== modeToSet) return;

      let finalStr = "";
      let interimStr = "";

      for (let i = 0; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalStr += text + " ";
        } else {
          interimStr += text;
        }
      }

      const activeText = (finalStr + interimStr).replace(/\s+/g, " ").trim();
      if (activeText) {
        setLiveTranscript(activeText);
        setUserSaidText(activeText);
        // Matching ServiceForm.jsx: Populate current value in the input field in real time!
        setCurrentValue(activeText);
        setFieldError("");
      }

      // Clear pending silence timer on new speech input
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (activeText.length > 0) {
        const isConfirmMode = modeToSet.includes("confirmation");

        let debounceDelay = 1400; // Default silence debounce
        if (isConfirmMode) {
          if (isConfirmationAffirmative(activeText) || isConfirmationNegative(activeText)) {
            debounceDelay = 120;
          } else {
            debounceDelay = 400;
          }
        } else {
          const lower = activeText.toLowerCase();
          // Fast debounce for immediate keywords
          if (
            lower.includes("income") ||
            lower.includes("pension") ||
            lower.includes("disability") ||
            lower.includes("udid") ||
            lower.includes("logout") ||
            lower.includes("status") ||
            activeText.includes("ಆದಾಯ") ||
            activeText.includes("ಪಿಂಚಣಿ") ||
            activeText.includes("ವಿಕಲಾಂಗ") ||
            activeText.includes("आय") ||
            activeText.includes("पेंशन") ||
            activeText.includes("दिव्यांग")
          ) {
            debounceDelay = 500;
          }
        }

        silenceTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current || activeModeRef.current !== modeToSet) return;

          activeModeRef.current = "processing";
          const callbackToRun = activeCallbackRef.current;
          activeCallbackRef.current = null;

          try {
            rec.abort();
          } catch (e) {}

          setIsMicActive(false);

          if (callbackToRun) {
            callbackToRun(activeText);
          }
        }, debounceDelay);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.warn("[DashboardVoice] SpeechRecognition start warning:", err);
    }
  }, []);

  // Ask User for Audio Confirmation ("You chose X, open this form?") - matching ServiceForm.jsx
  const askForConfirmation = useCallback((serviceObj, spokenText) => {
    cancelSpeech();
    stopListening();

    setPendingService(serviceObj);
    pendingServiceRef.current = serviceObj;
    setUserSaidText(spokenText);

    const curLang = langRef.current;
    const sName = serviceObj.name && typeof serviceObj.name === "object"
      ? (serviceObj.name[curLang] || serviceObj.name.en)
      : (serviceObj.name || "Selected Service");

    setCurrentValue(sName);

    const confirmPhrases = {
      en: `You chose: ${sName}. Would you like to open this application form? Say 'Yes' or 'No'.`,
      hi: `आपने चुना: ${sName}। क्या आप यह आवेदन फॉर्म खोलना चाहते हैं? 'हाँ' या 'नहीं' कहें।`,
      kn: `ನೀವು ಆರಿಸಿದ್ದು: ${sName}. ಈ ಅರ್ಜಿ ನಮೂನೆಯನ್ನು ತೆರೆಯಲು ಬಯಸುವಿರಾ? 'ಹೌದು' ಅಥವಾ 'ಇಲ್ಲ' ಎಂದು ಹೇಳಿ.`
    };

    const confirmMsg = confirmPhrases[curLang] || confirmPhrases.en;
    setAssistantSpeech(confirmMsg);
    setVoiceMode("asking_confirmation");

    speakText(confirmMsg, curLang, () => {
      if (!isMountedRef.current) return;
      startRecognition("listening_confirmation", (response) => {
        handleConfirmationResponseRef.current(response, serviceObj);
      });
    });
  }, [stopListening, startRecognition]);

  askForConfirmationRef.current = askForConfirmation;

  // Handle Confirmation Response ('Yes' / 'No' / Correction) - matching ServiceForm.jsx
  const handleConfirmationResponse = useCallback((response, serviceObj) => {
    const curLang = langRef.current;
    setLiveTranscript(response);

    if (isConfirmationAffirmative(response)) {
      // User confirmed YES -> Navigate to the application form
      const target = serviceObj || pendingServiceRef.current;
      if (target) {
        const sName = target.name && typeof target.name === "object"
          ? (target.name[curLang] || target.name.en)
          : (target.name || "Selected Service");

        const navMsg = curLang === "kn"
          ? `${sName} ಅರ್ಜಿ ನಮೂನೆಯನ್ನು ಈಗ ತೆರೆಯಲಾಗುತ್ತಿದೆ.`
          : (curLang === "hi"
            ? `${sName} का आवेदन फॉर्म खोला जा रहा है।`
            : `Opening the ${sName} application form now.`);

        setAssistantSpeech(navMsg);
        setVoiceMode("navigating");

        let navigated = false;
        const doNavigate = () => {
          if (!navigated) {
            navigated = true;
            navigate(`/service/${target.id}`);
          }
        };

        speakText(navMsg, curLang, doNavigate);
        setTimeout(doNavigate, 1500);
      }
    } else if (isConfirmationNegative(response)) {
      // User said NO -> Re-ask and clear
      setPendingService(null);
      pendingServiceRef.current = null;
      setUserSaidText("");
      setLiveTranscript("");
      setCurrentValue("");

      const retryPhrases = {
        en: "Okay, which service would you like to apply for?",
        hi: "ठीक है, आप किस सेवा के लिए आवेदन करना चाहते हैं?",
        kn: "ಸರಿ, ನೀವು ಯಾವ ಸೇವೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೀರಿ?"
      };
      const retryMsg = retryPhrases[curLang] || retryPhrases.en;
      setAssistantSpeech(retryMsg);
      setVoiceMode("asking_greeting");

      speakText(retryMsg, curLang, () => {
        if (!isMountedRef.current) return;
        startRecognition("listening_choice", (text) => {
          handleChoiceSpokenRef.current(text);
        });
      });
    } else {
      // Spoke a different service choice directly
      handleChoiceSpokenRef.current(response);
    }
  }, [navigate, startRecognition]);

  handleConfirmationResponseRef.current = handleConfirmationResponse;

  // Handle Spoken Choice by Citizen
  const handleChoiceSpoken = useCallback(async (transcript) => {
    if (!transcript || !transcript.trim()) {
      startRecognition("listening_choice", (t) => {
        handleChoiceSpokenRef.current(t);
      });
      return;
    }

    stopListening();
    cancelSpeech();

    const curLang = langRef.current;
    const allServices = (servicesRef.current && servicesRef.current.length > 0)
      ? servicesRef.current
      : STATIC_SERVICES;

    // 1. Direct Voice Command: Logout
    if (isLogoutCommand(transcript)) {
      const exitMsg = curLang === "kn"
        ? "ನಿಮ್ಮನ್ನು ಲಾಗ್ ಔಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ. ಧನ್ಯವಾದಗಳು."
        : (curLang === "hi" ? "आपको लॉग आउट किया जा रहा है। अलविदा।" : "Logging you out. Goodbye.");

      setAssistantSpeech(exitMsg);
      setVoiceMode("speaking");
      speakText(exitMsg, curLang, () => {
        if (logoutRef.current) logoutRef.current();
        navigate("/login");
      });
      setTimeout(() => {
        if (logoutRef.current) logoutRef.current();
        navigate("/login");
      }, 1500);
      return;
    }

    // 2. Direct Voice Command: Check Applications / Status
    if (isApplicationsCommand(transcript)) {
      const apps = applicationsRef.current || [];
      const appMsg = apps.length === 0
        ? (curLang === "kn" ? "ನೀವು ಯಾವುದೇ ಅರ್ಜಿಗಳನ್ನು ಸಲ್ಲಿಸಿಲ್ಲ." : (curLang === "hi" ? "कोई आवेदन नहीं मिला।" : "You currently have no submitted applications."))
        : (curLang === "kn" ? `ನಿಮ್ಮ ಬಳಿ ${apps.length} ಅರ್ಜಿಗಳು ದಾಖಲಾಗಿವೆ.` : (curLang === "hi" ? `आपके पास ${apps.length} आवेदन हैं।` : `You have ${apps.length} submitted applications.`));

      setAssistantSpeech(appMsg);
      setVoiceMode("speaking");
      speakText(appMsg, curLang, () => {
        if (!isMountedRef.current) return;
        askGreetingRef.current();
      });
      return;
    }

    // 3. Direct Voice Command: Help
    if (isHelpCommand(transcript)) {
      const helpMsg = curLang === "kn"
        ? "ನೀವು ಹೇಳಬಹುದು: ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ, ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ, ಅಥವಾ ಲಾಗ್ ಔಟ್."
        : (curLang === "hi"
          ? "आप बोल सकते हैं: आय प्रमाण पत्र, पेंशन प्रमाण पत्र, दिव्यांगता प्रमाण पत्र, या लॉग आउट।"
          : "You can say: Income Certificate, Pension Certificate, Disability Certificate, or Log out.");

      setAssistantSpeech(helpMsg);
      setVoiceMode("speaking");
      speakText(helpMsg, curLang, () => {
        if (!isMountedRef.current) return;
        askGreetingRef.current();
      });
      return;
    }

    // 4. Instant Local Service Match
    const localMatch = matchSpokenService(transcript, allServices);
    if (localMatch) {
      askForConfirmationRef.current(localMatch, transcript);
      return;
    }

    // 5. Gemini AI Natural Language Fallback
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/classify-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {})
        },
        body: JSON.stringify({
          transcript,
          language: curLang,
          services: allServices.map(s => ({ id: s.id, name: s.name, description: s.description }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matchedServiceId) {
          const s = allServices.find(x => x.id === data.matchedServiceId) || { id: data.matchedServiceId, name: data.matchedServiceId };
          askForConfirmationRef.current(s, transcript);
          return;
        }
      }
    } catch (e) {
      console.warn("[DashboardVoice] Gemini intent error:", e);
    }

    // 6. Unrecognized -> Ask clearly and resume listening
    const notUnderstood = curLang === "kn"
      ? "ಸೇವೆ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ ಎಂದು ಹೇಳಿ."
      : (curLang === "hi"
        ? "मैं समझ नहीं पाया। कृपया आय प्रमाण पत्र, पेंशन प्रमाण पत्र, या दिव्यांगता प्रमाण पत्र बोलें।"
        : "I couldn't identify that service. Please say Income Certificate, Pension Certificate, or Disability Certificate.");

    setAssistantSpeech(notUnderstood);
    setFieldError(t.notFound);
    setVoiceMode("speaking");

    speakText(notUnderstood, curLang, () => {
      if (!isMountedRef.current) return;
      startRecognition("listening_choice", (t) => {
        handleChoiceSpokenRef.current(t);
      });
    });
  }, [navigate, stopListening, startRecognition, t.notFound]);

  handleChoiceSpokenRef.current = handleChoiceSpoken;

  // Ask Greeting via Audio - matching ServiceForm.jsx askCurrentQuestion
  const askGreeting = useCallback(() => {
    cancelSpeech();
    stopListening();

    const curLang = langRef.current;
    const uName = userNameRef.current || "User";
    const greetings = {
      en: `Hello ${uName}, welcome to Vocalyze. Which public service would you like to apply for? You can say Income Certificate, Pension Certificate, or Disability Certificate.`,
      hi: `नमस्ते ${uName}, Vocalyze में आपका स्वागत है। आप किस सेवा के लिए आवेदन करना चाहते हैं? आप बोल सकते हैं आय प्रमाण पत्र, पेंशन प्रमाण पत्र, या दिव्यांगता प्रमाण पत्र।`,
      kn: `ನಮಸ್ಕಾರ ${uName}, Vocalyze ಗೆ ಸುಸ್ವಾಗತ. ನೀವು ಯಾವ ಸೇವೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೀರಿ? ನೀವು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ, ಅಥವಾ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ ಎಂದು ಹೇಳಬಹುದು.`
    };

    const greetingText = greetings[curLang] || greetings.en;
    setAssistantSpeech(greetingText);
    setVoiceMode("asking_greeting");
    setPendingService(null);
    pendingServiceRef.current = null;
    setUserSaidText("");
    setLiveTranscript("");
    setFieldError("");

    speakText(greetingText, curLang, () => {
      if (!isMountedRef.current) return;
      startRecognition("listening_choice", (transcript) => {
        handleChoiceSpokenRef.current(transcript);
      });
    });
  }, [stopListening, startRecognition]);

  askGreetingRef.current = askGreeting;

  // Manual Click or Form Submission Handler
  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    const textToMatch = currentValue.trim();
    if (!textToMatch) {
      setFieldError("Please enter or speak a service name.");
      return;
    }

    const allServices = (servicesRef.current && servicesRef.current.length > 0)
      ? servicesRef.current
      : STATIC_SERVICES;

    const matched = matchSpokenService(textToMatch, allServices);
    if (matched) {
      askForConfirmation(matched, textToMatch);
    } else {
      handleChoiceSpoken(textToMatch);
    }
  };

  // Toggle Microphone On / Off (User Gesture Safe)
  const toggleListening = () => {
    if (isMicActive) {
      stopListening();
      cancelSpeech();
      setVoiceMode("idle");
    } else {
      cancelSpeech();
      setMicPermissionDenied(false);
      startRecognition("listening_choice", (transcript) => {
        handleChoiceSpokenRef.current(transcript);
      });
    }
  };

  // Initial Load: Play Greeting & Enable Listening (matching ServiceForm.jsx)
  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      if (askGreetingRef.current) {
        askGreetingRef.current();
      }
    }, 600);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      cancelSpeech();
      stopListening();
    };
  }, [stopListening]);

  return (
    <div
      style={{
        background: "rgba(18, 49, 47, 0.75)",
        backdropFilter: "blur(14px)",
        border: isMicActive ? "2px solid #d9f560" : "1px solid rgba(217, 245, 96, 0.25)",
        borderRadius: "24px",
        padding: "32px",
        marginBottom: "40px",
        boxShadow: isMicActive
          ? "0 0 35px rgba(217, 245, 96, 0.25), 0 20px 40px rgba(0,0,0,0.4)"
          : "0 20px 40px rgba(0,0,0,0.35)",
        transition: "all 0.3s ease"
      }}
      role="region"
      aria-label="Vocalyze Service Navigation Form"
    >
      {/* Top Bar with Badge, Mic Status, and Audio Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            onClick={toggleListening}
            title={isMicActive ? "Click to pause listening" : "Click to speak"}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: isMicActive ? "#ff4b4b" : "#d9f560",
              color: "#12312f",
              display: "grid",
              placeItems: "center",
              fontSize: "18px",
              fontWeight: "900",
              cursor: "pointer",
              boxShadow: isMicActive ? "0 0 16px #ff4b4b" : "0 0 12px rgba(217,245,96,0.35)",
              transition: "all 0.2s ease"
            }}
          >
            🎙️
          </div>
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: isMicActive ? "#ff7b7b" : "#d9f560",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              {isMicActive
                ? (voiceMode.includes("confirmation") ? "Listening for Confirmation ('Yes' / 'No')..." : "Listening for your Choice...")
                : (voiceMode.startsWith("asking") ? "Speaking to you..." : (voiceMode === "navigating" ? "Opening form..." : "AI Assistant Ready"))}
            </span>
            <div style={{ fontSize: "11px", color: "#8ca19c" }}>
              {isMicActive ? "Microphone is ON — Speak naturally" : "Click mic or button to speak"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={toggleListening}
            style={{
              background: isMicActive ? "rgba(255,75,75,0.15)" : "rgba(217, 245, 96, 0.12)",
              border: isMicActive ? "1px solid rgba(255,75,75,0.4)" : "1px solid rgba(217, 245, 96, 0.3)",
              color: isMicActive ? "#ff8b8b" : "#d9f560",
              borderRadius: "12px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer"
            }}
          >
            {isMicActive ? `⏹️ ${t.stopMic}` : `🎙️ ${t.startMic}`}
          </button>
          <button
            type="button"
            onClick={askGreeting}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#d9f560",
              borderRadius: "12px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer"
            }}
          >
            🔊 {t.repeatQuestion}
          </button>
        </div>
      </div>

      {/* Permission Denied Notice if applicable */}
      {micPermissionDenied && (
        <div
          style={{
            background: "rgba(255, 75, 75, 0.15)",
            border: "1px solid #ff4b4b",
            borderRadius: "14px",
            padding: "12px 18px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#ffb7b7"
          }}
        >
          ⚠️ {t.micDenied}{" "}
          <button
            type="button"
            onClick={toggleListening}
            style={{
              background: "#d9f560",
              border: "none",
              color: "#12312f",
              fontWeight: "800",
              padding: "4px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              marginLeft: "10px"
            }}
          >
            Allow Microphone
          </button>
        </div>
      )}

      {/* Assistant Spoken Prompt (Matching ServiceForm.jsx format) */}
      <div
        style={{
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "16px 20px",
          fontSize: "15px",
          color: "#fff",
          lineHeight: "1.5",
          marginBottom: "18px"
        }}
      >
        🗣️ <strong style={{ color: "#d9f560" }}>Vocalyze:</strong> {assistantSpeech || t.title}
      </div>

      {/* Real-Time Live Transcript & Detected Service Box (Matching ServiceForm.jsx) */}
      {(userSaidText || liveTranscript) && (
        <div
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(217, 245, 96, 0.25)",
            borderRadius: "16px",
            padding: "14px 20px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }}
        >
          <div style={{ fontSize: "14px", color: "#d9f560", fontWeight: "700" }}>
            🎙️ {t.youSaid} <span style={{ color: "#fff" }}>"{userSaidText || liveTranscript}"</span>
          </div>
          {pendingService && (
            <div style={{ fontSize: "13px", color: "#aab7b3" }}>
              ✓ {t.detected}{" "}
              <strong style={{ color: "#d9f560" }}>
                {typeof pendingService.name === "object"
                  ? (pendingService.name[lang] || pendingService.name.en)
                  : pendingService.name}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Form-Filling Interactive Input (The exact form filling type in ServiceForm.jsx) */}
      <form onSubmit={handleManualSubmit} noValidate>
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="dashboard-service-input"
            style={{
              display: "block",
              font: "700 16px 'Outfit', sans-serif",
              marginBottom: "10px",
              color: "#fff"
            }}
          >
            {t.inputLabel}
          </label>

          <div style={{ position: "relative" }}>
            <input
              id="dashboard-service-input"
              type="text"
              value={currentValue}
              onChange={(e) => {
                setFieldError("");
                setCurrentValue(e.target.value);
              }}
              placeholder={t.inputPlaceholder}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: isMicActive ? "2px solid #d9f560" : "2px solid rgba(217, 245, 96, 0.3)",
                borderRadius: "16px",
                padding: "16px 50px 16px 20px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "700",
                boxSizing: "border-box",
                outline: "none"
              }}
            />

            <button
              type="button"
              onClick={toggleListening}
              title={isMicActive ? "Stop listening" : "Start speaking"}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: isMicActive ? "#ff4b4b" : "rgba(217, 245, 96, 0.15)",
                border: "none",
                borderRadius: "10px",
                padding: "8px 10px",
                color: isMicActive ? "#fff" : "#d9f560",
                cursor: "pointer",
                fontSize: "15px"
              }}
            >
              🎙️
            </button>
          </div>

          {fieldError && (
            <p
              style={{
                color: "#ffb798",
                background: "rgba(255, 183, 152, 0.08)",
                padding: "10px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                marginTop: "10px"
              }}
            >
              ⚠️ {fieldError}
            </p>
          )}
        </div>

        {/* Voice Confirmation Card if pending (Matching ServiceForm.jsx layout) */}
        {pendingService && (
          <div
            style={{
              background: "rgba(217, 245, 96, 0.08)",
              border: "1px dashed #d9f560",
              borderRadius: "18px",
              padding: "18px 22px",
              marginBottom: "20px"
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#d9f560", marginBottom: "6px" }}>
              🔊 {t.confirmTitle}
            </div>
            <div style={{ fontSize: "14px", color: "#fff", marginBottom: "16px" }}>
              {t.sayYesNo}
            </div>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setPendingService(null);
                  pendingServiceRef.current = null;
                  setUserSaidText("");
                  setLiveTranscript("");
                  setCurrentValue("");
                  askGreeting();
                }}
                style={{
                  flex: 1,
                  background: "rgba(255,75,75,0.18)",
                  border: "1px solid rgba(255,75,75,0.4)",
                  color: "#ff8b8b",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ✗ {t.tryAgain}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmationResponse("yes", pendingService)}
                style={{
                  flex: 2,
                  background: "#d9f560",
                  border: "none",
                  color: "#12312f",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  fontWeight: "900",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ✓ {t.confirm}
              </button>
            </div>
          </div>
        )}

        {/* Form Action Buttons (Matching ServiceForm.jsx) */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              flex: 1,
              background: "#d9f560",
              border: "none",
              color: "#12312f",
              borderRadius: "16px",
              padding: "15px 24px",
              fontWeight: "900",
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(217, 245, 96, 0.25)"
            }}
          >
            {t.continueBtn} →
          </button>
        </div>
      </form>

      {/* Spoken Quick Options Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "24px" }}>
        <span style={{ fontSize: "11px", color: "#8ca19c", fontWeight: "800", textTransform: "uppercase" }}>
          Suggested:
        </span>
        {STATIC_SERVICES.map((s) => {
          const title = s.name[lang] || s.name.en;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setCurrentValue(title);
                askForConfirmation(s, title);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(217, 245, 96, 0.25)",
                color: "#d9f560",
                padding: "6px 14px",
                borderRadius: "14px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              {s.icon} "{title}"
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => handleChoiceSpoken("logout")}
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            color: "#aab7b3",
            padding: "6px 14px",
            borderRadius: "14px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer"
          }}
        >
          🚪 "Log out"
        </button>
      </div>
    </div>
  );
}
