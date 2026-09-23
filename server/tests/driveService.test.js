import { describe, it, expect, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import {
    DRIVE_MODULES,
    ROOT_FOLDER_NAME,
    parseFolderRef,
    sanitizeFolderName,
    yearBucket,
    monthBucket,
    folderUrl,
    isDriveConfigured,
    buildServiceAccountJwt,
    getAccessToken
} from '../src/services/driveService.js';

// driveService never connects to Mongo (its Drive REST fetchers are thin fetch
// wrappers exercised live in local verify), so the pure helpers + credential
// layer are safe to test standalone — same posture as the other service tests.
// Credential tests stub every Drive env var so they are deterministic regardless
// of what a developer has in their local .env / shell.

afterEach(() => {
    vi.unstubAllEnvs();
});

const stripDriveEnv = () => {
    vi.stubEnv('GOOGLE_DRIVE_REFRESH_TOKEN', '');
    vi.stubEnv('GOOGLE_DRIVE_SERVICE_ACCOUNT', '');
    vi.stubEnv('GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE', '');
    vi.stubEnv('GOOGLE_DRIVE_IMPERSONATE', '');
};

describe('parseFolderRef — distinguish a folder link from a file link', () => {
    it('recognises a Drive folder URL', () => {
        expect(parseFolderRef('https://drive.google.com/drive/folders/1AbCdEfGh1234567XY?usp=sharing'))
            .toEqual({ kind: 'folder', id: '1AbCdEfGh1234567XY' });
    });

    it('recognises a Drive file URL (not a container)', () => {
        expect(parseFolderRef('https://drive.google.com/file/d/1XY_za-bcdEFGHijKLMnop/view'))
            .toEqual({ kind: 'file', id: '1XY_za-bcdEFGHijKLMnop' });
    });

    it('returns null for garbage, empties and non-Drive URLs', () => {
        expect(parseFolderRef('')).toBeNull();
        expect(parseFolderRef(null)).toBeNull();
        expect(parseFolderRef('https://example.com/somewhere')).toBeNull();
        expect(parseFolderRef('random text')).toBeNull();
    });
});

describe('sanitizeFolderName — Drive-safe record folder names', () => {
    it('removes Drive-forbidden punctuation', () => {
        // / * : ? " < > | \ each become a space; runs collapse to one.
        expect(sanitizeFolderName('MoU / Update* with: Q?" <Tag> |pipe\\back'))
            .toBe('MoU Update with Q Tag pipe back');
    });

    it('collapses whitespace and trims dots at the ends', () => {
        expect(sanitizeFolderName('  A  B   C  ')).toBe('A B C');
        expect(sanitizeFolderName('..leading and trailing..')).toBe('leading and trailing');
    });

    it('falls back to "Record" for an empty/garbage name', () => {
        expect(sanitizeFolderName('')).toBe('Record');
        expect(sanitizeFolderName(null)).toBe('Record');
        expect(sanitizeFolderName('///')).toBe('Record');
    });

    it('caps length at 80 characters', () => {
        expect(sanitizeFolderName('x'.repeat(200)).length).toBe(80);
    });
});

describe('yearBucket / monthBucket — <YYYY> / <MMM> path segments', () => {
    it('splits a date into UTC year and month folders (matches the dd/MMM policy)', () => {
        expect(yearBucket(new Date(Date.UTC(2026, 8, 15)))).toBe('2026');
        expect(monthBucket(new Date(Date.UTC(2026, 8, 15)))).toBe('Sep');
        expect(yearBucket(new Date(Date.UTC(2025, 0, 3)))).toBe('2025');
        expect(monthBucket(new Date(Date.UTC(2025, 0, 3)))).toBe('Jan');
        expect(yearBucket('2026-11-02T00:00:00.000Z')).toBe('2026');
        expect(monthBucket('2026-11-02T00:00:00.000Z')).toBe('Nov');
    });

    it('falls back to the current year/month for a missing/invalid date', () => {
        expect(yearBucket(null)).toBe(String(new Date().getUTCFullYear()));
        const fallback = monthBucket(null);
        expect(fallback).toMatch(/^[A-Z][a-z]{2}$/);
        const now = new Date();
        const expected = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getUTCMonth()];
        expect(fallback).toBe(expected);
    });
});

