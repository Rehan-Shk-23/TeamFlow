import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import TaskColumn from '../components/TaskColumn';

function Dashboard() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Setup MySQL Database',
      description: 'Create user, project, and task tables schema',
      status: 'todo',
      tag: 'Backend',
      assignee: 'Rehan'
    },
    {
      id: 2,
      title: 'Design Kanban Columns',
      description: 'Build responsive task cards in React',
      status: 'in-progress',
      tag: 'Frontend',
      assignee: 'Rehan'
    },
    {
      id: 3,
      title: 'Initialize Git Repository',
      description: 'Push base structure and connect to GitHub',
      status: 'done',
      tag: 'DevOps',
      assignee: 'Rehan'
    }
  ]);

  // Handler triggered whenever a card is dropped into a column
  const handleTaskDrop = (taskId, targetStatus) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: targetStatus } : task
      )
    );
  };

  return (
    <div className="min-vh-100 bg-body-tertiary">
      <Navbar />

      <main className="container-fluid py-4 px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold text-dark mb-1">Final Year Project Workspace</h4>
            <p className="text-secondary small mb-0">Track sprint progress and team tasks</p>
          </div>
          <button className="btn btn-primary btn-sm px-3 shadow-sm">
            + New Task
          </button>
        </div>

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
    </div>
  );
}

export default Dashboard;