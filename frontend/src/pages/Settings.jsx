import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API } from '../config/api';

const API_BASE = API.users;

const defaultSettings = {
  notifications: {
    expenseAdded: true,
    settlementReminder: true,
    groupInvite: true,
  },
  currency: 'USD',
};

const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CAD', label: 'CAD (C$)' },
];

/* ── inline styles ──────────────────────────────────────────────── */
const s = {
  page: { maxWidth: 540, margin: '0 auto' },
  heading: { marginBottom: '0.25rem' },
  subtitle: { color: 'var(--light-text)', marginBottom: '1.75rem', fontSize: '0.95rem' },
  section: {
    background: 'var(--surface-soft)',
    borderRadius: 14,
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--light-text)',
    marginBottom: '1rem',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0',
    borderBottom: '1px solid var(--border-color)',
  },
  rowLast: { borderBottom: 'none' },
  rowLabel: { fontWeight: 500, fontSize: '0.95rem' },
  rowSub: { fontSize: '0.8rem', color: 'var(--light-text)', marginTop: 2 },
  toggle: {
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  toggleDot: {
    position: 'absolute',
    top: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
  },
  select: {
    padding: '0.5rem 0.75rem',
    borderRadius: 10,
    border: '1px solid var(--border-color)',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    background: '#fff',
  },
  danger: {
    background: '#fff5f5',
    border: '1px solid #ffd6d6',
    borderRadius: 14,
    padding: '1.25rem 1.5rem',
    marginTop: '1.5rem',
  },
  dangerBtn: {
    background: 'var(--danger-color)',
    color: '#fff',
    fontWeight: 600,
    borderRadius: 10,
    padding: '0.5rem 1.25rem',
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
  },
  saved: {
    display: 'inline-block',
    color: 'var(--primary-color)',
    fontWeight: 600,
    fontSize: '0.85rem',
    marginLeft: '0.75rem',
    transition: 'opacity 0.3s',
  },
};

/* ── component ──────────────────────────────────────────────────── */
const Settings = () => {
  const { token } = useContext(AuthContext);

  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');

  // Load settings from backend
  useEffect(() => {
    if (!token) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (ignore || !res.ok || !data) return;
        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            ...data.settings,
            notifications: { ...prev.notifications, ...(data.settings.notifications || {}) },
          }));
        }
      } catch { /* use defaults */ }
    })();
    return () => { ignore = true; };
  }, [token]);

  const persist = async (next) => {
    setSettings(next);
    setSaving(true);
    try {
      await fetch(`${API_BASE}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: next }),
      });
      setFlash('Saved');
      setTimeout(() => setFlash(''), 1500);
    } catch { /* silent */ }
    setSaving(false);
  };

  const toggleNotif = (key) => {
    const next = {
      ...settings,
      notifications: { ...settings.notifications, [key]: !settings.notifications[key] },
    };
    persist(next);
  };

  const setCurrency = (code) => {
    persist({ ...settings, currency: code });
  };

  const Toggle = ({ on, onToggle }) => (
    <button
      type="button"
      style={{ ...s.toggle, background: on ? 'var(--primary-color)' : '#cdd4e0' }}
      onClick={onToggle}
      aria-pressed={on}
    >
      <span style={{ ...s.toggleDot, left: on ? 23 : 3 }} />
    </button>
  );

  return (
    <div className="page-container" style={s.page}>
      <h2 style={s.heading}>Settings</h2>
      <p style={s.subtitle}>
        Manage your preferences
        {flash && <span style={s.saved}>{flash}</span>}
      </p>

      {/* Notifications */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Notifications</div>

        <div style={s.row}>
          <div>
            <div style={s.rowLabel}>Expense added</div>
            <div style={s.rowSub}>Get notified when a group member logs an expense</div>
          </div>
          <Toggle on={settings.notifications.expenseAdded} onToggle={() => toggleNotif('expenseAdded')} />
        </div>

        <div style={s.row}>
          <div>
            <div style={s.rowLabel}>Settlement reminders</div>
            <div style={s.rowSub}>Periodic reminders about outstanding balances</div>
          </div>
          <Toggle on={settings.notifications.settlementReminder} onToggle={() => toggleNotif('settlementReminder')} />
        </div>

        <div style={{ ...s.row, ...s.rowLast }}>
          <div>
            <div style={s.rowLabel}>Group invitations</div>
            <div style={s.rowSub}>Alert when someone adds you to a group</div>
          </div>
          <Toggle on={settings.notifications.groupInvite} onToggle={() => toggleNotif('groupInvite')} />
        </div>
      </div>

      {/* Display */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Display</div>

        <div style={{ ...s.row, ...s.rowLast }}>
          <div>
            <div style={s.rowLabel}>Currency</div>
            <div style={s.rowSub}>Used across all balance displays</div>
          </div>
          <select
            style={s.select}
            value={settings.currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Danger zone */}
      <div style={s.danger}>
        <div style={{ ...s.sectionTitle, color: 'var(--danger-color)' }}>Danger Zone</div>
        <div style={{ ...s.row, ...s.rowLast }}>
          <div>
            <div style={s.rowLabel}>Delete account</div>
            <div style={s.rowSub}>This action is permanent and cannot be undone</div>
          </div>
          <button
            type="button"
            style={s.dangerBtn}
            onClick={() => window.alert('Account deletion is not yet implemented. Please contact support.')}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
