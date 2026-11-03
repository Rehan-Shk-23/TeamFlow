import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  Filter,
  Folder,
  Tag,
  Clock,
  CheckCircle2,
  Circle,
  User,
  ArrowRight,
  Trash2,
} from 'lucide-react';

function MyTasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [filterPriority, setFilterPriority] = useState('All');

  const loadTasks = () => {
    if (user?.id) {
      fetch(`http://127.0.0.1:5000/api/users/${user.id}/my-tasks`)
        .then((res) => res.json())
        .then((data) => setTasks(data))
        .catch((err) => console.error('Failed to load tasks:', err));
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${taskTitle}"?`)) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/tasks/${taskId}?requested_by=${user?.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        loadTasks();
      } else {
        alert(data.error || 'Failed to delete task.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting task.');
    }
  };

  const filteredTasks =
    filterPriority === 'All'
      ? tasks
      : tasks.filter((t) => t.priority === filterPriority);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Done
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Circle className="w-3.5 h-3.5 text-slate-400" />
            To Do
          </span>
        );
    }
  };

  const TAG_COLORS = {
    Frontend: 'bg-sky-50 text-sky-700 border-sky-200',
    Backend: 'bg-purple-50 text-purple-700 border-purple-200',
    Database: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Documentation: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const isFaculty = user?.role === 'faculty';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isFaculty ? 'All Tasks' : 'Tasks Assigned to Me'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isFaculty
                ? 'Complete overview of all tasks across every project and team.'
                : 'Consolidated checklist of tasks assigned to your account across all active projects.'}
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Filter Priority:</span>
            <select
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
          </div>
        </div>

        {/* Tasks Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75">
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Task Details
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Project
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Category
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Priority
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  {isFaculty && (
                    <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Assigned To
                    </th>
                  )}
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                    Project Board
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={isFaculty ? 7 : 6} className="px-6 py-12 text-center text-slate-400">
                      <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No tasks found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {filterPriority === 'All'
                          ? 'You currently have no tasks assigned to you.'
                          : `No tasks found matching "${filterPriority}" priority.`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => t.project_id && navigate(`/board/${t.project_id}`)}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      title={t.project_title ? `Go to "${t.project_title}" board` : 'Open Project Board'}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                          {t.title}
                        </span>
                        {t.description && (
                          <span className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-md block">
                            {t.description}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 text-slate-700 border border-slate-200 transition-colors">
                          <Folder className="w-3 h-3 text-slate-500 group-hover:text-indigo-600" />
                          {t.project_title}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            TAG_COLORS[t.tag] || 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          {t.tag}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(t.priority)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>

                      {isFaculty && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {t.assignee_name ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {t.assignee_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                      )}

                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => t.project_id && navigate(`/board/${t.project_id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 shadow-2xs transition-all"
                          >
                            <span>Open Board</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          {isFaculty && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(t.id, t.title)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete task (Faculty only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MyTasksPage;