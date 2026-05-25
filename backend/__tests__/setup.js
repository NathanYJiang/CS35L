jest.mock('firebase-admin', () => {
  const { createFirebaseAdminMock, FieldValue } = require('./mocks/firebaseAdmin');
  const mockAdmin = createFirebaseAdminMock();
  const firestore = mockAdmin.firestore();
  mockAdmin.firestore = () => firestore;
  mockAdmin.firestore.FieldValue = FieldValue;
  return mockAdmin;
});
