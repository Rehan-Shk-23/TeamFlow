import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import TaskColumn from '../components/TaskColumn';
import TaskModal from '../components/TaskModal';
import ProjectModal from '../components/ProjectModal';
import ProjectFilesModal from '../components/ProjectFilesModal';
import ProjectFilesSidebar from '../components/ProjectFilesSidebar';
import { useAuth } from '../context/AuthContext';
import { Plus, ChevronDown, Users, AlertTriangle, TrendingUp, Clock, Activity, Info, ChevronUp, FolderOpen } from 'lucide-react';

const socket = io('http://127.0.0.1:5000');

function Dashboard() {
  const { user } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [healthData, setHealthData] = useState({ health_score: 100, label: 'Healthy', factors: {}, insights: [] });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [filesCount, setFilesCount] = useState(0);
  const [projectFiles, setProjectFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [showFilesSidebar, setShowFilesSidebar] = useState(true);
  const [showHealthPanel, setShowHealthPanel] = useState(false);

  // Authorization: faculty or team lead can delete files
  const isLead = usersList.some((m) => m.id === user?.id && m.role_in_team === 'Lead');
  const canDeleteFiles = user?.role === 'faculty' || isLead;

  // Helper: Fetch project files
  const fetchProjectFiles = (projId) => {
    if (!projId) return;
    setFilesLoading(true);
    fetch(`http://127.0.0.1:5000/api/projects/${projId}/files`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjectFiles(data);
          setFilesCount(data.length);
        }
      })
      .catch((err) => console.error('Error fetching project files:', err))
      .finally(() => setFilesLoading(false));
  };

  // Helper: Fetch tasks & health score
  const fetchTasksAndHealth = (projId) => {
    if (!projId) return;

    fetch(`http://127.0.0.1:5000/api/projects/${projId}/tasks`)
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching tasks:', err));

    fetch(`http://127.0.0.1:5000/api/projects/${projId}/health`)
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch((err) => console.error('Error fetching health score:', err));

    fetchProjectFiles(projId);
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

      // Users list will be fetched per-project from team members
    }
  }, [user?.id, projectId, navigate]);

  // 2. Fetch tasks on project change and listen for real-time socket events
  useEffect(() => {
    if (!activeProject?.id) return;

    fetchTasksAndHealth(activeProject.id);

    // Fetch team members for task assignment
    fetch(`http://127.0.0.1:5000/api/projects/${activeProject.id}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsersList(data);
        } else {
          // Fallback to all users if no team assigned
          fetch('http://127.0.0.1:5000/api/users')
            .then((res) => res.json())
            .then((allData) => setUsersList(allData))
            .catch(() => {});
        }
      })
      .catch(() => {});

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
        body: JSON.stringify({ status: targetStatus }),
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
          status: 'todo',
        }),
      });
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Select Task for Editing (Faculty & Team Lead only)
  const handleSelectTask = (task) => {
    if (!canDeleteFiles) return;
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  // Update Task Details (Faculty & Team Lead only)
  const handleUpdateTask = async (taskId, updatedData) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_by: user?.id,
          ...updatedData,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (activeProject?.id) {
          fetchTasksAndHealth(activeProject.id);
        }
      } else {
        alert(data.error || 'Failed to update task.');
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      alert('Network error while updating task.');
    }
  };

  // Delete Task (Faculty & Team Lead only)
  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!canDeleteFiles) {
      alert('Only faculty members and team leads can delete tasks.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${taskTitle}"?`)) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/tasks/${taskId}?requested_by=${user?.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        if (activeProject?.id) {
          fetchTasksAndHealth(activeProject.id);
        }
      } else {
        alert(data.error || 'Failed to delete task.');
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Network error while deleting task.');
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
          created_by: user.id,
        }),
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Project Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Project:
              </span>
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer min-w-[200px]"
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>

          {/* Health Score & Add Task Action */}
          <div className="flex items-center gap-4 self-end sm:self-auto">
            {/* AI Health Badge — clickable to expand insights */}
            <button
              onClick={() => setShowHealthPanel((v) => !v)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer group ${
                healthData.health_score >= 80
                  ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                  : healthData.health_score >= 60
                  ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                  : healthData.health_score >= 40
                  ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                  : 'bg-rose-50 border-rose-200 hover:border-rose-300'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  healthData.health_score >= 80
                    ? 'bg-emerald-500'
                    : healthData.health_score >= 60
                    ? 'bg-amber-500'
                    : healthData.health_score >= 40
                    ? 'bg-orange-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-xs text-slate-500 font-medium">AI Health:</span>
              <span
                className={`text-xs font-bold ${
                  healthData.health_score >= 80
                    ? 'text-emerald-700'
                    : healthData.health_score >= 60
                    ? 'text-amber-700'
                    : healthData.health_score >= 40
                    ? 'text-orange-700'
                    : 'text-rose-700'
                }`}
              >
                {healthData.health_score ?? 100}%
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                  healthData.health_score >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : healthData.health_score >= 60
                    ? 'bg-amber-100 text-amber-800'
                    : healthData.health_score >= 40
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {healthData.label || 'Healthy'}
              </span>
              {showHealthPanel ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Project Files Toggle Button */}
            <button
              onClick={() => setShowFilesSidebar((prev) => !prev)}
              disabled={!activeProject}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs border shadow-2xs active:scale-98 disabled:opacity-50 transition-all cursor-pointer ${
                showFilesSidebar
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title={showFilesSidebar ? 'Hide project files sidebar' : 'Show project files sidebar'}
            >
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span>{showFilesSidebar ? 'Hide Files' : 'Files'}</span>
              {filesCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {filesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              disabled={!activeProject}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-200 active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Expandable AI Health Insights Panel */}
        {showHealthPanel && healthData.factors && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Factor Breakdown Header */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">AI Health Score Breakdown</h3>
              </div>
            </div>

            {/* Factor Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
              {/* Weighted Completion */}
              <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Weighted Progress</span>
                </div>
                <span className="text-2xl font-extrabold text-indigo-900">
                  {healthData.factors.weighted_completion ?? 0}%
                </span>
                <p className="text-[10px] text-indigo-600/80 mt-0.5">High-priority tasks weighted 3×</p>
              </div>

              {/* Overdue Penalty */}
              <div className={`rounded-xl p-3.5 border ${
                (healthData.factors.overdue_penalty ?? 0) > 0
                  ? 'bg-rose-50/60 border-rose-100'
                  : 'bg-emerald-50/60 border-emerald-100'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${
                    (healthData.factors.overdue_penalty ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    (healthData.factors.overdue_penalty ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>Overdue Penalty</span>
                </div>
                <span className={`text-2xl font-extrabold ${
                  (healthData.factors.overdue_penalty ?? 0) > 0 ? 'text-rose-900' : 'text-emerald-900'
                }`}>
                  {(healthData.factors.overdue_penalty ?? 0) > 0 ? `-${healthData.factors.overdue_penalty}%` : '0%'}
                </span>
                <p className={`text-[10px] mt-0.5 ${
                  (healthData.factors.overdue_penalty ?? 0) > 0 ? 'text-rose-600/80' : 'text-emerald-600/80'
                }`}>
                  {(healthData.factors.overdue_penalty ?? 0) > 0 ? 'Past-deadline tasks detected' : 'No overdue tasks ✓'}
                </p>
              </div>

              {/* Stagnation Penalty */}
              <div className={`rounded-xl p-3.5 border ${
                (healthData.factors.stagnation_penalty ?? 0) > 0
                  ? 'bg-amber-50/60 border-amber-100'
                  : 'bg-emerald-50/60 border-emerald-100'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock className={`w-3.5 h-3.5 ${
                    (healthData.factors.stagnation_penalty ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    (healthData.factors.stagnation_penalty ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>Stagnation</span>
                </div>
                <span className={`text-2xl font-extrabold ${
                  (healthData.factors.stagnation_penalty ?? 0) > 0 ? 'text-amber-900' : 'text-emerald-900'
                }`}>
                  {(healthData.factors.stagnation_penalty ?? 0) > 0 ? `-${healthData.factors.stagnation_penalty}%` : '0%'}
                </span>
                <p className={`text-[10px] mt-0.5 ${
                  (healthData.factors.stagnation_penalty ?? 0) > 0 ? 'text-amber-600/80' : 'text-emerald-600/80'
                }`}>
                  {(healthData.factors.stagnation_penalty ?? 0) > 0 ? 'Tasks stuck in-progress 5+ days' : 'No bottlenecks ✓'}
                </p>
              </div>

              {/* Imbalance Penalty */}
              <div className={`rounded-xl p-3.5 border ${
                (healthData.factors.imbalance_penalty ?? 0) > 0
                  ? 'bg-orange-50/60 border-orange-100'
                  : 'bg-emerald-50/60 border-emerald-100'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className={`w-3.5 h-3.5 ${
                    (healthData.factors.imbalance_penalty ?? 0) > 0 ? 'text-orange-600' : 'text-emerald-600'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    (healthData.factors.imbalance_penalty ?? 0) > 0 ? 'text-orange-600' : 'text-emerald-600'
                  }`}>Workload Balance</span>
                </div>
                <span className={`text-2xl font-extrabold ${
                  (healthData.factors.imbalance_penalty ?? 0) > 0 ? 'text-orange-900' : 'text-emerald-900'
                }`}>
                  {(healthData.factors.imbalance_penalty ?? 0) > 0 ? `-${healthData.factors.imbalance_penalty}%` : '0%'}
                </span>
                <p className={`text-[10px] mt-0.5 ${
                  (healthData.factors.imbalance_penalty ?? 0) > 0 ? 'text-orange-600/80' : 'text-emerald-600/80'
                }`}>
                  {(healthData.factors.imbalance_penalty ?? 0) > 0 ? 'Uneven task distribution' : 'Balanced workload ✓'}
                </p>
              </div>
            </div>

            {/* AI Insights */}
            {healthData.insights && healthData.insights.length > 0 && (
              <div className="px-5 pb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Insights</span>
                </div>
                <div className="space-y-1.5">
                  {healthData.insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span className="text-xs text-slate-700 leading-relaxed">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Project Header Info */}
        {activeProject && (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {activeProject.title}
              </h2>
              {activeProject.team_name && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                  <Users className="w-3 h-3" />
                  {activeProject.team_name}
                </span>
              )}
            </div>
            {activeProject.description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
                {activeProject.description}
              </p>
            )}
          </div>
        )}

        {/* Main Grid: Kanban Board + Side Files Panel */}
        <div className={`grid grid-cols-1 gap-6 items-start ${showFilesSidebar ? 'xl:grid-cols-12' : ''}`}>
          {/* Kanban Board Columns */}
          <div className={showFilesSidebar ? 'xl:col-span-8 2xl:col-span-9' : 'w-full'}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              <TaskColumn
                title="To Do"
                statusKey="todo"
                count={tasks.filter((t) => t.status === 'todo').length}
                tasks={tasks.filter((t) => t.status === 'todo')}
                onTaskDrop={handleTaskDrop}
                canDelete={canDeleteFiles}
                onDeleteTask={handleDeleteTask}
                canEdit={canDeleteFiles}
                onSelectTask={handleSelectTask}
              />
              <TaskColumn
                title="In Progress"
                statusKey="in-progress"
                count={tasks.filter((t) => t.status === 'in-progress').length}
                tasks={tasks.filter((t) => t.status === 'in-progress')}
                onTaskDrop={handleTaskDrop}
                canDelete={canDeleteFiles}
                onDeleteTask={handleDeleteTask}
                canEdit={canDeleteFiles}
                onSelectTask={handleSelectTask}
              />
              <TaskColumn
                title="Done"
                statusKey="done"
                count={tasks.filter((t) => t.status === 'done').length}
                tasks={tasks.filter((t) => t.status === 'done')}
                onTaskDrop={handleTaskDrop}
                canDelete={canDeleteFiles}
                onDeleteTask={handleDeleteTask}
                canEdit={canDeleteFiles}
                onSelectTask={handleSelectTask}
              />
            </div>
          </div>

          {/* Project Files Visible on the Side of Kanban */}
          {showFilesSidebar && (
            <div className="xl:col-span-4 2xl:col-span-3 sticky top-6">
              <ProjectFilesSidebar
                projectId={activeProject?.id}
                files={projectFiles}
                loading={filesLoading}
                onRefresh={() => fetchProjectFiles(activeProject?.id)}
                currentUserId={user?.id}
                canDelete={canDeleteFiles}
              />
            </div>
          )}
        </div>
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        task={selectedTask}
        users={usersList}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <ProjectFilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        projectId={activeProject?.id}
        projectTitle={activeProject?.title}
        currentUserId={user?.id}
        onFilesCountChange={(count) => setFilesCount(count)}
        canDelete={canDeleteFiles}
      />
    </div>
  );
}

export default Dashboard;