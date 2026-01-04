import Outreach from '../models/Outreach.js';
import {
    getAll,
    getById,
    create,
    update,
    remove,
    approve,
    reject,
    exportCSV
} from './generic.controller.js';
import { getEnhancedStats } from './enhancedStats.controller.js';

export const getAllOutreach = getAll(Outreach);
export const getOutreachById = getById(Outreach);
export const createOutreach = create(Outreach);
export const updateOutreach = update(Outreach);
export const deleteOutreach = remove(Outreach);
export const approveOutreach = approve(Outreach);
export const rejectOutreach = reject(Outreach);
export const exportOutreachCSV = exportCSV(Outreach);
export const getOutreachStats = getEnhancedStats(Outreach);
