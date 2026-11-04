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
  { id: "income-certificate", name: { en: "Income Certificate", kn: "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ", hi: "आय प्रमाण पत्र" }, icon: "💰" },
  { id: "pension-certificate", name: { en: "Pension Certificate", kn: "ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ", hi: "पेंशन प्रमाण पत्र" }, icon: "📜" },
  { id: "disability-certificate", name: { en: "Disability Certificate", kn: "ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ", hi: "दिव्यांगता प्रमाण पत्र" }, icon: "♿" }
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

  // Voice Assistant UI state - EXACT pattern of ServiceForm.jsx
  const [voiceMode, setVoiceMode] = useState("idle"); // 'idle' | 'asking_greeting' | 'listening_choice' | 'asking_confirmation' | 'listening_confirmation' | 'navigating' | 'speaking'
  const [assistantSpeech, setAssistantSpeech] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [userSaidText, setUserSaidText] = useState("");
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [isMicActive, setIsMicActive] = useState(false);

  const userName = user?.name || "User";

  // Synchronous State Refs - EXACT pattern of ServiceForm.jsx
  const isMountedRef = useRef(true);
  const recognitionRef = useRef(null);
  const restartTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const activeModeRef = useRef("idle");
  const activeCallbackRef = useRef(null);

  const pendingAnswerRef = useRef(null);
  const servicesRef = useRef(services);
  const applicationsRef = useRef(applications);
  const tokenRef = useRef(token);
  const langRef = useRef(lang);
  const userNameRef = useRef(userName);
  const logoutRef = useRef(logout);

  // Sync state to refs
  useEffect(() => {
    servicesRef.current = services;
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

  const translations = {
    en: {
      repeatOptions: "Repeat Options",
      youSaid: "You said:",
      detected: "Detected service:",
      confirm: "Yes, Open",
      tryAgain: "No, Choose Another",
      sayYesNo: "Say 'Yes' to confirm or 'No' to re-enter."
    },
    hi: {
      repeatOptions: "विकल्प दोबारा सुनें",
      youSaid: "आपने कहा:",
      detected: "पहचानी गई सेवा:",
      confirm: "हाँ, खोलें",
      tryAgain: "नहीं, दूसरी चुनें",
      sayYesNo: "पुष्टि के लिए 'हाँ' कहें या दोबारा बोलने के लिए 'नहीं' कहें।"
    },
    kn: {
      repeatOptions: "ಆಯ್ಕೆಗಳನ್ನು ಮತ್ತೆ ಕೇಳಿ",
      youSaid: "ನೀವು ಹೇಳಿದ್ದು:",
      detected: "ಗುರುತಿಸಲಾದ ಸೇವೆ:",
      confirm: "ಹೌದು, ತೆರೆಯಿರಿ",
      tryAgain: "ಇಲ್ಲ, ಬೇರೆ ಆಯ್ಕೆಮಾಡಿ",
      sayYesNo: "ದೃಢೀಕರಿಸಲು 'ಹೌದು' ಅಥವಾ ಮತ್ತೊಮ್ಮೆ ಹೇಳಲು 'ಇಲ್ಲ' ಎಂದು ಹೇಳಿ."
    }
  };

  const t = translations[lang] || translations.en;

  // Complete recognition shutdown - EXACT pattern of ServiceForm.jsx
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

  // Robust Speech Recognition Controller with Auto Keep-Alive - EXACT pattern of ServiceForm.jsx
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
    };

    rec.onerror = (e) => {
      if (!isMountedRef.current) return;
      console.warn("[DashboardVoice] Recognition notice:", e.error);
      // If error occurs and we are still in listening mode, auto-retry
      if (activeModeRef.current === modeToSet) {
        restartTimerRef.current = setTimeout(() => {
          if (activeModeRef.current === modeToSet && isMountedRef.current) {
            try {
              rec.start();
            } catch (err) {}
          }
        }, 300);
      }
    };

    rec.onend = () => {
      if (!isMountedRef.current) return;
      setIsMicActive(false);
      // If recognition stopped unexpectedly while waiting for user speech, auto restart!
      if (activeModeRef.current === modeToSet) {
        restartTimerRef.current = setTimeout(() => {
          if (activeModeRef.current === modeToSet && isMountedRef.current) {
            try {
              rec.start();
            } catch (err) {}
          }
        }, 300);
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
      }

      // Clear any pending silence timer on new speech input
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (activeText.length > 0) {
        const isConfirmMode = modeToSet.includes("confirmation");
        
        let debounceDelay = 1200; // Default for spoken choices
        if (isConfirmMode) {
          // If unambiguous affirmative or negative detected, trigger ultra-fast
          if (isConfirmationAffirmative(activeText) || isConfirmationNegative(activeText)) {
            debounceDelay = 100;
          } else {
            debounceDelay = 400;
          }
        } else {
          // Fast path for immediate service keywords
          const lower = activeText.toLowerCase();
          if (
            lower.includes("income") ||
            lower.includes("pension") ||
            lower.includes("disability") ||
            lower.includes("logout") ||
            lower.includes("status") ||
            activeText.includes("ಆದಾಯ") ||
            activeText.includes("ಪಿಂಚಣಿ") ||
            activeText.includes("ವಿಕಲಾಂಗ") ||
            activeText.includes("आय") ||
            activeText.includes("पेंशन") ||
            activeText.includes("दिव्यांग")
          ) {
            debounceDelay = 350;
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
      console.error("[DashboardVoice] Failed to start speech recognition:", err);
    }
  }, []);

  // Forward declarations
  const askGreetingRef = useRef();
  const askForConfirmationRef = useRef();
  const handleConfirmationResponseRef = useRef();
  const handleChoiceSpokenRef = useRef();

  // Ask User for Audio Confirmation ("You said X, is this correct?") - EXACT pattern of ServiceForm.jsx
  const askForConfirmation = useCallback((serviceObj, spokenText) => {
    cancelSpeech();
    stopListening();

    setPendingAnswer(serviceObj);
    pendingAnswerRef.current = serviceObj;
    setUserSaidText(spokenText);

    const curLang = langRef.current;
    const sName = serviceObj.name && typeof serviceObj.name === "object"
      ? (serviceObj.name[curLang] || serviceObj.name.en)
      : (serviceObj.name || "Selected Service");

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

  // Handle Confirmation Voice Input ('Yes' / 'No' / Direct Correction) - EXACT pattern of ServiceForm.jsx
  const handleConfirmationResponse = useCallback((response, serviceObj) => {
    const curLang = langRef.current;
    setLiveTranscript(response);

    if (isConfirmationAffirmative(response)) {
      // User said YES -> Navigate to the application form
      const target = serviceObj || pendingAnswerRef.current;
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
        setTimeout(doNavigate, 1600);
      }
    } else if (isConfirmationNegative(response)) {
      // User said NO -> Re-ask greeting
      setPendingAnswer(null);
      pendingAnswerRef.current = null;
      setUserSaidText("");
      setLiveTranscript("");

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
      // User uttered another service choice directly
      handleChoiceSpokenRef.current(response);
    }
  }, [navigate, startRecognition]);

  handleConfirmationResponseRef.current = handleConfirmationResponse;

  // Handle Initial Choice Spoken by User
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

    // 3. Direct Voice Command: Help / Repeat
    if (isHelpCommand(transcript)) {
      const helpMsg = curLang === "kn"
        ? "ನೀವು ಹೇಳಬಹುದು: ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ, ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ, ನನ್ನ ಅರ್ಜಿಗಳು, ಅಥವಾ ಲಾಗ್ ಔಟ್."
        : (curLang === "hi"
          ? "आप बोल सकते हैं: आय प्रमाण पत्र, पेंशन प्रमाण पत्र, दिव्यांगता प्रमाण पत्र, मेरे आवेदन, या लॉग आउट।"
          : "You can say: Income Certificate, Pension Certificate, Disability Certificate, Check Applications, or Log out.");

      setAssistantSpeech(helpMsg);
      setVoiceMode("speaking");
      speakText(helpMsg, curLang, () => {
        if (!isMountedRef.current) return;
        askGreetingRef.current();
      });
      return;
    }

    // 4. Immediate Local Match
    const localMatch = matchSpokenService(transcript, allServices);
    if (localMatch) {
      askForConfirmationRef.current(localMatch, transcript);
      return;
    }

    // 5. Gemini AI Natural Language Comprehension
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
      console.warn("[DashboardVoice] Gemini intent notice:", e);
    }

    // 6. Unrecognized -> Clarify and re-listen
    const notUnderstood = curLang === "kn"
      ? "ಸೇವೆ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ ಎಂದು ಹೇಳಿ."
      : (curLang === "hi"
        ? "मैं समझ नहीं पाया। कृपया आय प्रमाण पत्र, पेंशन प्रमाण पत्र, या दिव्यांगता प्रमाण पत्र बोलें।"
        : "I couldn't identify that service. Please say Income Certificate, Pension Certificate, or Disability Certificate.");

    setAssistantSpeech(notUnderstood);
    setVoiceMode("speaking");

    speakText(notUnderstood, curLang, () => {
      if (!isMountedRef.current) return;
      startRecognition("listening_choice", (t) => {
        handleChoiceSpokenRef.current(t);
      });
    });
  }, [navigate, stopListening, startRecognition]);

  handleChoiceSpokenRef.current = handleChoiceSpoken;

  // Ask Greeting via Audio - EXACT pattern of askCurrentQuestion in ServiceForm.jsx
  const askGreeting = useCallback(() => {
    cancelSpeech();
    stopListening();

    const curLang = langRef.current;
    const uName = userNameRef.current || "User";
    const greetings = {
      en: `Hello ${uName}, welcome to Vocalyze. Which service would you like to apply for? You can say Income Certificate, Pension Certificate, or Disability Certificate.`,
      hi: `नमस्ते ${uName}, Vocalyze में आपका स्वागत है। आप किस सेवा के लिए आवेदन करना चाहते हैं? आप बोल सकते हैं आय प्रमाण पत्र, पेंशन प्रमाण पत्र, या दिव्यांगता प्रमाण पत्र।`,
      kn: `ನಮಸ್ಕಾರ ${uName}, Vocalyze ಗೆ ಸುಸ್ವಾಗತ. ನೀವು ಯಾವ ಸೇವೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೀರಿ? ನೀವು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ, ಅಥವಾ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ ಎಂದು ಹೇಳಬಹುದು.`
    };

    const greetingText = greetings[curLang] || greetings.en;
    setAssistantSpeech(greetingText);
    setVoiceMode("asking_greeting");
    setPendingAnswer(null);
    pendingAnswerRef.current = null;
    setUserSaidText("");
    setLiveTranscript("");

    speakText(greetingText, curLang, () => {
      if (!isMountedRef.current) return;
      startRecognition("listening_choice", (transcript) => {
        handleChoiceSpokenRef.current(transcript);
      });
    });
  }, [stopListening, startRecognition]);

  askGreetingRef.current = askGreeting;

  // Start voice assistant on initial dashboard load - EXACT pattern of ServiceForm.jsx
  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      if (askGreetingRef.current) {
        askGreetingRef.current();
      }
    }, 500);

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
        background: "linear-gradient(135deg, rgba(217, 245, 96, 0.08), rgba(0,0,0,0.35))",
        border: isMicActive ? "2px solid #ff4b4b" : "1px solid rgba(217, 245, 96, 0.3)",
        borderRadius: "20px",
        padding: "22px",
        marginBottom: "25px",
        boxShadow: isMicActive ? "0 0 25px rgba(255, 75, 75, 0.25)" : "none",
        transition: "all 0.3s ease"
      }}
      role="region"
      aria-label="Vocalyze Voice Assistant for Dashboard"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: isMicActive ? "#ff4b4b" : "#d9f560",
              color: "#12312f",
              display: "grid",
              placeItems: "center",
              fontSize: "15px",
              fontWeight: "900",
              boxShadow: isMicActive ? "0 0 12px #ff4b4b" : "0 0 10px rgba(217,245,96,0.3)"
            }}
          >
            🎙️
          </div>
          <span style={{ fontSize: "12px", fontWeight: "800", color: isMicActive ? "#ff7b7b" : "#d9f560", textTransform: "uppercase" }}>
            {isMicActive
              ? (voiceMode.includes("confirmation") ? "Listening for Confirmation ('Yes' / 'No')..." : "Listening for your Choice...")
              : (voiceMode.startsWith("asking") ? "Speaking to you..." : (voiceMode === "navigating" ? "Opening form..." : "AI Assistant Ready"))}
          </span>
        </div>

        <button
          type="button"
          onClick={askGreeting}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#d9f560",
            borderRadius: "10px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer"
          }}
        >
          🔊 {t.repeatOptions}
        </button>
      </div>

      {/* Assistant Voice Line */}
      <div style={{ fontSize: "15px", color: "#fff", lineHeight: "1.5", marginBottom: "12px" }}>
        🗣️ <strong style={{ color: "#d9f560" }}>Vocalyze:</strong> {assistantSpeech}
      </div>

      {/* Persistent "You said" and Detected Answer display - EXACT pattern of ServiceForm.jsx */}
      {(userSaidText || liveTranscript) && (
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(217, 245, 96, 0.2)",
            borderRadius: "14px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }}
        >
          <div style={{ fontSize: "14px", color: "#d9f560", fontWeight: "700" }}>
            🎙️ {t.youSaid} <span style={{ color: "#fff" }}>"{userSaidText || liveTranscript}"</span>
          </div>
          {pendingAnswer && (
            <div style={{ fontSize: "12px", color: "#aab7b3" }}>
              ✓ {t.detected}{" "}
              <strong style={{ color: "#d9f560" }}>
                {typeof pendingAnswer.name === "object"
                  ? (pendingAnswer.name[lang] || pendingAnswer.name.en)
                  : pendingAnswer.name}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Audio Confirmation Prompt - EXACT pattern of ServiceForm.jsx */}
      {voiceMode.includes("confirmation") && pendingAnswer && (
        <div
          style={{
            marginTop: "16px",
            padding: "16px 20px",
            background: "rgba(217, 245, 96, 0.08)",
            border: "1px dashed #d9f560",
            borderRadius: "16px"
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#d9f560", marginBottom: "8px" }}>
            🔊 Voice Confirmation
          </div>
          <div style={{ fontSize: "13px", color: "#fff", marginBottom: "14px" }}>
            {t.sayYesNo}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setPendingAnswer(null);
                pendingAnswerRef.current = null;
                setUserSaidText("");
                setLiveTranscript("");
                askGreeting();
              }}
              style={{
                flex: 1,
                background: "rgba(255,75,75,0.15)",
                border: "1px solid rgba(255,75,75,0.4)",
                color: "#ff8b8b",
                borderRadius: "12px",
                padding: "10px 16px",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              ✗ {t.tryAgain}
            </button>
            <button
              type="button"
              onClick={() => handleConfirmationResponse("yes", pendingAnswer)}
              style={{
                flex: 2,
                background: "#d9f560",
                border: "none",
                color: "#12312f",
                borderRadius: "12px",
                padding: "10px 16px",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              ✓ {t.confirm}
            </button>
          </div>
        </div>
      )}

      {/* Quick Action / Voice Command Guide */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
        <span style={{ fontSize: "11px", color: "#8ca19c", fontWeight: "700", textTransform: "uppercase" }}>Commands:</span>
        {STATIC_SERVICES.map((s) => {
          const title = s.name[lang] || s.name.en;
          return (
            <span
              key={s.id}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(217, 245, 96, 0.2)",
                color: "#d9f560",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "700"
              }}
            >
              {s.icon} "{title}"
            </span>
          );
        })}
        <span
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#aab7b3",
            padding: "3px 10px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          "Log out"
        </span>
      </div>
    </div>
  );
}
