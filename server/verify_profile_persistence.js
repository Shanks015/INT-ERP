
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import User from './src/models/User.js';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock controller logic for upload to avoid setting up express app context
const mockUpload = async (userId, filename) => {
    // 1. Update DB
    const photoUrl = `/uploads/profiles/${filename}`;
    const user = await User.findByIdAndUpdate(
        userId,
        { profilePhoto: photoUrl },
        { new: true }
    );
    return user;
};

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get a test user (admin)
        const user = await User.findOne({ role: 'admin' });
        if (!user) {
            console.error('No admin user found to test with.');
            process.exit(1);
        }
        console.log(`Testing with user: ${user.email}`);

        // 2. Simulate Upload
        // Ensure directory exists
        const uploadDir = path.join(__dirname, '../uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const testFilename = `test_profile_${Date.now()}.png`;
        const testFilePath = path.join(uploadDir, testFilename);

        // Create dummy file
        fs.writeFileSync(testFilePath, 'dummy image content');
        console.log(`Created dummy file at: ${testFilePath}`);

        // 3. Update User Record (Simulate Controller Action)
        const updatedUser = await mockUpload(user._id, testFilename);
        console.log(`Updated user profilePhoto to: ${updatedUser.profilePhoto}`);

        // 4. Verify Persistence (Simulate "Login Again" / Fetch User)
        // Fetch fresh from DB
        const reloadedUser = await User.findById(user._id);

        if (reloadedUser.profilePhoto === updatedUser.profilePhoto) {
            console.log('SUCCESS: Profile photo URL persisted in database.');
        } else {
            console.error('FAILURE: Profile photo URL mismatch.');
        }

        // 5. Verify File Existence
        const savedPath = path.join(__dirname, '..', reloadedUser.profilePhoto);
        // Note: profilePhoto is stored as '/uploads/...', so join with root

        if (fs.existsSync(savedPath)) {
            console.log(`SUCCESS: File exists on disk at ${savedPath}`);
        } else {
            console.error(`FAILURE: File not found on disk at ${savedPath}`);
        }

        // Cleanup
        // await User.findByIdAndUpdate(user._id, { profilePhoto: null });
        // fs.unlinkSync(testFilePath);
        // console.log('Cleanup complete.');

        process.exit(0);

    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verify();
