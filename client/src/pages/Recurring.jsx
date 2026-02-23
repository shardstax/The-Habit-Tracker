import { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

const horizons = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];

export default function Recurring() {
  const [templates, setTemplates] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState('DAILY');
  const [priority, setPriority] = useState('MEDIUM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editState, setEditState] = useState({});

  const loadTemplates = async () => {
    const { data } = await api.get('/api/recurring-templates');
    setTemplates(data.templates || []);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !startDate) return;
    await api.post('/api/recurring-templates', {
      title: title.trim(),
      description_markdown: description.trim() || null,
      horizon,
      priority,
      is_active: true,
      start_date: startDate,
      end_date: endDate || null,
      reminder_enabled: reminderEnabled,
      reminder_time_local: reminderEnabled ? reminderTime || '09:00:00' : null,
    });
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setReminderEnabled(false);
    setReminderTime('');
    loadTemplates();
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setEditState({
      title: template.title || '',
      description_markdown: template.description_markdown || '',
      horizon: template.horizon,
      priority: template.priority,
      is_active: !!template.is_active,
      start_date: template.start_date,
      end_date: template.end_date || '',
      reminder_enabled: !!template.reminder_enabled,
      reminder_time_local: template.reminder_time_local || '',
    });
  };

  const saveEdit = async () => {
    await api.patch(`/api/recurring-templates/${editingId}`, {
      ...editState,
      end_date: editState.end_date || null,
      reminder_time_local: editState.reminder_enabled ? (editState.reminder_time_local || '09:00:00') : null,
    });
    setEditingId(null);
    setEditState({});
    loadTemplates();
  };

  const toggleActive = async (template) => {
    await api.patch(`/api/recurring-templates/${template.id}`, { is_active: !template.is_active });
    loadTemplates();
  };

  const deleteTemplate = async (templateId) => {
    await api.delete(`/api/recurring-templates/${templateId}`);
    loadTemplates();
  };

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [templates]);

  return (
    <div className="stack">
      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Recurring tasks</h2>
          <span className="muted">Templates that auto-generate each period</span>
        </div>
        <div className="grid" style={{ gap: 12 }}>
          <input className="input" placeholder="Template title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="textarea" rows="3" placeholder="Description (markdown)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <select className="select" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              {horizons.map((h) => <option key={h} value={h}>{h.replace('_', ' ')}</option>)}
            </select>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'auto auto 1fr', gap: 10, alignItems: 'center' }}>
            <label className="badge" style={{ gap: 8 }}>
              <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} />
              Reminder
            </label>
            <input className="input" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={!reminderEnabled} />
            <button className="button" onClick={handleCreate}>Create template</button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Active templates</h2>
          <span className="muted">Toggle, edit, or retire recurring flows</span>
        </div>
        <div className="stack">
          {sortedTemplates.length === 0 && <div className="empty-state">No recurring templates yet.</div>}
          {sortedTemplates.map((template) => (
            <div key={template.id} className="recurring-row">
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{template.title}</strong>
                  <span className="badge">{template.horizon.replace('_', ' ')}</span>
                  <span className="badge">{template.priority}</span>
                </div>
                <div className="muted">Start {template.start_date}{template.end_date ? ` • End ${template.end_date}` : ''}</div>
                {template.description_markdown && <div className="muted">{template.description_markdown}</div>}
                {template.reminder_enabled && template.reminder_time_local && (
                  <div className="muted">Reminder {template.reminder_time_local}</div>
                )}
              </div>
              <div className="recurring-actions">
                <button className="button secondary" onClick={() => toggleActive(template)}>
                  {template.is_active ? 'Pause' : 'Activate'}
                </button>
                <button className="button secondary" onClick={() => startEdit(template)}>Edit</button>
                <button className="button ghost" onClick={() => deleteTemplate(template.id)}>Delete</button>
              </div>
              {editingId === template.id && (
                <div className="recurring-edit">
                  <input className="input" value={editState.title || ''} onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))} />
                  <textarea className="textarea" rows="2" value={editState.description_markdown || ''} onChange={(e) => setEditState((s) => ({ ...s, description_markdown: e.target.value }))} />
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <select className="select" value={editState.horizon} onChange={(e) => setEditState((s) => ({ ...s, horizon: e.target.value }))}>
                      {horizons.map((h) => <option key={h} value={h}>{h.replace('_', ' ')}</option>)}
                    </select>
                    <select className="select" value={editState.priority} onChange={(e) => setEditState((s) => ({ ...s, priority: e.target.value }))}>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                    <input className="input" type="date" value={editState.start_date || ''} onChange={(e) => setEditState((s) => ({ ...s, start_date: e.target.value }))} />
                    <input className="input" type="date" value={editState.end_date || ''} onChange={(e) => setEditState((s) => ({ ...s, end_date: e.target.value }))} />
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'auto auto 1fr', gap: 10, alignItems: 'center' }}>
                    <label className="badge" style={{ gap: 8 }}>
                      <input type="checkbox" checked={!!editState.reminder_enabled} onChange={(e) => setEditState((s) => ({ ...s, reminder_enabled: e.target.checked }))} />
                      Reminder
                    </label>
                    <input className="input" type="time" value={editState.reminder_time_local || ''} onChange={(e) => setEditState((s) => ({ ...s, reminder_time_local: e.target.value }))} disabled={!editState.reminder_enabled} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="button secondary" onClick={() => { setEditingId(null); setEditState({}); }}>Cancel</button>
                      <button className="button" onClick={saveEdit}>Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
