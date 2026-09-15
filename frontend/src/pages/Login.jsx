import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' or 'faculty'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setErrorMessage('');
    // Auto-fill demo credentials for quick testing
    if (role === 'student') {
      setEmail('rehan@teamflow.edu');
      setPassword('123456');
    } else {
      setEmail('faculty@teamflow.edu');
      setPassword('123456');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.user);
        navigate('/dashboard');
      } else {
        setErrorMessage(data.message || 'Login failed.');
      }
    } catch (err) {
      setErrorMessage('Cannot connect to TeamFlow backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div className="card shadow-sm border-0 p-4" style={{ width: '420px', borderRadius: '12px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary mb-1">TeamFlow</h2>
          <p className="text-muted small">Academic Project Management Platform</p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="d-flex p-1 mb-4 bg-light rounded border">
          <button
            type="button"
            className={`btn btn-sm flex-fill fw-semibold ${
              selectedRole === 'student' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
            }`}
            onClick={() => handleRoleChange('student')}
          >
            🎓 Student Portal
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill fw-semibold ${
              selectedRole === 'faculty' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
            }`}
            onClick={() => handleRoleChange('faculty')}
          >
            👨‍🏫 Faculty Portal
          </button>
        </div>

        {errorMessage && (
          <div className="alert alert-danger py-2 small" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">
              {selectedRole === 'student' ? 'Student Email' : 'Faculty / Staff Email'}
            </label>
            <input
              type="email"
              className="form-control"
              placeholder={selectedRole === 'student' ? 'rehan@teamflow.edu' : 'faculty@teamflow.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-semibold"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : `Sign In as ${selectedRole === 'student' ? 'Student' : 'Faculty'}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;