import React from 'react';

function TaskColumn({ title, statusKey, count, badgeColor, tasks, onTaskDrop }) {
  // Store the ID of the card when user starts dragging
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  // Necessary to allow dropping into this container
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Read the card ID and notify the parent Dashboard
  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskDrop(Number(taskId), statusKey);
    }
  };

  return (
    <div className="col-md-4">
      <div 
        className="card bg-light border-0 shadow-sm rounded-3"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="card-body p-3 d-flex flex-column">
          {/* Column Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-dark mb-0">{title}</h6>
            <span className={`badge ${badgeColor}`}>{count}</span>
          </div>

          {/* Cards Container */}
          <div className="d-flex flex-column gap-2 flex-grow-1">
            {tasks.length === 0 ? (
              <div className="d-flex align-items-center justify-content-center border border-dashed rounded text-muted small py-3">
                Drag tasks here
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="card border-0 shadow-sm bg-white"
                  style={{ cursor: 'grab' }}
                >
                  <div className="card-body p-3">
                    <h6 className="fw-semibold text-dark mb-1">{task.title}</h6>
                    <p className="text-secondary small mb-2">{task.description}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge bg-secondary-subtle text-dark border small">
                        {task.tag}
                      </span>
                      <small className="text-muted fw-semibold">{task.assignee}</small>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskColumn;