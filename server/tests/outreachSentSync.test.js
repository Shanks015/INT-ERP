import { describe, it, expect } from 'vitest';
import {
    resolveSentMailboxPath,
    recipientMatches,
    alreadyHasMessageId,
    reconciledStatus,
    sentReconcileEnabled
} from '../src/utils/outreachSentSync.js';

// IMAP list() boxes in the shape imapflow returns: ListResponse[] with
// { path, flags: Set<string>, specialUse?: string }.
const box = (path, { flags = [], specialUse } = {}) => ({ path, flags: new Set(flags), ...(specialUse ? { specialUse } : {}) });

describe('resolveSentMailboxPath', () => {
    it('prefers the \\Sent special-use attribute', () => {
        const boxes = [
            box('INBOX', { flags: ['\\HasNoChildren'] }),
            box('[Gmail]/Sent Mail', { specialUse: '\\Sent', flags: ['\\HasNoChildren'] }),
            box('[Gmail]/All Mail', { specialUse: '\\All' })
        ];
        expect(resolveSentMailboxPath(boxes)).toBe('[Gmail]/Sent Mail');
    });

    it('falls back to a \\Sent flag when no special-use is declared', () => {
        const boxes = [
            box('INBOX', { flags: ['\\HasNoChildren'] }),
            box('Sent', { flags: ['\\Sent', '\\HasNoChildren'] }),
            box('Trash', { flags: ['\\Trash'] })
        ];
        expect(resolveSentMailboxPath(boxes)).toBe('Sent');
    });

    it('falls back to folder-name heuristics (Gmail [Gmail]/Sent Mail first)', () => {
        const boxes = [
            box('INBOX'),
            box('[Gmail]/Sent Mail'),
            box('[Gmail]/Trash')
        ];
        expect(resolveSentMailboxPath(boxes)).toBe('[Gmail]/Sent Mail');
    });

    it('matches name heuristics on the last path segment (nested folders)', () => {
        expect(resolveSentMailboxPath([box('INBOX'), box('Archive/Sent Items')])).toBe('Archive/Sent Items');
        expect(resolveSentMailboxPath([box('Sent Items')])).toBe('Sent Items');
        expect(resolveSentMailboxPath([box('Folders/Sent')])).toBe('Folders/Sent');
    });

    it('returns null when no sent folder exists (clean skip, not an error)', () => {
        expect(resolveSentMailboxPath([box('INBOX'), box('[Gmail]/All Mail'), box('Trash')])).toBeNull();
        expect(resolveSentMailboxPath([])).toBeNull();
        expect(resolveSentMailboxPath(null)).toBeNull();
    });
});

describe('recipientMatches', () => {
    const record = {
        email: 'partner@college.edu',
        alternativeEmails: ['admin@college.edu']
    };

    it('matches record.email against the recipient set (case-insensitive)', () => {
        expect(recipientMatches(record, ['PARTNER@college.edu'])).toBe(true);
        expect(recipientMatches(record, ['cc@other.edu', 'Partner@College.Edu'])).toBe(true);
    });

    it('matches an alternativeEmail', () => {
        expect(recipientMatches(record, ['Admin@college.edu'])).toBe(true);
    });

    it('matches recipients drawn from the To/Cc union', () => {
        expect(recipientMatches(record, ['someone@x.edu', 'partner@college.edu'])).toBe(true);
    });

    it('returns false when no address matches', () => {
        expect(recipientMatches(record, ['other@somewhere.edu'])).toBe(false);
        expect(recipientMatches(record, [])).toBe(false);
        expect(recipientMatches(record, null)).toBe(false);
        expect(recipientMatches(record, ['partner@college.edu.edu'])).toBe(false); // not a substring match
        expect(recipientMatches(null, ['partner@college.edu'])).toBe(false);
    });
});

describe('alreadyHasMessageId', () => {
    const emails = [{ messageId: '<a@one.edu>' }, { messageId: '<b@two.edu>' }];

    it('returns true when the messageId is already present', () => {
        expect(alreadyHasMessageId(emails, '<a@one.edu>')).toBe(true);
        expect(alreadyHasMessageId(emails, '<b@two.edu>')).toBe(true);
    });

    it('returns false for a new messageId', () => {
        expect(alreadyHasMessageId(emails, '<c@three.edu>')).toBe(false);
    });

    it('handles empty / missing legs gracefully', () => {
        expect(alreadyHasMessageId([], '<a@one.edu>')).toBe(false);
        expect(alreadyHasMessageId(undefined, '<a@one.edu>')).toBe(false);
        expect(alreadyHasMessageId(emails, null)).toBe(false);
        expect(alreadyHasMessageId(emails, undefined)).toBe(false);
        // a leg missing messageId should not false-positive the guard
        expect(alreadyHasMessageId([{ gmailId: 'abc' }], null)).toBe(false);
    });
});

describe('reconciledStatus', () => {
    it('closes the loop: a send after a partner reply -> Replied', () => {
        expect(reconciledStatus('Reply Received')).toBe('Replied');
        expect(reconciledStatus('Replied')).toBe('Replied');
    });

    it('a first-ever out-of-band send -> Sent', () => {
        expect(reconciledStatus('Not Sent')).toBe('Sent');
    });

    it('leaves an already-Sent record as Sent (follow-up)', () => {
        expect(reconciledStatus('Sent')).toBe('Sent');
    });

    it('passes unknown statuses through unchanged', () => {
        expect(reconciledStatus('Something Else')).toBe('Something Else');
    });
});

describe('sentReconcileEnabled', () => {
    it('is off by default (no env set)', () => {
        expect(sentReconcileEnabled({})).toBe(false);
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: undefined })).toBe(false);
    });

    it('is on only for the literal value "true" (case-insensitive)', () => {
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: 'true' })).toBe(true);
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: 'TRUE' })).toBe(true);
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: 'True' })).toBe(true);
    });

    it('treats any other value as off (safe default for a DB-writing pass)', () => {
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: '1' })).toBe(false);
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: 'yes' })).toBe(false);
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: 'on' })).toBe(false);
        expect(sentReconcileEnabled({ SENT_RECONCILE_ENABLED: 'false' })).toBe(false);
    });
});
