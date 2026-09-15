import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../context/AuthContext';

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/projects?user_id=${user.id}`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleCreateProject = async (projectData) => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectData, created_by: user.id })
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-vh-100 bg-body-tertiary">
      <Navbar />
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">My Assigned Projects</h4>
            <p className="text-muted small mb-0">Select a project to open its Kanban board.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setIsProjectModalOpen(true)}>
            + New Project
          </button>
        </div>

        <div className="row g-3">
          {projects.length === 0 ? (
            <div className="col-12 text-center text-muted py-5">
              No projects found. Create one to get started!
            </div>
          ) : (
            projects.map((proj) => (
              <div className="col-md-4" key={proj.id}>
                <div className="card h-100 shadow-sm border">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="card-title fw-bold text-primary mb-0">{proj.title}</h5>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          {proj.health_score || 100}% Health
                        </span>
                      </div>
                      <p className="card-text text-secondary small">
                        {proj.description || 'No description provided.'}
                      </p>
                    </div>

                    <button
                      className="btn btn-outline-primary btn-sm w-100 mt-3"
                      onClick={() => navigate(`/board/${proj.id}`)}
                    >
                      Open Board →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default ProjectsPage;