import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import styles from './GroupDetails.module.css';

const API = 'http://localhost:5001/api';

const GroupExpenses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [gRes, mRes, eRes] = await Promise.all([
          fetch(`${API}/groups/${id}`, { headers }),
          fetch(`${API}/groups/${id}/members`, { headers }),
          fetch(`${API}/groups/${id}/expenses`, { headers }),
        ]);
        if (ignore) return;
        if (!gRes.ok) throw new Error('Could not load this group.');
        setGroup(await gRes.json());
        if (mRes.ok) setMembers(await mRes.json());
        if (eRes.ok) {
          const list = await eRes.json();
          setExpenses(Array.isArray(list) ? list : []);
        } else {
          setExpenses([]);
        }
      } catch (err) {
        if (!ignore) setError(err?.message || 'Failed to load expenses.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id, token]);

  const orderedMembers = useMemo(
    () => [...members].sort((a, b) => (a.id === user?.uid ? -1 : b.id === user?.uid ? 1 : 0)),
    [members, user?.uid]
  );

  const getDisplayName = (m) => {
    if (!m) return 'Unknown user';
    return m.id === user?.uid ? 'You' : (m.displayName || '').trim() || 'Unknown user';
  };

  const memberPalette = ['#007bff', '#42d6a3', '#ffc107'];
  const colorForName = (name) => {
    const memberNames = orderedMembers.map((m) => getDisplayName(m));
    const idx = memberNames.indexOf(name);
    if (idx !== -1) return memberPalette[idx % memberPalette.length];
    const hash = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return memberPalette[hash % memberPalette.length];
  };

  const nameById = (mid) => getDisplayName(members.find((x) => x.id === mid) || { id: mid });

  const handleDeleteExpense = async (eid) => {
    if (!window.confirm('Delete this expense?')) return;
    const res = await fetch(`${API}/groups/${id}/expenses/${eid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== eid));
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        {/* Dynamic spinner class from CSS Module */}
        <div className={styles.spinner} />
        <p style={{ color: 'var(--light-text)', marginTop: '1rem' }}>Loading expenses…</p>
      </div>
    );
  }

  return (
    <div className="page-container" className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(`/groups/${id}`)}>
          ← Back to group
        </button>
        {group?.name ? (
          <p className={styles.allExpensesGroupName}>{group.name}</p>
        ) : null}
        <h1 className={styles.allExpensesTitle}>all group expenses</h1>
      </div>

      {error ? <p className={styles.expenseError}>{error}</p> : null}

      <section className={styles.allExpensesSection}>
        {expenses.length === 0 ? (
          <p className={styles.balanceBreakdownEmpty}>No expenses yet. Add one from the group page.</p>
        ) : (
          <div className={styles.allExpensesScroll}>
            <ul className={styles.allExpensesList}>
              {expenses.map((a) => {
                const name = nameById(a.paidBy || a.addedBy);
                return (
                  <li key={a.id} className={styles.allExpensesItem}>
                    <div className={styles.activityRowContainer}>
                      <p className={styles.activityRow}>
                        {/* We keep inline 'style' only for dynamic palette coloring */}
                        <span style={{ color: colorForName(name) }} className={styles.activityUser}>
                          {name}
                        </span>
                        <span className={styles.activityMeta}> paid for {a.purpose} </span>
                        <span className={styles.activityAmount}>${a.amount}</span>
                      </p>
                      {a.addedBy === user?.uid ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(a.id)}
                          className={styles.deleteBtn}
                          aria-label="Delete expense"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {expenses.length > 0 ? (
          <p className={styles.allExpensesCount}>
            {expenses.length} transaction{expenses.length === 1 ? '' : 's'}
          </p>
        ) : null}
      </section>
    </div>
  );
};

export default GroupExpenses;
