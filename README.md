# SolidHands Engineering & Industrial Services

A comprehensive recruitment platform for job applications and contractor management.

## Features

- Job posting and application management
- CV matching with AI-powered scoring
- Contractor application system
- Admin dashboard with notifications
- Bulk email system for communication

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure email settings (optional but recommended):
   - Copy `.env` file and update with your email credentials
   - For Gmail: Generate an App Password in your Google Account settings
   - Set `EMAIL_USER` and `EMAIL_PASS` in the `.env` file

3. Start the server:
   ```bash
   npm start
   ```

4. Access the application at `http://localhost:8080`

## Email Configuration

To enable email notifications and bulk emailing:

1. **For Gmail users:**
   - Enable 2-factor authentication on your Google account
   - Generate an App Password: https://support.google.com/accounts/answer/185833
   - Update `.env` file:
     ```
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASS=your-16-character-app-password
     ```

2. **For other email providers:**
   - Update the transporter configuration in `server.js`
   - Common alternatives: Outlook, Yahoo, custom SMTP

3. **Features that use email:**
   - Admin notifications for new applications/contractors
   - Bulk email campaigns to applicants and contractors

## Admin Access

- URL: `http://localhost:8080/admin`
- Password: `solidhands2026`
- Features: Job management, application review, notifications, bulk email

## API Endpoints

- `GET /api/jobs` - Get all job postings
- `POST /api/apply` - Submit job application
- `POST /api/contractors` - Submit contractor application
- `GET /api/admin/data` - Admin dashboard data
- `POST /api/admin/jobs` - Create new job posting
- `POST /api/admin/bulk-email` - Send bulk emails