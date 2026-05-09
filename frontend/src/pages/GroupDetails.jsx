import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
      const res = await fetch(
        `http://localhost:5001/api/users/search?query=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data && typeof data.error === 'string' ? data.error : 'Could not search the database.';
        setNotice({ type: 'error', message: msg });
        return;
      }
      const users = Array.isArray(data) ? data : [];
      if (users.length === 0) {
        setNotice({
          type: 'error',
          message: `No user found with username "${q}". Check the spelling or ask them to create an account first.`,
        });
        return;
      }
      setResults(users);
    } catch {
      setNotice({ type: 'error', message: 'Network error. Check that the server is running.' });
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userId, username) => {
    setAdding(userId);
    setNotice(null);
    try {
      const res = await fetch(`http://localhost:5001/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setNotice({ type: 'success', message: `${username} was added to the group.` });
        setResults((r) => r.filter((u) => u.id !== userId));
        onAdded();
      } else {
        const d = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: d.error || 'Could not add this member.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Network error while adding member.' });
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
          <button style={ms.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p style={ms.sheetSub}>Search by username to invite someone to this group.</p>

        <form onSubmit={search} style={ms.searchRow}>
          <input
            style={ms.searchInput}
            placeholder="Username…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNotice(null);
            }}
            autoFocus
          />
          <button type="submit" style={ms.searchBtn} disabled={loading}>
            {loading ? '…' : 'Search'}
          </button>
        </form>

        {notice && (
          <p
            style={{
              ...ms.feedback,
              color: notice.type === 'error' ? '#c62828' : 'var(--primary-color)',
            }}
          >
            {notice.message}
          </p>
        )}

        <ul style={ms.resultList}>
          {results.map(u => (
            <li key={u.id} style={ms.resultItem}>
              <div style={ms.resultAvatar}>{(u.username || u.email || '?')[0].toUpperCase()}</div>
              <span style={ms.resultName}>{u.username || u.email}</span>
              <button
                style={ms.addBtn}
                onClick={() => addUser(u.id, u.username || u.email)}
                disabled={adding === u.id}
              >
                {adding === u.id ? '…' : 'Add'}
              </button>
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

  const [group, setGroup]     = useState(null);
  const [members, setMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePurpose, setExpensePurpose] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [expenseSplitBetween, setExpenseSplitBetween] = useState([]);
  const [expenseError, setExpenseError] = useState('');
  const [activityEntries, setActivityEntries] = useState([]);
  const membersRef = useRef(members);
  membersRef.current = members;

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [gRes, mRes, eRes] = await Promise.all([
          fetch(`http://localhost:5001/api/groups/${id}`, { headers }),
          fetch(`http://localhost:5001/api/groups/${id}/members`, { headers }),
          fetch(`http://localhost:5001/api/groups/${id}/expenses`, { headers }),
        ]);
        if (!ignore && gRes.ok) setGroup(await gRes.json());
        if (!ignore && mRes.ok) setMembers(await mRes.json());
        if (!ignore && eRes.ok) {
          const expenses = await eRes.json().catch(() => []);
          if (Array.isArray(expenses)) setActivityEntries(expenses);
        }
      } catch (err) {
        if (!ignore) console.error('Failed to load group', err);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id, token]);

  useEffect(() => {
    if (!showAddExpense || !user?.uid) return;
    setExpensePaidBy(user.uid);
    const list = [...membersRef.current].sort((a, b) => {
      if (a.id === user.uid) return -1;
      if (b.id === user.uid) return 1;
      return 0;
    });
    const ids = list.map((m) => m.id);
    setExpenseSplitBetween(ids.length ? ids : [user.uid]);
  }, [showAddExpense, user?.uid]);

  const balanceDerived = useMemo(() => {
    const uid = user?.uid;
    const memberIds = members.map((m) => m.id);
    const idSet = new Set(memberIds);

    /** Who owes whom: owed[debtorId][creditorId] = amount debtor owes creditor */
    const owed = {};
    const addOwed = (debtor, creditor, amt) => {
      if (!debtor || !creditor || amt <= 0) return;
      if (!owed[debtor]) owed[debtor] = {};
      owed[debtor][creditor] = (owed[debtor][creditor] || 0) + amt;
    };

    for (const exp of activityEntries) {
      const amount = Number(exp.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const paidBy = exp.paidBy || exp.addedBy;
      if (!paidBy) continue;
      let splitIds = Array.isArray(exp.splitBetween) ? [...new Set(exp.splitBetween.filter(Boolean))] : [];
      if (splitIds.length === 0) {
        splitIds = memberIds.length ? [...memberIds] : [paidBy];
      }
      splitIds = splitIds.filter((id) => idSet.has(id) || id === paidBy);
      if (splitIds.length === 0) continue;
      const share = amount / splitIds.length;
      for (const s of splitIds) {
        if (s !== paidBy) addOwed(s, paidBy, share);
      }
    }

    if (!uid) return { owe: 0, owed: 0, oweRows: [], owedRows: [] };

    const candidateIds = new Set(memberIds);
    candidateIds.add(uid);
    for (const e of activityEntries) {
      if (e.paidBy) candidateIds.add(e.paidBy);
      if (Array.isArray(e.splitBetween)) e.splitBetween.forEach((id) => id && candidateIds.add(id));
    }

    const oweRows = [];
    const owedRows = [];
    let totalOwe = 0;
    let totalOwed = 0;

    for (const m of candidateIds) {
      if (m === uid) continue;
      const net = (owed[uid]?.[m] || 0) - (owed[m]?.[uid] || 0);
      if (net > 0.009) {
        const rounded = Math.round(net * 100) / 100;
        oweRows.push({ id: m, amount: rounded });
        totalOwe += rounded;
      } else if (net < -0.009) {
        const rounded = Math.round(-net * 100) / 100;
        owedRows.push({ id: m, amount: rounded });
        totalOwed += rounded;
      }
    }

    oweRows.sort((a, b) => b.amount - a.amount);
    owedRows.sort((a, b) => b.amount - a.amount);

    return {
      owe: Math.round(totalOwe * 100) / 100,
      owed: Math.round(totalOwed * 100) / 100,
      oweRows,
      owedRows,
    };
  }, [activityEntries, members, user?.uid]);

  if (!group) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '3rem' }}>
      <div style={ds.spinner} />
      <p style={{ color: 'var(--light-text)', marginTop: '1rem' }}>Loading trip…</p>
    </div>
  );

  const displayName = (m) => {
    if (m.id === user?.uid) return 'You';
    return (m.displayName || '').trim() || 'Unknown user';
  };

  const orderedMembers = [...members].sort((a, b) => {
    if (a.id === user?.uid) return -1;
    if (b.id === user?.uid) return 1;
    return 0;
  });

  const memberNames = orderedMembers.map((m) => displayName(m));
  const memberPalette = ['#007bff', '#42d6a3', '#ffc107'];
  const memberColorMap = memberNames.reduce((acc, name, i) => {
    acc[name] = memberPalette[i % memberPalette.length];
    return acc;
  }, {});
  const colorForName = (name) => {
    const existing = memberColorMap[name];
    if (existing) return existing;
    const hash = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return memberPalette[hash % memberPalette.length];
  };

  const nameForMemberId = (mid) =>
    displayName(members.find((x) => x.id === mid) || { id: mid, displayName: 'Unknown user' });

  const handleAddExpense = (e) => {
    e.preventDefault();
    setExpenseError('');
    const purpose = expensePurpose.trim();
    const amountNum = Number(expenseAmount);
    if (!purpose) {
      setExpenseError('Please enter a purpose.');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setExpenseError('Please enter a valid amount greater than 0.');
      return;
    }
    const payerId = expensePaidBy || user?.uid;
    if (!payerId) {
      setExpenseError('Choose who paid for this expense.');
      return;
    }
    const splitIds = [...new Set(expenseSplitBetween.filter(Boolean))];
    if (splitIds.length === 0) {
      setExpenseError('Choose at least one person who shares this cost.');
      return;
    }

    fetch(`http://localhost:5001/api/groups/${id}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: amountNum,
        purpose,
        paidBy: payerId,
        splitBetween: splitIds,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to save expense.');
        const paidByResolved = typeof data.paidBy === 'string' ? data.paidBy : payerId;
        const splitResolved = Array.isArray(data.splitBetween) ? data.splitBetween : splitIds;
        setActivityEntries((prev) => [
          {
            id: data.id || Date.now(),
            amount: Number(amountNum.toFixed(2)),
            purpose,
            addedBy: user?.uid,
            paidBy: paidByResolved,
            splitBetween: splitResolved,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
          },
          ...prev,
        ]);
        setExpenseAmount('');
        setExpensePurpose('');
        setShowAddExpense(false);
      })
      .catch((err) => {
        setExpenseError(err?.message || 'Failed to save expense.');
      });
  };

  return (
    <div className="page-container" style={ds.page}>
      <div style={ds.header}>
        <button style={ds.backBtn} onClick={() => navigate('/')}>
          ← Back to my groups
        </button>
        <h1 style={ds.tripName}>{group.name}</h1>
      </div>
      <div style={ds.rule} />

      <div style={ds.membersLine}>
        <h3 style={ds.membersLabel}>Members:</h3>
        <span style={ds.membersText}>
          {orderedMembers.length ? (
            orderedMembers.map((m, idx) => {
              const name = displayName(m);
              return (
                <span key={m.id}>
                  <span style={{ ...ds.memberName, color: colorForName(name) }}>{name}</span>
                  {idx < orderedMembers.length - 1 ? <span style={ds.memberDivider}> | </span> : null}
                </span>
              );
            })
          ) : (
            'No members yet'
          )}
        </span>
        <button type="button" style={ds.addMemberBtn} onClick={() => setShowAddMember(true)}>
          + Add member
        </button>
      </div>

      <section style={ds.card}>
        <h3 style={ds.sectionTitle}>Balances</h3>
        <p style={ds.balanceIntro}>Each column: your total on top, per-person amounts below.</p>
        <div style={ds.balanceColumns}>
          <div style={{ ...ds.balancePanel, ...ds.balancePanelOwe }}>
            <div style={ds.balancePanelLabel}>You owe</div>
            <p style={ds.balancePanelTotal}>${balanceDerived.owe}</p>
            <div style={ds.balancePanelRule} />
            <div style={ds.balancePanelSub}>Per person</div>
            {balanceDerived.oweRows.length === 0 ? (
              <p style={ds.balanceBreakdownEmpty}>No one right now</p>
            ) : (
              <ul style={ds.balanceBreakdownList}>
                {balanceDerived.oweRows.map((row) => (
                  <li key={row.id} style={ds.balanceBreakdownItem}>
                    <span style={{ ...ds.balanceBreakdownName, color: colorForName(nameForMemberId(row.id)) }}>
                      {nameForMemberId(row.id)}
                    </span>
                    <span style={ds.balanceBreakdownAmount}>${row.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ ...ds.balancePanel, ...ds.balancePanelOwed }}>
            <div style={ds.balancePanelLabel}>You are owed</div>
            <p style={ds.balancePanelTotal}>${balanceDerived.owed}</p>
            <div style={ds.balancePanelRule} />
            <div style={ds.balancePanelSub}>Per person</div>
            {balanceDerived.owedRows.length === 0 ? (
              <p style={ds.balanceBreakdownEmpty}>No one right now</p>
            ) : (
              <ul style={ds.balanceBreakdownList}>
                {balanceDerived.owedRows.map((row) => (
                  <li key={row.id} style={ds.balanceBreakdownItem}>
                    <span style={{ ...ds.balanceBreakdownName, color: colorForName(nameForMemberId(row.id)) }}>
                      {nameForMemberId(row.id)}
                    </span>
                    <span style={ds.balanceBreakdownAmount}>${row.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      <div style={ds.rule} />

      {activityEntries.length > 0 && (
        <section style={ds.activitySection}>
          <h3 style={ds.activityTitle}>Recent Activity</h3>
          <div style={ds.activityList}>
            {activityEntries.slice(0, 5).map((a) => (
              (() => {
                const actorId = a.paidBy || a.addedBy;
                const entryName = actorId
                  ? displayName(
                      members.find((m) => m.id === actorId) || {
                        id: actorId,
                        displayName: 'Unknown user',
                      }
                    )
                  : 'Unknown user';
                return (
                  <p key={a.id} style={ds.activityRow}>
                    <span style={{ ...ds.activityUser, color: colorForName(entryName) }}>{entryName}</span>
                    <span style={ds.activityMeta}> paid for {a.purpose} </span>
                    <span style={ds.activityAmount}>${a.amount}</span>
                  </p>
                );
              })()
            ))}
          </div>
        </section>
      )}

      {activityEntries.length > 0 ? <div style={ds.rule} /> : null}

      <section style={ds.actions}>
        <button
          type="button"
          style={ds.addExpenseBtn}
          onClick={() => {
            setShowAddExpense((v) => !v);
            setExpenseError('');
          }}
        >
          + Add expense
        </button>
        <div style={ds.secondaryRow}>
          <button type="button" style={{ ...ds.secondaryBtnRow, ...ds.secondaryBtnBlue }}>
            View Group Expenses
          </button>
          <button type="button" style={{ ...ds.secondaryBtnRow, ...ds.secondaryBtnGreen }}>
            Personal Tracking
          </button>
          <button type="button" style={{ ...ds.secondaryBtnRow, ...ds.secondaryBtnYellow }}>
            Settlements
          </button>
        </div>
      </section>

      {showAddExpense && (
        <div
          style={ds.expenseOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddExpense(false);
              setExpenseError('');
            }
          }}
        >
          <section style={ds.expenseModal}>
            <div style={ds.expenseModalHeader}>
              <h3 style={ds.sectionTitle}>Add Expense</h3>
              <button
                type="button"
                style={ds.expenseCloseBtn}
                onClick={() => {
                  setShowAddExpense(false);
                  setExpenseError('');
                }}
                aria-label="Close add expense"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddExpense} style={ds.expenseForm}>
              <div style={ds.expensePeopleRow}>
                <div style={ds.expensePeopleCol}>
                  <span style={ds.expenseFieldLabel}>Paid by</span>
                  <div style={ds.memberChipRow} role="group" aria-label="Who paid">
                    {(orderedMembers.length ? orderedMembers : user?.uid ? [{ id: user.uid, displayName: 'You' }] : []).map(
                      (m) => (
                        <button
                          key={`pay-${m.id}`}
                          type="button"
                          style={{
                            ...ds.memberChip,
                            ...(expensePaidBy === m.id ? ds.memberChipActive : {}),
                          }}
                          onClick={() => setExpensePaidBy(m.id)}
                        >
                          + {displayName(m)}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div style={ds.expensePeopleCol}>
                  <span style={ds.expenseFieldLabel}>Split between</span>
                  <div style={ds.memberChipRow} role="group" aria-label="Who shares this cost">
                    {(orderedMembers.length ? orderedMembers : user?.uid ? [{ id: user.uid, displayName: 'You' }] : []).map(
                      (m) => {
                        const on = expenseSplitBetween.includes(m.id);
                        return (
                          <button
                            key={`split-${m.id}`}
                            type="button"
                            style={{
                              ...ds.memberChip,
                              ...(on ? ds.memberChipActive : {}),
                            }}
                            onClick={() => {
                              setExpenseSplitBetween((prev) => {
                                if (prev.includes(m.id)) {
                                  if (prev.length <= 1) return prev;
                                  return prev.filter((uid) => uid !== m.id);
                                }
                                return [...prev, m.id];
                              });
                            }}
                          >
                            {on ? '✓' : '+'} {displayName(m)}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
              <p style={ds.expenseHint}>
                Who paid is the card or cash outlay. Split between is everyone who should owe a share (tap + to include, ✓ to
                remove).
              </p>
              <div style={ds.expenseInlineRow}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  style={{ ...ds.expenseInput, ...ds.expenseInputAmount }}
                  required
                />
                <input
                  type="text"
                  placeholder="Purpose (e.g. Airbnb)"
                  value={expensePurpose}
                  onChange={(e) => setExpensePurpose(e.target.value)}
                  style={{ ...ds.expenseInput, ...ds.expenseInputPurpose }}
                  required
                />
              </div>
              {expenseError ? <p style={ds.expenseError}>{expenseError}</p> : null}
              <div style={ds.expenseActions}>
                <button
                  type="button"
                  style={ds.expenseCancelBtn}
                  onClick={() => {
                    setShowAddExpense(false);
                    setExpenseError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Expense
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Add Member modal */}
      {showAddMember && (
        <AddMemberModal
          groupId={id}
          token={token}
          onClose={() => setShowAddMember(false)}
          onAdded={() => {
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };
            Promise.all([
              fetch(`http://localhost:5001/api/groups/${id}`, { headers }),
              fetch(`http://localhost:5001/api/groups/${id}/members`, { headers }),
            ])
              .then(async ([gRes, mRes]) => {
                if (gRes.ok) setGroup(await gRes.json());
                if (mRes.ok) setMembers(await mRes.json());
              })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
};

