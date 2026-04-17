const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const matchingEngine = require('./matching-engine');

// Company Configuration
const COMPANY_EMAIL = 'erskinegodswillekow@gmail.com';
// Email Notification Setup
// To enable real emails, uncomment and fill in your SMTP details below:
/*
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
});
*/

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Master Password
const ADMIN_PASSWORD = 'solidhands2026';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('[System] Created uploads directory');
}

// Multi-part form setup (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Database Mock (In-memory for speed, could use lowdb for persistence)
const db = {
    applications: [],
    contractors: [],
    jobs: [
        { id: 1, title: "LV mechanic", category: "Technical" },
        { id: 2, title: "HME mechanic", category: "Technical" },
        { id: 3, title: "auto electrician LV", category: "Technical" },
        { id: 4, title: "HME electrician", category: "Technical" },
        { id: 5, title: "housing electrician", category: "Technical" },
        { id: 6, title: "welder", category: "Technical" },
        { id: 7, title: "fabrication technician", category: "Technical" },
        { id: 8, title: "surveyor", category: "Technical" },
        { id: 9, title: "HME Operator", category: "Technical" }
    ]
};

// Database path
const DB_PATH = path.join(__dirname, 'db.json');

// Persistence Logic (Save to db.json on every change)
const saveDb = () => {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

// Load initial DB if exists
if (fs.existsSync(DB_PATH)) {
    Object.assign(db, JSON.parse(fs.readFileSync(DB_PATH)));
}

// Routes

// Get all jobs
app.get('/api/jobs', (req, res) => {
    res.json(db.jobs);
});

// Submit Application (Job Seeker)
app.post('/api/apply', upload.single('cv'), async (req, res) => {
    console.log(`[Incoming] Application request received at ${new Date().toISOString()}`);
    try {
        const { fullName, email, phone, role } = req.body;
        console.log(`[Data] Applicant: ${fullName}, Role: ${role}, Email: ${email}`);
        const cvPath = req.file ? req.file.path : null;
        const mimeType = req.file ? req.file.mimetype : null;
        console.log(`[Storage] CV stored at: ${cvPath}`);

        if (!cvPath) return res.status(400).json({ error: "CV file is required" });

        // Extract and Match
        const cvText = await matchingEngine.extractText(cvPath, mimeType);
        const matchResult = await matchingEngine.matchCV(cvText, role);

        const application = {
            id: Date.now(),
            fullName,
            email,
            phone,
            role,
            cvUrl: `/uploads/${path.basename(cvPath)}`,
            matchScore: matchResult.score,
            matchDetails: matchResult.summary,
            matchKeywords: matchResult.matches,
            date: new Date().toISOString()
        };

        db.applications.push(application);
        saveDb();

        // Send Notification (Simulated)
        console.log(`[Notification to ${COMPANY_EMAIL}] New application from ${fullName} for ${role}. Match Score: ${matchResult.score}%`);
        
        // Return success with match results
        res.json({ success: true, matchResult });
    } catch (error) {
        console.error("[Application Error]", error);
        res.status(500).json({ 
            success: false, 
            error: error.message || "Failed to process application. Please ensure your CV is a valid PDF or Word document." 
        });
    }
});

// Submit Contractor Application
app.post('/api/contractors', (req, res) => {
    console.log(`[Incoming] Contractor application received at ${new Date().toISOString()}`);
    const { companyName, email, phone, specialty, experience } = req.body;
    console.log(`[Data] Company: ${companyName}, Specialty: ${specialty}`);
    
    const contractor = {
        id: Date.now(),
        companyName,
        email,
        phone,
        specialty,
        experience,
        date: new Date().toISOString()
    };

    db.contractors.push(contractor);
    saveDb();

    console.log(`[Notification] New contractor application from ${companyName} (${specialty})`);
    res.json({ success: true });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'fake-jwt-token' });
    } else {
        res.status(401).json({ error: "Incorrect password" });
    }
});

// Admin Data
app.get('/api/admin/data', (req, res) => {
    res.json({
        applications: db.applications,
        contractors: db.contractors,
        jobs: db.jobs
    });
});

// Add Job
app.post('/api/admin/jobs', (req, res) => {
    const { title, category } = req.body;
    if (!title || !category) return res.status(400).json({ error: "Title and Category required" });

    const newJob = {
        id: Date.now(),
        title,
        category
    };

    db.jobs.push(newJob);
    saveDb();
    res.json({ success: true, job: newJob });
});

// Delete Job
app.delete('/api/admin/jobs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const initialLength = db.jobs.length;
    db.jobs = db.jobs.filter(job => job.id !== id);
    
    if (db.jobs.length === initialLength) {
        return res.status(404).json({ error: "Job not found" });
    }

    saveDb();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
