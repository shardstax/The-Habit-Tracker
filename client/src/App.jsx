import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { fetchMe } from './api/auth.js';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tomorrow from './pages/Tomorrow.jsx';
import Horizon from './pages/Horizon.jsx';
import Goals from './pages/Goals.jsx';
import GoalDetail from './pages/GoalDetail.jsx';
import Journal from './pages/Journal.jsx';
import Mindset from './pages/Mindset.jsx';
import Tags from './pages/Tags.jsx';
import Recurring from './pages/Recurring.jsx';
import Vault from './pages/Vault.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="main">Loading...</div>;

  const RequireAuth = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;
    return <Layout>{children}</Layout>;
  };

  return (
    <Routes>
      <Route path="/login" element={<Login onAuth={setUser} />} />
      <Route path="/register" element={<Register onAuth={setUser} />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={<RequireAuth><Dashboard user={user} /></RequireAuth>} />
      <Route path="/tomorrow" element={<RequireAuth><Tomorrow /></RequireAuth>} />
      <Route path="/horizon/:horizon" element={<RequireAuth><Horizon /></RequireAuth>} />
      <Route path="/goals" element={<RequireAuth><Goals /></RequireAuth>} />
      <Route path="/goals/:id" element={<RequireAuth><GoalDetail /></RequireAuth>} />
      <Route path="/journal" element={<RequireAuth><Journal /></RequireAuth>} />
      <Route path="/mindset" element={<RequireAuth><Mindset /></RequireAuth>} />
      <Route path="/tags" element={<RequireAuth><Tags /></RequireAuth>} />
      <Route path="/recurring" element={<RequireAuth><Recurring /></RequireAuth>} />
      <Route path="/vault" element={<RequireAuth><Vault /></RequireAuth>} />
    </Routes>
  );
}
