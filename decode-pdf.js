const fs = require('fs');
const zlib = require('zlib');

function ascii85Decode(str) {
    const filtered = str.replace(/\s+/g, '');
    let result = [];
    let acc = 0;
    let count = 0;
    for (let i = 0; i < filtered.length; i++) {
        const c = filtered[i];
        if (c === '~') break;
        if (c === 'z') {
            if (count !== 0) throw new Error('Invalid z in ascii85 block');
            result.push(0,0,0,0);
            continue;
        }
        if (c < '!' || c > 'u') throw new Error('Invalid ascii85 char');
        acc = acc * 85 + (c.charCodeAt(0) - 33);
        count++;
        if (count === 5) {
            result.push((acc >> 24) & 0xFF, (acc >> 16) & 0xFF, (acc >> 8) & 0xFF, acc & 0xFF);
            acc = 0;
            count = 0;
        }
    }
    if (count > 0) {
        for (let j = count; j < 5; j++) acc = acc * 85 + 84;
        for (let k = 0; k < count - 1; k++) {
            result.push((acc >> (24 - 8 * k)) & 0xFF);
        }
    }
    return Buffer.from(result);
}

const pdf = fs.readFileSync('uploads/1777803260964-Vincent_Cybersecurity_Resume.pdf');
const text = pdf.toString('latin1');
const filterIndex = text.indexOf('/Filter [ /ASCII85Decode /FlateDecode ]');
console.log('filterIndex', filterIndex);
if (filterIndex < 0) process.exit(1);
const start = text.indexOf('stream', filterIndex);
const end = text.indexOf('endstream', start);
console.log('stream start', start, 'end', end);
if (start < 0 || end < 0) process.exit(1);
const header = text.slice(filterIndex, start);
console.log('header:', header.replace(/\r/g,'\\r').replace(/\n/g,'\\n'));
const lengthMatch = /\/Length\s+(\d+)/.exec(header);
console.log('lengthMatch', lengthMatch && lengthMatch[1]);
const streamData = text.slice(start + 6, end);
console.log('stream len', streamData.length);

function sanitizeStream(str) {
    // strip trailing EOL after stream and before endstream
    return str.replace(/^[\r\n]+|[\r\n]+$/g, '');
}
const rawStream = sanitizeStream(streamData);
console.log('raw stream starts', rawStream.slice(0,80).replace(/\r/g,'\\r').replace(/\n/g,'\\n'));
const decoded = ascii85Decode(rawStream);
console.log('decoded len', decoded.length);
const inflated = zlib.inflateSync(decoded);
console.log('inflated len', inflated.length);
console.log(inflated.toString('latin1').slice(0,500).replace(/\r/g,'\\r').replace(/\n/g,'\\n'));
