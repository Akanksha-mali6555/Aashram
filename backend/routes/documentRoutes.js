const express = require("express");
const router = express.Router();
const {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getPublicDocuments
} = require("../controllers/documentController");
const {
  createDocumentRequest,
  getDocumentRequests,
  processDocumentRequest
} = require("../controllers/documentRequestController");
const authMiddleware = require("../middleware/authMiddleware");
const documentUpload = require("../middleware/documentUpload");

// Public route
router.get("/public", getPublicDocuments);

// All routes below require authentication
router.use(authMiddleware);

// Document Request Approval Endpoints
router.post("/requests", documentUpload.single("pdf"), createDocumentRequest);
router.get("/requests", getDocumentRequests);
router.put("/requests/:id/action", processDocumentRequest);

// Standard Document Endpoints
router.route("/")
  .get(getDocuments)
  .post(documentUpload.single("pdf"), (req, res, next) => {
    // If user is Document Handler, force request workflow
    if (req.user.role === 'DocumentHandler' || req.user.role === 'document_admin' || req.user.role === 'DocumentAdmin') {
      return createDocumentRequest(req, res);
    }
    createDocument(req, res);
  });

router.route("/:id")
  .get(getDocumentById)
  .put(documentUpload.single("pdf"), (req, res, next) => {
    if (req.user.role === 'DocumentHandler' || req.user.role === 'document_admin' || req.user.role === 'DocumentAdmin') {
      req.body.requestType = "Update";
      req.body.targetDocumentId = req.params.id;
      return createDocumentRequest(req, res);
    }
    updateDocument(req, res);
  })
  .delete((req, res, next) => {
    if (req.user.role === 'DocumentHandler' || req.user.role === 'document_admin' || req.user.role === 'DocumentAdmin') {
      req.body.requestType = "Delete";
      req.body.targetDocumentId = req.params.id;
      return createDocumentRequest(req, res);
    }
    deleteDocument(req, res);
  });

module.exports = router;
