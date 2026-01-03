import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
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
    { name: 'CampusVisit', model: CampusVisit },
    { name: 'Conference', model: Conference },
    { name: 'DigitalMedia', model: DigitalMedia },
    { name: 'Event', model: Event },
    { name: 'ImmersionProgram', model: ImmersionProgram },
    { name: 'MastersAbroad', model: MastersAbroad },
    { name: 'Membership', model: Membership },
    { name: 'MouSigningCeremony', model: MouSigningCeremony },
    { name: 'MouUpdate', model: MouUpdate },
    { name: 'Partner', model: Partner },
    { name: 'Scholar', model: Scholar },
    { name: 'StudentExchange', model: StudentExchange }
];

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        for (const { name, model } of models) {
            console.log(`Indexing ${name}...`);

            // Add Index definitions dynamically if not in schema (this just forces creation of what's defined + potentially new ones if we defined them in schema, 
            // but here we are using the model's existing definition. 
            // To force new indexes without changing schema files first, we can use collection.createIndex)

            // Common indexes
            try {
                // Status (if exists)
                if (model.schema.paths.status) {
                    await model.collection.createIndex({ status: 1 });
                    console.log(`  + Index created on 'status'`);
                }

                // Type (for Event aggregation)
                if (model.schema.paths.type) {
                    await model.collection.createIndex({ type: 1 });
                    console.log(`  + Index created on 'type'`);
                }

                // Country (if exists)
                if (model.schema.paths.country) {
                    await model.collection.createIndex({ country: 1 });
                    console.log(`  + Index created on 'country'`);
                }

                // Date/Created At
                await model.collection.createIndex({ createdAt: -1 });
                console.log(`  + Index created on 'createdAt'`);

                if (model.schema.paths.date) {
                    await model.collection.createIndex({ date: -1 });
                    console.log(`  + Index created on 'date'`);
                }

            } catch (err) {
                console.warn(`  ! Warning indexing ${name}: ${err.message}`);
            }
        }

        console.log('✅ All indexes checked/created.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

run();
