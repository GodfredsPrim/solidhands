const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const matchingEngine = require('./matching-engine');

// Load environment variables
require('dotenv').config();

// Company Configuration
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || 'erskinegodswillekow@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'solidhands2026';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'replace-with-secure-random-value';
const ADMIN_TOKEN_EXPIRY = process.env.ADMIN_TOKEN_EXPIRY || '2h';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';

// Email Notification Setup
const emailUser = (process.env.EMAIL_USER || 'erskinegodswillekow@gmail.com').trim();
const emailPass = (process.env.EMAIL_PASS || 'your-app-password-here').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass
    }
});

// Test email connection on startup
transporter.verify((error) => {
    if (error) {
        console.log('[Email] ❌ Email sending DISABLED - Invalid credentials');
        console.log('[Email] 📧 To enable: Set EMAIL_USER and EMAIL_PASS in .env file');
        console.log('[Email] 🔗 Gmail App Password: https://support.google.com/accounts/answer/185833');
    } else {
        console.log('[Email] ✅ Email server ready - notifications and bulk email enabled');
    }
});

// Email template helpers (spam-safe designs)
function createApplicationEmailHtml(fullName, email, phone, location, jobTitle, matchScore, matchDetails) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border: 1px solid #e0e0e0;">
                    <tr style="background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 20px; border-left: 4px solid #FF7300;">
                            <h2 style="margin: 0; color: #333; font-size: 18px;">New Job Application</h2>
                            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Position: ${jobTitle}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px;">
                            <h3 style="margin: 0 0 15px 0; color: #FF7300; font-size: 14px; text-transform: uppercase;">Applicant Information</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
                                    <td style="padding: 8px 0;">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                                    <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #FF7300; text-decoration: none;">${email}</a></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                                    <td style="padding: 8px 0;">${phone || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                                    <td style="padding: 8px 0;">${location || 'N/A'}</td>
                                </tr>
                            </table>

                            <div style="background: #f0f7ff; padding: 15px; border-left: 3px solid #FF7300; margin: 20px 0;">
                                <p style="margin: 0 0 8px 0; color: #FF7300; font-weight: bold; font-size: 14px;">AI Match Score: ${matchScore}%</p>
                                <p style="margin: 0; color: #333; font-size: 13px;">${matchDetails}</p>
                            </div>

                            <div style="margin-top: 25px; text-align: center;">
                                <a href="http://localhost:8080/admin" style="display: inline-block; background: #FF7300; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">Review Application</a>
                            </div>
                        </td>
                    </tr>
                    <tr style="background: #f5f5f5; border-top: 1px solid #e0e0e0;">
                        <td style="padding: 15px 20px; text-align: center; color: #666; font-size: 12px;">
                            SolidHands Engineering & Industrial Services Limited
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

function createApplicationEmailText(fullName, email, phone, location, jobTitle, matchScore, matchDetails) {
    return `New Job Application for: ${jobTitle}

APPLICANT INFORMATION:
Name: ${fullName}
Email: ${email}
Phone: ${phone || 'N/A'}
Location: ${location || 'N/A'}

AI MATCH SCORE: ${matchScore}%
${matchDetails}

Review the application in your admin panel at http://localhost:8080/admin

---
This is an automated notification from SolidHands Engineering & Industrial Services Limited
    `;
}

