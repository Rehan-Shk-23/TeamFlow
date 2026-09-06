import React, { useState } from 'react';

function TaskModal({ isOpen, onClose, onAddTask }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tag: 'Frontend',
    assignee: 'Rehan'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onAddTask(formData);

    // Reset and close
    setFormData({
      title: '',
      description: '',
      tag: 'Frontend',
      assignee: 'Rehan'
    });
    onClose();
  };

  return (
    <>
      <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold text-dark">Create New Task</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    className="form-control"
                    placeholder="e.g., Integrate Auth Endpoint"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Description</label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows="3"
                    placeholder="Provide short details about the task"
                    value={formData.description}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div className="row g-2">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-semibold">Tag / Category</label>
                    <select
                      name="tag"
                      className="form-select"
                      value={formData.tag}
                      onChange={handleChange}
                    >
                      <option value="Frontend">Frontend</option>
                      <option value="Backend">Backend</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Database">Database</option>
                      <option value="Bug">Bug</option>
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-semibold">Assignee</label>
                    <input
                      type="text"
                      name="assignee"
                      className="form-control"
                      value={formData.assignee}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default TaskModal;