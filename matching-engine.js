const fs = require('fs');
const zlib = require('zlib');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * AI CV Matching Engine (Improved)
 * Analyzes CV text against job requirements with better accuracy.
 */
class MatchingEngine {
    constructor() {
        // Comprehensive synonyms database covering tech, service, manual, and general skills
        this.synonyms = {
            // Security & Cybersecurity
            'cybersecurity': ['cybersecurity', 'cyber security', 'cyber-security', 'infosec', 'information security', 'security', 'network security', 'application security', 'cloud security'],
            'encryption': ['encryption', 'cryptography', 'crypto', 'ssl', 'tls'],
            'penetration testing': ['penetration testing', 'pen testing', 'ethical hacking', 'hacking', 'security testing'],
            'networking': ['networking', 'network', 'tcp/ip', 'lan', 'wan', 'vpn'],
            'firewall': ['firewall', 'firewalls', 'ips', 'intrusion prevention'],
            'malware': ['malware', 'virus', 'trojan', 'ransomware', 'worm'],
            'compliance': ['compliance', 'iso', 'pci-dss', 'hipaa', 'gdpr', 'soc2'],
            'incident response': ['incident response', 'incident handling', 'forensics', 'forensic'],
            'authentication': ['authentication', 'mfa', 'multi-factor', 'oauth', 'ldap', 'active directory'],
            'siem': ['siem', 'splunk', 'elk stack', 'elasticsearch'],
            'engineering': ['engineering', 'engineer', 'industrial engineering', 'mechanical engineering', 'electrical engineering', 'process engineering', 'manufacturing engineering'],
            'industrialization': ['industrialization', 'industrialisation', 'industrial', 'manufacturing', 'plant operations', 'industrial operations', 'production engineering'],
            
            // Tech Skills
            'javascript': ['javascript', 'js', 'ecmascript'],
            'typescript': ['typescript', 'ts'],
            'react': ['react', 'reactjs', 'react.js'],
            'vue': ['vue', 'vuejs', 'vue.js'],
            'angular': ['angular', 'angularjs'],
            'nodejs': ['nodejs', 'node.js', 'node'],
            'python': ['python', 'py'],
            'java': ['java'],
            'csharp': ['csharp', 'c#', 'c sharp'],
            'cpp': ['cpp', 'c++'],
            'aws': ['aws', 'amazon web services', 'amazon'],
            'azure': ['azure', 'microsoft azure'],
            'gcp': ['gcp', 'google cloud'],
            'docker': ['docker', 'containerization', 'container'],
            'kubernetes': ['kubernetes', 'k8s'],
            'git': ['git', 'github', 'gitlab', 'bitbucket', 'version control'],
            'sql': ['sql', 'mysql', 'postgresql', 'mssql', 'oracle', 'database', 'databases'],
            'nosql': ['nosql', 'mongodb', 'firebase', 'dynamodb'],
            'html': ['html', 'html5'],
            'css': ['css', 'css3', 'scss', 'sass', 'less'],
            'api': ['api', 'rest', 'restful', 'apis'],
            'agile': ['agile', 'scrum', 'kanban'],
            'cicd': ['ci/cd', 'cicd', 'jenkins', 'gitlab-ci', 'github actions'],
            
            // Service & Customer-Facing Skills
            'communication': ['communication', 'communicating', 'communication skills', 'interpersonal', 'interpersonal skills'],
            'customer service': ['customer service', 'customer support', 'client support', 'customer care'],
            'teamwork': ['teamwork', 'team work', 'collaborative', 'collaboration', 'team player'],
            'leadership': ['leadership', 'leader', 'leading', 'team lead', 'management', 'managing'],
            
            // Cleaning & Maintenance
            'cleaning': ['cleaning', 'clean', 'cleaner', 'janitorial', 'janitor', 'housekeeping', 'tidying', 'tidiness'],
            'maintenance': ['maintenance', 'maintain', 'repair', 'repairing', 'fixing', 'upkeep'],
            'hygiene': ['hygiene', 'sanitation', 'sanitizing', 'sterilizing', 'disinfection', 'disinfecting'],
            
            // General Work Skills
            'attention to detail': ['attention to detail', 'detail-oriented', 'careful', 'precise', 'precision', 'accuracy'],
            'problem solving': ['problem solving', 'problem-solving', 'troubleshooting', 'analytical'],
            'organization': ['organization', 'organizational', 'organized', 'organized skills', 'time management'],
            'reliability': ['reliability', 'reliable', 'dependability', 'dependable', 'punctuality', 'punctual'],
            'physical fitness': ['physical fitness', 'physical strength', 'physical stamina', 'endurance', 'stamina'],
            'driving': ['driving', 'driver', 'driving license', 'valid license', 'vehicle'],
            
            // Administrative
            'data entry': ['data entry', 'data input', 'typing', 'keyboard'],
            'ms office': ['ms office', 'microsoft office', 'excel', 'word', 'powerpoint'],
            'excel': ['excel', 'spreadsheet', 'pivot table'],
            'word': ['word', 'microsoft word', 'document'],
            'powerpoint': ['powerpoint', 'presentations', 'presentation skills'],
        };
    }

