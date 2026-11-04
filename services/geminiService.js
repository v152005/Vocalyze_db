const { GoogleGenerativeAI } = require("@google/generative-ai");

const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest"
];

// Timeout wrapper for responsive voice interaction without blocking
const withTimeout = (promise, ms = 3500) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

// Initialize Gemini client using key from environment variables
const getModel = (modelName = "gemini-3.8-flash") => {
  const apiKey = process.env.GEMINI_API_KEY || "dummy_api_key_for_compilation";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

/**
 * Executes a Gemini prompt with automatic model fallback across candidate models.
 */
const generateWithFallback = async (prompt, generationConfig = {}) => {
  const apiKey = process.env.GEMINI_API_KEY || "dummy_api_key_for_compilation";
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig
        }),
        3500
      );
      return result.response.text();
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${modelName} notice: ${err.message}. Trying next candidate...`);
    }
  }
  throw lastError || new Error("All Gemini candidate models failed.");
};

/**
 * Generates a simplified, accessible explanation for a question in the user's language.
 * @param {string} question - The original question label.
 * @param {string} language - Target language code ('en', 'hi', 'kn').
 * @returns {Promise<string>} The simplified explanation.
 */
const explainQuestion = async (question, language) => {
  if (!process.env.GEMINI_API_KEY) {
    return `Fallback Explanation: Please provide answers for ${question}.`;
  }

  const prompt = `
You are an accessibility assistant designed to help people with low digital literacy.
Explain the following question in simple, clear language:
Question: "${question}"
Preferred language of explanation: "${language}" (use code "en" for English, "hi" for Hindi, "kn" for Kannada).

