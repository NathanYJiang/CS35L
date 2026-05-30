import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import styles from './GroupDetails.module.css';
import LoadingSpinner from '../components/LoadingSpinner';
import { API } from '../config/api';
import {
  buildOwedFromExpenses,
  applySettlements,
  netBalancesForUser,
  suggestedSettlements,
} from '../utils/groupBalances';

const Settlements = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payTo, setPayTo] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [gRes, mRes, eRes, sRes] = await Promise.all([
        fetch(API.group(id), { headers }),
        fetch(API.members(id), { headers }),
        fetch(API.expenses(id), { headers }),
        fetch(API.settlements(id), { headers }),
      ]);
      if (!gRes.ok) throw new Error('Could not load this group.');
      setGroup(await gRes.json());
      if (mRes.ok) setMembers(await mRes.json());
      if (eRes.ok) {
        const list = await eRes.json();
        setExpenses(Array.isArray(list) ? list : []);
      }
      if (sRes.ok) {
        const list = await sRes.json();
        setSettlements(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load settlements.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const orderedMembers = useMemo(
    () => [...members].sort((a, b) => (a.id === user?.uid ? -1 : b.id === user?.uid ? 1 : 0)),
    [members, user?.uid]
  );

  const getDisplayName = (m) => {
    if (!m) return 'Unknown user';
    return m.id === user?.uid ? 'You' : (m.displayName || '').trim() || 'Unknown user';
  };

  const nameById = (mid) => getDisplayName(members.find((x) => x.id === mid) || { id: mid });

  const memberPalette = ['#007bff', '#42d6a3', '#ffc107'];
  const colorForName = (name) => {
    const names = orderedMembers.map((m) => getDisplayName(m));
    const idx = names.indexOf(name);
    if (idx !== -1) return memberPalette[idx % memberPalette.length];
    const hash = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return memberPalette[hash % memberPalette.length];
  };

  // Memoized so it keeps a stable identity and can be a clean dependency of
  // the balance calculations below (a fresh .map() each render would not).
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  const balanceAfterSettlements = useMemo(() => {
    const raw = buildOwedFromExpenses(expenses, memberIds);
    const adjusted = applySettlements(raw, settlements);
    return netBalancesForUser(adjusted, user?.uid, memberIds);
  }, [expenses, settlements, memberIds, user?.uid]);

  const groupSuggested = useMemo(() => {
    const raw = buildOwedFromExpenses(expenses, memberIds);
    const adjusted = applySettlements(raw, settlements);
    return suggestedSettlements(adjusted, memberIds);
  }, [expenses, settlements, memberIds]);

  const oweTargets = balanceAfterSettlements.oweRows;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setFormError('');
    const amountNum = Number(payAmount);
    if (!payTo) {
      setFormError('Choose who you paid.');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFormError('Enter a valid amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API.settlements(id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toUserId: payTo, amount: amountNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not record payment.');
      setPayAmount('');
      setPayTo('');
      await load();
    } catch (err) {
      setFormError(err?.message || 'Could not record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillOweAmount = (memberId, amount) => {
    setPayTo(memberId);
    setPayAmount(String(amount));
    setFormError('');
  };

  if (loading) return <LoadingSpinner message="Loading settlements…" />;

  return (
    <div className={`page-container ${styles.page}`}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(`/groups/${id}`)}>
          ← Back to group
        </button>
        {group?.name ? <p className={styles.allExpensesGroupName}>{group.name}</p> : null}
        <h1 className={styles.allExpensesTitle}>settlements</h1>
        <p className={styles.balanceIntro}>
          Record payments between members to update who still owes whom.
        </p>
      </div>

      {error ? <p className={styles.expenseError}>{error}</p> : null}

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Your balance</h3>
        <div className={styles.balanceColumns}>
          <div className={`${styles.balancePanel} ${styles.balancePanelOwe}`}>
            <div className={styles.balancePanelLabel}>You owe</div>
            <p className={styles.balancePanelTotal}>${balanceAfterSettlements.owe.toFixed(2)}</p>
          </div>
          <div className={`${styles.balancePanel} ${styles.balancePanelOwed}`}>
            <div className={styles.balancePanelLabel}>You are owed</div>
            <p className={styles.balancePanelTotal}>${balanceAfterSettlements.owed.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {oweTargets.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>You still owe</h3>
          <ul className={styles.balanceBreakdownList}>
            {oweTargets.map((row) => (
              <li key={row.id} className={styles.settlementOweRow}>
                <span className={styles.balanceBreakdownName} style={{ color: colorForName(nameById(row.id)) }}>
                  {nameById(row.id)}
                </span>
                <span className={styles.balanceBreakdownAmount}>${row.amount}</span>
                <button
                  type="button"
                  className={styles.settlementFillBtn}
                  onClick={() => fillOweAmount(row.id, row.amount)}
                >
                  Record ${row.amount}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Record a payment</h3>
        <form onSubmit={handleRecordPayment} className={styles.settlementForm}>
          <label className={styles.expenseFieldLabel}>
            Paid to
            <select
              className={styles.settlementSelect}
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
            >
              <option value="">Select member…</option>
              {orderedMembers
                .filter((m) => m.id !== user?.uid)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {getDisplayName(m)}
                  </option>
                ))}
            </select>
          </label>
          <label className={styles.expenseFieldLabel}>
            Amount ($)
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={styles.expenseInput}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0.00"
            />
          </label>
          {formError ? <p className={styles.expenseError}>{formError}</p> : null}
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Saving…' : 'Record payment'}
          </button>
        </form>
      </section>

      {groupSuggested.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Outstanding in group</h3>
          <p className={styles.balanceIntro}>Who still owes whom after recorded payments.</p>
          <div className={styles.allExpensesScroll}>
            <ul className={styles.allExpensesList}>
              {groupSuggested.map((edge, idx) => (
                <li key={`${edge.fromUserId}-${edge.toUserId}-${idx}`} className={styles.allExpensesItem}>
                  <p className={styles.activityRow}>
                    <span style={{ color: colorForName(nameById(edge.fromUserId)) }} className={styles.activityUser}>
                      {nameById(edge.fromUserId)}
                    </span>
                    <span className={styles.activityMeta}> owes </span>
                    <span style={{ color: colorForName(nameById(edge.toUserId)) }} className={styles.activityUser}>
                      {nameById(edge.toUserId)}
                    </span>
                    <span className={styles.activityAmount}> ${edge.amount}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={styles.allExpensesSection}>
        <h3 className={styles.sectionTitle}>Payment history</h3>
        {settlements.length === 0 ? (
          <p className={styles.balanceBreakdownEmpty}>No settlements recorded yet.</p>
        ) : (
          <div className={styles.allExpensesScroll}>
            <ul className={styles.allExpensesList}>
              {settlements.map((s) => (
                <li key={s.id} className={styles.allExpensesItem}>
                  <p className={styles.activityRow}>
                    <span style={{ color: colorForName(nameById(s.fromUserId)) }} className={styles.activityUser}>
                      {nameById(s.fromUserId)}
                    </span>
                    <span className={styles.activityMeta}> paid </span>
                    <span style={{ color: colorForName(nameById(s.toUserId)) }} className={styles.activityUser}>
                      {nameById(s.toUserId)}
                    </span>
                    <span className={styles.activityAmount}> ${s.amount}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default Settlements;
