/**
 * Build pairwise debt matrix from expenses, apply settlements, compute net per user.
 * owed[debtorId][creditorId] = amount debtor owes creditor.
 */

export function buildOwedFromExpenses(expenses, memberIds) {
  const owed = {};
  const idSet = new Set(memberIds);

  const addOwed = (debtor, creditor, amt) => {
    if (!debtor || !creditor || amt <= 0 || debtor === creditor) return;
    if (!owed[debtor]) owed[debtor] = {};
    owed[debtor][creditor] = (owed[debtor][creditor] || 0) + amt;
  };

  for (const exp of expenses) {
    const amount = Number(exp.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const paidBy = exp.paidBy || exp.addedBy;
    if (!paidBy) continue;

    let splitIds = Array.isArray(exp.splitBetween) ? [...new Set(exp.splitBetween.filter(Boolean))] : [];
    if (splitIds.length === 0) splitIds = memberIds.length ? [...memberIds] : [paidBy];
    splitIds = splitIds.filter((id) => idSet.has(id) || id === paidBy);
    if (splitIds.length === 0) continue;

    const share = amount / splitIds.length;
    for (const s of splitIds) {
      if (s !== paidBy) addOwed(s, paidBy, share);
    }
  }

  return owed;
}

export function applySettlements(owed, settlements) {
  const next = {};
  for (const debtor of Object.keys(owed)) {
    next[debtor] = { ...owed[debtor] };
  }

  for (const s of settlements) {
    const from = s.fromUserId;
    const to = s.toUserId;
    const amt = Number(s.amount);
    if (!from || !to || !Number.isFinite(amt) || amt <= 0) continue;
    if (!next[from]) next[from] = {};
    if (next[from][to]) {
      next[from][to] = Math.max(0, next[from][to] - amt);
      if (next[from][to] < 0.009) delete next[from][to];
    }
  }

  return next;
}

export function netBalancesForUser(owed, userId, memberIds) {
  const oweRows = [];
  const owedRows = [];
  let totalOwe = 0;
  let totalOwed = 0;

  const candidates = new Set(memberIds);
  if (userId) candidates.add(userId);

  for (const m of candidates) {
    if (m === userId) continue;
    const net = (owed[userId]?.[m] || 0) - (owed[m]?.[userId] || 0);
    if (net > 0.009) {
      const rounded = Math.round(net * 100) / 100;
      oweRows.push({ id: m, amount: rounded });
      totalOwe += rounded;
    } else if (net < -0.009) {
      const rounded = Math.round(Math.abs(net) * 100) / 100;
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
}

export function suggestedSettlements(owed, memberIds) {
  /** Minimal transfers: list edges where owed[debtor][creditor] > 0 */
  const edges = [];
  for (const debtor of memberIds) {
    for (const creditor of memberIds) {
      if (debtor === creditor) continue;
      const amt = owed[debtor]?.[creditor];
      if (amt && amt > 0.009) {
        edges.push({
          fromUserId: debtor,
          toUserId: creditor,
          amount: Math.round(amt * 100) / 100,
        });
      }
    }
  }
  edges.sort((a, b) => b.amount - a.amount);
  return edges;
}
