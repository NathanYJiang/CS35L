const request = require('supertest');
const { resetFirestoreMock } = require('./mocks/firestore');
const { collections } = require('./mocks/firestore');

const app = require('../server');

const alice = { Authorization: 'Bearer token-alice' };
const bob = { Authorization: 'Bearer token-bob' };

beforeEach(() => {
  resetFirestoreMock();
  collections.users.alice = { username: 'Alice', displayName: 'Alice', email: 'alice@test.com' };
  collections.users.bob = { username: 'Bob', displayName: 'Bob', email: 'bob@test.com' };
});

describe('E2E: group expense lifecycle', () => {
  it('creates a group, adds an expense, lists it, and deletes it', async () => {
    const createRes = await request(app)
      .post('/api/groups')
      .set(alice)
      .send({ name: 'Weekend trip' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('Weekend trip');
    expect(createRes.body.members).toContain('alice');
    const groupId = createRes.body.id;

    const expenseRes = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set(alice)
      .send({
        amount: 90,
        purpose: 'Dinner',
        paidBy: 'alice',
        splitBetween: ['alice', 'bob'],
      });

    expect(expenseRes.status).toBe(201);
    expect(expenseRes.body.amount).toBe(90);
    expect(expenseRes.body.purpose).toBe('Dinner');
    expect(expenseRes.body.splitBetween).toEqual(['alice', 'bob']);

    const listRes = await request(app)
      .get(`/api/groups/${groupId}/expenses`)
      .set(alice);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].purpose).toBe('Dinner');

    const expenseId = listRes.body[0].id;

    const deleteRes = await request(app)
      .delete(`/api/groups/${groupId}/expenses/${expenseId}`)
      .set(alice);

    expect(deleteRes.status).toBe(200);

    const afterDelete = await request(app)
      .get(`/api/groups/${groupId}/expenses`)
      .set(alice);

    expect(afterDelete.body).toHaveLength(0);
  });

  it('rejects unauthenticated requests on protected routes', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(401);
  });
});

describe('E2E: settlements between members', () => {
  it('records a settlement after adding bob to the group', async () => {
    const createRes = await request(app)
      .post('/api/groups')
      .set(alice)
      .send({ name: 'Roommates' });

    const groupId = createRes.body.id;

    await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set(alice)
      .send({ userId: 'bob' });

    const settlementRes = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set(alice)
      .send({ toUserId: 'bob', amount: 25.5 });

    expect(settlementRes.status).toBe(201);
    expect(settlementRes.body.fromUserId).toBe('alice');
    expect(settlementRes.body.toUserId).toBe('bob');
    expect(settlementRes.body.amount).toBe(25.5);

    const listRes = await request(app)
      .get(`/api/groups/${groupId}/settlements`)
      .set(alice);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].toUserId).toBe('bob');
  });

  it('rejects settling with yourself or a non-member', async () => {
    const createRes = await request(app)
      .post('/api/groups')
      .set(alice)
      .send({ name: 'Solo' });

    const groupId = createRes.body.id;

    const selfRes = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set(alice)
      .send({ toUserId: 'alice', amount: 10 });

    expect(selfRes.status).toBe(400);

    const outsiderRes = await request(app)
      .post(`/api/groups/${groupId}/settlements`)
      .set(alice)
      .send({ toUserId: 'bob', amount: 10 });

    expect(outsiderRes.status).toBe(400);
  });
});
