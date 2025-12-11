const schoolService = require('../services/schoolService');

class SchoolController {
  
  async getSchools(req, res, next) {
    try {
      const filters = {
        region: req.query.region,
        division: req.query.division,
        subject_id: req.query.subject_id,
        balance_status: req.query.balance_status
      };
      const schools = await schoolService.getAllSchools(filters);
      res.json(schools);
    } catch (error) {
      next(error);
    }
  }

  async getSchoolById(req, res, next) {
    try {
      const school = await schoolService.getSchoolById(req.params.id);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      res.json(school);
    } catch (error) {
      next(error);
    }
  }

  async createSchool(req, res, next) {
    try {
      const newSchool = await schoolService.createSchool(req.body);
      res.status(201).json(newSchool);
    } catch (error) {
      next(error);
    }
  }

  async getSchoolStructure(req, res, next) {
    try {
      const structure = await schoolService.getSchoolStructure(req.params.id);
      res.json(structure);
    } catch (error) {
      next(error);
    }
  }

  async upsertSchoolStructure(req, res, next) {
    try {
      const result = await schoolService.upsertSchoolStructure(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteSchoolStructure(req, res, next) {
    try {
      const { class_level_id, series_id } = req.body;
      const success = await schoolService.deleteSchoolStructure(req.params.id, class_level_id, series_id);
      if (success) {
        res.json({ message: 'Structure deleted successfully' });
      } else {
        res.status(404).json({ message: 'Structure entry not found' });
      }
    } catch (error) {
      next(error);
    }
  }

  // --- REFERENCE DATA METHODS ---

  async getAdminPositions(req, res, next) {
    try {
      const positions = await schoolService.getAllAdminPositions();
      res.json(positions);
    } catch (error) {
      next(error);
    }
  }

  // --- REFERENCE DATA METHODS (CRUD) ---

  async getClasses(req, res, next) {
    try {
      const classes = await schoolService.getAllClasses();
      res.json(classes);
    } catch (error) {
      next(error);
    }
  }

  // SERIES
  async getSeries(req, res, next) {
    try {
      const series = await schoolService.getAllSeries();
      res.json(series);
    } catch (error) {
      next(error);
    }
  }
  async createSeries(req, res, next) {
    try {
      const result = await schoolService.createSeries(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  async updateSeries(req, res, next) {
    try {
      const success = await schoolService.updateSeries(req.params.id, req.body);
      success ? res.json({ message: 'Series updated' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }
  async deleteSeries(req, res, next) {
    try {
      const success = await schoolService.deleteSeries(req.params.id);
      success ? res.json({ message: 'Series deleted' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }

  // SUBJECTS
  async getSubjects(req, res, next) {
    try {
      const subjects = await schoolService.getAllSubjects();
      res.json(subjects);
    } catch (error) {
      next(error);
    }
  }
  async createSubject(req, res, next) {
    try {
      const result = await schoolService.createSubject(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  async updateSubject(req, res, next) {
    try {
      const success = await schoolService.updateSubject(req.params.id, req.body);
      success ? res.json({ message: 'Subject updated' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }
  async deleteSubject(req, res, next) {
    try {
      const success = await schoolService.deleteSubject(req.params.id);
      success ? res.json({ message: 'Subject deleted' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }

  // DOMAINS (Teaching Domains)
  async getDomains(req, res, next) {
    try {
      const domains = await schoolService.getAllDomains();
      res.json(domains);
    } catch (error) {
      next(error);
    }
  }
  async createDomain(req, res, next) {
    try {
      const result = await schoolService.createTeachingDomain(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  async updateDomain(req, res, next) {
    try {
      const success = await schoolService.updateTeachingDomain(req.params.id, req.body);
      success ? res.json({ message: 'Domain updated' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }
  async deleteDomain(req, res, next) {
    try {
      const success = await schoolService.deleteTeachingDomain(req.params.id);
      success ? res.json({ message: 'Domain deleted' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }

  // SUBJECT GROUPS
  async getSubjectGroups(req, res, next) {
    try {
      const groups = await schoolService.getAllSubjectGroups();
      res.json(groups);
    } catch (error) {
      next(error);
    }
  }
  async createSubjectGroup(req, res, next) {
    try {
      const result = await schoolService.createSubjectGroup(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  async updateSubjectGroup(req, res, next) {
    try {
      const success = await schoolService.updateSubjectGroup(req.params.id, req.body);
      success ? res.json({ message: 'Group updated' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }
  async deleteSubjectGroup(req, res, next) {
    try {
      const success = await schoolService.deleteSubjectGroup(req.params.id);
      success ? res.json({ message: 'Group deleted' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }

  // GRADES
  async getGrades(req, res, next) {
    try {
      const grades = await schoolService.getAllGrades();
      res.json(grades);
    } catch (error) {
      next(error);
    }
  }
  async createGrade(req, res, next) {
    try {
      const result = await schoolService.createGrade(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  async updateGrade(req, res, next) {
    try {
      const success = await schoolService.updateGrade(req.params.id, req.body);
      success ? res.json({ message: 'Grade updated' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }
  async deleteGrade(req, res, next) {
    try {
      const success = await schoolService.deleteGrade(req.params.id);
      success ? res.json({ message: 'Grade deleted' }) : res.status(404).json({ message: 'Not found' });
    } catch (error) {
      next(error);
    }
  }

  // --- CURRICULUM METHODS ---

  async getCurriculum(req, res, next) {
    try {
      const filters = {
        class_level_id: req.query.class_level_id,
        series_id: req.query.series_id,
        subject_id: req.query.subject_id
      };
      const data = await schoolService.getCurriculum(filters);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async createCurriculum(req, res, next) {
    try {
      const result = await schoolService.createCurriculum(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateCurriculum(req, res, next) {
    try {
      const success = await schoolService.updateCurriculum(req.params.id, req.body);
      if (success) {
        res.json({ message: 'Curriculum updated successfully' });
      } else {
        res.status(404).json({ message: 'Entry not found' });
      }
    } catch (error) {
      next(error);
    }
  }

  async deleteCurriculum(req, res, next) {
    try {
      const success = await schoolService.deleteCurriculum(req.params.id);
      if (success) {
        res.json({ message: 'Curriculum deleted successfully' });
      } else {
        res.status(404).json({ message: 'Entry not found' });
      }
    } catch (error) {
      next(error);
    }
  }

  // --- NETWORK & SCHEDULING METHODS (NEW) ---

  async generateNetworks(req, res, next) {
    try {
      // Default to 5km radius if not provided
      const radius = req.body.radius || 5.0; 
      const networks = await schoolService.generateNetworks(radius);
      res.json(networks);
    } catch (error) {
      next(error);
    }
  }

  async generateTimetables(req, res, next) {
    try {
      const result = await schoolService.generateTimetables();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getNetworks(req, res, next) {
    try {
      const networks = await schoolService.getAllNetworks();
      res.json(networks);
    } catch (error) {
      next(error);
    }
  }

  async getNetworkById(req, res, next) {
    try {
      const network = await schoolService.getNetworkDetails(req.params.id);
      if (!network) {
        return res.status(404).json({ message: 'Network not found' });
      }
      res.json(network);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SchoolController();