describe('credential layer — env config, no DB, inert when absent', () => {
    it('is not configured when the server has neither credential source', () => {
        stripDriveEnv();
        expect(isDriveConfigured()).toBe(false);
    });

    it('is configured when GOOGLE_DRIVE_REFRESH_TOKEN is set (Option A)', () => {
        stripDriveEnv();
        vi.stubEnv('GOOGLE_DRIVE_REFRESH_TOKEN', '1//dummy-refresh-token');
        expect(isDriveConfigured()).toBe(true);
    });

    it('is configured when a service-account key is set inline (Option B)', () => {
        stripDriveEnv();
        vi.stubEnv('GOOGLE_DRIVE_SERVICE_ACCOUNT', JSON.stringify({
            type: 'service_account',
            client_email: 'erp@project.iam.gserviceaccount.com',
            private_key: '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n'
        }));
        expect(isDriveConfigured()).toBe(true);
    });

    it('ignores a malformed / key-less service-account env string', () => {
        stripDriveEnv();
        vi.stubEnv('GOOGLE_DRIVE_SERVICE_ACCOUNT', 'not json at all');
        expect(isDriveConfigured()).toBe(false);
        vi.stubEnv('GOOGLE_DRIVE_SERVICE_ACCOUNT', JSON.stringify({ client_email: 'x@y' })); // no private_key
        expect(isDriveConfigured()).toBe(false);
    });

    it('getAccessToken rejects with DRIVE_NOT_CONFIGURED when no source is set', async () => {
        stripDriveEnv();
        await expect(getAccessToken()).rejects.toMatchObject({ code: 'DRIVE_NOT_CONFIGURED' });
    });
});

describe('buildServiceAccountJwt — RS256 assertion for the JWT-bearer grant', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    const decode = (seg) => JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'));

    it('signs a header + claims the token endpoint will accept', () => {
        const jwt = buildServiceAccountJwt({
            clientEmail: 'erp@project.iam.gserviceaccount.com',
            privateKey,
            subject: 'office@example.edu',
            nowSec: 1_700_000_000
        });
        const [h, c, s] = jwt.split('.');
        expect(h && c && s).toBeTruthy();

        // Header: RS256 JWT.
        expect(decode(h)).toEqual({ alg: 'RS256', typ: 'JWT' });

        // Claims: acting service account, impersonated office user, Drive scope,
        // one-hour lifetime anchored to the injected now.
        const claims = decode(c);
        expect(claims.iss).toBe('erp@project.iam.gserviceaccount.com');
        expect(claims.sub).toBe('office@example.edu');
        expect(claims.scope).toBe('https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets');
        expect(claims.aud).toBe('https://oauth2.googleapis.com/token');
        expect(claims.iat).toBe(1_700_000_000);
        expect(claims.exp).toBe(1_700_000_000 + 3600);

        // Signature actually verifies with the matching public key.
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${h}.${c}`);
        expect(verifier.verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
    });

    it('omits sub when no subject is given (plain service account)', () => {
        const jwt = buildServiceAccountJwt({
            clientEmail: 'erp@project.iam.gserviceaccount.com',
            privateKey,
            nowSec: 1_700_000_000
        });
        const claims = decode(jwt.split('.')[1]);
        expect(claims.iss).toBe('erp@project.iam.gserviceaccount.com');
        expect('sub' in claims).toBe(false);
    });

    it('allows overriding scope/audience', () => {
        const jwt = buildServiceAccountJwt({
            clientEmail: 'erp@project.iam.gserviceaccount.com',
            privateKey,
            scope: 'https://www.googleapis.com/auth/drive.file',
            audience: 'https://custom.example/token',
            nowSec: 1_700_000_000
        });
        const claims = decode(jwt.split('.')[1]);
        expect(claims.scope).toBe('https://www.googleapis.com/auth/drive.file');
        expect(claims.aud).toBe('https://custom.example/token');
    });
});

describe('DRIVE_MODULES — scope/coverage guard', () => {
    // Every slug in the map must resolve to a model file that actually carries a
    // driveLink field. A drive module added to the client without the model, or
    // a driveLink renamed, fails here instead of at runtime.
    it('maps every drive module to a model with a driveLink path', async () => {
        for (const [slug, cfg] of Object.entries(DRIVE_MODULES)) {
            const { default: Model } = await import(`../src/models/${cfg.model}.js`);
            expect(Model.schema.paths.driveLink, `model ${cfg.model} (slug ${slug}) must have driveLink`).toBeDefined();
        }
    }, 30_000); // each model file is a fresh Mongoose import — give the 14-file loop room

    it('covers the full drive-module set and names each folder label uniquely', () => {
        const slugs = Object.keys(DRIVE_MODULES);
        expect(slugs.length).toBeGreaterThanOrEqual(13);
        const labels = Object.values(DRIVE_MODULES).map((c) => c.folderLabel);
        expect(new Set(labels).size).toBe(labels.length); // no two modules share a folder
        expect(ROOT_FOLDER_NAME).toBe('ERP-Automation');
    });

    it('every config has a non-empty labelKeys and a usable bucket name', () => {
        for (const cfg of Object.values(DRIVE_MODULES)) {
            expect(cfg.labelKeys.length).toBeGreaterThan(0);
            expect(String(cfg.folderLabel).trim().length).toBeGreaterThan(0);
            expect(folderUrl('dummy-id')).toBe('https://drive.google.com/drive/folders/dummy-id');
        }
    });
});
