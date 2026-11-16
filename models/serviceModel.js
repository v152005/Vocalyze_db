const { pool } = require("../config/db");

const DEFAULT_SERVICES = [
  {
    id: "pension-certificate",
    name: {
      en: "Pension Certificate",
      kn: "ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ",
      hi: "पेंशन प्रमाण पत्र"
    },
    description: {
      en: "Apply for Old Age, Disability, or Widow pension certificate with financial assistance.",
      kn: "ವೃದ್ಧಾಪ್ಯ, ಅಂಗವಿಕಲತೆ ಅಥವಾ ವಿಧವಾ ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರಕ್ಕಾಗಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
      hi: "वृद्धावस्था, दिव्यांग या विधवा पेंशन प्रमाण पत्र के लिए ऑनलाइन आवेदन करें।"
    },
    category: "social welfare",
    enabled: true,
    questions: [
      {
        id: "fullName",
        type: "text",
        required: true,
        label: {
          en: "What is your full name?",
          kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?",
          hi: "आपका पूरा नाम क्या है?"
        }
      },
      {
        id: "dateOfBirth",
        type: "date",
        required: true,
        label: {
          en: "What is your date of birth?",
          kn: "ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?",
          hi: "आपकी जन्म तिथि क्या है?"
        }
      },
      {
        id: "gender",
        type: "text",
        required: true,
        label: {
          en: "What is your gender? Male, Female, or Other?",
          kn: "ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು? ಪುರುಷ, ಮಹಿಳೆ ಅಥವಾ ಇತರೆ?",
          hi: "आपका लिंग क्या है? पुरुष, महिला या अन्य?"
        }
      },
      {
        id: "ppoNumber",
        type: "text",
        required: true,
        label: {
          en: "Do you have an existing PPO number? Say Yes or No, or state your PPO number.",
          kn: "ನಿಮ್ಮ ಬಳಿ ಪಿಪಿಒ (PPO) ಸಂಖ್ಯೆ ಇದೆಯೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.",
          hi: "क्या आपके पास पीपीओ (PPO) नंबर है? हाँ या नहीं कहें, या अपना नंबर बताएं।"
        }
      },
      {
        id: "guardianName",
        type: "text",
        required: true,
        label: {
          en: "What is your father or spouse's name?",
          kn: "ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಸಂಗಾತಿಯ ಹೆಸರು ಏನು?",
          hi: "आपके पिता या पति/पत्नी का नाम क्या है?"
        }
      },
      {
        id: "aadhaarNumber",
        type: "text",
        required: true,
        label: {
          en: "What is your 12-digit Aadhaar number?",
          kn: "ನಿಮ್ಮ 12 ಅಂಕಿಯ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?",
          hi: "आपका 12 अंकों का आधार नंबर क्या है?"
        }
      },
      {
        id: "phone",
        type: "text",
        required: true,
        label: {
          en: "What is your 10-digit mobile number?",
          kn: "ನಿಮ್ಮ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?",
          hi: "आपका 10 अंकों का मोबाइल नंबर क्या है?"
        }
      },
      {
        id: "email",
        type: "text",
        required: true,
        label: {
          en: "What is your email address?",
          kn: "ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ ಏನು?",
          hi: "आपका ईमेल पता क्या है?"
        }
      },
      {
        id: "address",
        type: "text",
        required: true,
        label: {
          en: "What is your complete permanent address?",
          kn: "ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಖಾಯಂ ವಿಳಾಸ ಏನು?",
          hi: "आपका पूरा स्थायी पता क्या है?"
        }
      },
      {
        id: "pensionType",
        type: "text",
        required: true,
        label: {
          en: "What type of pension are you applying for? Old Age, Disability, or Widow?",
          kn: "ನೀವು ಯಾವ ಪಿಂಚಣಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುತ್ತಿದ್ದೀರಿ? ವೃದ್ಧಾಪ್ಯ, ಅಂಗವಿಕಲತೆ ಅಥವಾ ವಿಧವಾ?",
          hi: "आप किस प्रकार की पेंशन के लिए आवेदन कर रहे हैं? वृद्धावस्था, दिव्यांग या विधवा?"
        }
      },
      {
        id: "bankAccountNumber",
        type: "text",
        required: true,
        label: {
          en: "What is your bank account number?",
          kn: "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ ಏನು?",
          hi: "आपका बैंक खाता नंबर क्या है?"
        }
      },
      {
        id: "ifscCode",
        type: "text",
        required: true,
        label: {
          en: "What is your bank IFSC code?",
          kn: "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಐಎಫ್‌ಎಸ್‌ಸಿ ಕೋಡ್ ಏನು?",
          hi: "आपके बैंक का IFSC कोड क्या है?"
        }
      }
    ]
  },
  {
    id: "disability-certificate",
    name: {
      en: "Disability Certificate",
      kn: "ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ",
      hi: "दिव्यांगता प्रमाण पत्र"
    },
    description: {
      en: "Apply for UDID and unique disability identity card.",
      kn: "ಯುಡಿಐಡಿ ಮತ್ತು ವಿಕಲಾಂಗತಾ ಗುರುತಿನ ಚೀಟಿಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
      hi: "यूडीआईडी और दिव्यांगता पहचान पत्र के लिए आवेदन करें।"
    },
    category: "healthcare",
    enabled: true,
    questions: [
      {
        id: "fullName",
        type: "text",
        required: true,
        label: {
          en: "What is your full name?",
          kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?",
          hi: "आपका पूरा नाम क्या है?"
        }
      },
      {
        id: "dateOfBirth",
        type: "date",
        required: true,
        label: {
          en: "What is your date of birth?",
          kn: "ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?",
          hi: "आपकी जन्म तिथि क्या है?"
        }
      },
      {
        id: "gender",
        type: "text",
        required: true,
        label: {
          en: "What is your gender?",
          kn: "ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು?",
          hi: "आपका लिंग क्या है?"
        }
      },
      {
        id: "guardianName",
        type: "text",
        required: true,
        label: {
          en: "What is your father or guardian's name?",
          kn: "ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಪೋಷಕರ ಹೆಸರು ಏನು?",
          hi: "आपके पिता या अभिभावक का नाम क्या है?"
        }
      },
      {
        id: "aadhaarNumber",
        type: "text",
        required: true,
        label: {
          en: "What is your Aadhaar number?",
          kn: "ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?",
          hi: "आपका आधार नंबर क्या है?"
        }
      },
      {
        id: "phone",
        type: "text",
        required: true,
        label: {
          en: "What is your mobile phone number?",
          kn: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?",
          hi: "आपका मोबाइल नंबर क्या है?"
        }
      },
      {
        id: "address",
        type: "text",
        required: true,
        label: {
          en: "What is your address?",
          kn: "ನಿಮ್ಮ ವಿಳಾಸ ಏನು?",
          hi: "आपका पता क्या है?"
        }
      }
    ]
  },
  {
    id: "income-certificate",
    name: {
      en: "Income Certificate",
      kn: "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ",
      hi: "आय प्रमाण पत्र"
    },
    description: {
      en: "Apply for official revenue department income certificate.",
      kn: "ಕಂದಾಯ ಇಲಾಖೆಯ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರಕ್ಕಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
      hi: "राजस्व विभाग के आय प्रमाण पत्र के लिए आवेदन करें।"
    },
    category: "revenue",
    enabled: true,
    questions: [
      {
        id: "fullName",
        type: "text",
        required: true,
        label: {
          en: "What is your full name?",
          kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?",
          hi: "आपका पूरा नाम क्या है?"
        }
      },
      {
        id: "dateOfBirth",
        type: "date",
        required: true,
        label: {
          en: "What is your date of birth?",
          kn: "ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?",
          hi: "आपकी जन्म तिथि क्या है?"
        }
      },
      {
        id: "aadhaarNumber",
        type: "text",
        required: true,
        label: {
          en: "What is your Aadhaar number?",
          kn: "ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?",
          hi: "आपका आधार नंबर क्या है?"
        }
      },
      {
        id: "phone",
        type: "text",
        required: true,
        label: {
          en: "What is your mobile phone number?",
          kn: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?",
          hi: "आपका मोबाइल नंबर क्या है?"
        }
      },
      {
        id: "annualIncome",
        type: "text",
        required: true,
        label: {
          en: "What is your total annual family income in Rupees?",
          kn: "ನಿಮ್ಮ ಒಟ್ಟು ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ ಎಷ್ಟು ರೂಪಾಯಿ?",
          hi: "आपकी कुल वार्षिक पारिवारिक आय कितने रुपये है?"
        }
      },
      {
        id: "address",
        type: "text",
        required: true,
        label: {
          en: "What is your permanent address?",
          kn: "ನಿಮ್ಮ ಖಾಯಂ ವಿಳಾಸ ಏನು?",
          hi: "आपका स्थायी पता क्या है?"
        }
      }
    ]
  }
];