    /**
     * Extracts text from a CV file (PDF or DOCX)
     */
    async extractText(filePath, mimeType) {
        if (!fs.existsSync(filePath)) throw new Error(`File not found at: ${filePath}. Current CWD: ${process.cwd()}`);

        const dataBuffer = fs.readFileSync(filePath);

        try {
            if (mimeType === 'application/pdf') {
                try {
                    const pdfParser = pdf.default || pdf;
                    const data = await pdfParser(dataBuffer);
                    if (data && data.text && data.text.trim().length > 20) {
                        return data.text;
                    }
                } catch (err) {
                    console.warn('[PDF Fallback] pdf-parse failed:', err.message);
                }
                return this.extractPdfTextFallback(dataBuffer);
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filePath.endsWith('.docx')) {
                const data = await mammoth.extractRawText({ buffer: dataBuffer });
                return data.value || "";
            } else if (mimeType === 'application/msword' || filePath.endsWith('.doc')) {
                return dataBuffer.toString('utf-8').replace(/[^\x20-\x7E\t\n\r]/g, ' ');
            } else {
                return dataBuffer.toString();
            }
        } catch (err) {
            console.error(`[Extraction Error] ${mimeType}:`, err.message);
            return "[AI Error: Unsupported or corrupted document format]";
        }
    }

    extractPdfTextFallback(dataBuffer) {
        const raw = dataBuffer.toString('latin1');
        let extractedText = '';
        const streamPattern = /stream\r?\n([\s\S]*?)endstream/g;
        let match;

        while ((match = streamPattern.exec(raw)) !== null) {
            const streamData = match[1];
            let streamText = '';

            // Try ASCII85 + FlateDecode first
            try {
                const ascii85 = this.decodeAscii85(streamData);
                streamText = this.inflatePdfStream(ascii85);
            } catch (err) {
                // If ASCII85 decoding fails, try raw stream inflation
                try {
                    streamText = this.inflatePdfStream(Buffer.from(streamData, 'latin1'));
                } catch (err2) {
                    // Not a Flate stream or decode failed
                    streamText = streamData.toString('latin1');
                }
            }

            if (streamText) {
                extractedText += this.extractTextFromPdfStream(streamText) + ' ';
            }
        }

        extractedText = this.cleanExtractedText(extractedText);
        if (extractedText.length > 20) {
            return extractedText;
        }

        // As a last resort, return readable ASCII from the raw PDF bytes
        return raw
            .replace(/[\r\n]+/g, ' ')
            .replace(/[^\x20-\x7E]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    inflatePdfStream(buffer) {
        try {
            const inflated = zlib.inflateSync(buffer);
            return inflated.toString('latin1');
        } catch (err) {
            throw err;
        }
    }

    extractTextFromPdfStream(streamText) {
        let result = '';

        // Extract text from literal strings inside text objects.
        const textObjects = streamText.split(/BT|ET/gi);
        for (const block of textObjects) {
            // Extract individual string literals used with Tj
            const tjMatches = Array.from(block.matchAll(/\(([^)]*)\)\s*Tj/g));
            for (const match of tjMatches) {
                result += this.unescapePdfString(match[1]) + ' ';
            }

            // Extract string arrays used with TJ
            const tjArrayMatches = Array.from(block.matchAll(/\[([^\]]*)\]\s*TJ/g));
            for (const match of tjArrayMatches) {
                const arrayContent = match[1];
                const stringMatches = Array.from(arrayContent.matchAll(/\(([^)]*)\)/g));
                for (const stringMatch of stringMatches) {
                    result += this.unescapePdfString(stringMatch[1]) + ' ';
                }
            }
        }

