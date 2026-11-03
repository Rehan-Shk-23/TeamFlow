import { useState, useEffect } from 'react';
import { X, Users, UserPlus } from 'lucide-react';

function TeamModal({ isOpen, onClose, onCreateTeam, currentUserId }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetch('http://127.0.0.1:5000/api/users')
        .then((res) => res.json())
        .then((data) => setAllUsers(data.filter((u) => u.id !== currentUserId)))
        .catch(() => {});
    }
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateTeam({
      name: name.trim(),
      description: description.trim(),
      member_ids: selectedMembers,
    });
    setName('');
    setDescription('');
    setSelectedMembers([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Create New Team</h3>
              <p className="text-xs text-slate-500">Assemble your project team</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Team Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="e.g. Engineering Core"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows="2"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              placeholder="What does this team work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Member Selection */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              <UserPlus className="w-3.5 h-3.5 text-slate-400" />
              Add Team Members
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {allUsers.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">No other users available</div>
              ) : (
                allUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900 block truncate">{u.name}</span>
                      <span className="text-xs text-slate-500 capitalize">{u.role}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-xs text-indigo-600 font-medium mt-1.5">
                {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected + you as Lead
              </p>
            )}
          </div>

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
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-xs shadow-indigo-200 transition-all"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TeamModal;
