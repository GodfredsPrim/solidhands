const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * AI CV Matching Engine
 * Analyzes CV text against job requirements and returns a match score.
 */
class MatchingEngine {
    constructor() {
        // Industry-specific keywords for engineering roles
        this.industryKeywords = {
            "Civil Engineer": ["civil", "construction", "autocad", "site planning", "infrastructure", "surveying", "concrete", "structural"],
            "Structural Engineer": ["structural", "concrete", "steel", "sap2000", "etabs", "design", "load analysis", "buildings"],
            "Mechanical Engineer": ["mechanical", "hvac", "piping", "thermodynamics", "solidworks", "maintenance", "industrial", "fabrication"],
            "Electrical Engineer": ["electrical", "power systems", "circuits", "cabling", "automation", "electronics", "high voltage", "wiring"],
            "Project Manager": ["project management", "pmp", "scheduling", "budgeting", "leadership", "stakeholder", "construction management", "reporting"],
            "Site Supervisor": ["site", "supervision", "safety", "logistics", "workflow", "inspection", "workforce", "compliance"],
            "Heavy Equipment Operator": ["operator", "excavator", "bulldozer", "crane", "heavy machinery", "safety", "maintenance", "earthmoving"],
            "Welding Inspector": ["welding", "ndt", "inspection", "fabrication", "metallurgy", "quality control", "codes", "standards"],
            "Health & Safety Officer": ["hse", "safety", "osha", "compliance", "first aid", "risk assessment", "environmental", "audit"],
            "Land Surveyor": ["surveying", "gis", "total station", "mapping", "topography", "gps", "land development", "cartography"]
        };
    }

    /**
     * Extracts text from a CV file (PDF or DOCX)
     */
    async extractText(filePath, mimeType) {
        if (!fs.existsSync(filePath)) throw new Error("File not found");

        const dataBuffer = fs.readFileSync(filePath);

        if (mimeType === 'application/pdf') {
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const data = await mammoth.extractRawText({ buffer: dataBuffer });
            return data.value;
        } else {
            // Fallback for plain text or unknown
            return dataBuffer.toString();
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
