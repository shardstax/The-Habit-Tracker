import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Mindset() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const load = async () => {
    const { data } = await api.get('/api/mindset');
    setNotes(data.notes || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title.trim() || !content.trim()) return;
    await api.post('/api/mindset', { title, content_markdown: content });
    setTitle('');
    setContent('');
    load();
  };

  return (
    <div className="grid grid-2">
      <section className="card">
        <div className="panel-head">
          <h1 className="panel-title">Mindset notes</h1>
        </div>
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="textarea" rows={7} placeholder="Write a note" value={content} onChange={(e) => setContent(e.target.value)} style={{ marginTop: 10 }} />
        <button className="button" style={{ marginTop: 10 }} onClick={create}>Add note</button>
      </section>

      <section className="stack">
        {notes.map((note) => (
          <div className="card" key={note.id}>
            <h3 style={{ marginTop: 0 }}>{note.title}</h3>
            <p className="muted" style={{ marginBottom: 0 }}>{note.content_markdown}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
