const request = require('supertest');
const app = require('../../server'); // The exported express app
const mongoose = require('mongoose');

// Mock mongoose to prevent actual DB connection during tests if needed
// or we can test against an in-memory db or real local db.
// For these tests, we will mock the database models.
jest.mock('../../src/models/User', () => {
  return {
    findOne: jest.fn(),
    create: jest.fn()
  };
});

const User = require('../../src/models/User');
const bcrypt = require('bcrypt');

describe('Auth API Endpoints', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null); // No existing user
      User.create.mockResolvedValue({ userId: 'testuser', desk: 'MO' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ userId: 'testuser', password: 'password123', desk: 'MO' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBeTruthy();
      expect(res.body.token).toBeDefined();
    });

    it('should fail if user already exists', async () => {
      User.findOne.mockResolvedValue({ userId: 'testuser' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ userId: 'testuser', password: 'password123', desk: 'MO' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toEqual('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user with correct password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      User.findOne.mockResolvedValue({
        userId: 'testuser',
        password: hashedPassword,
        desk: 'MO'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'testuser', password: 'password123', desk: 'MO' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBeTruthy();
      expect(res.body.token).toBeDefined();
    });

    it('should fail if wrong password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      User.findOne.mockResolvedValue({
        userId: 'testuser',
        password: hashedPassword,
        desk: 'MO'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'testuser', password: 'wrongpassword', desk: 'MO' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toEqual('Invalid credentials');
    });
  });
});
