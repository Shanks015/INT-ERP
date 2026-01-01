import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: 'admin@dsu.edu' });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');

            // Update to approved status
            existingAdmin.approved = true;
            existingAdmin.approvalStatus = 'approved';
            await existingAdmin.save();
            console.log('✅ Admin user updated to approved status');
        } else {
            // Create new admin
            const admin = new User({
                name: 'Admin',
                email: 'admin@dsu.edu',
                password: 'admin123',
                role: 'admin',
                approved: true,
                approvalStatus: 'approved'
            });

            await admin.save();
            console.log('✅ Admin user created successfully!');
        }

        console.log('\nAdmin Credentials:');
        console.log('Email: admin@dsu.edu');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createAdmin();
