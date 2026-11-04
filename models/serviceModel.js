const { pool } = require("../config/db");

// ============================================================
// DEFAULT SERVICE DEFINITIONS (seed data for MySQL)
// ============================================================
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
      { id: "fullName",          type: "text", required: true, label: { en: "What is your full name?", kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?", hi: "आपका पूरा नाम क्या है?" } },
      { id: "dateOfBirth",       type: "date", required: true, label: { en: "What is your date of birth?", kn: "ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?", hi: "आपकी जन्म तिथि क्या है?" } },
      { id: "gender",            type: "text", required: true, label: { en: "What is your gender? Male, Female, or Other?", kn: "ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು?", hi: "आपका लिंग क्या है?" } },
      { id: "ppoNumber",         type: "text", required: true, label: { en: "Do you have an existing PPO number? Say Yes or No, or state your PPO number.", kn: "ನಿಮ್ಮ ಬಳಿ ಪಿಪಿಒ ಸಂಖ್ಯೆ ಇದೆಯೇ?", hi: "क्या आपके पास PPO नंबर है?" } },
      { id: "guardianName",      type: "text", required: true, label: { en: "What is your father or spouse's name?", kn: "ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಸಂಗಾತಿಯ ಹೆಸರು ಏನು?", hi: "आपके पिता या पति/पत्नी का नाम क्या है?" } },
      { id: "aadhaarNumber",     type: "text", required: true, label: { en: "What is your 12-digit Aadhaar number?", kn: "ನಿಮ್ಮ 12 ಅಂಕಿಯ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?", hi: "आपका 12 अंकों का आधार नंबर क्या है?" } },
      { id: "phone",             type: "text", required: true, label: { en: "What is your 10-digit mobile number?", kn: "ನಿಮ್ಮ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?", hi: "आपका 10 अंकों का मोबाइल नंबर क्या है?" } },
      { id: "email",             type: "text", required: true, label: { en: "What is your email address?", kn: "ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ ಏನು?", hi: "आपका ईमेल पता क्या है?" } },
      { id: "address",           type: "text", required: true, label: { en: "What is your complete permanent address?", kn: "ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಖಾಯಂ ವಿಳಾಸ ಏನು?", hi: "आपका पूरा स्थायी पता क्या है?" } },
      { id: "pensionType",       type: "text", required: true, label: { en: "What type of pension? Old Age, Disability, or Widow?", kn: "ನೀವು ಯಾವ ಪಿಂಚಣಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುತ್ತಿದ್ದೀರಿ?", hi: "किस प्रकार की पेंशन? वृद्धावस्था, दिव्यांग या विधवा?" } },
      { id: "bankAccountNumber", type: "text", required: true, label: { en: "What is your bank account number?", kn: "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ ಏನು?", hi: "आपका बैंक खाता नंबर क्या है?" } },
      { id: "ifscCode",          type: "text", required: true, label: { en: "What is your bank IFSC code?", kn: "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಐಎಫ್‌ಎಸ್‌ಸಿ ಕೋಡ್ ಏನು?", hi: "आपके बैंक का IFSC कोड क्या है?" } }
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
      { id: "fullName",      type: "text", required: true, label: { en: "What is your full name?", kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?", hi: "आपका पूरा नाम क्या है?" } },
      { id: "dateOfBirth",   type: "date", required: true, label: { en: "What is your date of birth?", kn: "ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?", hi: "आपकी जन्म तिथि क्या है?" } },
      { id: "gender",        type: "text", required: true, label: { en: "What is your gender?", kn: "ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು?", hi: "आपका लिंग क्या है?" } },
      { id: "guardianName",  type: "text", required: true, label: { en: "What is your father or guardian's name?", kn: "ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಪೋಷಕರ ಹೆಸರು ಏನು?", hi: "आपके पिता या अभिभावक का नाम क्या है?" } },
      { id: "aadhaarNumber", type: "text", required: true, label: { en: "What is your Aadhaar number?", kn: "ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?", hi: "आपका आधार नंबर क्या है?" } },
      { id: "phone",         type: "text", required: true, label: { en: "What is your mobile phone number?", kn: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?", hi: "आपका मोबाइल नंबर क्या है?" } },
      { id: "address",       type: "text", required: true, label: { en: "What is your address?", kn: "ನಿಮ್ಮ ವಿಳಾಸ ಏನು?", hi: "आपका पता क्या है?" } }
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
      { id: "fullName",      type: "text", required: true, label: { en: "What is your full name?", kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?", hi: "आपका पूरा नाम क्या है?" } },
      { id: "dateOfBirth",   type: "date", required: true, label: { en: "What is your date of birth?", kn: "ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?", hi: "आपकी जन्म तिथि क्या है?" } },
      { id: "aadhaarNumber", type: "text", required: true, label: { en: "What is your Aadhaar number?", kn: "ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?", hi: "आपका आधार नंबर क्या है?" } },
      { id: "phone",         type: "text", required: true, label: { en: "What is your mobile phone number?", kn: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?", hi: "आपका मोबाइल नंबर क्या है?" } },
      { id: "annualIncome",  type: "text", required: true, label: { en: "What is your total annual family income in Rupees?", kn: "ನಿಮ್ಮ ಒಟ್ಟು ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ ಎಷ್ಟು ರೂಪಾಯಿ?", hi: "आपकी कुल वार्षिक पारिवारिक आय कितने रुपये है?" } },
      { id: "address",       type: "text", required: true, label: { en: "What is your permanent address?", kn: "ನಿಮ್ಮ ಖಾಯಂ ವಿಳಾಸ ಏನು?", hi: "आपका स्थायी पता क्या है?" } }
    ]
  }
];

// ============================================================
// MySQL-backed service queries
// ============================================================

/**
 * Returns all enabled services. Falls back to DEFAULT_SERVICES if the
 * services table is empty (e.g. schema just created).
 */
const getAllServices = async () => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM services WHERE enabled = TRUE ORDER BY category, name_en"
    );
    if (rows.length === 0) {
      await seedServiceDefinitions();
      return DEFAULT_SERVICES;
    }
    return rows.map(rowToService);
  } catch (err) {
    console.error("Failed to query MySQL services:", err.message);
    return DEFAULT_SERVICES;
  }
};

/**
 * Returns a single service by its string ID.
 * @param {string} serviceId
 * @returns {object|null}
 */
const getServiceById = async (serviceId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM services WHERE service_id = ? LIMIT 1",
      [serviceId]
    );
    if (rows.length === 0) {
      return DEFAULT_SERVICES.find(s => s.id === serviceId) || null;
    }
    return rowToService(rows[0]);
  } catch (err) {
    console.error("Failed to query MySQL service by id:", err.message);
    return DEFAULT_SERVICES.find(s => s.id === serviceId) || null;
  }
};

/**
 * Seeds DEFAULT_SERVICES into the MySQL services table if not present.
 */
const seedServiceDefinitions = async () => {
  try {
    for (const svc of DEFAULT_SERVICES) {
      await pool.execute(
        `INSERT IGNORE INTO services
           (service_id, name_en, name_kn, name_hi,
            description_en, description_kn, description_hi,
            category, enabled, questions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [
          svc.id,
          svc.name.en, svc.name.kn, svc.name.hi,
          svc.description.en, svc.description.kn, svc.description.hi,
          svc.category,
          JSON.stringify(svc.questions),
        ]
      );
    }
    console.log("✅ Seeded default service definitions into MySQL.");
  } catch (err) {
    console.error("Error seeding services to MySQL:", err.message);
  }
};

// ---- helpers ----
function rowToService(row) {
  return {
    id: row.service_id,
    name: { en: row.name_en, kn: row.name_kn, hi: row.name_hi },
    description: { en: row.description_en, kn: row.description_kn, hi: row.description_hi },
    category: row.category,
    enabled: Boolean(row.enabled),
    questions: tryParse(row.questions, []),
  };
}

function tryParse(val, fallback) {
  if (!val) return fallback;
  try { return typeof val === "string" ? JSON.parse(val) : val; }
  catch { return fallback; }
}

module.exports = {
  getAllServices,
  getServiceById,
  seedServiceDefinitions,
  DEFAULT_SERVICES,
};
