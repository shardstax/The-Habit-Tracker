import { useEffect, useRef, useState } from 'react';
import api from '../api/client.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Journal() {
  const [date, setDate] = useState(today());
  const [content, setContent] = useState('');
  const [history, setHistory] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/api/journal?date=${date}`);
    setContent(data.entry?.content_markdown || '');
    const historyRes = await api.get('/api/journal/history');
    setHistory(historyRes.data.entries || []);
  };

  useEffect(() => {
    load();
  }, [date]);

  const save = async () => {
    await api.post('/api/journal', { entry_date: date, content_markdown: content });
    load();
  };

  const searchTasks = async (query) => {
    if (!query.trim()) {
      setMentionResults([]);
      return;
    }
    const { data } = await api.get(`/api/tasks/search?q=${encodeURIComponent(query)}&limit=10`);
    setMentionResults(data.tasks || []);
  };

  const insertMention = (task) => {
    const mention = `@[${task.title}](task:${task.id})`;
    const textarea = textareaRef.current;
    if (!textarea || mentionStart < 0) {
      setContent((prev) => `${prev} ${mention}`.trim());
      return;
    }

    const cursor = textarea.selectionStart;
    const before = content.slice(0, mentionStart);
    const after = content.slice(cursor);
    const next = `${before}${mention} ${after}`;
    setContent(next);
    setMentionQuery('');
    setMentionResults([]);
    setMentionStart(-1);
  };

  const handleContentChange = async (nextValue) => {
    setContent(nextValue);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const uptoCursor = nextValue.slice(0, cursor);
    const atIndex = uptoCursor.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionResults([]);
      setMentionQuery('');
      setMentionStart(-1);
      return;
    }

    const token = uptoCursor.slice(atIndex + 1);
    if (token.includes(' ') || token.includes('\n')) {
      setMentionResults([]);
      setMentionQuery('');
      setMentionStart(-1);
      return;
    }

    setMentionStart(atIndex);
    setMentionQuery(token);
    await searchTasks(token);
  };

  return (
    <div className="grid grid-2">
      <section className="card">
        <div className="panel-head">
          <h1 className="panel-title">Journal</h1>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 180 }} />
        </div>
        <textarea
          ref={textareaRef}
          className="textarea"
          rows={13}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Type @ to mention a task"
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="button" onClick={save}>Save entry</button>
        </div>
        {mentionQuery !== '' && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Mention suggestions</h3>
            <div style={{ marginTop: 8 }}>
              {mentionResults.map((task) => (
                <button key={task.id} className="button ghost" style={{ marginRight: 8, marginBottom: 8 }} onClick={() => insertMention(task)}>
                  {task.title}
                </button>
              ))}
              {mentionResults.length === 0 && <p className="muted">No matching tasks</p>}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">History</h2>
          <span className="badge">{history.length}</span>
        </div>
        <div className="stack">
          {history.map((entry) => (
            <div key={entry.id} className="card" style={{ padding: 12 }}>
              <strong>{entry.entry_date}</strong>
              <p className="muted" style={{ marginBottom: 0 }}>{entry.content_markdown.slice(0, 140)}...</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
