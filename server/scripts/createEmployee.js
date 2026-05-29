import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';
import User from '../src/models/User.js';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createEmployee = async () => {
    try {
        console.log('\n💼 Creating Pre-Approved Employee User for International Affairs ERP\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get details
        const name = await question('Enter employee name: ');
        const email = await question('Enter employee email: ');
        const password = await question('Enter employee password: ');

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('\n❌ User with this email already exists!');
            rl.close();
            await mongoose.disconnect();
            process.exit(1);
        }

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

        console.log('\n✅ Employee user created successfully!');
        console.log('\n📝 Employee Details:');
        console.log(`   Name: ${employee.name}`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Role: ${employee.role}`);
        console.log(`   Status: Pre-Approved (Active)`);
        console.log('\n✨ You can now login with these credentials\n');

        rl.close();
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating employee:', error.message);
        rl.close();
        await mongoose.disconnect();
        process.exit(1);
    }
};

createEmployee();
