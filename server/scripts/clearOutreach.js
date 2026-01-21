import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Outreach from '../src/models/Outreach.js';

dotenv.config();

const clearOutreachData = async () => {
    try {
        console.log('\n🧹 Clearing Outreach Data...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Delete all documents in Outreach collection
        const result = await Outreach.deleteMany({});

        console.log(`\n✅ Successfully deleted ${result.deletedCount} records from Outreach collection.`);

        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error clearing data:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

clearOutreachData();
