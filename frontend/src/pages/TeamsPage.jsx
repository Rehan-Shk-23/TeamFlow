import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TeamModal from '../components/TeamModal';
import AssignProjectModal from '../components/AssignProjectModal';
import AddMemberModal from '../components/AddMemberModal';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  FolderKanban,
  UsersRound,
  FolderPlus,
  UserPlus,
  X,
  ShieldCheck,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Assign project modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetTeam, setAssignTargetTeam] = useState(null);

  // Add member modal state
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberTargetTeam, setAddMemberTargetTeam] = useState(null);

  const isFaculty = user?.role === 'faculty';
  const [facultyTab, setFacultyTab] = useState('faculty'); // 'faculty' | 'all' | 'split'
  const [currentPage, setCurrentPage] = useState(1);
  const TEAMS_PER_PAGE = 6;

  // Helper: check if current user is Lead of a specific team
  const isTeamLead = (teamId) => {
    const members = teamMembers[teamId] || [];
    const me = members.find((m) => m.id === user?.id);
    return me && me.role_in_team === 'Lead';
  };

  // Helper: can current user manage members of a team?
  const canManageMembers = (teamId) => {
    return isFaculty || isTeamLead(teamId);
  };

  useEffect(() => {
    let ignore = false;
    async function fetchTeams() {
      if (!user?.id) return;
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/teams?user_id=${user.id}`);
        const data = await res.json();
        if (!ignore) {
          setTeams(data);
          // Fetch members for each team
          const membersMap = {};
          await Promise.all(
            data.map(async (team) => {
              const membersRes = await fetch(`http://127.0.0.1:5000/api/teams/${team.id}/members`);
              membersMap[team.id] = await membersRes.json();
            })
          );
          if (!ignore) setTeamMembers(membersMap);
        }
      } catch (err) {
        console.error('Failed to load teams:', err);
      }
    }

    fetchTeams();
    return () => {
      ignore = true;
    };
  }, [user?.id, refreshIndex]);

  const handleCreateTeam = async (teamData) => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...teamData, created_by: user.id }),
      });
      if (res.ok) {
        setRefreshIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignProject = async (teamId, projectId) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/teams/${teamId}/assign-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, user_id: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setRefreshIndex((prev) => prev + 1);
        return true;
      } else {
        throw new Error(data.error || 'Failed to assign project');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleAddMember = async (teamId, userId) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, requested_by: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setRefreshIndex((prev) => prev + 1);
        return true;
      } else {
        throw new Error(data.error || 'Failed to add member');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleRemoveMember = async (teamId, memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/teams/${teamId}/members/${memberId}?requested_by=${user.id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (res.ok) {
        setRefreshIndex((prev) => prev + 1);
      } else {
        alert(data.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove member');
    }
  };

  const openAssignModal = (team) => {
    setAssignTargetTeam(team);
    setIsAssignModalOpen(true);
  };

  const openAddMemberModal = (team) => {
    setAddMemberTargetTeam(team);
    setIsAddMemberModalOpen(true);
  };

  // Helper: check if a team includes faculty
  const isFacultyIncluded = (team) => {
    const members = teamMembers[team.id] || [];
    return (
      team.created_by === user?.id ||
      members.some(
        (m) => m.id === user?.id || m.role === 'faculty' || m.role_in_team === 'Advisor'
      )
    );
  };

  const facultyTeams = teams.filter((t) => isFacultyIncluded(t));

  const activeTeamsList = facultyTab === 'faculty' ? facultyTeams : teams;
  const paginatedTeams = activeTeamsList.slice(
    (currentPage - 1) * TEAMS_PER_PAGE,
    currentPage * TEAMS_PER_PAGE
  );

  const renderPagination = (totalItems, page, setPage) => {
    const pages = Math.ceil(totalItems / TEAMS_PER_PAGE) || 1;
    if (pages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-5 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{(page - 1) * TEAMS_PER_PAGE + 1}</span> to{' '}
          <span className="font-semibold text-slate-800">
            {Math.min(page * TEAMS_PER_PAGE, totalItems)}
          </span>{' '}
          of <span className="font-semibold text-slate-800">{totalItems}</span> teams
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <div className="px-3 py-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
            Page {page} of {pages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderTeamCard = (team) => {
    const members = teamMembers[team.id] || [];
    const hasNoProjects = team.project_count === 0;
    const canManage = canManageMembers(team.id);
    const hasFaculty = isFacultyIncluded(team);

    return (
      <div
        key={team.id}
        className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
      >
        {/* Team Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-base group-hover:text-violet-600 transition-colors truncate">
                {team.name}
              </h3>
              <span className="text-xs text-slate-500">by {team.creator_name}</span>
            </div>
          </div>
          {hasFaculty && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
              <ShieldCheck className="w-3 h-3" />
              Faculty Included
            </span>
          )}
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {team.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <Users className="w-3 h-3" />
            {team.member_count} member{team.member_count !== 1 ? 's' : ''}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              hasNoProjects
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
          >
            <FolderKanban className="w-3 h-3" />
            {hasNoProjects ? 'No projects' : `${team.project_count} project${team.project_count !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Assign Project Button — Faculty Only, shown when team has no projects */}
        {isFaculty && hasNoProjects && (
          <button
            onClick={() => openAssignModal(team)}
            className="w-full mb-4 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Assign Project</span>
          </button>
        )}

        {/* Faculty can also assign additional projects to teams that already have some */}
        {isFaculty && !hasNoProjects && (
          <button
            onClick={() => openAssignModal(team)}
            className="w-full mb-4 flex items-center justify-center gap-2 py-1.5 px-3 text-[11px] font-medium text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all"
          >
            <FolderPlus className="w-3 h-3" />
            <span>Assign Another Project</span>
          </button>
        )}

        {/* Members List */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Members</h4>
            {canManage && (
              <button
                onClick={() => openAddMemberModal(team)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                Add
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {members.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-900 block truncate">{m.name}</span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    m.role_in_team === 'Lead' || m.role_in_team === 'Advisor' || m.role === 'faculty'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {m.role_in_team}
                </span>
                {/* Remove button — visible to lead/faculty, NOT on the lead themselves */}
                {canManage && m.role_in_team !== 'Lead' && (
                  <button
                    onClick={() => handleRemoveMember(team.id, m.id)}
                    title={`Remove ${m.name}`}
                    className="p-0.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {members.length > 5 && (
              <p className="text-xs text-slate-400 pl-9">
                +{members.length - 5} more
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isFaculty ? 'Teams Directory & Mentorship' : 'My Teams'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isFaculty
                ? 'Review teams with faculty involvement alongside all department teams.'
                : 'Manage your teams and collaborate across projects.'}
            </p>
          </div>
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-200 active:scale-98 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Team</span>
          </button>
        </div>

        {/* Teams Display */}
        {teams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3">
              <UsersRound className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No teams yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Create your first team to start collaborating on projects together.
            </p>
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Team</span>
            </button>
          </div>
        ) : isFaculty ? (
          <div className="space-y-6">
            {/* Page/Tab Switcher for Faculty */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFacultyTab('faculty');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    facultyTab === 'faculty'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Teams with Faculty</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      facultyTab === 'faculty'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {facultyTeams.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFacultyTab('all');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    facultyTab === 'all'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>All Teams</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      facultyTab === 'all'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {teams.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFacultyTab('split');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    facultyTab === 'split'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Side by side split view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Side-by-Side</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 px-2 font-medium">
                {facultyTab === 'faculty' && (
                  <span>Showing {facultyTeams.length} teams where faculty is included</span>
                )}
                {facultyTab === 'all' && (
                  <span>Full department directory of {teams.length} teams</span>
                )}
                {facultyTab === 'split' && (
                  <span>Split comparison: {facultyTeams.length} faculty vs {teams.length} total</span>
                )}
              </div>
            </div>

            {/* Tab Page 1: Teams with Faculty Included (Full Page Grid) */}
            {facultyTab === 'faculty' && (
              <div>
                {facultyTeams.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">No faculty teams yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                      You are not currently assigned to or mentoring any teams. You can view all teams under the "All Teams" tab.
                    </p>
                    <button
                      onClick={() => setFacultyTab('all')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Browse All Teams</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {paginatedTeams.map((team) => renderTeamCard(team))}
                    </div>
                    {renderPagination(facultyTeams.length, currentPage, setCurrentPage)}
                  </>
                )}
              </div>
            )}

            {/* Tab Page 2: All Teams (Full Page Grid) */}
            {facultyTab === 'all' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedTeams.map((team) => renderTeamCard(team))}
                </div>
                {renderPagination(teams.length, currentPage, setCurrentPage)}
              </div>
            )}

            {/* Tab Page 3: Side-by-Side (Split View) */}
            {facultyTab === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Side: Teams with Faculty */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Teams with Faculty Included
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          {facultyTeams.length}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500">
                        Teams you or other faculty members mentor or advise
                      </p>
                    </div>
                  </div>

                  {facultyTeams.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center shadow-xs">
                      <ShieldCheck className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No teams include faculty currently.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {facultyTeams.map((team) => renderTeamCard(team))}
                    </div>
                  )}
                </div>

                {/* Right Side: All Teams */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        All Teams
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {teams.length}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500">
                        Complete directory of all registered department teams
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {teams.map((team) => renderTeamCard(team))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Standard 3-column Grid for Students */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((team) => renderTeamCard(team))}
          </div>
        )}
      </main>

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onCreateTeam={handleCreateTeam}
        currentUserId={user?.id}
      />

      <AssignProjectModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignTargetTeam(null);
        }}
        onAssign={handleAssignProject}
        teamId={assignTargetTeam?.id}
        teamName={assignTargetTeam?.name}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setAddMemberTargetTeam(null);
        }}
        onAddMember={handleAddMember}
        teamId={addMemberTargetTeam?.id}
        teamName={addMemberTargetTeam?.name}
        existingMemberIds={(teamMembers[addMemberTargetTeam?.id] || []).map((m) => m.id)}
      />
    </div>
  );
}

export default TeamsPage;
