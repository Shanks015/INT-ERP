// emailQuote.js — trim the quoted tail out of a received email body before
// display. Gmail-style replies come back as:
//
//     Yes
//
//     On Fri, 4 Sept, 2026, 2:37 pm Admin, <x@gmail.com> wrote:
//     > Dear Partner Team, ...
//
// The quoted original is already rendered as its own bubble in the thread, so
// showing it a second time inside the reply is pure duplication. We cut
// everything from the first *definite* quote marker onward.
//
// Safety: real reply content is never discarded. We only cut at an explicit
// quote header — the "On ..., wrote:" attribution, a forwarded/original-message
// divider, or an Outlook-style rule line followed by From:/Sent:/To:/Date:/
// Subject:. A bare ">" line is NOT treated as a start, so a body that is
// entirely quoted text (no header) falls back to showing as-is rather than
// risking an empty bubble.

const WROTE_LINE = /^On .+wrote:\s*$/i;
const FWD_MARKER = /^[-=_*#]{3,}\s*(Forwarded|Original)\s+Message/i;
const RULE_LINE = /^[-=_*#]{3,}\s*$/;
const HEADER_LINE = /^(From|Sent|To|Cc|Bcc|Subject|Date|Reply-To):/i;

const stripQuotedReply = (text = '') => {
    const raw = String(text);
    const lines = raw.split('\n');
    let cut = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (WROTE_LINE.test(line.trim()) || FWD_MARKER.test(line)) { cut = i; break; }
        // Outlook quotes: a rule of dashes/underscores immediately followed by
        // message headers. Allow one blank line between the rule and the headers.
        if (RULE_LINE.test(line.trim())) {
            const probe = lines.slice(i + 1, i + 5);
            if (probe.some((l) => HEADER_LINE.test(l.trim()))) { cut = i; break; }
        }
    }

    let kept;
    if (cut === -1) {
        kept = raw;
    } else {
        kept = lines.slice(0, cut).join('\n').replace(/[ \t]+\n/g, '\n').trimEnd();
    }

    const cleaned = kept.trim();
    // A fully-quoted or forwarded message has no lead-in to keep — show it as-is
    // rather than an empty bubble.
    return cleaned || raw.trim();
};

export { stripQuotedReply };
export default stripQuotedReply;
