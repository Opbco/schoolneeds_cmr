const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');
const { validate, schemas } = require('../middleware/validation');

router.get('/personnel', personnelController.getPersonnel);
router.post('/personnel', validate(schemas.createPersonnel), personnelController.createPersonnel);
router.put('/personnel/:matricule', validate(schemas.updatePersonnel), personnelController.updatePersonnel); // New

router.post('/postings/transfer', validate(schemas.transferPersonnel), personnelController.transferPersonnel);

// Stats & Reference
router.get('/personnel/stats/retirement', personnelController.getRetirementStats); // New
router.get('/personnel/statuses', personnelController.getStatuses); // New

module.exports = router;
