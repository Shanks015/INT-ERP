import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, FileText, TrendingUp, Clock, Eye, Globe, Building2, Award } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const MouSigningCeremoniesList = () => {
    const { isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [ceremonies, setCeremonies] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, departments: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', country: '', agreementType: '', startDate: '', endDate: '', recordStatus: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    const [countries, setCountries] = useState([]);
    const [agreementTypes, setAgreementTypes] = useState([]);
    useEffect(() => { fetchCeremonies(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.country, filters.agreementType, filters.startDate, filters.endDate, filters.recordStatus]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/mou-signing-ceremonies/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/mou-signing-ceremonies', { params: { limit: 1000 } });
            const ceremonies = response.data.data || [];
            const uniqueCountries = [...new Set(ceremonies.map(c => c.country).filter(Boolean))].sort();
            setCountries(uniqueCountries);
            const uniqueTypes = [...new Set(ceremonies.map(c => c.agreementType).filter(Boolean))].sort();
            setAgreementTypes(uniqueTypes);
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchCeremonies = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/mou-signing-ceremonies', { params });
            setCeremonies(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching ceremonies'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/mou-signing-ceremonies/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Ceremony deleted successfully' : 'Delete request submitted');
            fetchCeremonies(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting ceremony'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/mou-signing-ceremonies/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'mou-ceremonies-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleFilterChange = (newFilters) => { setFilters(prev => ({ ...prev, ...newFilters })); setCurrentPage(1); };
    const handleClearFilters = () => { setFilters({ search: '', country: '', agreementType: '', startDate: '', endDate: '', recordStatus: '' }); setCurrentPage(1); };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">MoU Signing Ceremonies</h1><p className="text-base-content/70 mt-2">Manage MoU signing events</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/mou-signing-ceremonies/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Ceremony</Link>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <SmartStatsCard title="Total Ceremonies" value={stats.total} icon={Award} color="primary" moduleType="mou-ceremonies" statType="total" moduleData={stats} />
                <SmartStatsCard title="Countries" value={stats.countries} icon={Globe} color="secondary" moduleType="mou-ceremonies" statType="countries" moduleData={stats} />
            </div>
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                agreementTypes={agreementTypes}
            />
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Visitor Name</th><th>Date</th><th>University</th><th>Type</th><th>Department</th><th>Campus</th><th>Event Summary</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {ceremonies.length === 0 ? <tr><td colSpan={9} className="text-center py-8">No ceremonies found</td></tr> : ceremonies.map((ceremony) => (
                                    <tr key={ceremony._id}>
                                        <td>{ceremony.visitorName || '-'}</td>
                                        <td>{formatDate(ceremony.date)}</td>
                                        <td>{ceremony.university || '-'}</td>
                                        <td>{ceremony.type || '-'}</td>
                                        <td>{ceremony.department || '-'}</td>
                                        <td>{ceremony.campus || '-'}</td>
                                        <td className="max-w-xs truncate">{ceremony.eventSummary || '-'}</td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {/* Record Status Badge */}
                                                {ceremony.recordStatus === 'active' && <span className="badge badge-success badge-sm whitespace-nowrap">Active</span>}
                                                {ceremony.recordStatus === 'expired' && <span className="badge badge-error badge-sm whitespace-nowrap">Expired</span>}

                                                {/* Approval Workflow Badges */}
                                                {ceremony.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                                {ceremony.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {ceremony.driveLink && (
                                                    <a href={ceremony.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: ceremony })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/mou-signing-ceremonies/edit/${ceremony._id}`} className={`btn btn-warning btn-sm ${ceremony.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item: ceremony })} className={`btn btn-error btn-sm ${ceremony.status !== 'active' ? 'btn-disabled' : ''}`} disabled={ceremony.status !== 'active'}><Trash2 size={16} /></button>
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
            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.title} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchCeremonies(); fetchStats(); }} moduleName="mou-signing-ceremonies" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="MoU Signing Ceremony Details"
                fields={[
                    { key: 'title', label: 'Title' },
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'university', label: 'University' },
                    { key: 'department', label: 'Department' },
                    { key: 'location', label: 'Location' },
                    { key: 'dignitaries', label: 'Dignitaries' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default MouSigningCeremoniesList;