Rules:
- Preserve the original meaning and context.
- Do not add any new requirements.
- Do not remove important constraints.
- Respond ONLY in the requested language. Do not output English if language is "kn" or "hi".
- Keep the explanation concise and direct (1-3 sentences maximum).
`;

  try {
    const responseText = await generateWithFallback(prompt);
    return responseText.trim();
  } catch (error) {
    console.error("Gemini explainQuestion API error:", error);
    // Fallback to plain label explanation to ensure the form remains functional
    return `Please provide the requested information for: ${question}.`;
  }
};

/**
 * Attempts to parse a spoken date string and normalize it to YYYY-MM-DD.
 * Supports English and Kannada month names/digits.
 */
const tryNormalizeDate = (text) => {
  if (!text) return null;
  
  // Extract 4-digit year
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

  // Extract day (1 to 31)
  const dayMatch = text.match(/\b([1-9]|[12]\d|3[01])(st|nd|rd|th)?\b/);
  const day = dayMatch ? parseInt(dayMatch[1]) : 1; // default to 1st

  // Extract month
  const lowerText = text.toLowerCase();
  const months = [
    { names: ["january", "jan", "ಜನವ", "जनव"], value: "01" },
    { names: ["february", "feb", "ಫೆ", "फ़र"], value: "02" },
    { names: ["march", "mar", "ಮಾರ್", "मार"], value: "03" },
    { names: ["april", "apr", "ಏಪ್ರಿ", "अಪ್"], value: "04" },
    { names: ["may", "ಮೇ", "मई"], value: "05" },
    { names: ["june", "jun", "ಜೂ", "जू"], value: "06" },
    { names: ["july", "jul", "ಜು", "जु"], value: "07" },
    { names: ["august", "aug", "ಆಗ", "अग"], value: "08" },
    { names: ["september", "sep", "ಸೆಪ್", "सित"], value: "09" },
    { names: ["october", "oct", "ಅಕ್", "अक्"], value: "10" },
    { names: ["november", "nov", "ನವೆ", "नव"], value: "11" },
    { names: ["december", "dec", "ಡಿಸೆ", "दिस"], value: "12" }
  ];
  
  let monthValue = "01";
  let matched = false;
  for (const m of months) {
    if (m.names.some(name => lowerText.includes(name))) {
      monthValue = m.value;
      matched = true;
      break;
    }
  }

  // Fallback to check if numeric date format like DD/MM/YYYY or DD-MM-YYYY is present
  if (!matched) {
    const numericMatch = text.match(/\b([1-9]|[12]\d|3[01])[-/]([1-9]|0[1-9]|1[0-2])[-/](19\d{2}|20\d{2})\b/);
    if (numericMatch) {
      const d = String(parseInt(numericMatch[1])).padStart(2, "0");
      const m = String(parseInt(numericMatch[2])).padStart(2, "0");
      const y = numericMatch[3];
      return `${y}-${m}-${d}`;
    }
  }

  const formattedDay = String(day).padStart(2, "0");
  return `${year}-${monthValue}-${formattedDay}`;
};

/**
 * Parses conversational transcript response and extracts structured value.
 * @param {string} field - The database field ID.
 * @param {string} question - The question asked.
 * @param {string} response - The user's spoken transcript.
 * @param {string} language - Preferred language code ('en', 'hi', 'kn').
 * @returns {Promise<object>} JSON schema containing { field, value, confidence, needsConfirmation, clarification }.
 */
const parseUserResponse = async (field, question, response, language) => {
  if (!response) {
    return {
      field,
      value: "",
      confidence: 1.0,
      needsConfirmation: false,
      clarification: ""
    };
  }

  const cleanResp = response.toLowerCase().trim();

  // Instant normalization for Yes/No / negative answers (like PPO number question)
  const negativeAnswers = [
    "no", "nope", "nah", "none", "don't have", "do not have", "no ppo", "no number", "not have",
    "nahi", "nahi hai", "na", "galat",
    "illa", "thappu", "beda", "nanage illa",
    "ಇಲ್ಲ", "ತಪ್ಪು", "ಬೇಡ", "ನನ್ನ ಬಳಿ ಇಲ್ಲ",
    "नहीं", "नहीं है", "ना"
  ];

  if (negativeAnswers.some(neg => cleanResp === neg || cleanResp.startsWith(neg))) {
    return {
      field,
      value: "None",
      confidence: 0.98,
      needsConfirmation: false,
      clarification: ""
    };
  }

  // Instant normalization for affirmative answers
  const affirmativeAnswers = [
    "yes", "yeah", "yup", "correct", "haan", "ha", "theek", "haudu", "sari", "aaytu",
    "ಹೌದು", "ಸರಿ", "ಹಾ", "हाँ", "सही", "ठीक"
  ];
  if (affirmativeAnswers.some(aff => cleanResp === aff)) {
    return {
      field,
      value: "Yes",
      confidence: 0.98,
      needsConfirmation: false,
      clarification: ""
    };
  }

  // Date parsing heuristic
  if (field.toLowerCase().includes("date") || field.toLowerCase().includes("dob") || field.toLowerCase().includes("birth")) {
    const normalized = tryNormalizeDate(response);
    if (normalized) {
      return {
        field,
        value: normalized,
        confidence: 0.95,
        needsConfirmation: false,
        clarification: ""
      };
    }
  }

  // 12-digit Aadhaar heuristic
  if (field.toLowerCase().includes("aadhaar")) {
    const digitsOnly = response.replace(/\D/g, "");
    if (digitsOnly.length === 12) {
      return {
        field,
        value: digitsOnly,
        confidence: 0.98,
        needsConfirmation: false,
        clarification: ""
      };
    }
  }

  // 10-digit Phone heuristic
  if (field.toLowerCase().includes("phone") || field.toLowerCase().includes("mobile")) {
    const digitsOnly = response.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      return {
        field,
        value: digitsOnly,
        confidence: 0.98,
        needsConfirmation: false,
        clarification: ""
      };
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      field,
      value: response.trim(),
      confidence: 0.85,
      needsConfirmation: false,
      clarification: ""
    };
  }

  const prompt = `
