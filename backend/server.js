const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const groupRoutes = require('./routes/groups');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Firebase API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
