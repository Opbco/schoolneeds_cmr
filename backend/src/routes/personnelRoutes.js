const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');
const { validate, schemas } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');

// Save files temporarily to 'uploads/' folder
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    // Basic CSV check
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

router.get('/personnel', personnelController.getPersonnel);
router.post('/personnel', validate(schemas.createPersonnel), personnelController.createPersonnel);
router.put('/personnel/:matricule', validate(schemas.updatePersonnel), personnelController.updatePersonnel); 
router.post('/postings/transfer', validate(schemas.transferPersonnel), personnelController.transferPersonnel);

// POST /api/personnel/import-local
router.post('/personnel/import', upload.single('file'), personnelController.importPersonnel);
router.post('/personnel/import-local', personnelController.importFromLocal);

// Stats & Reference
router.get('/personnel/stats/retirement', personnelController.getRetirementStats); // New
router.get('/personnel/statuses', personnelController.getStatuses); // New

module.exports = router;
