-- ============================================================
-- QR Code Attendance Management System - Database Schema
-- Liceo de Cagayan University
-- ============================================================

CREATE DATABASE IF NOT EXISTS liceo_attendance;
USE liceo_attendance;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    university_id VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    role ENUM('student', 'instructor', 'admin') NOT NULL DEFAULT 'student',
    department VARCHAR(100),
    profile_photo VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COURSES TABLE
-- ============================================================
CREATE TABLE courses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    description TEXT,
    units INT DEFAULT 3,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CLASS SECTIONS TABLE
-- ============================================================
CREATE TABLE class_sections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    instructor_id INT UNSIGNED NOT NULL,
    section_name VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester ENUM('1st', '2nd', 'summer') NOT NULL,
    schedule_day VARCHAR(50) NOT NULL,
    schedule_time_start TIME NOT NULL,
    schedule_time_end TIME NOT NULL,
    room VARCHAR(50),
    max_students INT DEFAULT 40,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_instructor (instructor_id),
    INDEX idx_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ENROLLMENTS TABLE
-- ============================================================
CREATE TABLE enrollments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id INT UNSIGNED NOT NULL,
    class_section_id INT UNSIGNED NOT NULL,
    enrollment_date DATE NOT NULL,
    status ENUM('active', 'dropped', 'incomplete', 'pending', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_enrollment (student_id, class_section_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_section (class_section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CLASS SESSIONS TABLE
-- ============================================================
CREATE TABLE class_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_section_id INT UNSIGNED NOT NULL,
    session_date DATE NOT NULL,
    topic VARCHAR(200),
    notes TEXT,
    late_threshold_minutes INT DEFAULT 15 COMMENT 'Minutes after start to be marked as late',
    status ENUM('scheduled', 'active', 'ended', 'cancelled') DEFAULT 'scheduled',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_class_section (class_section_id),
    INDEX idx_session_date (session_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- QR SESSIONS TABLE
-- ============================================================
CREATE TABLE qr_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_session_id INT UNSIGNED NOT NULL,
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    qr_secret VARCHAR(100) NOT NULL COMMENT 'For HMAC verification',
    expires_at DATETIME NOT NULL,
    expiration_minutes INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    scan_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
    INDEX idx_qr_token (qr_token),
    INDEX idx_expires (expires_at),
    INDEX idx_session (class_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
CREATE TABLE attendance (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id INT UNSIGNED NOT NULL,
    class_session_id INT UNSIGNED NOT NULL,
    qr_session_id INT UNSIGNED,
    status ENUM('present', 'late', 'absent', 'excused') NOT NULL DEFAULT 'absent',
    scan_time DATETIME,
    manual_override BOOLEAN DEFAULT FALSE,
    override_by INT UNSIGNED,
    override_reason TEXT,
    ip_address VARCHAR(45),
    device_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attendance (student_id, class_session_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (qr_session_id) REFERENCES qr_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (override_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_student (student_id),
    INDEX idx_session (class_session_id),
    INDEX idx_status (status),
    INDEX idx_scan_time (scan_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================
CREATE TABLE audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT UNSIGNED,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE refresh_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token(100)),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Default admin user (password: Admin@2024)
INSERT INTO users (university_id, email, password_hash, first_name, last_name, role, department, is_active, email_verified)
VALUES (
    'ADMIN-001',
    'admin@liceo.edu.ph',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.6L/g5oNDlMI1K',
    'System',
    'Administrator',
    'admin',
    'IT Department',
    TRUE,
    TRUE
);

-- Sample instructor
INSERT INTO users (university_id, email, password_hash, first_name, last_name, role, department, is_active, email_verified)
VALUES (
    'INS-2024-001',
    'instructor@liceo.edu.ph',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.6L/g5oNDlMI1K',
    'Maria',
    'Santos',
    'instructor',
    'College of Engineering',
    TRUE,
    TRUE
);

-- Sample student
INSERT INTO users (university_id, email, password_hash, first_name, last_name, role, department, is_active, email_verified)
VALUES (
    'STU-2024-001',
    'student@liceo.edu.ph',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.6L/g5oNDlMI1K',
    'Juan',
    'Dela Cruz',
    'student',
    'College of Engineering',
    TRUE,
    TRUE
);

-- Sample course
INSERT INTO courses (course_code, course_name, description, units, department) VALUES
  ('CS101', 'Introduction to Computer Science', 'Fundamentals of computing and programming', 3, 'College of Engineering'),
  ('CS201', 'Data Structures and Algorithms',   'Core data structures and algorithm design',  3, 'College of Engineering'),
  ('MATH101','Calculus I',                       'Differential and integral calculus',          3, 'College of Science');

-- Sample class sections
INSERT INTO class_sections (course_id, instructor_id, section_name, academic_year, semester, schedule_day, schedule_time_start, schedule_time_end, room) VALUES
  (1, 2, 'CS101-A',   '2024-2025', '1st', 'MWF', '08:00:00', '09:00:00', 'Room 101'),
  (2, 2, 'CS201-A',   '2024-2025', '1st', 'TTH', '10:00:00', '11:30:00', 'Room 205'),
  (3, 2, 'MATH101-A', '2024-2025', '1st', 'MWF', '13:00:00', '14:00:00', 'Room 302');

-- Sample enrollment (student 3 in all 3 sections)
INSERT INTO enrollments (student_id, class_section_id, enrollment_date, status) VALUES
  (3, 1, CURDATE(), 'active'),
  (3, 2, CURDATE(), 'active'),
  (3, 3, CURDATE(), 'active');

-- Sample class session (active today)
INSERT INTO class_sessions (class_section_id, session_date, topic, notes, late_threshold_minutes, status, created_by) VALUES
  (1, CURDATE(), 'Introduction & Course Overview', 'First day of class', 15, 'active', 2),
  (2, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Arrays and Linked Lists', NULL, 15, 'ended', 2),
  (3, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Limits and Continuity', NULL, 15, 'ended', 2);

-- Sample attendance records for past sessions
INSERT INTO attendance (student_id, class_session_id, status, scan_time) VALUES
  (3, 2, 'present', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (3, 3, 'late',    DATE_SUB(NOW(), INTERVAL 4 DAY));

-- Absent record for today's active session (auto-generated on session creation)
INSERT IGNORE INTO attendance (student_id, class_session_id, status) VALUES
  (3, 1, 'absent');
