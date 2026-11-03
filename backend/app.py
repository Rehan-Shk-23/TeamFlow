import os
import uuid
import re
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import mysql.connector

app = Flask(__name__)
app.config['SECRET_KEY'] = 'teamflow-secret-key'
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file upload

CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="password",
        database="teamflow_db"
    )

def init_db():
    """Auto-create teams tables and add team_id to projects if missing."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_members (
            team_id INT NOT NULL,
            user_id INT NOT NULL,
            role_in_team VARCHAR(50) DEFAULT 'Member',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (team_id, user_id),
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # Add team_id column to projects if it doesn't exist
    try:
        cursor.execute("ALTER TABLE projects ADD COLUMN team_id INT NULL")
        cursor.execute("ALTER TABLE projects ADD CONSTRAINT fk_project_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL")
    except Exception:
        pass  # Column already exists

    # Project Files Table
    cursor.execute("""
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
        )
    """)

    # Project File Activities Table (Audit log of who uploaded, updated, or deleted files)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_file_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            file_id INT NULL,
            file_name VARCHAR(255) NOT NULL,
            user_id INT NOT NULL,
            action VARCHAR(50) NOT NULL,
            version INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Upgrade action column to VARCHAR(50) in case it was created as ENUM
    try:
        cursor.execute("ALTER TABLE project_file_activities MODIFY COLUMN action VARCHAR(50) NOT NULL")
    except Exception:
        pass

    # Backfill initial activities for existing files
    try:
        cursor.execute("""
            INSERT INTO project_file_activities (project_id, file_id, file_name, user_id, action, version, created_at)
            SELECT pf.project_id, pf.id, pf.original_name, pf.uploaded_by,
                   IF(pf.version > 1, 'updated', 'uploaded'), pf.version, pf.updated_at
            FROM project_files pf
            WHERE NOT EXISTS (
                SELECT 1 FROM project_file_activities pfa WHERE pfa.file_id = pf.id
            )
        """)
    except Exception:
        pass
    
    conn.commit()
    cursor.close()
    conn.close()

# --- WEBSOCKET ROOM HANDLERS ---

@socketio.on('join_project')
def handle_join_project(data):
    project_id = str(data.get('project_id'))
    join_room(project_id)

@socketio.on('leave_project')
def handle_leave_project(data):
    project_id = str(data.get('project_id'))
    leave_room(project_id)

# --- AUTHENTICATION ---

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name, email, role, password_hash FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or user['password_hash'] != password:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    if user['role'] != role:
        return jsonify({
            "success": False, 
            "message": f"Unauthorized: Account registered as {user['role']}."
        }), 403

    return jsonify({
        "success": True,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role']
        }
    }), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'student')

    if not name or not email or not password:
        return jsonify({"success": False, "message": "Name, email, and password are required"}), 400

    if (len(password) < 8 or 
        not re.search(r'[a-zA-Z]', password) or 
        not re.search(r'\d', password) or 
        not re.search(r'[^a-zA-Z0-9]', password)):
        return jsonify({
            "success": False, 
            "message": "Password must be at least 8 characters long and contain at least one alphabet, one number, and one symbol"
        }), 400

    if role not in ('student', 'faculty'):
        return jsonify({"success": False, "message": "Role must be 'student' or 'faculty'"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if email already exists
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    existing = cursor.fetchone()
    if existing:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "An account with this email already exists"}), 409

    cursor.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)",
        (name, email, password, role)
    )
    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({
        "success": True,
        "user": {
            "id": new_id,
            "name": name,
            "email": email,
            "role": role
        }
    }), 201

# --- USERS LIST ---

@app.route('/api/users', methods=['GET'])
def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name, email, role FROM users ORDER BY name ASC")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(users), 200

# --- TEAMS ---

@app.route('/api/teams', methods=['GET'])
def get_teams():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Check if user is faculty — faculty sees ALL teams
    is_faculty = False
    if user_id:
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        req_user = cursor.fetchone()
        is_faculty = req_user and req_user['role'] == 'faculty'

    if not user_id or is_faculty:
        query = """
            SELECT t.*, u.name AS creator_name,
                (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
                (SELECT COUNT(*) FROM projects WHERE team_id = t.id) AS project_count
            FROM teams t
            JOIN users u ON t.created_by = u.id
            ORDER BY t.id DESC
        """
        cursor.execute(query)
    else:
        query = """
            SELECT DISTINCT t.*, u.name AS creator_name,
                (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
                (SELECT COUNT(*) FROM projects WHERE team_id = t.id) AS project_count
            FROM teams t
            JOIN users u ON t.created_by = u.id
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE t.created_by = %s OR tm.user_id = %s
            ORDER BY t.id DESC
        """
        cursor.execute(query, (user_id, user_id))
    
    teams = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(teams), 200


@app.route('/api/teams', methods=['POST'])
def create_team():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    created_by = data.get('created_by')
    member_ids = data.get('member_ids', [])

    if not name or not created_by:
        return jsonify({"error": "name and created_by are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "INSERT INTO teams (name, description, created_by) VALUES (%s, %s, %s)",
        (name, description, created_by)
    )
    conn.commit()
    team_id = cursor.lastrowid

    # Add creator as Lead
    cursor.execute(
        "INSERT INTO team_members (team_id, user_id, role_in_team) VALUES (%s, %s, 'Lead')",
        (team_id, created_by)
    )

    # Add additional members
    for uid in member_ids:
        if int(uid) != int(created_by):
            try:
                cursor.execute(
                    "INSERT INTO team_members (team_id, user_id, role_in_team) VALUES (%s, %s, 'Member')",
                    (team_id, uid)
                )
            except Exception:
                pass

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "id": team_id,
        "name": name,
        "description": description,
        "created_by": created_by,
        "member_count": len(member_ids) + 1
    }), 201


@app.route('/api/teams/<int:team_id>/members', methods=['GET'])
def get_team_members(team_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT u.id, u.name, u.email, u.role, tm.role_in_team
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = %s
        ORDER BY tm.role_in_team ASC, u.name ASC
    """
    cursor.execute(query, (team_id,))
    members = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(members), 200


@app.route('/api/teams/<int:team_id>/members', methods=['POST'])
def add_team_member(team_id):
    data = request.get_json()
    user_id = data.get('user_id')
    requested_by = data.get('requested_by')
    role_in_team = data.get('role_in_team', 'Member')

    if not user_id or not requested_by:
        return jsonify({"error": "user_id and requested_by are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check authorization: must be faculty OR team lead
    cursor.execute("SELECT role FROM users WHERE id = %s", (requested_by,))
    req_user = cursor.fetchone()
    is_faculty = req_user and req_user['role'] == 'faculty'

    cursor.execute("SELECT role_in_team FROM team_members WHERE team_id = %s AND user_id = %s", (team_id, requested_by))
    membership = cursor.fetchone()
    is_lead = membership and membership['role_in_team'] == 'Lead'

    if not is_faculty and not is_lead:
        cursor.close()
        conn.close()
        return jsonify({"error": "Only the team lead or faculty can add members"}), 403

    try:
        cursor.execute(
            "INSERT INTO team_members (team_id, user_id, role_in_team) VALUES (%s, %s, %s)",
            (team_id, user_id, role_in_team)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"error": "Member already exists or invalid data"}), 409

    cursor.close()
    conn.close()
    return jsonify({"success": True}), 201


@app.route('/api/teams/<int:team_id>/members/<int:member_id>', methods=['DELETE'])
def remove_team_member(team_id, member_id):
    requested_by = request.args.get('requested_by')

    if not requested_by:
        return jsonify({"error": "requested_by is required"}), 400

    requested_by = int(requested_by)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check authorization: must be faculty OR team lead
    cursor.execute("SELECT role FROM users WHERE id = %s", (requested_by,))
    req_user = cursor.fetchone()
    is_faculty = req_user and req_user['role'] == 'faculty'

    cursor.execute("SELECT role_in_team FROM team_members WHERE team_id = %s AND user_id = %s", (team_id, requested_by))
    membership = cursor.fetchone()
    is_lead = membership and membership['role_in_team'] == 'Lead'

    if not is_faculty and not is_lead:
        cursor.close()
        conn.close()
        return jsonify({"error": "Only the team lead or faculty can remove members"}), 403

    # Prevent removing the team lead
    cursor.execute("SELECT role_in_team FROM team_members WHERE team_id = %s AND user_id = %s", (team_id, member_id))
    target = cursor.fetchone()
    if target and target['role_in_team'] == 'Lead':
        cursor.close()
        conn.close()
        return jsonify({"error": "Cannot remove the team lead"}), 400

    cursor.execute("DELETE FROM team_members WHERE team_id = %s AND user_id = %s", (team_id, member_id))

    # Find all projects belonging to this team to unassign their tasks
    cursor.execute("SELECT id FROM projects WHERE team_id = %s", (team_id,))
    team_projects = cursor.fetchall()
    project_ids = [p['id'] for p in team_projects]

    if project_ids:
        placeholders = ', '.join(['%s'] * len(project_ids))
        # Unassign tasks assigned to this removed member in any project of this team
        cursor.execute(f"""
            UPDATE tasks
            SET assignee_id = NULL
            WHERE assignee_id = %s AND project_id IN ({placeholders})
        """, [member_id] + project_ids)

        # Remove from project_members for projects belonging to this team
        cursor.execute(f"""
            DELETE FROM project_members
            WHERE user_id = %s AND project_id IN ({placeholders})
        """, [member_id] + project_ids)

    conn.commit()
    cursor.close()
    conn.close()

    # Broadcast real-time update to all affected project boards
    for pid in project_ids:
        socketio.emit('board_updated', {"project_id": pid})

    return jsonify({"success": True}), 200

# --- PROJECTS ---

@app.route('/api/projects', methods=['GET'])
def get_user_projects():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if user is faculty — faculty sees ALL projects
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    req_user = cursor.fetchone()
    is_faculty = req_user and req_user['role'] == 'faculty'

    if is_faculty:
        query = """
            SELECT p.*, t.name AS team_name
            FROM projects p
            LEFT JOIN teams t ON p.team_id = t.id
            ORDER BY p.id DESC
        """
        cursor.execute(query)
    else:
        query = """
            SELECT DISTINCT p.*, t.name AS team_name
            FROM projects p
            LEFT JOIN project_members pm ON p.id = pm.project_id
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE p.created_by = %s OR pm.user_id = %s OR tm.user_id = %s
            ORDER BY p.id DESC
        """
        cursor.execute(query, (user_id, user_id, user_id))

    projects = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(projects), 200

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    title = data.get('title')
    description = data.get('description', '')
    team_id = data.get('team_id')
    created_by = data.get('created_by')

    if not title or not created_by:
        return jsonify({"error": "Title and created_by are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "INSERT INTO projects (title, description, created_by, team_id) VALUES (%s, %s, %s, %s)",
        (title, description, created_by, team_id)
    )
    conn.commit()
    project_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO project_members (project_id, user_id, role_in_team) VALUES (%s, %s, 'Lead')",
        (project_id, created_by)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "id": project_id,
        "title": title,
        "description": description,
        "created_by": created_by,
        "team_id": team_id,
        "health_score": 100
    }), 201

@app.route('/api/projects/<int:project_id>/members', methods=['GET'])
def get_project_team_members(project_id):
    """Get team members of the team assigned to this project."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT u.id, u.name, u.email, u.role, tm.role_in_team
        FROM projects p
        JOIN team_members tm ON p.team_id = tm.team_id
        JOIN users u ON tm.user_id = u.id
        WHERE p.id = %s
        ORDER BY u.name ASC
    """
    cursor.execute(query, (project_id,))
    members = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(members), 200

# --- TASKS ---

@app.route('/api/projects/<int:project_id>/tasks', methods=['GET'])
def get_project_tasks(project_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT t.*, u.name AS assignee_name, u.name AS assignee
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.project_id = %s
        ORDER BY t.id DESC
    """
    cursor.execute(query, (project_id,))
    tasks = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(tasks), 200

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    project_id = data.get('project_id')
    title = data.get('title')
    description = data.get('description', '')
    tag = data.get('tag', 'General')
    priority = data.get('priority', 'Medium')
    deadline = data.get('deadline')
    assignee_id = data.get('assignee_id')
    status = data.get('status', 'todo')

    # Prevent past deadline dates
    if deadline:
        from datetime import date
        try:
            dl_date = date.fromisoformat(deadline)
            if dl_date < date.today():
                return jsonify({"error": "Deadline cannot be in the past. Must be today or a future date."}), 400
        except ValueError:
            pass

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        INSERT INTO tasks (project_id, title, description, tag, priority, deadline, assignee_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(query, (project_id, title, description, tag, priority, deadline, assignee_id, status))
    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()

    # Broadcast to ALL active windows regardless of room
    socketio.emit('board_updated', {"project_id": project_id})

    return jsonify({"id": new_id, "project_id": project_id}), 201


@app.route('/api/tasks/<int:task_id>', methods=['PATCH'])
def update_task_status(task_id):
    data = request.get_json()
    new_status = data.get('status')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT project_id FROM tasks WHERE id = %s", (task_id,))
    task = cursor.fetchone()

    cursor.execute("UPDATE tasks SET status = %s WHERE id = %s", (new_status, task_id))
    conn.commit()
    cursor.close()
    conn.close()

    if task:
        # Broadcast to ALL active windows
        socketio.emit('board_updated', {"project_id": task['project_id']})

    return jsonify({"success": True, "task_id": task_id, "status": new_status}), 200

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task_details(task_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    requested_by = data.get('requested_by')
    if not requested_by:
        return jsonify({"error": "requested_by is required"}), 400

    try:
        requested_by = int(requested_by)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid requested_by user id"}), 400

    title = data.get('title')
    if not title or not title.strip():
        return jsonify({"error": "Task title is required"}), 400

    description = data.get('description', '')
    tag = data.get('tag', 'Frontend')
    priority = data.get('priority', 'Medium')
    deadline = data.get('deadline')
    assignee_id = data.get('assignee_id')
    status = data.get('status', 'todo')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT t.id, t.project_id, t.deadline AS current_deadline, p.team_id, p.created_by AS project_creator
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = %s
    """, (task_id,))
    task_info = cursor.fetchone()

    if not task_info:
        cursor.close()
        conn.close()
        return jsonify({"error": "Task not found"}), 404

    # Check authorization: Faculty OR Team Lead
    cursor.execute("SELECT role FROM users WHERE id = %s", (requested_by,))
    user = cursor.fetchone()
    is_faculty = user and user['role'] == 'faculty'

    is_lead = False
    if task_info.get('team_id'):
        cursor.execute("""
            SELECT role_in_team FROM team_members 
            WHERE team_id = %s AND user_id = %s
        """, (task_info['team_id'], requested_by))
        tm = cursor.fetchone()
        if tm and tm['role_in_team'] == 'Lead':
            is_lead = True

    if not is_lead:
        cursor.execute("""
            SELECT role_in_team FROM project_members
            WHERE project_id = %s AND user_id = %s
        """, (task_info['project_id'], requested_by))
        pm = cursor.fetchone()
        if pm and pm['role_in_team'] == 'Lead':
            is_lead = True

    if not is_faculty and not is_lead:
        cursor.close()
        conn.close()
        return jsonify({"error": "Only faculty and team leads can update task details"}), 403

    # Deadline validation: cannot be in the past if new or modified
    if deadline:
        from datetime import date
        try:
            dl_str = str(deadline).split('T')[0]
            dl_date = date.fromisoformat(dl_str)
            current_dl = task_info.get('current_deadline')
            current_dl_str = str(current_dl).split('T')[0] if current_dl else None
            if dl_date < date.today() and (not current_dl_str or current_dl_str != dl_str):
                cursor.close()
                conn.close()
                return jsonify({"error": "Deadline cannot be in the past."}), 400
        except ValueError:
            pass

    # Normalize assignee_id
    if assignee_id is not None and str(assignee_id).strip() != '':
        try:
            assignee_id = int(assignee_id)
        except (ValueError, TypeError):
            assignee_id = None
    else:
        assignee_id = None

    cursor.execute("""
        UPDATE tasks
        SET title = %s, description = %s, tag = %s, priority = %s, deadline = %s, assignee_id = %s, status = %s
        WHERE id = %s
    """, (title.strip(), description.strip(), tag, priority, deadline or None, assignee_id, status, task_id))
    conn.commit()

    cursor.execute("""
        SELECT t.*, u.name AS assignee_name, u.name AS assignee
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.id = %s
    """, (task_id,))
    updated_task = cursor.fetchone()

    cursor.close()
    conn.close()

    # Broadcast to ALL active windows so boards refresh in real-time
    socketio.emit('board_updated', {"project_id": task_info['project_id']})

    return jsonify({"success": True, "task": updated_task}), 200

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    requested_by = request.args.get('requested_by')
    if not requested_by:
        return jsonify({"error": "requested_by is required"}), 400

    requested_by = int(requested_by)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT t.id, t.project_id, p.team_id, p.created_by AS project_creator
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = %s
    """, (task_id,))
    task_info = cursor.fetchone()

    if not task_info:
        cursor.close()
        conn.close()
        return jsonify({"error": "Task not found"}), 404

    # Check authorization: Faculty OR Team Lead
    cursor.execute("SELECT role FROM users WHERE id = %s", (requested_by,))
    user = cursor.fetchone()
    is_faculty = user and user['role'] == 'faculty'

    is_lead = False
    if task_info.get('team_id'):
        cursor.execute("""
            SELECT role_in_team FROM team_members 
            WHERE team_id = %s AND user_id = %s
        """, (task_info['team_id'], requested_by))
        tm = cursor.fetchone()
        if tm and tm['role_in_team'] == 'Lead':
            is_lead = True

    if not is_lead:
        cursor.execute("""
            SELECT role_in_team FROM project_members
            WHERE project_id = %s AND user_id = %s
        """, (task_info['project_id'], requested_by))
        pm = cursor.fetchone()
        if pm and pm['role_in_team'] == 'Lead':
            is_lead = True

    if not is_faculty and not is_lead:
        cursor.close()
        conn.close()
        return jsonify({"error": "Only faculty and team leads can delete tasks"}), 403

    cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
    conn.commit()
    cursor.close()
    conn.close()

    # Broadcast to ALL active windows so boards refresh
    socketio.emit('board_updated', {"project_id": task_info['project_id']})

    return jsonify({"success": True, "message": "Task deleted successfully"}), 200

# --- AI HEALTH SCORE ---

@app.route('/api/projects/<int:project_id>/health', methods=['GET'])
def get_project_health(project_id):
    from datetime import date, timedelta

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch all tasks for this project with full detail
    cursor.execute("""
        SELECT id, title, status, priority, deadline, assignee_id, created_at
        FROM tasks WHERE project_id = %s
    """, (project_id,))
    tasks = cursor.fetchall()
    cursor.close()
    conn.close()

    total = len(tasks)
    if total == 0:
        return jsonify({
            "project_id": project_id,
            "health_score": 100,
            "label": "No Tasks",
            "factors": {
                "weighted_completion": 100,
                "overdue_penalty": 0,
                "stagnation_penalty": 0,
                "imbalance_penalty": 0
            },
            "insights": ["No tasks created yet — project health is at baseline."]
        }), 200

    # --- PRIORITY WEIGHTS ---
    PRIORITY_WEIGHTS = {'High': 3, 'Medium': 2, 'Low': 1}

    today = date.today()
    insights = []

    # =========================================================
    # FACTOR 1: Priority-Weighted Completion (0–100)
    # =========================================================
    total_weight = 0
    done_weight = 0
    for t in tasks:
        w = PRIORITY_WEIGHTS.get(t.get('priority', ''), 1)
        total_weight += w
        if t['status'] == 'done':
            done_weight += w

    weighted_completion = round((done_weight / total_weight) * 100) if total_weight > 0 else 0

    # =========================================================
    # FACTOR 2: Overdue Task Penalty
    #   -5 per overdue Low task, -8 per overdue Medium, -12 per overdue High
    # =========================================================
    overdue_penalty = 0
    overdue_count = 0
    for t in tasks:
        if t['status'] != 'done' and t.get('deadline'):
            dl = t['deadline']
            if isinstance(dl, str):
                dl = date.fromisoformat(dl)
            if dl < today:
                overdue_count += 1
                w = PRIORITY_WEIGHTS.get(t.get('priority', ''), 1)
                if w == 3:
                    overdue_penalty += 12
                elif w == 2:
                    overdue_penalty += 8
                else:
                    overdue_penalty += 5

    if overdue_count > 0:
        insights.append(f"{overdue_count} task{'s' if overdue_count > 1 else ''} overdue — costing {overdue_penalty}% health.")

    # =========================================================
    # FACTOR 3: Stagnation Penalty
    #   Tasks stuck in 'in-progress' for 5+ days lose points
    #   5-7 days: -3 each, 8+ days: -6 each
    # =========================================================
    stagnation_penalty = 0
    stagnant_count = 0
    for t in tasks:
        if t['status'] == 'in-progress' and t.get('created_at'):
            created = t['created_at']
            if isinstance(created, str):
                from datetime import datetime
                created = datetime.fromisoformat(created).date()
            elif hasattr(created, 'date'):
                created = created.date()
            days_active = (today - created).days
            if days_active >= 8:
                stagnation_penalty += 6
                stagnant_count += 1
            elif days_active >= 5:
                stagnation_penalty += 3
                stagnant_count += 1

    if stagnant_count > 0:
        insights.append(f"{stagnant_count} task{'s' if stagnant_count > 1 else ''} stagnant in 'In Progress' for 5+ days — costing {stagnation_penalty}% health.")

    # =========================================================
    # FACTOR 4: Workload Imbalance Penalty
    #   If one member has 3x+ more incomplete tasks than average → -5
    # =========================================================
    imbalance_penalty = 0
    assignee_loads = {}
    for t in tasks:
        if t['status'] != 'done' and t.get('assignee_id'):
            assignee_loads[t['assignee_id']] = assignee_loads.get(t['assignee_id'], 0) + 1

    if len(assignee_loads) >= 2:
        load_values = list(assignee_loads.values())
        avg_load = sum(load_values) / len(load_values)
        max_load = max(load_values)
        if avg_load > 0 and max_load >= 3 * avg_load:
            imbalance_penalty = 5
            insights.append(f"Workload imbalance detected — one member has {max_load} tasks vs avg {avg_load:.1f}.")

    # =========================================================
    # FINAL SCORE CALCULATION
    # =========================================================
    raw_score = weighted_completion - overdue_penalty - stagnation_penalty - imbalance_penalty
    health_score = max(0, min(100, raw_score))

    # Determine label
    if health_score >= 80:
        label = "Healthy"
    elif health_score >= 60:
        label = "At Risk"
    elif health_score >= 40:
        label = "Needs Attention"
    else:
        label = "Critical"

    # Add positive insights
    done_count = sum(1 for t in tasks if t['status'] == 'done')
    if done_count == total:
        insights.insert(0, "All tasks completed — project is fully delivered!")
    elif weighted_completion >= 75:
        insights.insert(0, f"Strong progress — {weighted_completion}% weighted completion.")
    elif weighted_completion >= 50:
        insights.insert(0, f"Moderate progress — {weighted_completion}% weighted completion.")

    if not insights:
        insights.append("Project is on track with no detected risks.")

    return jsonify({
        "project_id": project_id,
        "health_score": health_score,
        "label": label,
        "factors": {
            "weighted_completion": weighted_completion,
            "overdue_penalty": overdue_penalty,
            "stagnation_penalty": stagnation_penalty,
            "imbalance_penalty": imbalance_penalty
        },
        "insights": insights
    }), 200

# --- OVERVIEW & USER TASKS ---

@app.route('/api/users/<int:user_id>/overview', methods=['GET'])
def get_user_overview(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if user is faculty — faculty sees global overview
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    req_user = cursor.fetchone()
    is_faculty = req_user and req_user['role'] == 'faculty'

    if is_faculty:
        # Faculty: count ALL projects
        cursor.execute("SELECT COUNT(*) AS active_projects FROM projects")
        active_projects = cursor.fetchone()['active_projects']

        # Faculty: count ALL pending tasks
        cursor.execute("SELECT COUNT(*) AS active_tasks FROM tasks WHERE status != 'done'")
        active_tasks = cursor.fetchone()['active_tasks']

        # Faculty: show ALL upcoming deadlines
        cursor.execute("""
            SELECT t.id, t.title, t.priority, t.status, t.deadline, p.title AS project_title
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.status != 'done' AND t.deadline IS NOT NULL
            ORDER BY t.deadline ASC
            LIMIT 5
        """)
        due_soon_tasks = cursor.fetchall()
    else:
        cursor.execute("""
            SELECT COUNT(DISTINCT p.id) AS active_projects
            FROM projects p
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE p.created_by = %s OR pm.user_id = %s
        """, (user_id, user_id))
        active_projects = cursor.fetchone()['active_projects']

        cursor.execute("SELECT COUNT(*) AS active_tasks FROM tasks WHERE assignee_id = %s AND status != 'done'", (user_id,))
        active_tasks = cursor.fetchone()['active_tasks']

        cursor.execute("""
            SELECT t.id, t.title, t.priority, t.status, t.deadline, p.title AS project_title
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.assignee_id = %s AND t.status != 'done' AND t.deadline IS NOT NULL
            ORDER BY t.deadline ASC
            LIMIT 5
        """, (user_id,))
        due_soon_tasks = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "active_projects": active_projects,
        "active_tasks": active_tasks,
        "due_soon": due_soon_tasks
    }), 200

@app.route('/api/users/<int:user_id>/my-tasks', methods=['GET'])
def get_user_assigned_tasks(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if user is faculty — faculty sees ALL tasks
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    req_user = cursor.fetchone()
    is_faculty = req_user and req_user['role'] == 'faculty'

    if is_faculty:
        query = """
            SELECT t.*, p.title AS project_title, u.name AS assignee_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assignee_id = u.id
            ORDER BY 
                CASE t.priority 
                    WHEN 'High' THEN 1 
                    WHEN 'Medium' THEN 2 
                    WHEN 'Low' THEN 3 
                    ELSE 4 
                END ASC,
                t.deadline ASC
        """
        cursor.execute(query)
    else:
        query = """
            SELECT t.*, p.title AS project_title
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.assignee_id = %s
            ORDER BY 
                CASE t.priority 
                    WHEN 'High' THEN 1 
                    WHEN 'Medium' THEN 2 
                    WHEN 'Low' THEN 3 
                    ELSE 4 
                END ASC,
                t.deadline ASC
        """
        cursor.execute(query, (user_id,))

    tasks = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(tasks), 200

# --- ASSIGN PROJECT TO TEAM (Faculty Only) ---

@app.route('/api/projects/unassigned', methods=['GET'])
def get_unassigned_projects():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, title, description FROM projects WHERE team_id IS NULL ORDER BY id DESC")
    projects = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(projects), 200

@app.route('/api/teams/<int:team_id>/assign-project', methods=['POST'])
def assign_project_to_team(team_id):
    data = request.get_json()
    project_id = data.get('project_id')
    user_id = data.get('user_id')  # the logged-in user requesting this

    if not project_id or not user_id:
        return jsonify({"error": "project_id and user_id are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check that user is faculty
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    if not user or user['role'] != 'faculty':
        cursor.close()
        conn.close()
        return jsonify({"error": "Only faculty members can assign projects to teams"}), 403

    # Assign the project to the team
    cursor.execute("UPDATE projects SET team_id = %s WHERE id = %s", (team_id, project_id))
    conn.commit()

    # Also add all team members as project members (if not already)
    cursor.execute("SELECT user_id FROM team_members WHERE team_id = %s", (team_id,))
    team_member_ids = [row['user_id'] for row in cursor.fetchall()]
    for uid in team_member_ids:
        try:
            cursor.execute(
                "INSERT INTO project_members (project_id, user_id, role_in_team) VALUES (%s, %s, 'Member')",
                (project_id, uid)
            )
        except Exception:
            pass  # Already a member
    conn.commit()

    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "Project assigned to team successfully"}), 200

# --- PROJECT FILES SYSTEM ---

@app.route('/api/projects/<int:project_id>/files', methods=['GET'])
def get_project_files(project_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT pf.*, u.name AS uploader_name, u.role AS uploader_role
        FROM project_files pf
        JOIN users u ON pf.uploaded_by = u.id
        WHERE pf.project_id = %s
        ORDER BY pf.updated_at DESC
    """, (project_id,))
    files = cursor.fetchall()
    cursor.close()
    conn.close()

    for f in files:
        if f.get('created_at'):
            f['created_at'] = f['created_at'].isoformat()
        if f.get('updated_at'):
            f['updated_at'] = f['updated_at'].isoformat()

    return jsonify(files), 200

@app.route('/api/projects/<int:project_id>/files', methods=['POST'])
def upload_project_file(project_id):
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    user_id = request.form.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    original_name = file.filename
    ext = os.path.splitext(original_name)[1].lower().replace('.', '')
    unique_filename = f"{project_id}_{uuid.uuid4().hex[:8]}_{secure_filename(original_name)}"
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(save_path)
    file_size = os.path.getsize(save_path)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        INSERT INTO project_files (project_id, file_name, original_name, file_size, file_type, uploaded_by, version)
        VALUES (%s, %s, %s, %s, %s, %s, 1)
    """, (project_id, unique_filename, original_name, file_size, ext, user_id))
    new_id = cursor.lastrowid

    # Log upload activity
    try:
        cursor.execute("""
            INSERT INTO project_file_activities (project_id, file_id, file_name, user_id, action, version)
            VALUES (%s, %s, %s, %s, 'uploaded', 1)
        """, (project_id, new_id, original_name, user_id))
    except Exception:
        pass

    conn.commit()

    cursor.execute("""
        SELECT pf.*, u.name AS uploader_name, u.role AS uploader_role
        FROM project_files pf
        JOIN users u ON pf.uploaded_by = u.id
        WHERE pf.id = %s
    """, (new_id,))
    new_file = cursor.fetchone()
    cursor.close()
    conn.close()

    if new_file.get('created_at'):
        new_file['created_at'] = new_file['created_at'].isoformat()
    if new_file.get('updated_at'):
        new_file['updated_at'] = new_file['updated_at'].isoformat()

    return jsonify({"success": True, "file": new_file}), 201

@app.route('/api/projects/<int:project_id>/files/<int:file_id>/reupload', methods=['POST'])
def reupload_project_file(project_id, file_id):
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    user_id = request.form.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM project_files WHERE id = %s AND project_id = %s", (file_id, project_id))
    existing = cursor.fetchone()

    if not existing:
        cursor.close()
        conn.close()
        return jsonify({"error": "File not found"}), 404

    # Delete previous physical file if it exists
    old_path = os.path.join(app.config['UPLOAD_FOLDER'], existing['file_name'])
    if os.path.exists(old_path):
        try:
            os.remove(old_path)
        except Exception:
            pass

    original_name = file.filename
    ext = os.path.splitext(original_name)[1].lower().replace('.', '')
    new_filename = f"{project_id}_{uuid.uuid4().hex[:8]}_{secure_filename(original_name)}"
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
    file.save(save_path)
    file_size = os.path.getsize(save_path)

    new_version = (existing.get('version') or 1) + 1

    cursor.execute("""
        UPDATE project_files 
        SET file_name = %s, original_name = %s, file_size = %s, file_type = %s, uploaded_by = %s, version = %s, updated_at = NOW()
        WHERE id = %s
    """, (new_filename, original_name, file_size, ext, user_id, new_version, file_id))

    # Log update activity
    try:
        cursor.execute("""
            INSERT INTO project_file_activities (project_id, file_id, file_name, user_id, action, version)
            VALUES (%s, %s, %s, %s, 'updated', %s)
        """, (project_id, file_id, original_name, user_id, new_version))
    except Exception:
        pass

    conn.commit()

    cursor.execute("""
        SELECT pf.*, u.name AS uploader_name, u.role AS uploader_role
        FROM project_files pf
        JOIN users u ON pf.uploaded_by = u.id
        WHERE pf.id = %s
    """, (file_id,))
    updated_file = cursor.fetchone()
    cursor.close()
    conn.close()

    if updated_file.get('created_at'):
        updated_file['created_at'] = updated_file['created_at'].isoformat()
    if updated_file.get('updated_at'):
        updated_file['updated_at'] = updated_file['updated_at'].isoformat()

    return jsonify({"success": True, "file": updated_file}), 200

@app.route('/api/projects/<int:project_id>/file-activities', methods=['GET'])
def get_project_file_activities(project_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT pfa.*, u.name AS user_name, u.role AS user_role
        FROM project_file_activities pfa
        JOIN users u ON pfa.user_id = u.id
        WHERE pfa.project_id = %s
        ORDER BY pfa.created_at DESC
    """, (project_id,))
    activities = cursor.fetchall()
    cursor.close()
    conn.close()

    for a in activities:
        if a.get('created_at'):
            a['created_at'] = a['created_at'].isoformat()

    return jsonify(activities), 200

