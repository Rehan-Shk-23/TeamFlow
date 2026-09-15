import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import TaskColumn from '../components/TaskColumn';
import TaskModal from '../components/TaskModal';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../context/AuthContext';

const socket = io('http://127.0.0.1:5000');

function Dashboard() {
  const { user } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [healthScore, setHealthScore] = useState(100);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Helper: Fetch tasks & health score
  const fetchTasksAndHealth = (projId) => {
    if (!projId) return;

    fetch(`http://127.0.0.1:5000/api/projects/${projId}/tasks`)
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching tasks:', err));

    fetch(`http://127.0.0.1:5000/api/projects/${projId}/health`)
      .then((res) => res.json())
      .then((data) => setHealthScore(data.health_score ?? 100))
      .catch((err) => console.error('Error fetching health score:', err));
  };

  // 1. Load projects and remember selected project
  useEffect(() => {
    if (user?.id) {
      fetch(`http://127.0.0.1:5000/api/projects?user_id=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setProjects(data);
          if (data && data.length > 0) {
            const savedId = localStorage.getItem('teamflow_last_project');
            const targetId = projectId
              ? parseInt(projectId)
              : (savedId ? parseInt(savedId) : data[0].id);

            const current = data.find((p) => p.id === targetId) || data[0];
            setActiveProject(current);
            localStorage.setItem('teamflow_last_project', current.id);

            if (!projectId || parseInt(projectId) !== current.id) {
              navigate(`/board/${current.id}`, { replace: true });
            }
          }
        })
        .catch((err) => console.error('Error fetching projects:', err));

      fetch('http://127.0.0.1:5000/api/users')
        .then((res) => res.json())
        .then((data) => setUsersList(data))
        .catch((err) => console.error('Error fetching users:', err));
    }
  }, [user?.id, projectId, navigate]);

  // 2. Fetch tasks on project change and listen for real-time socket events
  useEffect(() => {
    if (!activeProject?.id) return;

    fetchTasksAndHealth(activeProject.id);

    const handleBoardUpdated = (data) => {
      if (parseInt(data.project_id) === activeProject.id) {
        fetchTasksAndHealth(activeProject.id);
      }
    };

    socket.on('board_updated', handleBoardUpdated);

    return () => {
      socket.off('board_updated', handleBoardUpdated);
    };
  }, [activeProject?.id]);

  // Handle Drag and Drop
  const handleTaskDrop = async (taskId, targetStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await fetch(`http://127.0.0.1:5000/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Add Task to Current Project
  const handleAddTask = async (newTaskData) => {
    if (!activeProject?.id) return;

    try {
      await fetch('http://127.0.0.1:5000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProject.id,
          ...newTaskData,
          status: 'todo'
        })
      });
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Create New Project
  const handleCreateProject = async (projectData) => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectData,
          created_by: user.id
        })
      });

      if (res.ok) {
        const newProj = await res.json();
        setProjects((prev) => [newProj, ...prev]);
        setActiveProject(newProj);
        localStorage.setItem('teamflow_last_project', newProj.id);
        navigate(`/board/${newProj.id}`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  return (
    <div className="min-vh-100 bg-body-tertiary">
      <Navbar />

      <main className="container-fluid py-4 px-4">
        {/* Top Control Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-white p-3 rounded shadow-sm border">
          <div className="d-flex align-items-center gap-3">
            <div>
              <label className="form-label small text-muted mb-1 fw-bold">ACTIVE PROJECT</label>
              <select
                className="form-select form-select-sm fw-semibold"
                style={{ minWidth: '220px' }}
                value={activeProject?.id || ''}
                onChange={(e) => {
                  const selectedId = parseInt(e.target.value);
                  const selected = projects.find((p) => p.id === selectedId);
                  setActiveProject(selected);
                  localStorage.setItem('teamflow_last_project', selectedId);
                  navigate(`/board/${selectedId}`);
                }}
              >
                {projects.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              className="btn btn-outline-primary btn-sm align-self-end"
              onClick={() => setIsProjectModalOpen(true)}
            >
              + New Project
            </button>
          </div>

          <div className="d-flex align-items-center gap-4">
            <div className="text-end">
              <span className="small text-muted d-block">AI Health Score</span>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-6">
                {healthScore}%
              </span>
            </div>
            <button
              className="btn btn-primary btn-sm px-3 shadow-sm"
              onClick={() => setIsTaskModalOpen(true)}
              disabled={!activeProject}
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* Project Header */}
        {activeProject && (
          <div className="mb-3">
            <h4 className="fw-bold text-dark mb-1">{activeProject.title}</h4>
            <p className="text-secondary small mb-0">
              {activeProject.description || 'No description provided.'}
            </p>
          </div>
        )}

        {/* Kanban Board Columns */}
        <div className="row g-3">
          <TaskColumn
            title="To Do"
            statusKey="todo"
            badgeColor="bg-secondary"
            count={tasks.filter((t) => t.status === 'todo').length}
            tasks={tasks.filter((t) => t.status === 'todo')}
            onTaskDrop={handleTaskDrop}
          />
          <TaskColumn
            title="In Progress"
            statusKey="in-progress"
            badgeColor="bg-warning text-dark"
            count={tasks.filter((t) => t.status === 'in-progress').length}
            tasks={tasks.filter((t) => t.status === 'in-progress')}
            onTaskDrop={handleTaskDrop}
          />
          <TaskColumn
            title="Done"
            statusKey="done"
            badgeColor="bg-success"
            count={tasks.filter((t) => t.status === 'done').length}
            tasks={tasks.filter((t) => t.status === 'done')}
            onTaskDrop={handleTaskDrop}
          />
        </div>
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onAddTask={handleAddTask}
        users={usersList}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default Dashboard;