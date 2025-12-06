const db = require('../config/db');

class SchoolService {
  async getAllSchools(filters = {}) {
    let query = 'SELECT s.* FROM schools s';
    const params = [];
    const conditions = [];

    // --- Pedagogic Filtering (Needs/Excess) ---
    // If filtering by subject, we join the needs_report view
    if (filters.subject_id) {
      query = `
        SELECT s.*, nr.balance as filtered_subject_balance, nr.domain_name as filtered_subject_name
        FROM schools s
        LEFT JOIN needs_report nr ON s.id = nr.school_id AND nr.teaching_domain_id = ?
      `;
      params.push(filters.subject_id);

      // Handle Balance Status (Deficit vs Surplus)
      if (filters.balance_status === 'deficit') {
        conditions.push('nr.balance < 0');
      } else if (filters.balance_status === 'surplus') {
        conditions.push('nr.balance > 0');
      }
    }

    // --- Standard Filtering ---
    if (filters.region) {
      conditions.push('s.region = ?');
      params.push(filters.region);
    }

    if (filters.division) {
      conditions.push('s.division = ?');
      params.push(filters.division);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ordering
    query += ' ORDER BY s.name ASC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  async getSchoolById(id) {
    const [rows] = await db.query('SELECT * FROM schools WHERE id = ?', [id]);
    return rows[0];
  }

  async createSchool(schoolData) {
    const { code, name, region, division, latitude, longitude } = schoolData;
    const query = `
      INSERT INTO schools (code, name, region, division, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [code, name, region, division, latitude, longitude]);
    return { id: result.insertId, ...schoolData };
  }

  async getSchoolStructure(schoolId) {
    const query = `
      SELECT ref_class_levels.name AS className, ref_series.code AS serieCode, ref_class_levels.cycle, ref_series.name AS serieName, ref_education_types.name AS typeEducation, school_structure_inputs.number_of_divisions, school_structure_inputs.school_id, school_structure_inputs.class_level_id, school_structure_inputs.series_id, ref_series.education_type_id
      FROM school_structure_inputs
      JOIN ref_class_levels ON ref_class_levels.id = school_structure_inputs.class_level_id
      JOIN ref_series ON ref_series.id = school_structure_inputs.series_id
      LEFT JOIN ref_education_types ON ref_series.education_type_id = ref_education_types.id
      WHERE school_structure_inputs.school_id = ?
    `;
    const [rows] = await db.query(query, [schoolId]);
    return rows;
  }

  async upsertSchoolStructure(schoolId, structureData) {
    const { class_level_id, series_id, number_of_divisions } = structureData;
    
    // Check if entry exists
    const checkQuery = `
      SELECT id FROM school_structure_inputs 
      WHERE school_id = ? AND class_level_id = ? AND series_id = ?
    `;
    const [existing] = await db.query(checkQuery, [schoolId, class_level_id, series_id]);

    if (existing.length > 0) {
      // Update
      const updateQuery = `
        UPDATE school_structure_inputs 
        SET number_of_divisions = ?
        WHERE id = ?
      `;
      await db.query(updateQuery, [number_of_divisions, existing[0].id]);
      return { id: existing[0].id, school_id: schoolId, ...structureData, action: 'updated' };
    } else {
      // Insert
      const insertQuery = `
        INSERT INTO school_structure_inputs (school_id, class_level_id, series_id, number_of_divisions)
        VALUES (?, ?, ?, ?)
      `;
      const [result] = await db.query(insertQuery, [schoolId, class_level_id, series_id, number_of_divisions]);
      return { id: result.insertId, school_id: schoolId, ...structureData, action: 'created' };
    }
  }

  async deleteSchoolStructure(schoolId, classLevelId, seriesId) {
    const query = `DELETE FROM school_structure_inputs WHERE school_id = ? AND class_level_id = ? AND series_id = ?`;
    const [result] = await db.query(query, [schoolId, classLevelId, seriesId]);
    return result.affectedRows > 0;
  }

  // --- REFERENCE DATA METHODS ---

  async getAllClasses() {
    const query = 'SELECT id, name, cycle FROM ref_class_levels ORDER BY id ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  async getAllSeries() {
    const query = `
      SELECT s.id, s.code, s.name, e.name AS education_type_name 
      FROM ref_series s
      LEFT JOIN ref_education_types e ON s.education_type_id = e.id
      ORDER BY s.code ASC
    `;
    const [rows] = await db.query(query);
    return rows;
  }

  async getAllSubjects() {
    const query = 'SELECT id, code, name, domain_id FROM ref_subjects ORDER BY name ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  async getAllDomains() {
    const query = `
      SELECT d.id, d.name, d.subsystem_id, s.name AS subsystem_name
      FROM ref_teaching_domains d
      LEFT JOIN ref_subsystems s ON d.subsystem_id = s.id
      ORDER BY d.name ASC
    `;
    const [rows] = await db.query(query);
    return rows;
  }

  // --- NEW METHODS FOR PERSONNEL DROP-DOWNS ---
  async getAllGrades() {
    const query = 'SELECT * FROM ref_grades ORDER BY grade_code ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  async getAllAdminPositions() {
    const query = 'SELECT * FROM ref_admin_positions ORDER BY name ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  // --- CURRICULUM MATRIX METHODS ---

  async getCurriculum(filters = {}) {
    let query = `
      SELECT cm.id, cm.weekly_hours, 
             cl.name AS className, cl.cycle,
             s.code AS serieCode, s.name AS serieName,
             sub.name AS subjectName, sub.code AS subjectCode,
             cm.class_level_id, cm.series_id, cm.subject_id
      FROM curriculum_matrix cm
      JOIN ref_class_levels cl ON cm.class_level_id = cl.id
      JOIN ref_series s ON cm.series_id = s.id
      JOIN ref_subjects sub ON cm.subject_id = sub.id
    `;
    
    const conditions = [];
    const params = [];

    if (filters.class_level_id) {
      conditions.push('cm.class_level_id = ?');
      params.push(filters.class_level_id);
    }
    if (filters.series_id) {
      conditions.push('cm.series_id = ?');
      params.push(filters.series_id);
    }
    if (filters.subject_id) {
      conditions.push('cm.subject_id = ?');
      params.push(filters.subject_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY cl.id ASC, s.id ASC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  async createCurriculum(data) {
    const { class_level_id, series_id, subject_id, weekly_hours } = data;
    // Check for duplicates
    const checkQuery = `SELECT id FROM curriculum_matrix WHERE class_level_id=? AND series_id=? AND subject_id=?`;
    const [existing] = await db.query(checkQuery, [class_level_id, series_id, subject_id]);
    
    if (existing.length > 0) {
        throw new Error("This curriculum entry already exists. Please update it instead.");
    }

    const query = `
      INSERT INTO curriculum_matrix (class_level_id, series_id, subject_id, weekly_hours)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [class_level_id, series_id, subject_id, weekly_hours]);
    return { id: result.insertId, ...data };
  }

