import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import TaskItem from '../components/TaskItem.jsx';

export default function Horizon() {
  const { horizon } = useParams();
  const [tasks, setTasks] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [periodKey, setPeriodKey] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newTagId, setNewTagId] = useState('');

  const load = async () => {
    const [tasksRes, tagsRes] = await Promise.all([
      api.get(`/api/tasks?horizon=${horizon}&periodKey=current`),
      api.get('/api/tags'),
    ]);
    setTasks(tasksRes.data.tasks || []);
    setPeriodKey(tasksRes.data.periodKey || '');
    setAvailableTags(tagsRes.data.tags || []);
  };

  useEffect(() => {
    load();
  }, [horizon]);

  const handleCreate = async () => {
    if (!newTask.trim()) return;
    const { data } = await api.post('/api/tasks', {
      title: newTask,
      horizon,
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
    load();
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="panel-head">
          <h1 className="panel-title">{horizon.replace('_', ' ')} ({periodKey})</h1>
          <span className="badge">{tasks.length} tasks</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input" placeholder={`Add ${horizon} task`} value={newTask} onChange={(e) => setNewTask(e.target.value)} />
          <select className="select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ maxWidth: 140 }}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <select className="select" value={newTagId} onChange={(e) => setNewTagId(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">Tag (optional)</option>
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          <button className="button" onClick={handleCreate}>Add</button>
        </div>
      </section>

      <section className="grid">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onChange={load} pushMode="none" availableTags={availableTags} />
        ))}
      </section>
    </div>
  );
}
