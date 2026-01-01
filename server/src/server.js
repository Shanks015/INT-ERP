import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes.js';
import partnersRoutes from './routes/partners.routes.js';
import campusVisitsRoutes from './routes/campusVisits.routes.js';
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
import importRoutes from './routes/import.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import usersRoutes from './routes/users.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://192.168.17.26:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/campus-visits', campusVisitsRoutes);
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
app.use('/api/import', importRoutes);
app.use('/api/reports', reportsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
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

        // Start server on all network interfaces
        const HOST = '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 Local: http://localhost:${PORT}/api`);
            console.log(`🌐 Network: http://192.168.17.26:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

export default app;
