import { useState } from 'react';
import styles from '../pages/GroupDetails.module.css';
import { API } from '../config/api';

const AddMemberModal = ({ groupId, token, onClose, onAdded }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [notice, setNotice] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    setNotice(null);
    try {
      const res = await fetch(API.userSearch(q), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Search failed');
      if (!data?.length) throw new Error(`No user found with username "${q}".`);
      setResults(data);
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userId, username) => {
    setAdding(userId);
    try {
      const res = await fetch(API.members(groupId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Could not add member.');
      setNotice({ type: 'success', message: `${username} added!` });
      setResults(r => r.filter(u => u.id !== userId));
      onAdded();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <h3 className={styles.sheetTitle}>Add Member</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p className={styles.sheetSub}>Search by username to invite someone to this group.</p>
        <form onSubmit={search} className={styles.searchRow}>
          <input className={styles.searchInput} placeholder="Username…" value={query} onChange={e => { setQuery(e.target.value); setNotice(null); }} autoFocus />
          <button type="submit" className={styles.searchBtn} disabled={loading}>{loading ? '…' : 'Search'}</button>
        </form>
        {notice && (
          <p 
            className={styles.feedback} 
            style={{ color: notice.type === 'error' ? '#c62828' : 'var(--primary-color)' }}
          >
            {notice.message}
          </p>
        )}
        <ul className={styles.resultList}>
          {results.map(u => (
            <li key={u.id} className={styles.resultItem}>
              <div className={styles.resultAvatar}>{(u.username || u.email || '?')[0].toUpperCase()}</div>
              <span className={styles.resultName}>{u.username || u.email}</span>
              <button className={styles.addBtn} onClick={() => addUser(u.id, u.username || u.email)} disabled={adding === u.id}>{adding === u.id ? '…' : 'Add'}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AddMemberModal;