        return result;
    }

    unescapePdfString(value) {
        return value
            .replace(/\\([\\()nrtbf])/g, (_, ch) => {
                switch (ch) {
                    case 'n': return '\n';
                    case 'r': return '\r';
                    case 't': return '\t';
                    case 'b': return '\b';
                    case 'f': return '\f';
                    case '\\': return '\\';
                    case '(':
                    case ')': return ch;
                    default: return ch;
                }
            })
            .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
    }

    decodeAscii85(data) {
        const source = data.replace(/\s+/g, '');
        const end = source.indexOf('~>');
        if (end === -1) {
            throw new Error('No ASCII85 terminator detected');
        }

        const payload = source.slice(0, end);
        const bytes = [];
        let tuple = 0;
        let count = 0;

        for (const ch of payload) {
            if (ch === 'z') {
                if (count !== 0) {
                    throw new Error('Invalid z in ASCII85 stream');
                }
                bytes.push(0, 0, 0, 0);
                continue;
            }

            const value = ch.charCodeAt(0) - 33;
            if (value < 0 || value > 84) {
                continue;
            }

            tuple = tuple * 85 + value;
            count += 1;

            if (count === 5) {
                bytes.push((tuple >> 24) & 0xFF, (tuple >> 16) & 0xFF, (tuple >> 8) & 0xFF, tuple & 0xFF);
                tuple = 0;
                count = 0;
            }
        }

        if (count > 0) {
            for (let i = count; i < 5; i++) {
                tuple = tuple * 85 + 84;
            }
            for (let i = 0; i < count - 1; i++) {
                bytes.push((tuple >> (24 - 8 * i)) & 0xFF);
            }
        }

        return Buffer.from(bytes);
    }

    cleanExtractedText(text) {
        return text
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[^\x20-\x7E]/g, ' ')
            .trim();
    }

    /**
     * Calculate similarity between two strings (Levenshtein distance based)
     */
    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }

        const distance = matrix[len2][len1];
        return 1 - (distance / Math.max(len1, len2));
    }

    /**
     * Find fuzzy matches for a keyword in CV text
     */
    findFuzzyMatches(cvText, keyword) {
        const cvLower = cvText.toLowerCase();
        
        // Direct substring match (highest confidence)
        if (cvLower.includes(keyword)) {
            return { found: true, confidence: 1.0, type: 'direct' };
        }

        // Fuzzy matching for variations
        const words = cvLower.split(/\s+|[^\w\s+#]/);
        for (let word of words) {
            const similarity = this.calculateSimilarity(keyword, word);
            if (similarity > 0.8) { // 80% similarity threshold
                return { found: true, confidence: similarity, type: 'fuzzy' };
            }
        }

        return { found: false, confidence: 0, type: 'none' };
    }

    /**
     * Check if requirement is matched in CV using job-specific requirements from admin
     */
    checkRequirementMatch(cvText, requirement) {
        const reqLower = requirement.toLowerCase().trim();
        
        if (!reqLower) return { matched: false, confidence: 0 };

        const cvLower = cvText.toLowerCase();

        // Step 1: Direct phrase match (highest confidence)
        if (cvLower.includes(reqLower)) {
            console.log(`  [✓] Direct match found: "${reqLower}"`);
            return { matched: true, confidence: 100 };
        }

        // Step 2: Check if requirement has synonyms defined
        const synonymsForRequirement = this.findSynonymsForRequirement(reqLower);
        console.log(`  [Synonyms] For "${reqLower}": ${synonymsForRequirement.slice(0, 5).join(', ')}`);
        
        if (synonymsForRequirement.length > 0) {
            // Check if any synonym exists in CV
            for (const synonym of synonymsForRequirement) {
                const match = this.findFuzzyMatches(cvText, synonym);
                if (match.found) {
                    console.log(`  [✓] Synonym match: "${synonym}" (confidence: ${Math.round(match.confidence * 100)}%)`);
                    return { matched: true, confidence: Math.round(match.confidence * 100) };
                }
            }
        }

        // Step 3: Fuzzy match the full requirement phrase
        const phraseMatch = this.findFuzzyMatches(cvText, reqLower);
        if (phraseMatch.found && phraseMatch.confidence > 0.75) {
            console.log(`  [✓] Fuzzy phrase match: "${reqLower}" (confidence: ${Math.round(phraseMatch.confidence * 100)}%)`);
            return { matched: true, confidence: Math.round(phraseMatch.confidence * 100) };
        }

        // Step 4: Break requirement into meaningful words and check each
        const words = reqLower.split(/\s+/).filter(w => w.length > 2);
        let totalWordMatches = 0;
        let highConfidenceMatches = 0;
        const matchedWords = [];

        for (const word of words) {
            const match = this.findFuzzyMatches(cvText, word);
            if (match.found) {
                totalWordMatches++;
                matchedWords.push(`${word}:${Math.round(match.confidence * 100)}%`);
                if (match.confidence > 0.8) {
                    highConfidenceMatches++;
                }
            }
        }

        if (matchedWords.length > 0) {
            console.log(`  [Words] Matched: ${matchedWords.join(', ')}`);
        }

        // Calculate confidence based on word matches
        if (words.length > 0) {
            const baseConfidence = Math.round((totalWordMatches / words.length) * 100);
            const boostedConfidence = Math.min(100, baseConfidence + (highConfidenceMatches * 10));
            const finalConfidence = totalWordMatches > 0
                ? Math.max(boostedConfidence, highConfidenceMatches > 0 ? 35 : 25)
                : 0;

            console.log(`  [Analysis] Words: ${words.length}, Matches: ${totalWordMatches}, High-confidence: ${highConfidenceMatches}, Final score: ${finalConfidence}%`);
            
            return {
                matched: finalConfidence >= 30,
                confidence: finalConfidence
            };
        }

        console.log(`  [✗] No match found for: "${reqLower}"`);
        return { matched: false, confidence: 0 };
    }

    /**
     * Find all synonym variations for a given requirement
     */
    findSynonymsForRequirement(requirement) {
        // Direct lookup
        if (this.synonyms[requirement]) {
            return this.synonyms[requirement];
        }

        // Partial lookup - check if requirement is part of any key or value
        for (const [key, values] of Object.entries(this.synonyms)) {
            // Check if requirement matches the key
            if (key.includes(requirement) || requirement.includes(key)) {
                return values;
            }
            // Check if requirement matches any synonym value
            if (values.some(v => v.includes(requirement) || requirement.includes(v))) {
                return values;
            }
        }

        // No synonyms found, return the requirement itself
        return [requirement];
    }

    /**
     * Matches CV text against job requirements as specified by admin
     * Uses job-specific requirements provided when posting the job
     */
    async matchCV(cvText, requirements) {
        if (!cvText || cvText.includes("[AI Error")) {
            console.log('[Matching] CV extraction failed');
            return {
                score: 0,
                summary: "Unable to extract text from CV. Please ensure file is valid.",
                matches: []
            };
        }

        if (!requirements || requirements.length === 0) {
            console.log('[Matching] No requirements provided');
            return {
                score: 0,
                summary: "No requirements provided for matching",
                matches: []
            };
        }

        // Clean requirements: remove \r, \n and trim
        const cleanedRequirements = requirements
            .map(req => req.replace(/[\r\n]/g, '').trim())
            .filter(req => req.length > 0);

        console.log(`[Matching] Processing ${cleanedRequirements.length} requirements for CV`);
        console.log(`[Matching] Requirements:`, cleanedRequirements);
        console.log(`[Matching] CV text length: ${cvText.length} characters`);
        console.log(`[Matching] First 200 chars of CV: ${cvText.substring(0, 200)}`);

        const matches = [];
        let totalScore = 0;

        // Scan CV against each requirement posted by admin
        for (const requirement of cleanedRequirements) {
            if (!requirement.trim()) continue;

            const matchResult = this.checkRequirementMatch(cvText, requirement);
            const confidence = matchResult.confidence;
            totalScore += confidence;

            console.log(`[Matching] Requirement: "${requirement}" -> Score: ${confidence}%`);

            // Include all requirements in results (show what matched and what didn't)
            matches.push({
                requirement: requirement,
                score: Math.round(confidence),
                matched: matchResult.matched,
                status: confidence >= 60 ? 'matched' : (confidence >= 30 ? 'partial' : 'not-matched')
            });
        }

        const validRequirements = cleanedRequirements.length;
        const averageScore = validRequirements > 0 ? Math.round(totalScore / validRequirements) : 0;

        console.log(`[Matching] Average Score: ${averageScore}%`);

        let summary = "";
        if (averageScore >= 80) {
            summary = "Excellent match! CV strongly aligns with job requirements.";
        } else if (averageScore >= 65) {
            summary = "Good match. CV shows relevant experience and skills.";
        } else if (averageScore >= 50) {
            summary = "Moderate match. Some relevant experience and skills found.";
        } else if (averageScore >= 30) {
            summary = "Partial match. The candidate shows relevant background and may fit engineering roles after refinement.";
        } else {
            summary = "Limited match. Encourage the candidate to highlight engineering and industrial skills more clearly.";
        }

        return {
            score: averageScore,
            summary,
            matches
        };
    }
}

module.exports = new MatchingEngine();
