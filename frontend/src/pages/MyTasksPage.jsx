import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filterPriority, setFilterPriority] = useState('All');

  useEffect(() => {
    if (user?.id) {
      fetch(`http://127.0.0.1:5000/api/users/${user.id}/my-tasks`)
        .then((res) => res.json())
        .then((data) => setTasks(data))
        .catch((err) => console.error('Failed to load tasks:', err));
    }
  }, [user]);

  const filteredTasks = filterPriority === 'All' 
    ? tasks 
    : tasks.filter(t => t.priority === filterPriority);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return <span className="badge bg-danger">High</span>;
      case 'Medium':
        return <span className="badge bg-warning text-dark">Medium</span>;
      case 'Low':
        return <span className="badge bg-secondary">Low</span>;
      default:
        return <span className="badge bg-light text-dark border">Medium</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'done':
        return <span className="badge bg-success">Done</span>;
      case 'in-progress':
        return <span className="badge bg-primary">In Progress</span>;
      default:
        return <span className="badge bg-secondary">To Do</span>;
    }
  };

  return (
    <div className="min-vh-100 bg-body-tertiary">
      <Navbar />
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Tasks Assigned to Me</h4>
            <p className="text-muted small mb-0">Prioritized checklist across all active projects.</p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-semibold">Filter Priority:</span>
            <select 
              className="form-select form-select-sm"
              style={{ width: '130px' }}
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="All">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Tag</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No tasks found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="fw-semibold text-dark">{t.title}</span>
                        {t.description && (
                          <div className="text-muted small">{t.description}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {t.project_title}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-info border border-info-subtle">
                          {t.tag}
                        </span>
                      </td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td>{getStatusBadge(t.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyTasksPage;