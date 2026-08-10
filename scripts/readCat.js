const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../reference-data/source/CIBOTA_Bloomberg_Terminal_Phase1_Command_Catalogue.xlsx');
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
const commands = data.map(row => ({
  command: row['Command'],
  category: row['Category'],
  description: row['Description'],
  inputs: row['Expected Inputs']
})).filter(r => r.command);

fs.writeFileSync(path.join(__dirname, 'cat_output.json'), JSON.stringify(commands, null, 2));
