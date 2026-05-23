import { useState, useEffect } from 'react';
import styles from '../pages/GroupDetails.module.css';
import { API } from '../config/api';

const AddExpenseModal = ({ groupId, token, user, orderedMembers, getDisplayName, onClose, onSuccess }) => {
  const [expenseForm, setExpenseForm] = useState({ 
    amount: '', purpose: '', paidBy: user?.uid || '', splitBetween: [], error: '' 
  });

  useEffect(() => {
    setExpenseForm(prev => ({
      ...prev,
      paidBy: user?.uid || '',
      splitBetween: orderedMembers.map(m => m.id),
      error: ''
    }));
  }, [orderedMembers, user?.uid]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const { amount, purpose, paidBy, splitBetween } = expenseForm;
    if (!purpose || !Number(amount)) return setExpenseForm(p => ({ ...p, error: 'Check purpose and amount.' }));

    try {
      const res = await fetch(API.expenses(groupId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount), purpose, paidBy, splitBetween }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSuccess(data);
      onClose();
    } catch (err) { setExpenseForm(p => ({ ...p, error: err.message })); }
  };

  return (
    <div className={styles.expenseOverlay} onClick={onClose}>
      <section className={styles.expenseModal} onClick={e => e.stopPropagation()}>
        <div className={styles.expenseModalHeader}>
          <h3 className={styles.sectionTitle}>Add Expense</h3>
          <button className={styles.expenseCloseBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleAddExpense} className={styles.expenseForm}>
          <div className={styles.expensePeopleRow}>
            <div className={styles.expensePeopleCol}>
              <span className={styles.expenseFieldLabel}>Paid by</span>
              <div className={styles.memberChipRow}>
                {orderedMembers.map(m => {
                  const isActive = expenseForm.paidBy === m.id;
                  return (
                    <button 
                      key={m.id} 
                      type="button" 
                      className={`${styles.memberChip} ${isActive ? styles.memberChipActive : ''}`}
                      onClick={() => setExpenseForm(p => ({ ...p, paidBy: m.id }))}
                    >
                      + {getDisplayName(m)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.expensePeopleCol}>
              <span className={styles.expenseFieldLabel}>Split between</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}> {/* Kept inline since parent layout is safe, but can match memberChipRow */}
                {orderedMembers.map(m => {
                  const active = expenseForm.splitBetween.includes(m.id);
                  return (
                    <button 
                      key={m.id} 
                      type="button" 
                      className={`${styles.memberChip} ${active ? styles.memberChipActive : ''}`}
                      onClick={() => setExpenseForm(p => ({
                        ...p,
                        splitBetween: active ? (p.splitBetween.length > 1 ? p.splitBetween.filter(id => id !== m.id) : p.splitBetween) : [...p.splitBetween, m.id]
                      }))}
                    >
                      {active ? '✓' : '+'} {getDisplayName(m)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <p className={styles.expenseHint}>Who paid is the card or cash outlay. Split between is everyone who should owe a share.</p>
          <div className={styles.expenseInlineRow}>
            <input 
              type="number" 
              step="0.01" 
              placeholder="Amount" 
              value={expenseForm.amount} 
              onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} 
              className={`${styles.expenseInput} ${styles.expenseInputAmount}`} 
            />
            <input 
              type="text" 
              placeholder="Purpose" 
              value={expenseForm.purpose} 
              onChange={e => setExpenseForm(p => ({ ...p, purpose: e.target.value }))} 
              className={`${styles.expenseInput} ${styles.expenseInputPurpose}`} 
            />
          </div>
          {expenseForm.error && <p className={styles.expenseError}>{expenseForm.error}</p>}
          <div className={styles.expenseActions}>
            <button type="button" className={styles.expenseCancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Expense</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AddExpenseModal;
