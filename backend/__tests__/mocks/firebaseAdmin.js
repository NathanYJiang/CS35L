const { createFirestore, FieldValue, resetFirestoreMock } = require('./firestore');

const TEST_USERS = {
  'token-alice': { uid: 'alice', email: 'alice@test.com' },
  'token-bob': { uid: 'bob', email: 'bob@test.com' },
};

function createFirebaseAdminMock() {
  const firestore = createFirestore();

  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    auth: () => ({
      verifyIdToken: jest.fn(async (token) => {
        const user = TEST_USERS[token];
        if (!user) throw new Error('Invalid token');
        return user;
      }),
    }),
    firestore: () => firestore,
    firestoreFieldValue: FieldValue,
  };
}

module.exports = {
  createFirebaseAdminMock,
  resetFirestoreMock,
  TEST_USERS,
  FieldValue,
};
