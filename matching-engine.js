const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * AI CV Matching Engine
 * Analyzes CV text against job requirements and returns a match score.
 */
class MatchingEngine {
    constructor() {
        // Industry-specific keywords for technical and engineering roles
        this.industryKeywords = {
            "LV mechanic": ["light vehicle", "diesel", "petrol", "engine", "brakes", "suspension", "diagnostics", "maintenance"],
            "HME mechanic": ["heavy mining equipment", "caterpillar", "komatsu", "hydraulics", "transmission", "drivetrain", "excavator", "dozer"],
            "auto electrician LV": ["auto electrical", "wiring", "battery", "alternator", "starter", "diagnostics", "can bus", "lights"],
            "HME electrician": ["heavy equipment", "electrical", "ac/dc", "sensors", "control systems", "mining", "troubleshooting", "machinery"],
            "housing electrician": ["domestic wiring", "residential", "lightings", "switches", "db board", "installations", "safety", "maintenance"],
            "welder": ["welding", "arc", "mig", "tig", "stick", "fabrication", "structural", "aws"],
            "fabrication technician": ["fabrication", "metalwork", "layout", "cutting", "bending", "assembly", "blueprints", "structural"],
            "surveyor": ["surveying", "total station", "gps", "gis", "topography", "mapping", "land development", "cartography"],
            "HME Operator": ["dump truck", "excavator", "grader", "bulldozer", "safety", "pit operations", "mining equipment", "operator"]
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
                const data = await pdf(dataBuffer);
                return data.text || "";
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
            // Instead of throwing, we return a fallback to let the application proceed
            return "[AI Error: Unsupported or corrupted document format]";
        }
    }

    /**
     * Matches extracted text against a target job role
     */
    async matchCV(cvText, targetRole) {
        const text = cvText.toLowerCase();
        const keywords = this.industryKeywords[targetRole] || [];
        
        if (keywords.length === 0) return { score: 0, matches: [] };

        let matchCount = 0;
        const foundKeywords = [];

        keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                matchCount++;
                foundKeywords.push(keyword);
            }
        });

        // Calculate score out of 100
        const rawScore = (matchCount / keywords.length) * 100;
        
        // Add a bit of "AI logic" - look for common action verbs
        const actionVerbs = ["managed", "developed", "built", "engineered", "designed", "coordinated", "implemented"];
        let verbBonus = 0;
        actionVerbs.forEach(verb => {
            if (text.includes(verb)) verbBonus += 5;
        });

        const finalScore = Math.min(Math.round(rawScore + verbBonus), 100);

        return {
            score: finalScore,
            matches: foundKeywords,
            summary: `Found keywords: ${foundKeywords.join(', ')}. Candidate shows strong experience in ${foundKeywords.slice(0, 3).join(' and ')}.`
        };
    }
}

module.exports = new MatchingEngine();
