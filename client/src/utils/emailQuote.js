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
// everything from the first quote marker onward, and fall back to the raw text
// if the trim would leave nothing (e.g. a pure forward, which is all quote).

// True when a line begins a quoted block. Deliberately conservative: only
// unambiguous quote markers, so a body that legitimately starts "From: ..."
// or contains ">" mid-text is left alone unless it clearly reads as a quote.
const QUOTE_START = /^(\s*>\s*|On .+wrote:\s*$|^[-=*_]{3,}\s*(Forwarded|Original|Reply)\s+Message|^----------\s*Forwarded message\s*----------)/im;

export const stripQuotedReply = (text = '') => {
    const raw = String(text);
    const lines = raw.split('\n');
    const cut = lines.findIndex((line) => QUOTE_START.test(line));

    let kept;
    if (cut === -1) {
        kept = raw;
    } else {
        // Keep content above the quote. Drop a trailing blank line that
        // separates the real message from the quoted block.
        kept = lines.slice(0, cut).join('\n').replace(/[ \t]+\n/g, '\n').trimEnd();
    }

    const cleaned = kept.trim();
    // A fully-quoted or forwarded message has no lead-in to keep — show it as-is
    // rather than an empty bubble.
    return cleaned || raw.trim();
};

export default stripQuotedReply;
