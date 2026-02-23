import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2F6BFF');

  const load = async () => {
    const { data } = await api.get('/api/tags');
    setTags(data.tags || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    await api.post('/api/tags', { name, color });
    setName('');
    load();
  };

  const remove = async (id) => {
    await api.delete(`/api/tags/${id}`);
    load();
  };

  return (
    <div className="stack">
      <section className="card tags-form">
        <div className="panel-head">
          <h1 className="panel-title">Tags</h1>
          <span className="badge">max 10 words</span>
        </div>
        <div className="tags-create-row">
          <input className="input" placeholder="Tag name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="tags-color-input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <button className="button" onClick={create}>Add</button>
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <h2 className="panel-title">Saved tags</h2>
          <span className="badge">{tags.length}</span>
        </div>
        <div className="tags-chip-list">
        {tags.map((tag) => (
          <div className="tags-chip-item" key={tag.id}>
            <div className="tags-chip-left">
              <span className="tag-dot" style={{ background: tag.color || '#64748b' }} />
              <span className="tags-chip-name">{tag.name}</span>
            </div>
            <button className="tags-chip-delete" onClick={() => remove(tag.id)}>Delete</button>
          </div>
        ))}
        {tags.length === 0 && <div className="empty-state">No tags yet. Create your first tag.</div>}
        </div>
      </section>
    </div>
  );
}
