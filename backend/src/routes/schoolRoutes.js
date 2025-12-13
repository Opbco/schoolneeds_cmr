const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { validate, schemas } = require('../middleware/validation');

router.get('/', schoolController.getSchools);
router.post('/', validate(schemas.createSchool), schoolController.createSchool);

// --- REFERENCE ROUTES ---
router.get('/educations', schoolController.getTypeOfEducations);
router.get('/classes', schoolController.getClasses);
router.get('/admin-positions', schoolController.getAdminPositions);

// Series
router.get('/series', schoolController.getSeries);
router.post('/series', schoolController.createSeries);
router.put('/series/:id', schoolController.updateSeries);
router.delete('/series/:id', schoolController.deleteSeries);

// Subjects
router.get('/subjects', schoolController.getSubjects);
router.post('/subjects', schoolController.createSubject);
router.put('/subjects/:id', schoolController.updateSubject);
router.delete('/subjects/:id', schoolController.deleteSubject);

// Subject Groups
router.get('/subject-groups', schoolController.getSubjectGroups);
router.post('/subject-groups', schoolController.createSubjectGroup);
router.put('/subject-groups/:id', schoolController.updateSubjectGroup);
router.delete('/subject-groups/:id', schoolController.deleteSubjectGroup);

// Teaching Domains
router.get('/domaines', schoolController.getDomains); // Keeping original getter
router.post('/domaines', schoolController.createDomain);
router.put('/domaines/:id', schoolController.updateDomain);
router.delete('/domaines/:id', schoolController.deleteDomain);

// Grades
router.get('/grades', schoolController.getGrades);
router.post('/grades', schoolController.createGrade);
router.put('/grades/:id', schoolController.updateGrade); // :id here is the grade_code
router.delete('/grades/:id', schoolController.deleteGrade);

// --- CURRICULUM ROUTES (Must be before /:id) ---
router.get('/curriculum', schoolController.getCurriculum);
router.post('/curriculum', schoolController.createCurriculum); 
router.put('/curriculum/:id', schoolController.updateCurriculum);
router.delete('/curriculum/:id', schoolController.deleteCurriculum);

// --- NETWORK ROUTES (Refactored) ---
router.post('/networks/generate', schoolController.generateNetworks);
router.get('/networks', schoolController.getNetworks);
router.get('/networks/:id', schoolController.getNetworkById);

// --- DYNAMIC ROUTES ---
router.get('/:id', schoolController.getSchoolById);

router.get('/:id/structure', schoolController.getSchoolStructure);
router.post('/:id/structure', validate(schemas.upsertStructure), schoolController.upsertSchoolStructure);
router.delete('/:id/structure', schoolController.deleteSchoolStructure);

module.exports = router;