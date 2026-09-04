// gmailLink.js — build a deep link that opens the real Gmail conversation.
//
// Two identifiers can appear on a logged email leg:
//   • threadId  — Gmail's internal thread id, captured when the send leg goes
//     through the Gmail API. Deep-links directly:  #all/<threadId>
//   • messageId — on RECEIVED (IMAP) legs this is the true RFC Message-ID
//     header (e.g. <CAJN3Q-...@mail.gmail.com>). Gmail has no public
//     #all/ link for that, but the rfc822msgid search operator finds the
//     message and opens its whole thread.
// Sent legs recorded before Gmail-API capture (hex internal ids, not RFC
// message ids) are deliberately not used — they cannot anchor a Gmail URL.

const BASE = 'https://mail.google.com/mail/u/0/';

const gmailThreadLink = ({ threadId, messageId } = {}) => {
    if (threadId) {
        return `${BASE}#all/${encodeURIComponent(String(threadId))}`;
    }
    if (messageId) {
        const raw = String(messageId).trim();
        if (!raw) return null;
        // Gmail's rfc822msgid operator matches the bare message-id value; strip
        // any surrounding angle brackets so they are not parsed as query syntax.
        const bare = raw.replace(/^<|>$/g, '');
        if (!bare) return null;
        return `${BASE}#search/` + encodeURIComponent('rfc822msgid:' + bare);
    }
    return null;
};

// Highest-confidence link for a whole conversation: prefer a Gmail threadId on
// any leg (future Gmail-API sends); otherwise anchor on the newest received
// message's RFC Message-ID, since that reply provably sits in the mailbox and
// Gmail can resolve its thread.
const conversationGmailLink = (emails = []) => {
    if (!Array.isArray(emails) || emails.length === 0) return null;
    const withThread = emails.find((e) => e && e.threadId);
    if (withThread) return gmailThreadLink(withThread);
    const latestReceived = [...emails].reverse()
        .find((e) => e && e.direction === 'received' && e.messageId);
    if (latestReceived) return gmailThreadLink(latestReceived);
    return null;
};

export { gmailThreadLink, conversationGmailLink };
export default conversationGmailLink;
