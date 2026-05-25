/**
 * End-to-end style test for the client balance pipeline:
 * expenses create pairwise debt, settlements reduce it, net balances update.
 */
import { describe, it, expect } from 'vitest';
import {
  buildOwedFromExpenses,
  applySettlements,
  netBalancesForUser,
  suggestedSettlements,
} from './groupBalances.js';

const MEMBERS = ['alice', 'bob', 'carol'];

describe('E2E: expense split and settlement balances', () => {
  it('splits a shared expense so non-payers owe the payer', () => {
    const expenses = [
      {
        amount: 120,
        paidBy: 'alice',
        splitBetween: ['alice', 'bob', 'carol'],
      },
    ];

    const owed = buildOwedFromExpenses(expenses, MEMBERS);
    const aliceNet = netBalancesForUser(owed, 'alice', MEMBERS);
    const bobNet = netBalancesForUser(owed, 'bob', MEMBERS);

    expect(aliceNet.owed).toBe(80);
    expect(bobNet.owe).toBe(40);
    expect(bobNet.oweRows).toEqual([{ id: 'alice', amount: 40 }]);

    const edges = suggestedSettlements(owed, MEMBERS);
    expect(edges).toContainEqual({ fromUserId: 'bob', toUserId: 'alice', amount: 40 });
    expect(edges).toContainEqual({ fromUserId: 'carol', toUserId: 'alice', amount: 40 });
  });

  it('reduces debt after a settlement is applied', () => {
    const expenses = [
      {
        amount: 100,
        paidBy: 'alice',
        splitBetween: ['alice', 'bob'],
      },
    ];

    let owed = buildOwedFromExpenses(expenses, ['alice', 'bob']);
    expect(netBalancesForUser(owed, 'bob', ['alice', 'bob']).owe).toBe(50);

    owed = applySettlements(owed, [
      { fromUserId: 'bob', toUserId: 'alice', amount: 50 },
    ]);

    const bobAfter = netBalancesForUser(owed, 'bob', ['alice', 'bob']);
    expect(bobAfter.owe).toBe(0);
    expect(bobAfter.oweRows).toHaveLength(0);
  });
});