You are an intelligent data extraction assistant for Vocalyze government application portal.
A citizen answered a form question using voice in language: "${language}".
Extract the clean, standardized, accurate value suitable for a database record.

Field: "${field}"
Question Asked: "${question}"
User's Spoken Response: "${response}"

Rules:
- For dates of birth, return strictly in "YYYY-MM-DD" format.
- For phone numbers, return the 10-digit number.
- For Aadhaar numbers, return the 12-digit number.
- For gender, return "Male", "Female", or "Other".
- If the user said they don't have something (e.g. no PPO number), return "None".
- Respond strictly in valid JSON format.

JSON schema:
{
  "field": "${field}",
  "value": "<extracted value>",
  "confidence": <float between 0.0 and 1.0>,
  "needsConfirmation": <boolean>,
  "clarification": "<optional clarification message if value is ambiguous>"
}
`;

  try {
    const responseText = await generateWithFallback(prompt, {
      responseMimeType: "application/json"
    });
    return JSON.parse(responseText.trim());
  } catch (error) {
    console.warn("Gemini parseUserResponse fallback to direct response:", error.message);
    return {
      field,
      value: response.trim(),
      confidence: 0.8,
      needsConfirmation: false,
      clarification: ""
    };
  }
};

/**
 * Parses OCR document text and extracts required application fields using Gemini AI.
 */
const parseDocumentText = async (documentType, ocrText, requiredFields = []) => {
  if (!ocrText || typeof ocrText !== "string") {
    const emptyFields = {};
    const defaultConfidence = {};
    requiredFields.forEach(f => {
      emptyFields[f] = null;
      defaultConfidence[f] = 0.0;
    });
    return { documentType, fields: emptyFields, confidence: defaultConfidence };
  }

  const prompt = `
You are an OCR document parsing assistant for Indian citizen identity documents.
Document Type: "${documentType}"
Required Fields to Extract: ${JSON.stringify(requiredFields)}
Raw OCR Text:
"""
${ocrText}
"""

Instructions:
- Extract all required fields accurately from the OCR text.
- If a field is not found in the text, set its value to null.
- Dates should be normalized to YYYY-MM-DD where possible.
- Respond strictly in JSON format.

