import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current user with full settings
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data'
        });
    }
};

// Update user profile (name, email)
export const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;

        // Check if email is already taken by another user
        if (email && email !== req.user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, email },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
};

// Change password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters'
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password and lastPasswordChange
        user.password = newPassword;
        user.lastPasswordChange = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password'
        });
    }
};

// Update preferences (theme only). Date/time/language pickers were removed:
// dates across the ERP are dd/MMM/yyyy by policy (see client dateFormat utils),
// so the only per-account preference surfaced is the theme. Mongoose
// runValidators below rejects any theme outside the schema enum.
export const updatePreferences = async (req, res) => {
    try {
        const { theme } = req.body;

        if (!theme) {
            return res.status(400).json({
                success: false,
                message: 'Theme is required'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { 'preferences.theme': theme } },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: user.preferences
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating preferences'
        });
    }
};

// Update in-app notification settings. The client sends only the `inApp` block
// (master toggle + the four event toggles). We MERGE it onto the current doc
// instead of $set-replacing the whole notificationSettings object, so the
// legacy `email` block (still present on existing docs) is never wiped and a
// partial PUT can't silently turn off events the user didn't mention.
const IN_APP_EVENTS = ['reply', 'approval', 'decision', 'status'];

export const updateNotificationSettings = async (req, res) => {
    try {
        // Accept both a bare `{ inApp }` (current client) and the legacy
        // `{ notificationSettings: { inApp } }` wrapper.
        const incoming = req.body?.inApp ?? req.body?.notificationSettings?.inApp;
        if (!incoming) {
            return res.status(400).json({
                success: false,
                message: 'inApp notification settings are required'
            });
        }

        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const current = user.notificationSettings?.inApp ?? {};
        const currentEvents = current.events ?? {};

        const events = {};
        for (const key of IN_APP_EVENTS) {
            const val = incoming.events?.[key];
            events[key] = typeof val === 'boolean' ? val : (currentEvents[key] ?? true);
        }

        user.notificationSettings = {
            email: user.notificationSettings?.email ?? {},
            inApp: {
                enabled: typeof incoming.enabled === 'boolean'
                    ? incoming.enabled
                    : (current.enabled ?? true),
                events
            }
        };
        await user.save();

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            data: user.notificationSettings
        });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notification settings'
        });
    }
};

// Upload profile photo
export const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Delete old profile photo if exists
        const user = await User.findById(req.user._id);
        if (user.profilePhoto) {
            const oldPhotoPath = path.join(__dirname, '../../', user.profilePhoto);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Save new photo path
        const photoUrl = `/uploads/profiles/${req.file.filename}`;
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profilePhoto: photoUrl },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile photo uploaded successfully',
            photoUrl,
            data: updatedUser
        });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading profile photo'
        });
    }
};

// Delete profile photo
export const deleteProfilePhoto = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user.profilePhoto) {
            const photoPath = path.join(__dirname, '../../', user.profilePhoto);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }

            user.profilePhoto = null;
            await user.save();
        }

        res.json({
            success: true,
            message: 'Profile photo deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting profile photo'
        });
    }
};
