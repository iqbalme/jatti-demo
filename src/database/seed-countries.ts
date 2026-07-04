import '../config/env';
import { prisma } from '../utils/db';
import { readFileSync } from 'fs';
import { join } from 'path';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function seedCountries() {
  console.log('Seeding countries...');

  const csvPath = join(__dirname, 'country_phone_codes-v2.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');

  const headers = parseCsvLine(lines[0]);
  const codeIdx = headers.indexOf('country_code');
  const nameIdx = headers.indexOf('country_name');
  const dialIdx = headers.indexOf('dial_code');
  const dial4Idx = headers.indexOf('dial_code_4');

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 4) continue;

    await prisma.country.upsert({
      where: { code: cols[codeIdx] },
      update: { name: cols[nameIdx], dialCode: cols[dialIdx], dialCode4: cols[dial4Idx] },
      create: { code: cols[codeIdx], name: cols[nameIdx], dialCode: cols[dialIdx], dialCode4: cols[dial4Idx] },
    });
    count++;
  }

  console.log(`Seed complete: ${count} countries inserted/updated`);
}

seedCountries().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
