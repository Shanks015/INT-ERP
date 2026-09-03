// Consolidated admin pending counts.
//
// MainLayout's bell + sidebar badges currently fan out to 15 module
// `/pending/all` endpoints (each shipping full documents) plus a users query —
// ~16 HTTP round trips serialized by the browser's per-host connection pool.
// This endpoint replaces all of them with a single round trip of cheap
// countDocuments calls, returning identical numbers: every module below uses
// the same maker-checker status filter as its `/pending/count` controller
// (see generic.controller.js getPendingCount / getAllPending).
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import CampusVisit from '../models/CampusVisit.js';
import Seminar from '../models/Seminar.js';
import ConsultantVisit from '../models/ConsultantVisit.js';
import Event from '../models/Event.js';
import Conference from '../models/Conference.js';
import MouSigningCeremony from '../models/MouSigningCeremony.js';
import ScholarInResidence from '../models/ScholarInResidence.js';
import MouUpdate from '../models/MouUpdate.js';
import ImmersionProgram from '../models/ImmersionProgram.js';
import StudentExchange from '../models/StudentExchange.js';
import MastersAbroad from '../models/MastersAbroad.js';
import Membership from '../models/Membership.js';
import DigitalMedia from '../models/DigitalMedia.js';
import SocialMedia from '../models/SocialMedia.js';
import Outreach from '../models/Outreach.js';
import MeetingTracker from '../models/MeetingTracker.js';

const PENDING_FILTER = { status: { $in: ['pending_edit', 'pending_delete'] } };

// Keys match the badge modules in client/src/layouts/MainLayout.jsx.
const BADGE_MODULES = [
    { key: 'partners', Model: Partner },
    { key: 'campus-visits', Model: CampusVisit },
    { key: 'seminars', Model: Seminar },
    { key: 'consultant-visits', Model: ConsultantVisit },
    { key: 'events', Model: Event },
    { key: 'conferences', Model: Conference },
    { key: 'mou-signing-ceremonies', Model: MouSigningCeremony },
    { key: 'scholars-in-residence', Model: ScholarInResidence },
    { key: 'mou-updates', Model: MouUpdate },
    { key: 'immersion-programs', Model: ImmersionProgram },
    { key: 'student-exchange', Model: StudentExchange },
    { key: 'masters-abroad', Model: MastersAbroad },
    { key: 'memberships', Model: Membership },
    { key: 'digital-media', Model: DigitalMedia },
    { key: 'social-media', Model: SocialMedia },
    { key: 'outreach', Model: Outreach },
    { key: 'meeting-trackers', Model: MeetingTracker }
];

export const getPendingCounts = async (req, res) => {
    try {
        const [pendingUsers, ...moduleCounts] = await Promise.all([
            User.countDocuments({ approvalStatus: 'pending' }),
            ...BADGE_MODULES.map(({ Model }) => Model.countDocuments(PENDING_FILTER))
        ]);

        const byModule = {};
        let total = 0;
        BADGE_MODULES.forEach(({ key }, i) => {
            byModule[key] = moduleCounts[i];
            total += moduleCounts[i];
        });

        res.json({ success: true, pendingUsers, total, byModule });
    } catch (error) {
        console.error('Error fetching pending counts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending counts',
            error: error.message
        });
    }
};
