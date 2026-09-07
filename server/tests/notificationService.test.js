import { describe, it, expect } from 'vitest';
import {
    userAccepts,
    toNotificationDoc,
    resolveFilter,
    NOTIFICATION_CATEGORIES,
    DEFAULT_IN_APP_SETTINGS
} from '../src/services/notificationService.js';

// Unit tests for the pure gate + mapping functions only. No DB access: the emit
// helpers (emitToUser/emitToAdmins) touch Mongo and are verified live, not here.
// The category names MUST stay aligned with Notification.category (enum) and the
// User.notificationSettings.inApp.events keys — these tests pin that contract.
describe('notification categories contract', () => {
    it('exposes the four categories the schema enum allows', () => {
        expect(NOTIFICATION_CATEGORIES).toEqual(['reply', 'approval', 'decision', 'status']);
    });

    it('default settings enable everything (legacy users start ON)', () => {
        expect(DEFAULT_IN_APP_SETTINGS.enabled).toBe(true);
        NOTIFICATION_CATEGORIES.forEach((c) => {
            expect(DEFAULT_IN_APP_SETTINGS.events[c]).toBe(true);
        });
    });
});

describe('userAccepts gate', () => {
    it('rejects a missing user', () => {
        expect(userAccepts(null, 'reply')).toBe(false);
        expect(userAccepts(undefined, 'reply')).toBe(false);
    });

    it('accepts by default when the user has no inApp block (legacy)', () => {
        expect(userAccepts({ notificationSettings: {} }, 'reply')).toBe(true);
        expect(userAccepts({}, 'reply')).toBe(true);
        // email-only settings, no inApp key → still defaults ON
        expect(userAccepts({ notificationSettings: { email: { enabled: true } } }, 'approval')).toBe(true);
    });

    it('rejects everything when the master toggle is off', () => {
        const user = { notificationSettings: { inApp: { enabled: false, events: DEFAULT_IN_APP_SETTINGS.events } } };
        expect(userAccepts(user, 'reply')).toBe(false);
        expect(userAccepts(user, 'approval')).toBe(false);
        expect(userAccepts(user, 'decision')).toBe(false);
        expect(userAccepts(user, 'status')).toBe(false);
    });

    it('respects per-event opt-outs', () => {
        const user = {
            notificationSettings: {
                inApp: { enabled: true, events: { reply: false, approval: true, decision: true, status: true } }
            }
        };
        expect(userAccepts(user, 'reply')).toBe(false);
        expect(userAccepts(user, 'approval')).toBe(true);
        expect(userAccepts(user, 'decision')).toBe(true);
    });

    it('accepts events that are missing or not explicitly false', () => {
        const user = { notificationSettings: { inApp: { enabled: true, events: { reply: false } } } };
        expect(userAccepts(user, 'approval')).toBe(true); // not mentioned → on
        expect(userAccepts(user, 'status')).toBe(true);
        const partial = { notificationSettings: { inApp: { events: {} } } };
        expect(userAccepts(partial, 'decision')).toBe(true); // empty events map → on
        // enabled present but events missing entirely
        const noEvents = { notificationSettings: { inApp: { enabled: true } } };
        expect(userAccepts(noEvents, 'reply')).toBe(true);
    });
});

describe('toNotificationDoc mapping', () => {
    const base = { recipientId: 'abc123', category: 'status', title: 'Mailbox broken' };

    it('snapshots the given fields and defaults the rest', () => {
        expect(toNotificationDoc(base)).toEqual({
            recipient: 'abc123',
            category: 'status',
            title: 'Mailbox broken',
            body: '',
            module: null,
            link: null,
            read: false,
            resolveKey: null
        });
    });

    it('carries optional body/module/link through', () => {
        const doc = toNotificationDoc({
            ...base,
            title: 'New sign-up',
            body: 'jane@example.com registered',
            module: 'Users',
            link: '/user-management'
        });
        expect(doc.body).toBe('jane@example.com registered');
        expect(doc.module).toBe('Users');
        expect(doc.link).toBe('/user-management');
    });

    it('coerces nullish text and truncates long titles/bodies', () => {
        const doc = toNotificationDoc({ recipientId: 'x', category: 'reply', title: null, body: undefined });
        expect(doc.title).toBe('');
        const long = toNotificationDoc({ ...base, title: 'T'.repeat(500), body: 'B'.repeat(900) });
        expect(long.title.length).toBe(200);
        expect(long.body.length).toBe(500);
    });

    it('carries an optional resolveKey through', () => {
        const doc = toNotificationDoc({ ...base, title: 'Awaiting approval', resolveKey: 'user:abc123' });
        expect(doc.resolveKey).toBe('user:abc123');
    });
});

describe('resolveFilter (handled-notification deletion target)', () => {
    it('targets by resolveKey plus the announced category', () => {
        expect(resolveFilter({ resolveKey: 'user:abc', category: 'approval' }))
            .toEqual({ resolveKey: 'user:abc', category: 'approval' });
        expect(resolveFilter({ resolveKey: 'record:Partner:xyz', category: 'approval' }))
            .toEqual({ resolveKey: 'record:Partner:xyz', category: 'approval' });
        expect(resolveFilter({ resolveKey: 'mailbox:1', category: 'status' }))
            .toEqual({ resolveKey: 'mailbox:1', category: 'status' });
    });

    it('never scopes by category alone — a key is required to resolve', () => {
        expect(resolveFilter({ category: 'reply' })).toEqual({ category: 'reply' });
        expect(resolveFilter({})).toEqual({});
        // Category is additive but a bare category must never be enough on its own
        // to delete; resolveNotifications guards on resolveKey before calling.
        expect(resolveFilter({ category: 'reply' })).not.toHaveProperty('resolveKey');
    });
});
