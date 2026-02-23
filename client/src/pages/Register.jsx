import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, fetchMe } from '../api/auth.js';

export default function Register({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      const user = await fetchMe();
      onAuth?.(user);
      navigate('/dashboard');
    } catch (err) {
      setError('Registration failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1 className="section-title">Create account</h1>
        <form onSubmit={handleSubmit} className="grid">
          <input className="input" placeholder="Name" value={form.name} onChange={update('name')} />
          <input className="input" placeholder="Email" value={form.email} onChange={update('email')} />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={update('password')} />
          <input className="input" placeholder="Timezone" value={form.timezone} onChange={update('timezone')} />
          {error && <div style={{ color: '#fca5a5' }}>{error}</div>}
          <button className="button" type="submit">Register</button>
        </form>
        <p style={{ marginTop: 16 }} className="muted">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
