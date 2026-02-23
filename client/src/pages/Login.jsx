import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, fetchMe } from '../api/auth.js';

export default function Login({ onAuth }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      const user = await fetchMe();
      onAuth?.(user);
      navigate('/dashboard');
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="section-title">Welcome back</h1>
        <p className="muted">Sign in to continue your goal-driven day.</p>
        <form onSubmit={handleSubmit} className="grid">
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div style={{ color: '#fca5a5' }}>{error}</div>}
          <button className="button" type="submit">Login</button>
        </form>
        <p style={{ marginTop: 16 }} className="muted">No account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}
