-- This file is for documentation purposes only.
-- It defines the expected schema and stored procedures.

-- Table: schools
CREATE TABLE IF NOT EXISTS schools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100) NOT NULL,
  division VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: school_structure_inputs
CREATE TABLE IF NOT EXISTS school_structure_inputs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  class_level_id INT NOT NULL,
  series_id INT NOT NULL,
  number_of_divisions INT NOT NULL, -- Multiplier for calculating total pedagogic load
  UNIQUE KEY unique_structure (school_id, class_level_id, series_id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table: curriculum_matrix
CREATE TABLE IF NOT EXISTS curriculum_matrix (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_level_id INT NOT NULL,
  series_id INT NOT NULL,
  subject_id INT NOT NULL,
  weekly_hours INT NOT NULL,
  UNIQUE KEY unique_curriculum (class_level_id, series_id, subject_id)
);

-- Table: personnel
CREATE TABLE IF NOT EXISTS personnel (
  matricule VARCHAR(50) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  grade_code VARCHAR(50),
  teaching_domain_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: personnel_postings
CREATE TABLE IF NOT EXISTS personnel_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personnel_matricule VARCHAR(50) NOT NULL,
  school_id INT NOT NULL,
  admin_position_code VARCHAR(50), -- Nullable if just a teacher
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE DEFAULT (CURRENT_DATE),
  end_date DATE,
  FOREIGN KEY (personnel_matricule) REFERENCES personnel(matricule),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Stored Procedure: sp_GetSchoolBalanceReport
-- Usage: CALL sp_GetSchoolBalanceReport(school_id);
-- Expected Result Columns: domain_name, hours_needed, hours_available, balance, status
-- Logic:
-- 1. Calculate Needs: Sum(curriculum_matrix.weekly_hours * school_structure_inputs.number_of_divisions) grouped by teaching domain.
-- 2. Calculate Availability: Sum(personnel obligations based on grade/admin_position) for active personnel in that school.
-- 3. Balance = Available - Needed.
-- 4. Status = IF(Balance < 0, 'DEFICIT (BESOIN)', 'EXCESS (PLETHORE)') ... or similar logic.

DELIMITER //
CREATE PROCEDURE sp_GetSchoolBalanceReport(IN schoolId INT)
BEGIN
  -- Implementation hidden/abstracted as per instructions.
  -- Returns:
  -- SELECT domain_name, hours_needed, hours_available, balance, status FROM calculated_table;
END //
DELIMITER ;
