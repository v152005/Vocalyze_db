const express = require("express");
const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Classify user intent for speech navigation (open to all authenticated or onboarding sessions)
router.post("/classify-intent", aiController.classifyIntent);

// Apply authMiddleware globally to all form/doc endpoints
router.use(authMiddleware);

router.post("/explain", aiController.explain);
router.post("/parse-response", aiController.parse);
router.post("/parse-document", aiController.parseDocument);

module.exports = router;
