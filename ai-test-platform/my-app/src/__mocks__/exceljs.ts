// Mock for exceljs
// Excel文件是ZIP格式，以PK开头（0x504B）
const MOCK_EXCEL_BUFFER = Buffer.concat([
  Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP文件头
  Buffer.alloc(100, 0), // 填充数据
]);

export class Workbook {
  addWorksheet(name: string) {
    const rows: any[] = [];
    const cells: any[] = [];
    return {
      addRow: jest.fn((data) => {
        rows.push(data);
        return { getCell: jest.fn(() => ({ value: '' })) };
      }),
      columns: [],
      getRow: jest.fn((rowNumber) => ({
        eachCell: jest.fn((callback) => {
          const cell = {
            font: {},
            fill: {},
            alignment: {},
          };
          callback(cell);
        }),
      })),
    };
  }
  
  xlsx = {
    writeBuffer: jest.fn().mockResolvedValue(MOCK_EXCEL_BUFFER),
  };
}

export default {
  Workbook,
};