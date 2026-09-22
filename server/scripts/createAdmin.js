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

const createAdmin = async () => {
    try {
        console.log('\n🔧 Creating Admin User for International Affairs ERP\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get admin details
        const name = await question('Enter admin name: ');
        const email = await question('Enter admin email: ');
        const password = await question('Enter admin password: ');

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('\n❌ User with this email already exists!');
            rl.close();
            await mongoose.disconnect();
            process.exit(1);
        }

        // Create admin user. approved/approvalStatus must be set explicitly: the
        // model defaults them to the pending-registration state, and login rejects
        // any account that is not approved — so without this the account this
        // script exists to bootstrap cannot sign in.
        const admin = new User({
            name,
            email,
            password,
            role: 'admin',
            approved: true,
            approvalStatus: 'approved'
        });

        await admin.save();

        console.log('\n✅ Admin user created successfully!');
        console.log('\n📝 Admin Details:');
        console.log(`   Name: ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log('\n✨ You can now login with these credentials\n');

        rl.close();
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating admin:', error.message);
        rl.close();
        await mongoose.disconnect();
        process.exit(1);
    }
};

createAdmin();
