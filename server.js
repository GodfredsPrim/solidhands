const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const matchingEngine = require('./matching-engine');

// Load environment variables
require('dotenv').config();

// Company Configuration
const COMPANY_EMAIL = 'erskinegodswillekow@gmail.com';

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
transporter.verify((error, success) => {
    if (error) {
        console.log('[Email] ❌ Email sending DISABLED - Invalid credentials');
        console.log('[Email] 📧 To enable: Set EMAIL_USER and EMAIL_PASS in .env file');
        console.log('[Email] 🔗 Gmail App Password: https://support.google.com/accounts/answer/185833');
    } else {
        console.log('[Email] ✅ Email server ready - notifications and bulk email enabled');
    }
});

const app = express();
const PORT = process.env.PORT || 8080;

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
    jobs: [],  // Now empty, admin will add jobs
    notifications: []  // Admin notifications
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
        const { fullName, email, phone, location, jobId } = req.body;
        console.log(`[Data] Applicant: ${fullName}, Job ID: ${jobId}, Email: ${email}`);
        const cvPath = req.file ? req.file.path : null;
        const mimeType = req.file ? req.file.mimetype : null;
        console.log(`[Storage] CV stored at: ${cvPath}`);

        if (!cvPath) return res.status(400).json({ error: "CV file is required" });

        // Find the job to get requirements
        const job = db.jobs.find(j => j.id == jobId);
        if (!job) return res.status(400).json({ error: "Invalid job ID" });

        // Extract and Match
        const cvText = await matchingEngine.extractText(cvPath, mimeType);
        const matchResult = await matchingEngine.matchCV(cvText, job.requirements);

        const application = {
            id: Date.now(),
            fullName,
            email,
            phone,
            location,
            jobId: parseInt(jobId),
            jobTitle: job.title,
            cvUrl: `/uploads/${path.basename(cvPath)}`,
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
                from: `"SolidHands System" <${process.env.EMAIL_USER || 'erskinegodswillekow@gmail.com'}>`,
                to: COMPANY_EMAIL,
                subject: `New Job Application: ${job.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #FF7300, #FF4500); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">New Job Application</h1>
                        </div>
                        <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-top: 0;">${job.title}</h2>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #FF7300;">Applicant Details</h3>
                                <p><strong>Name:</strong> ${fullName}</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Phone:</strong> ${phone}</p>
                                <p><strong>Location:</strong> ${location}</p>
                                <p><strong>Match Score:</strong> <span style="color: ${matchResult.score >= 70 ? '#4CAF50' : matchResult.score >= 40 ? '#FF9800' : '#F44336'}; font-weight: bold;">${matchResult.score}%</span></p>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="http://localhost:8080/admin" style="background: #FF7300; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Admin Panel</a>
                            </div>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                            <div style="text-align: center; color: #666; font-size: 12px;">
                                <p>This is an automated notification from SolidHands Engineering</p>
                            </div>
                        </div>
                    </div>
                `
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
app.post('/api/contractors', upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'proposal', maxCount: 1 }
]), async (req, res) => {
    console.log(`[Incoming] Contractor application received at ${new Date().toISOString()}`);
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
            from: `"SolidHands System" <${process.env.EMAIL_USER || 'erskinegodswillekow@gmail.com'}>`,
            to: COMPANY_EMAIL,
            subject: `New Contractor Application: ${companyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #FF7300, #FF4500); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">New Contractor Application</h1>
                    </div>
                    <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #FF7300;">Contractor Details</h3>
                            <p><strong>Company:</strong> ${companyName}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Phone:</strong> ${phone}</p>
                            <p><strong>Specialty:</strong> ${specialty}</p>
                            <p><strong>Experience:</strong> ${experience}</p>
                            ${certificatePath ? `<p><strong>Certificate:</strong> <a href="http://localhost:8080${contractor.certificateUrl}">View Certificate</a></p>` : ''}
                            ${proposalPath ? `<p><strong>Proposal:</strong> <a href="http://localhost:8080${contractor.proposalUrl}">View Proposal</a></p>` : ''}
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:8080/admin" style="background: #FF7300; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Admin Panel</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <div style="text-align: center; color: #666; font-size: 12px;">
                            <p>This is an automated notification from SolidHands Engineering</p>
                        </div>
                    </div>
                </div>
            `
        });
        console.log(`[Email] Notification sent to admin for contractor application from ${companyName}`);
    } catch (emailError) {
        console.error('[Email Error] Failed to send admin notification:', emailError.message);
    }

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
        jobs: db.jobs,
        notifications: db.notifications
    });
});

// Add Job
app.post('/api/admin/jobs', upload.array('photos', 10), (req, res) => {
    const { title, requirements, description } = req.body;
    if (!title || !requirements) return res.status(400).json({ error: "Title and Requirements required" });

    const photoUrls = req.files ? req.files.map(file => `/uploads/${path.basename(file.path)}`) : [];

    const newJob = {
        id: Date.now(),
        title,
        requirements: requirements.split('\n').filter(req => req.trim()), // Split by lines
        description: description || '',
        photos: photoUrls,
        datePosted: new Date().toISOString()
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
app.post('/api/admin/bulk-email', async (req, res) => {
    const { recipients, subject, message } = req.body;
    if (!recipients || !subject || !message) return res.status(400).json({ error: "Recipients, subject, and message required" });

    if (!emailUser || !emailPass || emailPass === 'your-app-password-here') {
        return res.status(500).json({ error: 'Email service is not configured. Please set valid EMAIL_USER and EMAIL_PASS in .env.' });
    }

    console.log(`[Bulk Email] Sending to ${recipients.length} recipients: ${subject}`);

    let sentCount = 0;
    const errors = [];

    for (const email of recipients) {
        try {
            await transporter.sendMail({
                from: `"SolidHands Engineering" <${emailUser}>`,
                to: email,
                subject: subject,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #FF7300, #FF4500); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px;">SolidHands Engineering</h1>
                        </div>
                        <div style="padding: 30px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <div style="color: #333; line-height: 1.6;">
                                ${message.replace(/\n/g, '<br>')}
                            </div>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                            <div style="text-align: center; color: #666; font-size: 12px;">
                                <p>This email was sent by SolidHands Engineering & Industrial Services Limited</p>
                            </div>
                        </div>
                    </div>
                `,
                text: message
            });
            sentCount++;
            console.log(`[Email] Sent to: ${email}`);
        } catch (emailError) {
            console.error(`[Email Error] Failed to send to ${email}:`, emailError.message);
            errors.push({ recipient: email, error: emailError.message });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (errors.length > 0) {
        console.log(`[Bulk Email] Completed with ${sentCount} sent, ${errors.length} errors`);
        return res.status(207).json({
            success: sentCount > 0,
            sent: sentCount,
            errors
        });
    }

    console.log(`[Bulk Email] Successfully sent to all ${sentCount} recipients`);
    res.json({ success: true, sent: sentCount });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