/**
 * Builds a service object from relational MySQL tables or fallback.
 */
const buildServiceFromRows = async (serviceRow) => {
  const defaultSvc = DEFAULT_SERVICES.find(s => s.id === serviceRow.service_code);

  const [transRows] = await pool.execute(
    "SELECT language_code, name, description FROM service_translations WHERE service_id = ?",
    [serviceRow.id]
  );

  const nameMap = { ...defaultSvc?.name };
  const descMap = { ...defaultSvc?.description };

  for (const tr of transRows) {
    if (tr.name && !tr.name.includes("???")) {
      nameMap[tr.language_code] = tr.name;
    }
    if (tr.description && !tr.description.includes("???")) {
      descMap[tr.language_code] = tr.description;
    }
  }

  const [questionRows] = await pool.execute(
    "SELECT id, field_key, input_type, is_required FROM service_questions WHERE service_id = ? ORDER BY sort_order",
    [serviceRow.id]
  );

  const questions = [];
  for (const qRow of questionRows) {
    const defaultQ = defaultSvc?.questions?.find(q => q.id === qRow.field_key);
    const [qTransRows] = await pool.execute(
      "SELECT language_code, prompt_label, help_text FROM question_translations WHERE question_id = ?",
      [qRow.id]
    );

    const labelMap = { ...defaultQ?.label };
    for (const qtr of qTransRows) {
      if (qtr.prompt_label && !qtr.prompt_label.includes("???")) {
        labelMap[qtr.language_code] = qtr.prompt_label;
      }
    }

    questions.push({
      id: qRow.field_key,
      questionDbId: qRow.id,
      type: qRow.input_type,
      required: Boolean(qRow.is_required),
      label: labelMap,
    });
  }

  return {
    id: serviceRow.service_code,
    dbId: serviceRow.id,
    name: nameMap,
    description: descMap,
    category: serviceRow.category,
    enabled: Boolean(serviceRow.is_enabled),
    questions: questions.length > 0 ? questions : (defaultSvc?.questions || []),
  };
};

