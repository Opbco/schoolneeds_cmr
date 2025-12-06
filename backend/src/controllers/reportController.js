const reportService = require('../services/reportService');

class ReportController {
  async getSchoolNeeds(req, res, next) {
    try {
      const result = await reportService.getSchoolNeedsReport(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
