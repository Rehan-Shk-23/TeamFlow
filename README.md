# TeamFlow 🚀
> **Academic Project Collaboration Platform with Real-Time Kanban & Heuristic AI Health Engine**

TeamFlow is a full-stack academic project management platform built to bridge the communication gap between university student project teams and faculty mentors. It combines real-time Kanban synchronization, version-tracked file management, role-based access control, and an automated AI Project Health Score engine that detects deadlines, bottlenecks, and workload risks before they impact deliverables.

---

## 📸 Key Features

- **Real-Time Kanban Board:** Drag-and-drop task workflow across *To Do*, *In Progress*, and *Done* synced across all connected client windows instantly via WebSockets (Socket.IO).
- **Role-Based Access Control (RBAC):** Distinct permissions for **Faculty** and **Student** accounts, along with team-level **Lead** and **Member** designations. Sensitive operations (task editing/deletion, file deletion, member removal) are protected.
- **AI Project Health Engine:** Real-time heuristic scoring (0–100%) evaluating:
  - *Priority-Weighted Completion* (High: 3x, Medium: 2x, Low: 1x)
  - *Overdue Task Deductions* (-12%, -8%, -5%)
  - *Stagnation Bottlenecks* (Tasks stuck in progress for 5+ or 8+ days)
  - *Workload Imbalance* (Alerts when a single member carries ≥ 3x team average)
- **Version-Tracked Project Files:** Secure document sharing (PDF, DOCX, ZIP, images) with uploader tracking, timestamps, and activity audit logs.
- **Auto-Unassignment on Member Removal:** Removing a team member automatically marks their unfinished tasks as *Unassigned* and updates project boards in real-time.
- **Strict Password Security:** Registration requires passwords with at least 8 characters including letters, numbers, and symbols.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 (`v19.2.8`)
- **Build Tool:** Vite (`v8.2.2`)
- **Styling:** Tailwind CSS v4 (`v4.3.3`)
- **Routing:** React Router DOM (`v7.18.3`)
- **Icons:** Lucide React (`v1.46.0`)
- **Real-time Client:** Socket.IO Client (`v4.8.3`)

### Backend
- **Framework:** Python Flask (`v3.0.0+`)
- **WebSockets:** Flask-SocketIO (`v5.3.0+`)
- **CORS:** Flask-CORS (`v5.0.0+`)
- **File Handling:** Werkzeug secure uploads

### Database & Storage
- **Database:** MySQL (`teamflow_db`)
- **Driver:** `mysql-connector-python`
- **File Storage:** Local server-managed storage (`backend/uploads/`) with audit logs

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MySQL Server** running locally or in the cloud

### 2. Database Setup
1. Start your MySQL service.
2. Create the database:
   ```sql
   CREATE DATABASE teamflow_db;
   ```
3. Import the initial database schema from the `database/` folder (or let `app.py` initialize tables on startup).

### 3. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask backend server (port 5000)
python app.py
```

### 4. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server (port 5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser!

---

## 👥 Default Accounts (Demo)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Faculty Mentor** | `faculty@teamflow.edu` | `123456` |
| **Team Lead / Student** | `rehan@teamflow.edu` | `123456` |

*(New user registrations require an 8+ character password with letters, numbers, and symbols).*

---

## 📄 License
This project is developed for academic demonstration and portfolio purposes.
