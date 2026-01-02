
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Models
import CampusVisit from '../src/models/CampusVisit.js';
import MouSigningCeremony from '../src/models/MouSigningCeremony.js';
import Event from '../src/models/Event.js';
import Conference from '../src/models/Conference.js';
import ScholarInResidence from '../src/models/ScholarInResidence.js';
import MouUpdate from '../src/models/MouUpdate.js';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import StudentExchange from '../src/models/StudentExchange.js';
import Membership from '../src/models/Membership.js';
import DigitalMedia from '../src/models/DigitalMedia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Database Counts ---');
        console.log(`Campus Visits: ${await CampusVisit.countDocuments()}`);
        console.log(`MoU Signing Ceremonies: ${await MouSigningCeremony.countDocuments()}`);
        console.log(`Events: ${await Event.countDocuments()}`);
        console.log(`Conferences: ${await Conference.countDocuments()}`);
        console.log(`Scholars: ${await ScholarInResidence.countDocuments()}`);
        console.log(`MoU Updates: ${await MouUpdate.countDocuments()}`);
        console.log(`Immersion Programs: ${await ImmersionProgram.countDocuments()}`);
        console.log(`Student Exchanges: ${await StudentExchange.countDocuments()}`);
        console.log(`Memberships: ${await Membership.countDocuments()}`);
        console.log(`Digital Media: ${await DigitalMedia.countDocuments()}`);
        console.log('-----------------------');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

verify();
