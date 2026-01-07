import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import models
const Partner = (await import('../src/models/Partner.js')).default;
const Membership = (await import('../src/models/Membership.js')).default;
const ScholarInResidence = (await import('../src/models/ScholarInResidence.js')).default;
const StudentExchange = (await import('../src/models/StudentExchange.js')).default;
const ImmersionProgram = (await import('../src/models/ImmersionProgram.js')).default;

const updateExpiredRecords = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const currentDate = new Date();
        let totalUpdated = 0;

        // Update Partners with expired expiringDate
        console.log('📦 Checking Partners...');
        const expiredPartners = await Partner.updateMany(
            {
                expiringDate: { $lt: currentDate },
                recordStatus: { $ne: 'expired' }
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`   ✅ Updated ${expiredPartners.modifiedCount} expired partners`);
        totalUpdated += expiredPartners.modifiedCount;

        // Update active Partners
        const activePartners = await Partner.updateMany(
            {
                $or: [
                    { expiringDate: { $gte: currentDate } },
                    { expiringDate: null }
                ],
                recordStatus: 'expired'
            },
            { $set: { recordStatus: 'active' } }
        );
        console.log(`   ✅ Updated ${activePartners.modifiedCount} active partners\n`);
        totalUpdated += activePartners.modifiedCount;

        // Update Memberships with expired endDate
        console.log('🎫 Checking Memberships...');
        const expiredMemberships = await Membership.updateMany(
            {
                endDate: { $lt: currentDate },
                recordStatus: { $ne: 'expired' }
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`   ✅ Updated ${expiredMemberships.modifiedCount} expired memberships`);
        totalUpdated += expiredMemberships.modifiedCount;

        const activeMemberships = await Membership.updateMany(
            {
                $or: [
                    { endDate: { $gte: currentDate } },
                    { endDate: null }
                ],
                recordStatus: 'expired'
            },
            { $set: { recordStatus: 'active' } }
        );
        console.log(`   ✅ Updated ${activeMemberships.modifiedCount} active memberships\n`);
        totalUpdated += activeMemberships.modifiedCount;

        // Update Scholars with expired toDate
        console.log('🎓 Checking Scholars in Residence...');
        const expiredScholars = await ScholarInResidence.updateMany(
            {
                toDate: { $lt: currentDate },
                recordStatus: { $ne: 'expired' }
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`   ✅ Updated ${expiredScholars.modifiedCount} expired scholars`);
        totalUpdated += expiredScholars.modifiedCount;

        const activeScholars = await ScholarInResidence.updateMany(
            {
                $or: [
                    { toDate: { $gte: currentDate } },
                    { toDate: null }
                ],
                recordStatus: 'expired'
            },
            { $set: { recordStatus: 'active' } }
        );
        console.log(`   ✅ Updated ${activeScholars.modifiedCount} active scholars\n`);
        totalUpdated += activeScholars.modifiedCount;

        // Update Student Exchange with expired toDate
        console.log('🔄 Checking Student Exchange...');
        const expiredExchanges = await StudentExchange.updateMany(
            {
                toDate: { $lt: currentDate },
                recordStatus: { $ne: 'expired' }
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`   ✅ Updated ${expiredExchanges.modifiedCount} expired exchanges`);
        totalUpdated += expiredExchanges.modifiedCount;

        const activeExchanges = await StudentExchange.updateMany(
            {
                $or: [
                    { toDate: { $gte: currentDate } },
                    { toDate: null }
                ],
                recordStatus: 'expired'
            },
            { $set: { recordStatus: 'active' } }
        );
        console.log(`   ✅ Updated ${activeExchanges.modifiedCount} active exchanges\n`);
        totalUpdated += activeExchanges.modifiedCount;

        // Update Immersion Programs with expired departureDate
        console.log('✈️  Checking Immersion Programs...');
        const expiredPrograms = await ImmersionProgram.updateMany(
            {
                departureDate: { $lt: currentDate },
                recordStatus: { $ne: 'expired' }
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`   ✅ Updated ${expiredPrograms.modifiedCount} expired programs`);
        totalUpdated += expiredPrograms.modifiedCount;

        const activePrograms = await ImmersionProgram.updateMany(
            {
                $or: [
                    { departureDate: { $gte: currentDate } },
                    { departureDate: null }
                ],
                recordStatus: 'expired'
            },
            { $set: { recordStatus: 'active' } }
        );
        console.log(`   ✅ Updated ${activePrograms.modifiedCount} active programs\n`);
        totalUpdated += activePrograms.modifiedCount;

        console.log('═══════════════════════════════════════');
        console.log(`🎉 Migration Complete!`);
        console.log(`📊 Total records updated: ${totalUpdated}`);
        console.log('═══════════════════════════════════════\n');

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error updating expired records:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run the migration
updateExpiredRecords();
