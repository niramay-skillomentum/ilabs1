const request = require('supertest');
const app = require('../../server'); 
const Trade = require('../../src/models/Trade');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../src/middleware/auth');

jest.mock('../../src/models/Trade', () => {
  const mockSave = jest.fn();
  const mockModel = jest.fn(() => ({ save: mockSave }));
  mockModel.findOne = jest.fn();
  mockModel.updateOne = jest.fn();
  return mockModel;
});

describe('Trade Actions API', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ userId: 'test@example.com', fullName: 'Test User' }, JWT_SECRET, { expiresIn: '1h' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/trades/:tradeRef/action', () => {
    it('should reject CONFIRM_TRADE if status is CONFIRMATION_BREAK', async () => {
      Trade.findOne.mockResolvedValue({
        tradeRef: 'TRD123',
        currentStatus: 'CONFIRMATION_BREAK',
        save: jest.fn()
      });

      const res = await request(app)
        .post('/api/trades/TRD123/action')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'CONFIRM_TRADE' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toMatch(/Invalid action/);
    });

    it('should allow CONFIRM_TRADE if status is LIASING_WITH_CPTY', async () => {
      const mockTrade = {
        tradeRef: 'TRD123',
        currentStatus: 'LIASING_WITH_CPTY',
        save: jest.fn()
      };
      Trade.findOne.mockResolvedValue(mockTrade);

      const res = await request(app)
        .post('/api/trades/TRD123/action')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'CONFIRM_TRADE' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBeTruthy();
      expect(mockTrade.currentStatus).toBe('CONFIRMED');
    });
  });
});