JSON Schema:
{
  "documentType": "${documentType}",
  "fields": {
    <fieldName>: <extractedValue or null>
  },
  "confidence": {
    <fieldName>: <float between 0.0 and 1.0>
  }
}
`;

  try {
    const responseText = await generateWithFallback(prompt, {
      responseMimeType: "application/json"
    });
    return JSON.parse(responseText.trim());
  } catch (error) {
    console.error("Gemini parseDocumentText API error:", error);
    const emptyFields = {};
    const defaultConfidence = {};
    requiredFields.forEach(f => {
      emptyFields[f] = null;
      defaultConfidence[f] = 0.0;
    });
    return {
      documentType,
      fields: emptyFields,
      confidence: defaultConfidence
    };
  }
};

/**
 * Classifies a user's spoken voice command/instruction to determine which service/form to navigate to.
 * Uses Gemini API model for natural language understanding and multilingual support (en, hi, kn).
 * @param {string} transcript - Spoken user instruction.
 * @param {string} language - Target language code ('en', 'hi', 'kn').
 * @param {Array<object>} availableServices - List of available service objects [{ id, name, description }].
 * @returns {Promise<object>} { matchedServiceId, confidence, spokenFeedback, action }
 */
const classifyServiceIntent = async (transcript, language = "en", availableServices = []) => {
  if (!transcript || typeof transcript !== "string") {
    return {
      matchedServiceId: null,
      confidence: 0,
      spokenFeedback: "Please say the name of the service you would like to apply for.",
      action: "clarify"
    };
  }

  // Local fallback matcher for zero downtime & instant voice navigation
  const fallbackMatcher = (text, lang) => {
    const clean = text.toLowerCase().trim();

    // Command: Logout
    const logoutKeywords = ["logout", "log out", "sign out", "signout", "exit", "quit", "ಲಾಗ್ ಔಟ್", "ನಿರ್ಗಮಿಸು", "लॉग आउट", "बाहर निकलें"];
    if (logoutKeywords.some(w => clean === w || clean.includes(w))) {
      const msgs = {
        en: "Logging you out. Goodbye.",
        hi: "आपको लॉग आउट किया जा रहा है। अलविदा।",
        kn: "ನಿಮ್ಮನ್ನು ಲಾಗ್ ಔಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ. ಧನ್ಯವಾದಗಳು."
      };
      return {
        matchedServiceId: null,
        confidence: 0.99,
        spokenFeedback: msgs[lang] || msgs.en,
        action: "logout"
      };
    }

    // Command: Check Applications / Status
    const appKeywords = ["application", "applications", "my applications", "status", "check application", "ಅರ್ಜಿ", "ಅರ್ಜಿಗಳು", "ಸ್ಥಿತಿ", "आवेदन", "मेरे आवेदन", "स्थिति"];
    if (appKeywords.some(w => clean === w || clean.includes(w))) {
      const msgs = {
        en: "Checking your submitted applications now.",
        hi: "आपके आवेदनों की स्थिति जांची जा रही है।",
        kn: "ನಿಮ್ಮ ಅರ್ಜಿಗಳ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ."
      };
      return {
        matchedServiceId: null,
        confidence: 0.99,
        spokenFeedback: msgs[lang] || msgs.en,
        action: "applications"
      };
    }

    // Command: Help / Options / Repeat
    const helpKeywords = ["help", "options", "repeat", "what can i say", "what to do", "commands", "ಸಹಾಯ", "ಮತ್ತೆ ಹೇಳಿ", "ಆಯ್ಕೆಗಳು", "ಮದದ್", "मदद", "सहायता", "दोबारा बोलो", "विकल्प"];
    if (helpKeywords.some(w => clean === w || clean.includes(w))) {
      const msgs = {
        en: "You can say: Income Certificate, Pension Certificate, Disability Certificate, Check Applications, or Log out. Please state your choice.",
        hi: "आप बोल सकते हैं: आय प्रमाण पत्र, पेंशन प्रमाण पत्र, दिव्यांगता प्रमाण पत्र, मेरे आवेदन, या लॉग आउट।",
        kn: "ನೀವು ಹೇಳಬಹುದು: ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ, ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ, ನನ್ನ ಅರ್ಜಿಗಳು, ಅಥವಾ ಲಾಗ್ ಔಟ್."
      };
      return {
        matchedServiceId: null,
        confidence: 0.99,
        spokenFeedback: msgs[lang] || msgs.en,
        action: "help"
      };
    }

    const keywordMap = [
      {
        id: "income-certificate",
        name: "Income Certificate",
        keywords: [
          "income", "income certificate", "revenue", "revenue certificate", "salary", "salary certificate",
          "earnings", "annual income", "third", "three", "3",
          "ಆದಾಯ", "ಇನ್‌ಕಮ್", "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ", "ಆದಾಯ ಪ್ರಮಾಣ ಪತ್ರ", "ಸಂಬಳ", "ಮೂರನೇ", "ಮೂರು",
          "आय", "इनकम", "आय प्रमाण पत्र", "आय प्रमाण", "वेतन", "तीसरा", "तीन"
        ],
        feedback: {
          en: "Opening the Income Certificate application form for you now.",
          kn: "ನಿಮ್ಮ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಅರ್ಜಿ ನಮೂನೆಗೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.",
          hi: "आपके लिए आय प्रमाण पत्र आवेदन खोला जा रहा है।"
        }
      },
      {
        id: "pension-certificate",
        name: "Pension Certificate",
        keywords: [
          "pension", "pension certificate", "old age", "old age pension", "widow", "widow pension",
          "senior citizen", "first", "one", "1",
          "ವೃದ್ಧಾಪ್ಯ", "ಪಿಂಚಣಿ", "ವಿಧವೆ", "ಪೆಂಶನ್", "ವೃದ್ಧಾಪ್ಯ ವೇತನ", "ಮೊದಲ", "ಒಂದು",
          "पेंशन", "वृद्धावस्था", "विधवा", "पेंशन प्रमाण पत्र", "पहला", "एक"
        ],
        feedback: {
          en: "Opening the Pension Certificate application form for you now.",
          kn: "ನಿಮ್ಮ ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ ಅರ್ಜಿ ನಮೂನೆಗೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.",
          hi: "आपके लिए पेंशन प्रमाण पत्र आवेदन खोला जा रहा है।"
        }
      },
      {
        id: "disability-certificate",
        name: "Disability Certificate",
        keywords: [
          "disability", "disability certificate", "disabled", "handicap", "handicapped", "udid",
          "udid card", "second", "two", "2",
          "ಅಂಗವಿಕಲ", "ವಿಕಲಾಂಗ", "ದಿವ್ಯಾಂಗ", "ಅಂಗವಿಕಲ ಪ್ರಮಾಣಪತ್ರ", "ಎರಡನೇ", "ಎರಡು",
          "दिव्यांग", "विकलांग", "दिव्यांगता प्रमाण पत्र", "विकलांगता", "दूसरा", "दो"
        ],
        feedback: {
          en: "Opening the Disability Certificate application form for you now.",
          kn: "ನಿಮ್ಮ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ ಅರ್ಜಿ ನಮೂನೆಗೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.",
          hi: "आपके लिए दिव्यांगता प्रमाण पत्र आवेदन खोला जा रहा है।"
        }
      }
    ];

    for (const item of keywordMap) {
      if (item.keywords.some(k => clean.includes(k.toLowerCase()))) {
        return {
          matchedServiceId: item.id,
          confidence: 0.98,
          spokenFeedback: item.feedback[lang] || item.feedback.en,
          action: "navigate"
        };
      }
    }

    const defaultClarify = {
      en: "I couldn't identify the service. Please say Income Certificate, Pension Certificate, or Disability Certificate.",
      kn: "ಸೇವೆ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ ಎಂದು ಹೇಳಿ.",
      hi: "मैं समझ नहीं पाया। कृपया आय प्रमाण पत्र, पेंशन प्रमाण पत्र, या दिव्यांगता प्रमाण पत्र बोलें।"
    };

    return {
      matchedServiceId: null,
      confidence: 0.0,
      spokenFeedback: defaultClarify[lang] || defaultClarify.en,
      action: "clarify"
    };
  };

  // If no Gemini API key configured, use local fallback
  if (!process.env.GEMINI_API_KEY) {
    return fallbackMatcher(transcript, language);
  }

  // Format available services list for Gemini prompt
  const servicesSummary = availableServices.length > 0
    ? availableServices.map(s => {
        const nameStr = typeof s.name === "object" ? JSON.stringify(s.name) : s.name;
        return `- ID: "${s.id}" | Name: ${nameStr}`;
      }).join("\n")
    : `- ID: "income-certificate" | Name: Income Certificate / ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ / आय प्रमाण पत्र
