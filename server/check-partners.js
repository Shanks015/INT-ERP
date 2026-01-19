// Quick test to check what activeStatus values exist in database
import mongoose from 'mongoose';
import Partner from './src/models/Partner.js';

mongoose.connect('mongodb://localhost:27017/dsuerp')
    .then(async () => {
        console.log('Connected to MongoDB\n');

        // Get activeStatus distribution
        const activeStatusDist = await Partner.aggregate([
            { $group: { _id: '$activeStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        console.log('ActiveStatus Distribution:');
        activeStatusDist.forEach(item => {
            console.log(`  ${item._id || '(empty)'}: ${item.count}`);
        });

        // Count by activeStatus = 'Active'
        const activeCount = await Partner.countDocuments({ activeStatus: 'Active' });
        const total = await Partner.countDocuments({});

        console.log(`\nTotal partners: ${total}`);
        console.log(`Partners with activeStatus = 'Active': ${activeCount}`);

        // Show a few sample records
        const samples = await Partner.find({}).limit(3).select('university activeStatus status');
        console.log('\nSample records:');
        samples.forEach(p => {
            console.log(`  ${p.university}: activeStatus="${p.activeStatus}", status="${p.status}"`);
        });

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
