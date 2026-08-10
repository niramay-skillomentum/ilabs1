const fs = require('fs');
const xlsx = require('xlsx');

const dir = './reference-data/source';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

for (const file of files) {
  if (file.startsWith('~')) continue; // Skip temp files
  try {
    const wb = xlsx.readFile(`${dir}/${file}`);
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      if (data.length > 0 && ('rule_id' in data[0] || 'Rule ID' in data[0])) {
        console.log(`\n=== FILE: ${file} | SHEET: ${sheetName} ===`);
        const rules = data.map(r => r.rule_id || r['Rule ID']);
        console.log(rules);
      }
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}
