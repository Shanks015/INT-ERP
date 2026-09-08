import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import { statusBadgeClass } from '../../utils/statusBadge';
import { getCaseInsensitiveUnique } from '../../utils/filterUtils';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, RefreshCw, TrendingUp, Clock, Eye, Globe, CheckCircle, FileText, X, Search, FolderOpen } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import DriveFilesModal from '../../components/Drive/DriveFilesModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import Pagination from '../../components/Pagination';

const MouUpdatesList = () => {
    const { isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [updates, setUpdates] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, active: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [filesFor, setFilesFor] = useState(null); // { _id, label } opened in the ERP Drive modal
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', country: '', agreementType: '', mouStatus: '', validityStatus: '', startDate: '', endDate: '', selectedMonth: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    const [countries, setCountries] = useState([]);
    const [agreementTypes, setAgreementTypes] = useState([]);
    const [mouStatuses, setMouStatuses] = useState([]);
    const [validityStatuses, setValidityStatuses] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);

    const formatMonthKey = (key) => {
        if (!key) return '';
        const [year, month] = key.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    useEffect(() => { fetchUpdates(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.country, filters.agreementType, filters.mouStatus, filters.validityStatus, filters.startDate, filters.endDate, filters.selectedMonth]);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const response = await api.get('/mou-updates/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
        finally { setStatsLoading(false); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/mou-updates', { params: { limit: 1000 } });
            const updates = response.data.data || [];
            setCountries([...new Set(updates.map(u => u.country).filter(Boolean))].sort());
            setAgreementTypes(getCaseInsensitiveUnique(updates, 'agreementType'));
            setMouStatuses(getCaseInsensitiveUnique(updates, 'mouStatus'));
            setValidityStatuses(getCaseInsensitiveUnique(updates, 'validityStatus'));

            // Extract unique months from update date field (format: YYYY-MM)
            const months = [...new Set(updates.map(u => {
                if (!u.date) return null;
                const dStr = typeof u.date === 'string' ? u.date : new Date(u.date).toISOString();
                return dStr.substring(0, 7);
            }).filter(Boolean))].sort().reverse();
            setAvailableMonths(months);
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchUpdates = async () => {
        try {
            setLoading(true);
            let start = filters.startDate;
            let end = filters.endDate;
            if (filters.selectedMonth) {
                const [year, month] = filters.selectedMonth.split('-');
                start = `${year}-${month}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
            }
            const params = { page: currentPage, limit: itemsPerPage, search: debouncedSearch, country: filters.country, agreementType: filters.agreementType, mouStatus: filters.mouStatus, validityStatus: filters.validityStatus, startDate: start, endDate: end };
            const response = await api.get('/mou-updates', { params });
            setUpdates(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching MoU updates'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/mou-updates/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Update deleted successfully' : 'Delete request submitted');
            fetchUpdates(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting update'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/mou-updates/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'mou-updates-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleFilterChange = (newFilters) => { setFilters(prev => ({ ...prev, ...newFilters })); setCurrentPage(1); };
    const handleClearFilters = () => { setFilters({ search: '', country: '', agreementType: '', mouStatus: '', validityStatus: '', startDate: '', endDate: '', selectedMonth: '' }); setCurrentPage(1); };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">MoU Updates</h1><p className="text-base-content/70 mt-2">Manage MoU updates and renewals</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/mou-updates/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Update</Link>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard title="Total Updates" value={totalItems} icon={FileText} color="primary" moduleType="mou-updates" statType="total" moduleData={stats} loading={loading} />
                <SmartStatsCard title="Countries" value={stats.countries} icon={Globe} color="secondary" moduleType="mou-updates" statType="countries" moduleData={stats} loading={statsLoading} />
                <SmartStatsCard title="Active" value={stats.active} icon={CheckCircle} color="success" moduleType="mou-updates" statType="active" moduleData={stats} loading={statsLoading} />
            </div>
            {/* Filters Card */}
            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2">
                            <X size={16} /> Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Search */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search university..."
                                    className="input input-bordered w-full pr-10"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange({ search: e.target.value })}
                                />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        {/* Country */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Country</span></label>
                            <select 
                                className="select select-bordered w-full" 
                                value={filters.country || ''} 
                                onChange={(e) => handleFilterChange({ country: e.target.value })}
                            >
                                <option value="">All Countries</option>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Agreement Type */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Agreement Type</span></label>
                            <select 
                                className="select select-bordered w-full" 
                                value={filters.agreementType || ''} 
                                onChange={(e) => handleFilterChange({ agreementType: e.target.value })}
                            >
                                <option value="">All Types</option>
                                {agreementTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>

                        {/* Mou Status */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">MoU Status</span></label>
                            <select
                                className="select select-bordered w-full"
                                value={filters.mouStatus || ''}
                                onChange={(e) => handleFilterChange({ mouStatus: e.target.value })}
                            >
                                <option value="">All Mou Statuses</option>
                                {mouStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>

                        {/* Validity Status */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Validity Status</span></label>
                            <select 
                                className="select select-bordered w-full" 
                                value={filters.validityStatus || ''} 
                                onChange={(e) => handleFilterChange({ validityStatus: e.target.value })}
                            >
                                <option value="">All Statuses</option>
                                {validityStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>

                        {/* Month Filter */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Month</span></label>
                            <select 
                                className="select select-bordered w-full" 
                                value={filters.selectedMonth || ''} 
                                onChange={(e) => handleFilterChange({ selectedMonth: e.target.value })}
                            >
                                <option value="">All Months</option>
                                {availableMonths.map(month => (
                                    <option key={month} value={month}>
                                        {formatMonthKey(month)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>University</th><th>Country</th><th>Update Date</th><th>Completed Date</th><th>Agreement Type</th><th>Term</th><th>Status</th><th>Department</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {loading && updates.length === 0 ? <tr><td colSpan={9} className="text-center py-8"><span className="loading loading-spinner loading-md"></span></td></tr> : updates.length === 0 ? <tr><td colSpan={9} className="text-center py-8">No updates found</td></tr> : updates.map((update) => (
                                    <tr key={update._id}>
                                        <td className="font-medium">{update.university}</td>
                                        <td>{update.country || '-'}</td>
                                        <td>{update.date ? formatDate(update.date) : '-'}</td>
                                        <td>{update.completedDate ? formatDate(update.completedDate) : '-'}</td>
                                        <td>{update.agreementType || '-'}</td>
                                        <td>{update.term || '-'}</td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {/* mouStatus is filterable on this page but was never shown */}
                                                {update.mouStatus && (
                                                    <span className={`badge badge-sm ${statusBadgeClass(update.mouStatus)} whitespace-nowrap`}>
                                                        {update.mouStatus}
                                                    </span>
                                                )}
                                                {update.validityStatus && (
                                                    <span className={`badge badge-sm ${statusBadgeClass(update.validityStatus)} whitespace-nowrap`}>
                                                        {update.validityStatus}
                                                    </span>
                                                )}
                                                {!update.mouStatus && !update.validityStatus && '-'}
                                            </div>
                                        </td>
                                        <td>{update.department || '-'}</td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setFilesFor({ _id: update._id, label: update.university || 'MoU Update' })} className="btn btn-outline btn-sm" title="Files">
                                                    <FolderOpen size={16} />
                                                </button>
                                                {update.driveLink && (
                                                    <a href={update.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: update })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/mou-updates/edit/${update._id}`} className={`btn btn-warning btn-sm ${update.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item: update })} className={`btn btn-error btn-sm ${update.status !== 'active' ? 'btn-disabled' : ''}`} disabled={update.status !== 'active'}><Trash2 size={16} /></button>
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
            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.university} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchUpdates(); fetchStats(); }} moduleName="mou-updates" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="MoU Update Details"
                fields={[
                    { key: 'university', label: 'University' },
                    { key: 'country', label: 'Country' },
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'completedDate', label: 'Completed Date', type: 'date' },
                    { key: 'agreementType', label: 'Agreement Type' },
                    { key: 'term', label: 'Term' },
                    { key: 'mouStatus', label: 'MoU Status' },
                    { key: 'validityStatus', label: 'Validity Status' },
                    { key: 'department', label: 'Department' },
                    { key: 'contactPerson', label: 'Contact Person' },
                    { key: 'contactEmail', label: 'Contact Email', type: 'email' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
            <DriveFilesModal
                isOpen={!!filesFor}
                onClose={() => setFilesFor(null)}
                moduleSlug="mou-updates"
                recordId={filesFor?._id}
                recordLabel={filesFor?.label}
            />
        </div>
    );
};

export default MouUpdatesList;

