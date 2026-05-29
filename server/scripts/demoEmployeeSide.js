import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import User from '../src/models/User.js';
import Partner from '../src/models/Partner.js';
import Event from '../src/models/Event.js';

dotenv.config();

// ANSI color escape codes for high-fidelity presentation in console
const reset = "\x1b[0m";
const bold = "\x1b[1m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const blue = "\x1b[34m";
const magenta = "\x1b[35m";
const cyan = "\x1b[36m";
const red = "\x1b[31m";

async function runDemo() {
    try {
        console.log(`\n${bold}${cyan}================================================================${reset}`);
        console.log(`${bold}${magenta}   💼 DSU INTERNATIONAL AFFAIRS ERP - EMPLOYEE SIDE DEMONSTRATION   ${reset}`);
        console.log(`${bold}${cyan}================================================================${reset}`);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`\n${green}✅ Connected to MongoDB${reset}`);

        // 1. Setup Employee Account
        console.log(`\n${bold}${blue}[Step 1] Initializing Employee Account ('Jane Doe')${reset}`);
        let employee = await User.findOne({ email: 'jane.doe@dsu.edu.in' });
        if (employee) {
            await User.findByIdAndDelete(employee._id);
        }
        
        employee = new User({
            name: 'Jane Doe',
            email: 'jane.doe@dsu.edu.in',
            password: 'password123',
            role: 'employee',
            approved: true,
            approvalStatus: 'approved'
        });
        await employee.save();
        console.log(`👉 Registered: ${bold}Jane Doe${reset} (Role: ${bold}Employee${reset})`);
        
        const token = employee.generateAuthToken();
        console.log(`${green}✅ Generated Security Token for Jane Doe${reset}`);

        // 2. Setup Test Partner and Event in Active State
        console.log(`\n${bold}${blue}[Step 2] Seed Active Database Records${reset}`);
        
        await Partner.deleteMany({ university: /Oxford University/i });
        await Event.deleteMany({ title: /DSU Global Gala/i });

        const activePartner = new Partner({
            university: 'Oxford University',
            country: 'United Kingdom',
            contactPerson: 'Old Contact',
            status: 'active',
            recordStatus: 'active'
        });
        await activePartner.save();
        console.log(`👉 Active Record Seeded: ${bold}Partners -> Oxford University${reset}`);

        const activeEvent = new Event({
            title: 'DSU Global Gala',
            date: new Date(),
            status: 'active'
        });
        await activeEvent.save();
        console.log(`👉 Active Record Seeded: ${bold}Events -> DSU Global Gala${reset}`);

        // 3. Simulate Employee Edit Request
        console.log(`\n${bold}${blue}[Step 3] Jane Doe Edits Oxford University Partner${reset}`);
        console.log(`   Proposed Edit: Change Contact Person to 'Dr. Sarah Jenkins'`);
        
        const updateUrl = `http://localhost:5000/api/partners/${activePartner._id}`;
        
        try {
            const res = await axios.put(updateUrl, 
                { contactPerson: 'Dr. Sarah Jenkins' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`\n${bold}${green}👉 API Response:${reset}`, res.data);

            // Verify live database state
            const freshPartner = await Partner.findById(activePartner._id);
            console.log(`\n${bold}${yellow}🔍 Live Database Status Check:${reset}`);
            console.log(`   - Document Status: ${bold}${freshPartner.status}${reset} (should be 'pending_edit')`);
            console.log(`   - Contact Person in Live DB: ${bold}${freshPartner.contactPerson}${reset} (should still be 'Old Contact'!)`);
            console.log(`   - Staged proposedChanges:`, freshPartner.pendingChanges);
            
            if (freshPartner.status === 'pending_edit' && freshPartner.contactPerson === 'Old Contact') {
                console.log(`\n${bold}${green}🎉 SUCCESS: Live database remains safe! Proposed changes staged perfectly.${reset}`);
            } else {
                console.error(`\n${bold}${red}❌ ERROR: Live database was overwritten directly!${reset}`);
            }
        } catch (err) {
            console.error(`${red}API Request Failed:${reset}`, err.response?.data || err.message);
        }

        // 4. Simulate Employee Delete Request
        console.log(`\n${bold}${blue}[Step 4] Jane Doe Requests Deletion of DSU Global Gala Event${reset}`);
        console.log(`   Reason for Delete: 'Event cancelled due to weather'`);

        const deleteUrl = `http://localhost:5000/api/events/${activeEvent._id}`;

        try {
            const res = await axios.delete(deleteUrl, {
                data: { reason: 'Event cancelled due to weather' },
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`\n${bold}${green}👉 API Response:${reset}`, res.data);

            // Verify live database state
            const freshEvent = await Event.findById(activeEvent._id);
            console.log(`\n${bold}${yellow}🔍 Live Database Status Check:${reset}`);
            console.log(`   - Document Status: ${bold}${freshEvent.status}${reset} (should be 'pending_delete')`);
            console.log(`   - Deletion Reason saved: ${bold}${freshEvent.deletionReason}${reset}`);
            console.log(`   - Still in Database? ${bold}${freshEvent ? 'YES (Not deleted)' : 'NO (Deleted!)'}${reset}`);

            if (freshEvent && freshEvent.status === 'pending_delete') {
                console.log(`\n${bold}${green}🎉 SUCCESS: Document was not deleted! Deletion staged for Admin approval.${reset}`);
            } else {
                console.error(`\n${bold}${red}❌ ERROR: Record was directly deleted from database!${reset}`);
            }
        } catch (err) {
            console.error(`${red}API Request Failed:${reset}`, err.response?.data || err.message);
        }

        // 5. Cleanup
        console.log(`\n${bold}${blue}[Step 5] Cleaning Up Temporary Test Data${reset}`);
        await User.findByIdAndDelete(employee._id);
        await Partner.findByIdAndDelete(activePartner._id);
        await Event.findByIdAndDelete(activeEvent._id);
        console.log(`${green}✅ Temporary user, partner, and event records deleted.${reset}`);

        await mongoose.disconnect();
        console.log(`${green}✅ Disconnected from MongoDB${reset}`);

        console.log(`\n${bold}${cyan}================================================================${reset}`);
        console.log(`${bold}${magenta}            DEMONSTRATION RUN COMPLETE SUCCESSFULLY             ${reset}`);
        console.log(`${bold}${cyan}================================================================\n${reset}`);

    } catch (err) {
        console.error(`${red}Fatal error during demo:${reset}`, err);
    }
}

runDemo();
