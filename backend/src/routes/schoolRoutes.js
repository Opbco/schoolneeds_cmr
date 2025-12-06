const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { validate, schemas } = require('../middleware/validation');

router.get('/', schoolController.getSchools);
router.post('/', validate(schemas.createSchool), schoolController.createSchool);

// --- REFERENCE ROUTES ---
router.get('/classes', schoolController.getClasses);
router.get('/series', schoolController.getSeries);
router.get('/subjects', schoolController.getSubjects);
router.get('/domaines', schoolController.getDomains);

// --- NEW ROUTES FOR PERSONNEL ---
router.get('/grades', schoolController.getGrades);
router.get('/admin-positions', schoolController.getAdminPositions);

// --- CURRICULUM ROUTES (Must be before /:id) ---
router.get('/curriculum', schoolController.getCurriculum);
router.post('/curriculum', schoolController.createCurriculum); 
router.put('/curriculum/:id', schoolController.updateCurriculum);
router.delete('/curriculum/:id', schoolController.deleteCurriculum);

// --- NETWORK & SCHEDULING ROUTES (NEW) ---
router.post('/networks/generate', schoolController.generateNetworks);
router.post('/networks/timetable', schoolController.generateTimetables);
router.get('/networks', schoolController.getNetworks);
router.get('/networks/:id', schoolController.getNetworkById);

// --- DYNAMIC ROUTES ---
router.get('/:id', schoolController.getSchoolById);

router.get('/:id/structure', schoolController.getSchoolStructure);
router.post('/:id/structure', validate(schemas.upsertStructure), schoolController.upsertSchoolStructure);
router.delete('/:id/structure', schoolController.deleteSchoolStructure);

module.exports = router;