function createContractorEmailHtml(companyName, email, phone, specialty, experience, certificateUrl, proposalUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border: 1px solid #e0e0e0;">
                    <tr style="background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 20px; border-left: 4px solid #FF7300;">
                            <h2 style="margin: 0; color: #333; font-size: 18px;">New Contractor Application</h2>
                            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Specialty: ${specialty}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px;">
                            <h3 style="margin: 0 0 15px 0; color: #FF7300; font-size: 14px; text-transform: uppercase;">Contractor Details</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Company:</td>
                                    <td style="padding: 8px 0;">${companyName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                                    <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #FF7300; text-decoration: none;">${email}</a></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                                    <td style="padding: 8px 0;">${phone}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Experience:</td>
                                    <td style="padding: 8px 0;">${experience} years</td>
                                </tr>
                            </table>

                            ${certificateUrl || proposalUrl ? `
                            <div style="background: #f0f7ff; padding: 15px; border-left: 3px solid #FF7300; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: #FF7300; font-weight: bold; font-size: 14px;">Submitted Documents</p>
                                ${certificateUrl ? `<p style="margin: 5px 0;"><a href="http://localhost:8080${certificateUrl}" style="color: #FF7300; text-decoration: none;">View Certificate</a></p>` : ''}
                                ${proposalUrl ? `<p style="margin: 5px 0;"><a href="http://localhost:8080${proposalUrl}" style="color: #FF7300; text-decoration: none;">View Proposal</a></p>` : ''}
                            </div>
                            ` : ''}

                            <div style="margin-top: 25px; text-align: center;">
                                <a href="http://localhost:8080/admin" style="display: inline-block; background: #FF7300; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">Review Application</a>
                            </div>
                        </td>
                    </tr>
                    <tr style="background: #f5f5f5; border-top: 1px solid #e0e0e0;">
                        <td style="padding: 15px 20px; text-align: center; color: #666; font-size: 12px;">
                            SolidHands Engineering & Industrial Services Limited
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

function createContractorEmailText(companyName, email, phone, specialty, experience, certificateUrl, proposalUrl) {
    return `New Contractor Application

CONTRACTOR DETAILS:
Company: ${companyName}
Email: ${email}
Phone: ${phone}
Specialty: ${specialty}
Experience: ${experience} years

${certificateUrl || proposalUrl ? `DOCUMENTS:\n${certificateUrl ? `Certificate: http://localhost:8080${certificateUrl}\n` : ''}${proposalUrl ? `Proposal: http://localhost:8080${proposalUrl}\n` : ''}` : ''}

Review the application in your admin panel at http://localhost:8080/admin

---
This is an automated notification from SolidHands Engineering & Industrial Services Limited
    `;
}

const app = express();
const PORT = process.env.PORT || 8080;

// Security and request middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(cors({ origin: CORS_ORIGIN, optionsSuccessStatus: 200 }));
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts, please try again later.'
});

app.use('/api/', apiLimiter);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('[System] Created uploads directory');
}

const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp'
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'photos') {
            return ALLOWED_IMAGE_TYPES.includes(file.mimetype)
                ? cb(null, true)
                : cb(new Error('Unsupported photo format. Accepted formats: JPG, PNG, WEBP.'));
        }

        return ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error('Unsupported document format. Accepted formats: PDF, DOC, DOCX.'));
    }
});

function adminAuth(req, res, next) {
    if (req.path === '/login') return next();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized access' });

    jwt.verify(token, ADMIN_JWT_SECRET, (err) => {
        if (err) return res.status(401).json({ error: 'Invalid or expired token' });
        next();
    });
}

// Database Mock (In-memory for speed, could use lowdb for persistence)
const db = {
    applications: [],
    candidates: [],
    contractors: [],
    jobs: [],  // Now empty, admin will add jobs
    notifications: []  // Admin notifications
};

// Database path
const DB_PATH = path.join(__dirname, 'db.json');

