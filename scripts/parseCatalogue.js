const XLSX = require('xlsx'); 
const fs = require('fs');
const path = require('path'); 
const file = 'e:\\ilabs1-main\\reference-data\\source\\CIBOTA_Bloomberg_Terminal_Phase1_Command_Catalogue.xlsx'; 
const workbook = XLSX.readFile(file); 
const output = {};
workbook.SheetNames.forEach(sheetName => { 
  output[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
});
fs.writeFileSync('e:\\ilabs1-main\\catalogue_output.json', JSON.stringify(output, null, 2));
console.log('Catalogue exported to catalogue_output.json');
