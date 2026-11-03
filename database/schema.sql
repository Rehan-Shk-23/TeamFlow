CREATE DATABASE IF NOT EXISTS teamflow_db;
USE teamflow_db;

-- 1. Users Table (Supports Student and Faculty Roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'faculty') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    role_in_team VARCHAR(50) DEFAULT 'Member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    faculty_mentor_id INT NULL,
    team_id INT NULL,
    health_score INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_mentor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- 5. Project Members
CREATE TABLE IF NOT EXISTS project_members (
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role_in_team VARCHAR(50) DEFAULT 'Member',
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Tasks Table (Kanban Board Items)
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tag VARCHAR(50) DEFAULT 'General',
    assignee_id INT NULL,
    status ENUM('todo', 'in-progress', 'done') DEFAULT 'todo',
    deadline DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Project Files Table (Resource & Document Sharing)
CREATE TABLE IF NOT EXISTS project_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size INT DEFAULT 0,
    file_type VARCHAR(100) DEFAULT '',
    uploaded_by INT NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Project File Activities Table (Audit Log of Uploads and Updates)
CREATE TABLE IF NOT EXISTS project_file_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_id INT NULL,
    file_name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    action ENUM('uploaded', 'updated') NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Seed Initial Demo Data
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Shaikh Rehan', 'rehan@teamflow.edu', '123456', 'student'),
(2, 'Dr. Faculty Mentor', 'faculty@teamflow.edu', '123456', 'faculty')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO teams (id, name, description, created_by) VALUES
(1, 'Engineering Core', 'Primary development team for the CS capstone project', 1)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(1, 1, 'Lead'),
(1, 2, 'Advisor')
ON DUPLICATE KEY UPDATE team_id=team_id;

INSERT INTO projects (id, title, description, created_by, faculty_mentor_id, team_id) VALUES
(1, 'Final Year CS Project', 'Academic project management platform', 1, 2, 1)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO project_members (project_id, user_id, role_in_team) VALUES
(1, 1, 'Lead Developer')
ON DUPLICATE KEY UPDATE project_id=project_id;