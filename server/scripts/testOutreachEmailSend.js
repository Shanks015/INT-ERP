import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import OutreachNew from '../src/models/OutreachNew.js';
import MailboxConnection from '../src/models/MailboxConnection.js';
import User from '../src/models/User.js';
import { decrypt } from '../src/services/cryptoService.js';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const getSmtpHost = (imapHost) => {
    if (!imapHost) return 'smtp.gmail.com';
    if (imapHost.includes('gmail')) return 'smtp.gmail.com';
    if (imapHost.includes('outlook') || imapHost.includes('office365')) return 'smtp.office365.com';
    return imapHost.replace(/^imap\./i, 'smtp.');
};

async function testSend() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Find Admin User
        const adminUser = await User.findOne({ email: 'admin@dsu.edu.in' });
        if (!adminUser) {
            console.error('Admin user (admin@dsu.edu.in) not found!');
            return;
        }

        // Find or Create Outreach Record
        let outreach = await OutreachNew.findOne({ email: 'prime9739135140@gmail.com' });
        if (!outreach) {
            console.log('Creating a test Outreach New record for prime9739135140@gmail.com...');
            outreach = new OutreachNew({
                university: 'DSU ERP Testing Labs',
                country: 'India',
                email: 'prime9739135140@gmail.com',
                contactName: 'Test Recipient',
                contactPerson: 'QA Lead',
                partnershipType: 'Testing',
                outreachStatus: 'Not Sent',
                createdBy: adminUser._id,
                updatedBy: adminUser._id
            });
            await outreach.save();
        }

        console.log(`Using Outreach record ID: ${outreach._id} (${outreach.university})`);

        // Find Mailbox Connection for this employee
        const mailbox = await MailboxConnection.findOne({ employee: adminUser._id });
        if (!mailbox) {
            console.error('No mailbox connection found for admin user!');
            return;
        }

        console.log(`Found active Mailbox Connection for admin: ${mailbox.emailAddress}`);

        // Decrypt password
        console.log('Decrypting app password...');
        const appPassword = decrypt(mailbox.appPassword);
        const smtpHost = getSmtpHost(mailbox.imapHost);
        console.log(`SMTP Host: ${smtpHost}`);

        // Create Transporter
        console.log('Initializing SMTP transporter...');
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 465,
            secure: true,
            auth: {
                user: mailbox.emailAddress,
                pass: appPassword
            }
        });

        // Test sending email to the outreach record's email
        const mailOptions = {
            from: `"${adminUser.name}" <${mailbox.emailAddress}>`,
            to: outreach.email,
            subject: `ERP Outreach SMTP Test — ${new Date().toISOString()}`,
            html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                     <h2>Outreach SMTP System Test</h2>
                     <p>This email confirms that the <strong>Outreach New</strong> mail sending system is working correctly via SMTP integration.</p>
                     <br/>
                     <p>Best regards,</p>
                     <p><strong>DSU International Affairs Team</strong></p>
                   </div>`
        };

        console.log(`Sending email from ${mailbox.emailAddress} to ${outreach.email}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent! MessageID: ${info.messageId}`);

        // Append to emails list
        outreach.emails.push({
            messageId: info.messageId,
            direction: 'sent',
            from: mailbox.emailAddress,
            to: outreach.email,
            subject: mailOptions.subject,
            body: 'SMTP automated test email sent.',
            sentAt: new Date(),
            sentBy: adminUser._id,
            sentByName: adminUser.name
        });

        outreach.outreachStatus = 'Sent';
        outreach.hasUnreadReply = false;
        await outreach.save();
        console.log('Successfully updated database record status to "Sent" and logged email thread.');

    } catch (error) {
        console.error('Error during email send test:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

testSend();
