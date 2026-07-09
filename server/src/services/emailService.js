import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
    return getTransporter().sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html
    });
};

export const verifyConnection = async () => {
    return getTransporter().verify();
};
