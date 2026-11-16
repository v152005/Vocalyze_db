const { pool } = require("../config/db");

/**
 * Creates a new user row in the users table, and an initial user_profiles row in MySQL.
 * @param {string} uid - Unique system UID string.
 * @param {object} userData - { name, email, passwordHash, salt }
 */
const createUserDoc = async (uid, userData) => {
  const { name, email, passwordHash, salt } = userData;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO users (uid, name, email, password_hash, password_salt, role, is_active)
       VALUES (?, ?, ?, ?, ?, 'citizen', 1)`,
      [uid, name, email.toLowerCase().trim(), passwordHash, salt]
    );

    const userId = result.insertId;

    // Create corresponding default profile row in user_profiles
    await conn.execute(
      `INSERT INTO user_profiles (user_id, preferred_language, voice_input, voice_output, transcription, conversational_guidance, simplified_instructions)
       VALUES (?, 'en', 1, 1, 0, 1, 0)`,
      [userId]
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * Finds user and profile by email address.
 * @param {string} email
 * @returns {object|null}
 */
const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.uid, u.name, u.email, u.password_hash, u.password_salt, u.role, u.is_active,
            up.preferred_language, up.voice_input, up.voice_output, up.transcription,
            up.conversational_guidance, up.simplified_instructions
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE u.email = ? LIMIT 1`,
    [email.toLowerCase().trim()]
  );

  if (rows.length === 0) return null;
  const row = rows[0];

  // Fetch accessibility needs
  const [needRows] = await pool.execute(
    `SELECT ant.code
     FROM user_accessibility_needs uan
     JOIN accessibility_need_types ant ON uan.need_type_id = ant.id
     WHERE uan.user_id = ?`,
    [row.id]
  );

  return {
    id: row.uid,
    uid: row.uid,
    dbId: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.password_salt,
    preferredLanguage: row.preferred_language || null,
    accessibilityNeeds: needRows.map(n => n.code),
    interactionPreferences: {
      voiceInput: Boolean(row.voice_input),
      voiceOutput: Boolean(row.voice_output),
      transcription: Boolean(row.transcription),
      conversationalGuidance: Boolean(row.conversational_guidance),
      simplifiedInstructions: Boolean(row.simplified_instructions),
    },
  };
};

/**
 * Finds user and profile by UID.
 * @param {string} uid
 * @returns {object|null}
 */
const findUserById = async (uid) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.uid, u.name, u.email, u.password_hash, u.password_salt, u.role, u.is_active,
            up.preferred_language, up.voice_input, up.voice_output, up.transcription,
            up.conversational_guidance, up.simplified_instructions
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE u.uid = ? LIMIT 1`,
    [uid]
  );

  if (rows.length === 0) return null;
  const row = rows[0];

  const [needRows] = await pool.execute(
    `SELECT ant.code
     FROM user_accessibility_needs uan
     JOIN accessibility_need_types ant ON uan.need_type_id = ant.id
     WHERE uan.user_id = ?`,
    [row.id]
  );

  return {
    id: row.uid,
    uid: row.uid,
    dbId: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.password_salt,
    preferredLanguage: row.preferred_language || null,
    accessibilityNeeds: needRows.map(n => n.code),
    interactionPreferences: {
      voiceInput: Boolean(row.voice_input),
      voiceOutput: Boolean(row.voice_output),
      transcription: Boolean(row.transcription),
      conversationalGuidance: Boolean(row.conversational_guidance),
      simplifiedInstructions: Boolean(row.simplified_instructions),
    },
  };
};

/**
 * Updates user profile details across users, user_profiles, and user_accessibility_needs.
 * @param {string} uid
 * @param {object} profileData
 */
const updateUserProfile = async (uid, profileData) => {
  const [users] = await pool.execute("SELECT id FROM users WHERE uid = ? LIMIT 1", [uid]);
  if (users.length === 0) return;
  const userId = users[0].id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (profileData.name) {
      await conn.execute("UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?", [
        profileData.name,
        userId,
      ]);
    }

    const { preferredLanguage, interactionPreferences, accessibilityNeeds } = profileData;

    const prefLang = preferredLanguage || "en";
    const voiceIn = interactionPreferences?.voiceInput ? 1 : 0;
    const voiceOut = interactionPreferences?.voiceOutput ? 1 : 0;
    const transcript = interactionPreferences?.transcription ? 1 : 0;
    const convGuide = interactionPreferences?.conversationalGuidance ? 1 : 0;
    const simpInstr = interactionPreferences?.simplifiedInstructions ? 1 : 0;

    await conn.execute(
      `INSERT INTO user_profiles (user_id, preferred_language, voice_input, voice_output, transcription, conversational_guidance, simplified_instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         preferred_language = VALUES(preferred_language),
         voice_input = VALUES(voice_input),
         voice_output = VALUES(voice_output),
         transcription = VALUES(transcription),
         conversational_guidance = VALUES(conversational_guidance),
         simplified_instructions = VALUES(simplified_instructions),
         updated_at = NOW()`,
      [userId, prefLang, voiceIn, voiceOut, transcript, convGuide, simpInstr]
    );

    if (Array.isArray(accessibilityNeeds)) {
      await conn.execute("DELETE FROM user_accessibility_needs WHERE user_id = ?", [userId]);
      for (const code of accessibilityNeeds) {
        const [needType] = await conn.execute(
          "SELECT id FROM accessibility_need_types WHERE code = ? LIMIT 1",
          [code]
        );
        if (needType.length > 0) {
          await conn.execute(
            "INSERT IGNORE INTO user_accessibility_needs (user_id, need_type_id) VALUES (?, ?)",
            [userId, needType[0].id]
          );
        }
      }
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  createUserDoc,
  findUserByEmail,
  updateUserProfile,
  findUserById,
};
