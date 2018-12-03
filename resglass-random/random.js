const parse = require('csv-parse/lib/sync');
const fs = require('fs');

const inputStr = fs.readFileSync(process.argv[2], 'utf-8');

const parseOptions = {
  columns: false,
  skip_empty_lines: true
};

const input = parse(inputStr, parseOptions).map(a => a[0]);

input.forEach(i => {
  const r = generateRandomNumber(0, input.length - 1)/25;
  console.log(`${i},${r}`);
});

function generateRandomNumber(min , max) {
  return Math.floor(Math.random() * (max-min) + min);
} 
