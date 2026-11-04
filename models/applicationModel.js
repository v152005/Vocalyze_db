const { pool } = require("../config/db");

/**
 * Creates a new application row in MySQL.
 * @param {string} uid       - User UID.
 * @param {string} serviceId - Service ID string.
 * @returns {object} The created application data.
 */
const createApplication = async (uid, serviceId) => {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const applicationId = `APP-2026-${randomSuffix}`;

  await pool.execute(
    `INSERT INTO applications (application_id, service_id, user_uid, status, answers)
     VALUES (?, ?, ?, 'IN_PROGRESS', '{}')`,
    [applicationId, serviceId, uid]
  );

  return {
    applicationId,
    serviceId,
    userId: uid,
    status: "IN_PROGRESS",
    answers: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Updates application answers (merged patch).
 * @param {string} applicationId
 * @param {object} answers - The full merged answers object.
 */
const updateApplicationAnswers = async (applicationId, answers) => {
  await pool.execute(
    `UPDATE applications SET answers = ?, updated_at = NOW() WHERE application_id = ?`,
    [JSON.stringify(answers), applicationId]
  );
};

/**
 * Marks an application as SUBMITTED.
 * @param {string} applicationId
 */
const submitApplication = async (applicationId) => {
  await pool.execute(
    `UPDATE applications SET status = 'SUBMITTED', updated_at = NOW() WHERE application_id = ?`,
    [applicationId]
  );
};

/**
 * Retrieves all applications for a given user UID.
 * @param {string} uid
 * @returns {Array}
 */
const getUserApplications = async (uid) => {
  const [rows] = await pool.execute(
    "SELECT * FROM applications WHERE user_uid = ? ORDER BY created_at DESC",
    [uid]
  );
  return rows.map(rowToApp);
};

/**
 * Retrieves a single application by its ID.
 * @param {string} applicationId
 * @returns {object|null}
 */
const getApplicationById = async (applicationId) => {
  const [rows] = await pool.execute(
    "SELECT * FROM applications WHERE application_id = ? LIMIT 1",
    [applicationId]
  );
  if (rows.length === 0) return null;
  return rowToApp(rows[0]);
};

// ---- helpers ----
function rowToApp(row) {
  return {
    id: row.application_id,
    applicationId: row.application_id,
    serviceId: row.service_id,
    userId: row.user_uid,
    status: row.status,
    answers: tryParse(row.answers, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function tryParse(val, fallback) {
  if (!val) return fallback;
  try { return typeof val === "string" ? JSON.parse(val) : val; }
  catch { return fallback; }
}

module.exports = {
  createApplication,
  updateApplicationAnswers,
  submitApplication,
  getUserApplications,
  getApplicationById,
};
