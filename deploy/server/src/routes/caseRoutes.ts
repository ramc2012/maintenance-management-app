import { Router } from "express";
import { getCases, createCase, getCaseById, addComment, updateStage, deleteCase, updateCase, getDashboardAnalytics } from "../controllers/caseController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getCases);
router.post("/", authenticateToken, createCase);
router.get("/analytics", authenticateToken, getDashboardAnalytics);
router.get("/:id", authenticateToken, getCaseById);
router.post("/:id/comments", authenticateToken, addComment);
router.put("/:id/stage", authenticateToken, updateStage);
router.put("/:id", authenticateToken, updateCase);
router.delete("/:id", authenticateToken, deleteCase);

export default router;
