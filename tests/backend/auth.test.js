const request = require('supertest');
const app = require('../../server'); // The exported express app
const mongoose = require('mongoose');

jest.mock('../../src/models/User', () => {
  const mockSave = jest.fn();
  const mockModel = jest.fn(() => ({ save: mockSave }));
  mockModel.findOne = jest.fn();
  mockModel.create = jest.fn();
  return mockModel;
});

const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('Auth API Endpoints', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null); // No existing user

      // newUser.save() will be called, our mock handles it.
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123', fullName: 'Test User' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBeTruthy();
      expect(res.body.message).toEqual('Registration successful');
    });

    it('should fail if user already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'test@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123', fullName: 'Test User' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toEqual('Email is already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user with correct password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      User.findOne.mockResolvedValue({
        email: 'test@example.com',
        password: hashedPassword,
        fullName: 'Test User'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBeTruthy();
      expect(res.body.token).toBeDefined();
    });

    it('should fail if wrong password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      User.findOne.mockResolvedValue({
        email: 'test@example.com',
        password: hashedPassword,
        fullName: 'Test User'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toEqual('Invalid email or password');
    });
  });
});
