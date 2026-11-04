const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_vocalyze";

/**
 * Hashes a password using PBKDF2.
 * @param {string} password
 * @returns {{ salt: string, hash: string }}
 */
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { salt, hash };
};

/**
 * Verifies a plain-text password against a stored PBKDF2 hash.
 * @param {string} password
 * @param {string} salt
 * @param {string} hash
 * @returns {boolean}
 */
const verifyPassword = (password, salt, hash) => {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verifyHash;
};

/**
 * Registers a new user — stores credentials in MySQL only.
 * No Firebase dependency.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, token: string }}
 */
const registerUser = async (name, email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await userModel.findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error("User already exists with this email");
  }

  // Hash password for secure MySQL storage
  const { salt, hash } = hashPassword(password);

  // Generate a unique UID using Node.js built-in crypto (no external package)
  const uid = crypto.randomUUID();

  // Persist user to MySQL
  await userModel.createUserDoc(uid, {
    name,
    email: normalizedEmail,
    passwordHash: hash,
    salt,
  });

  const user = { uid, name, email: normalizedEmail };

  // Issue a signed JWT
  const token = jwt.sign(
    { uid: user.uid, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { user, token };
};

/**
 * Authenticates a user by email/password and issues a JWT.
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, token: string }}
 */
const authenticateUser = async (email, password) => {
  const user = await userModel.findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = verifyPassword(password, user.salt, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { uid: user.uid, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    user: { uid: user.uid, name: user.name, email: user.email },
    token,
  };
};

/**
 * Verifies a JWT and returns the decoded payload.
 * @param {string} token
 * @returns {object}
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  registerUser,
  authenticateUser,
  verifyToken,
};
