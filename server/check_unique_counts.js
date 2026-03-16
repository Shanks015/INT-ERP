
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentExchange from './src/models/StudentExchange.js';
import MoUUpdate from './src/models/MouUpdate.js';
import CampusVisit from './src/models/CampusVisit.js';
import Event from './src/models/Event.js';

dotenv.config();

const check = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    // Student Exchange
    const seTotal = await StudentExchange.countDocuments();
    const seNames = await StudentExchange.distinct('studentName');
    console.log(`StudentExchange: Total ${seTotal}, Unique Names ${seNames.length}`);

    // MoU Update
    const mouTotal = await MoUUpdate.countDocuments();
    // distinct on date might be messy, let's try university + date via agg
    const mouUni = await MoUUpdate.distinct('university');
    console.log(`MoUUpdate: Total ${mouTotal}, Unique Universities ${mouUni.length}`);

    // Campus Visit
    const cvTotal = await CampusVisit.countDocuments();
    const cvVisitor = await CampusVisit.distinct('visitorName');
    console.log(`CampusVisit: Total ${cvTotal}, Unique Visitors ${cvVisitor.length}`);

    // Event
    const evTotal = await Event.countDocuments();
    const evTitles = await Event.distinct('title');
    console.log(`Event: Total ${evTotal}, Unique Titles ${evTitles.length}`);


    process.exit(0);
};

check();