// Auto-match new jobs against pending candidate submissions
async function autoMatchPendingCandidates(newJob) {
    if (!db.candidates || db.candidates.length === 0) return;

    const matchedCandidates = [];

    for (const candidate of db.candidates) {
        candidate.matchedJobs = candidate.matchedJobs || [];
        if (candidate.matchedJobs.includes(newJob.id)) continue;

        try {
            const matchResult = await matchingEngine.matchCV(candidate.cvText, newJob.requirements);
            const application = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                fullName: candidate.fullName,
                email: candidate.email,
                phone: candidate.phone,
                location: candidate.location,
                jobId: newJob.id,
                jobTitle: newJob.title,
                cvUrl: candidate.cvUrl,
                matchScore: matchResult.score,
                matchDetails: matchResult.summary,
                matchKeywords: matchResult.matches,
                source: 'auto-match',
                date: new Date().toISOString()
            };

            db.applications.push(application);
            candidate.matchedJobs.push(newJob.id);
            matchedCandidates.push({ candidate, application, matchResult });

            db.notifications.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                type: 'application',
                message: `Auto-matched ${candidate.fullName} to ${newJob.title} (Score: ${matchResult.score}%)`,
                details: { applicationId: application.id, jobId: newJob.id, email: candidate.email, source: 'auto-match' },
                date: new Date().toISOString(),
                read: false
            });
        } catch (error) {
            console.error('[Auto-match Error] Failed to match candidate', candidate.email, 'to job', newJob.title, error.message);
        }
    }

    if (matchedCandidates.length > 0) {
        saveDb();
    }
}

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
app.post(
    '/api/apply',
    upload.single('cv'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    async (req, res) => {
        console.log(`[Incoming] Application request received at ${new Date().toISOString()}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { fullName, email, phone, location, expertise, jobId } = req.body;
            console.log(`[Data] Applicant: ${fullName}, Job ID: ${jobId || 'general'}, Email: ${email}`);
            const cvPath = req.file ? req.file.path : null;
            const mimeType = req.file ? req.file.mimetype : null;
            console.log(`[Storage] CV stored at: ${cvPath}`);

            if (!cvPath) return res.status(400).json({ error: 'CV file is required' });

            const isGeneralSubmission = !jobId || jobId === '0' || jobId === 'general';
            const cvUrl = `/uploads/${path.basename(cvPath)}`;
            const cvText = await matchingEngine.extractText(cvPath, mimeType);

            if (isGeneralSubmission) {
                const candidate = {
                    id: Date.now(),
                    fullName,
                    email,
                    phone,
                    location,
                    expertise: expertise || '',
                    cvUrl,
                    cvText,
                    matchedJobs: [],
                    date: new Date().toISOString()
                };

                db.candidates.push(candidate);
                saveDb();

                const notification = {
                    id: Date.now(),
                    type: 'candidate',
                    message: `New general candidate submission from ${fullName}`,
                    details: { candidateId: candidate.id, email: email },
                    date: new Date().toISOString(),
                    read: false
                };
                db.notifications.push(notification);
                saveDb();

                return res.json({ success: true, message: 'Your profile has been saved. We will match you automatically when a new vacancy is posted.' });
            }

            const job = db.jobs.find(j => j.id == jobId);
            if (!job) return res.status(400).json({ error: 'Invalid job ID' });

            const matchResult = await matchingEngine.matchCV(cvText, job.requirements);

        const application = {
            id: Date.now(),
            fullName,
            email,
            phone,
            location,
            jobId: parseInt(jobId),
            jobTitle: job.title,
            cvUrl,
            matchScore: matchResult.score,
            matchDetails: matchResult.summary,
            matchKeywords: matchResult.matches,
            date: new Date().toISOString()
        };

        db.applications.push(application);
        saveDb();

        // Add notification for admin
        const notification = {
            id: Date.now(),
            type: 'application',
            message: `New application from ${fullName} for ${job.title} (Match: ${matchResult.score}%)`,
            details: { applicationId: application.id, jobId: jobId, email: email },
            date: new Date().toISOString(),
            read: false
        };
        db.notifications.push(notification);
        saveDb();

        // Send email notification to admin
        try {
            await transporter.sendMail({
                from: `"SolidHands Recruitment" <${emailUser}>`,
                to: COMPANY_EMAIL,
                subject: `New Application: ${job.title} - ${fullName}`,
                html: createApplicationEmailHtml(fullName, email, phone, location, job.title, matchResult.score, matchResult.summary),
                text: createApplicationEmailText(fullName, email, phone, location, job.title, matchResult.score, matchResult.summary),
                headers: {
                    'X-Mailer': 'SolidHands Recruitment System',
                    'X-Priority': '3'
                }
            });
            console.log(`[Email] Notification sent to admin for application from ${fullName}`);
        } catch (emailError) {
            console.error('[Email Error] Failed to send admin notification:', emailError.message);
        }
        
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
app.post(
    '/api/contractors',
    upload.fields([
        { name: 'certificate', maxCount: 1 },
        { name: 'proposal', maxCount: 1 }
    ]),
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('specialty').trim().notEmpty().withMessage('Specialty is required'),
    body('experience').trim().notEmpty().withMessage('Experience summary is required'),
    async (req, res) => {
        console.log(`[Incoming] Contractor application received at ${new Date().toISOString()}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyName, email, phone, specialty, experience } = req.body;
        console.log(`[Data] Company: ${companyName}, Specialty: ${specialty}`);

        const certificatePath = req.files.certificate ? req.files.certificate[0].path : null;
        const proposalPath = req.files.proposal ? req.files.proposal[0].path : null;

        const contractor = {
            id: Date.now(),
            companyName,
            email,
            phone,
            specialty,
            experience,
            certificateUrl: certificatePath ? `/uploads/${path.basename(certificatePath)}` : null,
            proposalUrl: proposalPath ? `/uploads/${path.basename(proposalPath)}` : null,
            date: new Date().toISOString()
        };

    db.contractors.push(contractor);
    saveDb();

    // Add notification for admin
    const notification = {
        id: Date.now(),
        type: 'contractor',
        message: `New contractor application from ${companyName} (${specialty})`,
        details: { contractorId: contractor.id, email: email },
        date: new Date().toISOString(),
        read: false
    };
    db.notifications.push(notification);
    saveDb();

    // Send email notification to admin
    try {
        await transporter.sendMail({
            from: `"SolidHands Recruitment" <${emailUser}>`,
            to: COMPANY_EMAIL,
            subject: `New Contractor: ${companyName} (${specialty})`,
            html: createContractorEmailHtml(companyName, email, phone, specialty, experience, contractor.certificateUrl, contractor.proposalUrl),
            text: createContractorEmailText(companyName, email, phone, specialty, experience, contractor.certificateUrl, contractor.proposalUrl),
            headers: {
                'X-Mailer': 'SolidHands Recruitment System',
                'X-Priority': '3'
            }
        });
        console.log(`[Email] Notification sent to admin for contractor application from ${companyName}`);
    } catch (emailError) {
        console.error('[Email Error] Failed to send admin notification:', emailError.message);
    }

    res.json({ success: true });
});

// Admin Login
app.post(
    '/api/admin/login',
    loginLimiter,
    body('password').trim().notEmpty().withMessage('Password is required'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { password } = req.body;
        if (password === ADMIN_PASSWORD) {
            const token = jwt.sign({ role: 'admin' }, ADMIN_JWT_SECRET, {
                expiresIn: ADMIN_TOKEN_EXPIRY
            });
            return res.json({ success: true, token });
        }

        res.status(401).json({ error: 'Incorrect password' });
    }
);

app.use('/api/admin', adminAuth);

// Admin Data
app.get('/api/admin/data', (req, res) => {
    res.json({
        applications: db.applications,
        candidates: db.candidates,
        contractors: db.contractors,
        jobs: db.jobs,
        notifications: db.notifications
    });
});

// Convert pending candidate to job application
app.post(
    '/api/admin/candidates/:id/convert',
    body('jobId').notEmpty().withMessage('Job selection is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const id = parseInt(req.params.id);
        const { jobId } = req.body;

        const candidate = db.candidates.find(c => c.id === id);
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

        const job = db.jobs.find(j => j.id == jobId);
        if (!job) return res.status(400).json({ error: 'Invalid job selected' });

    try {
        const matchResult = await matchingEngine.matchCV(candidate.cvText, job.requirements);
        const application = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            fullName: candidate.fullName,
            email: candidate.email,
            phone: candidate.phone,
            location: candidate.location,
            jobId: job.id,
            jobTitle: job.title,
            cvUrl: candidate.cvUrl,
            matchScore: matchResult.score,
            matchDetails: matchResult.summary,
            matchKeywords: matchResult.matches,
            source: 'manual-conversion',
            date: new Date().toISOString()
        };

        db.applications.push(application);
        candidate.matchedJobs = candidate.matchedJobs || [];
        if (!candidate.matchedJobs.includes(job.id)) {
            candidate.matchedJobs.push(job.id);
        }

        db.notifications.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: 'application',
            message: `Candidate ${candidate.fullName} was converted to an application for ${job.title}`,
            details: { applicationId: application.id, jobId: job.id, email: candidate.email, source: 'manual-conversion' },
            date: new Date().toISOString(),
            read: false
        });

        saveDb();
        res.json({ success: true, application });
    } catch (error) {
        console.error('[Convert Candidate Error]', error);
        res.status(500).json({ error: 'Failed to convert candidate to application' });
    }
});

