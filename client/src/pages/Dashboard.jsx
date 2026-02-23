import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import TaskItem from '../components/TaskItem.jsx';
import ReminderBell from '../components/ReminderBell.jsx';
import Heatmap from '../components/Heatmap.jsx';

const horizonList = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [periodKey, setPeriodKey] = useState('');
  const [motivation, setMotivation] = useState(null);
  const [github, setGithub] = useState(null);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [ghUsername, setGhUsername] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newTagId, setNewTagId] = useState('');
  const [dragTask, setDragTask] = useState(null);
  const [horizonSummary, setHorizonSummary] = useState({});
  const [horizonTasks, setHorizonTasks] = useState({});
  const [goalsSummary, setGoalsSummary] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === 'PENDING'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'DONE'), [tasks]);
  const urgentTasks = useMemo(() => pendingTasks.filter((task) => task.priority === 'URGENT').length, [pendingTasks]);

  const loadTasks = async () => {
    const { data } = await api.get('/api/tasks?horizon=DAILY&periodKey=current');
    const nextPeriodKey = data.periodKey || '';
    const nextTasks = applyStoredOrder(data.tasks || [], nextPeriodKey);
    setTasks(nextTasks);
    setPeriodKey(nextPeriodKey);
  };

  const loadMotivation = async () => {
    const { data } = await api.get('/api/motivation/today');
    setMotivation(data);
  };

  const loadGithub = async () => {
    try {
      const { data } = await api.get('/api/integrations/github/stats');
      setGithub(data);
      setRefreshMsg('');
    } catch (err) {
      setGithub(null);
      setRefreshMsg(err.response?.data?.message || 'GitHub stats unavailable');
    }
  };

  const loadTags = async () => {
    const { data } = await api.get('/api/tags');
    setAvailableTags(data.tags || []);
  };

  const loadHorizonSummary = async () => {
    const responses = await Promise.all(
      horizonList.map((horizon) => api.get(`/api/tasks?horizon=${horizon}&periodKey=current`))
    );

    const summary = {};
    const horizonBuckets = {};
    for (let i = 0; i < horizonList.length; i++) {
      const horizon = horizonList[i];
      const items = responses[i].data.tasks || [];
      const done = items.filter((task) => task.status === 'DONE').length;
      const pending = items.filter((task) => task.status === 'PENDING').length;
      summary[horizon] = {
        periodKey: responses[i].data.periodKey,
        done,
        pending,
        total: items.length,
      };
      horizonBuckets[horizon] = items.slice(0, 3);
    }
    setHorizonSummary(summary);
    setHorizonTasks(horizonBuckets);
  };

  const loadGoalsSummary = async () => {
    const { data } = await api.get('/api/goals');
    const goals = data.goals || [];
    const top = goals.slice(0, 4);
    const analytics = await Promise.all(top.map((goal) => api.get(`/api/goals/${goal.id}/analytics`)));
    const rows = top.map((goal, idx) => ({
      id: goal.id,
      title: goal.title,
      ...analytics[idx].data,
    }));
    setGoalsSummary(rows);
  };

  useEffect(() => {
    loadTasks();
    loadMotivation();
    loadGithub();
    loadTags();
    loadHorizonSummary();
    loadGoalsSummary();
  }, []);

  const refreshDashboard = async () => {
    await Promise.all([loadTasks(), loadHorizonSummary(), loadGoalsSummary()]);
  };

  const onTaskUpdated = () => refreshDashboard();

  const handleCreate = async () => {
    if (!newTask.trim()) return;
    const { data } = await api.post('/api/tasks', {
      title: newTask,
      horizon: 'DAILY',
      priority: newPriority,
      period_key: periodKey,
    });
    if (newTagId) {
      await api.post('/api/tags/assign', {
        tagId: Number(newTagId),
        entityType: 'TASK',
        entityId: data.task.id,
      });
    }
    setNewTask('');
    setNewTagId('');
    refreshDashboard();
  };

  const refreshGithub = async () => {
    setRefreshMsg('');
    try {
      const { data } = await api.post('/api/integrations/github/refresh');
      setGithub(data);
    } catch (err) {
      if (err.response?.status === 429) {
        const next = new Date(err.response.data.nextAllowedRefreshAtUtc);
        const diff = Math.max(0, next.getTime() - Date.now());
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setRefreshMsg(`Refresh available in ${hours}h ${minutes}m`);
      } else {
        setRefreshMsg(err.response?.data?.message || 'Refresh failed');
      }
    }
  };

  const saveGithubSettings = async () => {
    if (!ghUsername.trim() || !ghToken.trim()) {
      setRefreshMsg('GitHub username and token are required');
      return;
    }
    await api.post('/api/integrations/github/settings', {
      githubUsername: ghUsername,
      githubToken: ghToken,
    });
    setRefreshMsg('GitHub settings saved');
    setGhToken('');
    loadGithub();
  };

  const handleReorderDrop = (column, targetTaskId) => {
    if (!dragTask || dragTask.column !== column || dragTask.id === targetTaskId) return;
    const sourceList = column === 'todo' ? pendingTasks : completedTasks;
    const otherList = column === 'todo' ? completedTasks : pendingTasks;
    const working = [...sourceList];
    const from = working.findIndex((task) => task.id === dragTask.id);
    const to = working.findIndex((task) => task.id === targetTaskId);
    if (from === -1 || to === -1) return;

    const [moved] = working.splice(from, 1);
    working.splice(to, 0, moved);
    const nextTasks = column === 'todo' ? [...working, ...otherList] : [...pendingTasks, ...working];
    setTasks(nextTasks);
    if (periodKey && column === 'todo') {
      localStorage.setItem(`dailyOrder:${periodKey}`, JSON.stringify(working.map((task) => task.id)));
    }
    setDragTask(null);
  };

  const handleColumnDrop = async (targetColumn) => {
    if (!dragTask || dragTask.column === targetColumn) return;
    const nextStatus = targetColumn === 'todo' ? 'PENDING' : 'DONE';
    await api.patch(`/api/tasks/${dragTask.id}`, { status: nextStatus });
    setDragTask(null);
    refreshDashboard();
  };

  return (
    <div className="dashboard-shell">
      <section className="card hero-panel fade-up" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 0 }}>Daily focus ({periodKey})</h1>
        </div>
        <div className="hero-metrics">
          <div className="hero-pill">Pending {pendingTasks.length}</div>
          <div className="hero-pill">Completed {completedTasks.length}</div>
          <div className="hero-pill urgency-pill">Urgent {urgentTasks}</div>
          <Link className="button secondary" to="/vault">Open vault</Link>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-primary fade-up" style={{ '--delay': '80ms' }}>
          <div className="card">
            <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 140px 180px auto', gap: 10 }}>
              <input className="input" placeholder="Add a new task" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
              <select className="select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
              <select className="select" value={newTagId} onChange={(e) => setNewTagId(e.target.value)}>
                <option value="">Tag (optional)</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
              <button className="button" onClick={handleCreate}>Add</button>
            </div>

            <div className="task-board" style={{ marginTop: 12 }}>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>To Do ({pendingTasks.length})</h3>
                <p className="muted">Drag to reorder or move across columns.</p>
                <div className="grid" onDragOver={(event) => event.preventDefault()} onDrop={() => handleColumnDrop('todo')}>
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onChange={onTaskUpdated}
                      pushMode="next"
                      draggable={true}
                      onDragStart={() => setDragTask({ id: task.id, column: 'todo' })}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleReorderDrop('todo', task.id)}
                      availableTags={availableTags}
                    />
                  ))}
                  {pendingTasks.length === 0 && <div className="empty-state">No pending tasks. Add one above.</div>}
                </div>
              </div>

              {showCompleted ? (
                <div className="card">
                  <div className="panel-head">
                    <h3 style={{ margin: 0 }}>Completed today ({completedTasks.length})</h3>
                    <button className="button ghost" onClick={() => setShowCompleted(false)}>Hide</button>
                  </div>
                  <div className="grid" onDragOver={(event) => event.preventDefault()} onDrop={() => handleColumnDrop('done')}>
                    {completedTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onChange={onTaskUpdated}
                        pushMode="none"
                        availableTags={availableTags}
                        draggable={true}
                        onDragStart={() => setDragTask({ id: task.id, column: 'done' })}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleReorderDrop('done', task.id)}
                      />
                    ))}
                    {completedTasks.length === 0 && <div className="empty-state">No completed tasks yet.</div>}
                  </div>
                </div>
              ) : (
                <div className="card compact-panel">
                  <div className="panel-head">
                    <h3 style={{ margin: 0 }}>Completed today</h3>
                    <span className="badge">{completedTasks.length}</span>
                  </div>
                  <p className="muted">Completed tasks move to the vault after rollover.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="button secondary" onClick={() => setShowCompleted(true)}>Show list</button>
                    <Link className="button ghost" to="/vault">Open vault</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="dashboard-aside fade-up" style={{ '--delay': '140ms' }}>
          <ReminderBell />

          <div className="card motivation" style={{ backgroundImage: `url(${motivation?.backgroundImageUrl || ''})` }}>
            <div className="motivation-content">
              <h2>Today</h2>
              <p style={{ fontSize: 18, fontWeight: 600 }}>{motivation?.quote}</p>
              <p>{motivation?.author}</p>
            </div>
          </div>

          <div className="card">
            <h3>Coding Streak</h3>
            {github ? (
              <>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div><strong>Current:</strong> {github.currentStreak}</div>
                  <div><strong>Longest:</strong> {github.longestStreak}</div>
                </div>
                <Heatmap weeks={github.payload?.weeks || []} />
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button className="button secondary" onClick={refreshGithub}>Refresh</button>
                  {refreshMsg && <span className="muted">{refreshMsg}</span>}
                </div>
              </>
            ) : (
              <>
                <p className="muted">Connect GitHub with username + token to see streaks.</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input className="input" placeholder="GitHub username" value={ghUsername} onChange={(e) => setGhUsername(e.target.value)} />
                  <input className="input" placeholder="GitHub token" value={ghToken} onChange={(e) => setGhToken(e.target.value)} />
                </div>
                <button className="button secondary" style={{ marginTop: 8 }} onClick={saveGithubSettings}>Save</button>
                {refreshMsg && <p className="muted" style={{ marginTop: 8 }}>{refreshMsg}</p>}
              </>
            )}
          </div>
        </aside>
      </div>

      <section className="card fade-up" style={{ '--delay': '180ms' }}>
        <div className="panel-head">
          <h2 className="panel-title">Horizon lanes</h2>
          <span className="muted">See what is active across weekly, monthly, and beyond.</span>
        </div>
        <div className="horizon-lanes">
          {horizonList.map((horizon) => {
            const summary = horizonSummary[horizon] || { pending: 0, done: 0, total: 0, periodKey: '-' };
            const tasksForHorizon = horizonTasks[horizon] || [];
            const link = horizon === 'DAILY' ? '/dashboard' : `/horizon/${horizon}`;
            return (
              <Link key={horizon} to={link} className="horizon-lane">
                <div className="horizon-top">
                  <strong>{horizon.replace('_', ' ')}</strong>
                  <span className="muted">{summary.periodKey}</span>
                </div>
                <div className="horizon-stats">{summary.done} done / {summary.pending} pending</div>
                <div className="lane-list">
                  {tasksForHorizon.length === 0 && <div className="muted">No tasks yet.</div>}
                  {tasksForHorizon.map((task) => (
                    <div key={task.id} className="lane-task">
                      <span>{task.title}</span>
                      <span className="badge">{task.priority}</span>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="card fade-up" style={{ '--delay': '220ms' }}>
        <div className="panel-head">
          <h2 className="panel-title">Goals snapshot</h2>
          <Link to="/goals" className="muted">Open goals</Link>
        </div>
        <div className="grid" style={{ gap: 12 }}>
          {goalsSummary.length === 0 && <p className="muted">No goals yet</p>}
          {goalsSummary.map((goal) => (
            <Link key={goal.id} to={`/goals/${goal.id}`} className="goal-row">
              <div>
                <strong>{goal.title}</strong>
                <div className="muted">{goal.doneCount} done / {goal.pendingCount} pending</div>
              </div>
              <span className="goal-total">{goal.totalLinkedTasks}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function applyStoredOrder(tasks, periodKey) {
  if (!periodKey) return tasks;
  const key = `dailyOrder:${periodKey}`;
  const raw = localStorage.getItem(key);
  if (!raw) return tasks;

  let orderedIds;
  try {
    orderedIds = JSON.parse(raw);
  } catch (err) {
    return tasks;
  }
  if (!Array.isArray(orderedIds)) return tasks;

  const pending = tasks.filter((task) => task.status === 'PENDING');
  const done = tasks.filter((task) => task.status === 'DONE');
  const pendingById = new Map(pending.map((task) => [task.id, task]));

  const orderedPending = [];
  for (const id of orderedIds) {
    if (pendingById.has(id)) {
      orderedPending.push(pendingById.get(id));
      pendingById.delete(id);
    }
  }
  for (const task of pendingById.values()) orderedPending.push(task);
  return [...orderedPending, ...done];
}
