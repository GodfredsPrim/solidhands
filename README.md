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

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set `EMAIL_USER`, `EMAIL_PASS`, `COMPANY_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, and `CORS_ORIGIN`
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
- Password: configured via `ADMIN_PASSWORD` in `.env`
- Features: Job management, application review, notifications, bulk email

## Deployment on Render

### Quick Deploy Steps:

1. **Create a Render account** at [render.com](https://render.com)

2. **Connect your GitHub repository**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select the repository

3. **Configure the service:**
   - Name: `solidhands` (or your preferred name)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: Free tier works for small deployments

4. **Set environment variables** in Render dashboard:
   - Go to "Environment" tab
   - Add these variables:
     ```
     NODE_ENV=production
     PORT=3000
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASS=your-gmail-app-password
     COMPANY_EMAIL=company-email@example.com
     ADMIN_PASSWORD=your-secure-password
     ADMIN_JWT_SECRET=your-secure-jwt-secret
     CORS_ORIGIN=https://your-render-url.onrender.com
     ```

5. **Add persistent storage** (optional but recommended):
   - Go to "Disks" tab
   - Create a disk:
     - Name: `uploads-data`
     - Mount Path: `/uploads`
     - Size: 1 GB

6. **Deploy:**
   - Click "Deploy" and wait for the build to complete
   - Your app will be live at `https://your-service-name.onrender.com`

### Important Notes:

- **Gmail App Password:** You must use an App Password (not your regular password). Get it from https://support.google.com/accounts/answer/185833
- **Render Free Tier:** Services spin down after 15 minutes of inactivity. For production, upgrade to a paid plan
- **CORS_ORIGIN:** Set this to your actual Render URL (shown after deployment)
- **Database:** The app uses a JSON file (db.json) stored on the persistent disk

## API Endpoints

- `GET /api/jobs` - Get all job postings
- `POST /api/apply` - Submit job application
- `POST /api/contractors` - Submit contractor application
- `GET /api/admin/data` - Admin dashboard data
- `POST /api/admin/jobs` - Create new job posting
- `POST /api/admin/bulk-email` - Send bulk emails