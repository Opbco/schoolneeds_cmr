const personnelService = require('../services/personnelService');

class PersonnelController {
  async getPersonnel(req, res, next) {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      // Pass the entire query object as filters (school_id, status_code, etc.)
      const filters = req.query; 
      const result = await personnelService.getAllPersonnel(filters, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createPersonnel(req, res, next) {
    try {
      const result = await personnelService.createPersonnel(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updatePersonnel(req, res, next) {
    try {
      const success = await personnelService.updatePersonnel(req.params.matricule, req.body);
      if (success) {
        res.json({ message: 'Personnel updated successfully' });
      } else {
        res.status(404).json({ message: 'Personnel not found' });
      }
    } catch (error) {
      next(error);
    }
  }

  async transferPersonnel(req, res, next) {
    try {
      const result = await personnelService.transferPersonnel(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getRetirementStats(req, res, next) {
    try {
      const result = await personnelService.getRetirementStats();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStatuses(req, res, next) {
    try {
      const result = await personnelService.getAllStatuses();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PersonnelController();