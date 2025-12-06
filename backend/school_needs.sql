-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Dec 04, 2025 at 11:04 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `school_needs`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CalculateCapacity` (IN `p_school_id` INT, IN `p_domain_id` INT, OUT `p_total_hours_available` INT)   BEGIN
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN post.admin_position_code IS NOT NULL THEN adm.max_teaching_hours
                ELSE grd.base_weekly_hours 
            END
        ), 0)
    INTO p_total_hours_available
    FROM personnel_postings post
    JOIN personnel pers ON post.personnel_matricule = pers.matricule
    JOIN ref_grades grd ON pers.grade_code = grd.grade_code
    JOIN ref_personnel_status stat ON pers.status_code = stat.code -- Join Status
    LEFT JOIN ref_admin_positions adm ON post.admin_position_code = adm.position_code
    WHERE post.school_id = p_school_id
      AND pers.teaching_domain_id = p_domain_id
      AND post.is_active = TRUE
      AND stat.is_active_for_capacity = TRUE; -- CRITICAL: Only count active staff
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CalculateNeed` (IN `p_school_id` INT, IN `p_domain_id` INT, OUT `p_total_hours_needed` INT)   BEGIN
    SELECT 
        COALESCE(SUM(struct.number_of_divisions * curr.weekly_hours), 0)
    INTO p_total_hours_needed
    FROM school_structure_inputs struct
    JOIN curriculum_matrix curr 
        ON struct.class_level_id = curr.class_level_id 
        AND struct.series_id = curr.series_id
    JOIN ref_subjects subj 
        ON curr.subject_id = subj.id
    WHERE struct.school_id = p_school_id
      AND subj.domain_id = p_domain_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_GetSchoolBalanceReport` (IN `p_school_id` INT)   BEGIN
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_balance_report (
        domain_name VARCHAR(100),
        hours_needed INT,
        hours_available INT,
        balance INT,
        status VARCHAR(20)
    );
    
    TRUNCATE TABLE temp_balance_report;

    INSERT INTO temp_balance_report (domain_name, hours_needed, hours_available, balance, status)
    SELECT 
        d.name,
        -- Need
        (SELECT COALESCE(SUM(s.number_of_divisions * c.weekly_hours), 0)
         FROM school_structure_inputs s
         JOIN curriculum_matrix c ON s.class_level_id = c.class_level_id AND s.series_id = c.series_id
         JOIN ref_subjects sub ON c.subject_id = sub.id
         WHERE s.school_id = p_school_id AND sub.domain_id = d.id
        ) as needed,
        
        -- Capacity (Updated with Status Check)
        (SELECT COALESCE(SUM(
            CASE WHEN post.admin_position_code IS NOT NULL THEN adm.max_teaching_hours
            ELSE grd.base_weekly_hours END
         ), 0)
         FROM personnel_postings post
         JOIN personnel pers ON post.personnel_matricule = pers.matricule
         JOIN ref_grades grd ON pers.grade_code = grd.grade_code
         JOIN ref_personnel_status stat ON pers.status_code = stat.code -- Status Check
         LEFT JOIN ref_admin_positions adm ON post.admin_position_code = adm.position_code
         WHERE post.school_id = p_school_id 
           AND pers.teaching_domain_id = d.id 
           AND post.is_active = TRUE
           AND stat.is_active_for_capacity = TRUE -- Only active
        ) as available,
        0, ''
    FROM ref_teaching_domains d;

    UPDATE temp_balance_report SET balance = hours_available - hours_needed;

    UPDATE temp_balance_report 
    SET status = CASE 
        WHEN balance < 0 THEN 'DEFICIT (BESOIN)'
        WHEN balance > 0 THEN 'EXCESS (PLETHORE)'
        ELSE 'BALANCED'
    END;

    SELECT * FROM temp_balance_report WHERE hours_needed > 0 OR hours_available > 0;
    DROP TEMPORARY TABLE IF EXISTS temp_balance_report;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `curriculum_matrix`
--

CREATE TABLE `curriculum_matrix` (
  `id` int(11) NOT NULL,
  `class_level_id` int(11) NOT NULL,
  `series_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `weekly_hours` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `curriculum_matrix`
--

INSERT INTO `curriculum_matrix` (`id`, `class_level_id`, `series_id`, `subject_id`, `weekly_hours`) VALUES
(1, 25, 1, 3, 3),
(2, 26, 1, 3, 3),
(3, 27, 1, 3, 4),
(4, 28, 1, 3, 4),
(5, 29, 7, 3, 6);

-- --------------------------------------------------------

