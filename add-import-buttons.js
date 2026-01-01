// This script adds import functionality to all module list pages
// Run this to batch update all files

const fs = require('fs');
const path = require('path');

const modules = [
    { file: 'CampusVisits/CampusVisitsList.jsx', moduleName: 'campus-visits', title: 'Campus Visits' },
    { file: 'Events/EventsList.jsx', moduleName: 'events', title: 'Events' },
    { file: 'Conferences/ConferencesList.jsx', moduleName: 'conferences', title: 'Conferences' },
    { file: 'MouSigningCeremonies/MouSigningCeremoniesList.jsx', moduleName: 'mou-signing-ceremonies', title: 'MoU Signing Ceremonies' },
    { file: 'Scholars/ScholarsList.jsx', moduleName: 'scholars-in-residence', title: 'Scholars' },
    { file: 'MouUpdates/MouUpdatesList.jsx', moduleName: 'mou-updates', title: 'MoU Updates' },
    { file: 'ImmersionPrograms/ImmersionProgramsList.jsx', moduleName: 'immersion-programs', title: 'Immersion Programs' },
    { file: 'StudentExchange/StudentExchangeList.jsx', moduleName: 'student-exchange', title: 'Student Exchange' },
    { file: 'MastersAbroad/MastersAbroadList.jsx', moduleName: 'masters-abroad', title: 'Masters Abroad' },
    { file: 'Memberships/MembershipsList.jsx', moduleName: 'memberships', title: 'Memberships' },
    { file: 'DigitalMedia/DigitalMediaList.jsx', moduleName: 'digital-media', title: 'Digital Media' },
];

modules.forEach(mod => {
    const filePath = path.join(__dirname, 'client', 'src', 'pages', mod.file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Add Upload import
    if (!content.includes('Upload')) {
        content = content.replace(
            /from 'lucide-react';/,
            `from 'lucide-react';\nimport ImportModal from '../../components/Modal/ImportModal';`
        );
        content = content.replace(
            /(Download, Clock)/,
            '$1, Upload'
        );
    }

    // Add importModal state
    if (!content.includes('importModal')) {
        content = content.replace(
            /const \[deleteModal.*?\n/,
            `$&    const [importModal, setImportModal] = useState(false);\n`
        );
    }

    // Add import button
    if (!content.includes('setImportModal(true)')) {
        content = content.replace(
            /(<div className="flex gap-2">)/,
            `$1\n                    <button onClick={() => setImportModal(true)} className="btn btn-outline">\n                        <Upload size={18} />\n                        Import\n                    </button>`
        );
    }

    // Add ImportModal component
    if (!content.includes('<ImportModal')) {
        content = content.replace(
            /(<DeleteConfirmModal[\s\S]*?\/\>)/,
            `$1\n            <ImportModal \n                isOpen={importModal} \n                onClose={() => setImportModal(false)} \n                onSuccess={fetch${mod.title.replace(/\s/g, '')}} \n                moduleName="${mod.moduleName}" \n            />`
        );
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${mod.file}`);
});

console.log('\\n🎉 All modules updated!');
