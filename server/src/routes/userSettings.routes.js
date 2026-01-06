import express from 'express';
import { auth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { logActivity } from '../middleware/activityLogger.js';
import {
    getCurrentUser,
    updateProfile,
    changePassword,
    updatePreferences,
    updateNotificationSettings,
    uploadProfilePhoto,
    deleteProfilePhoto
} from '../controllers/userSettings.controller.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get current user with full settings
router.get('/me', getCurrentUser);

// Update profile (name, email)
router.put('/me', logActivity('update', 'settings'), updateProfile);

// Change password
router.put('/me/password', logActivity('update', 'settings'), changePassword);

// Update preferences (theme, date format, etc.)
router.put('/me/preferences', logActivity('update', 'settings'), updatePreferences);

// Update notification settings
router.put('/me/notifications', logActivity('update', 'settings'), updateNotificationSettings);

// Upload profile photo
router.post('/me/photo', upload.single('photo'), logActivity('update', 'settings'), uploadProfilePhoto);

// Delete profile photo
router.delete('/me/photo', logActivity('delete', 'settings'), deleteProfilePhoto);

export default router;
