import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import styles from './GroupDetails.module.css';
import LoadingSpinner from '../components/LoadingSpinner';
import AddMemberModal from '../components/AddMemberModal';
import AddExpenseModal from '../components/AddExpenseModal';
import { API } from '../config/api';
import { buildOwedFromExpenses, applySettlements, netBalancesForUser } from '../utils/groupBalances';

// ─── HELPER UTILITIES ──────────────────
const MEMBER_PALETTE = ['#007bff', '#42d6a3', '#ffc107'];

const getDisplayName = (member, currentUserId) => {
  if (!member) return 'Unknown user';
  return member.id === currentUserId ? 'You' : (member.displayName || '').trim() || 'Unknown user';
};

const getColorForName = (name, orderedMemberNames) => {
  const idx = orderedMemberNames.indexOf(name);
  if (idx !== -1) return MEMBER_PALETTE[idx % MEMBER_PALETTE.length];
  const hash = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return MEMBER_PALETTE[hash % MEMBER_PALETTE.length];
};

/* ─── MAIN DASHBOARD COMPONENT ────────────────────────────────────────── */
const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [activityEntries, setActivityEntries] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [gRes, mRes, eRes, sRes] = await Promise.all([
        fetch(API.group(id), { headers }),
        fetch(API.members(id), { headers }),
        fetch(API.expenses(id), { headers }),
        fetch(API.settlements(id), { headers }),
      ]);
      if (gRes.ok) setGroup(await gRes.json());
      if (mRes.ok) setMembers(await mRes.json());
      if (eRes.ok) setActivityEntries(await eRes.json() || []);
      if (sRes.ok) {
        const list = await sRes.json();
        setSettlements(Array.isArray(list) ? list : []);
      }
    } catch (err) { 
      console.error('Failed to aggregate dashboard data:', err); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [id, token]);

  // UI Processing Memoizations
  const orderedMembers = useMemo(() =>
    [...members].sort((a, b) => (a.id === user?.uid ? -1 : b.id === user?.uid ? 1 : 0)),
  [members, user?.uid]);

  const orderedMemberNames = useMemo(() => 
    orderedMembers.map(m => getDisplayName(m, user?.uid)), 
  [orderedMembers, user?.uid]);

  const nameById = (mid) => getDisplayName(members.find(x => x.id === mid) || { id: mid }, user?.uid);

  const balanceDerived = useMemo(() => {
    const memberIds = members.map((m) => m.id);
    const raw = buildOwedFromExpenses(activityEntries, memberIds);
    const adjusted = applySettlements(raw, settlements);
    const net = netBalancesForUser(adjusted, user?.uid, memberIds);
    return {
      owe: net.owe.toFixed(2),
      owed: net.owed.toFixed(2),
      oweRows: net.oweRows,
      owedRows: net.owedRows,
    };
  }, [activityEntries, settlements, members, user?.uid]);

  const handleAddExpense = (data) => {
    setActivityEntries(prev => [data, ...prev]);
  };

  const handleDeleteExpense = async (eid) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    const res = await fetch(API.expense(id, eid), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setActivityEntries(prev => prev.filter(e => e.id !== eid));
  };

  if (!group) return <LoadingSpinner message="Loading trip…" />;

  return (
    <main className={`page-container ${styles.page}`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to my groups</button>
        <h1 className={styles.tripName}>{group.name}</h1>
      </header>
      <hr className={styles.rule} />

      <section className={styles.membersLine} aria-label="Group Members">
        <h2 className={styles.membersLabel}>Members:</h2>
        <div className={styles.membersText}>
          {orderedMembers.map((m, idx) => {
            const name = getDisplayName(m, user?.uid);
            return (
              <span key={m.id}>
                <span className={styles.memberName} style={{ color: getColorForName(name, orderedMemberNames) }}>
                  {name}
                </span>
                {idx < orderedMembers.length - 1 && <span className={styles.memberDivider}> | </span>}
              </span>
            );
          })}
        </div>
        <button className={styles.addMemberBtn} onClick={() => setShowAddMember(true)}>+ Add member</button>
      </section>

      <BalanceColumns 
        balanceDerived={balanceDerived} 
        nameById={nameById} 
        orderedMemberNames={orderedMemberNames} 
      />

      <ActivityList 
        activityEntries={activityEntries} 
        nameById={nameById} 
        orderedMemberNames={orderedMemberNames} 
        currentUserId={user?.uid}
        onDeleteExpense={handleDeleteExpense}
      />

      <hr className={styles.rule} />
      
      <nav className={styles.actions} aria-label="Dashboard views">
        <button className={styles.addExpenseBtn} onClick={() => setShowAddExpense(true)}>+ Add expense</button>
        <div className={styles.secondaryRow}>
          <button type="button" className={`${styles.secondaryBtnRow} ${styles.secondaryBtnBlue}`} onClick={() => navigate(`/groups/${id}/expenses`)}>
            View Group Expenses
          </button>
          <button type="button" className={`${styles.secondaryBtnRow} ${styles.secondaryBtnGreen}`} onClick={() => navigate(`/groups/${id}/personal`)}>
            Personal Tracking
          </button>
          <button type="button" className={`${styles.secondaryBtnRow} ${styles.secondaryBtnYellow}`} onClick={() => navigate(`/groups/${id}/settlements`)}>
            Settlements
          </button>
        </div>
      </nav>

      {showAddExpense && (
        <AddExpenseModal
          groupId={id}
          token={token}
          user={user}
          orderedMembers={orderedMembers}
          getDisplayName={(m) => getDisplayName(m, user?.uid)}
          onClose={() => setShowAddExpense(false)}
          onSuccess={handleAddExpense}
        />
      )}
      {showAddMember && <AddMemberModal groupId={id} token={token} onClose={() => setShowAddMember(false)} onAdded={fetchData} />}
    </main>
  );
};

