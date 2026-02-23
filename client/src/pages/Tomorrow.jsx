import { useEffect, useState } from 'react';
import api from '../api/client.js';
import TaskItem from '../components/TaskItem.jsx';

export default function Tomorrow() {
  const [tasks, setTasks] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [periodKey, setPeriodKey] = useState('');
  const [currentDailyKey, setCurrentDailyKey] = useState('');

  const load = async () => {
    const [tomorrowRes, currentRes, tagsRes] = await Promise.all([
      api.get('/api/tasks?horizon=DAILY&periodKey=tomorrow'),
      api.get('/api/tasks?horizon=DAILY&periodKey=current'),
      api.get('/api/tags'),
    ]);
    setTasks(tomorrowRes.data.tasks || []);
    setPeriodKey(tomorrowRes.data.periodKey || '');
    setCurrentDailyKey(currentRes.data.periodKey || '');
    setAvailableTags(tagsRes.data.tags || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="card">
      <div className="panel-head">
        <h1 className="panel-title">Tomorrow plan ({periodKey})</h1>
        <span className="badge">{tasks.length} tasks</span>
      </div>
      <div className="grid">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onChange={load}
            pushMode="today"
            currentDailyKey={currentDailyKey}
            availableTags={availableTags}
          />
        ))}
      </div>
    </section>
  );
}
