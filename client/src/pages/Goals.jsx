import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState('');

  const load = async () => {
    const { data } = await api.get('/api/goals');
    setGoals(data.goals || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title.trim()) return;
    await api.post('/api/goals', { title });
    setTitle('');
    load();
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="panel-head">
          <h1 className="panel-title">Goals</h1>
          <span className="badge">{goals.length} total</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input" placeholder="Create a goal" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="button" onClick={create}>Create</button>
        </div>
      </section>

      <section className="grid grid-2">
        {goals.map((goal) => (
          <Link to={`/goals/${goal.id}`} key={goal.id}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>{goal.title}</h3>
              <p className="muted" style={{ marginBottom: 0 }}>{goal.description_markdown || 'No description yet'}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
