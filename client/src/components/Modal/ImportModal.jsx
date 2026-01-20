import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { Upload, X, FileSpreadsheet, AlertCircle } from 'lucide-react';

const ImportModal = ({ isOpen, onClose, onSuccess, moduleName }) => {
    const [file, setFile] = useState(null);
    const [module, setModule] = useState(moduleName || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (moduleName) setModule(moduleName);
    }, [moduleName]);

    const modules = [
        { value: 'partners', label: 'Partners' },
        { value: 'campus-visits', label: 'Campus Visits' },
        { value: 'events', label: 'Events' },
        { value: 'conferences', label: 'Conferences' },
        { value: 'mou-signing-ceremonies', label: 'MoU Signing Ceremonies' },
        { value: 'scholars-in-residence', label: 'Scholars' },
        { value: 'mou-updates', label: 'MoU Updates' },
        { value: 'immersion-programs', label: 'Immersion Programs' },
        { value: 'student-exchange', label: 'Student Exchange' },
        { value: 'masters-abroad', label: 'Masters Abroad' },
        { value: 'memberships', label: 'Memberships' },
        { value: 'digital-media', label: 'Digital Media' },
        { value: 'outreach', label: 'Outreach' },
    ];

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !module) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Determine endpoint based on module
            let endpoint = `/import/${module}`;
            // Use custom endpoint for outreach to handle specific field mapping
            if (module === 'outreach') {
                endpoint = '/outreach/import-csv';
            }

            const response = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(response.data.message);
            setResult({ success: true, message: response.data.message, count: response.data.count });
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Import failed');
            setResult({ success: false, message: error.response?.data?.message || 'Import failed' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <button onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2"><X size={20} /></button>
                <h3 className="font-bold text-lg mb-4">Import Data (CSV or Excel)</h3>

                {!result ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Select Module</span></label>
                            <select
                                className="select select-bordered"
                                value={module}
                                onChange={(e) => setModule(e.target.value)}
                                required
                                disabled={!!moduleName}
                            >
                                <option value="">Select a module...</option>
                                {modules.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Select File (CSV/Excel)</span></label>
                            <input
                                type="file"
                                className="file-input file-input-bordered w-full"
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileChange}
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt text-base-content/60">
                                    <AlertCircle size={14} className="inline mr-1" />
                                    Ensure file columns match the template
                                </span>
                            </label>
                        </div>

                        <div className="modal-action">
                            <button
                                type="submit"
                                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                                disabled={loading || !file || !module}
                            >
                                {!loading && <Upload size={18} className="mr-2" />}
                                Import Data
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-6">
                        <div className={`text-5xl mb-4 ${result.success ? 'text-success' : 'text-error'}`}>
                            {result.success ? '🎉' : '❌'}
                        </div>
                        <h4 className="text-xl font-bold mb-2">{result.success ? 'Import Successful' : 'Import Failed'}</h4>
                        <p className="mb-6">{result.message}</p>
                        <button
                            onClick={() => { setResult(null); setFile(null); }}
                            className="btn btn-outline mr-2"
                        >
                            Import Another
                        </button>
                        <button onClick={onClose} className="btn btn-primary">Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportModal;
