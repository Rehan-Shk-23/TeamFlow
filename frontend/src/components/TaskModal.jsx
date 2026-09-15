import React, { useState } from 'react';

function TaskModal({ isOpen, onClose, onAddTask, users = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Frontend');
  const [priority, setPriority] = useState('Medium'); // Default priority
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title,
      description,
      tag,
      priority,
      deadline: deadline || null,
      assignee_id: assigneeId ? parseInt(assigneeId) : null
    });

    setTitle('');
    setDescription('');
    setTag('Frontend');
    setPriority('Medium');
    setDeadline('');
    setAssigneeId('');
    onClose();
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">Create New Task</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Task Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Design UML Diagrams"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Details about this task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Category / Tag</label>
                  <select className="form-select form-select-sm" value={tag} onChange={(e) => setTag(e.target.value)}>
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Database">Database</option>
                    <option value="Documentation">Documentation</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Priority</label>
                  <select
                    className="form-select form-select-sm"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="High">🔴 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">🟢 Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Assign To</label>
                  <select
                    className="form-select form-select-sm"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Deadline</label>
                  <input
                    type="date"
                    className="form-control form-select-sm"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Add Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;