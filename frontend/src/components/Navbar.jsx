import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  Kanban,
  LogOut,
  Menu,
  X,
  Zap,
  User as UserIcon,
  Users,
} from 'lucide-react';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [boardProjectId, setBoardProjectId] = useState(
    () => localStorage.getItem('teamflow_last_project') || null
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const pathMatch = location.pathname.match(/\/board\/(\d+)/);
  const activeBoardId = pathMatch ? pathMatch[1] : boardProjectId;

  useEffect(() => {
    const match = location.pathname.match(/\/board\/(\d+)/);
    if (match) {
      localStorage.setItem('teamflow_last_project', match[1]);
      return;
    }

    if (!boardProjectId && user?.id) {
      fetch(`http://127.0.0.1:5000/api/projects?user_id=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0) {
            setBoardProjectId(data[0].id);
            localStorage.setItem('teamflow_last_project', data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [location.pathname, user?.id, boardProjectId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
    }`;

  const navItems = [
    { to: '/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderGit2 },
    { to: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
    { to: '/teams', label: 'Teams', icon: Users },
    {
      to: activeBoardId ? `/board/${activeBoardId}` : '/projects',
      label: 'Kanban Board',
      icon: Kanban,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Links */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/overview')}
              className="flex items-center gap-2.5 group focus:outline-hidden"
            >
              <img
                src="/logo.png"
                alt="TeamFlow"
                className="w-9 h-9 object-contain drop-shadow-xs transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 bg-clip-text text-transparent">
                TeamFlow
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className={navLinkStyle}>
                    <Icon className="w-4 h-4 text-inherit" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right: User Profile & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm ring-2 ring-indigo-50">
                {user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-slate-900 leading-tight">
                  {user?.name || 'User'}
                </span>
                <span className="text-xs text-slate-500 capitalize leading-tight">
                  {user?.role || 'Student'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={navLinkStyle}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-xs">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {user?.name || 'User'}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  {user?.role || 'Student'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;