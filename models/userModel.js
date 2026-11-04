const { pool } = require("../config/db");

/**
 * Creates a new user row in MySQL.
 * @param {string} uid   - System-generated unique UID.
 * @param {object} userData - { name, email, passwordHash, salt }
 */
const createUserDoc = async (uid, userData) => {
  const { name, email, passwordHash, salt } = userData;
  await pool.execute(
    `INSERT INTO users (uid, name, email, password_hash, password_salt, role, is_active)
     VALUES (?, ?, ?, ?, ?, 'citizen', TRUE)`,
    [uid, name, email.toLowerCase().trim(), passwordHash, salt]
  );
};

/**
 * Finds a user by email address.
 * @param {string} email
 * @returns {object|null}
 */
const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email.toLowerCase().trim()]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.uid,          // expose uid as 'id' for backward compat
    uid: row.uid,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.password_salt,
    preferredLanguage: row.preferred_language || null,
    accessibilityNeeds: tryParse(row.accessibility_needs, []),
    interactionPreferences: tryParse(row.interaction_preferences, {
      voiceInput: false,
      voiceOutput: false,
      transcription: false,
      conversationalGuidance: false,
      simplifiedInstructions: false,
    }),
  };
};

/**
 * Finds a user by their UID.
 * @param {string} uid
 * @returns {object|null}
 */
const findUserById = async (uid) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE uid = ? LIMIT 1",
    [uid]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.uid,
    uid: row.uid,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.password_salt,
    preferredLanguage: row.preferred_language || null,
    accessibilityNeeds: tryParse(row.accessibility_needs, []),
    interactionPreferences: tryParse(row.interaction_preferences, {
      voiceInput: false,
      voiceOutput: false,
      transcription: false,
      conversationalGuidance: false,
      simplifiedInstructions: false,
    }),
  };
};

/**
 * Updates user profile fields (preferredLanguage, accessibilityNeeds, etc.).
 * @param {string} uid
 * @param {object} profileData
 */
const updateUserProfile = async (uid, profileData) => {
  const { preferredLanguage, accessibilityNeeds, interactionPreferences, name } = profileData;

  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name);
  }
  if (preferredLanguage !== undefined) {
    fields.push("preferred_language = ?");
    values.push(preferredLanguage);
  }
  if (accessibilityNeeds !== undefined) {
    fields.push("accessibility_needs = ?");
    values.push(JSON.stringify(accessibilityNeeds));
  }
  if (interactionPreferences !== undefined) {
    fields.push("interaction_preferences = ?");
    values.push(JSON.stringify(interactionPreferences));
  }

  if (fields.length === 0) return;

  values.push(uid);
  await pool.execute(
    `UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE uid = ?`,
    values
  );
};

// ---- helpers ----
function tryParse(val, fallback) {
  if (!val) return fallback;
  try { return typeof val === "string" ? JSON.parse(val) : val; }
  catch { return fallback; }
}

module.exports = {
  createUserDoc,
  findUserByEmail,
  updateUserProfile,
  findUserById,
};