@app.route('/api/files/<int:file_id>/download', methods=['GET'])
def download_project_file(file_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT file_name, original_name FROM project_files WHERE id = %s", (file_id,))
    file_row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not file_row:
        return jsonify({"error": "File not found"}), 404

    return send_from_directory(
        app.config['UPLOAD_FOLDER'],
        file_row['file_name'],
        as_attachment=True,
        download_name=file_row['original_name']
    )

@app.route('/api/files/<int:file_id>', methods=['DELETE'])
def delete_project_file(file_id):
    requested_by = request.args.get('requested_by')
    if not requested_by:
        return jsonify({"error": "requested_by is required"}), 400

    requested_by = int(requested_by)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT pf.file_name, pf.original_name, pf.version, pf.project_id, p.team_id, p.created_by AS project_creator
        FROM project_files pf
        JOIN projects p ON pf.project_id = p.id
        WHERE pf.id = %s
    """, (file_id,))
    file_info = cursor.fetchone()

    if not file_info:
        cursor.close()
        conn.close()
        return jsonify({"error": "File not found"}), 404

    # Check authorization: Faculty OR Team Lead
    cursor.execute("SELECT role FROM users WHERE id = %s", (requested_by,))
    user = cursor.fetchone()
    is_faculty = user and user['role'] == 'faculty'

    is_lead = False
    if file_info.get('team_id'):
        cursor.execute("""
            SELECT role_in_team FROM team_members 
            WHERE team_id = %s AND user_id = %s
        """, (file_info['team_id'], requested_by))
        tm = cursor.fetchone()
        if tm and tm['role_in_team'] == 'Lead':
            is_lead = True

    if not is_lead:
        cursor.execute("""
            SELECT role_in_team FROM project_members
            WHERE project_id = %s AND user_id = %s
        """, (file_info['project_id'], requested_by))
        pm = cursor.fetchone()
        if pm and pm['role_in_team'] == 'Lead':
            is_lead = True

    if not is_faculty and not is_lead:
        cursor.close()
        conn.close()
        return jsonify({"error": "Only faculty and team leads can delete project files"}), 403

    # Delete physical file
    old_path = os.path.join(app.config['UPLOAD_FOLDER'], file_info['file_name'])
    if os.path.exists(old_path):
        try:
            os.remove(old_path)
        except Exception:
            pass

    # Log delete activity in audit log
    try:
        cursor.execute("""
            INSERT INTO project_file_activities (project_id, file_id, file_name, user_id, action, version)
            VALUES (%s, %s, %s, %s, 'deleted', %s)
        """, (
            file_info['project_id'],
            file_id,
            file_info.get('original_name', file_info['file_name']),
            requested_by,
            file_info.get('version', 1)
        ))
    except Exception as e:
        print("Error logging file deletion:", e)

    cursor.execute("DELETE FROM project_files WHERE id = %s", (file_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "File deleted"}), 200

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=True, port=5000)