
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
    if (val instanceof Date) return val.toISOString().split('T')[0]; // Compare Dates only (YYYY-MM-DD)
    if (typeof val === 'string') return val.trim().toLowerCase();
    return String(val);
};

const removeDuplicatesForModel = async (Model, uniqueFields) => {
    console.log(`\nProcessing ${Model.modelName}...`);
    const docs = await Model.find({}).sort({ createdAt: 1 }); // Oldest first

    const seen = new Set();
    const deleteIds = [];

    docs.forEach(doc => {
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
        console.log(`  Removed ${deleteIds.length} duplicates.`);
    } else {
        console.log(`  No duplicates found.`);
    }
};

const runCleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Define unique keys (Same as before but logic is looser now)
        await removeDuplicatesForModel(CampusVisit, ['date', 'visitorName', 'universityName']);
        await removeDuplicatesForModel(Event, ['date', 'title']);
        await removeDuplicatesForModel(MouSigningCeremony, ['date', 'universityName']);
        await removeDuplicatesForModel(Conference, ['date', 'conferenceName']);
        await removeDuplicatesForModel(ScholarInResidence, ['scholarName', 'fromDate']);
        await removeDuplicatesForModel(MouUpdate, ['university', 'agreementType', 'date']);
        await removeDuplicatesForModel(ImmersionProgram, ['university', 'arrivalDate', 'direction']);
        await removeDuplicatesForModel(StudentExchange, ['studentName', 'exchangeUniversity']);
        await removeDuplicatesForModel(MastersAbroad, ['studentName', 'university']);
        await removeDuplicatesForModel(Membership, ['name', 'startDate']);
        await removeDuplicatesForModel(DigitalMedia, ['date', 'link']);

        console.log('\nRobust cleanup completed.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
};

runCleanup();
