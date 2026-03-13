/**
 * CSV 序列化工具
 * 支持流式处理大数据量，并解决 Excel 中文乱码问题 (BOM)
 */

export function formatCSVRow(columns: any[]): string {
  return columns
    .map((col) => {
      if (col === null || col === undefined) return '""';
      const escaped = String(col).replace(/"/g, '""');
      // 处理换行符，CSV 格式建议将其替换或包裹
      const normalized = escaped.replace(/\n/g, ' ');
      return `"${normalized}"`;
    })
    .join(',') + '\r\n';
}

export const CSV_HEADERS = [
  '日期',
  '问题',
  '平台',
  '国家',
  '分类',
  '提及品牌',
  '排名',
  '情感',
  '引用数',
];

export const BOM = '\uFEFF';

export type ExportDataRow = {
  createdAt: Date;
  promptContent: string;
  aiPlatform: string;
  countryCode: string;
  categoryName: string;
  brandName: string | null;
  rank: number | null;
  sentiment: string | null;
  mentions: number | null;
};

export function transformToCSVRow(row: ExportDataRow): string {
  return formatCSVRow([
    row.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
    row.promptContent,
    row.aiPlatform,
    row.countryCode,
    row.categoryName,
    row.brandName || '-',
    row.rank || '-',
    row.sentiment || '-',
    row.mentions || 0,
  ]);
}
