const request = require('supertest');
const app = require('./server'); // Import the Express application

describe('GET /', () => {
  it('should return Firebase API is running', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Firebase API is running');
  });
});
