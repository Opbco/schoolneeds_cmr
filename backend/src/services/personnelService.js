const db = require('../config/db');

class PersonnelService {
  async getAllPersonnel(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.matricule, p.full_name, p.date_of_birth, p.grade_code, p.status_code,
             p.teaching_domain_id,
             d.name AS domain_name, 
             s.name AS school_name, 
             pp.admin_position_code,
             st.name as status_name,
             st.is_active_for_capacity,
             pp.start_date,
             pp.is_active
      FROM personnel p 
      JOIN ref_teaching_domains d ON p.teaching_domain_id = d.id 
      LEFT JOIN ref_personnel_status st ON p.status_code = st.code
      LEFT JOIN personnel_postings pp ON p.matricule = pp.personnel_matricule AND pp.is_active = 1
      LEFT JOIN schools s ON pp.school_id = s.id
    `;

    const conditions = [];
    const params = [];

    if (filters.matricule) {
      conditions.push('p.matricule LIKE ?');
      params.push(`%${filters.matricule}%`);
    }
    if (filters.full_name) {
      conditions.push('p.full_name LIKE ?');
      params.push(`%${filters.full_name}%`);
    }
    if (filters.grade_code) {
      conditions.push('p.grade_code = ?');
      params.push(filters.grade_code);
    }
    if (filters.teaching_domain_id) {
      conditions.push('p.teaching_domain_id = ?');
      params.push(filters.teaching_domain_id);
    }
    if (filters.status_code) {
      conditions.push('p.status_code = ?');
      params.push(filters.status_code);
    }
    if (filters.school_id) {
      conditions.push('pp.school_id = ?');
      params.push(filters.school_id);
    }

    if(filters.admin_position_code){
      conditions.push('pp.admin_position_code = ?');
      params.push(filters.admin_position_code);
    }

    // Retirement Logic
    if (filters.retirement_status === 'RETIRED_BUT_ACTIVE') {
      // Age >= 60 but status is still 'ACTIVE'
      conditions.push("TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) >= 60 AND p.status_code = 'ACTIVE'");
    } else if (filters.retirement_status === 'RETIRING_THIS_YEAR') {
      // Will turn 60 this year
      conditions.push("YEAR(p.date_of_birth) = YEAR(CURDATE()) - 60");
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Pagination
    const countQuery = `SELECT COUNT(*) as total FROM personnel p 
                        LEFT JOIN personnel_postings pp ON p.matricule = pp.personnel_matricule AND pp.is_active = 1 
                        ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    
    query += ' ORDER BY p.full_name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, params.slice(0, -2)); // Remove limit/offset for count
    const total = countResult[0].total;

    return {
      data: rows,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createPersonnel(personnelData) {
    const { matricule, full_name, date_of_birth, grade_code, teaching_domain_id } = personnelData;
    const query = `
      INSERT INTO personnel (matricule, full_name, date_of_birth, grade_code, teaching_domain_id, status_code)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `;
    await db.query(query, [matricule, full_name, date_of_birth || null, grade_code, teaching_domain_id]);
    return personnelData;
  }

  async updatePersonnel(matricule, data) {
    const fields = [];
    const params = [];

    if (data.full_name) { fields.push('full_name = ?'); params.push(data.full_name); }
    if (data.date_of_birth !== undefined) { fields.push('date_of_birth = ?'); params.push(data.date_of_birth); }
    if (data.grade_code) { fields.push('grade_code = ?'); params.push(data.grade_code); }
    if (data.teaching_domain_id) { fields.push('teaching_domain_id = ?'); params.push(data.teaching_domain_id); }
    if (data.status_code) { fields.push('status_code = ?'); params.push(data.status_code); }

    if (fields.length === 0) return false;

    params.push(matricule);
    const query = `UPDATE personnel SET ${fields.join(', ')} WHERE matricule = ?`;
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  }

  async transferPersonnel(transferData) {
    const { personnel_matricule, new_school_id, admin_position_code } = transferData;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Deactivate old active posting
      const deactivateQuery = `
        UPDATE personnel_postings 
        SET is_active = FALSE, end_date = CURRENT_DATE 
        WHERE personnel_matricule = ? AND is_active = TRUE
      `;
      await connection.query(deactivateQuery, [personnel_matricule]);

      // 2. Insert new active posting
      const insertQuery = `
        INSERT INTO personnel_postings (personnel_matricule, school_id, admin_position_code, is_active, start_date)
        VALUES (?, ?, ?, TRUE, CURRENT_DATE)
      `;
      const [result] = await connection.query(insertQuery, [personnel_matricule, new_school_id, admin_position_code || null]);

      await connection.commit();
      return { 
        id: result.insertId, 
        personnel_matricule, 
        school_id: new_school_id, 
        is_active: true,
        message: 'Transfer successful' 
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getRetirementStats() {
    const query = `
      SELECT 
        SUM(CASE WHEN YEAR(date_of_birth) = YEAR(CURDATE()) - 60 THEN 1 ELSE 0 END) as retiring_this_year,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 60 AND status_code = 'ACTIVE' THEN 1 ELSE 0 END) as overdue_retirement,
        SUM(CASE WHEN status_code = 'ABANDONED' THEN 1 ELSE 0 END) as abandonned
      FROM personnel
    `;
    const [rows] = await db.query(query);
    return rows[0];
  }

  async getAllStatuses() {
    const [rows] = await db.query('SELECT * FROM ref_personnel_status');
    return rows;
  }
}

module.exports = new PersonnelService();