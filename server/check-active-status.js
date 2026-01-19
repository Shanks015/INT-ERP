import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/dsuerp')
    .then(async () => {
        console.log('Connected to MongoDB');

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nAll collections in database:');
        collections.forEach(c => {
            console.log(`- ${c.name}`);
        });

        // Check partners collection stats
        for (const coll of collections) {
            if (coll.name.toLowerCase().includes('partner')) {
                const count = await mongoose.connection.db.collection(coll.name).countDocuments({});
                console.log(`\n${coll.name}: ${count} documents`);
            }
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
