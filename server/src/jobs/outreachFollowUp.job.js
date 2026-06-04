import cron from 'node-cron';
import Outreach from '../models/Outreach.js';
import OutreachReminder from '../models/OutreachReminder.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendEmail } from '../services/emailService.js';
import { buildReminderEmail } from '../services/outreachEmailTemplate.js';

const MILESTONES = [14, 28]; // days — v1 hardcoded

// ─── Core follow-up logic (exported for manual testing) ──────────────────────
export const runOutreachFollowUpJob = async () => {
    const now = new Date();
    console.log(`[FollowUp] Job started at ${now.toISOString()}`);

    let pendingRecords = [];
    try {
        pendingRecords = await Outreach.find({
            outreachStatus: 'Pending Partner Review',
            automationActive: true,
            sentDate: { $ne: null }
        });
    } catch (err) {
        console.error('[FollowUp] DB query failed:', err.message);
        return;
    }

    console.log(`[FollowUp] Found ${pendingRecords.length} pending record(s)`);

    let sent = 0, skipped = 0, errors = 0;

    for (const record of pendingRecords) {
        try {
            const sentDate = new Date(record.sentDate);
            sentDate.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const daysSinceSent = Math.floor((today - sentDate) / (1000 * 60 * 60 * 24));

            for (const milestone of MILESTONES) {
                // >= check: resilient to missed cron runs
                if (daysSinceSent < milestone) continue;

                // Already sent this milestone? Skip
                const alreadySent = record.remindersSent?.some(r => r.milestone === milestone);
                if (alreadySent) continue;

                if (!record.email) {
                    console.warn(`[FollowUp] No email on record ${record._id}, skipping`);
                    skipped++;
                    break;
                }

                const { subject, html } = buildReminderEmail(record, milestone);

                let success = false;
                let errorMessage = null;

                try {
                    await sendEmail({ to: record.email, subject, html });
                    success = true;
                    sent++;
                    console.log(`[FollowUp] Sent day-${milestone} reminder to ${record.email}`);
                } catch (emailErr) {
                    errorMessage = emailErr.message;
                    errors++;
                    console.error(`[FollowUp] Email failed for ${record._id}:`, emailErr.message);
                }

                // Always log the attempt
                await OutreachReminder.create({
                    outreachId:   record._id,
                    milestone,
                    triggerType:  'automation',
                    emailTo:      record.email,
                    emailSubject: subject,
                    success,
                    errorMessage
                });

                if (success) {
                    record.remindersSent = record.remindersSent || [];
                    record.remindersSent.push({ milestone, sentAt: new Date() });
                    record.lastReminderAt = new Date();

                    // Deactivate after the final milestone
                    if (milestone === Math.max(...MILESTONES)) {
                        record.automationActive = false;
                        console.log(`[FollowUp] Automation deactivated for ${record._id} (final milestone reached)`);
                    }

                    await record.save();

                    await ActivityLog.logActivity({
                        user:       record.createdBy,
                        userName:   'System Automation',
                        action:     'reminder',
                        module:     'outreach',
                        targetId:   String(record._id),
                        targetName: record.university || record.name,
                        details:    { milestone, triggerType: 'automation' },
                        method:     'POST',
                        path:       '/jobs/outreachFollowUp',
                        statusCode: 200
                    });
                }

                break; // Only one milestone per record per run
            }
        } catch (recordErr) {
            errors++;
            console.error(`[FollowUp] Error processing ${record._id}:`, recordErr.message);
        }
    }

    console.log(`[FollowUp] Done. Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);
};

// ─── Register cron (02:00 AM IST daily) ──────────────────────────────────────
export const startOutreachFollowUpJob = () => {
    cron.schedule('0 2 * * *', runOutreachFollowUpJob, {
        timezone: 'Asia/Kolkata'
    });
    console.log('✅ Outreach follow-up cron job registered (02:00 IST daily)');
};
