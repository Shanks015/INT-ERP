#!/usr/bin/env node

/**
 * Module Generator Script
 * This script can be used to quickly generate new module pages
 * following the established pattern
 */

const modules = {
    'MouSigningCeremony': {
        path: 'mou-signing-ceremonies',
        fields: ['date', 'type', 'visitorName', 'universityName', 'department', 'eventSummary', 'campus'],
        required: ['date', 'visitorName', 'universityName'],
        displayName: 'MoU Signing Ceremony'
    },
    'ScholarInResidence': {
        path: 'scholars-in-residence',
        fields: ['scholarName', 'country', 'department', 'fromDate', 'toDate'],
        required: ['scholarName', 'country', 'fromDate', 'toDate'],
        displayName: 'Scholar in Residence'
    },
    'MouUpdate': {
        path: 'mou-updates',
        fields: ['date', 'university', 'country', 'contactPerson', 'contactEmail', 'mouStatus', 'validityStatus'],
        required: ['date', 'university', 'country'],
        displayName: 'MoU Update'
    },
    'ImmersionProgram': {
        path: 'immersion-programs',
        fields: ['direction', 'programStatus', 'university', 'country', 'numberOfPax', 'department', 'arrivalDate', 'departureDate'],
        required: ['direction', 'university', 'country'],
        displayName: 'Immersion Program'
    },
    'StudentExchange': {
        path: 'student-exchange',
        fields: ['direction', 'studentName', 'exchangeUniversity', 'course', 'semesterYear', 'exchangeStatus'],
        required: ['direction', 'studentName', 'exchangeUniversity'],
        displayName: 'Student Exchange'
    },
    'MastersAbroad': {
        path: 'masters-abroad',
        fields: ['studentName', 'country', 'university', 'courseStudying', 'courseTenure', 'usnNumber', 'cgpa', 'schoolOfStudy'],
        required: ['studentName', 'country', 'university'],
        displayName: 'Masters Abroad'
    },
    'Membership': {
        path: 'memberships',
        fields: ['date', 'name', 'membershipStatus', 'country', 'membershipDuration'],
        required: ['date', 'name'],
        displayName: 'Membership'
    },
    'DigitalMedia': {
        path: 'digital-media',
        fields: ['date', 'type', 'title', 'link', 'reach'],
        required: ['date', 'title'],
        displayName: 'Digital Media'
    }
};

console.log('Module configurations ready for:', Object.keys(modules).length, 'modules');
console.log('Modules:', Object.keys(modules).join(', '));
