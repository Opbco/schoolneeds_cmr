const personnelService = require('../services/personnelService');
const path = require('path');
const fs = require('fs');

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

  async importPersonnel(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No CSV file uploaded.' });
      }

      const filePath = req.file.path;
      const result = await personnelService.importPersonnelFromCSV(filePath);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async importFromLocal(req, res, next) {
    try {
      const { filename } = req.body;
      if (!filename) {
        //return res.status(400).json({ message: 'Filename is required.' });
        filename = 'enseignants_detail.csv'
      }

      const safeFilename = path.basename(filename);
      
      const filePath = path.join(__dirname, '../../uploads', safeFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: `File '${safeFilename}' not found in uploads folder.` });
      }

      // Reuse the existing service logic
      const result = await personnelService.importPersonnelFromCSV(filePath);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PersonnelController();