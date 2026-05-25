import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import styles from './GroupDetails.module.css';
import LoadingSpinner from '../components/LoadingSpinner';
import { API } from '../config/api';

const PersonalTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
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
        const [gRes, eRes] = await Promise.all([
          fetch(API.group(id), { headers }),
          fetch(API.expenses(id), { headers }),
        ]);
        if (ignore) return;
        if (!gRes.ok) throw new Error('Could not load this group.');
        setGroup(await gRes.json());
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

  const myPayments = useMemo(() => {
    const uid = user?.uid;
    if (!uid) return [];
    return expenses.filter((e) => (e.paidBy || e.addedBy) === uid);
  }, [expenses, user?.uid]);

  const handleDeleteExpense = async (eid) => {
    if (!window.confirm('Delete this expense?')) return;
    const res = await fetch(API.expense(id, eid), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== eid));
  };

  const totalPaid = useMemo(
    () => myPayments.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [myPayments]
  );

  if (loading) return <LoadingSpinner message="Loading your payments…" />;

  return (
    <div className={`page-container ${styles.page}`}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(`/groups/${id}`)}>
          ← Back to group
        </button>
        {group?.name ? <p className={styles.allExpensesGroupName}>{group.name}</p> : null}
        <h1 className={styles.allExpensesTitle}>personal tracking</h1>
        <p className={styles.balanceIntro}>Expenses you paid for in this group.</p>
      </div>

      {error ? <p className={styles.expenseError}>{error}</p> : null}

      <section className={styles.allExpensesSection}>
        {myPayments.length === 0 ? (
          <p className={styles.balanceBreakdownEmpty}>You have not paid for any expenses in this group yet.</p>
        ) : (
          <>
            <p className={styles.personalTrackingTotal}>
              Total you paid: <strong>${totalPaid.toFixed(2)}</strong>
            </p>
            <div className={styles.allExpensesScroll}>
              <ul className={styles.allExpensesList}>
                {myPayments.map((a) => (
                  <li key={a.id} className={styles.allExpensesItem}>
                    <div className={styles.activityRowContainer}>
                      <p className={styles.activityRow}>
                        <span className={styles.activityUser} style={{ color: '#007bff' }}>
                          You
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
                ))}
              </ul>
            </div>
            <p className={styles.allExpensesCount}>
              {myPayments.length} payment{myPayments.length === 1 ? '' : 's'}
            </p>
          </>
        )}
      </section>
    </div>
  );
};

export default PersonalTracking;