- ID: "pension-certificate" | Name: Pension Certificate / ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ / पेंशन प्रमाण पत्र
- ID: "disability-certificate" | Name: Disability Certificate / ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ / दिव्यांगता प्रमाण पत्र`;

  const prompt = `
You are an intelligent voice navigation assistant for Vocalyze, a government citizen services portal designed for visually impaired and low digital literacy citizens.
A citizen just logged in to their dashboard and spoke an instruction or command.

Citizen Spoken Instruction: "${transcript}"
Preferred Language Code: "${language}" (en = English, hi = Hindi, kn = Kannada)

Available Services in Portal:
${servicesSummary}

Your Tasks:
1. Understand the user's intent:
   - If they want to apply for Income Certificate (or revenue/salary/earnings certificate, "ಆದಾಯ", "आय", "3rd", "third"): match "income-certificate", action "navigate".
   - If they want to apply for Pension Certificate (or old age pension/widow pension/senior citizen, "ಪಿಂಚಣಿ", "ಪೆಂಶನ್", "पेंशन", "1st", "first"): match "pension-certificate", action "navigate".
   - If they want to apply for Disability Certificate (or handicap/UDID card/disabled/divyang, "ವಿಕಲಾಂಗ", "ದಿವ್ಯಾಂಗ", "दिव्यांग", "विकलांग", "2nd", "second"): match "disability-certificate", action "navigate".
   - If they say "logout", "log out", "sign out", "exit": action "logout", matchedServiceId null.
   - If they say "check applications", "my applications", "status", "ಅರ್ಜಿಗಳು", "आवेदन": action "applications", matchedServiceId null.
   - If they say "help", "options", "repeat", "what can i say", "ಸಹಾಯ", "ಮದದ್", "मदद": action "help", matchedServiceId null.
