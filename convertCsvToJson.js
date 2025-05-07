// convertCsvToJson.js
const fs = require('fs');
const path = require('path');

const csvFilePath = '/Users/amberwinter/Downloads/Database - Sheet3.csv';
const jsonFilePath = path.resolve(__dirname, 'enhanced_developmental_skills.json');

function parseCsv(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    // Handle quoted fields and commas inside quotes
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ? values[idx].replace(/^"|"$/g, '') : '';
    });
    // Convert ageRanges and prerequisites to arrays
    obj.ageRanges = obj.ageRanges ? obj.ageRanges.split(';').map(s => s.trim()).filter(Boolean) : [];
    obj.prerequisites = obj.prerequisites ? obj.prerequisites.split(';').map(s => s.trim()).filter(Boolean) : [];
    return obj;
  });
}

const csv = fs.readFileSync(csvFilePath, 'utf8');
const json = parseCsv(csv);
fs.writeFileSync(jsonFilePath, JSON.stringify(json, null, 2));
console.log(`Converted CSV to JSON: ${jsonFilePath}`);