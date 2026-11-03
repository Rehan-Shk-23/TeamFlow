import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  Plus,
  Activity,
  ArrowRight,
  FolderOpen,
  Users,
} from 'lucide-react';

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [healthScores, setHealthScores] = useState({});
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    async function fetchProjects() {
      if (!user?.id) return;
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/projects?user_id=${user.id}`);
        const data = await res.json();
        if (!ignore) {
          setProjects(data);

          // Fetch live AI health scores for each project
          const healthMap = {};
          await Promise.all(
            data.map(async (p) => {
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
        console.error('Failed to load projects:', err);
      }
    }

    fetchProjects();
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {user?.role === 'faculty' ? 'All Projects' : 'My Assigned Projects'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {user?.role === 'faculty'
                ? 'Overview of all projects across every team on the platform.'
                : 'Select a project workspace to manage tasks, collaborate, and review Kanban boards.'}
            </p>
          </div>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-200 active:scale-98 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No projects found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              You haven't created or been assigned to any project yet. Create your first project to get started!
            </p>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {proj.title}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                      (() => {
                        const score = (healthScores[proj.id]?.health_score ?? proj.health_score ?? 100);
                        return score >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : score >= 60
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : score >= 40
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';
                      })()
                    }`}>
                      <Activity className="w-3 h-3" />
                      <span>{healthScores[proj.id]?.health_score ?? proj.health_score ?? 100}%</span>
                      <span className="text-[9px] opacity-75">{healthScores[proj.id]?.label || 'Healthy'}</span>
                    </span>
                    {proj.team_name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
                        <Users className="w-3 h-3" />
                        {proj.team_name}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                    {proj.description || 'No project description provided.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`/board/${proj.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all"
                  >
                    <span>Open Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default ProjectsPage;