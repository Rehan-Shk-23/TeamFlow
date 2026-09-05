import React from 'react';

import Navbar from '../components/Navbar';

function Dashboard() {
  return (
    <div className="min-vh-100 bg-light">
      <Navbar />
      <div className="container mt-4 text-center">
        <h3 className="text-dark">TeamFlow Workspace</h3>
        <p className="text-secondary">Your project workspace is coming together.</p>
      </div>
    </div>
  );
}

export default Dashboard;