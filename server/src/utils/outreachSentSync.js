// outreachSentSync.js — pure helpers for the SENT pass of the mailbox poller
// (server/src/jobs/imapReplySync.job.js). The INBOX pass detects partner replies
// by "From == partner"; this is its symmetric outbound twin: an employee send made
// OUTSIDE the ERP (e.g. a reply typed in gmail.com) is reconciled back onto the
// matching Outreach Mail record when the mailbox owner sent it To/Cc a known
// partner. Keeping the rules here as pure functions makes them unit-testable
// without a DB (mirrors src/utils/outreachNewQuery.js).

// Normalise an IMAP special-use attribute or flag name ("\Sent", "\Sent", …) to a
// lower-case key ("sent") so we are tolerant of how a given server/imapflow build
// reports it.
const attrKey = (v) => String(v || '').toLowerCase().replace(/^\\/, '');

// Resolve the mailbox path of the provider's "Sent" folder from a client.list()
// result. Preference: the special-use attribute \Sent, then a \Sent flag, then
// common folder-name spellings (Gmail's "[Gmail]/Sent Mail" first). Returns null
// when none is found — a provider without a Sent folder is a clean skip, not an
// error.
export const resolveSentMailboxPath = (boxes) => {
    if (!Array.isArray(boxes) || boxes.length === 0) return null;

    const bySpecialUse = boxes.find((b) => b && b.path && attrKey(b.specialUse) === 'sent');
    if (bySpecialUse) return bySpecialUse.path;

    const byFlag = boxes.find((b) => b && b.path && b.flags && [...b.flags].some((f) => attrKey(f) === 'sent'));
    if (byFlag) return byFlag.path;

    const full = (p) => String(p || '').toLowerCase();
    const lastSegment = (p) => {
        const s = full(p);
        const i = Math.max(s.lastIndexOf('/'), s.lastIndexOf('.'));
        return i >= 0 ? s.slice(i + 1) : s;
    };
    const pick = (pred) => boxes.find((b) => b && b.path && pred(full(b.path), lastSegment(b.path)));
    return (
        pick((f) => f.includes('[gmail]') && f.includes('sent mail'))?.path ||
        pick((_f, seg) => seg === 'sent mail')?.path ||
        pick((_f, seg) => seg === 'sent items')?.path ||
        pick((_f, seg) => seg === 'sent')?.path ||
        null
    );
};

// True when the record's canonical partner email (email or any alternativeEmails)
// appears among the recipient addresses (To/Cc union), case-insensitively.
export const recipientMatches = (record, addresses) => {
    if (!record || !Array.isArray(addresses) || addresses.length === 0) return false;

    const present = new Set(addresses.map((a) => String(a).toLowerCase().trim()).filter(Boolean));
    if (present.size === 0) return false;

    const targets = [record.email, ...(Array.isArray(record.alternativeEmails) ? record.alternativeEmails : [])]
        .filter(Boolean)
        .map((a) => String(a).toLowerCase().trim());

    return targets.some((t) => present.has(t));
};

// Dedupe guard — the ERP already logs its own sends (Gmail API / SMTP) as `sent`
// legs carrying the same RFC Message-ID that appears in the Sent folder, so those
// must not be re-added or churn status.
export const alreadyHasMessageId = (emails, messageId) => {
    if (!messageId) return false;
    if (!Array.isArray(emails)) return false;
    return emails.some((e) => e && e.messageId && String(e.messageId) === String(messageId));
};

// Status a record should hold after an out-of-band send is reconciled. Mirror of
// the in-ERP send rule (sendOutreachNewEmail): a send that answers a partner reply
// closes the loop (Reply Received -> Replied); a first-ever send moves the record
// to Sent; an already-Sent record stays Sent (follow-up). 'Closed' records are
// excluded before this is ever called.
export const reconciledStatus = (current) => {
    if (current === 'Reply Received' || current === 'Replied') return 'Replied';
    if (current === 'Not Sent') return 'Sent';
    return current;
};

// Safety gate for the SENT reconcile pass. Unlike the INBOX pass (which only
// appends when a partner genuinely writes to the mailbox), the SENT pass WRITES
// to records automatically on every poll — flipping outreachStatus, clearing
// unread, appending legs. So it stays OFF unless explicitly enabled, and can be
// switched off again without a code change or redeploy. Matched
// case-insensitively so 'true'/'TRUE'/'True' all work.
export const sentReconcileEnabled = (env = process.env) =>
    String(env.SENT_RECONCILE_ENABLED || '').toLowerCase() === 'true';
