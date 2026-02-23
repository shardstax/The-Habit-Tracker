import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function ReminderBell() {
  const [reminders, setReminders] = useState([]);

  const load = async () => {
    const { data } = await api.get('/api/reminders');
    setReminders(data.reminders || []);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const markRead = async (id) => {
    await api.post(`/api/reminders/${id}/read`);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="card reminder-card">
      <div className="panel-head">
        <h3 className="panel-title">Reminders</h3>
        <span className="badge">{reminders.length}</span>
      </div>
      {reminders.length === 0 ? (
        <p className="muted">No reminders right now.</p>
      ) : (
        reminders.map((r) => (
          <div key={r.id} className="reminder-row">
            <div>
              <div className="reminder-title">{r.title}</div>
              <div className="muted">
                {formatReminderTime(r.remind_at_utc)} · {r.horizon.replace('_', ' ')} · {r.period_key}
              </div>
            </div>
            <button className="button secondary" onClick={() => markRead(r.id)}>Done</button>
          </div>
        ))
      )}
    </div>
  );
}

function formatReminderTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
