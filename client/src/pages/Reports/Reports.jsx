import { useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { FileText, Download, Filter, Calendar } from 'lucide-react';

const Reports = () => {
    const [filters, setFilters] = useState({
        modules: [], // 'all' or array
        startDate: '',
        endDate: '',
        status: 'all',
        format: 'pdf'
    });
    const [loading, setLoading] = useState(false);

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
    ];

    const handleModuleChange = (e) => {
        const value = e.target.value;
        // Handle multi-select logic or single select first
        // For simplicity given usage, let's allow 'all' or specific single for now, 
        // or we can implement a multi-select UI. Prompt asked for "user can select a particular module also".
        // Let's assume selecting multiple might be complex UI, so implementing "All" or "One" is safe first step.
        if (value === 'all') {
            setFilters({ ...filters, modules: 'all' });
        } else {
            setFilters({ ...filters, modules: [value] });
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!filters.modules || (filters.modules !== 'all' && filters.modules.length === 0)) {
            return toast.error('Please select at least one module');
        }

        setLoading(true);
        try {
            const response = await api.post('/reports/generate', filters, {
                responseType: 'blob'
            });

            const fileType = filters.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const url = window.URL.createObjectURL(new Blob([response.data], { type: fileType }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${new Date().toISOString().split('T')[0]}.${filters.format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Report generated successfully');
        } catch (error) {
            toast.error('Error generating report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Reports</h1>
                <p className="text-base-content/70 mt-2">Generate comprehensive PDF and DOCX reports</p>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-4xl">
                <div className="card-body">
                    <form onSubmit={handleGenerate}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Module Selection */}
                            <div className="form-control">
                                <label className="label"><span className="label-text font-bold"><Filter size={16} className="inline mr-2" />Modules</span></label>
                                <select
                                    className="select select-bordered w-full"
                                    onChange={handleModuleChange}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select Module Scope</option>
                                    <option value="all">Check All Modules</option>
                                    <optgroup label="Specific Module">
                                        {modules.map(mod => <option key={mod.value} value={mod.value}>{mod.label}</option>)}
                                    </optgroup>
                                </select>
                                <label className="label"><span className="label-text-alt">Select 'Check All Modules' for a combined report</span></label>
                            </div>

                            {/* Status Filter */}
                            <div className="form-control">
                                <label className="label"><span className="label-text font-bold">Status</span></label>
                                <select
                                    className="select select-bordered"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active Only</option>
                                    <option value="pending_edit">Pending Edit</option>
                                    <option value="pending_delete">Pending Delete</option>
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="form-control">
                                <label className="label"><span className="label-text font-bold"><Calendar size={16} className="inline mr-2" />From Date</span></label>
                                <input
                                    type="date"
                                    className="input input-bordered"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label"><span className="label-text font-bold"><Calendar size={16} className="inline mr-2" />To Date</span></label>
                                <input
                                    type="date"
                                    className="input input-bordered"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                />
                            </div>

                            {/* Format Selection */}
                            <div className="form-control md:col-span-2">
                                <label className="label"><span className="label-text font-bold">Format</span></label>
                                <div className="flex gap-4">
                                    <label className="label cursor-pointer justify-start gap-2 border p-3 rounded-lg flex-1 hover:bg-base-200">
                                        <input
                                            type="radio"
                                            name="format"
                                            className="radio radio-primary"
                                            checked={filters.format === 'pdf'}
                                            onChange={() => setFilters({ ...filters, format: 'pdf' })}
                                        />
                                        <FileText className="text-error" />
                                        <span className="font-medium">Adobe PDF (.pdf)</span>
                                    </label>

                                    <label className="label cursor-pointer justify-start gap-2 border p-3 rounded-lg flex-1 hover:bg-base-200">
                                        <input
                                            type="radio"
                                            name="format"
                                            className="radio radio-primary"
                                            checked={filters.format === 'docx'}
                                            onChange={() => setFilters({ ...filters, format: 'docx' })}
                                        />
                                        <FileText className="text-primary" />
                                        <span className="font-medium">Microsoft Word (.docx)</span>
                                    </label>
                                </div>
                            </div>

                        </div>

                        <div className="form-control mt-8">
                            <button
                                type="submit"
                                className={`btn btn-primary btn-lg ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {!loading && <Download size={20} className="mr-2" />}
                                {loading ? 'Generating Report...' : 'Download Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Reports;
