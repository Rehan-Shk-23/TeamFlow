import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
  ArrowRight,
  Calendar,
  AlertCircle,
  FolderOpen,
  Activity,
  Users,
} from 'lucide-react';

function OverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({ active_projects: 0, active_tasks: 0, due_soon: [] });
  const [projects, setProjects] = useState([]);
  const [healthScores, setHealthScores] = useState({});
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      if (!user?.id) return;
      try {
        const [overviewRes, projRes] = await Promise.all([
          fetch(`http://127.0.0.1:5000/api/users/${user.id}/overview`),
          fetch(`http://127.0.0.1:5000/api/projects?user_id=${user.id}`),
        ]);
        const overviewData = await overviewRes.json();
        const projData = await projRes.json();
        if (!ignore) {
          setMetrics(overviewData);
          setProjects(projData);

          // Fetch live AI health scores for each project
          const healthMap = {};
          await Promise.all(
            projData.map(async (p) => {
              try {
                const hRes = await fetch(`http://127.0.0.1:5000/api/projects/${p.id}/health`);
                const hData = await hRes.json();
                healthMap[p.id] = hData;
              } catch {
                healthMap[p.id] = { health_score: 100, label: 'Healthy' };
              }
            })
          );
          if (!ignore) setHealthScores(healthMap);
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      }
    }

    fetchData();
    return () => {
      ignore = true;
    };
  }, [user?.id, refreshIndex]);

  const handleCreateProject = async (projectData) => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectData, created_by: user.id }),
      });
      if (res.ok) {
        setRefreshIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Workspace Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span>! Here is your project snapshot.
            </p>
          </div>
          <div>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-200 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* 1. Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {user?.role === 'faculty' ? 'Total Projects' : 'Active Projects'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {metrics.active_projects}
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {user?.role === 'faculty' ? 'Total Pending Tasks' : 'Pending Tasks'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {metrics.active_tasks}
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Due Soon
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {metrics.due_soon.length}
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Account Role
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 capitalize">
                {user?.role || 'Student'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Main Grid: Projects + Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Projects Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">{user?.role === 'faculty' ? 'All Projects' : 'My Projects'}</h2>
                </div>
                <button
                  onClick={() => navigate('/projects')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-6 flex-1">
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      <FolderOpen className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">No projects assigned</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                      You are not currently assigned to any projects. Create a new one to kick off your team workflow.
                    </p>
                    <button
                      onClick={() => setIsProjectModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Project</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="group p-4 rounded-xl border border-slate-200/80 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/20 transition-all flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate">
                            {p.title}
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {p.description || 'No description provided.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {(() => {
                            const h = healthScores[p.id] || { health_score: p.health_score ?? 100, label: 'Healthy' };
                            const score = h.health_score ?? 100;
                            const colorClass = score >= 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : score >= 60
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : score >= 40
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200';
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                                <Activity className="w-3 h-3" />
                                <span>{score}%</span>
                                <span className="text-[9px] opacity-75">{h.label}</span>
                              </span>
                            );
                          })()}
                          {p.team_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                              <Users className="w-3 h-3" />
                              {p.team_name}
                            </span>
                          )}
                          <button
                            onClick={() => navigate(`/board/${p.id}`)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-xs transition-colors"
                          >
                            Board →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h2 className="font-bold text-slate-900 text-base">Upcoming Deadlines</h2>
                </div>
                <button
                  onClick={() => navigate('/my-tasks')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <span>My Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-6 flex-1">
                {metrics.due_soon.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">All caught up!</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      No urgent tasks approaching deadline in the next 48 hours.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {metrics.due_soon.map((task) => (
                      <div key={task.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-xs sm:text-sm text-slate-900 block truncate">
                              {task.title}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                              {task.project_title}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {getPriorityBadge(task.priority)}
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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