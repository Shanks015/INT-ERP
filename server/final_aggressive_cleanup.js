
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import CampusVisit from './src/models/CampusVisit.js';
import Event from './src/models/Event.js';
import MouUpdate from './src/models/MouUpdate.js';

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
        console.log(`  No duplicates found.`);
    }
};

const runCleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Super aggressive keys
        await removeDuplicatesForModel(CampusVisit, ['visitorName']);
        await removeDuplicatesForModel(Event, ['title']);
        await removeDuplicatesForModel(MouUpdate, ['university']);

        console.log('\nFinal cleanup completed.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
};

runCleanup();
