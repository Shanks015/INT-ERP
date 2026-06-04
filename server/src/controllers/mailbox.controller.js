import MailboxConnection from '../models/MailboxConnection.js';
import { encrypt } from '../services/cryptoService.js';
import { syncMailbox } from '../jobs/imapReplySync.job.js';

// GET /api/mailboxes — list all connections
export const getAllMailboxes = async (req, res) => {
    try {
        const connections = await MailboxConnection.find()
            .populate('employee', 'name email')
            .sort({ createdAt: -1 });

        // Never expose the encrypted password in responses
        const safe = connections.map(c => ({
            _id:          c._id,
            employee:     c.employee,
            employeeName: c.employeeName,
            emailAddress: c.emailAddress,
            imapHost:     c.imapHost,
            imapPort:     c.imapPort,
            status:       c.status,
            lastSyncAt:   c.lastSyncAt,
            lastErrorAt:  c.lastErrorAt,
            lastError:    c.lastError,
            totalMatched: c.totalMatched,
            createdAt:    c.createdAt
        }));

        res.json({ data: safe });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching mailbox connections', error: err.message });
    }
};

// POST /api/mailboxes — add a new connection
export const createMailbox = async (req, res) => {
    try {
        const { employeeId, employeeName, emailAddress, appPassword, imapHost, imapPort } = req.body;

        if (!employeeId || !employeeName || !emailAddress || !appPassword) {
            return res.status(400).json({ message: 'employeeId, employeeName, emailAddress and appPassword are required' });
        }

        // Check duplicate
        const existing = await MailboxConnection.findOne({ employee: employeeId });
        if (existing) {
            return res.status(409).json({ message: 'A mailbox connection already exists for this employee' });
        }

        // Clean app password (remove spaces Gmail adds for display)
        const cleanPassword = appPassword.replace(/\s/g, '');
        const encryptedPassword = encrypt(cleanPassword);

        const connection = await MailboxConnection.create({
            employee:    employeeId,
            employeeName,
            emailAddress: emailAddress.toLowerCase().trim(),
            appPassword: encryptedPassword,
            imapHost:    imapHost || 'imap.gmail.com',
            imapPort:    imapPort || 993
        });

        res.status(201).json({ message: 'Mailbox connection added successfully', data: { _id: connection._id, emailAddress: connection.emailAddress } });
    } catch (err) {
        res.status(500).json({ message: 'Error creating mailbox connection', error: err.message });
    }
};

// DELETE /api/mailboxes/:id — remove a connection
export const deleteMailbox = async (req, res) => {
    try {
        const connection = await MailboxConnection.findByIdAndDelete(req.params.id);
        if (!connection) return res.status(404).json({ message: 'Connection not found' });
        res.json({ message: 'Mailbox connection removed' });
    } catch (err) {
        res.status(500).json({ message: 'Error removing mailbox connection', error: err.message });
    }
};

// POST /api/mailboxes/:id/sync — manual sync trigger
export const triggerSync = async (req, res) => {
    try {
        const connection = await MailboxConnection.findById(req.params.id);
        if (!connection) return res.status(404).json({ message: 'Connection not found' });

        res.json({ message: 'Sync started in background' });

        // Run async (don't await so response returns immediately)
        syncMailbox(connection).catch(err => {
            console.error('[Manual Sync] Error:', err.message);
        });
    } catch (err) {
        res.status(500).json({ message: 'Error triggering sync', error: err.message });
    }
};

// PUT /api/mailboxes/:id/status — activate or disconnect
export const updateMailboxStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'disconnected'].includes(status)) {
            return res.status(400).json({ message: 'Status must be active or disconnected' });
        }

        const connection = await MailboxConnection.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!connection) return res.status(404).json({ message: 'Connection not found' });

        res.json({ message: `Mailbox ${status}`, data: { _id: connection._id, status: connection.status } });
    } catch (err) {
        res.status(500).json({ message: 'Error updating mailbox status', error: err.message });
    }
};
