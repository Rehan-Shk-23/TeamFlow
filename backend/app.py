from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import mysql.connector

app = Flask(__name__)
app.config['SECRET_KEY'] = 'teamflow-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="password",
        database="teamflow_db"
    )

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

# --- PROJECTS ---

@app.route('/api/projects', methods=['GET'])
def get_user_projects():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT DISTINCT p.* 
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.created_by = %s OR pm.user_id = %s
        ORDER BY p.id DESC
    """
    cursor.execute(query, (user_id, user_id))
    projects = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(projects), 200

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    title = data.get('title')
    description = data.get('description', '')
    created_by = data.get('created_by')

    if not title or not created_by:
        return jsonify({"error": "Title and created_by are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "INSERT INTO projects (title, description, created_by) VALUES (%s, %s, %s)",
        (title, description, created_by)
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
        "health_score": 100
    }), 201

# --- TASKS ---

@app.route('/api/projects/<int:project_id>/tasks', methods=['GET'])
def get_project_tasks(project_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT t.*, u.name AS assignee_name 
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

# --- HEALTH SCORE ---

@app.route('/api/projects/<int:project_id>/health', methods=['GET'])
def get_project_health(project_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT status, COUNT(*) as count FROM tasks WHERE project_id = %s GROUP BY status", (project_id,))
    stats = cursor.fetchall()
    cursor.close()
    conn.close()

    counts = {item['status']: item['count'] for item in stats}
    total = sum(counts.values())
    done = counts.get('done', 0)
    score = int((done / total) * 100) if total > 0 else 100

    return jsonify({"project_id": project_id, "health_score": score}), 200

# --- OVERVIEW & USER TASKS ---

@app.route('/api/users/<int:user_id>/overview', methods=['GET'])
def get_user_overview(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

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

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)