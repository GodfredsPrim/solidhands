const fs = require('fs');
const path = require('path');
const pdfPath = path.join(__dirname, 'uploads', '1777803260964-Vincent_Cybersecurity_Resume.pdf');
const buf = fs.readFileSync(pdfPath);
const text = buf.toString('latin1');
const idx = text.indexOf('stream');
console.log('First stream index', idx);
console.log(text.slice(idx-100, idx+300).replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
