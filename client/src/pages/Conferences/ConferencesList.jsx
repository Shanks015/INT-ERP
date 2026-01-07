import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Users, TrendingUp, Clock, Eye, Globe, Building2, X, Search, FileText } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import Pagination from '../../components/Pagination';

const ConferencesList = () => {
    const { isAdmin } = useAuth();
    const [conferences, setConferences] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, departments: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState({ search: '', country: '', conferenceType: '', startDate: '', endDate: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    // Dynamic filter data
    const [countries, setCountries] = useState([]);
    const [conferenceTypes, setConferenceTypes] = useState([]);

    useEffect(() => { fetchConferences(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.country, filters.conferenceType, filters.startDate, filters.endDate]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/conferences/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/conferences', { params: { limit: 1000 } });
            const conferences = response.data.data || [];

            const uniqueCountries = [...new Set(conferences.map(c => c.country).filter(Boolean))].sort();
            setCountries(uniqueCountries);

            const uniqueTypes = [...new Set(conferences.map(c => c.conferenceType).filter(Boolean))].sort();
            setConferenceTypes(uniqueTypes);
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchCountries = async () => {
        try {
            const response = await api.get('/conferences', { params: { limit: 1000 } });
            const confs = response.data.data || [];
            const uniqueCountries = [...new Set(confs.map(c => c.country).filter(Boolean))].sort();
            setCountries(uniqueCountries);
        } catch (error) { console.error('Error fetching countries:', error); }
    };

    const fetchConferences = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/conferences', { params });
            setConferences(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching conferences'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/conferences/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Conference deleted successfully' : 'Delete request submitted');
            fetchConferences(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting conference'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/conferences/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'conferences-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setFilters({ search: '', country: '', conferenceType: '', startDate: '', endDate: '' });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Conferences</h1><p className="text-base-content/70 mt-2">Manage conference records</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/conferences/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Conference</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Conferences" value={stats.total} icon={Users} color="primary" />
                <StatsCard title="Countries" value={stats.countries} icon={Globe} color="secondary" />
                <StatsCard title="Departments" value={stats.departments} icon={Building2} color="info" />
            </div>

            {/* Custom Filters */}
            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2"><X size={16} /> Clear All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input type="text" placeholder="Search conference, country..." className="input input-bordered w-full pr-10" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        {/* Country Filter */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Country</span></label>
                            <select className="select select-bordered w-full" value={filters.country || ''} onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}>
                                <option value="">All Countries</option>
                                {countries.map(country => <option key={country} value={country}>{country}</option>)}
                            </select>
                        </div>

                        {/* Conference Type Filter */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Conference Type</span></label>
                            <select
                                className="select select-bordered w-full"
                                value={filters.conferenceType || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, conferenceType: e.target.value }))}
                            >
                                <option value="">All Types</option>
                                {conferenceTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* From Date */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">From Date</span></label>
                            <input type="date" className="input input-bordered w-full" value={filters.startDate || ''} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                        </div>

                        {/* To Date */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">To Date</span></label>
                            <input type="date" className="input input-bordered w-full" value={filters.endDate || ''} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Conference Name</th><th>Country</th><th>Date</th><th>Department</th><th>Campus</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {conferences.length === 0 ? <tr><td colSpan={7} className="text-center py-8">No conferences found</td></tr> : conferences.map((conf) => (
                                    <tr key={conf._id}>
                                        <td className="max-w-xs" title={conf.conferenceName}>{conf.conferenceName}</td>
                                        <td>{conf.country}</td>
                                        <td>{new Date(conf.date).toLocaleDateString()}</td>
                                        <td>{conf.department || '-'}</td>
                                        <td>{conf.campus || '-'}</td>
                                        <td>
                                            {conf.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-2 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                            {conf.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-2 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                            {conf.status === 'active' && <span className="badge badge-success badge-sm">Active</span>}
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {conf.driveLink && (
                                                    <a href={conf.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: conf })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/conferences/edit/${conf._id}`} className="btn btn-warning btn-sm"><Edit size={16} /></Link>
                                                {isAdmin && <button onClick={() => setDeleteModal({ isOpen: true, item: conf })} className="btn btn-error btn-sm"><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalItems > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={(newLimit) => { setItemsPerPage(newLimit); setCurrentPage(1); }} />}
                </div>
            </div>

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.conferenceName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchConferences(); fetchStats(); }} moduleName="conferences" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Conference Details"
                fields={[
                    { key: 'conferenceName', label: 'Conference Name' },
                    { key: 'country', label: 'Country' },
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'department', label: 'Department' },
                    { key: 'campus', label: 'Campus' },
                    { key: 'eventSummary', label: 'Event Summary' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default ConferencesList;
