import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { driveUpload } from '../middleware/driveUpload.js';
import * as driveController from '../controllers/drive.controller.js';

const router = express.Router();

// No public routes: the office-account credential is set in server config
// (driveService.getAccessToken), so there is no OAuth callback or connect flow
// to expose. Everything below requires an approved ERP user.
router.use(authenticate);

router.get('/status',                       driveController.getDriveStatus);

// Per-record file operations (any approved user may upload/list; delete is
// gated in the controller to admin-or-uploader).
router.get('/:module/:recordId',               driveController.getRecordFiles);
router.post('/:module/:recordId/files',        driveUpload, driveController.uploadRecordFiles);
router.delete('/:module/:recordId/files/:fileId', driveController.deleteRecordFile);

export default router;
