import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [boardProjectId, setBoardProjectId] = useState(
    localStorage.getItem('teamflow_last_project') || null
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const match = location.pathname.match(/\/board\/(\d+)/);
    if (match) {
      const currentId = match[1];
      setBoardProjectId(currentId);
      localStorage.setItem('teamflow_last_project', currentId);
    } else if (!boardProjectId && user?.id) {
      const savedId = localStorage.getItem('teamflow_last_project');
      if (savedId) {
        setBoardProjectId(savedId);
      } else {
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
    }
  }, [location.pathname, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }) =>
    `nav-link px-3 py-2 rounded-2 ${
      isActive
        ? 'active bg-primary text-white fw-bold shadow-sm'
        : 'text-light text-opacity-75 hover-link'
    }`;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3 py-2 shadow-sm border-bottom border-secondary border-opacity-25">
      <div className="container-fluid">
        <span
          className="navbar-brand fw-bold text-primary fs-4 me-3"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/overview')}
        >
          ⚡ TeamFlow
        </span>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1 pt-2 pt-lg-0">
            <li className="nav-item" onClick={() => setIsMenuOpen(false)}>
              <NavLink to="/overview" className={navLinkStyle}>
                📊 Overview
              </NavLink>
            </li>

            <li className="nav-item" onClick={() => setIsMenuOpen(false)}>
              <NavLink to="/projects" className={navLinkStyle}>
                📁 Projects
              </NavLink>
            </li>

            <li className="nav-item" onClick={() => setIsMenuOpen(false)}>
              <NavLink to="/my-tasks" className={navLinkStyle}>
                📋 My Tasks
              </NavLink>
            </li>

            <li className="nav-item" onClick={() => setIsMenuOpen(false)}>
              <NavLink
                to={boardProjectId ? `/board/${boardProjectId}` : '/projects'}
                className={navLinkStyle}
              >
                📌 Kanban Board
              </NavLink>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-3 pt-2 pt-lg-0 border-top border-secondary border-opacity-25 border-lg-0">
            <div className="text-start text-lg-end">
              <span className="text-light fw-semibold small d-block">
                {user?.name || 'User'}
              </span>
              <span className="badge bg-secondary text-capitalize small">
                {user?.role || 'Student'}
              </span>
            </div>

            <button
              className="btn btn-outline-danger btn-sm px-3 rounded-pill"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;