const { pool } = require("../config/db");

/**
 * Creates a new application row in MySQL applications table.
 */
const createApplication = async (uid, serviceCode) => {
  const [userRows] = await pool.execute("SELECT id FROM users WHERE uid = ? LIMIT 1", [uid]);
  if (userRows.length === 0) {
    throw new Error("User not found");
  }
  const userId = userRows[0].id;

  const [svcRows] = await pool.execute(
    "SELECT id, service_code FROM services WHERE service_code = ? OR id = ? LIMIT 1",
    [serviceCode, isNaN(Number(serviceCode)) ? -1 : Number(serviceCode)]
  );
  if (svcRows.length === 0) {
    throw new Error("Service not found");
  }
  const serviceDbId = svcRows[0].id;
  const canonicalCode = svcRows[0].service_code;

  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const applicationNumber = `APP-2026-${randomSuffix}`;

  const [res] = await pool.execute(
    `INSERT INTO applications (application_number, user_id, service_id, status)
     VALUES (?, ?, ?, 'IN_PROGRESS')`,
    [applicationNumber, userId, serviceDbId]
  );

  return {
    id: applicationNumber,
    applicationId: applicationNumber,
    applicationDbId: res.insertId,
    serviceId: canonicalCode,
    userId: uid,
    status: "IN_PROGRESS",
    answers: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Updates application answers in the application_answers table.
 */
const updateApplicationAnswers = async (applicationNumber, answers) => {
  const [appRows] = await pool.execute(
    "SELECT id, service_id FROM applications WHERE application_number = ? LIMIT 1",
    [applicationNumber]
  );
  if (appRows.length === 0) return;

  const appDbId = appRows[0].id;
  const serviceDbId = appRows[0].service_id;

  const [qRows] = await pool.execute(
    "SELECT id, field_key FROM service_questions WHERE service_id = ?",
    [serviceDbId]
  );
  const qMap = {};
  for (const q of qRows) {
    qMap[q.field_key] = q.id;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const [key, value] of Object.entries(answers)) {
      const qId = qMap[key];
      if (qId) {
        const valStr = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        await conn.execute(
          `INSERT INTO application_answers (application_id, question_id, field_key, answer_value)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             answer_value = VALUES(answer_value),
             updated_at = NOW()`,
          [appDbId, qId, key, valStr]
        );
      }
    }

    await conn.execute("UPDATE applications SET updated_at = NOW() WHERE id = ?", [appDbId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Submits an application by setting status to SUBMITTED and submitted_at to NOW().
 */
const submitApplication = async (applicationNumber) => {
  await pool.execute(
    `UPDATE applications
     SET status = 'SUBMITTED', submitted_at = NOW(), updated_at = NOW()
     WHERE application_number = ?`,
    [applicationNumber]
  );
};

/**
 * Retrieves all applications for a user UID, including answers.
 */
const getUserApplications = async (uid) => {
  const [userRows] = await pool.execute("SELECT id FROM users WHERE uid = ? LIMIT 1", [uid]);
  if (userRows.length === 0) return [];
  const userId = userRows[0].id;

  const [apps] = await pool.execute(
    `SELECT a.id, a.application_number, a.status, a.submitted_at, a.created_at, a.updated_at,
            s.service_code
     FROM applications a
     JOIN services s ON a.service_id = s.id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`,
    [userId]
  );

  const results = [];
  for (const a of apps) {
    const [ansRows] = await pool.execute(
      "SELECT field_key, answer_value FROM application_answers WHERE application_id = ?",
      [a.id]
    );
    const answers = {};
    for (const ans of ansRows) {
      answers[ans.field_key] = ans.answer_value;
    }

    results.push({
      id: a.application_number,
      applicationId: a.application_number,
      serviceId: a.service_code,
      userId: uid,
      status: a.status,
      answers,
      submittedAt: a.submitted_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    });
  }

  return results;
};

/**
 * Retrieves a single application by application_number with answers.
 */
const getApplicationById = async (applicationNumber) => {
  const [apps] = await pool.execute(
    `SELECT a.id, a.application_number, a.status, a.submitted_at, a.created_at, a.updated_at,
            s.service_code, u.uid as user_uid
     FROM applications a
     JOIN services s ON a.service_id = s.id
     JOIN users u ON a.user_id = u.id
     WHERE a.application_number = ? LIMIT 1`,
    [applicationNumber]
  );

  if (apps.length === 0) return null;
  const a = apps[0];

  const [ansRows] = await pool.execute(
    "SELECT field_key, answer_value FROM application_answers WHERE application_id = ?",
    [a.id]
  );
  const answers = {};
  for (const ans of ansRows) {
    answers[ans.field_key] = ans.answer_value;
  }

  return {
    id: a.application_number,
    applicationId: a.application_number,
    serviceId: a.service_code,
    userId: a.user_uid,
    status: a.status,
    answers,
    submittedAt: a.submitted_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
};

module.exports = {
  createApplication,
  updateApplicationAnswers,
  submitApplication,
  getUserApplications,
  getApplicationById,
};
