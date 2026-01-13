import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Partner from './src/models/Partner.js';
import ScholarInResidence from './src/models/ScholarInResidence.js';
import StudentExchange from './src/models/StudentExchange.js';
import ImmersionProgram from './src/models/ImmersionProgram.js';
import Membership from './src/models/Membership.js';

dotenv.config();

const updateRecordStatuses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');

        const now = new Date();
        let totalUpdated = 0;

        // Update Partners (expiry based on MoU validity period)
        const partnersResult = await Partner.updateMany(
            {
                mouValidityPeriod: { $exists: true, $lt: now },
                recordStatus: 'active'
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`Partners: ${partnersResult.modifiedCount} records marked as expired`);
        totalUpdated += partnersResult.modifiedCount;

        // Update Scholars in Residence (expiry based on toDate)
        const scholarsResult = await ScholarInResidence.updateMany(
            {
                toDate: { $exists: true, $lt: now },
                recordStatus: 'active'
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`Scholars: ${scholarsResult.modifiedCount} records marked as expired`);
        totalUpdated += scholarsResult.modifiedCount;

        // Update Student Exchange (expiry based on toDate)
        const studentExchangeResult = await StudentExchange.updateMany(
            {
                toDate: { $exists: true, $lt: now },
                recordStatus: 'active'
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`Student Exchange: ${studentExchangeResult.modifiedCount} records marked as expired`);
        totalUpdated += studentExchangeResult.modifiedCount;

        // Update Immersion Programs (expiry based on departureDate)
        const immersionResult = await ImmersionProgram.updateMany(
            {
                departureDate: { $exists: true, $lt: now },
                recordStatus: 'active'
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`Immersion Programs: ${immersionResult.modifiedCount} records marked as expired`);
        totalUpdated += immersionResult.modifiedCount;

        // Update Memberships (expiry based on endDate)
        const membershipsResult = await Membership.updateMany(
            {
                endDate: { $exists: true, $lt: now },
                recordStatus: 'active'
            },
            { $set: { recordStatus: 'expired' } }
        );
        console.log(`Memberships: ${membershipsResult.modifiedCount} records marked as expired`);
        totalUpdated += membershipsResult.modifiedCount;

        console.log(`\n✅ Migration complete! Total records updated: ${totalUpdated}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

updateRecordStatuses();