/**
 * Retrieves all active/enabled services from MySQL.
 */
const getAllServices = async () => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM services WHERE is_enabled = 1 ORDER BY display_order"
    );
    if (rows.length === 0) {
      return DEFAULT_SERVICES;
    }

    const services = [];
    for (const row of rows) {
      const svc = await buildServiceFromRows(row);
      services.push(svc);
    }
    return services;
  } catch (err) {
    console.error("Failed to query MySQL services:", err.message);
    return DEFAULT_SERVICES;
  }
};

/**
 * Retrieves a single service by service code or ID from MySQL.
 */
const getServiceById = async (serviceId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM services WHERE service_code = ? OR id = ? LIMIT 1",
      [serviceId, isNaN(Number(serviceId)) ? -1 : Number(serviceId)]
    );
    if (rows.length === 0) {
      return DEFAULT_SERVICES.find(s => s.id === serviceId) || null;
    }
    return await buildServiceFromRows(rows[0]);
  } catch (err) {
    console.error("Failed to query MySQL service by id:", err.message);
    return DEFAULT_SERVICES.find(s => s.id === serviceId) || null;
  }
};

const seedServiceDefinitions = async () => {
  // Services are already defined and managed via schema.sql
  return true;
};

module.exports = {
  getAllServices,
  getServiceById,
  seedServiceDefinitions,
  DEFAULT_SERVICES,
};
