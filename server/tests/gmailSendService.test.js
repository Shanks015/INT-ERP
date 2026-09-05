import { describe, it, expect } from 'vitest';
import { buildRawMessage } from '../src/services/gmailSendService.js';

// buildRawMessage returns a base64url-encoded RFC-822 message. Decode it back
// to raw text and expose the header block so tests can assert threading headers.
const decode = (b64) => Buffer.from(b64, 'base64url').toString('utf8');

const baseArgs = {
    fromName: 'Dr. Jane',
    from: 'jane@university.edu',
    to: 'partner@college.edu',
    subject: 'Re: Academic Collaboration',
    html: '<p>Hello</p>'
};

const headerOf = (raw, name) => {
    // Headers end at the first blank line.
    const headerBlock = raw.slice(0, raw.indexOf('\r\n\r\n'));
    const lines = headerBlock.split('\r\n');
    const val = [];
    for (const line of lines) {
        if (line.startsWith(`${name}:`)) {
            val.push(line.slice(name.length + 1).trim());
        }
    }
    return val;
};

describe('buildRawMessage — reply threading headers', () => {
    it('omits In-Reply-To/References for a first-contact send (fresh thread)', () => {
        const raw = decode(buildRawMessage(baseArgs));
        expect(headerOf(raw, 'In-Reply-To')).toHaveLength(0);
        expect(headerOf(raw, 'References')).toHaveLength(0);
    });

    it('emits In-Reply-To and a single References when replying to a parent', () => {
        const raw = decode(buildRawMessage({ ...baseArgs, inReplyTo: 'parent-id@partner.edu' }));
        expect(headerOf(raw, 'In-Reply-To')).toEqual(['<parent-id@partner.edu>']);
        expect(headerOf(raw, 'References')).toEqual(['<parent-id@partner.edu>']);
    });

    it('keeps an already-bracketed Message-ID as-is', () => {
        const raw = decode(buildRawMessage({ ...baseArgs, inReplyTo: '<bracketed@partner.edu>' }));
        expect(headerOf(raw, 'In-Reply-To')).toEqual(['<bracketed@partner.edu>']);
    });

    it('appends explicit References entries after the parent id when provided', () => {
        const raw = decode(buildRawMessage({
            ...baseArgs,
            inReplyTo: 'parent@partner.edu',
            references: ['root@partner.edu']
        }));
        expect(headerOf(raw, 'In-Reply-To')).toEqual(['<parent@partner.edu>']);
        expect(headerOf(raw, 'References')).toEqual(['<root@partner.edu> <parent@partner.edu>']);
    });

    it('still builds a normal message (From/To/Subject, HTML part) when threading is set', () => {
        const raw = decode(buildRawMessage({ ...baseArgs, inReplyTo: 'parent@partner.edu' }));
        expect(raw).toContain('From: "Dr. Jane" <jane@university.edu>');
        expect(raw).toContain('To: partner@college.edu');
        expect(raw).toContain('Subject: Re: Academic Collaboration');
        expect(raw).toContain('Content-Type: text/html; charset="UTF-8"');
    });
});
