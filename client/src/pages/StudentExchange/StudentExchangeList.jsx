import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, UserCheck, TrendingUp, Clock, Eye, FileText, Building2, CheckCircle } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const StudentExchangeList = () => {
    const { isAdmin } = useAuth();
    const [exchanges, setExchanges] = useState([]);
    const [stats, setStats] = useState({ total: 0, universities: 0, active: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', country: '', exchangeType: '', direction: '', startDate: '', endDate: '', recordStatus: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    const [countries, setCountries] = useState([]);
    const [exchangeTypes, setExchangeTypes] = useState([]);

    useEffect(() => { fetchExchanges(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.country, filters.exchangeType, filters.direction, filters.startDate, filters.endDate, filters.recordStatus]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/student-exchange/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/student-exchange', { params: { limit: 1000 } });
            const exchanges = response.data.data || [];
            setCountries([...new Set(exchanges.map(e => e.country).filter(Boolean))].sort());
            setExchangeTypes([...new Set(exchanges.map(e => e.exchangeType).filter(Boolean))].sort());
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchExchanges = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                country: filters.country,
                exchangeType: filters.exchangeType,
                direction: filters.direction,
                startDate: filters.startDate,
                endDate: filters.endDate,
                recordStatus: filters.recordStatus
            };
            const response = await api.get('/student-exchange', { params });
            setExchanges(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching exchanges'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/student-exchange/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Exchange deleted successfully' : 'Delete request submitted');
            fetchExchanges(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting exchange'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/student-exchange/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'student-exchange-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleFilterChange = (newFilters) => { setFilters(prev => ({ ...prev, ...newFilters })); setCurrentPage(1); };
    const handleClearFilters = () => { setFilters({ search: '', country: '', exchangeType: '', direction: '', startDate: '', endDate: '', recordStatus: '' }); setCurrentPage(1); };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Student Exchange</h1><p className="text-base-content/70 mt-2">Manage student exchange programs</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/student-exchange/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Exchange</Link>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Exchanges" value={stats.total} icon={UserCheck} color="primary" />
                <StatsCard title="Universities" value={stats.universities} icon={Building2} color="secondary" />
                <StatsCard title="Active" value={stats.active} icon={CheckCircle} color="success" />
            </div>
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showCountryFilter={true}
                countries={countries}
                exchangeTypes={exchangeTypes}
            />
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Student Name</th><th>Exchange University</th><th>Country</th><th>Direction</th><th>Date Range</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {exchanges.length === 0 ? <tr><td colSpan={7} className="text-center py-8">No exchanges found</td></tr> : exchanges.map((exchange) => (
                                    <tr key={exchange._id}>
                                        <td>{exchange.studentName}</td>
                                        <td>{exchange.exchangeUniversity}</td>
                                        <td>{exchange.country || '-'}</td>
                                        <td>
                                            <span className={`badge ${exchange.direction === 'Incoming' ? 'badge-info' : 'badge-primary'} badge-sm`}>
                                                {exchange.direction || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            {exchange.fromDate && exchange.toDate
                                                ? `${new Date(exchange.fromDate).toLocaleDateString()} - ${new Date(exchange.toDate).toLocaleDateString()}`
                                                : '-'}
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {/* Record Status Badge */}
                                                {exchange.recordStatus === 'active' && <span className="badge badge-success badge-sm">Active</span>}
                                                {exchange.recordStatus === 'expired' && <span className="badge badge-error badge-sm">Expired</span>}

                                                {/* Approval Workflow Badges */}
                                                {exchange.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                                {exchange.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {exchange.driveLink && (
                                                    <a href={exchange.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: exchange })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/student-exchange/edit/${exchange._id}`} className={`btn btn-warning btn-sm ${exchange.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item: exchange })} className={`btn btn-error btn-sm ${exchange.status !== 'active' ? 'btn-disabled' : ''}`} disabled={exchange.status !== 'active'}><Trash2 size={16} /></button>
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
            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.studentName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchExchanges(); fetchStats(); }} moduleName="student-exchange" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Student Exchange Details"
                fields={[
                    { key: 'direction', label: 'Direction' },
                    { key: 'studentName', label: 'Student Name' },
                    { key: 'course', label: 'Course' },
                    { key: 'semesterYear', label: 'Semester/Year' },
                    { key: 'usnNo', label: 'USN Number' },
                    { key: 'exchangeUniversity', label: 'Exchange University' },
                    { key: 'country', label: 'Country' },
                    { key: 'fromDate', label: 'From Date', type: 'date' },
                    { key: 'toDate', label: 'To Date', type: 'date' },
                    { key: 'exchangeStatus', label: 'Exchange Status' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default StudentExchangeList;