--
-- Stand-in structure for view `needs_report`
-- (See below for the actual view)
--
CREATE TABLE `needs_report` (
`school_id` int(11)
,`school_name` varchar(150)
,`region` varchar(50)
,`division` varchar(50)
,`teaching_domain_id` int(11)
,`domain_name` varchar(100)
,`hours_needed` decimal(42,0)
,`hours_available` decimal(32,0)
,`balance` decimal(43,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `personnel`
--

CREATE TABLE `personnel` (
  `matricule` varchar(20) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `grade_code` varchar(20) NOT NULL,
  `teaching_domain_id` int(11) NOT NULL,
  `status_code` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `personnel`
--

INSERT INTO `personnel` (`matricule`, `full_name`, `date_of_birth`, `grade_code`, `teaching_domain_id`, `status_code`) VALUES
('0774916L', 'VAILOUMOU Daniel', '1980-12-31', 'PCEG', 2, 'ACTIVE'),
('1043521M', 'Owono Philippe Brice', '1988-01-10', 'PLET', 4, 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `personnel_postings`
--

CREATE TABLE `personnel_postings` (
  `id` int(11) NOT NULL,
  `personnel_matricule` varchar(20) NOT NULL,
  `school_id` int(11) NOT NULL,
  `admin_position_code` varchar(20) DEFAULT NULL,
  `start_date` date NOT NULL DEFAULT current_timestamp(),
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `personnel_postings`
--

INSERT INTO `personnel_postings` (`id`, `personnel_matricule`, `school_id`, `admin_position_code`, `start_date`, `end_date`, `is_active`) VALUES
(1, '1043521M', 1, NULL, '2025-12-03', '2025-12-04', 0),
(2, '1043521M', 3, 'SG', '2025-12-04', '2025-12-04', 0),
(3, '1043521M', 3, 'CENSEUR', '2025-12-04', '2025-12-04', 0),
(4, '1043521M', 11, NULL, '2025-12-04', NULL, 1),
(5, '0774916L', 12, 'SG', '2025-12-04', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ref_admin_positions`
--

CREATE TABLE `ref_admin_positions` (
  `position_code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `max_teaching_hours` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_admin_positions`
--

INSERT INTO `ref_admin_positions` (`position_code`, `name`, `max_teaching_hours`) VALUES
('CENSEUR', 'Censeur/Vice-Principal', 10),
('PRINCIPAL', 'Principal/Proviseur', 4),
('SG', 'Surveillant Général', 14);

-- --------------------------------------------------------

--
-- Table structure for table `ref_class_levels`
--

CREATE TABLE `ref_class_levels` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `cycle` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_class_levels`
--

INSERT INTO `ref_class_levels` (`id`, `name`, `cycle`) VALUES
(10, 'Tle', 'Second Cycle'),
(11, 'Form 1', 'First Cycle'),
(12, 'Form 2', 'First Cycle'),
(13, 'Form 3', 'First Cycle'),
(14, 'Form 4', 'First Cycle'),
(15, 'Form 5', 'First Cycle'),
(16, 'Lower 6', 'Second Cycle'),
(17, 'Upper 6', 'Second Cycle'),
(18, '1A', 'First Cycle'),
(19, '2A', 'First Cycle'),
(20, '3A', 'First Cycle'),
(21, '4A', 'First Cycle'),
(25, '6è', 'First Cycle'),
(26, '5è', 'First Cycle'),
(27, '4è', 'First Cycle'),
(28, '3è', 'First Cycle'),
(29, '2nde', 'Second Cycle'),
(31, '1ère', 'Second Cycle');

-- --------------------------------------------------------

--
-- Table structure for table `ref_education_types`
--

CREATE TABLE `ref_education_types` (
  `id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_education_types`
--

INSERT INTO `ref_education_types` (`id`, `code`, `name`) VALUES
(1, 'GEN', 'General'),
(2, 'TECH', 'Technical');

-- --------------------------------------------------------

--
-- Table structure for table `ref_grades`
--

CREATE TABLE `ref_grades` (
  `grade_code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `base_weekly_hours` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_grades`
--

INSERT INTO `ref_grades` (`grade_code`, `name`, `base_weekly_hours`) VALUES
('CO', 'Conseiller d\'Orientation', 30),
('IEG', 'Instituteur Enseignement Générale', 24),
('IET', 'Instituteur Enseignement Technique', 24),
('IJA', 'Inspecteur Jeux et Animations', 25),
('IPJA', 'Inspecteur Principal Jeux et Animations', 25),
('MEPS', 'Maître d’Éducation Physique et Sportive', 25),
('MPEPS', 'Maître Principal d’Éducation Physique et Sportive', 25),
('PAENI', 'Professeur Adjoint d’Écoles Normales d\'Instituteurs', 20),
('PAEPS', 'Professeur Adjoint d’Éducation Physique et Sportive', 20),
('PCEG', 'Professeur des Collèges', 22),
('PCET', 'Professeur des Collèges Techniques', 22),
('PENI', 'Professeur d’Écoles Normales d\'Instituteurs', 18),
('PEPS', 'Professeur d’Éducation Physique et Sportive', 18),
('PLEG', 'Professeur des Lycées', 20),
('PLET', 'Professeur des Lycées Techniques', 20);

-- --------------------------------------------------------

--
-- Table structure for table `ref_personnel_status`
--

CREATE TABLE `ref_personnel_status` (
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `is_active_for_capacity` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_personnel_status`
--

INSERT INTO `ref_personnel_status` (`code`, `name`, `is_active_for_capacity`) VALUES
('ABANDONED', 'Abandonment of Post', 0),
('ACTIVE', 'Active Service', 1),
('DECEASED', 'Deceased', 0),
('MATERNITY', 'Maternity Leave', 0),
('RETIRED', 'Retired', 0),
('SICK_LEAVE', 'Sick Leave (Maladie)', 0),
('STUDY_LEAVE', 'Study Leave (Mise en Stage)', 0),
('SUSPENDED', 'Suspended', 0);

-- --------------------------------------------------------

--
-- Table structure for table `ref_school_types`
--

CREATE TABLE `ref_school_types` (
  `id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `subsystem_id` int(11) NOT NULL,
  `education_type_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_school_types`
--

INSERT INTO `ref_school_types` (`id`, `code`, `name`, `subsystem_id`, `education_type_id`) VALUES
(1, 'GSS', 'Government Secondary School', 1, 1),
(2, 'GTC', 'Government Technical College', 1, 2),
(3, 'GHS', 'Government High School', 1, 1),
(4, 'GBHS', 'Government Bilingual High School.', 3, 1),
(5, 'GTHS', 'Government Technical High School', 1, 2),
(6, 'GBTHS', 'Government Bilingual Technical High School', 3, 2),
(7, 'CES', 'Collège d\'Enseignement Général', 2, 1),
(8, 'CETIC', 'Collège d\'Enseignement Technique Industriel et Commercial', 2, 2),
(9, 'CBES', 'Collège Bilingue d\'Enseignement Général', 3, 1),
(10, 'LYGEN', 'Lycée Général', 2, 1),
(11, 'LYBIL', 'Lycée Bilingue', 3, 1),
(12, 'LYTEC', 'Lycée Technique', 2, 2),
(13, 'LTBIL', 'Lycée Technique Bilingue', 3, 2),
(14, 'GBSS', 'Government Bilingual Secondary College', 3, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ref_series`
--

CREATE TABLE `ref_series` (
  `id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `education_type_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_series`
--

INSERT INTO `ref_series` (`id`, `code`, `name`, `education_type_id`) VALUES
(1, 'GEN', 'General Education', 1),
(4, 'A', 'Lettres-Philo', 1),
(5, 'A4', 'Lettres-Langues (All/Esp)', 1),
(6, 'ABI', 'Lettres Bilingue', 1),
(7, 'C', 'Mathématiques et Physique', 1),
(8, 'D', 'Mathématiques et SVT', 1),
(9, 'E', 'Mathématiques et Technologie', 1),
(10, 'TI', 'Technologies de l\'Information', 1),
(11, 'ARTS', 'Arts', 1),
(12, 'SCIENCE', 'Science', 1),
(13, 'F1', 'Construction Mécanique', 2),
(14, 'F2', 'Electronique', 2),
(15, 'F3', 'Electrotechnique', 2),
(16, 'F4', 'Génie Civil', 2),
(17, 'F4-BA', 'Génie Civil - Béton Armé', 2),
(18, 'F4-TP', 'Génie Civil - Travaux Publics', 2),
(19, 'F5', 'Froid et Climatisation', 2),
(20, 'F8', 'Sciences et Techniques Médico-Sanitaires', 2),
(21, 'MA', 'Maçonnerie', 2),
(22, 'MEB', 'Menuiserie Ebanisterie', 2),
(23, 'MAV', 'Menuiserie Aluminium / Vitrerie', 2),
(24, 'MEM', 'Mécanique Entretien et Montage', 2),
(25, 'MV', 'Mécanique Automobile / Réparation', 2),
(26, 'EF', 'Exploitation Forestière', 2),
(27, 'CM', 'Construction Métallique', 2),
(28, 'CH', 'Charpente', 2),
(29, 'EL', 'Electricité d\'Equipement', 2),
(30, 'PL', 'Plomberie et Installation Sanitaire', 2),
(31, 'G1', 'Techniques Administratives', 2),
(32, 'G2', 'Techniques Quantitatives de Gestion', 2),
(33, 'G3', 'Techniques Commerciales', 2),
(34, 'ACA', 'Action Commerciale et Administrative', 2),
(35, 'ACC', 'Comptabilité et Gestion', 2),
(36, 'SES', 'Secrétariat et Bureautique', 2),
(37, 'ESF', 'Economie Sociale et Familiale', 2),
(38, 'IH', 'Industrie d\'Habillement', 2),
(39, 'HO', 'Hôtellerie', 2),
(40, 'TO', 'Tourisme', 2),
(41, 'IS', 'Infirmerie Scolaire', 2),
(59, 'TECH', 'TECH (Nombre de spécialités)', 2);

-- --------------------------------------------------------

--
-- Table structure for table `ref_subjects`
--

CREATE TABLE `ref_subjects` (
  `id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `domain_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_subjects`
--

INSERT INTO `ref_subjects` (`id`, `code`, `name`, `domain_id`) VALUES
(1, 'MATH_EN', 'Mathematics', 1),
(2, 'INFO_EN', 'Computer Sciences', 4),
(3, 'MATH_FR', 'Mathématiques', 2),
(4, 'CONST_BD', 'Building Construction', 3);

-- --------------------------------------------------------

--
-- Table structure for table `ref_subsystems`
--

CREATE TABLE `ref_subsystems` (
  `id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_subsystems`
--

INSERT INTO `ref_subsystems` (`id`, `code`, `name`) VALUES
(1, 'ANG', 'Anglophone'),
(2, 'FRA', 'Francophone'),
(3, 'BIL', 'Bilingue');

-- --------------------------------------------------------

--
-- Table structure for table `ref_teaching_domains`
--

CREATE TABLE `ref_teaching_domains` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `subsystem_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ref_teaching_domains`
--

INSERT INTO `ref_teaching_domains` (`id`, `name`, `subsystem_id`) VALUES
(1, 'Mathematics', 1),
(2, 'Mathématiques', 2),
(3, 'Civil Engineering', 1),
(4, 'Computer Sciences', 1),
(5, 'Informatique', 2);

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `id` int(11) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `school_type_id` int(11) NOT NULL,
  `region` varchar(50) DEFAULT 'Centre',
  `division` varchar(50) DEFAULT NULL,
  `sub_division` varchar(50) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `altitude` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`id`, `code`, `name`, `school_type_id`, `region`, `division`, `sub_division`, `latitude`, `longitude`, `altitude`) VALUES
(1, 'S00001', 'LYCEE DE OURO TCHEDE', 10, 'Extreme - Nord', 'Diamare', 'Maroua I', 10.58569190, 14.27314910, 423),
(2, 'S00002', 'LYCEE TECHNIQUE DE DOUALARE', 12, 'Extreme - Nord', 'Diamare', 'Maroua II', 10.64007810, 14.32499000, 427),
(3, 'S00003', 'LYCEE DE REY-BOUBA', 10, 'Nord', 'Mayo - Rey', 'Rey Bouba', 8.67279370, 14.17765490, 0),
(4, 'S00004', 'LYCEE TECHNIQUE DE REY BOUBA', 12, 'Nord', 'Mayo - Rey', 'Rey Bouba', 8.68684420, 14.17325180, 242917),
(5, 'S00005', 'LYCEE BILINGUE DE BOURHA', 11, 'Extreme - Nord', 'Mayo-Tsanaga', 'Bourha', 10.25802330, 13.51958830, 796),
(6, 'S00006', 'LYCEE DE BALAZA-ALCALI', 10, 'Extreme - Nord', 'Diamare', 'Maroua III', 10.69238240, 14.47600900, 370),
(7, 'S00007', 'LYCEE DE TCHEVI', 10, 'Extreme - Nord', 'Mayo-Tsanaga', 'Bourha', 10.16827700, 13.51446820, 841),
(8, 'S00008', 'LYCEE DE MESKINE', 10, 'Extreme - Nord', 'Diamare', 'Maroua I', 10.54757480, 14.24441530, 427),
(9, 'S00009', 'LYCEE BILINGUE DE BOUKOULA', 11, 'Extreme - Nord', 'Mayo-Tsanaga', 'Bourha', 10.13433000, 13.46790830, 940),
(10, 'S00010', 'CETIC DE MEME', 8, 'Extreme - Nord', 'Mayo-Sava', 'Mora', 10.97772000, 14.24398830, 448),
(11, 'S00011', 'LYCEE DE GAMBOURA', 10, 'Extreme - Nord', 'Mayo-Tsanaga', 'Bourha', 10.29725500, 13.64465830, 806),
(12, 'S00012', 'LYCEE BILINGUE DE MORA', 11, 'Extreme - Nord', 'Mayo-Sava', 'Mora', 11.05239330, 14.15390830, 436),
(13, 'S00013', 'LYCEE DE BERE', 10, 'Nord', 'Mayo - Rey', 'Rey Bouba', 9.02046280, 14.21763180, 356989),
(14, 'S00014', 'LYCEE DE BAIKWA', 10, 'Nord', 'Mayo - Rey', 'Rey Bouba', 9.07534070, 14.43279440, 400622),
(15, 'S00015', 'LYCEE DE DOBINGA', 10, 'Nord', 'Mayo - Rey', 'Rey Bouba', 8.99753080, 13.96340210, 307631),
(16, 'S00016', 'CETIC BAIKWA', 8, 'Nord', 'Mayo - Rey', 'Rey Bouba', 9.08481640, 14.40909690, 378923),
(17, 'S00017', 'LYCEE DE TOKOMBERE', 10, 'Extreme - Nord', 'Mayo-Sava', 'Tokombéré', 10.85941200, 14.14202550, 503),
(18, 'S00018', 'LYCEE BILINGUE DE BOGO', 11, 'Extreme - Nord', 'Diamare', 'Bogo', 10.73812500, 14.61485670, 365),
(19, 'S00019', 'CETIC DE OUAZZANG', 8, 'Extreme - Nord', 'Diamare', 'Meri', 10.67334480, 14.12099540, 548),
(20, 'S00020', 'LYCEE CLASSIQUE DE MORA', 10, 'Extreme - Nord', 'Mayo-Sava', 'Mora', 11.05312330, 14.12948830, 483),
(21, 'S00021', 'LYCEE BEKA-HOSSERE', 10, 'Adamaoua', 'Vina', 'Ngaoundéré I', 7.31098600, 13.55280710, 1150),
(22, 'S00022', 'LYCEE BILINGUE DE MAYO-BALEO', 11, 'Adamaoua', 'Faro - Et - Deo', 'Mayo Baléo', 7.66153320, 12.32761640, 603),
(23, 'S00023', 'LYCEE DE MOUTOURWA', 10, 'Extreme - Nord', 'Mayo-Kani', 'Moutourwa', 10.21457000, 14.17422500, 510),
(24, 'S00024', 'LYCEE BILINGUE DE MINDIF', 11, 'Extreme - Nord', 'Mayo-Kani', 'Mindif', 10.40305200, 14.44659150, 395),
(25, 'S00025', 'LYCEE DE GOR', 10, 'Nord', 'Mayo - Rey', 'Madinring', 8.63921330, 14.99287170, 512),
(26, 'S00026', 'CES DE MBAKANA', 7, 'Nord', 'Mayo - Rey', 'Touboro', 8.04652920, 15.13665120, 648),
(27, 'S00027', 'LYCEE CLASSIQUE ET MODERNE NGAOUNDERE', 10, 'Adamaoua', 'Vina', 'Ngaoundéré I', 7.31601420, 13.57500090, 1148),
(28, 'S00028', 'LYCEE DE LOKOTI', 10, 'Adamaoua', 'Mbere', 'Meiganga', 6.37900500, 14.31522670, 1045),
(29, 'S00029', 'LYCEE DE GABAN-LARA', 10, 'Extreme - Nord', 'Mayo-Kani', 'Kaélé', 10.22101330, 14.53951170, 416),
(30, 'S00030', 'LYCEE DE GOING-LARA', 10, 'Extreme - Nord', 'Mayo-Kani', 'Kaélé', 10.10054170, 14.54464670, 400),
(31, 'S00031', 'LYCEE BILINGUE DE BOBOYO', 11, 'Extreme - Nord', 'Mayo-Kani', 'Kaélé', 10.15160170, 14.42522670, 387),
(32, 'S00032', 'LYCEE DE MBAI-MBOUM', 10, 'Nord', 'Mayo - Rey', 'Touboro', 7.54663000, 15.42609170, 681),
(33, 'S00033', 'LYCEE BILINGUE DE TIGNERE', 11, 'Adamaoua', 'Faro - Et - Deo', 'Tignere', 7.36666310, 12.66515580, 1201),
(34, 'S00034', 'LYCEE DE KOURBI', 10, 'Extreme - Nord', 'Mayo-Kani', 'Guidiguis', 10.14462500, 14.62477670, 410),
(35, 'S00035', 'LYCEE BILINGUE DE KAELE', 11, 'Extreme - Nord', 'Mayo-Kani', 'Kaélé', 10.10461000, 14.44570330, 413),
(36, 'S00036', 'CETIC DE DIR', 8, 'Adamaoua', 'Mbere', 'Dir', 6.33260940, 13.52806280, 1005),
(37, 'S00037', 'LYCEE DE GAREY', 10, 'Extreme - Nord', 'Mayo-Kani', 'Kaélé', 10.03206330, 14.32102000, 391),
(38, 'S00038', 'LYCEE DE DOUBANE', 10, 'Extreme - Nord', 'Mayo-Kani', 'Guidiguis', 10.13766500, 14.77077830, 319),
(39, 'S00039', 'CES DE MANDAIGOUM', 7, 'Extreme - Nord', 'Mayo-Kani', 'Guidiguis', 10.07623060, 14.77614350, 389),
(40, 'S00040', 'LYCEE BILINGUE DE NGALBIDJE', 11, 'Nord', 'Benoue', 'Garoua I', 9.35239660, 13.38412050, 261),
(41, 'S00041', 'LYCEE DE GAROUA NASSARAO', 10, 'Nord', 'Benoue', 'Garoua I', 9.36539170, 13.43880220, 207),
(42, 'S00042', 'LYCEE BILINGUE DE GALIM-TIGNERE', 11, 'Adamaoua', 'Faro - Et - Deo', 'Galim-Tignere', 7.08698450, 12.48195930, 1009),
(43, 'S00043', 'LYCEE BILINGUE DE MAYO-OULO', 11, 'Nord', 'Mayo-Louti', 'Mayo-Oulo', 9.96855550, 13.60587290, 486),
(44, 'S00044', 'LYCEE DE DOUROUM', 10, 'Nord', 'Mayo-Louti', 'Guider', 10.09042330, 13.76070330, 462),
(45, 'S00045', 'LYCEE BILINGUE DE DOUMO', 11, 'Nord', 'Mayo-Louti', 'Mayo-Oulo', 10.07597900, 13.31090600, 0),
(46, 'S00046', 'CES MIKILA', 7, 'Adamaoua', 'Mbere', 'Meiganga', 6.71768860, 14.46520490, 1178),
(47, 'S00047', 'LYCEE BILINGUE DE DJOHONG', 11, 'Adamaoua', 'Mbere', 'Djohong', 6.82900680, 14.69786940, 1266),
(48, 'S00048', 'LYCEE DE DJAMBOUTOU GUIDER', 10, 'Nord', 'Mayo-Louti', 'Guider', 9.85052210, 13.91918150, 368),
(49, 'S00049', 'LYCEE DE MENG', 10, 'Adamaoua', 'Djerem', 'Tibati', 6.50168990, 12.59384320, 799),
(50, 'S00050', 'LYCEE BILINGUE DE GAROUA', 11, 'Nord', 'Benoue', 'Garoua I', 9.32477330, 13.40429830, 207),
(51, 'S00051', 'CES YARMBANG', 7, 'Adamaoua', 'Mbere', 'Djohong', 7.00847500, 14.96317670, 1290),
(52, 'S00052', 'LYCEE DE FIGNOLE', 10, 'Nord', 'Faro', 'Poli', 8.57378000, 13.10616000, 312),
(53, 'S00053', 'LYCEE DE POLI', 10, 'Nord', 'Faro', 'Poli', 8.48325530, 13.23299040, 500),
(54, 'S00054', 'LYCEE DE BOUMBA', 10, 'Nord', 'Faro', 'Poli', 8.48117330, 13.37575670, 493),
(55, 'S00055', 'LYCEE BILINGUE DE SAKDJE', 11, 'Nord', 'Mayo - Rey', 'Tcholliré', 8.28362670, 13.65036000, 425),
(56, 'S00056', 'CETIC DE DJABA', 8, 'Nord', 'Mayo - Rey', 'Tcholliré', 8.37437170, 13.70379120, 387),
(57, 'S00057', 'LYCEE BILINGUE DE NGONG', 11, 'Nord', 'Benoue', 'Tchéboa', 9.04520900, 13.49946270, 353),
(58, 'S00058', 'LYCEE DE TCHAMBA', 10, 'Nord', 'Faro', 'Béka', 9.01588500, 13.50799170, 326),
(59, 'S00059', 'LYCEE DE BLANGOUA', 10, 'Extreme - Nord', 'Logone - Et - Chari', 'Blangoua', 12.76730830, 14.55268670, 303),
(60, 'S00060', 'LYCEE BILINGUE DE MANDAMA', 11, 'Nord', 'Mayo-Louti', 'Mayo-Oulo', 10.13318660, 13.70581300, 548),
(61, 'S00061', 'LYCEE BILINGUE DE NGAOUNDAL', 11, 'Adamaoua', 'Djerem', 'Ngaoundal', 6.49625760, 13.26390890, 890),
(62, 'S00062', 'LYCEE DE GUIDIGUIS', 10, 'Extreme - Nord', 'Mayo-Kani', 'Guidiguis', 10.12309020, 14.71508590, 388),
(63, 'S00063', 'LYCEE DE KAKALA', 10, 'Nord', 'Mayo-Louti', 'Guider', 9.71867520, 13.84354520, 0),
(64, 'S00064', 'LYCEE DE DOUBEYE', 10, 'Nord', 'Mayo-Louti', 'Mayo-Oulo', 9.99701760, 13.52499850, 527),
(65, 'S00065', 'LYCEE DE NGAOUI', 10, 'Adamaoua', 'Mbere', 'Ngaoui', 6.74776810, 14.94480270, 1265),
(66, 'S00066', 'LYCEE DE NGAOUNDAL', 10, 'Adamaoua', 'Djerem', 'Ngaoundal', 6.47338290, 13.28352570, 956),
(67, 'S00067', 'LYCEE DE TCHATIBALI', 10, 'Extreme - Nord', 'Mayo-Danay', 'Tchatibali', 10.03444100, 14.92591520, 368),
(68, 'S00068', 'LYCEE BILINGUE DE TOULOUM', 11, 'Extreme - Nord', 'Mayo-Kani', 'Porhi', 10.17668310, 14.83043540, 364),
(69, 'S00069', 'LYCEE DE GUIRVIDIG', 10, 'Extreme - Nord', 'Mayo-Danay', 'Maga', 10.89694500, 14.83341170, 292),
(70, 'S00070', 'LYCEE DE BIZILI', 10, 'Extreme - Nord', 'Mayo-Kani', 'Porhi', 10.23088780, 14.86271180, 342),
(71, 'S00071', 'LYCEE DE ZOUAYE', 10, 'Extreme - Nord', 'Mayo-Danay', 'Datcheka', 10.01514350, 15.02893970, 371),
(72, 'S00072', 'LYCEE BILINGUE DE MAGA', 11, 'Extreme - Nord', 'Mayo-Danay', 'Maga', 10.84890170, 14.94425170, 363),
(73, 'S00073', 'LYCEE DE GOUNDAYE', 10, 'Extreme - Nord', 'Mayo-Kani', 'Taibong', 10.02774510, 14.68905160, 386),
(74, 'S00074', 'CETIC DE KALFOU', 8, 'Extreme - Nord', 'Mayo-Danay', 'Kalfou', 10.27663500, 14.92224320, 342),
(75, 'S00075', 'LYCEE CLASSIQUE ET MODERNE DE YAGOUA', 10, 'Extreme - Nord', 'Mayo-Danay', 'Yagoua', 10.33121270, 15.25403730, 335),
(76, 'S00076', 'LYCEE DE DOREISSOU', 10, 'Extreme - Nord', 'Mayo-Danay', 'Kaé-Kaé', 10.54878500, 15.14177330, 362),
(77, 'S00077', 'LYCEE DE DOUKOULA', 10, 'Extreme - Nord', 'Mayo-Danay', 'Kar-Hay', 10.13456860, 14.96696760, 356),
(78, 'S00078', 'LYCEE BILINGUE DE DATCHEKA', 11, 'Extreme - Nord', 'Mayo-Danay', 'Datcheka', 10.01301620, 15.10691140, 345),
(79, 'S00079', 'LYCEE DE BEGUE-PALAM', 10, 'Extreme - Nord', 'Mayo-Danay', 'Kaé-Kaé', 10.67760100, 15.12059220, 336),
(80, 'S00080', 'LYCEE TECHNIQUE DE DATCHEKA', 12, 'Extreme - Nord', 'Mayo-Danay', 'Datcheka', 9.99243010, 15.11096960, 354),
(81, 'S00081', 'LYCEE BILINGUE DE GOBO', 11, 'Extreme - Nord', 'Mayo-Danay', 'Gobo', 10.00114830, 15.43080170, 335),
(82, 'S00082', 'LYCEE TECHNIQUE BILINGUE DE YAGOUA', 11, 'Extreme - Nord', 'Mayo-Danay', 'Yagoua', 10.35304720, 15.23630230, 348),
(83, 'S00083', 'LYCEE BILINGUE DE YAGOUA', 11, 'Extreme - Nord', 'Mayo-Danay', 'Yagoua', 10.35111700, 15.23574340, 344),
(84, 'S00084', 'LYCEE DE BARLANG', 10, 'Extreme - Nord', 'Mayo-Kani', 'Taibong', 10.06306170, 14.84234500, 368),
(85, 'S00085', 'LYCEE BILINGUE DE KAI-KAI', 11, 'Extreme - Nord', 'Mayo-Danay', 'Kaé-Kaé', 10.66786850, 15.02225740, 333),
(86, 'S00086', 'LYCEE BILINGUE DE DJONGDONG', 11, 'Extreme - Nord', 'Mayo-Danay', 'Wina', 10.08912890, 15.19328970, 352),
(87, 'S00087', 'LYCEE DE GOULFEY', 10, 'Extreme - Nord', 'Logone - Et - Chari', 'Goulfey', 12.36536190, 14.89632050, 304),
(88, 'S00088', 'LYCEE BILINGUE DE FIGUIL', 11, 'Nord', 'Mayo-Louti', 'Figuil', 9.35091160, 13.41143020, 200),
(89, 'S00089', 'LYCEE DE DADJAMKA', 10, 'Extreme - Nord', 'Mayo-Danay', 'Kar-Hay', 10.05577670, 14.97989330, 356),
(90, 'S00090', 'LYCEE BILINGUE DE BANYO', 11, 'Adamaoua', 'Mayo-Banyo', 'Banyo', 6.75612580, 11.80569130, 1118),
(91, 'S00091', 'LYCEE DE HOUGNO', 10, 'Extreme - Nord', 'Mayo-Danay', 'Wina', 10.05359170, 15.16648170, 336),
(92, 'S00092', 'LYCEE BILINGUE DE TOUBORO', 11, 'Nord', 'Mayo - Rey', 'Touboro', 7.75998950, 15.33993580, 489249),
(93, 'S00093', 'LYCEE DE VOGZOM', 10, 'Nord', 'Mayo - Rey', 'Touboro', 7.76664940, 14.65777810, 627),
(94, 'S00094', 'CETIC VOGZOM', 8, 'Nord', 'Mayo - Rey', 'Touboro', 7.78014370, 14.66256010, 617728),
(95, 'S00095', 'LYCEE BILINGUE DE TCHOLLIRE', 11, 'Nord', 'Mayo - Rey', 'Tcholliré', 8.40157710, 14.17975040, 383438),
(96, 'S00096', 'LYCEE DE BEKA', 10, 'Nord', 'Faro', 'Béka', 9.30938230, 13.37046110, 250),
(97, 'S00097', 'LYCEE TECHNIQUE DE MADINGRING', 12, 'Nord', 'Mayo - Rey', 'Madinring', 9.30926210, 13.37046780, 250),
(98, 'S00098', 'LYCEE DE MADINGRING', 10, 'Nord', 'Mayo - Rey', 'Madinring', 9.30946870, 13.37055680, 250),
(99, 'S00099', 'LYCEE BANYO', 10, 'Adamaoua', 'Mayo-Banyo', 'Banyo', 6.75315240, 11.82325720, 1128),
(100, 'S00100', 'CES DE DANAY DIGUISSI', 7, 'Extreme - Nord', 'Mayo-Danay', 'Yagoua', 10.35955280, 15.17351710, 346),
(101, 'S00101', 'LYCEE DE MOUSGOY', 10, 'Nord', 'Mayo-Louti', 'Guider', 10.16153320, 13.89918090, 495),
(102, 'S00102', 'LYCEE DE ZEBE', 10, 'Extreme - Nord', 'Mayo-Danay', 'Yagoua', 10.31061300, 15.28676510, 347),
(103, 'S00103', 'LYCEE DE BIDZAR', 10, 'Nord', 'Mayo-Louti', 'Figuil', 9.35094820, 13.41136180, 208),
(104, 'S00104', 'LYCEE DE PITOA', 10, 'Nord', 'Benoue', 'Pitoa', 9.39949060, 13.51299890, 225),
(105, 'S00105', 'LYCEE BILINGUE DE LAM', 11, 'Nord', 'Mayo-Louti', 'Figuil', 9.35089610, 13.41140340, 207),
(106, 'S00106', 'LYCEE BILINGUE DE MAYO-DARLE', 11, 'Adamaoua', 'Mayo-Banyo', 'Mayo Darle', 6.51510810, 11.55349120, 1226),
(107, 'S00107', 'LYCEE BILINGUE DE KALFOU', 11, 'Extreme - Nord', 'Mayo-Danay', 'Kalfou', 10.28718890, 14.93692450, 356),
(108, 'S00108', 'CETIC DE SONGKOLONG', 8, 'Adamaoua', 'Mayo-Banyo', 'Bankim', 6.41446070, 11.32600040, 790),
(109, 'S00109', 'LYCEE BILINGUE DE SOMIE', 11, 'Adamaoua', 'Mayo-Banyo', 'Bankim', 6.44783050, 11.43198430, 778),
(110, 'S00110', 'LYCEE BATOUA GODOLE', 10, 'Adamaoua', 'Mbere', 'Meiganga', 6.32935500, 14.72710670, 1083),
(111, 'S00111', 'LYCEE BILINGUE DE MEIGANGA', 11, 'Adamaoua', 'Mbere', 'Meiganga', 6.52859660, 14.29920000, 1039),
(112, 'S00112', 'CES YAMBA', 7, 'Adamaoua', 'Mbere', 'Djohong', 7.10370840, 15.20637490, 1010),
(113, 'S00113', 'LYCEE DE MOGOM KAR-HAY', 10, 'Extreme - Nord', 'Mayo-Danay', 'Kar-Hay', 10.18579550, 14.94595700, 344),
(114, 'S00114', 'LYCEE BILINGUE DE ATTA', 11, 'Adamaoua', 'Mayo-Banyo', 'Bankim', 6.46353920, 11.29859700, 854),
(115, 'S00115', 'LYCEE BILINGUE DE GUERE', 11, 'Extreme - Nord', 'Mayo-Danay', 'Guere', 10.02292170, 15.25860670, 323),
(116, 'S00116', 'LYCEE DE DANA', 10, 'Extreme - Nord', 'Mayo-Danay', 'Yagoua', 10.23832670, 15.28466330, 357),
(117, 'S00117', 'LYCEE BILINGUE DE BANGANA', 11, 'Extreme - Nord', 'Mayo-Danay', 'Guere', 10.19507980, 15.32358210, 332),
(118, 'S00118', 'LYCEE DE LAKA', 10, 'Extreme - Nord', 'Logone - Et - Chari', 'Kousseri', 12.05503780, 15.05294640, 281),
(119, 'S00119', 'LYCEE D\'AMCHEDIRE', 10, 'Extreme - Nord', 'Logone - Et - Chari', 'Kousseri', 12.05124560, 15.02042860, 335),
(120, 'S00120', 'LYCEE BILINGUE DE KOUSSERI', 11, 'Extreme - Nord', 'Logone - Et - Chari', 'Kousseri', 12.08053180, 14.99390390, 321),
(121, 'S00121', 'LYCEE MIXTE DE KOUSSERI', 10, 'Extreme - Nord', 'Logone - Et - Chari', 'Kousseri', 12.09704400, 15.02900850, 309),
(122, 'S00122', 'LYCEE TECHNIQUE BILINGUE DE KOUSSERI', 11, 'Extreme - Nord', 'Logone - Et - Chari', 'Kousseri', 12.07260110, 15.03440180, 331),
(123, 'S00123', 'LYCEE DE ZOUELVA', 10, 'Extreme - Nord', 'Mayo-Sava', 'Mora', 10.97354670, 14.05108330, 772),
(124, 'S00124', 'LYCEE DE POUSS', 10, 'Extreme - Nord', 'Mayo-Danay', 'Maga', 10.85688800, 15.05688320, 311),
(125, 'S00125', 'LYCEE DE TEKELE', 10, 'Extreme - Nord', 'Mayo-Danay', 'Maga', 10.97690170, 15.02370830, 341),
(126, 'S00126', 'LYCEE TECHNIQUE DE NGAOUNDERE', 12, 'Adamaoua', 'Vina', 'Ngaoundéré II', NULL, NULL, NULL),
(127, 'S00127', 'LYCEE DE GAZAWA', 10, 'Extreme - Nord', 'Diamare', 'Gazawa', 10.53887350, 14.12837794, 471),
(128, 'S00128', 'LYCEE BILINGUE DE KOZA', 11, 'Extreme - Nord', 'Mayo-Tsanaga', 'Koza', 10.87958270, 13.88884390, 470),
(129, 'S00129', 'LYCEE CLASSIQUE DE MOKOLO', 10, 'Extreme - Nord', 'Mayo-Tsanaga', 'Mokolo', 10.73504670, 13.81600830, 828);

-- --------------------------------------------------------

--
-- Table structure for table `school_structure_inputs`
--

CREATE TABLE `school_structure_inputs` (
  `id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `class_level_id` int(11) NOT NULL,
  `series_id` int(11) NOT NULL,
  `number_of_divisions` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_structure_inputs`
--

INSERT INTO `school_structure_inputs` (`id`, `school_id`, `class_level_id`, `series_id`, `number_of_divisions`) VALUES
(1, 1, 25, 1, 2),
(2, 1, 26, 1, 2),
(3, 1, 27, 1, 4),
(4, 1, 28, 1, 4),
(5, 1, 29, 4, 5),
(6, 1, 29, 7, 1),
(7, 1, 31, 4, 5),
(8, 1, 31, 7, 1),
(10, 1, 10, 4, 5),
(11, 1, 10, 7, 1),
(12, 1, 10, 8, 1),
(13, 2, 18, 1, 4),
(14, 2, 19, 1, 4),
(15, 2, 20, 1, 4),
(16, 2, 21, 1, 4),
(17, 2, 29, 59, 5),
(35, 2, 31, 59, 5),
(36, 2, 10, 1, 4),
(37, 3, 25, 1, 3),
(38, 3, 26, 1, 3),
(39, 3, 27, 1, 3),
(40, 3, 28, 1, 3),
(41, 3, 29, 4, 3),
(42, 3, 29, 7, 1),
(43, 3, 31, 4, 3),
(44, 3, 31, 7, 1),
(45, 3, 31, 8, 1),
(46, 3, 10, 4, 3),
(47, 3, 10, 8, 1),
(48, 4, 18, 1, 3),
(49, 4, 19, 1, 3),
(50, 4, 20, 1, 3),
(51, 4, 21, 1, 3),
(52, 4, 29, 59, 3),
(53, 4, 31, 59, 3),
(54, 5, 25, 1, 3),
(55, 5, 26, 1, 3),
(56, 5, 27, 1, 4),
(57, 5, 28, 1, 4),
(58, 5, 29, 4, 3),
(59, 5, 29, 7, 1),
(60, 5, 31, 4, 3),
(61, 5, 31, 7, 1),
(62, 5, 31, 8, 1),
(63, 5, 10, 4, 3),
(64, 5, 10, 7, 1),
(65, 5, 10, 8, 1),
(66, 5, 11, 1, 2),
(67, 5, 12, 1, 2),
(68, 5, 13, 1, 2),
(69, 5, 14, 1, 2),
(70, 5, 15, 1, 1),
(71, 5, 16, 1, 1),
(72, 5, 17, 1, 1),
(73, 6, 25, 1, 2),
(74, 6, 26, 1, 2),
(75, 6, 27, 1, 4),
(76, 6, 28, 1, 4),
(77, 6, 29, 4, 4),
(78, 6, 29, 7, 1),
(79, 6, 31, 4, 4),
(80, 6, 31, 7, 1),
(81, 6, 31, 8, 1),
(82, 6, 10, 4, 3),
(83, 6, 10, 7, 1),
(84, 6, 10, 8, 1),
(85, 7, 25, 1, 2),
(86, 7, 26, 1, 2),
(87, 7, 27, 1, 2),
(88, 7, 28, 1, 2),
(89, 7, 29, 4, 2),
(90, 7, 29, 7, 1),
(91, 7, 31, 4, 2),
(92, 7, 31, 8, 1),
(93, 7, 10, 4, 2),
(94, 7, 10, 8, 1),
(95, 8, 25, 1, 2),
(96, 8, 26, 1, 2),
(97, 8, 27, 1, 4),
(98, 8, 28, 1, 4),
(99, 8, 29, 4, 4),
(100, 8, 29, 7, 1),
(101, 8, 31, 4, 4),
(102, 8, 31, 7, 1),
(103, 8, 31, 8, 1),
(104, 8, 10, 4, 4),
(105, 8, 10, 7, 1),
(106, 8, 10, 8, 1),
(108, 9, 25, 1, 2),
(109, 9, 26, 1, 2),
(110, 9, 27, 1, 3),
(111, 9, 28, 1, 3),
(112, 9, 29, 4, 3),
(113, 9, 29, 7, 1),
(115, 9, 31, 4, 3),
(116, 9, 31, 8, 1),
(117, 9, 10, 4, 3),
(118, 9, 10, 8, 1),
(119, 9, 11, 1, 2),
(120, 9, 12, 1, 1),
(121, 9, 13, 1, 1),
(122, 9, 14, 1, 2),
(123, 9, 15, 1, 2),
(124, 9, 16, 1, 1),
(125, 10, 25, 1, 4),
(126, 10, 26, 1, 4),
(127, 10, 27, 1, 4),
(128, 10, 28, 1, 3),
(129, 11, 25, 1, 2),
(130, 11, 26, 1, 2),
(131, 11, 27, 1, 2),
(132, 11, 28, 1, 2),
(133, 11, 29, 4, 2),
(134, 11, 29, 7, 1),
(135, 11, 31, 4, 2),
(136, 11, 31, 8, 1),
(137, 11, 10, 4, 2),
(138, 11, 10, 8, 1),
(139, 12, 25, 1, 3),
(140, 12, 26, 1, 3),
(141, 12, 27, 1, 3),
(142, 12, 28, 1, 3),
(143, 12, 29, 4, 2),
(144, 12, 29, 7, 1),
(145, 12, 31, 4, 3),
(146, 12, 31, 7, 1),
(147, 12, 31, 8, 1),
(148, 12, 10, 4, 3),
(149, 12, 10, 7, 1),
(150, 12, 10, 8, 1),
(151, 12, 11, 1, 2),
(152, 12, 12, 1, 2),
(153, 12, 13, 1, 2),
(154, 12, 14, 1, 2),
(155, 12, 15, 1, 2),
(156, 12, 16, 1, 2),
(157, 12, 17, 1, 2),
(158, 13, 25, 1, 2),
(159, 13, 26, 1, 2),
(160, 13, 27, 1, 2),
(161, 13, 28, 1, 2),
(162, 13, 29, 4, 2),
(163, 13, 29, 7, 1),
(164, 13, 31, 4, 2),
(165, 13, 31, 8, 1),
(166, 13, 10, 4, 2),
(167, 13, 10, 8, 1),
(168, 14, 25, 1, 3),
(169, 14, 26, 1, 2),
(170, 14, 27, 1, 2),
(171, 14, 28, 1, 2),
(172, 14, 29, 4, 2),
(173, 14, 29, 7, 1),
(174, 14, 31, 4, 2),
(175, 14, 31, 7, 1),
(176, 14, 31, 8, 1),
(177, 14, 10, 4, 2),
(178, 14, 10, 7, 1),
(180, 15, 25, 1, 2),
(181, 15, 26, 1, 2),
(182, 15, 27, 1, 2),
(183, 15, 28, 1, 2),
(184, 15, 29, 4, 2),
(185, 15, 29, 7, 1),
(186, 15, 31, 4, 2),
(187, 15, 31, 7, 1),
(188, 15, 31, 8, 1),
(189, 15, 10, 4, 2),
(190, 15, 10, 7, 1),
(191, 15, 10, 8, 1),
(192, 16, 25, 1, 4),
(193, 16, 26, 1, 4),
(194, 16, 27, 1, 4),
(195, 16, 28, 1, 4),
(196, 17, 25, 1, 2),
(197, 17, 26, 1, 2),
(198, 17, 27, 1, 2),
(199, 17, 28, 1, 2),
(200, 17, 29, 4, 2),
(201, 17, 29, 7, 1),
(202, 17, 31, 4, 2),
(203, 17, 31, 7, 1),
(204, 17, 31, 8, 1),
(205, 17, 10, 4, 2),
(206, 17, 10, 7, 1),
(207, 17, 10, 8, 1),
(208, 18, 25, 1, 4),
(209, 18, 26, 1, 3),
(210, 18, 27, 1, 4),
(211, 18, 28, 1, 4),
(212, 18, 29, 4, 4),
(213, 18, 29, 7, 1),
(214, 18, 31, 4, 4),
(215, 18, 31, 7, 1),
(216, 18, 31, 8, 1),
(217, 18, 10, 4, 3),
(218, 18, 10, 7, 1),
(219, 18, 10, 8, 1),
(220, 18, 11, 1, 1),
(222, 18, 13, 1, 1),
(223, 18, 14, 1, 1),
(224, 18, 15, 1, 1),
(225, 19, 25, 1, 4),
(226, 19, 26, 1, 4),
(227, 19, 27, 1, 4),
(228, 19, 28, 1, 4),
(229, 20, 25, 1, 4),
(230, 20, 26, 1, 4),
(231, 20, 27, 1, 3),
(232, 20, 28, 1, 3),
(233, 20, 29, 4, 3),
(234, 20, 29, 7, 1),
(235, 20, 31, 4, 4),
(236, 20, 31, 7, 1),
(237, 20, 31, 8, 1),
(238, 20, 10, 4, 2),
(239, 20, 10, 7, 1),
(240, 20, 10, 8, 1),
(241, 21, 25, 1, 5),
(242, 21, 26, 1, 3),
(243, 21, 27, 1, 5),
(245, 21, 28, 1, 5),
(246, 21, 29, 4, 3),
(247, 21, 29, 7, 1),
(248, 21, 31, 4, 3),
(249, 21, 31, 7, 1),
(250, 21, 31, 8, 1),
(251, 21, 10, 4, 2),
(252, 21, 10, 7, 1),
(253, 21, 10, 8, 1),
(254, 22, 25, 1, 2),
(255, 22, 26, 1, 2),
(256, 22, 27, 1, 2),
(257, 22, 28, 1, 2),
(258, 22, 29, 4, 2),
(259, 22, 31, 4, 2),
(260, 22, 10, 4, 2),
(261, 22, 11, 1, 1),
(262, 22, 12, 1, 1),
(263, 22, 13, 1, 1),
(264, 22, 14, 1, 1),
(265, 22, 15, 1, 1),
(268, 23, 25, 1, 3),
(269, 23, 26, 1, 2),
(270, 23, 27, 1, 3),
(271, 23, 28, 1, 3),
(272, 23, 29, 4, 3),
(273, 23, 29, 7, 1),
(274, 23, 31, 4, 3),
(275, 23, 31, 7, 1),
(276, 23, 31, 8, 1),
(277, 23, 10, 4, 3),
(278, 23, 10, 7, 1),
(279, 23, 10, 8, 1),
(280, 23, 11, 1, 1),
(281, 23, 12, 1, 1),
(282, 24, 26, 1, 4),
(283, 24, 28, 1, 4),
(285, 24, 29, 4, 4),
(286, 24, 29, 7, 1),
(287, 24, 31, 4, 4),
(288, 24, 31, 7, 1),
(289, 24, 31, 8, 1),
(290, 24, 10, 4, 4),
(291, 24, 10, 7, 1),
(292, 24, 10, 8, 1),
(293, 24, 15, 1, 1),
(294, 24, 12, 1, 1),
(295, 24, 13, 1, 1),
(296, 24, 14, 1, 1),
(299, 25, 10, 4, 10),
(300, 26, 25, 1, 1),
(301, 26, 26, 1, 2),
(302, 26, 27, 1, 2),
(303, 26, 28, 1, 2),
(311, 27, 25, 1, 6),
(313, 27, 26, 1, 6),
(314, 27, 27, 1, 6),
(315, 27, 28, 1, 6),
(316, 27, 29, 4, 4),
(317, 27, 29, 7, 2),
(318, 27, 31, 4, 5),
(319, 27, 31, 7, 1),
(320, 27, 31, 8, 2),
(321, 27, 31, 10, 1),
(322, 27, 10, 4, 5),
(323, 27, 10, 7, 1),
(324, 27, 10, 8, 2),
(325, 27, 10, 10, 1),
(333, 28, 25, 1, 3),
(334, 28, 26, 1, 2),
(335, 28, 27, 1, 2),
(336, 28, 28, 1, 1),
(337, 28, 29, 4, 1),
(338, 28, 31, 4, 1),
(339, 28, 10, 4, 1),
(341, 29, 25, 1, 2),
(342, 29, 26, 1, 2),
(343, 29, 27, 1, 2),
(344, 29, 28, 1, 2),
(345, 29, 29, 4, 2),
(346, 29, 29, 7, 1),
(347, 29, 31, 4, 2),
(348, 29, 31, 7, 1),
(349, 29, 31, 8, 1),
(350, 29, 10, 4, 2),
(351, 30, 25, 1, 2),
(352, 30, 26, 1, 2),
(353, 30, 27, 1, 2),
(354, 30, 28, 1, 2),
(355, 30, 29, 4, 2),
(356, 30, 29, 7, 1),
(357, 30, 31, 4, 2),
(358, 30, 10, 4, 2),
(359, 31, 25, 1, 2),
(360, 31, 26, 1, 2),
(361, 31, 27, 1, 2),
(362, 31, 28, 1, 2),
(363, 31, 29, 4, 2),
(364, 31, 29, 7, 1),
(365, 31, 31, 4, 2),
(366, 31, 31, 8, 1),
(367, 31, 10, 4, 2),
(368, 32, 25, 1, 3),
(369, 32, 26, 1, 3),
(370, 32, 27, 1, 3),
(371, 32, 28, 1, 4),
(372, 32, 29, 4, 3),
(374, 32, 29, 7, 1),
(375, 32, 31, 4, 3),
(376, 32, 31, 8, 1),
(377, 32, 10, 4, 3),
(378, 32, 10, 8, 1),
(379, 33, 25, 1, 2),
(380, 33, 26, 1, 2),
(381, 33, 27, 1, 2),
(382, 33, 28, 1, 2),
(383, 33, 29, 4, 2),
(384, 33, 29, 7, 1),
(385, 33, 31, 4, 1),
(386, 33, 31, 7, 1),
(387, 33, 31, 8, 1),
(388, 33, 10, 4, 1),
(389, 33, 10, 7, 1),
(390, 33, 10, 8, 1),
(391, 33, 11, 1, 1),
(392, 33, 12, 1, 1),
(393, 33, 13, 1, 1),
(394, 33, 14, 1, 1),
(395, 33, 15, 1, 1),
(396, 33, 16, 1, 1),
(397, 33, 17, 1, 1),
(398, 34, 25, 1, 2),
(399, 34, 26, 1, 2),
(400, 34, 27, 1, 2),
(401, 34, 28, 1, 2),
(402, 34, 29, 4, 2),
(403, 34, 29, 7, 1),
(404, 34, 31, 4, 2),
(405, 34, 31, 8, 1),
(406, 34, 10, 4, 2),
(407, 34, 10, 8, 1),
(408, 35, 25, 1, 3),
(409, 35, 26, 1, 3),
(410, 35, 27, 1, 5),
(411, 35, 28, 1, 5),
(412, 35, 29, 4, 4),
(413, 35, 29, 7, 1),
(414, 35, 31, 4, 4),
(415, 35, 31, 7, 1),
(416, 35, 31, 8, 1),
(417, 35, 31, 10, 1),
(418, 35, 10, 4, 4),
(419, 35, 10, 7, 1),
(420, 35, 10, 8, 1),
(421, 35, 10, 10, 1),
(422, 35, 11, 1, 2),
(423, 35, 12, 1, 2),
(424, 35, 13, 1, 2),
(425, 35, 14, 1, 2),
(426, 35, 15, 1, 2),
(427, 35, 16, 1, 2),
(428, 35, 17, 1, 2),
(429, 36, 25, 1, 4),
(430, 36, 26, 1, 4),
(431, 36, 27, 1, 4),
(432, 36, 28, 1, 4),
(434, 37, 25, 1, 2),
(435, 37, 26, 1, 2),
(436, 37, 27, 1, 2),
(437, 37, 28, 1, 2),
(438, 37, 29, 4, 2),
(439, 37, 29, 7, 1),
(440, 37, 31, 4, 2),
(441, 37, 31, 8, 1),
(442, 37, 10, 4, 2),
(444, 38, 25, 1, 2),
(445, 38, 26, 1, 2),
(446, 38, 27, 1, 2),
(447, 38, 28, 1, 3),
(448, 38, 29, 4, 2),
(449, 38, 29, 7, 1),
(450, 38, 31, 4, 2),
(451, 38, 31, 7, 1),
(452, 38, 31, 8, 1),
(453, 38, 10, 4, 2),
(454, 38, 10, 8, 1),
(455, 39, 29, 7, 1),
(456, 39, 26, 1, 2),
(457, 39, 27, 1, 2),
(458, 39, 28, 1, 2),
(459, 39, 29, 4, 2),
(461, 39, 31, 4, 2),
(462, 39, 31, 7, 1),
(463, 39, 31, 8, 1),
(464, 40, 26, 1, 3),
(465, 40, 27, 1, 3),
(466, 40, 28, 1, 3),
(467, 40, 29, 4, 4),
(468, 40, 29, 7, 3),
(469, 40, 31, 4, 1),
(470, 40, 31, 7, 4),
(471, 40, 31, 59, 1),
(472, 40, 31, 10, 1),
(473, 40, 10, 7, 1),
(476, 40, 10, 10, 1),
(477, 40, 11, 1, 1),
(478, 40, 12, 1, 1),
(479, 40, 13, 1, 1),
(480, 40, 14, 1, 1),
(481, 40, 15, 1, 1),
(482, 40, 16, 1, 1),
(483, 40, 17, 1, 1),
(484, 41, 25, 1, 26),
(485, 41, 26, 1, 3),
(486, 41, 27, 1, 4),
(487, 41, 28, 1, 4),
(488, 41, 29, 4, 2),
(489, 41, 29, 7, 1),
(490, 41, 31, 4, 3),
(491, 41, 31, 7, 1),
(492, 41, 31, 8, 1),
(493, 41, 10, 4, 2),
(494, 41, 10, 7, 1),
(495, 41, 10, 8, 1),
(497, 42, 25, 1, 3),
(498, 42, 26, 1, 3),
(499, 42, 27, 1, 3),
(500, 42, 28, 1, 3),
(501, 42, 31, 8, 1),
(502, 42, 29, 7, 1),
(503, 42, 31, 4, 3),
(504, 42, 31, 7, 1),
(506, 42, 10, 4, 3),
(507, 42, 10, 7, 1),
(508, 42, 10, 8, 1),
(509, 42, 11, 1, 1),
(510, 42, 12, 1, 1),
(511, 42, 13, 1, 1),
(512, 42, 14, 1, 2),
(513, 42, 15, 1, 2),
(514, 43, 25, 1, 3),
(515, 43, 26, 1, 2),
(516, 43, 27, 1, 2),
(517, 43, 28, 1, 2),
(518, 43, 29, 4, 2),
(519, 43, 29, 7, 1),
(520, 43, 31, 4, 2),
(521, 43, 31, 7, 1),
(522, 43, 31, 8, 1),
(523, 43, 10, 4, 2),
(524, 43, 10, 7, 1),
(525, 43, 10, 8, 1),
(526, 43, 11, 1, 1),
(527, 43, 12, 1, 1),
(528, 43, 13, 1, 1),
(529, 43, 14, 1, 1),
(530, 43, 15, 1, 1),
(531, 44, 25, 1, 2),
(532, 44, 26, 1, 2),
(533, 44, 27, 1, 3),
(534, 44, 28, 1, 4),
(535, 44, 29, 4, 3),
(536, 44, 29, 7, 1),
(537, 44, 31, 4, 3),
(538, 44, 31, 8, 1),
(539, 44, 10, 4, 3),
(540, 44, 10, 8, 1),
(542, 45, 25, 1, 2),
(543, 45, 26, 1, 2),
(544, 45, 27, 1, 3),
(545, 45, 28, 1, 3),
(546, 45, 29, 4, 3),
(547, 45, 29, 7, 1),
(548, 45, 31, 4, 3),
(549, 45, 31, 8, 1),
(550, 45, 10, 4, 3),
(551, 45, 11, 1, 1),
(552, 45, 12, 1, 1),
(553, 45, 13, 1, 1),
(566, 46, 26, 1, 1),
(567, 46, 25, 1, 1),
(568, 46, 27, 1, 1),
(569, 46, 28, 1, 1),
(570, 47, 25, 1, 3),
(571, 47, 26, 1, 1),
(572, 47, 27, 1, 1),
(573, 47, 28, 1, 1),
(574, 47, 29, 4, 1),
(575, 47, 29, 7, 1),
(576, 47, 31, 4, 1),
(577, 47, 31, 8, 1),
(578, 47, 10, 8, 1),
(579, 47, 11, 1, 1),
(580, 47, 12, 1, 1),
(581, 47, 13, 1, 1),
(582, 47, 14, 1, 1),
(583, 47, 15, 1, 1),
(584, 48, 25, 1, 2),
(585, 48, 26, 1, 2),
(586, 48, 27, 1, 2),
(587, 48, 28, 1, 3),
(588, 48, 29, 4, 2),
(589, 48, 29, 7, 1),
(590, 48, 31, 4, 4),
(591, 48, 31, 7, 1),
(592, 48, 31, 8, 1),
(593, 48, 10, 4, 2),
(594, 48, 10, 7, 1),
(595, 48, 10, 8, 1),
(596, 49, 25, 1, 3),
(597, 49, 26, 1, 2),
(598, 49, 27, 1, 3),
(599, 49, 28, 1, 2),
(600, 49, 29, 4, 2),
(601, 49, 29, 7, 1),
(602, 49, 31, 4, 2),
(603, 49, 31, 7, 1),
(604, 49, 31, 8, 1),
(605, 49, 10, 4, 2),
(606, 49, 10, 8, 1),
(607, 50, 25, 1, 5),
(608, 50, 26, 1, 5),
(609, 50, 27, 1, 5),
(610, 50, 28, 1, 6),
(611, 50, 29, 4, 4),
(612, 50, 29, 7, 2),
(613, 50, 31, 4, 4),
(614, 50, 31, 7, 1),
(616, 50, 31, 8, 1),
(617, 50, 31, 10, 1),
(618, 50, 10, 4, 3),
(619, 50, 10, 7, 1),
(620, 50, 10, 8, 1),
(621, 50, 10, 10, 1),
(622, 50, 11, 1, 3),
(623, 50, 12, 1, 2),
(624, 50, 13, 1, 2),
(625, 50, 14, 1, 2),
(626, 50, 15, 1, 2),
(627, 50, 16, 1, 4),
(628, 50, 17, 1, 4),
(629, 51, 25, 1, 2),
(630, 51, 26, 1, 1),
(631, 51, 27, 1, 1),
(632, 51, 28, 1, 1),
(633, 52, 25, 1, 2),
(634, 52, 26, 1, 2),
(635, 52, 27, 1, 2),
(636, 52, 28, 1, 2),
(637, 52, 29, 4, 2),
(638, 52, 29, 7, 1),
(639, 52, 31, 4, 2),
(640, 52, 10, 4, 2),
(641, 53, 25, 1, 3),
(642, 53, 26, 1, 2),
(643, 53, 27, 1, 4),
(644, 53, 28, 1, 4),
(645, 53, 29, 4, 4),
(646, 53, 29, 7, 1),
(647, 53, 31, 4, 5),
(648, 53, 31, 7, 1),
(649, 53, 31, 8, 1),
(650, 53, 10, 4, 5),
(651, 53, 10, 7, 1),
(652, 53, 10, 8, 1),
(653, 54, 25, 1, 2),
(654, 54, 26, 1, 2),
(655, 54, 27, 1, 2),
(657, 54, 28, 1, 2),
(658, 54, 29, 4, 2),
(659, 54, 29, 7, 1),
(660, 54, 31, 4, 2),
(661, 54, 31, 7, 1),
(662, 54, 31, 8, 1),
(663, 54, 10, 4, 2),
(664, 55, 25, 1, 2),
(665, 55, 26, 1, 2),
(666, 55, 27, 1, 3),
(667, 55, 28, 1, 3),
(668, 55, 29, 4, 3),
(669, 55, 29, 7, 1),
(670, 55, 31, 4, 1),
(672, 55, 31, 7, 1),
(673, 55, 31, 8, 1),
(674, 55, 10, 4, 2),
(675, 55, 10, 7, 1),
(676, 55, 10, 8, 1),
(677, 55, 11, 1, 1),
(678, 55, 12, 1, 1),
(679, 55, 13, 1, 1),
(680, 55, 14, 1, 1),
(681, 55, 16, 1, 1),
(682, 56, 25, 1, 5),
(683, 56, 26, 1, 3),
(684, 56, 27, 1, 3),
(685, 56, 28, 1, 3),
(687, 56, 29, 7, 4),
(688, 56, 31, 59, 4),
(689, 57, 25, 1, 2),
(690, 57, 26, 1, 2),
(691, 57, 27, 1, 3),
(692, 57, 28, 1, 3),
(693, 57, 29, 4, 3),
(694, 57, 29, 7, 1),
(695, 57, 31, 4, 3),
(696, 57, 31, 7, 1),
(697, 57, 31, 8, 1),
(698, 57, 10, 4, 3),
(699, 57, 10, 7, 1),
(700, 57, 10, 8, 1),
(701, 57, 11, 1, 2),
(702, 57, 12, 1, 2),
(703, 57, 13, 1, 2),
(704, 57, 14, 1, 2),
(705, 57, 15, 1, 2),
(706, 58, 25, 1, 2),
(707, 58, 26, 1, 2),
(708, 58, 27, 1, 2),
(709, 58, 28, 1, 2),
(710, 58, 29, 4, 2),
(711, 58, 29, 7, 1),
(712, 58, 31, 4, 2),
(713, 58, 10, 4, 2),
(714, 59, 25, 1, 3),
(715, 59, 26, 1, 3),
(716, 59, 27, 1, 3),
(717, 59, 28, 1, 3),
(718, 59, 29, 4, 3),
(719, 59, 29, 7, 1),
(720, 59, 31, 4, 3),
(721, 59, 31, 8, 1),
(722, 59, 10, 4, 3),
(723, 59, 10, 8, 1),
(725, 60, 25, 1, 2),
(726, 60, 26, 1, 2),
(727, 60, 27, 1, 2),
(728, 60, 28, 1, 2),
(729, 60, 29, 4, 1),
(730, 60, 29, 7, 1),
(731, 60, 31, 4, 1),
(732, 60, 31, 8, 1),
(733, 60, 10, 4, 1),
(734, 60, 11, 1, 1),
(735, 60, 12, 1, 1),
(736, 60, 13, 1, 1),
(737, 60, 14, 1, 1),
(738, 60, 15, 1, 1),
(739, 61, 25, 1, 2),
(740, 61, 26, 1, 2),
(741, 61, 27, 1, 4),
(742, 61, 28, 1, 4),
(743, 61, 29, 4, 4),
(744, 61, 29, 7, 1),
(745, 61, 31, 4, 4),
(746, 61, 31, 7, 1),
(747, 61, 31, 8, 1),
(748, 61, 10, 4, 4),
(749, 61, 10, 7, 1),
(750, 61, 10, 8, 1),
(751, 61, 11, 1, 2),
(752, 61, 12, 1, 2),
(753, 61, 13, 1, 2),
(754, 61, 14, 1, 2),
(755, 61, 15, 1, 2),
(756, 61, 16, 1, 2),
(757, 61, 17, 1, 2),
(758, 62, 25, 1, 2),
(759, 62, 26, 1, 2),
(760, 62, 27, 1, 4),
(761, 62, 28, 1, 4),
(762, 62, 29, 4, 4),
(763, 62, 29, 7, 1),
(764, 62, 31, 4, 4),
(765, 62, 31, 7, 1),
(766, 62, 31, 8, 1),
(767, 62, 10, 4, 3),
(768, 62, 10, 7, 1),
(769, 62, 10, 8, 1),
(770, 63, 25, 1, 2),
(771, 63, 26, 1, 1),
(772, 63, 27, 1, 1),
(773, 63, 28, 1, 1),
(774, 63, 29, 4, 1),
(775, 63, 29, 7, 1),
(776, 63, 31, 4, 1),
(777, 63, 31, 8, 1),
(778, 63, 10, 4, 1),
(779, 64, 25, 1, 2),
(780, 64, 26, 1, 2),
(781, 64, 27, 1, 3),
(782, 64, 28, 1, 3),
(783, 64, 29, 4, 3),
(784, 64, 29, 7, 1),
(785, 64, 31, 4, 3),
(786, 64, 31, 8, 1),
(787, 64, 10, 4, 3),
(788, 64, 10, 8, 1),
(789, 65, 25, 1, 2),
(790, 65, 26, 1, 1),
(791, 65, 27, 1, 2),
(792, 65, 28, 1, 2),
(793, 65, 29, 4, 1),
(794, 65, 29, 7, 1),
(795, 65, 31, 4, 1),
(796, 65, 31, 8, 1),
(797, 65, 10, 4, 1),
(798, 65, 10, 8, 1),
(799, 65, 11, 1, 1),
(800, 65, 12, 1, 1),
(801, 65, 13, 1, 3),
(802, 66, 25, 1, 2),
(803, 66, 26, 1, 2),
(804, 66, 27, 1, 2),
(805, 66, 28, 1, 2),
(806, 66, 29, 4, 2),
(807, 66, 29, 7, 1),
(808, 66, 31, 4, 2),
(809, 66, 31, 7, 1),
(810, 66, 31, 8, 1),
(811, 66, 10, 4, 2),
(812, 66, 10, 7, 1),
(813, 66, 10, 8, 1),
(814, 67, 25, 1, 2),
(815, 67, 26, 1, 2),
(816, 67, 27, 1, 2),
(817, 67, 28, 1, 2),
(818, 67, 29, 4, 2),
(819, 67, 29, 7, 1),
(820, 67, 31, 4, 2),
(821, 67, 31, 7, 1),
(822, 67, 31, 8, 1),
(823, 67, 10, 4, 2),
(824, 67, 10, 7, 1),
(825, 67, 10, 8, 1),
(826, 68, 25, 1, 2),
(827, 68, 26, 1, 2),
(828, 68, 27, 1, 2),
(829, 68, 28, 1, 2),
(830, 68, 29, 4, 2),
(831, 68, 29, 7, 1),
(832, 68, 31, 4, 2),
(833, 68, 31, 7, 1),
(834, 68, 31, 8, 1),
(835, 68, 10, 4, 2),
(836, 68, 10, 7, 1),
(837, 68, 10, 8, 1),
(838, 68, 11, 1, 1),
(839, 68, 12, 1, 1),
(840, 68, 13, 1, 1),
(841, 69, 25, 1, 2),
(842, 69, 26, 1, 2),
(843, 69, 27, 1, 3),
(844, 69, 28, 1, 2),
(845, 69, 29, 4, 2),
(846, 69, 29, 7, 1),
(847, 69, 31, 4, 2),
(848, 69, 31, 8, 1),
(849, 69, 10, 4, 2),
(850, 70, 25, 1, 2),
(851, 70, 26, 1, 2),
(852, 70, 27, 1, 2),
(853, 70, 28, 1, 2),
(854, 70, 29, 4, 2),
(855, 70, 29, 7, 1),
(856, 70, 31, 4, 2),
(857, 70, 31, 8, 1),
(858, 70, 10, 4, 2),
(859, 70, 10, 8, 1),
(860, 71, 25, 1, 2),
(861, 71, 26, 1, 2),
(862, 71, 27, 1, 2),
(863, 71, 28, 1, 2),
(864, 71, 29, 4, 2),
(865, 71, 29, 7, 1),
(866, 71, 31, 4, 2),
(867, 71, 31, 7, 1),
(868, 71, 31, 8, 1),
(869, 71, 10, 4, 2),
(870, 71, 10, 7, 1),
(871, 71, 10, 8, 1),
(872, 72, 25, 1, 2),
(873, 72, 26, 1, 2),
(874, 72, 27, 1, 3),
(875, 72, 28, 1, 3),
(876, 72, 29, 4, 3),
(877, 72, 29, 7, 1),
(878, 72, 31, 4, 3),
(879, 72, 31, 7, 1),
(880, 72, 31, 8, 1),
(881, 72, 10, 4, 3),
(882, 72, 10, 7, 1),
(883, 72, 10, 8, 1),
(884, 72, 11, 1, 1),
(885, 72, 12, 1, 1),
(886, 72, 13, 1, 1),
(887, 72, 14, 1, 1),
(888, 73, 25, 1, 3),
(889, 73, 26, 1, 2),
(890, 73, 27, 1, 2),
(891, 73, 28, 1, 3),
(892, 73, 29, 4, 2),
(893, 73, 29, 7, 1),
(894, 73, 31, 4, 2),
(895, 73, 31, 7, 1),
(896, 73, 31, 8, 1),
(897, 73, 10, 4, 2),
(898, 73, 10, 7, 1),
(899, 73, 10, 8, 1),
(900, 74, 25, 1, 6),
(901, 74, 26, 1, 6),
(902, 74, 27, 1, 6),
(903, 74, 28, 1, 6),
(904, 74, 29, 7, 5),
(905, 74, 31, 59, 4),
(906, 75, 25, 1, 2),
(907, 75, 26, 1, 2),
(908, 75, 27, 1, 5),
(909, 75, 28, 1, 5),
(910, 75, 29, 4, 4),
(911, 75, 29, 7, 1),
(912, 75, 31, 4, 6),
(913, 75, 31, 7, 1),
(914, 75, 31, 8, 2),
(915, 75, 31, 10, 1),
(916, 75, 10, 4, 4),
(917, 75, 10, 7, 1),
(918, 75, 10, 8, 2),
(919, 75, 10, 10, 1),
(920, 76, 25, 1, 2),
(921, 76, 26, 1, 2),
(922, 76, 27, 1, 2),
(923, 76, 28, 1, 2),
(924, 76, 29, 4, 2),
(925, 76, 29, 7, 1),
(926, 76, 31, 4, 2),
(927, 76, 31, 8, 1),
(928, 76, 10, 4, 2),
(929, 77, 25, 1, 3),
(930, 77, 26, 1, 2),
(931, 77, 27, 1, 2),
(932, 77, 28, 1, 2),
(933, 77, 29, 4, 2),
(934, 77, 29, 7, 1),
(935, 77, 31, 4, 2),
(936, 77, 31, 7, 1),
(937, 77, 31, 8, 1),
(938, 77, 31, 10, 1),
(939, 77, 10, 4, 2),
(940, 77, 10, 7, 1),
(941, 77, 10, 8, 1),
(942, 77, 10, 10, 1),
(943, 78, 25, 1, 2),
(944, 78, 26, 1, 2),
(945, 78, 27, 1, 2),
(946, 78, 28, 1, 2),
(947, 78, 29, 4, 2),
(948, 78, 29, 7, 1),
(949, 78, 31, 4, 2),
(950, 78, 31, 7, 1),
(951, 78, 31, 8, 1),
(952, 78, 10, 4, 2),
(953, 78, 10, 7, 1),
(954, 78, 10, 8, 1),
(955, 79, 25, 1, 2),
(956, 79, 26, 1, 2),
(957, 79, 27, 1, 2),
(958, 79, 28, 1, 2),
(959, 79, 29, 4, 2),
(960, 79, 29, 7, 1),
(961, 79, 31, 4, 2),
(962, 79, 31, 8, 1),
(963, 79, 10, 4, 2),
(964, 80, 18, 1, 6),
(965, 80, 19, 1, 6),
(966, 80, 20, 1, 6),
(967, 80, 21, 1, 5),
(968, 80, 29, 59, 3),
(969, 80, 31, 59, 3),
(970, 80, 10, 1, 3),
(971, 81, 25, 1, 2),
(972, 81, 26, 1, 2),
(973, 81, 27, 1, 2),
(974, 81, 28, 1, 2),
(975, 81, 29, 4, 2),
(976, 81, 29, 7, 1),
(977, 81, 31, 4, 2),
(978, 81, 31, 7, 1),
(979, 81, 31, 8, 1),
(980, 81, 10, 4, 2),
(981, 81, 10, 7, 1),
(982, 81, 10, 8, 1),
(983, 82, 18, 1, 9),
(984, 82, 19, 1, 10),
(985, 82, 20, 1, 10),
(986, 82, 21, 1, 10),
(987, 82, 29, 59, 12),
(988, 82, 31, 59, 12),
(990, 82, 10, 1, 12),
(991, 83, 25, 1, 4),
(992, 83, 26, 1, 3),
(993, 83, 27, 1, 4),
(994, 83, 28, 1, 4),
(995, 83, 29, 4, 4),
(996, 83, 29, 7, 1),
(997, 83, 31, 4, 4),
(998, 83, 31, 7, 1),
(999, 83, 31, 8, 1),
(1000, 83, 31, 10, 1),
(1001, 83, 10, 4, 3),
(1002, 83, 10, 7, 1),
(1003, 83, 10, 8, 1),
(1004, 83, 10, 10, 1),
(1005, 83, 11, 1, 2),
(1006, 83, 12, 1, 2),
(1007, 83, 13, 1, 2),
(1008, 83, 14, 1, 2),
(1009, 83, 15, 1, 2),
(1010, 83, 16, 1, 2),
(1011, 83, 17, 1, 2),
(1012, 84, 25, 1, 2),
(1013, 84, 26, 1, 2),
(1014, 84, 27, 1, 2),
(1015, 84, 28, 1, 2),
(1016, 84, 29, 4, 2),
(1017, 84, 29, 7, 1),
(1018, 84, 31, 4, 2),
(1019, 84, 31, 7, 1),
(1020, 84, 31, 8, 1),
(1021, 84, 10, 4, 2),
(1022, 84, 10, 8, 1),
(1023, 85, 25, 1, 2),
(1024, 85, 26, 1, 2),
(1025, 85, 27, 1, 2),
(1026, 85, 28, 1, 2),
(1027, 85, 29, 4, 2),
(1028, 85, 29, 7, 1),
(1029, 85, 31, 4, 2),
(1030, 85, 31, 7, 1),
(1031, 85, 31, 8, 1),
(1032, 85, 10, 4, 2),
(1033, 85, 10, 7, 1),
(1034, 85, 10, 8, 1),
(1035, 86, 25, 1, 2),
(1036, 86, 26, 1, 2),
(1037, 86, 27, 1, 2),
(1038, 86, 28, 1, 2),
(1039, 86, 29, 4, 2),
(1040, 86, 29, 7, 1),
(1041, 86, 31, 4, 2),
(1042, 86, 31, 7, 1),
(1043, 86, 31, 8, 1),
(1044, 86, 10, 4, 2),
(1045, 86, 10, 7, 1),
(1046, 86, 10, 8, 1),
(1047, 87, 25, 1, 2),
(1048, 87, 26, 1, 2),
(1049, 87, 27, 1, 3),
(1050, 87, 28, 1, 3),
(1051, 87, 29, 4, 3),
(1052, 87, 31, 4, 3),
(1053, 87, 10, 4, 3),
(1054, 88, 25, 1, 3),
(1055, 88, 26, 1, 3),
(1056, 88, 27, 1, 3),
(1057, 88, 28, 1, 3),
(1058, 88, 29, 4, 3),
(1059, 88, 29, 7, 1),
(1060, 88, 31, 4, 3),
(1061, 88, 31, 7, 1),
(1062, 88, 31, 8, 1),
(1063, 88, 10, 4, 3),
(1064, 88, 10, 7, 1),
(1065, 88, 10, 8, 1),
(1066, 88, 11, 1, 2),
(1067, 88, 12, 1, 1),
(1068, 88, 13, 1, 1),
(1069, 88, 14, 1, 1),
(1070, 88, 15, 1, 2),
(1071, 88, 16, 1, 1),
(1072, 88, 17, 1, 1),
(1073, 89, 25, 1, 2),
(1074, 89, 26, 1, 2),
(1075, 89, 27, 1, 2),
(1076, 89, 28, 1, 2),
(1077, 89, 29, 4, 2),
(1078, 89, 29, 7, 1),
(1079, 89, 31, 4, 2),
(1080, 89, 31, 8, 1),
(1081, 89, 10, 4, 2),
(1082, 89, 10, 8, 1),
(1083, 90, 25, 1, 3),
(1084, 90, 26, 1, 3),
(1085, 90, 27, 1, 3),
(1086, 90, 28, 1, 3),
(1088, 90, 29, 4, 2),
(1089, 90, 29, 7, 1),
(1090, 90, 31, 4, 2),
(1092, 90, 31, 7, 1),
(1093, 90, 31, 8, 1),
(1094, 90, 10, 4, 2),
(1095, 90, 10, 7, 1),
(1096, 90, 10, 8, 1),
(1097, 90, 11, 1, 1),
(1098, 90, 12, 1, 1),
(1099, 90, 13, 1, 1),
(1100, 90, 14, 1, 2),
(1101, 90, 15, 1, 2),
(1102, 90, 16, 1, 2),
(1103, 90, 17, 1, 2),
(1104, 91, 25, 1, 2),
(1105, 91, 26, 1, 2),
(1106, 91, 27, 1, 2),
(1107, 91, 28, 1, 2),
(1108, 91, 29, 4, 2),
(1109, 91, 29, 7, 1),
(1110, 91, 31, 4, 2),
(1111, 91, 31, 7, 1),
(1112, 91, 31, 8, 1),
(1113, 91, 10, 4, 2),
(1114, 91, 10, 8, 1),
(1115, 92, 25, 1, 2),
(1116, 92, 26, 1, 2),
(1117, 92, 27, 1, 2),
(1118, 92, 28, 1, 2),
(1119, 92, 29, 4, 2),
(1120, 92, 29, 7, 1),
(1121, 92, 31, 4, 2),
(1122, 92, 31, 7, 1),
(1123, 92, 31, 8, 1),
(1124, 92, 10, 4, 2),
(1126, 92, 10, 8, 1),
(1127, 92, 11, 1, 2),
(1128, 92, 12, 1, 2),
(1129, 92, 13, 1, 2),
(1130, 92, 14, 1, 2),
(1131, 92, 15, 1, 2),
(1132, 92, 16, 1, 1),
(1133, 93, 25, 1, 3),
(1134, 93, 26, 1, 3),
(1135, 93, 27, 1, 4),
(1136, 93, 28, 1, 4),
(1137, 93, 29, 4, 2),
(1138, 93, 29, 7, 1),
(1139, 93, 31, 4, 2),
(1140, 93, 31, 8, 1),
(1141, 93, 10, 4, 2),
(1142, 93, 10, 8, 1),
(1143, 94, 25, 1, 3),
(1144, 94, 26, 1, 3),
(1145, 94, 27, 1, 3),
(1146, 94, 28, 1, 3),
(1147, 95, 25, 1, 3),
(1148, 95, 26, 1, 3),
(1149, 95, 27, 1, 5),
(1150, 95, 28, 1, 6),
(1151, 95, 29, 4, 5),
(1152, 95, 29, 7, 1),
(1153, 95, 31, 4, 6),
(1154, 95, 31, 7, 1),
(1155, 95, 31, 8, 1),
(1156, 95, 10, 4, 5),
(1157, 95, 10, 7, 1),
(1158, 95, 10, 8, 1),
(1159, 95, 11, 1, 2),
(1160, 95, 12, 1, 2),
(1161, 95, 13, 1, 2),
(1162, 95, 14, 1, 2),
(1163, 95, 15, 1, 2),
(1164, 95, 16, 1, 4),
(1165, 95, 17, 1, 3),
(1166, 96, 25, 1, 1),
(1167, 96, 26, 1, 1),
(1168, 96, 27, 1, 1),
(1169, 96, 28, 1, 1),
(1170, 96, 29, 4, 1),
(1171, 96, 31, 4, 1),
(1172, 96, 11, 1, 1),
(1173, 96, 12, 1, 1),
(1174, 96, 13, 1, 1),
(1175, 96, 14, 1, 1),
(1176, 97, 18, 1, 3),
(1177, 97, 19, 1, 3),
(1178, 97, 20, 1, 3),
(1179, 97, 21, 1, 3),
(1180, 98, 25, 1, 3),
(1181, 98, 26, 1, 2),
(1182, 98, 27, 1, 2),
(1183, 98, 28, 1, 2),
(1184, 98, 29, 4, 2),
(1185, 98, 29, 7, 1),
(1186, 98, 31, 4, 2),
(1187, 98, 31, 7, 1),
(1188, 98, 31, 8, 1),
(1189, 98, 10, 4, 1),
(1190, 98, 10, 7, 1),
(1191, 98, 10, 8, 1),
(1192, 99, 27, 1, 2),
(1193, 99, 28, 1, 2),
(1194, 99, 29, 4, 2),
(1195, 99, 29, 7, 1),
(1196, 99, 31, 4, 2),
(1197, 99, 31, 7, 1),
(1198, 99, 31, 8, 1),
(1199, 99, 10, 4, 2),
(1200, 99, 10, 7, 1),
(1201, 99, 10, 8, 1),
(1202, 100, 25, 1, 2),
(1203, 100, 26, 1, 2),
(1204, 100, 27, 1, 2),
(1205, 100, 28, 1, 2),
(1206, 101, 25, 1, 2),
(1207, 101, 26, 1, 2),
(1208, 101, 27, 1, 3),
(1209, 101, 28, 1, 3),
(1210, 101, 29, 4, 3),
(1211, 101, 29, 7, 1),
(1212, 101, 31, 4, 3),
(1213, 101, 31, 8, 1),
(1214, 101, 10, 4, 3),
(1215, 101, 10, 8, 1),
(1216, 102, 25, 1, 2),
(1217, 102, 26, 1, 2),
(1218, 102, 27, 1, 2),
(1219, 102, 28, 1, 2),
(1220, 102, 29, 4, 2),
(1221, 102, 29, 7, 1),
(1222, 102, 31, 4, 2),
(1223, 102, 31, 8, 1),
(1224, 102, 10, 4, 2),
(1225, 102, 10, 8, 1),
(1226, 103, 25, 1, 2),
(1227, 103, 26, 1, 2),
(1228, 103, 27, 1, 2),
(1229, 103, 28, 1, 2),
(1230, 103, 29, 4, 2),
(1231, 103, 29, 7, 1),
(1232, 103, 31, 4, 2),
(1233, 103, 31, 8, 1),
(1234, 103, 10, 4, 2),
(1235, 103, 10, 8, 1),
(1236, 104, 25, 1, 4),
(1237, 104, 26, 1, 4),
(1238, 104, 27, 1, 4),
(1239, 104, 28, 1, 4),
(1240, 104, 29, 4, 3),
(1241, 104, 29, 7, 1),
(1242, 104, 31, 4, 3),
(1243, 104, 31, 7, 1),
(1244, 104, 31, 8, 1),
(1245, 104, 31, 10, 1),
(1246, 104, 10, 4, 3),
(1247, 104, 10, 7, 1),
(1248, 104, 10, 8, 1),
(1249, 104, 10, 10, 1),
(1250, 105, 25, 1, 2),
(1251, 105, 26, 1, 2),
(1252, 105, 27, 1, 4),
(1253, 105, 28, 1, 4),
(1254, 105, 29, 4, 4),
(1255, 105, 29, 7, 1),
(1256, 105, 31, 4, 4),
(1257, 105, 31, 7, 1),
(1258, 105, 31, 8, 1),
(1259, 105, 10, 4, 3),
(1260, 105, 10, 7, 1),
(1261, 105, 10, 8, 1),
(1262, 105, 11, 1, 1),
(1263, 105, 12, 1, 1),
(1264, 105, 13, 1, 1),
(1265, 105, 14, 1, 1),
(1266, 105, 15, 1, 1),
(1267, 106, 25, 1, 2),
(1268, 106, 26, 1, 2),
(1269, 106, 27, 1, 2),
(1270, 106, 28, 1, 2),
(1271, 106, 29, 4, 2),
(1272, 106, 29, 7, 1),
(1273, 106, 31, 4, 1),
(1274, 106, 31, 8, 1),
(1275, 106, 10, 4, 1),
(1276, 106, 10, 8, 1),
(1277, 106, 11, 1, 1),
(1278, 106, 12, 1, 1),
(1279, 106, 13, 1, 1),
(1280, 106, 14, 1, 1),
(1281, 106, 15, 1, 1),
(1282, 106, 17, 1, 1),
(1283, 106, 31, 10, 1),
(1284, 107, 25, 1, 2),
(1285, 107, 26, 1, 2),
(1286, 107, 27, 1, 3),
(1287, 107, 28, 1, 3),
(1288, 107, 29, 4, 3),
(1289, 107, 29, 7, 1),
(1290, 107, 31, 4, 3),
(1291, 107, 31, 8, 1),
(1292, 107, 10, 4, 3),
(1293, 107, 10, 8, 1),
(1294, 107, 11, 1, 1),
(1295, 107, 12, 1, 1),
(1296, 107, 13, 1, 1),
(1297, 107, 14, 1, 2),
(1298, 107, 15, 1, 2),
(1299, 107, 16, 1, 2),
(1300, 108, 25, 1, 1),
(1301, 108, 26, 1, 1),
(1302, 108, 27, 1, 1),
(1303, 108, 28, 1, 1),
(1304, 109, 25, 1, 1),
(1305, 109, 26, 1, 1),
(1306, 109, 28, 1, 1),
(1307, 109, 29, 4, 1),
(1308, 109, 11, 1, 1),
(1309, 109, 13, 1, 1),
(1310, 109, 15, 1, 1),
(1311, 109, 16, 1, 1),
(1312, 110, 25, 1, 2),
(1313, 110, 26, 1, 1),
(1314, 110, 27, 1, 1),
(1315, 110, 28, 1, 1),
(1316, 110, 29, 4, 1),
(1317, 110, 31, 4, 1),
(1318, 110, 10, 4, 1),
(1319, 111, 25, 1, 3),
(1320, 111, 26, 1, 3),
(1321, 111, 27, 1, 3),
(1322, 111, 28, 1, 3),
(1323, 111, 29, 4, 2),
(1324, 111, 29, 7, 1),
(1325, 111, 31, 4, 3),
(1326, 111, 31, 7, 1),
(1327, 111, 31, 8, 1),
(1328, 111, 10, 4, 2),
(1329, 111, 10, 7, 1),
(1330, 111, 10, 8, 1),
(1331, 111, 11, 1, 2),
(1332, 111, 12, 1, 2),
(1333, 111, 13, 1, 2),
(1334, 111, 14, 1, 2),
(1335, 111, 16, 1, 2),
(1336, 111, 17, 1, 2),
(1337, 112, 25, 1, 2),
(1338, 112, 26, 1, 2),
(1339, 112, 27, 1, 1),
(1340, 112, 28, 1, 1),
(1341, 113, 25, 1, 2),
(1342, 113, 26, 1, 2),
(1343, 113, 27, 1, 2),
(1344, 113, 28, 1, 2),
(1345, 113, 29, 4, 2),
(1346, 113, 29, 7, 1),
(1347, 113, 31, 4, 2),
(1348, 113, 31, 7, 1),
(1349, 113, 31, 8, 1),
(1350, 113, 10, 4, 2),
(1351, 113, 10, 8, 1),
(1352, 114, 25, 1, 2),
(1353, 114, 26, 1, 2),
(1354, 114, 27, 1, 2),
(1355, 114, 28, 1, 2),
(1356, 114, 29, 4, 2),
(1357, 114, 17, 1, 1),
(1358, 114, 10, 4, 2),
(1359, 114, 31, 59, 1),
(1360, 114, 11, 1, 1),
(1361, 114, 12, 1, 1),
(1362, 114, 13, 1, 1),
(1363, 114, 14, 1, 1),
(1364, 114, 15, 1, 1),
(1365, 114, 16, 1, 1),
(1367, 115, 25, 1, 2),
(1368, 115, 26, 1, 2),
(1369, 115, 27, 1, 2),
(1370, 115, 28, 1, 2),
(1371, 115, 29, 4, 2),
(1372, 115, 29, 7, 1),
(1373, 115, 31, 4, 2),
(1374, 115, 31, 7, 1),
(1375, 115, 31, 8, 1),
(1376, 115, 10, 4, 2),
(1377, 115, 10, 7, 1),
(1378, 115, 10, 8, 1),
(1379, 116, 25, 1, 2),
(1380, 116, 26, 1, 2),
(1381, 116, 27, 1, 2),
(1382, 116, 28, 1, 2),
(1383, 116, 29, 4, 2),
(1384, 116, 29, 7, 1),
(1386, 116, 31, 8, 1),
(1387, 116, 31, 4, 2),
(1388, 116, 10, 8, 1),
(1389, 117, 25, 1, 1),
(1390, 117, 26, 1, 1),
(1391, 117, 27, 1, 2),
(1392, 117, 28, 1, 2),
(1393, 117, 29, 4, 2),
(1394, 117, 31, 4, 2),
(1395, 118, 25, 1, 3),
(1396, 118, 26, 1, 3),
(1397, 118, 27, 1, 3),
(1398, 118, 28, 1, 3),
(1399, 118, 29, 4, 3),
(1400, 118, 29, 7, 1),
(1401, 118, 31, 4, 3),
(1402, 118, 31, 7, 1),
(1403, 118, 31, 8, 1),
(1404, 118, 10, 4, 3),
(1405, 118, 10, 7, 1),
(1406, 118, 10, 8, 1),
(1407, 119, 25, 1, 3),
(1408, 119, 26, 1, 3),
(1409, 119, 27, 1, 3),
(1410, 119, 28, 1, 3),
(1411, 119, 29, 4, 3),
(1412, 119, 29, 7, 1),
(1413, 119, 31, 4, 3),
(1414, 119, 31, 8, 1),
(1415, 119, 10, 4, 3),
(1416, 120, 25, 1, 3),
(1417, 120, 26, 1, 3),
(1418, 120, 27, 1, 3),
(1419, 120, 28, 1, 3),
(1420, 120, 29, 4, 2),
(1421, 120, 29, 7, 1),
(1422, 120, 31, 4, 3),
(1423, 120, 31, 7, 1),
(1424, 120, 31, 8, 1),
(1425, 120, 31, 10, 1),
(1426, 120, 10, 4, 1),
(1427, 120, 10, 7, 1),
(1428, 120, 10, 8, 1),
(1429, 120, 10, 10, 1),
(1430, 121, 25, 1, 6),
(1431, 121, 26, 1, 6),
(1432, 121, 27, 1, 6),
(1433, 121, 28, 1, 6),
(1434, 121, 29, 4, 5),
(1435, 121, 29, 7, 2),
(1436, 121, 31, 4, 4),
(1437, 121, 31, 7, 1),
(1438, 121, 31, 8, 2),
(1439, 121, 31, 10, 1),
(1440, 121, 10, 4, 3),
(1441, 121, 10, 7, 1),
(1442, 121, 10, 8, 1),
(1443, 121, 10, 10, 1),
(1444, 122, 18, 1, 8),
(1445, 122, 19, 1, 9),
(1446, 122, 20, 1, 9),
(1447, 122, 21, 1, 9),
(1448, 122, 29, 59, 7),
(1449, 122, 31, 59, 8),
(1450, 122, 10, 1, 6),
(1451, 123, 25, 1, 2),
(1452, 123, 26, 1, 2),
(1453, 123, 27, 1, 2),
(1454, 123, 28, 1, 2),
(1455, 123, 29, 4, 2),
(1456, 123, 29, 7, 1),
(1457, 123, 31, 4, 2),
(1458, 123, 31, 7, 1),
(1459, 123, 31, 8, 1),
(1460, 123, 10, 4, 2),
(1461, 123, 10, 7, 1),
(1462, 123, 10, 8, 1),
(1463, 124, 25, 1, 2),
(1464, 124, 26, 1, 2),
(1465, 124, 27, 1, 3),
(1466, 124, 28, 1, 3),
(1467, 124, 29, 4, 1),
(1469, 124, 31, 4, 3),
(1470, 124, 31, 8, 1),
(1471, 124, 10, 4, 3),
(1472, 124, 10, 8, 1),
(1473, 125, 25, 1, 2),
(1474, 125, 26, 1, 2),
(1475, 125, 27, 1, 2),
(1476, 125, 28, 1, 2),
(1477, 125, 29, 4, 2),
(1478, 125, 31, 4, 2),
(1479, 125, 10, 4, 2),
(1480, 126, 25, 1, 8),
(1481, 126, 26, 1, 8),
(1482, 126, 27, 1, 7),
(1483, 126, 28, 1, 7),
(1484, 126, 29, 7, 12),
(1485, 126, 31, 59, 15),
(1486, 126, 10, 1, 12),
(1487, 127, 25, 1, 2),
(1488, 127, 26, 1, 2),
(1489, 127, 27, 1, 2),
(1490, 127, 28, 1, 2),
(1491, 127, 29, 4, 2),
(1492, 127, 29, 7, 1),
(1493, 127, 31, 4, 2),
(1494, 127, 31, 7, 1),
(1495, 127, 31, 8, 1),
(1496, 127, 10, 4, 2),
(1497, 127, 10, 7, 1),
(1498, 127, 10, 8, 1),
(1499, 127, 11, 1, 1),
(1500, 127, 12, 1, 1),
(1501, 128, 25, 1, 3),
(1502, 128, 26, 1, 3),
(1503, 128, 27, 1, 3),
(1504, 128, 28, 1, 3),
(1505, 128, 29, 4, 3),
(1506, 128, 29, 7, 1),
(1507, 128, 31, 4, 3),
(1508, 128, 31, 7, 1),
(1509, 128, 31, 8, 1),
(1510, 128, 10, 4, 3),
(1511, 128, 10, 7, 1),
(1512, 128, 10, 8, 1),
(1513, 128, 11, 1, 2),
(1514, 128, 12, 1, 2),
(1515, 128, 13, 1, 2),
(1516, 128, 14, 1, 3),
(1517, 128, 15, 1, 3),
(1518, 128, 16, 1, 1),
(1519, 128, 17, 1, 1),
(1520, 129, 25, 1, 4),
(1521, 129, 26, 1, 4),
(1522, 129, 27, 1, 6),
(1523, 129, 28, 1, 7),
(1524, 129, 29, 4, 6),
(1525, 129, 29, 7, 2),
(1526, 129, 31, 4, 7),
(1527, 129, 31, 7, 1),
(1528, 129, 31, 8, 2),
(1529, 129, 31, 10, 1),
(1530, 129, 10, 4, 6),
(1531, 129, 10, 7, 1),
(1532, 129, 10, 8, 1),
(1533, 129, 10, 10, 1),
(1534, 1, 31, 8, 1);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_school_availability`
-- (See below for the actual view)
--
CREATE TABLE `view_school_availability` (
`school_id` int(11)
,`teaching_domain_id` int(11)
,`hours_available` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_school_needs`
-- (See below for the actual view)
--
CREATE TABLE `view_school_needs` (
`school_id` int(11)
,`teaching_domain_id` int(11)
,`hours_needed` decimal(42,0)
);

-- --------------------------------------------------------

--
-- Structure for view `needs_report`
--
DROP TABLE IF EXISTS `needs_report`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `needs_report`  AS SELECT `s`.`id` AS `school_id`, `s`.`name` AS `school_name`, `s`.`region` AS `region`, `s`.`division` AS `division`, `d`.`id` AS `teaching_domain_id`, `d`.`name` AS `domain_name`, coalesce(`n`.`hours_needed`,0) AS `hours_needed`, coalesce(`a`.`hours_available`,0) AS `hours_available`, coalesce(`a`.`hours_available`,0) - coalesce(`n`.`hours_needed`,0) AS `balance` FROM (((`schools` `s` join `ref_teaching_domains` `d`) left join `view_school_needs` `n` on(`s`.`id` = `n`.`school_id` and `d`.`id` = `n`.`teaching_domain_id`)) left join `view_school_availability` `a` on(`s`.`id` = `a`.`school_id` and `d`.`id` = `a`.`teaching_domain_id`)) WHERE coalesce(`n`.`hours_needed`,0) > 0 OR coalesce(`a`.`hours_available`,0) > 0 ;

-- --------------------------------------------------------

--
-- Structure for view `view_school_availability`
--
DROP TABLE IF EXISTS `view_school_availability`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_school_availability`  AS SELECT `pp`.`school_id` AS `school_id`, `p`.`teaching_domain_id` AS `teaching_domain_id`, sum(case when `pp`.`admin_position_code` is not null then `adm`.`max_teaching_hours` else `grd`.`base_weekly_hours` end) AS `hours_available` FROM ((((`personnel` `p` join `personnel_postings` `pp` on(`p`.`matricule` = `pp`.`personnel_matricule`)) join `ref_grades` `grd` on(`p`.`grade_code` = `grd`.`grade_code`)) join `ref_personnel_status` `stat` on(`p`.`status_code` = `stat`.`code`)) left join `ref_admin_positions` `adm` on(`pp`.`admin_position_code` = `adm`.`position_code`)) WHERE `pp`.`is_active` = 1 AND `stat`.`is_active_for_capacity` = 1 GROUP BY `pp`.`school_id`, `p`.`teaching_domain_id` ;

-- --------------------------------------------------------

--
-- Structure for view `view_school_needs`
--
DROP TABLE IF EXISTS `view_school_needs`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_school_needs`  AS SELECT `ss`.`school_id` AS `school_id`, `sub`.`domain_id` AS `teaching_domain_id`, sum(`ss`.`number_of_divisions` * `cm`.`weekly_hours`) AS `hours_needed` FROM ((`school_structure_inputs` `ss` join `curriculum_matrix` `cm` on(`ss`.`class_level_id` = `cm`.`class_level_id` and `ss`.`series_id` = `cm`.`series_id`)) join `ref_subjects` `sub` on(`cm`.`subject_id` = `sub`.`id`)) GROUP BY `ss`.`school_id`, `sub`.`domain_id` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `curriculum_matrix`
--
ALTER TABLE `curriculum_matrix`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_curriculum` (`class_level_id`,`series_id`,`subject_id`),
  ADD KEY `series_id` (`series_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `personnel`
--
ALTER TABLE `personnel`
  ADD PRIMARY KEY (`matricule`),
  ADD KEY `grade_code` (`grade_code`),
  ADD KEY `teaching_domain_id` (`teaching_domain_id`),
  ADD KEY `idx_status` (`status_code`);

--
-- Indexes for table `personnel_postings`
--
ALTER TABLE `personnel_postings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `personnel_matricule` (`personnel_matricule`),
  ADD KEY `school_id` (`school_id`),
  ADD KEY `admin_position_code` (`admin_position_code`);

--
-- Indexes for table `ref_admin_positions`
--
ALTER TABLE `ref_admin_positions`
  ADD PRIMARY KEY (`position_code`);

--
-- Indexes for table `ref_class_levels`
--
ALTER TABLE `ref_class_levels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_unique_name` (`name`);

--
-- Indexes for table `ref_education_types`
--
ALTER TABLE `ref_education_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ref_grades`
--
ALTER TABLE `ref_grades`
  ADD PRIMARY KEY (`grade_code`);

--
-- Indexes for table `ref_personnel_status`
--
ALTER TABLE `ref_personnel_status`
  ADD PRIMARY KEY (`code`);

--
-- Indexes for table `ref_school_types`
--
ALTER TABLE `ref_school_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subsystem_id` (`subsystem_id`),
  ADD KEY `education_type_id` (`education_type_id`);

--
-- Indexes for table `ref_series`
--
ALTER TABLE `ref_series`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_unique_code` (`code`),
  ADD KEY `education_type_id` (`education_type_id`);

--
-- Indexes for table `ref_subjects`
--
ALTER TABLE `ref_subjects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `domain_id` (`domain_id`);

--
-- Indexes for table `ref_subsystems`
--
ALTER TABLE `ref_subsystems`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ref_teaching_domains`
--
ALTER TABLE `ref_teaching_domains`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subsystem_id` (`subsystem_id`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `school_type_id` (`school_type_id`);

--
-- Indexes for table `school_structure_inputs`
--
ALTER TABLE `school_structure_inputs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_school_struct` (`school_id`,`class_level_id`,`series_id`),
  ADD KEY `class_level_id` (`class_level_id`),
  ADD KEY `series_id` (`series_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `curriculum_matrix`
--
ALTER TABLE `curriculum_matrix`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `personnel_postings`
--
ALTER TABLE `personnel_postings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `ref_class_levels`
--
ALTER TABLE `ref_class_levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `ref_education_types`
--
ALTER TABLE `ref_education_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ref_school_types`
--
ALTER TABLE `ref_school_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `ref_series`
--
ALTER TABLE `ref_series`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `ref_subjects`
--
ALTER TABLE `ref_subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ref_subsystems`
--
ALTER TABLE `ref_subsystems`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `ref_teaching_domains`
--
ALTER TABLE `ref_teaching_domains`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=130;

--
-- AUTO_INCREMENT for table `school_structure_inputs`
--
ALTER TABLE `school_structure_inputs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1535;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `curriculum_matrix`
--
ALTER TABLE `curriculum_matrix`
  ADD CONSTRAINT `curriculum_matrix_ibfk_1` FOREIGN KEY (`class_level_id`) REFERENCES `ref_class_levels` (`id`),
  ADD CONSTRAINT `curriculum_matrix_ibfk_2` FOREIGN KEY (`series_id`) REFERENCES `ref_series` (`id`),
  ADD CONSTRAINT `curriculum_matrix_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `ref_subjects` (`id`);

--
-- Constraints for table `personnel`
--
ALTER TABLE `personnel`
  ADD CONSTRAINT `fk_personnel_status` FOREIGN KEY (`status_code`) REFERENCES `ref_personnel_status` (`code`),
  ADD CONSTRAINT `personnel_ibfk_1` FOREIGN KEY (`grade_code`) REFERENCES `ref_grades` (`grade_code`),
  ADD CONSTRAINT `personnel_ibfk_2` FOREIGN KEY (`teaching_domain_id`) REFERENCES `ref_teaching_domains` (`id`);

--
-- Constraints for table `personnel_postings`
--
ALTER TABLE `personnel_postings`
  ADD CONSTRAINT `personnel_postings_ibfk_1` FOREIGN KEY (`personnel_matricule`) REFERENCES `personnel` (`matricule`),
  ADD CONSTRAINT `personnel_postings_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `personnel_postings_ibfk_3` FOREIGN KEY (`admin_position_code`) REFERENCES `ref_admin_positions` (`position_code`);

--
-- Constraints for table `ref_school_types`
--
ALTER TABLE `ref_school_types`
  ADD CONSTRAINT `ref_school_types_ibfk_1` FOREIGN KEY (`subsystem_id`) REFERENCES `ref_subsystems` (`id`),
  ADD CONSTRAINT `ref_school_types_ibfk_2` FOREIGN KEY (`education_type_id`) REFERENCES `ref_education_types` (`id`);

--
-- Constraints for table `ref_series`
--
ALTER TABLE `ref_series`
  ADD CONSTRAINT `ref_series_ibfk_1` FOREIGN KEY (`education_type_id`) REFERENCES `ref_education_types` (`id`);

--
-- Constraints for table `ref_subjects`
--
ALTER TABLE `ref_subjects`
  ADD CONSTRAINT `ref_subjects_ibfk_1` FOREIGN KEY (`domain_id`) REFERENCES `ref_teaching_domains` (`id`);

--
-- Constraints for table `ref_teaching_domains`
--
ALTER TABLE `ref_teaching_domains`
  ADD CONSTRAINT `ref_teaching_domains_ibfk_1` FOREIGN KEY (`subsystem_id`) REFERENCES `ref_subsystems` (`id`);

--
-- Constraints for table `schools`
--
ALTER TABLE `schools`
  ADD CONSTRAINT `schools_ibfk_1` FOREIGN KEY (`school_type_id`) REFERENCES `ref_school_types` (`id`);

--
-- Constraints for table `school_structure_inputs`
--
ALTER TABLE `school_structure_inputs`
  ADD CONSTRAINT `school_structure_inputs_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `school_structure_inputs_ibfk_2` FOREIGN KEY (`class_level_id`) REFERENCES `ref_class_levels` (`id`),
  ADD CONSTRAINT `school_structure_inputs_ibfk_3` FOREIGN KEY (`series_id`) REFERENCES `ref_series` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
