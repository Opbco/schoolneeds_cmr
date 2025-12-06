const reportService = require('../src/services/reportService');
const db = require('../src/config/db');

// Mock database module
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

const schoolService = require('../src/services/schoolService');
jest.mock('../src/services/schoolService', () => ({
  getSchoolById: jest.fn()
}));

describe('ReportService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getSchoolNeedsReport groups data by status correctly', async () => {
    // Mock school data
    schoolService.getSchoolById.mockResolvedValue({
      id: 105,
      name: 'Lycée de Touboro'
    });

    // Mock stored procedure result
    // db.query returns [rows, fields]
    // For CALL, rows is [resultSet1, resultSet2, okPacket]
    // So we need: [ [ [row1, row2, ...] ] ]
    const mockSPResult = [
      [
        [
          {
            domain_name: "Mathematics",
            hours_needed: 120,
            hours_available: 80,
            balance: -40,
            status: "DEFICIT (BESOIN)"
          },
          {
            domain_name: "French",
            hours_needed: 85,
            hours_available: 90,
            balance: 5,
            status: "EXCESS (PLETHORE)"
          },
          {
            domain_name: "Computer Science",
            hours_needed: 30,
            hours_available: 0,
            balance: -30,
            status: "DEFICIT (BESOIN)"
          }
        ]
      ]
    ];

    db.query.mockResolvedValue(mockSPResult);

    const result = await reportService.getSchoolNeedsReport(105);

    expect(result.school_id).toBe(105);
    expect(result.school_name).toBe('Lycée de Touboro');
    
    // Verify grouping
    expect(result.report['DEFICIT (BESOIN)']).toHaveLength(2);
    expect(result.report['EXCESS (PLETHORE)']).toHaveLength(1);
    
    expect(result.report['DEFICIT (BESOIN)'][0].domain_name).toBe("Mathematics");
    expect(result.report['DEFICIT (BESOIN)'][1].domain_name).toBe("Computer Science");
    expect(result.report['EXCESS (PLETHORE)'][0].domain_name).toBe("French");
  });

  test('getSchoolNeedsReport handles empty results', async () => {
    schoolService.getSchoolById.mockResolvedValue({
      id: 105,
      name: 'Lycée de Touboro'
    });

    // Empty result set: [ [ [] ] ]
    db.query.mockResolvedValue([ [ [] ] ]);

    const result = await reportService.getSchoolNeedsReport(105);

    expect(result.report).toEqual({});
  });
});
