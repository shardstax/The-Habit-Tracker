import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client.js';
import TaskItem from '../components/TaskItem.jsx';

export default function GoalDetail() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [tasks, setTasks] = useState([]);

  const load = async () => {
    const [analyticsRes, tasksRes] = await Promise.all([
      api.get(`/api/goals/${id}/analytics`),
      api.get(`/api/goals/${id}/tasks`),
    ]);
    setAnalytics(analyticsRes.data);
    setTasks(tasksRes.data.tasks || []);
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <div className="stack">
      <section className="card">
        <div className="panel-head">
          <h1 className="panel-title">Goal analytics</h1>
        </div>
        {analytics && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div><strong>Total:</strong> {analytics.totalLinkedTasks}</div>
              <div><strong>Done:</strong> {analytics.doneCount}</div>
              <div><strong>Pending:</strong> {analytics.pendingCount}</div>
            </div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={analytics.seriesCompletedByDate}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Linked tasks</h2>
          <span className="badge">{tasks.length}</span>
        </div>
        <div className="grid">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onChange={load} />
          ))}
        </div>
      </section>
    </div>
  );
}
