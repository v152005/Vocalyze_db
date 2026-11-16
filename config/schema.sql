-- ======================================================================
-- VOCALYZE RELATIONAL DATABASE SCHEMA (MySQL 8.0+)
-- Database: vocalyze_db
-- Character Set: utf8mb4 (Native support for Kannada, Hindi, English)
-- ======================================================================

CREATE DATABASE IF NOT EXISTS dbms_project
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dbms_project;

-- ----------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(64) NOT NULL UNIQUE COMMENT 'Unique system UID or Firebase UID',
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL COMMENT 'PBKDF2 sha512 hash',
    password_salt VARCHAR(64) NULL COMMENT 'Cryptographic salt',
    role ENUM('citizen', 'officer', 'admin') DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 2. USER ACCESSIBILITY PROFILES TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    preferred_language ENUM('en', 'hi', 'kn') NOT NULL DEFAULT 'en',
    voice_input BOOLEAN DEFAULT FALSE COMMENT 'Speak instead of typing',
    voice_output BOOLEAN DEFAULT FALSE COMMENT 'Hear information aloud',
    transcription BOOLEAN DEFAULT FALSE COMMENT 'Display spoken words as text',
    conversational_guidance BOOLEAN DEFAULT FALSE COMMENT 'Friendly assistant dialogues',
    simplified_instructions BOOLEAN DEFAULT FALSE COMMENT 'Plain language instructions',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 3. ACCESSIBILITY NEED MASTER & JUNCTION TABLES
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accessibility_need_types (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'reading, hearing, visual, interaction, understanding, voice, none',
    label VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_accessibility_needs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    need_type_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_need (user_id, need_type_id),
    CONSTRAINT fk_uan_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_uan_need_type FOREIGN KEY (need_type_id) 
        REFERENCES accessibility_need_types (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 4. SERVICES (GOVERNMENT SCHEMES) TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(64) NOT NULL UNIQUE COMMENT 'pension-certificate, disability-certificate, income-certificate',
    category VARCHAR(64) NOT NULL COMMENT 'social welfare, healthcare, revenue',
    is_enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_services_category (category),
    INDEX idx_services_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 5. SERVICE TRANSLATIONS (MULTILINGUAL) TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_translations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_id INT UNSIGNED NOT NULL,
    language_code ENUM('en', 'hi', 'kn') NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    UNIQUE KEY uq_service_lang (service_id, language_code),
    CONSTRAINT fk_st_service FOREIGN KEY (service_id) 
        REFERENCES services (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 6. SERVICE FORM QUESTIONS / INPUT SPECIFICATIONS
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_questions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_id INT UNSIGNED NOT NULL,
    field_key VARCHAR(64) NOT NULL COMMENT 'e.g. fullName, aadhaarNumber, dateOfBirth',
    input_type ENUM('text', 'date', 'number', 'select', 'textarea') NOT NULL DEFAULT 'text',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    regex_pattern VARCHAR(255) NULL COMMENT 'Client/server format validation regex',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_service_field (service_id, field_key),
    INDEX idx_sq_service_sort (service_id, sort_order),
    CONSTRAINT fk_sq_service FOREIGN KEY (service_id) 
        REFERENCES services (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 7. QUESTION TRANSLATIONS (AUDIO & TEXT LABELS)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_translations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    language_code ENUM('en', 'hi', 'kn') NOT NULL,
    prompt_label TEXT NOT NULL COMMENT 'Question read aloud by voice assistant',
    help_text TEXT NULL COMMENT 'Simplified conversational hint',
    UNIQUE KEY uq_question_lang (question_id, language_code),
    CONSTRAINT fk_qt_question FOREIGN KEY (question_id) 
        REFERENCES service_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 8. APPLICATIONS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_number VARCHAR(32) NOT NULL UNIQUE COMMENT 'e.g. APP-2026-78412',
    user_id BIGINT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    status ENUM('IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') 
        NOT NULL DEFAULT 'IN_PROGRESS',
    submitted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_app_user (user_id),
    INDEX idx_app_service (service_id),
    INDEX idx_app_status (status),
    CONSTRAINT fk_app_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_app_service FOREIGN KEY (service_id) 
        REFERENCES services (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 9. APPLICATION FORM ANSWERS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_answers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    question_id INT UNSIGNED NOT NULL,
    field_key VARCHAR(64) NOT NULL,
    answer_value TEXT NULL COMMENT 'Normalized answer string/JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_app_question (application_id, question_id),
    INDEX idx_aa_app (application_id),
    CONSTRAINT fk_aa_application FOREIGN KEY (application_id) 
        REFERENCES applications (id) ON DELETE CASCADE,
    CONSTRAINT fk_aa_question FOREIGN KEY (question_id) 
        REFERENCES service_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 10. DOCUMENT SCANS & OCR EXTRACTION RECORDS
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_scans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED NULL,
    document_type ENUM('aadhaar', 'ration_card', 'mark_sheet', 'other') NOT NULL,
    file_path VARCHAR(500) NULL,
    raw_ocr_text MEDIUMTEXT NULL,
    extracted_fields JSON NULL COMMENT 'Structured key-value pairs parsed by Gemini',
    confidence_score DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ds_user (user_id),
    INDEX idx_ds_app (application_id),
    CONSTRAINT fk_ds_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_application FOREIGN KEY (application_id) 
        REFERENCES applications (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 11. AI & VOICE INTERACTION AUDIT LOGS
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_interaction_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    session_id VARCHAR(64) NULL,
    interaction_type ENUM('explain_question', 'parse_voice_response', 'parse_document_ocr') NOT NULL,
    user_input TEXT NULL,
    ai_output TEXT NULL,
    language_code VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_user (user_id),
    INDEX idx_ai_session (session_id),
    CONSTRAINT fk_ail_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ======================================================================
-- VOCALYZE INITIAL SEED DATA (MySQL 8.0+)
-- Database: dbms_project
-- ======================================================================

USE dbms_project;

-- 1. Accessibility Need Master Types
INSERT IGNORE INTO accessibility_need_types (id, code, label, description) VALUES
(1, 'reading', 'Difficulty reading text', 'Requires screen reader or audio narration'),
(2, 'hearing', 'Difficulty hearing audio', 'Requires subtitles and transcriptions'),
(3, 'interaction', 'Difficulty using keyboard/mouse', 'Voice navigation or single-switch access'),
(4, 'understanding', 'Difficulty understanding complex instructions', 'Simplified conversational prompts'),
(5, 'voice', 'Prefer voice-based interaction', 'Speech recognition prioritized'),
(6, 'visual', 'Prefer visual assistance', 'High-contrast UI and scalable text'),
(7, 'none', 'No assistance needed', 'Standard UI');

-- 2. Master Services
INSERT INTO services (id, service_code, category, is_enabled, display_order) VALUES
(1, 'pension-certificate', 'social welfare', TRUE, 1),
(2, 'disability-certificate', 'healthcare', TRUE, 2),
(3, 'income-certificate', 'revenue', TRUE, 3)
ON DUPLICATE KEY UPDATE category = VALUES(category), is_enabled = VALUES(is_enabled);

-- 3. Multilingual Service Details
INSERT INTO service_translations (service_id, language_code, name, description) VALUES
-- Pension Certificate
(1, 'en', 'Pension Certificate', 'Apply for Old Age, Disability, or Widow pension certificate with financial assistance.'),
(1, 'kn', 'ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರ', 'ವೃದ್ಧಾಪ್ಯ, ಅಂಗವಿಕಲತೆ ಅಥವಾ ವಿಧವಾ ಪಿಂಚಣಿ ಪ್ರಮಾಣಪತ್ರಕ್ಕಾಗಿ ಆನ್ಲೈನ್ನಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.'),
(1, 'hi', 'पेंशन प्रमाण पत्र', 'वृद्धावस्था, दिव्यांग या विधवा पेंशन प्रमाण पत्र के लिए ऑनलाइन आवेदन करें।'),

-- Disability Certificate
(2, 'en', 'Disability Certificate', 'Apply for UDID and unique disability identity card.'),
(2, 'kn', 'ವಿಕಲಾಂಗತಾ ಪ್ರಮಾಣಪತ್ರ', 'ಯುಡಿಐಡಿ ಮತ್ತು ವಿಕಲಾಂಗತಾ ಗುರುತಿನ ಚೀಟಿಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.'),
(2, 'hi', 'दिव्यांगता प्रमाण पत्र', 'यूडीआईडी और दिव्यांगता पहचान पत्र के लिए आवेदन करें।'),

-- Income Certificate
(3, 'en', 'Income Certificate', 'Apply for official revenue department income certificate.'),
(3, 'kn', 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ', 'ಕಂದಾಯ ಇಲಾಖೆಯ ಆದಾಯ ಪ್ರಮಾಣಪತ್ರಕ್ಕಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.'),
(3, 'hi', 'आय प्रमाण पत्र', 'राजस्व विभाग के आय प्रमाण पत्र के लिए आवेदन करें।')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- 4. Questions for Pension Certificate (Service ID = 1)
INSERT INTO service_questions (id, service_id, field_key, input_type, is_required, regex_pattern, sort_order) VALUES
(1, 1, 'fullName', 'text', TRUE, NULL, 1),
(2, 1, 'dateOfBirth', 'date', TRUE, NULL, 2),
(3, 1, 'gender', 'text', TRUE, '^(male|female|other)$', 3),
(4, 1, 'ppoNumber', 'text', TRUE, NULL, 4),
(5, 1, 'guardianName', 'text', TRUE, NULL, 5),
(6, 1, 'aadhaarNumber', 'text', TRUE, '^[0-9]{12}$', 6),
(7, 1, 'phone', 'text', TRUE, '^[0-9]{10}$', 7),
(8, 1, 'email', 'text', TRUE, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', 8),
(9, 1, 'address', 'text', TRUE, NULL, 9),
(10, 1, 'pensionType', 'text', TRUE, NULL, 10),
(11, 1, 'bankAccountNumber', 'text', TRUE, '^[0-9]{9,18}$', 11),
(12, 1, 'ifscCode', 'text', TRUE, '^[A-Z]{4}0[A-Z0-9]{6}$', 12)
ON DUPLICATE KEY UPDATE input_type = VALUES(input_type), is_required = VALUES(is_required), regex_pattern = VALUES(regex_pattern);

-- 5. Translations for Pension Certificate Questions
INSERT INTO question_translations (question_id, language_code, prompt_label, help_text) VALUES
-- fullName
(1, 'en', 'What is your full name?', 'State your legal name as on official documents.'),
(1, 'kn', 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?', 'ಅಧಿಕೃತ ದಾಖಲೆಗಳಲ್ಲಿರುವಂತೆ ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ತಿಳಿಸಿ.'),
(1, 'hi', 'आपका पूरा नाम क्या है?', 'आधिकारिक दस्तावेजों के अनुसार अपना पूरा नाम बताएं।'),

-- dateOfBirth
(2, 'en', 'What is your date of birth?', 'Mention date, month and year.'),
(2, 'kn', 'ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?', 'ದಿನಾಂಕ, ತಿಂಗಳು ಮತ್ತು ವರ್ಷವನ್ನು ತಿಳಿಸಿ.'),
(2, 'hi', 'आपकी जन्म तिथि क्या है?', 'दिनांक, महीना और वर्ष बताएं।'),

-- gender
(3, 'en', 'What is your gender? Male, Female, or Other?', 'State Male, Female, or Other.'),
(3, 'kn', 'ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು? ಪುರುಷ, ಮಹಿಳೆ ಅಥವಾ ಇತರೆ?', 'ಪುರುಷ, ಮಹಿಳೆ ಅಥವಾ ಇತರೆ ಎಂದು ಹೇಳಿ.'),
(3, 'hi', 'आपका लिंग क्या है? पुरुष, महिला या अन्य?', 'पुरुष, महिला या अन्य बताएं।'),

-- ppoNumber
(4, 'en', 'Do you have an existing PPO number? Say Yes or No, or state your PPO number.', 'Pension Payment Order number if already allotted.'),
(4, 'kn', 'ನಿಮ್ಮ ಬಳಿ ಪಿಪಿಒ (PPO) ಸಂಖ್ಯೆ ಇದೆಯೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.', 'ಪಿಪಿಒ ಸಂಖ್ಯೆ ಇದ್ದರೆ ತಿಳಿಸಿ.'),
(4, 'hi', 'क्या आपके पास पीपीओ (PPO) नंबर है? हाँ या नहीं कहें, या अपना नंबर बताएं।', 'पेंशन भुगतान आदेश संख्या बताएं।'),

-- guardianName
(5, 'en', 'What is your father or spouse''s name?', 'Name of guardian, father, or spouse.'),
(5, 'kn', 'ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಸಂಗಾತಿಯ ಹೆಸರು ಏನು?', 'ಪೋಷಕರು, ತಂದೆ ಅಥವಾ ಸಂಗಾತಿಯ ಹೆಸರು.'),
(5, 'hi', 'आपके पिता या पति/पत्नी का नाम क्या है?', 'अभिभावक, पिता या पति/पत्नी का नाम बताएं।'),

-- aadhaarNumber
(6, 'en', 'What is your 12-digit Aadhaar number?', 'Speak all 12 digits of your Aadhaar card.'),
(6, 'kn', 'ನಿಮ್ಮ 12 ಅಂಕಿಯ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?', 'ನಿಮ್ಮ ಆಧಾರ್ ಕಾರ್ಡ್ನ 12 ಅಂಕಿಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಸಿ.'),
(6, 'hi', 'आपका 12 अंकों का आधार नंबर क्या है?', 'आधार कार्ड के 12 अंक बताएं।'),

-- phone
(7, 'en', 'What is your 10-digit mobile number?', 'Your active contact number.'),
(7, 'kn', 'ನಿಮ್ಮ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?', 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಫೋನ್ ಸಂಖ್ಯೆ.'),
(7, 'hi', 'आपका 10 अंकों का मोबाइल नंबर क्या है?', 'सक्रिय मोबाइल नंबर बताएं।'),

-- email
(8, 'en', 'What is your email address?', 'Your personal email address.'),
(8, 'kn', 'ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ ಏನು?', 'ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ.'),
(8, 'hi', 'आपका ईमेल पता क्या है?', 'अपना ईमेल पता बताएं।'),

-- address
(9, 'en', 'What is your complete permanent address?', 'Full residential address including pin code.'),
(9, 'kn', 'ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಖಾಯಂ ವಿಳಾಸ ಏನು?', 'ಪಿನ್ಕೋಡ್ ಸೇರಿದಂತೆ ಪೂರ್ಣ ವಿಳಾಸ.'),
(9, 'hi', 'आपका पूरा स्थायी पता क्या है?', 'पिन कोड सहित पूरा पता बताएं।'),

-- pensionType
(10, 'en', 'What type of pension are you applying for? Old Age, Disability, or Widow?', 'Select pension scheme category.'),
(10, 'kn', 'ನೀವು ಯಾವ ಪಿಂಚಣಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುತ್ತಿದ್ದೀರಿ? ವೃದ್ಧಾಪ್ಯ, ಅಂಗವಿಕಲತೆ ಅಥವಾ ವಿಧವಾ?', 'ಪಿಂಚಣಿ ವರ್ಗವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.'),
(10, 'hi', 'आप किस प्रकार की पेंशन के लिए आवेदन कर रहे हैं? वृद्धावस्था, दिव्यांग या विधवा?', 'पेंशन योजना का प्रकार चुनें।'),

-- bankAccountNumber
(11, 'en', 'What is your bank account number?', 'Direct Benefit Transfer bank account number.'),
(11, 'kn', 'ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ ಏನು?', 'ಖಾತೆ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.'),
(11, 'hi', 'आपका बैंक खाता नंबर क्या है?', 'बैंक खाता संख्या बताएं।'),

-- ifscCode
(12, 'en', 'What is your bank IFSC code?', '11-character bank branch code.'),
(12, 'kn', 'ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಐಎಫ್ಎಸ್ಸಿ ಕೋಡ್ ಏನು?', 'ಬ್ಯಾಂಕ್ ಶಾಖೆಯ ಕೋಡ್.'),
(12, 'hi', 'आपके बैंक का IFSC कोड क्या है?', 'बैंक शाखा कोड बताएं।')
ON DUPLICATE KEY UPDATE prompt_label = VALUES(prompt_label), help_text = VALUES(help_text);

-- 6. Questions for Disability Certificate (Service ID = 2)
INSERT INTO service_questions (id, service_id, field_key, input_type, is_required, regex_pattern, sort_order) VALUES
(13, 2, 'fullName', 'text', TRUE, NULL, 1),
(14, 2, 'dateOfBirth', 'date', TRUE, NULL, 2),
(15, 2, 'gender', 'text', TRUE, '^(male|female|other)$', 3),
(16, 2, 'guardianName', 'text', TRUE, NULL, 4),
(17, 2, 'aadhaarNumber', 'text', TRUE, '^[0-9]{12}$', 5),
(18, 2, 'phone', 'text', TRUE, '^[0-9]{10}$', 6),
(19, 2, 'address', 'text', TRUE, NULL, 7)
ON DUPLICATE KEY UPDATE input_type = VALUES(input_type), is_required = VALUES(is_required), regex_pattern = VALUES(regex_pattern);

-- Translations for Disability Certificate Questions
INSERT INTO question_translations (question_id, language_code, prompt_label, help_text) VALUES
(13, 'en', 'What is your full name?', 'State your legal name.'),
(13, 'kn', 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?', 'ನಿಮ್ಮ ಹೆಸರನ್ನು ತಿಳಿಸಿ.'),
(13, 'hi', 'आपका पूरा नाम क्या है?', 'अपना नाम बताएं।'),

(14, 'en', 'What is your date of birth?', 'Mention date, month and year.'),
(14, 'kn', 'ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?', 'ಜನ್ಮ ದಿನಾಂಕವನ್ನು ತಿಳಿಸಿ.'),
(14, 'hi', 'आपकी जन्म तिथि क्या है?', 'जन्म तिथि बताएं।'),

(15, 'en', 'What is your gender?', 'Male, Female, or Other.'),
(15, 'kn', 'ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು?', 'ಪುರುಷ, ಮಹಿಳೆ ಅಥವಾ ಇತರೆ.'),
(15, 'hi', 'आपका लिंग क्या है?', 'पुरुष, महिला या अन्य।'),

(16, 'en', 'What is your father or guardian''s name?', 'Name of guardian or parent.'),
(16, 'kn', 'ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಪೋಷಕರ ಹೆಸರು ಏನು?', 'ಪೋಷಕರ ಹೆಸರು.'),
(16, 'hi', 'आपके पिता या अभिभावक का नाम क्या है?', 'अभिभावक का नाम बताएं।'),

(17, 'en', 'What is your Aadhaar number?', '12-digit Aadhaar number.'),
(17, 'kn', 'ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?', '12 ಅಂಕಿಯ ಸಂಖ್ಯೆ.'),
(17, 'hi', 'आपका आधार नंबर क्या है?', '12 अंकों का आधार।'),

(18, 'en', 'What is your mobile phone number?', '10-digit phone number.'),
(18, 'kn', 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?', 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ.'),
(18, 'hi', 'आपका मोबाइल नंबर क्या है?', 'मोबाइल नंबर।'),

(19, 'en', 'What is your address?', 'Full address.'),
(19, 'kn', 'ನಿಮ್ಮ ವಿಳಾಸ ಏನು?', 'ಸಂಪೂರ್ಣ ವಿಳಾಸ.'),
(19, 'hi', 'आपका पता क्या है?', 'पूरा पता बताएं।')
ON DUPLICATE KEY UPDATE prompt_label = VALUES(prompt_label), help_text = VALUES(help_text);

-- 7. Questions for Income Certificate (Service ID = 3)
INSERT INTO service_questions (id, service_id, field_key, input_type, is_required, regex_pattern, sort_order) VALUES
(20, 3, 'fullName', 'text', TRUE, NULL, 1),
(21, 3, 'dateOfBirth', 'date', TRUE, NULL, 2),
(22, 3, 'aadhaarNumber', 'text', TRUE, '^[0-9]{12}$', 3),
(23, 3, 'phone', 'text', TRUE, '^[0-9]{10}$', 4),
(24, 3, 'annualIncome', 'text', TRUE, NULL, 5),
(25, 3, 'address', 'text', TRUE, NULL, 6)
ON DUPLICATE KEY UPDATE input_type = VALUES(input_type), is_required = VALUES(is_required), regex_pattern = VALUES(regex_pattern);

-- Translations for Income Certificate Questions
INSERT INTO question_translations (question_id, language_code, prompt_label, help_text) VALUES
(20, 'en', 'What is your full name?', 'State your legal name.'),
(20, 'kn', 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?', 'ನಿಮ್ಮ ಹೆಸರು.'),
(20, 'hi', 'आपका पूरा नाम क्या है?', 'अपना पूरा नाम बताएं।'),

(21, 'en', 'What is your date of birth?', 'Mention date of birth.'),
(21, 'kn', 'ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಏನು?', 'ಜನ್ಮ ದಿನಾಂಕ.'),
(21, 'hi', 'आपकी जन्म तिथि क्या है?', 'जन्म तिथि बताएं।'),

(22, 'en', 'What is your Aadhaar number?', '12 digits.'),
(22, 'kn', 'ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆ ಏನು?', '12 ಅಂಕಿಗಳು.'),
(22, 'hi', 'आपका आधार नंबर क्या है?', '12 अंक।'),

(23, 'en', 'What is your mobile phone number?', '10 digits.'),
(23, 'kn', 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಏನು?', '10 ಅಂಕಿಗಳ ಸಂಖ್ಯೆ.'),
(23, 'hi', 'आपका मोबाइल नंबर क्या है?', '10 अंकों का फोन नंबर।'),

(24, 'en', 'What is your total annual family income in Rupees?', 'Enter estimated annual income.'),
(24, 'kn', 'ನಿಮ್ಮ ಒಟ್ಟು ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ ಎಷ್ಟು ರೂಪಾಯಿ?', 'ವಾರ್ಷಿಕ ಆದಾಯ.'),
(24, 'hi', 'आपकी कुल वार्षिक पारिवारिक आय कितने रुपये है?', 'वार्षिक आय बताएं।'),

(25, 'en', 'What is your permanent address?', 'Full address.'),
(25, 'kn', 'ನಿಮ್ಮ ಖಾಯಂ ವಿಳಾಸ ಏನು?', 'ವಿಳಾಸ.'),
(25, 'hi', 'आपका स्थायी पता क्या है?', 'स्थायी पता बताएं।')
ON DUPLICATE KEY UPDATE prompt_label = VALUES(prompt_label), help_text = VALUES(help_text);
