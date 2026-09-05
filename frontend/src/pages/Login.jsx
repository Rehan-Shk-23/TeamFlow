import { useState } from 'react';
import { useNavigate } from 'react-router-dom';


export default function Login() {

  // Used for Navigation Between Pages
  const navigate = useNavigate();

  // Define State Variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();

    navigate('/dashboard');
  };

  return (
    // Page Wrapper: Centers the card vertically and horizontally
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      
      {/* Login Card Box */}
      <div className="card shadow-sm p-4" style={{ maxWidth: '400px', width: '100%' }}>
        
        {/* 1. Header Section */}
        <div className="text-center mb-4">
          <h3 className="fw-bold text-primary mb-1">TeamFlow</h3>
          <p className="text-muted small">Sign in to your account</p>
        </div>

        {/* 2. Login Form */}
        <form onSubmit={handleSubmit}>
          
          {/* Email Input Block */}
          <div className="mb-3">
            <label className="form-label small fw-semibold">Email address</label>
            <input
              type="email"
              className="form-control"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input Block */}
          <div className="mb-3">
            <label className="form-label small fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary w-100 mt-2">
            Sign In
          </button>

        </form>

        {/* 3. Footer / Register Link */}
        <div className="text-center mt-4">
          <p className="text-secondary small mb-0">
            Don't have an account?{' '}
            <span className="text-primary text-decoration-underline" role="button">
              Register
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}