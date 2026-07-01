const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/app/globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');

console.log('Running postcss...');
postcss([tailwind])
  .process(cssContent, { from: cssPath })
  .then(result => {
    console.log('Postcss finished successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Postcss error:', err);
    process.exit(1);
  });