export default GroupDetails;

/* ─── Dashboard styles (ds) ─────────────────────────────────────────────────── */
const ds = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    paddingTop: '1.5rem',
  },
  header: { marginBottom: '0.1rem' },
  rule: { height: 1, background: 'var(--border-color)', margin: '0.15rem 0 0.25rem' },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--secondary-color)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0 0 0.65rem 0',
    display: 'block',
  },
  tripName: {
    margin: 0,
    fontSize: '1.55rem',
    fontWeight: 800,
    color: 'var(--text-color)',
    letterSpacing: '-0.02em',
  },
  card: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  sectionTitle: { margin: 0, marginBottom: '0.6rem', fontSize: '1rem', fontWeight: 700 },
  activitySection: {
    width: '100%',
    maxWidth: 520,
    margin: '0 auto',
    padding: '0.35rem 0 0.15rem',
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
  },
  activityTitle: {
    margin: 0,
    marginBottom: '0.65rem',
    fontSize: '1rem',
    fontWeight: 700,
    textAlign: 'center',
  },
  membersLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    paddingBottom: '0.2rem',
  },
  membersLabel: { margin: 0, fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap' },
  membersText: { fontSize: '0.95rem', color: 'var(--text-color)' },
  memberName: { fontWeight: 700 },
  memberDivider: { color: 'var(--light-text)' },
  addMemberBtn: {
    background: '#eef6ff',
    border: '1px solid var(--secondary-color)',
    borderRadius: '8px',
    padding: '0.35rem 0.72rem',
    cursor: 'pointer',
    color: 'var(--secondary-color)',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  balanceIntro: {
    margin: '-0.35rem 0 0.85rem',
    fontSize: '0.82rem',
    color: 'var(--light-text)',
    lineHeight: 1.45,
  },
  balanceColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    alignItems: 'stretch',
  },
  balancePanel: {
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1rem 1.05rem',
    background: '#fafcff',
    minWidth: 0,
  },
  balancePanelOwe: {
    borderTop: '3px solid #007bff',
  },
  balancePanelOwed: {
    borderTop: '3px solid #42d6a3',
  },
  balancePanelLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--light-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.2rem',
  },
  balancePanelTotal: {
    margin: 0,
    fontSize: '1.42rem',
    fontWeight: 800,
    color: 'var(--text-color)',
    letterSpacing: '-0.02em',
    fontFamily: 'var(--font-title)',
  },
  balancePanelRule: {
    height: 1,
    background: 'var(--border-color)',
    margin: '0.65rem 0 0.5rem',
  },
  balancePanelSub: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--light-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
  },
  balanceBreakdownList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.28rem',
  },
  balanceBreakdownItem: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'baseline',
    gap: '0.65rem',
    fontSize: '0.88rem',
    color: 'var(--text-color)',
  },
  balanceBreakdownName: {
    fontWeight: 700,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  balanceBreakdownAmount: {
    fontWeight: 800,
    color: 'var(--text-color)',
    whiteSpace: 'nowrap',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  balanceBreakdownEmpty: {
    margin: 0,
    fontSize: '0.84rem',
    color: 'rgba(102, 114, 148, 0.55)',
    fontStyle: 'italic',
  },
  activityList: { display: 'flex', flexDirection: 'column', gap: '0.42rem' },
  activityRow: { margin: 0, fontSize: '0.93rem' },
  activityUser: { fontWeight: 700 },
  activityMeta: { color: 'rgba(102, 114, 148, 0.52)' },
  activityAmount: { color: '#000', fontWeight: 800 },
  expenseOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(7, 14, 40, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 1200,
  },
  expenseModal: {
    width: '100%',
    maxWidth: 820,
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    boxShadow: '0 20px 50px rgba(7, 14, 40, 0.25)',
    padding: '1.25rem',
  },
  expenseModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.35rem',
  },
  expenseCloseBtn: {
    border: 'none',
    background: 'none',
    color: 'var(--light-text)',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.2rem',
  },
  expenseForm: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  expenseFieldLabel: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--text-color)',
    marginBottom: '0.35rem',
  },
  expensePeopleRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '1rem 1.25rem',
    alignItems: 'flex-start',
  },
  expensePeopleCol: {
    flex: '1 1 220px',
    minWidth: 0,
  },
  memberChipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  memberChip: {
    border: '1px solid var(--secondary-color)',
    background: '#e8fafc',
    color: 'var(--secondary-color)',
    borderRadius: '999px',
    padding: '0.32rem 0.65rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    lineHeight: 1.2,
  },
  memberChipActive: {
    background: 'var(--secondary-color)',
    color: '#fff',
    borderColor: 'var(--secondary-color)',
  },
  expenseHint: {
    margin: '0.15rem 0 0',
    fontSize: '0.76rem',
    color: 'var(--light-text)',
    lineHeight: 1.4,
  },
  expenseInlineRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '0.65rem',
    alignItems: 'stretch',
    width: '100%',
  },
  expenseInput: {
    width: '100%',
    padding: '0.68rem 0.8rem',
    border: '1px solid var(--border-color)',
    borderRadius: '9px',
    fontSize: '0.92rem',
    color: 'var(--text-color)',
    background: '#fff',
  },
  expenseInputAmount: {
    flex: '0 0 7.25rem',
    width: 'auto',
    minWidth: '6.5rem',
  },
  expenseInputPurpose: {
    flex: '1 1 12rem',
    width: 'auto',
    minWidth: '8rem',
  },
  expenseError: { margin: 0, color: '#c62828', fontSize: '0.85rem' },
  expenseActions: { display: 'flex', gap: '0.65rem', alignItems: 'center' },
  expenseCancelBtn: {
    border: 'none',
    background: 'none',
    padding: '0.35rem 0.5rem',
    margin: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#c62828',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: '0.56rem' },
  addExpenseBtn: {
    width: '100%',
    background: '#e8fafc',
    border: '1px solid var(--secondary-color)',
    borderRadius: '12px',
    padding: '0.75rem 1.1rem',
    cursor: 'pointer',
    color: 'var(--secondary-color)',
    fontWeight: 600,
    fontSize: '0.92rem',
    fontFamily: 'inherit',
    boxShadow: 'none',
  },
  secondaryRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: '0.5rem',
    width: '100%',
    alignItems: 'stretch',
  },
  secondaryBtnRow: {
    flex: 1,
    minWidth: 0,
    padding: '0.72rem 0.4rem',
    border: 'none',
    borderRadius: '9px',
    fontSize: '0.78rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    textAlign: 'center',
    lineHeight: 1.25,
    boxShadow: '0 4px 12px rgba(42, 64, 149, 0.14)',
    transition: 'filter 0.15s, transform 0.1s',
  },
  secondaryBtnBlue: {
    background: '#007bff',
    color: '#fff',
    boxShadow: '0 6px 18px rgba(0, 123, 255, 0.32)',
  },
  secondaryBtnGreen: {
    background: '#42d6a3',
    color: '#fff',
    boxShadow: '0 6px 18px rgba(50, 190, 145, 0.32)',
  },
  secondaryBtnYellow: {
    background: '#ffc107',
    color: '#212529',
    boxShadow: '0 6px 18px rgba(255, 193, 7, 0.35)',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--secondary-color)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
};

