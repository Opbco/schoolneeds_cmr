const personnelService = require('../src/services/personnelService');
const db = require('../src/config/db');

// Mock database
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

describe('PersonnelService - Transfer', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      beginTransaction: jest.fn(),
      query: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn()
    };
    db.getConnection.mockResolvedValue(mockConnection);
    jest.clearAllMocks();
  });

  test('transferPersonnel executes transaction correctly', async () => {
    mockConnection.query
      .mockResolvedValueOnce([]) // Deactivate query
      .mockResolvedValueOnce([{ insertId: 999 }]); // Insert query

    const transferData = {
      personnel_matricule: 'M123',
      new_school_id: 10,
      admin_position_code: 'P1'
    };

    const result = await personnelService.transferPersonnel(transferData);

    expect(db.getConnection).toHaveBeenCalled();
    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.query).toHaveBeenCalledTimes(2);
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
    
    expect(result.message).toBe('Transfer successful');
    expect(result.id).toBe(999);
  });

  test('transferPersonnel rolls back on error', async () => {
    const error = new Error('DB Error');
    mockConnection.query.mockRejectedValueOnce(error);

    const transferData = {
      personnel_matricule: 'M123',
      new_school_id: 10
    };

    await expect(personnelService.transferPersonnel(transferData)).rejects.toThrow('DB Error');

    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });
});
