require("dotenv").config();
const app = require("./app");
const { testConnection, isDbConfigured } = require("./config/db");

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (isDbConfigured()) {
    await testConnection(); // Verify MySQL Workbench connection on startup
  } else {
    console.error("❌ MySQL pool not configured. Check DB_* environment variables in .env");
  }
});