/* ─── Modal styles (ms) ──────────────────────────────────────────────────────── */
const ms = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    background: 'var(--card-bg)',
    width: '100%', maxWidth: 600, margin: '0 auto',
    borderRadius: '18px 18px 0 0',
    padding: '1rem 1.5rem 2rem',
    boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    background: 'var(--border-color)',
    margin: '0 auto 1rem',
  },
  sheetHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '0.25rem',
  },
  sheetTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)' },
  closeBtn: {
    background: 'none', border: 'none',
    color: 'var(--light-text)', fontSize: '1rem', cursor: 'pointer', padding: 0,
  },
  sheetSub: { fontSize: '0.82rem', color: 'var(--light-text)', marginBottom: '1rem' },

  searchRow: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' },
  searchInput: {
    flex: 1, padding: '0.6rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '6px', fontSize: '0.9rem',
    outline: 'none',
  },
  searchBtn: {
    padding: '0.6rem 1rem',
    background: 'var(--secondary-color)', color: '#fff',
    border: 'none', borderRadius: '6px',
    fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
  },

  feedback: { fontSize: '0.82rem', color: 'var(--primary-color)', margin: '0 0 0.5rem' },

  resultList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  resultItem: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border-color)',
  },
  resultAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'var(--secondary-color)',
    color: '#fff', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '0.75rem',
    fontWeight: 700, flexShrink: 0,
  },
  resultName: { flex: 1, fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-color)' },
  addBtn: {
    padding: '0.3rem 0.8rem',
    background: 'var(--primary-color)', color: '#fff',
    border: 'none', borderRadius: '5px',
    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
  },
};
