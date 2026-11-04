require("dotenv").config();
const app = require("./app");
const { isFirebaseConfigured } = require("./config/firebase");
const { testConnection } = require("./config/db");

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(isFirebaseConfigured() ? "✅ Firebase Admin initialized" : "⚠️  Firebase Admin is not configured");
  await testConnection(); // Verify MySQL Workbench connection on startup
});
