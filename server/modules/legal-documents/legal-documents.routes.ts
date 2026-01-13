import { Router } from "express";
import { success, error as errorResponse } from "../../response";
import * as legalRepository from "./legal-documents.repository";

const router = Router();

// GET /api/v2/legal-documents?active=true
router.get("/", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";
    if (!activeOnly) {
      return res.status(400).json(errorResponse("Only active=true is supported for public legal documents"));
    }
    
    const documents = await legalRepository.getActiveLegalDocuments();
    return res.json(success(documents, "Active legal documents fetched successfully"));
  } catch (err) {
    console.error("[LEGAL_API] Error fetching legal documents:", err);
    return res.status(500).json(errorResponse("Failed to fetch legal documents"));
  }
});

export default router;
