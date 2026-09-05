import React from 'react';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Redirect user back to the login screen
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4 border-bottom border-secondary shadow-sm">
      <div className="container-fluid">
        {/* Brand Name */}
        <span className="navbar-brand fw-bold text-info fs-4 mb-0">
          TeamFlow
        </span>

        {/* Right Controls */}
        <div className="d-flex align-items-center gap-3">
          <span className="badge bg-primary px-3 py-2">Student View</span>
          <button 
            onClick={handleLogout} 
            className="btn btn-outline-danger btn-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;