2. Return a helpful, natural, 1-sentence spoken feedback message in the user's language ("${language}").
   - For Income Certificate: "Opening the Income Certificate application form now." / "ನಿಮ್ಮ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಅರ್ಜಿ ನಮೂನೆಗೆ ಈಗ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ." / "आपके लिए आय प्रमाण पत्र आवेदन खोला जा रहा है।"
   - For Pension Certificate: "Opening the Pension Certificate application form now." / "ನಿಮ್ಮ ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ ಅರ್ಜಿ ನಮೂನೆಗೆ ಈಗ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ." / "आपके लिए पेंशन प्रमाण पत्र आवेदन खोला जा रहा है।"
   - For Disability Certificate: "Opening the Disability Certificate application form now." / "ನಿಮ್ಮ ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ ಅರ್ಜಿ ನಮೂನೆಗೆ ಈಗ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ." / "आपके लिए दिव्यांगता प्रमाण पत्र आवेदन खोला जा रहा है।"
   - For Logout: "Logging you out. Goodbye." / "ನಿಮ್ಮನ್ನು ಲಾಗ್ ಔಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ. ಧನ್ಯವಾದಗಳು." / "आपको लॉग आउट किया जा रहा है। अलविदा।"
   - For Applications: "Checking your submitted applications now." / "ನಿಮ್ಮ ಅರ್ಜಿಗಳ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ." / "आपके आवेदनों की स्थिति जांची जा रही है।"
   - For Help: "You can say: Income Certificate, Pension Certificate, Disability Certificate, Check Applications, or Log out."
   - If unclear: action "clarify", matchedServiceId null, asking them politely to choose Income Certificate, Pension Certificate, or Disability Certificate.

Respond strictly in valid JSON format:
{
  "matchedServiceId": "income-certificate" | "pension-certificate" | "disability-certificate" | null,
  "confidence": <float between 0.0 and 1.0>,
  "spokenFeedback": "<polite 1-sentence response in requested language>",
  "action": "navigate" | "logout" | "applications" | "help" | "clarify"
}
`;

  try {
    const responseText = await generateWithFallback(prompt, {
      responseMimeType: "application/json"
    });
    const parsed = JSON.parse(responseText.trim());
    return {
      matchedServiceId: parsed.matchedServiceId || null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
      spokenFeedback: parsed.spokenFeedback || (fallbackMatcher(transcript, language).spokenFeedback),
      action: parsed.action || (parsed.matchedServiceId ? "navigate" : "clarify")
    };
  } catch (error) {
    console.error("Gemini classifyServiceIntent error, using fallback:", error.message);
    return fallbackMatcher(transcript, language);
  }
};

module.exports = {
  explainQuestion,
  parseUserResponse,
  parseDocumentText,
  classifyServiceIntent,
};
