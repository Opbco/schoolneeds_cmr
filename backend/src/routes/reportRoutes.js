const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/school/:id/needs', reportController.getSchoolNeeds);

module.exports = router;
