import React, { useState } from 'react';

function ProjectModal({ isOpen, onClose, onCreateProject }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateProject({ title, description });
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">Create New Project</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Project Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Final Year CS Project"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Briefly describe the project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProjectModal;