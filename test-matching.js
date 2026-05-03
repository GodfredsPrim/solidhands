const matchingEngine = require('./matching-engine');
const path = require('path');

async function testMatching() {
    try {
        // Test with one of the cybersecurity CVs
        const cvPath = path.join(__dirname, 'uploads/1777803260964-Vincent_Cybersecurity_Resume.pdf');
        console.log('\n========== TESTING CV MATCHING ENGINE ==========\n');
        console.log(`Testing with CV: ${cvPath}\n`);

        // Extract text
        console.log('[1] Extracting text from CV...');
        const cvText = await matchingEngine.extractText(cvPath, 'application/pdf');
        
        console.log(`[✓] Extracted ${cvText.length} characters\n`);
        console.log('First 500 characters of CV:');
        console.log('---');
        console.log(cvText.substring(0, 500));
        console.log('---\n');

        // Check if "cybersecurity" appears in CV
        console.log('[2] Checking for keyword occurrences...');
        const keywords = ['cybersecurity', 'security', 'certificate', 'certified', 'vincent', 'resume'];
        for (const keyword of keywords) {
            const count = (cvText.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
            console.log(`  "${keyword}": ${count} occurrences`);
        }
        console.log();

        // Test matching with requirement
        console.log('[3] Testing matching with requirements...');
        const requirements = ['Cybersecurity certificate'];
        
        console.log(`Requirements: ${JSON.stringify(requirements)}\n`);
        
        const matchResult = await matchingEngine.matchCV(cvText, requirements);
        
        console.log('\nMatching Result:');
        console.log(`  Score: ${matchResult.score}%`);
        console.log(`  Summary: ${matchResult.summary}`);
        console.log(`  Matches:`, matchResult.matches);

        console.log('\n========== END TEST ==========\n');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testMatching();
