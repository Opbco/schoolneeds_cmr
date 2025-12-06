const db = require('../config/db');
const schoolService = require('./schoolService');

class ReportService {
  async getSchoolNeedsReport(schoolId) {
    // 1. Get School Info
    const school = await schoolService.getSchoolById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    // 2. Call Stored Procedure
    const [rows] = await db.query('CALL sp_GetSchoolBalanceReport(?)', [schoolId]);
    
    // rows[0] contains the result set because CALL returns an array of result sets
    const reportData = Array.isArray(rows[0]) ? rows[0] : [];

    // 3. Group by Status
    // Expected format: { "DEFICIT (...)": [...], "EXCESS (...)": [...] }
    const groupedReport = reportData.reduce((acc, item) => {
      const status = item.status || 'UNKNOWN';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(item);
      return acc;
    }, {});

    return {
      school_id: school.id,
      school_name: school.name,
      report: groupedReport
    };
  }
}

module.exports = new ReportService();
