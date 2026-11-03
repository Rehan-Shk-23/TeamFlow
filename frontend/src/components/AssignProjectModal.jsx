import { useState, useEffect } from 'react';
import { X, FolderPlus, FolderKanban } from 'lucide-react';

function AssignProjectModal({ isOpen, onClose, onAssign, teamId, teamName }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSelectedProjectId('');
      fetch('http://127.0.0.1:5000/api/projects/unassigned')
        .then((res) => res.json())
        .then((data) => setProjects(data))
        .catch(() => setProjects([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setLoading(true);
    setError('');
    try {
      const success = await onAssign(teamId, parseInt(selectedProjectId));
      if (success) {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to assign project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Assign Project to Team</h3>
              <p className="text-xs text-slate-500">Assign an unassigned project to <span className="font-semibold text-slate-700">{teamName}</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              Select Project
            </label>
            {projects.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500">No unassigned projects available.</p>
                <p className="text-[11px] text-slate-400 mt-1">All projects have already been assigned to teams.</p>
              </div>
            ) : (
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
              >
                <option value="">Choose a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedProjectId && (() => {
            const selected = projects.find((p) => p.id === parseInt(selectedProjectId));
            return selected?.description ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                {selected.description}
              </div>
            ) : null;
          })()}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedProjectId || loading || projects.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs shadow-emerald-200 transition-all disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssignProjectModal;