// Delete pending candidate submission
app.delete('/api/admin/candidates/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const initialLength = db.candidates.length;
    db.candidates = db.candidates.filter(candidate => candidate.id !== id);

    if (db.candidates.length === initialLength) {
        return res.status(404).json({ error: 'Candidate not found' });
    }

    saveDb();
    res.json({ success: true });
});

// Add Job
app.post(
    '/api/admin/jobs',
    upload.array('photos', 10),
    body('title').trim().notEmpty().withMessage('Job title is required'),
    body('requirements').trim().notEmpty().withMessage('Job requirements are required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, requirements, description } = req.body;
        const photoUrls = req.files ? req.files.map(file => `/uploads/${path.basename(file.path)}`) : [];

        const newJob = {
            id: Date.now(),
            title,
            requirements: requirements.split('\n').filter(req => req.trim()),
            description: description || '',
            photos: photoUrls,
            datePosted: new Date().toISOString()
        };

        db.jobs.push(newJob);
        await autoMatchPendingCandidates(newJob);
        saveDb();
        res.json({ success: true, job: newJob });
    }
);

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

// Mark notification as read
app.put('/api/admin/notifications/:id/read', (req, res) => {
    const id = parseInt(req.params.id);
    const notification = db.notifications.find(n => n.id === id);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    
    notification.read = true;
    saveDb();
    res.json({ success: true });
});

