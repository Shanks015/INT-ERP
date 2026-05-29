import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const createEmployeeAuto = async () => {
    try {
        console.log('\n💼 Creating Pre-Approved Employee User (Auto)\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const name = 'DSU Employee';
        const email = 'employee@dsu.edu.in';
        const password = 'employee123';

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('ℹ️ User already exists. Re-approving to ensure active status...');
            existingUser.approved = true;
            existingUser.approvalStatus = 'approved';
            existingUser.role = 'employee';
            await existingUser.save();
        } else {
            // Create employee user
            const employee = new User({
                name,
                email,
                password,
                role: 'employee',
                approved: true,
                approvalStatus: 'approved'
            });
            await employee.save();
        }

        console.log('✅ Employee user is ready!');
        console.log('\n📝 Employee Credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role: employee`);
        console.log(`   Status: Approved (Active)`);
        console.log('\n✨ You can now login immediately with these credentials\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating employee:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

createEmployeeAuto();
