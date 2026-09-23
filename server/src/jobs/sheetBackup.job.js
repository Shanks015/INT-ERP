// sheetBackup.job.js — daily push of every business collection into the shared
// "ERP Data Backup" Google Sheet (one tab per module). Runs once per day so
// ERP edits land on the sheet on the next tick (~within a day), matching the
// handover requirement for a one-day lag rather than a live mirror.
import cron from 'node-cron';
import { runSheetBackup, isBackupEnabled } from '../services/sheetBackupService.js';

export const runSheetBackupJob = async () => {
    if (!isBackupEnabled()) {
        console.log('[SheetBackup] Disabled via SHEET_BACKUP_ENABLED');
        return;
    }
    const started = Date.now();
    console.log(`[SheetBackup] Start ${new Date().toISOString()}`);
    try {
        const out = await runSheetBackup();
        const ok = out.results.filter((r) => r.ok);
        const bad = out.results.filter((r) => !r.ok);
        console.log(`[SheetBackup] Done in ${Date.now() - started}ms — ${ok.length} tabs ok, ${bad.length} failed → ${out.url}`);
        for (const b of bad) console.warn(`[SheetBackup]  ✗ ${b.sheet}: ${b.error}`);
    } catch (err) {
        console.error(`[SheetBackup] Failed after ${Date.now() - started}ms:`, err.message);
    }
};

// Default 03:00 IST daily (after the 02:00 follow-up cron). Override with
// SHEET_BACKUP_CRON / SHEET_BACKUP_TIMEZONE in server config.
export const startSheetBackupJob = () => {
    if (!isBackupEnabled()) {
        console.log('⚠️ [SheetBackup] Job not registered (SHEET_BACKUP_ENABLED=false)');
        return;
    }
    const expr = process.env.SHEET_BACKUP_CRON || '0 3 * * *';
    const tz = process.env.SHEET_BACKUP_TIMEZONE || 'Asia/Kolkata';
    if (!cron.validate(expr)) {
        console.warn(`⚠️ [SheetBackup] Invalid cron "${expr}" — falling back to 0 3 * * *`);
    }
    cron.schedule(cron.validate(expr) ? expr : '0 3 * * *', runSheetBackupJob, { timezone: tz });
    console.log(`✅ Sheets backup cron registered (${cron.validate(expr) ? expr : '0 3 * * *'} ${tz})`);
};
