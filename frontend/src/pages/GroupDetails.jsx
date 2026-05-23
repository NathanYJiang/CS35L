import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ds, ms } from './GroupDetails.styles';
import LoadingSpinner from '../components/LoadingSpinner';
import { API } from '../config/api';

/* ─── Add Member Modal ─────────────────────────────────────────────────────── */
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
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.sheet} onClick={e => e.stopPropagation()}>
        <div style={ms.sheetHandle} />
        <div style={ms.sheetHeader}>
          <h3 style={ms.sheetTitle}>Add Member</h3>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p style={ms.sheetSub}>Search by username to invite someone to this group.</p>
        <form onSubmit={search} style={ms.searchRow}>
          <input style={ms.searchInput} placeholder="Username…" value={query} onChange={e => { setQuery(e.target.value); setNotice(null); }} autoFocus />
          <button type="submit" style={ms.searchBtn} disabled={loading}>{loading ? '…' : 'Search'}</button>
        </form>
        {notice && <p style={{ ...ms.feedback, color: notice.type === 'error' ? '#c62828' : 'var(--primary-color)' }}>{notice.message}</p>}
        <ul style={ms.resultList}>
          {results.map(u => (
            <li key={u.id} style={ms.resultItem}>
              <div style={ms.resultAvatar}>{(u.username || u.email || '?')[0].toUpperCase()}</div>
              <span style={ms.resultName}>{u.username || u.email}</span>
              <button style={ms.addBtn} onClick={() => addUser(u.id, u.username || u.email)} disabled={adding === u.id}>{adding === u.id ? '…' : 'Add'}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ─── Main Dashboard ────────────────────────────────────────────────────────── */
const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [activityEntries, setActivityEntries] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({ amount: '', purpose: '', paidBy: '', splitBetween: [], error: '' });

  const fetchData = async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [gRes, mRes, eRes] = await Promise.all([
        fetch(API.group(id),    { headers }),
        fetch(API.members(id),  { headers }),
        fetch(API.expenses(id), { headers }),
      ]);
      if (gRes.ok) setGroup(await gRes.json());
      if (mRes.ok) setMembers(await mRes.json());
      if (eRes.ok) setActivityEntries(await eRes.json() || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [id, token]);

  useEffect(() => {
    if (showAddExpense && user?.uid) {
      setExpenseForm(prev => ({
        ...prev,
        paidBy: user.uid,
        splitBetween: members.map(m => m.id),
        error: ''
      }));
    }
  }, [showAddExpense, members, user?.uid]);

  const orderedMembers = useMemo(() => 
    [...members].sort((a, b) => (a.id === user?.uid ? -1 : b.id === user?.uid ? 1 : 0)), 
  [members, user?.uid]);

  const getDisplayName = (m) => {
    if (!m) return 'Unknown user';
    return m.id === user?.uid ? 'You' : (m.displayName || '').trim() || 'Unknown user';
  };

  const memberPalette = ['#007bff', '#42d6a3', '#ffc107'];
  const colorForName = (name) => {
    const memberNames = orderedMembers.map(m => getDisplayName(m));
    const idx = memberNames.indexOf(name);
    if (idx !== -1) return memberPalette[idx % memberPalette.length];
    const hash = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return memberPalette[hash % memberPalette.length];
  };

  const nameById = (mid) => getDisplayName(members.find(x => x.id === mid) || { id: mid });

  const balanceDerived = useMemo(() => {
    const owed = {};
    activityEntries.forEach(exp => {
      const amt = Number(exp.amount);
      const payer = exp.paidBy || exp.addedBy;
      const split = exp.splitBetween?.length ? exp.splitBetween : members.map(m => m.id);
      const share = amt / (split.length || 1);
      split.forEach(debtor => { if (debtor !== payer) {
        owed[debtor] = owed[debtor] || {};
        owed[debtor][payer] = (owed[debtor][payer] || 0) + share;
      }});
    });

    const oweRows = [], owedRows = [];
    let totalOwe = 0, totalOwed = 0;

    members.forEach(m => {
      if (m.id === user?.uid) return;
      const net = (owed[user?.uid]?.[m.id] || 0) - (owed[m.id]?.[user?.uid] || 0);
      if (net > 0.009) {
        const rounded = Math.round(net * 100) / 100;
        oweRows.push({ id: m.id, amount: rounded });
        totalOwe += rounded;
      } else if (net < -0.009) {
        const rounded = Math.round(Math.abs(net) * 100) / 100;
        owedRows.push({ id: m.id, amount: rounded });
        totalOwed += rounded;
      }
    });

    return { owe: totalOwe.toFixed(2), owed: totalOwed.toFixed(2), oweRows, owedRows };
  }, [activityEntries, members, user?.uid]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const { amount, purpose, paidBy, splitBetween } = expenseForm;
    if (!purpose || !Number(amount)) return setExpenseForm(p => ({ ...p, error: 'Check purpose and amount.' }));

    try {
      const res = await fetch(API.expenses(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount), purpose, paidBy, splitBetween }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setActivityEntries(prev => [data, ...prev]);
      setShowAddExpense(false);
      setExpenseForm({ amount: '', purpose: '', paidBy: '', splitBetween: [], error: '' });
    } catch (err) { setExpenseForm(p => ({ ...p, error: err.message })); }
  };

  const handleDeleteExpense = async (eid) => {
    if (!window.confirm('Are you sure?')) return;
    const res = await fetch(API.expense(id, eid), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setActivityEntries(prev => prev.filter(e => e.id !== eid));
  };

  if (!group) return <LoadingSpinner message="Loading trip…" />;

  return (
    <div className="page-container" style={ds.page}>
      <div style={ds.header}>
        <button style={ds.backBtn} onClick={() => navigate('/')}>← Back to my groups</button>
        <h1 style={ds.tripName}>{group.name}</h1>
      </div>
      <div style={ds.rule} />

      <div style={ds.membersLine}>
        <h3 style={ds.membersLabel}>Members:</h3>
        <span style={ds.membersText}>
          {orderedMembers.map((m, idx) => {
            const name = getDisplayName(m);
            return (
              <span key={m.id}>
                <span style={{ ...ds.memberName, color: colorForName(name) }}>{name}</span>
                {idx < orderedMembers.length - 1 && <span style={ds.memberDivider}> | </span>}
              </span>
            );
          })}
        </span>
        <button style={ds.addMemberBtn} onClick={() => setShowAddMember(true)}>+ Add member</button>
      </div>

      <section style={ds.card}>
        <h3 style={ds.sectionTitle}>Balances</h3>
        <p style={ds.balanceIntro}>Each column: your total on top, per-person amounts below.</p>
        <div style={ds.balanceColumns}>
          {[
            { label: 'You owe', key: 'owe', style: ds.balancePanelOwe },
            { label: 'You are owed', key: 'owed', style: ds.balancePanelOwed }
          ].map(col => (
            <div key={col.key} style={{ ...ds.balancePanel, ...col.style }}>
              <div style={ds.balancePanelLabel}>{col.label}</div>
              <p style={ds.balancePanelTotal}>${balanceDerived[col.key]}</p>
              <div style={ds.balancePanelRule} /><div style={ds.balancePanelSub}>Per person</div>
              {balanceDerived[`${col.key}Rows`].length === 0 ? (
                <p style={ds.balanceBreakdownEmpty}>No one right now</p>
              ) : (
                <ul style={ds.balanceBreakdownList}>
                  {balanceDerived[`${col.key}Rows`].map(row => (
                    <li key={row.id} style={ds.balanceBreakdownItem}>
                      <span style={{ ...ds.balanceBreakdownName, color: colorForName(nameById(row.id)) }}>{nameById(row.id)}</span>
                      <span style={ds.balanceBreakdownAmount}>${row.amount}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {activityEntries.length > 0 && (
        <>
          <div style={ds.rule} />
          <section style={ds.activitySection}>
            <h3 style={ds.activityTitle}>Recent Activity</h3>
            <div style={ds.activityList}>
              {activityEntries.slice(0, 10).map(a => {
                const name = nameById(a.paidBy || a.addedBy);
                return (
                  <div key={a.id} style={ds.activityRowContainer}>
                    <p style={ds.activityRow}>
                      <span style={{ ...ds.activityUser, color: colorForName(name) }}>{name}</span>
                      <span style={ds.activityMeta}> paid for {a.purpose} </span>
                      <span style={ds.activityAmount}>${a.amount}</span>
                    </p>
                    {a.addedBy === user?.uid && <button onClick={() => handleDeleteExpense(a.id)} style={ds.deleteBtn}>✕</button>}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <div style={ds.rule} />
      <section style={ds.actions}>
        <button style={ds.addExpenseBtn} onClick={() => setShowAddExpense(true)}>+ Add expense</button>
        <div style={ds.secondaryRow}>
          <button style={{ ...ds.secondaryBtnRow, ...ds.secondaryBtnBlue }}>View Group Expenses</button>
          <button style={{ ...ds.secondaryBtnRow, ...ds.secondaryBtnGreen }}>Personal Tracking</button>
          <button style={{ ...ds.secondaryBtnRow, ...ds.secondaryBtnYellow }}>Settlements</button>
        </div>
      </section>

      {showAddExpense && (
        <div style={ds.expenseOverlay} onClick={() => setShowAddExpense(false)}>
          <section style={ds.expenseModal} onClick={e => e.stopPropagation()}>
            <div style={ds.expenseModalHeader}>
              <h3 style={ds.sectionTitle}>Add Expense</h3>
              <button style={ds.expenseCloseBtn} onClick={() => setShowAddExpense(false)}>✕</button>
            </div>
            <form onSubmit={handleAddExpense} style={ds.expenseForm}>
              <div style={ds.expensePeopleRow}>
                <div style={ds.expensePeopleCol}>
                  <span style={ds.expenseFieldLabel}>Paid by</span>
                  <div style={ds.memberChipRow}>
                    {orderedMembers.map(m => (
                      <button key={m.id} type="button" 
                        style={{ ...ds.memberChip, ...(expenseForm.paidBy === m.id ? ds.memberChipActive : {}) }}
                        onClick={() => setExpenseForm(p => ({ ...p, paidBy: m.id }))}
                      >+ {getDisplayName(m)}</button>
                    ))}
                  </div>
                </div>
                <div style={ds.expensePeopleCol}>
                  <span style={ds.expenseFieldLabel}>Split between</span>
                  <div style={ds.memberChipRow}>
                    {orderedMembers.map(m => {
                      const active = expenseForm.splitBetween.includes(m.id);
                      return (
                        <button key={m.id} type="button" 
                          style={{ ...ds.memberChip, ...(active ? ds.memberChipActive : {}) }}
                          onClick={() => setExpenseForm(p => ({
                            ...p,
                            splitBetween: active ? (p.splitBetween.length > 1 ? p.splitBetween.filter(id => id !== m.id) : p.splitBetween) : [...p.splitBetween, m.id]
                          }))}
                        >{active ? '✓' : '+'} {getDisplayName(m)}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p style={ds.expenseHint}>Who paid is the card or cash outlay. Split between is everyone who should owe a share.</p>
              <div style={ds.expenseInlineRow}>
                <input type="number" step="0.01" placeholder="Amount" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} style={{ ...ds.expenseInput, ...ds.expenseInputAmount }} />
                <input type="text" placeholder="Purpose" value={expenseForm.purpose} onChange={e => setExpenseForm(p => ({ ...p, purpose: e.target.value }))} style={{ ...ds.expenseInput, ...ds.expenseInputPurpose }} />
              </div>
              {expenseForm.error && <p style={ds.expenseError}>{expenseForm.error}</p>}
              <div style={ds.expenseActions}>
                <button type="button" style={ds.expenseCancelBtn} onClick={() => setShowAddExpense(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Expense</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showAddMember && <AddMemberModal groupId={id} token={token} onClose={() => setShowAddMember(false)} onAdded={fetchData} />}
    </div>
  );
};

export default GroupDetails;
