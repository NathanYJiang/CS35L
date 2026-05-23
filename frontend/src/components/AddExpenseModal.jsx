import { useState, useEffect } from 'react';
import { ds } from '../pages/GroupDetails.styles';

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
      const res = await fetch(`http://localhost:5001/api/groups/${groupId}/expenses`, {
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
    <div style={ds.expenseOverlay} onClick={onClose}>
      <section style={ds.expenseModal} onClick={e => e.stopPropagation()}>
        <div style={ds.expenseModalHeader}>
          <h3 style={ds.sectionTitle}>Add Expense</h3>
          <button style={ds.expenseCloseBtn} onClick={onClose}>✕</button>
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
            <button type="button" style={ds.expenseCancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Expense</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AddExpenseModal;
