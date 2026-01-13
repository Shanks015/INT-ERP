import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { FileText, Download, Filter, Calendar, X, BarChart3 } from 'lucide-react';

const Reports = () => {
    const [filters, setFilters] = useState({
        modules: '', // 'all' or specific module
        startDate: '',
        endDate: '',
        status: 'all',
        format: 'pdf',
        // Module-specific filters
        country: '',
        department: '',
        type: '',
        category: '',
        direction: '',
        campus: '',
        channel: ''
    });
    const [loading, setLoading] = useState(false);
    const [recordCount, setRecordCount] = useState(null);
    const [countLoading, setCountLoading] = useState(false);

    const modules = [
        { value: 'partners', label: 'Partners' },
        { value: 'campus-visits', label: 'Campus Visits' },
        { value: 'events', label: 'Events' },
        { value: 'conferences', label: 'Conferences' },
        { value: 'mou-signing-ceremonies', label: 'MoU Signing Ceremonies' },
        { value: 'scholars-in-residence', label: 'Scholars in Residence' },
        { value: 'mou-updates', label: 'MoU Updates' },
        { value: 'immersion-programs', label: 'Immersion Programs' },
        { value: 'student-exchange', label: 'Student Exchange' },
        { value: 'masters-abroad', label: 'Masters Abroad' },
        { value: 'memberships', label: 'Memberships' },
        { value: 'digital-media', label: 'Digital Media' },
        { value: 'outreach', label: 'Outreach' }
    ];

    // Module-specific filter configurations
    const moduleFilters = {
        'partners': [
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'category', label: 'Category', type: 'select', options: ['Academic', 'Industry', 'Government', 'NGO'] }
        ],
        'campus-visits': [
            { key: 'campus', label: 'Campus', type: 'select', options: ['Bangalore', 'Harihara', 'Kudremukh'] },
            { key: 'country', label: 'Country', type: 'text' }
        ],
        'events': [
            { key: 'type', label: 'Event Type', type: 'select', options: ['Conference', 'Workshop', 'Seminar', 'Cultural', 'Sports'] },
            { key: 'campus', label: 'Campus', type: 'select', options: ['Bangalore', 'Harihara', 'Kudremukh'] }
        ],
        'conferences': [
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'campus', label: 'Campus', type: 'select', options: ['Bangalore', 'Harihara', 'Kudremukh'] }
        ],
        'scholars-in-residence': [
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'department', label: 'Department', type: 'text' },
            { key: 'category', label: 'Category', type: 'select', options: ['Professor', 'Researcher', 'Student', 'Industry Expert'] }
        ],
        'mou-updates': [
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'department', label: 'Department', type: 'text' },
            { key: 'agreementType', label: 'Agreement Type', type: 'select', options: ['MoU', 'MoA', 'Collaboration Agreement'] }
        ],
        'immersion-programs': [
            { key: 'direction', label: 'Direction', type: 'select', options: ['Incoming', 'Outgoing'] },
            { key: 'country', label: 'Country', type: 'text' }
        ],
        'student-exchange': [
            { key: 'direction', label: 'Direction', type: 'select', options: ['Incoming', 'Outgoing'] },
            { key: 'country', label: 'Country', type: 'text' }
        ],
        'memberships': [
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'membershipStatus', label: 'Membership Status', type: 'select', options: ['Active', 'Expired', 'Pending Renewal'] }
        ],
        'digital-media': [
            { key: 'channel', label: 'Channel', type: 'select', options: ['Newspaper', 'TV', 'Online', 'Radio', 'Magazine'] }
        ],
        'outreach': [
            { key: 'country', label: 'Country', type: 'text' },
            { key: 'partnershipType', label: 'Partnership Type', type: 'select', options: ['Academic', 'Research', 'Industry'] }
        ]
    };

    // Quick date preset functions
    const setQuickDate = (preset) => {
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date();

        switch (preset) {
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'last3Months':
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                break;
            case 'thisYear':
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
            case 'allTime':
                startDate = new Date(2000, 0, 1);
                break;
            default:
                return;
        }

        setFilters({
            ...filters,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });
    };

    const handleModuleChange = (e) => {
        const value = e.target.value;
        // Reset module-specific filters when changing module
        setFilters({
            ...filters,
            modules: value,
            country: '',
            department: '',
            type: '',
            category: '',
            direction: '',
            campus: '',
            channel: '',
            agreementType: '',
            membershipStatus: '',
            partnershipType: ''
        });
        setRecordCount(null);
    };

    const clearFilters = () => {
        setFilters({
            modules: '',
            startDate: '',
            endDate: '',
            status: 'all',
            format: 'pdf',
            country: '',
            department: '',
            type: '',
            category: '',
            direction: '',
            campus: '',
            channel: '',
            agreementType: '',
            membershipStatus: '',
            partnershipType: ''
        });
        setRecordCount(null);
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!filters.modules || filters.modules === '') {
            return toast.error('Please select a module');
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
            link.setAttribute('download', `report-${filters.modules}-${new Date().toISOString().split('T')[0]}.${filters.format}`);
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

    // Get active module-specific filters
    const getActiveModuleFilters = () => {
        if (!filters.modules || filters.modules === 'all') return [];
        return moduleFilters[filters.modules] || [];
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Reports</h1>
                <p className="text-base-content/70 mt-2">Generate comprehensive PDF and DOCX reports with advanced filtering</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">
                                <Filter className="text-primary" size={24} />
                                Report Configuration
                            </h2>

                            <form onSubmit={handleGenerate}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                                    {/* Module Selection */}
                                    <div className="form-control md:col-span-2">
                                        <label className="label">
                                            <span className="label-text font-semibold">Select Module</span>
                                            <span className="label-text-alt text-error">*Required</span>
                                        </label>
                                        <select
                                            className="select select-bordered select-primary w-full"
                                            onChange={handleModuleChange}
                                            value={filters.modules}
                                            required
                                        >
                                            <option value="" disabled>Choose a module...</option>
                                            <option value="all">📊 All Modules (Combined Report)</option>
                                            <optgroup label="Specific Modules">
                                                {modules.map(mod => <option key={mod.value} value={mod.value}>{mod.label}</option>)}
                                            </optgroup>
                                        </select>
                                    </div>

                                    {/* Date Range with Quick Presets */}
                                    <div className="form-control md:col-span-2">
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                <Calendar size={16} className="inline mr-1" />
                                                Date Range
                                            </span>
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <button type="button" onClick={() => setQuickDate('thisMonth')} className="btn btn-sm btn-outline">This Month</button>
                                            <button type="button" onClick={() => setQuickDate('last3Months')} className="btn btn-sm btn-outline">Last 3 Months</button>
                                            <button type="button" onClick={() => setQuickDate('thisYear')} className="btn btn-sm btn-outline">This Year</button>
                                            <button type="button" onClick={() => setQuickDate('allTime')} className="btn btn-sm btn-outline">All Time</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="label"><span className="label-text-alt">From Date</span></label>
                                                <input
                                                    type="date"
                                                    className="input input-bordered w-full"
                                                    value={filters.startDate}
                                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="label"><span className="label-text-alt">To Date</span></label>
                                                <input
                                                    type="date"
                                                    className="input input-bordered w-full"
                                                    value={filters.endDate}
                                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Filter */}
                                    <div className="form-control">
                                        <label className="label"><span className="label-text font-semibold">Status</span></label>
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

                                    {/* Module-Specific Filters */}
                                    {getActiveModuleFilters().map(filter => (
                                        <div key={filter.key} className="form-control">
                                            <label className="label"><span className="label-text font-semibold">{filter.label}</span></label>
                                            {filter.type === 'select' ? (
                                                <select
                                                    className="select select-bordered"
                                                    value={filters[filter.key] || ''}
                                                    onChange={(e) => setFilters({ ...filters, [filter.key]: e.target.value })}
                                                >
                                                    <option value="">All {filter.label}s</option>
                                                    {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="input input-bordered"
                                                    placeholder={`Enter ${filter.label}`}
                                                    value={filters[filter.key] || ''}
                                                    onChange={(e) => setFilters({ ...filters, [filter.key]: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {/* Format Selection */}
                                    <div className="form-control md:col-span-2">
                                        <label className="label"><span className="label-text font-semibold">Export Format</span></label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className={`label cursor-pointer justify-start gap-3 border-2 p-4 rounded-lg transition-all ${filters.format === 'pdf' ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/50'}`}>
                                                <input
                                                    type="radio"
                                                    name="format"
                                                    className="radio radio-primary"
                                                    checked={filters.format === 'pdf'}
                                                    onChange={() => setFilters({ ...filters, format: 'pdf' })}
                                                />
                                                <FileText className="text-error" size={20} />
                                                <div>
                                                    <div className="font-semibold">PDF</div>
                                                    <div className="text-xs text-base-content/70">Adobe Reader</div>
                                                </div>
                                            </label>

                                            <label className={`label cursor-pointer justify-start gap-3 border-2 p-4 rounded-lg transition-all ${filters.format === 'docx' ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/50'}`}>
                                                <input
                                                    type="radio"
                                                    name="format"
                                                    className="radio radio-primary"
                                                    checked={filters.format === 'docx'}
                                                    onChange={() => setFilters({ ...filters, format: 'docx' })}
                                                />
                                                <FileText className="text-primary" size={20} />
                                                <div>
                                                    <div className="font-semibold">DOCX</div>
                                                    <div className="text-xs text-base-content/70">Microsoft Word</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="submit"
                                        className={`btn btn-primary flex-1 ${loading ? 'loading' : ''}`}
                                        disabled={loading}
                                    >
                                        {!loading && <Download size={20} />}
                                        {loading ? 'Generating Report...' : 'Download Report'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="btn btn-ghost"
                                    >
                                        <X size={20} />
                                        Clear
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-4">
                    {/* Filter Summary Card */}
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h3 className="card-title text-lg">
                                <BarChart3 className="text-secondary" size={20} />
                                Filter Summary
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">Module:</span>
                                    <span className="font-semibold">{filters.modules ? (filters.modules === 'all' ? 'All Modules' : modules.find(m => m.value === filters.modules)?.label) : 'Not Selected'}</span>
                                </div>
                                {filters.startDate && filters.endDate && (
                                    <div className="flex justify-between">
                                        <span className="text-base-content/70">Date Range:</span>
                                        <span className="font-semibold text-xs">{filters.startDate} to {filters.endDate}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">Status:</span>
                                    <span className="font-semibold capitalize">{filters.status === 'all' ? 'All' : filters.status.replace('_', ' ')}</span>
                                </div>
                                {Object.entries(filters).map(([key, value]) => {
                                    if (value && !['modules', 'startDate', 'endDate', 'status', 'format'].includes(key)) {
                                        return (
                                            <div key={key} className="flex justify-between">
                                                <span className="text-base-content/70 capitalize">{key}:</span>
                                                <span className="font-semibold">{value}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                                <div className="divider my-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">Format:</span>
                                    <span className="font-semibold uppercase">{filters.format}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
