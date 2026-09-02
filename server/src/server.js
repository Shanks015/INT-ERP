import express from 'express'; // server restart trigger
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.routes.js';
import partnersRoutes from './routes/partners.routes.js';
import campusVisitsRoutes from './routes/campusVisits.routes.js';
import seminarsRoutes from './routes/seminars.routes.js';
import consultantVisitsRoutes from './routes/consultantVisits.routes.js';
import eventsRoutes from './routes/events.routes.js';
import mouSigningCeremoniesRoutes from './routes/mouSigningCeremonies.routes.js';
import conferencesRoutes from './routes/conferences.routes.js';
import scholarsInResidenceRoutes from './routes/scholarsInResidence.routes.js';
import mouUpdatesRoutes from './routes/mouUpdates.routes.js';
import immersionProgramsRoutes from './routes/immersionPrograms.routes.js';
import studentExchangeRoutes from './routes/studentExchange.routes.js';
import mastersAbroadRoutes from './routes/mastersAbroad.routes.js';
import membershipsRoutes from './routes/memberships.routes.js';
import digitalMediaRoutes from './routes/digitalMedia.routes.js';
import socialMediaRoutes from './routes/socialMedia.routes.js';
import outreachRoutes from './routes/outreach.routes.js';
import importRoutes from './routes/import.routes.js';
import meetingTrackersRoutes from './routes/meetingTrackers.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import usersRoutes from './routes/users.routes.js';
import activityLogsRoutes from './routes/activityLogs.routes.js';
import userSettingsRoutes from './routes/userSettings.routes.js';

import googleFormsRoutes from './routes/googleForms.routes.js';
import mailboxRoutes from './routes/mailbox.routes.js';
import outreachNewRoutes from './routes/outreachNew.routes.js';

// Import cron jobs
import { startImapSyncJob } from './jobs/imapReplySync.job.js';
import { startOutreachFollowUpJob } from './jobs/outreachFollowUp.job.js';
import { startKeepAliveJob } from './jobs/keepAlive.job.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Render (and most PaaS hosts) sit behind a reverse proxy — without this,
// req.ip is the proxy's IP and rate limiting applies to everyone at once.
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://int-erp.edgeone.app',
    'https://int-erp.onrender.com'
].filter(Boolean);

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? allowedOrigins
        : true, // Allow all origins in development
    credentials: true
}));

// Security headers. CSP is disabled: the server also serves the bundled React
// app and user-uploaded files, and the default policy breaks both. COEP is
// disabled so cross-origin images (e.g. profile photos) keep loading.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting — global ceiling for the API, plus a much stricter budget on
// the auth endpoints to blunt credential brute-forcing.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failed attempts against the budget
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Enable compression middleware for all responses
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add caching headers for API responses
// Disable caching for API responses to ensure real-time updates
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/campus-visits', campusVisitsRoutes);
app.use('/api/seminars', seminarsRoutes);
app.use('/api/consultant-visits', consultantVisitsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/mou-signing-ceremonies', mouSigningCeremoniesRoutes);
app.use('/api/conferences', conferencesRoutes);
app.use('/api/scholars-in-residence', scholarsInResidenceRoutes);
app.use('/api/mou-updates', mouUpdatesRoutes);
app.use('/api/immersion-programs', immersionProgramsRoutes);
app.use('/api/student-exchange', studentExchangeRoutes);
app.use('/api/masters-abroad', mastersAbroadRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/digital-media', digitalMediaRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/import', importRoutes);
app.use('/api/meeting-trackers', meetingTrackersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/google-forms', googleFormsRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/settings', userSettingsRoutes);
app.use('/api/mailboxes', mailboxRoutes);
app.use('/api/outreach-new', outreachNewRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientBuildPath));

    // Handle React routing - return index.html for all non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    try {
        fs.appendFileSync('error.log', `${new Date().toISOString()} - GLOBAL ERROR: ${err.stack}\n`);
    } catch (e) {
        console.error('Failed to write to error log', e);
    }
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Database connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');

        // Start cron jobs after DB is ready
        startImapSyncJob();
        startOutreachFollowUpJob();
        startKeepAliveJob();

        // Start server on all network interfaces
        const HOST = '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 Local: http://localhost:${PORT}/api`);
            try {
                fs.appendFileSync('error.log', `${new Date().toISOString()} - SERVER STARTED\n`);
            } catch (e) {
                console.error('Failed to write startup log', e);
            }
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

export default app;
