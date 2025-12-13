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
        SELECT s.*, et.id as education_id, et.name as education, nr.balance as filtered_subject_balance, nr.domain_name as filtered_subject_name
        FROM schools s
        LEFT JOIN needs_report nr ON s.id = nr.school_id AND nr.teaching_domain_id = ?
        LEFT JOIN ref_school_types st ON s.school_type_id = st.id
        JOIN ref_education_types et ON st.education_type_id = et.id AND et.id = ?
      `;
      params.push(filters.subject_id);
      params.push(filters.education);

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

  // =================================================================
  // REFERENCE DATA MANAGEMENT (CRUD)
  // =================================================================

  // --- 1. CLASSES (Read Only as requested, or add others if needed) ---
  async getAllClasses() {
    const query = 'SELECT id, name, cycle FROM ref_class_levels ORDER BY id ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  // --- 2. SERIES (ref_series) ---
  async getAllSeries() {
    const query = `
      SELECT s.id, s.code, s.name, s.education_type_id, e.name AS education_type_name 
      FROM ref_series s
      LEFT JOIN ref_education_types e ON s.education_type_id = e.id
      ORDER BY s.code ASC
    `;
    const [rows] = await db.query(query);
    return rows;
  }

  async createSeries(data) {
    const { code, name, education_type_id } = data;
    const [result] = await db.query(
      'INSERT INTO ref_series (code, name, education_type_id) VALUES (?, ?, ?)',
      [code, name, education_type_id]
    );
    return { id: result.insertId, ...data };
  }

  async updateSeries(id, data) {
    const { code, name, education_type_id } = data;
    const [result] = await db.query(
      'UPDATE ref_series SET code = ?, name = ?, education_type_id = ? WHERE id = ?',
      [code, name, education_type_id, id]
    );
    return result.affectedRows > 0;
  }

  async deleteSeries(id) {
    const [result] = await db.query('DELETE FROM ref_series WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- 3. SUBJECTS (ref_subjects) ---
  async getAllSubjects() {
    const query = 'SELECT id, code, name, domain_id FROM ref_subjects ORDER BY name ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  async createSubject(data) {
    const { code, name, domain_id } = data;
    const [result] = await db.query(
      'INSERT INTO ref_subjects (code, name, domain_id) VALUES (?, ?, ?)',
      [code, name, domain_id]
    );
    return { id: result.insertId, ...data };
  }

  async updateSubject(id, data) {
    const { code, name, domain_id } = data;
    const [result] = await db.query(
      'UPDATE ref_subjects SET code = ?, name = ?, domain_id = ? WHERE id = ?',
      [code, name, domain_id, id]
    );
    return result.affectedRows > 0;
  }

  async deleteSubject(id) {
    const [result] = await db.query('DELETE FROM ref_subjects WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- 4. SUBJECT GROUPS (ref_subject_groups) ---
  async getAllSubjectGroups() {
    const query = 'SELECT * FROM ref_subject_groups ORDER BY name ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  // --- 4. SUBJECT GROUPS (ref_subject_groups) ---
  async getAllTypesOfEducation() {
    const query = 'SELECT * FROM ref_education_types ORDER BY name ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  async createSubjectGroup(data) {
    // Assuming columns: name
    const { name, code } = data; // Assuming code might exist based on other tables
    const [result] = await db.query(
      'INSERT INTO ref_subject_groups (name, code) VALUES (?, ?)',
      [name, code]
    );
    return { id: result.insertId, ...data };
  }

  async updateSubjectGroup(id, data) {
    const { name, code } = data;
    const [result] = await db.query(
      'UPDATE ref_subject_groups SET name = ?, code = ? WHERE id = ?',
      [name, code, id]
    );
    return result.affectedRows > 0;
  }

  async deleteSubjectGroup(id) {
    const [result] = await db.query('DELETE FROM ref_subject_groups WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- 5. TEACHING DOMAINS (ref_teaching_domains) ---
  async getAllDomains() {
    const query = `
      SELECT d.id, d.name, d.subsystem_id, d.groupe_id, s.name AS subsystem_name
      FROM ref_teaching_domains d
      LEFT JOIN ref_subsystems s ON d.subsystem_id = s.id
      ORDER BY d.name ASC
    `;
    const [rows] = await db.query(query);
    return rows;
  }

  async createTeachingDomain(data) {
    const { name, subsystem_id, groupe_id } = data;
    const [result] = await db.query(
      'INSERT INTO ref_teaching_domains (name, subsystem_id, groupe_id) VALUES (?, ?, ?)',
      [name, subsystem_id, groupe_id]
    );
    return { id: result.insertId, ...data };
  }

  async updateTeachingDomain(id, data) {
    const { name, subsystem_id, groupe_id } = data;
    const [result] = await db.query(
      'UPDATE ref_teaching_domains SET name = ?, subsystem_id = ?, groupe_id = ? WHERE id = ?',
      [name, subsystem_id, groupe_id, id]
    );
    return result.affectedRows > 0;
  }

  async deleteTeachingDomain(id) {
    const [result] = await db.query('DELETE FROM ref_teaching_domains WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- 6. GRADES (ref_grades) ---
  // Note: Primary Key is 'grade_code' (String)
  async getAllGrades() {
    const query = 'SELECT * FROM ref_grades ORDER BY grade_code ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  async createGrade(data) {
    const { grade_code, name, base_weekly_hours } = data;
    await db.query(
      'INSERT INTO ref_grades (grade_code, name, base_weekly_hours) VALUES (?, ?, ?)',
      [grade_code, name, base_weekly_hours]
    );
    return data;
  }

  async updateGrade(id, data) {
    // id here is the OLD grade_code
    const { grade_code, name, base_weekly_hours } = data;
    const [result] = await db.query(
      'UPDATE ref_grades SET grade_code = ?, name = ?, base_weekly_hours = ? WHERE grade_code = ?',
      [grade_code, name, base_weekly_hours, id]
    );
    return result.affectedRows > 0;
  }

  async deleteGrade(id) {
    // id here is grade_code
    const [result] = await db.query('DELETE FROM ref_grades WHERE grade_code = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- 7. ADMIN POSITIONS ---
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


  // --- NETWORK GENERATION LOGIC ---

  async generateNetworks() {
    await db.query('CALL sp_GenerateAllNetworks()');
    return this.getAllNetworks();
  }

  async getAllNetworks(filters = {}) {
    let query = `
      SELECT n.*, d.name as domain_name, et.name as education_type
      FROM school_networks n
      JOIN ref_teaching_domains d ON n.teaching_domain_id = d.id
      JOIN ref_education_types et ON n.education_type_id = et.id
    `;
    const params = [];
    const conditions = [];

    // Filter by Domain
    if (filters.teaching_domain_id) {
      conditions.push('n.teaching_domain_id = ?');
      params.push(filters.teaching_domain_id);
    }

    // Search by Network Name
    if (filters.search) {
      conditions.push('n.name LIKE ?');
      params.push(`%${filters.search}%`);
    }

    // Search by type of education 
    if (filters.education_type_id) {
      conditions.push('n.education_type_id = ?');
      params.push(filters.education_type_id);
    }

    // Advanced: Find networks containing a specific school (by name)
    if (filters.school_name) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM school_network_members m
          JOIN schools s ON m.school_id = s.id
          WHERE m.network_id = n.id AND s.name LIKE ?
        )
      `);
      params.push(`%${filters.school_name}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY n.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  async getNetworkDetails(networkId) {
    // 1. Get Network Header
    const [networkRows] = await db.query(`
      SELECT n.*, d.name as domain_name, et.name as education_type
      FROM school_networks n
      JOIN ref_teaching_domains d ON n.teaching_domain_id = d.id
      JOIN ref_education_types et ON n.education_type_id = et.id
      WHERE n.id = ?
    `, [networkId]);
    
    if (networkRows.length === 0) return null;
    const network = networkRows[0];

    // 2. Get Members (Schools) - Including LAT/LONG for Map Visualization
    const [members] = await db.query(`
      SELECT 
        snm.*, 
        s.name as school_name, 
        s.code, 
        s.region, 
        s.division,
        s.latitude,
        s.longitude
      FROM school_network_members snm
      JOIN schools s ON snm.school_id = s.id
      WHERE snm.network_id = ?
      ORDER BY snm.hours_available DESC
    `, [networkId]);

    // Return structured object
    return {
      ...network,
      members
    };
  }
}

module.exports = new SchoolService();