/* ─── SUB-COMPONENT: BALANCES ────────────────────────────────────────── */
const BalanceColumns = ({ balanceDerived, nameById, orderedMemberNames }) => {
  const columnConfigs = [
    { label: 'You owe', key: 'owe', customClass: styles.balancePanelOwe },
    { label: 'You are owed', key: 'owed', customClass: styles.balancePanelOwed }
  ];

  return (
    <section className={styles.card} aria-labelledby="balance-title">
      <h3 id="balance-title" className={styles.sectionTitle}>Balances</h3>
      <p className={styles.balanceIntro}>Each column: your total on top, per-person amounts below.</p>
      
      <div className={styles.balanceColumns}>
        {columnConfigs.map(col => (
          <div key={col.key} className={`${styles.balancePanel} ${col.customClass}`}>
            <div className={styles.balancePanelLabel}>{col.label}</div>
            <p className={styles.balancePanelTotal}>${balanceDerived[col.key]}</p>
            <div className={styles.balancePanelRule} />
            <div className={styles.balancePanelSub}>Per person</div>
            
            {balanceDerived[`${col.key}Rows`].length === 0 ? (
              <p className={styles.balanceBreakdownEmpty}>No one right now</p>
            ) : (
              <ul className={styles.balanceBreakdownList}>
                {balanceDerived[`${col.key}Rows`].map(row => {
                  const name = nameById(row.id);
                  return (
                    <li key={row.id} className={styles.balanceBreakdownItem}>
                      <span className={styles.balanceBreakdownName} style={{ color: getColorForName(name, orderedMemberNames) }}>
                        {name}
                      </span>
                      <span className={styles.balanceBreakdownAmount}>${row.amount}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

/* ─── SUB-COMPONENT: ACTIVITY LIST ───────────────────────────────────── */
const ActivityList = ({ activityEntries, nameById, orderedMemberNames, currentUserId, onDeleteExpense }) => {
  if (activityEntries.length === 0) return null;

  return (
    <>
      <hr className={styles.rule} />
      <section className={styles.activitySection} aria-labelledby="activity-title">
        <h3 id="activity-title" className={styles.activityTitle}>Recent Activity</h3>
        <ul className={styles.activityList}>
          {activityEntries.slice(0, 5).map(entry => {
            const name = nameById(entry.paidBy || entry.addedBy);
            return (
              <li key={entry.id} className={styles.activityRowContainer}>
                <p className={styles.activityRow}>
                  <span className={styles.activityUser} style={{ color: getColorForName(name, orderedMemberNames) }}>
                    {name}
                  </span>
                  <span className={styles.activityMeta}> paid for {entry.purpose} </span>
                  <span className={styles.activityAmount}>${entry.amount}</span>
                </p>
                {entry.addedBy === currentUserId && (
                  <button onClick={() => onDeleteExpense(entry.id)} className={styles.deleteBtn} aria-label={`Delete expense for ${entry.purpose}`}>
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
};

export default GroupDetails;
