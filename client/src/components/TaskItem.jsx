import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api/client.js';

const priorityColors = {
  LOW: '#94a3b8',
  MEDIUM: '#38bdf8',
  HIGH: '#f97316',
  URGENT: '#ef4444',
};

export default function TaskItem({
  task,
  onChange,
  pushMode = 'none',
  currentDailyKey = '',
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  availableTags = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleDone = async () => {
    const nextStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    const { data } = await api.patch(`/api/tasks/${task.id}`, { status: nextStatus });
    onChange?.(data.task);
  };

  const pushNext = async () => {
    const { data } = await api.post(`/api/tasks/${task.id}/push`);
    onChange?.(data.task);
  };

  const pushToday = async () => {
    if (!currentDailyKey) return;
    const { data } = await api.patch(`/api/tasks/${task.id}`, { period_key: currentDailyKey });
    onChange?.(data.task);
  };

  const tagIds = useMemo(() => new Set((task.tags || []).map((tag) => tag.id)), [task.tags]);

  const toggleTag = async (tagId) => {
    if (tagIds.has(tagId)) {
      await api.post('/api/tags/unassign', { tagId, entityType: 'TASK', entityId: task.id });
    } else {
      await api.post('/api/tags/assign', { tagId, entityType: 'TASK', entityId: task.id });
    }
    await onChange?.();
  };

  return (
    <div
      className="task"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input type="checkbox" checked={task.status === 'DONE'} onChange={toggleDone} />
      <div>
        <div className="task-title">{task.title}</div>
        {task.description_markdown && (
          <div className="muted">
            <ReactMarkdown>{task.description_markdown}</ReactMarkdown>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: `${priorityColors[task.priority]}22`, color: priorityColors[task.priority] }}>
            {task.priority}
          </span>
          {(task.tags || []).map((tag) => (
            <span key={tag.id} className="tag-chip" style={{ background: tag.color || '#eef2ff' }}>
              {tag.name}
            </span>
          ))}
        </div>
      </div>
      <div className="task-actions">
        <button className="menu-button" onClick={() => setMenuOpen((prev) => !prev)} aria-label="Task actions">
          ...
        </button>
        {menuOpen && (
          <div className="task-menu">
            {pushMode === 'next' && task.status === 'PENDING' && (
              <button className="task-menu-item" onClick={pushNext}>Push Tomorrow</button>
            )}
            {pushMode === 'today' && task.status === 'PENDING' && (
              <button className="task-menu-item" onClick={pushToday}>Push Today</button>
            )}
            <div className="task-menu-label">Tags</div>
            {availableTags.length === 0 && <div className="task-menu-empty">No tags available</div>}
            {availableTags.map((tag) => (
              <button key={tag.id} className="task-menu-item" onClick={() => toggleTag(tag.id)}>
                {tagIds.has(tag.id) ? 'Remove: ' : 'Add: '} {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
