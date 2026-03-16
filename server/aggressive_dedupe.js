
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

dotenv.config();

const normalize = (val) => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string') return val.trim().toLowerCase();
    return String(val);
};

const removeDuplicatesForModel = async (Model, uniqueFields) => {
    console.log(`\nProcessing ${Model.modelName}...`);
    const docs = await Model.find({}).sort({ createdAt: 1 }); // Keep oldest

    const seen = new Set();
    const deleteIds = [];

    docs.forEach(doc => {
        // Construct simpler key
        const keyParts = uniqueFields.map(field => normalize(doc[field]));
        const key = keyParts.join('|');

        if (seen.has(key)) {
            deleteIds.push(doc._id);
        } else {
            seen.add(key);
        }
    });

    if (deleteIds.length > 0) {
        await Model.deleteMany({ _id: { $in: deleteIds } });
        console.log(`  Removed ${deleteIds.length} duplicates from ${docs.length} records.`);
    } else {
        console.log(`  No duplicates found (Total: ${docs.length}).`);
    }
};

const runCleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Aggressive Keys based on 1:2 ratio findings
        await removeDuplicatesForModel(StudentExchange, ['studentName']); // 24 -> 12
        await removeDuplicatesForModel(CampusVisit, ['visitorName', 'date']); // 196 -> ~100
        await removeDuplicatesForModel(Event, ['title', 'date']); // 106 -> ~50
        await removeDuplicatesForModel(MouUpdate, ['university', 'department', 'date']); // 140 -> 70
        await removeDuplicatesForModel(ImmersionProgram, ['university', 'direction']);
        await removeDuplicatesForModel(Conference, ['conferenceName']);
        await removeDuplicatesForModel(ScholarInResidence, ['scholarName']);
        await removeDuplicatesForModel(Membership, ['name']);

        // Less aggressive for these (counts seemed fine or already handled)
        await removeDuplicatesForModel(MouSigningCeremony, ['date', 'universityName']);
        await removeDuplicatesForModel(DigitalMedia, ['link']);
        await removeDuplicatesForModel(MastersAbroad, ['studentName']);

        console.log('\nCleanup completed.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
};

runCleanup();
