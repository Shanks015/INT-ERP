import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
import CampusVisit from '../src/models/CampusVisit.js';
import Conference from '../src/models/Conference.js';
import DigitalMedia from '../src/models/DigitalMedia.js';
import Event from '../src/models/Event.js';
import ImmersionProgram from '../src/models/ImmersionProgram.js';
import MastersAbroad from '../src/models/MastersAbroad.js';
import Membership from '../src/models/Membership.js';
import MouSigningCeremony from '../src/models/MouSigningCeremony.js';
import MouUpdate from '../src/models/MouUpdate.js';
import Partner from '../src/models/Partner.js';
import Scholar from '../src/models/ScholarInResidence.js';
import StudentExchange from '../src/models/StudentExchange.js';

const models = [
    { name: 'CampusVisit', model: CampusVisit, fields: { visitorName: 'text', universityName: 'text', country: 'text', department: 'text' } },
    { name: 'Conference', model: Conference, fields: { conferenceName: 'text', country: 'text', topic: 'text' } },
    { name: 'DigitalMedia', model: DigitalMedia, fields: { title: 'text', platform: 'text' } },
    { name: 'Event', model: Event, fields: { name: 'text', type: 'text', location: 'text' } },
    { name: 'ImmersionProgram', model: ImmersionProgram, fields: { programName: 'text', country: 'text', university: 'text' } },
    { name: 'MastersAbroad', model: MastersAbroad, fields: { studentName: 'text', university: 'text', country: 'text' } },
    { name: 'Membership', model: Membership, fields: { organization: 'text', membershipType: 'text' } },
    { name: 'MouSigningCeremony', model: MouSigningCeremony, fields: { institutionName: 'text', country: 'text' } },
    { name: 'MouUpdate', model: MouUpdate, fields: { universityName: 'text', country: 'text', department: 'text' } },
    { name: 'Partner', model: Partner, fields: { partnerName: 'text', country: 'text', university: 'text' } },
    { name: 'Scholar', model: Scholar, fields: { scholarName: 'text', country: 'text', university: 'text', department: 'text' } },
    { name: 'StudentExchange', model: StudentExchange, fields: { studentName: 'text', university: 'text', country: 'text' } }
];

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        for (const { name, model, fields } of models) {
            console.log(`Indexing ${name}...`);
            try {
                // Drop existing indexes might be needed if conflicts, but let's try creating first
                // await model.collection.dropIndexes(); 

                await model.collection.createIndex(fields, { name: 'TextSearchIndex' });
                console.log(`  + Text Index created`);
            } catch (err) {
                console.warn(`  ! Warning indexing ${name}: ${err.message}`);
            }
        }

        console.log('✅ All text indexes created.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

run();
