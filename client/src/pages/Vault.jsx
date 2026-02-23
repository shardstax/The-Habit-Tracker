import { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

const horizons = ['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];

export default function Vault() {
  const [tasks, setTasks] = useState([]);
  const [horizon, setHorizon] = useState('ALL');
  const [query, setQuery] = useState('');

  const loadVault = async () => {
    const qs = horizon === 'ALL' ? '' : `?horizon=${horizon}`;
    const { data } = await api.get(`/api/tasks/vault${qs}`);
    setTasks(data.tasks || []);
  };

  useEffect(() => {
    loadVault();
  }, [horizon]);

  const restoreTask = async (taskId) => {
    await api.post(`/api/tasks/${taskId}/restore`);
    loadVault();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => {
      const titleMatch = (task.title || '').toLowerCase().includes(q);
      const tagMatch = (task.tags || []).some((tag) => tag.name.toLowerCase().includes(q));
      return titleMatch || tagMatch;
    });
  }, [tasks, query]);

  return (
    <div className="stack">
      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Completed vault</h2>
          <span className="muted">Archived tasks from previous periods</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 200px', gap: 10 }}>
          <input className="input" placeholder="Search by title or tag" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="select" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
            {horizons.map((h) => <option key={h} value={h}>{h === 'ALL' ? 'All horizons' : h.replace('_', ' ')}</option>)}
          </select>
        </div>
      </section>

      <section className="card">
        <div className="stack">
          {filtered.length === 0 && <div className="empty-state">No archived tasks found.</div>}
          {filtered.map((task) => (
            <div key={task.id} className="vault-row">
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{task.title}</strong>
                  <span className="badge">{task.horizon.replace('_', ' ')}</span>
                  <span className="badge">{task.period_key}</span>
                </div>
                <div className="muted">Archived {formatUtc(task.archived_at_utc)}</div>
                {task.description_markdown && <div className="muted">{task.description_markdown}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {(task.tags || []).map((tag) => (
                    <span key={tag.id} className="tag-chip" style={{ background: tag.color || '#1f2b4b' }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              <button className="button secondary" onClick={() => restoreTask(task.id)}>Restore to today</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatUtc(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
