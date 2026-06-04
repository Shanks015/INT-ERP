export const buildReminderEmail = (outreach, milestone) => {
    const universityName = outreach.university || outreach.name || 'Your Institution';
    const contactName = outreach.contactName || outreach.contactPerson || 'International Office';
    const partnershipType = outreach.partnershipType || 'academic partnership';

    const subject = `Follow-up: Partnership Inquiry from Dayananda Sagar University (Day ${milestone})`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px; }
        .header { background: #1a56db; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0; }
        .header h2 { margin: 0; font-size: 18px; }
        .body { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 16px 24px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
        .highlight { background: #eff6ff; border-left: 4px solid #1a56db; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }
        .btn { display: inline-block; background: #1a56db; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Dayananda Sagar University — International Affairs Office</h2>
        </div>
        <div class="body">
          <p>Dear ${contactName},</p>
          <p>
            We hope this message finds you well. We are writing to follow up on our earlier communication
            regarding a potential <strong>${partnershipType}</strong> between 
            <strong>Dayananda Sagar University, Bangalore</strong> and 
            <strong>${universityName}</strong>.
          </p>
          <div class="highlight">
            It has been <strong>${milestone} days</strong> since our initial outreach, and we have not yet 
            received a response. We remain genuinely interested in exploring this collaboration and would 
            love to connect at your earliest convenience.
          </div>
          <p>
            We would be delighted to schedule a brief call or video conference to discuss how our 
            institutions could collaborate. Please feel free to suggest a time that works for you.
          </p>
          <p>
            You may reply directly to this email or reach us at 
            <a href="mailto:${process.env.SMTP_USER}">${process.env.SMTP_USER}</a>.
          </p>
          <br/>
          <p>
            We look forward to hearing from you.<br/><br/>
            Warm regards,<br/>
            <strong>International Affairs Office</strong><br/>
            Dayananda Sagar University<br/>
            Bangalore, Karnataka, India
          </p>
        </div>
        <div class="footer">
          This is an automated follow-up reminder sent on behalf of the DSU International Affairs team.
          If you have already responded, please disregard this message.
        </div>
      </div>
    </body>
    </html>
    `;

    return { subject, html };
};

export const buildAdminNotificationEmail = (outreach, detectedIn) => {
    const universityName = outreach.university || outreach.name;
    const subject = `[ERP Alert] Reply Detected — ${universityName}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; padding: 24px;">
      <h2 style="color: #1a56db;">Reply Detected — Action Required</h2>
      <p>A possible reply has been detected for the following outreach record:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold; width: 40%;">University</td><td style="padding: 8px;">${universityName}</td></tr>
        <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold;">From Email</td><td style="padding: 8px;">${outreach.replyFromEmail}</td></tr>
        <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold;">Subject</td><td style="padding: 8px;">${outreach.replySubject}</td></tr>
        <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold;">Detected In</td><td style="padding: 8px;">${detectedIn?.name || 'Unknown'}'s inbox</td></tr>
        <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold;">Detected At</td><td style="padding: 8px;">${new Date(outreach.replyDetectedAt).toLocaleString('en-IN')}</td></tr>
      </table>
      <p>
        Please log into the ERP and review this detection in the 
        <strong>Outreach → Review Queue</strong> tab.
      </p>
      <p>
        <a href="${process.env.CLIENT_URL}/outreach" 
           style="background: #1a56db; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Open Outreach Module
        </a>
      </p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
        DSU ERP — International Affairs Automation
      </p>
    </body>
    </html>
    `;

    return { subject, html };
};