  async updateCurriculum(id, data) {
    const { weekly_hours } = data;
    const query = `UPDATE curriculum_matrix SET weekly_hours = ? WHERE id = ?`;
    const [result] = await db.query(query, [weekly_hours, id]);
    return result.affectedRows > 0;
  }

  async deleteCurriculum(id) {
    const query = `DELETE FROM curriculum_matrix WHERE id = ?`;
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }

  // --- NETWORK & SCHEDULING LOGIC ---

  async generateNetworks(radiusKm) {
    // Calls the Stored Procedure to generate clusters based on distance
    await db.query('CALL sp_GenerateNetworks_Greedy(?)', [radiusKm]);
    return this.getAllNetworks();
  }

  async generateTimetables() {
    // Calls the Stored Procedure to schedule virtual courses in multimedia rooms
    await db.query('CALL sp_GenerateNetworkTimetable()');
    return { message: 'Timetables generated successfully' };
  }

  async getAllNetworks() {
    // Fetches simple list of networks
    const [rows] = await db.query(`
      SELECT * FROM school_networks ORDER BY id DESC
    `);
    return rows;
  }

  async getNetworkDetails(networkId) {
    // 1. Get Network Info
    const [networkRows] = await db.query('SELECT * FROM school_networks WHERE id = ?', [networkId]);
    if (networkRows.length === 0) return null;
    const network = networkRows[0];

    // 2. Get Members (Schools in the network)
    const [members] = await db.query(`
      SELECT snm.*, s.name as school_name, s.code, s.region, s.division 
      FROM school_network_members snm
      JOIN schools s ON snm.school_id = s.id
      WHERE snm.network_id = ?
    `, [networkId]);

    // 3. Get Virtual Courses (The shared resources)
    const [courses] = await db.query(`
      SELECT vc.*, 
             prov_s.name as provider_school_name,
             subj.name as subject_name,
             cl.name as class_level_name
      FROM network_virtual_courses vc
      JOIN schools prov_s ON vc.provider_school_id = prov_s.id
      JOIN ref_subjects subj ON vc.subject_id = subj.id
      JOIN ref_class_levels cl ON vc.class_level_id = cl.id
      WHERE vc.network_id = ?
    `, [networkId]);

    // 4. Get Schedule (Joined with Time Slots)
    const [schedule] = await db.query(`
      SELECT ms.*, 
             ts.day_of_week, ts.time_slot_number, ts.start_time, ts.end_time,
             vc.subject_id, subj.name as subject_name,
             vc.provider_school_id, prov.name as provider_name
      FROM multimedia_room_schedule ms
      JOIN ref_time_slots ts ON ms.time_slot_id = ts.id
      JOIN network_virtual_courses vc ON ms.virtual_course_id = vc.id
      JOIN ref_subjects subj ON vc.subject_id = subj.id
      JOIN schools prov ON vc.provider_school_id = prov.id
      WHERE vc.network_id = ?
      ORDER BY FIELD(ts.day_of_week, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'), ts.time_slot_number
    `, [networkId]);

    return {
      ...network,
      members,
      virtual_courses: courses,
      schedule
    };
  }
}

module.exports = new SchoolService();