// Bulk email
app.post(
    '/api/admin/bulk-email',
    body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    body('subject').trim().notEmpty().withMessage('Email subject is required'),
    body('message').trim().notEmpty().withMessage('Email message is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { recipients, subject, message } = req.body;
        if (!emailUser || !emailPass || emailPass === 'your-app-password-here') {
            return res.status(500).json({ error: 'Email service is not configured. Please set valid EMAIL_USER and EMAIL_PASS in .env.' });
        }

        console.log(`[Bulk Email] Sending to ${recipients.length} recipients: ${subject}`);

        let sentCount = 0;
        const sendErrors = [];

        for (const email of recipients) {
            try {
                const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border: 1px solid #e0e0e0;">
                    <tr style="background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 20px; border-left: 4px solid #FF7300;">
                            <h2 style="margin: 0; color: #333; font-size: 18px;">SolidHands Engineering</h2>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px;">
                            <div style="color: #333; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">
${message}
                            </div>
                        </td>
                    </tr>
                    <tr style="background: #f5f5f5; border-top: 1px solid #e0e0e0;">
                        <td style="padding: 15px 20px; text-align: center; color: #666; font-size: 12px;">
                            SolidHands Engineering & Industrial Services Limited
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `;

                await transporter.sendMail({
                    from: `"SolidHands Engineering" <${emailUser}>`,
                    to: email,
                    subject: subject,
                    html: emailHtml,
                    text: message,
                    headers: {
                        'X-Mailer': 'SolidHands Recruitment System',
                        'X-Priority': '3'
                    }
                });
                sentCount++;
                console.log(`[Email] Sent to: ${email}`);
            } catch (emailError) {
                console.error(`[Email Error] Failed to send to ${email}:`, emailError.message);
                sendErrors.push({ recipient: email, error: emailError.message });
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (sendErrors.length > 0) {
            console.log(`[Bulk Email] Completed with ${sentCount} sent, ${sendErrors.length} errors`);
            return res.status(207).json({
                success: sentCount > 0,
                sent: sentCount,
                errors: sendErrors
            });
        }

        console.log(`[Bulk Email] Successfully sent to all ${sentCount} recipients`);
        res.json({ success: true, sent: sentCount });
    }
);

// Global error handler for uploads and validation
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }

    if (err && err.message && err.message.includes('Unsupported')) {
        return res.status(400).json({ error: err.message });
    }

    console.error('[Server Error]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
