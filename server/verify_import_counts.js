
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import CampusVisit from './src/models/CampusVisit.js';
import Event from './src/models/Event.js';
import MouSigningCeremony from './src/models/MouSigningCeremony.js';
import Conference from './src/models/Conference.js';
import ScholarInResidence from './src/models/ScholarInResidence.js';
import MouUpdate from './src/models/MouUpdate.js';
import ImmersionProgram from './src/models/ImmersionProgram.js';
import StudentExchange from './src/models/StudentExchange.js';
import MastersAbroad from './src/models/MastersAbroad.js';
import Membership from './src/models/Membership.js';
import DigitalMedia from './src/models/DigitalMedia.js';
import MeetingTracker from './src/models/MeetingTracker.js';

dotenv.config();

const verifyCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const counts = await Promise.all([
            CampusVisit.countDocuments(),
            Event.countDocuments(),
            MouSigningCeremony.countDocuments(),
            Conference.countDocuments(),
            ScholarInResidence.countDocuments(),
            MouUpdate.countDocuments(),
            ImmersionProgram.countDocuments(),
            StudentExchange.countDocuments(),
            MastersAbroad.countDocuments(),
            Membership.countDocuments(),
            DigitalMedia.countDocuments(),
            MeetingTracker.countDocuments()
        ]);

        console.log('\n--- Database Counts ---');
        console.log(`CampusVisit: ${counts[0]}`);
        console.log(`Event: ${counts[1]}`);
        console.log(`MouSigningCeremony: ${counts[2]}`);
        console.log(`Conference: ${counts[3]}`);
        console.log(`ScholarInResidence: ${counts[4]}`);
        console.log(`MouUpdate: ${counts[5]}`);
        console.log(`ImmersionProgram: ${counts[6]}`);
        console.log(`StudentExchange: ${counts[7]}`);
        console.log(`MastersAbroad: ${counts[8]}`);
        console.log(`Membership: ${counts[9]}`);
        console.log(`DigitalMedia: ${counts[10]}`);
        console.log(`MeetingTracker: ${counts[11]}`);

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verifyCounts();
