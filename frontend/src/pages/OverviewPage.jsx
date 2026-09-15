import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../context/AuthContext';

function OverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({ active_projects: 0, active_tasks: 0, due_soon: [] });
  const [projects, setProjects] = useState([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      // Fetch overview statistics
      const overviewRes = await fetch(`http://127.0.0.1:5000/api/users/${user.id}/overview`);
      const overviewData = await overviewRes.json();
      setMetrics(overviewData);

      // Fetch user projects list
      const projRes = await fetch(`http://127.0.0.1:5000/api/projects?user_id=${user.id}`);
      const projData = await projRes.json();
      setProjects(projData);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateProject = async (projectData) => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectData, created_by: user.id })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return <span className="badge bg-danger">High</span>;
      case 'Medium':
        return <span className="badge bg-warning text-dark">Medium</span>;
      default:
        return <span className="badge bg-secondary">Low</span>;
    }
  };

  return (
    <div className="min-vh-100 bg-body-tertiary">
      <Navbar />

      <main className="container py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold text-dark mb-0">Workspace Overview</h3>
            <p className="text-muted small mb-0">Welcome back, {user?.name}!</p>
          </div>
          <button className="btn btn-primary btn-sm px-3 shadow-sm" onClick={() => setIsProjectModalOpen(true)}>
            + New Project
          </button>
        </div>

        {/* 1. Stat Cards Row */}
        <div className="row g-3 mb-4">
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 border-start border-primary border-4 p-3 bg-white">
              <span className="text-muted small fw-semibold">ACTIVE PROJECTS</span>
              <h2 className="fw-bold text-dark mb-0 mt-1">{metrics.active_projects}</h2>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 border-start border-warning border-4 p-3 bg-white">
              <span className="text-muted small fw-semibold">PENDING TASKS</span>
              <h2 className="fw-bold text-dark mb-0 mt-1">{metrics.active_tasks}</h2>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 border-start border-danger border-4 p-3 bg-white">
              <span className="text-muted small fw-semibold">DUE SOON</span>
              <h2 className="fw-bold text-dark mb-0 mt-1">{metrics.due_soon.length}</h2>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 border-start border-success border-4 p-3 bg-white">
              <span className="text-muted small fw-semibold">ACCOUNT ROLE</span>
              <h4 className="fw-bold text-capitalize text-success mb-0 mt-1">{user?.role}</h4>
            </div>
          </div>
        </div>

        {/* 2. Main Content Cards (My Projects + Due Soon) */}
        <div className="row g-4">
          {/* Projects Column */}
          <div className="col-lg-7">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-dark">📁 My Projects</h6>
                <button
                  className="btn btn-link btn-sm text-decoration-none p-0"
                  onClick={() => navigate('/projects')}
                >
                  View all →
                </button>
              </div>

              <div className="card-body p-3">
                {projects.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="fs-1 text-muted mb-2">📂</div>
                    <h6 className="fw-bold text-dark">No projects yet</h6>
                    <p className="text-muted small mb-3">
                      You are not assigned to any projects. Start by creating one!
                    </p>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setIsProjectModalOpen(true)}
                    >
                      Create First Project
                    </button>
                  </div>
                ) : (
                  <div className="row g-3">
                    {projects.slice(0, 4).map((p) => (
                      <div className="col-12" key={p.id}>
                        <div className="p-3 border rounded bg-light-subtle d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="fw-bold text-primary mb-1">{p.title}</h6>
                            <p className="text-muted small mb-0 text-truncate" style={{ maxWidth: '320px' }}>
                              {p.description || 'No description added'}
                            </p>
                          </div>
                          <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              {p.health_score || 100}% Health
                            </span>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => navigate(`/board/${p.id}`)}
                            >
                              Board →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Due Soon Column */}
          <div className="col-lg-5">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-dark">⏰ Upcoming Deadlines</h6>
                <button
                  className="btn btn-link btn-sm text-decoration-none p-0"
                  onClick={() => navigate('/my-tasks')}
                >
                  My Tasks →
                </button>
              </div>

              <div className="card-body p-3">
                {metrics.due_soon.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <div className="fs-2 mb-2">🎉</div>
                    <p className="small mb-0">No urgent tasks approaching deadline.</p>
                  </div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {metrics.due_soon.map((task) => (
                      <li key={task.id} className="list-group-item px-0 py-2 border-0 border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <span className="fw-semibold small d-block text-dark">{task.title}</span>
                            <span className="text-muted small">{task.project_title}</span>
                          </div>
                          <div className="text-end">
                            {getPriorityBadge(task.priority)}
                            <div className="text-danger small mt-1 fw-semibold">
                              📅 {new Date(task.deadline).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default OverviewPage;