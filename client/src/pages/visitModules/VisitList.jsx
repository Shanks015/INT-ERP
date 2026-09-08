import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { toDDMMM } from '../../utils/dateFormat';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Users, Globe, Building2, Clock, X, Search, Eye, FileText, FolderOpen } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import DriveFilesModal from '../../components/Drive/DriveFilesModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import Pagination from '../../components/Pagination';

/**
 * List page shared by the three campus modules (Campus Visit, Seminar/Guest
 * Lecture, Consultant Visit). Behaviour is identical across modules — only the
 * config differs (endpoint, labels, whether a type filter is meaningful).
 */
const VisitList = ({ config }) => {
    const { isAdmin } = useAuth();
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, universities: 0, trend: null });
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

    // Only modules that legitimately hold more than one type (Seminar vs Guest
    // Lecture) get a type filter; the others are homogeneous after the split.
    const showTypeFilter = config.typeOptions.length > 1;

    const [filters, setFilters] = useState({ search: '', type: '', country: '', startDate: '', endDate: '' });
    const debouncedSearch = useDebounce(filters.search, 500);
    const [countries, setCountries] = useState([]);

    useEffect(() => {
        fetchItems();
        fetchStats();
        fetchFilterData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, itemsPerPage, debouncedSearch, filters.type, filters.country, filters.startDate, filters.endDate]);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const response = await api.get(`/${config.module}/stats`);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get(`/${config.module}`, { params: { limit: 1000 } });
            const records = response.data.data || [];
            setCountries([...new Set(records.map(r => r.country).filter(Boolean))].sort());
        } catch (error) {
            console.error('Error fetching filter data:', error);
        }
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                type: filters.type,
                startDate: filters.startDate,
                endDate: filters.endDate,
                country: filters.country
            };
            const response = await api.get(`/${config.module}`, { params });
            setItems(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) {
            toast.error(`Error fetching ${config.title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/${config.module}/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? `${config.moduleLabel} deleted successfully` : 'Delete request submitted');
            fetchItems();
            fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || `Error deleting ${config.moduleLabel.toLowerCase()}`);
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get(`/${config.module}/export-csv`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${config.module}-export.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Error exporting CSV');
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({ search: '', type: '', country: '', startDate: '', endDate: '' });
        setCurrentPage(1);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{config.title}</h1>
                    <p className="text-base-content/70 mt-2">{config.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to={`/${config.module}/new`} className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add {config.moduleLabel}</Link>
                </div>
            </div>

            {/* Stats Cards with Trends */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard
                    title={config.cardTotal}
                    value={totalItems}
                    icon={Users}
                    color="primary"
                    trend={stats.trend}
                    moduleType={config.module}
                    statType="total"
                    moduleData={{ ...stats }}
                    loading={loading}
                />
                <SmartStatsCard
                    title="Countries"
                    value={stats.countries}
                    icon={Globe}
                    color="secondary"
                    moduleType={config.module}
                    statType="countries"
                    moduleData={{ ...stats }}
                    loading={statsLoading}
                />
                <SmartStatsCard
                    title="Universities"
                    value={stats.universities}
                    icon={Building2}
                    color="info"
                    moduleType={config.module}
                    statType="universities"
                    moduleData={{ ...stats }}
                    loading={statsLoading}
                />
            </div>

            {/* Filters */}
            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2">
                            <X size={16} /> Clear All
                        </button>
                    </div>
                    <div className={`grid grid-cols-1 ${showTypeFilter ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search university, visitor..."
                                    className="input input-bordered w-full pr-10"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        {showTypeFilter && (
                            <div className="form-control">
                                <label className="label"><span className="label-text">Type</span></label>
                                <select
                                    className="select select-bordered w-full"
                                    value={filters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    {config.typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="form-control">
                            <label className="label"><span className="label-text">Country</span></label>
                            <select
                                className="select select-bordered w-full"
                                value={filters.country}
                                onChange={(e) => handleFilterChange('country', e.target.value)}
                            >
                                <option value="">All Countries</option>
                                {countries.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">From Date</span></label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">To Date</span></label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr><th>University</th><th>Country</th><th>Visitor</th><th>Date</th><th>Type</th><th>Department</th><th>Campus</th><th>Notes</th><th className="text-right">Actions</th></tr>
                            </thead>
                            <tbody>
                                {loading && items.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-8"><span className="loading loading-spinner loading-md"></span></td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-8">{config.noData}</td></tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item._id}>
                                            <td className="font-medium">{item.universityName}</td>
                                            <td>{item.country}</td>
                                            <td className="max-w-xs truncate" title={item.visitorName}>{item.visitorName || '-'}</td>
                                            <td>{toDDMMM(item.date)}</td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <span className="badge badge-info badge-sm whitespace-nowrap">{item.type || '-'}</span>
                                                    {item.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                                    {item.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                                </div>
                                            </td>
                                            <td>{item.department || '-'}</td>
                                            <td>{item.campus || '-'}</td>
                                            <td>
                                                {item.notes ? (
                                                    <div className="max-w-[220px]" title={item.notes}>
                                                        <span className="text-xs text-base-content/80 line-clamp-2 break-words">{item.notes}</span>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setFilesFor({ _id: item._id, label: item.universityName || config.moduleLabel })} className="btn btn-outline btn-sm" title="Files">
                                                        <FolderOpen size={16} />
                                                    </button>
                                                    {item.driveLink && (
                                                        <a href={item.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                            <FileText size={16} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => setDetailModal({ isOpen: true, item })} className="btn btn-info btn-sm" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    <Link to={`/${config.module}/edit/${item._id}`} className={`btn btn-warning btn-sm ${item.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item })} className={`btn btn-error btn-sm ${item.status !== 'active' ? 'btn-disabled' : ''}`} disabled={item.status !== 'active'}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalItems > 0 && (
                        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={(newLimit) => { setItemsPerPage(newLimit); setCurrentPage(1); }} />
                    )}
                </div>
            </div>

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.universityName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchItems(); fetchStats(); }} moduleName={config.module} />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title={config.detailTitle}
                fields={[
                    { key: 'universityName', label: 'University Name' },
                    { key: 'country', label: 'Country' },
                    { key: 'visitorName', label: 'Visitor Name' },
                    { key: 'date', label: 'Date', type: 'date', format: 'DD/MMM/YYYY' },
                    { key: 'type', label: 'Type' },
                    { key: 'department', label: 'Department' },
                    { key: 'campus', label: 'Campus' },
                    { key: 'summary', label: 'Summary' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'notes', label: 'Notes' }
                ]}
            />
            <DriveFilesModal
                isOpen={!!filesFor}
                onClose={() => setFilesFor(null)}
                moduleSlug={config.module}
                recordId={filesFor?._id}
                recordLabel={filesFor?.label}
            />
        </div>
    );
};

export default VisitList;
