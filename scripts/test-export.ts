import { formatCSVRow, CSV_HEADERS, transformToCSVRow, ExportDataRow, BOM } from '../src/lib/export/csv-generator';

async function testCSVGenerator() {
  console.log('Testing CSV Generator...');

  const sampleRow: ExportDataRow = {
    createdAt: new Date('2026-03-10T10:00:00Z'),
    promptContent: 'Best smartphone in 2026?',
    aiPlatform: 'chatgpt',
    countryCode: 'US',
    categoryName: 'Electronics',
    brandName: 'Apple "iPhone 17"',
    rank: 1,
    sentiment: 'positive',
    mentions: 15,
  };

  const headerRow = formatCSVRow(CSV_HEADERS);
  const dataRow = transformToCSVRow(sampleRow);

  console.log('BOM included:', BOM === '\uFEFF');
  console.log('Header:', headerRow);
  console.log('Data Row:', dataRow);

  if (!headerRow.includes('日期') || !headerRow.includes('提及品牌')) {
    throw new Error('Header mismatch');
  }

  if (!dataRow.includes('2026-03-10') || !dataRow.includes('Apple ""iPhone 17""')) {
    throw new Error('Data row mismatch or escaping failed');
  }

  console.log('CSV Generator test passed!');
}

testCSVGenerator().catch(err => {
  console.error(err);
  process.exit(1);
});
