import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Users2, TrendingUp, Clock, Eye, FileText, Globe, CheckCircle } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const MembershipsList = () => {
    const { isAdmin } = useAuth();
    const [memberships, setMemberships] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, active: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', membershipType: '', country: '', startDate: '', endDate: '', recordStatus: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    const [membershipTypes, setMembershipTypes] = useState([]);
    const [countries, setCountries] = useState([]);
    useEffect(() => { fetchMemberships(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.membershipType, filters.country, filters.startDate, filters.endDate, filters.recordStatus]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/memberships/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/memberships', { params: { limit: 1000 } });
            const memberships = response.data.data || [];
            setMembershipTypes([...new Set(memberships.map(m => m.membershipType).filter(Boolean))].sort());
            setCountries([...new Set(memberships.map(m => m.country).filter(Boolean))].sort());
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchMemberships = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/memberships', { params });
            setMemberships(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching memberships'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/memberships/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Membership deleted successfully' : 'Delete request submitted');
            fetchMemberships(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting membership'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/memberships/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'memberships-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleFilterChange = (newFilters) => { setFilters(prev => ({ ...prev, ...newFilters })); setCurrentPage(1); };
    const handleClearFilters = () => { setFilters({ search: '', membershipType: '', country: '', startDate: '', endDate: '', recordStatus: '' }); setCurrentPage(1); };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Memberships</h1><p className="text-base-content/70 mt-2">Manage organizational memberships</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/memberships/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Membership</Link>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Memberships" value={stats.total} icon={Users2} color="primary" />
                <StatsCard title="Countries" value={stats.countries} icon={Globe} color="secondary" />
                <StatsCard title="Active" value={stats.active} icon={CheckCircle} color="success" />
            </div>
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showCountryFilter={true}
                membershipTypes={membershipTypes}
                countries={countries}
            />
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Name</th><th>Country</th><th>Type</th><th>Start Date</th><th>Expiry Date</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {memberships.length === 0 ? <tr><td colSpan={7} className="text-center py-8">No memberships found</td></tr> : memberships.map((membership) => (
                                    <tr key={membership._id}>
                                        <td>{membership.name}</td>
                                        <td>{membership.country || '-'}</td>
                                        <td>{membership.membershipStatus || '-'}</td>
                                        <td>{membership.startDate ? new Date(membership.startDate).toLocaleDateString() : '-'}</td>
                                        <td>{membership.endDate ? new Date(membership.endDate).toLocaleDateString() : '-'}</td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {/* Record Status Badge */}
                                                {membership.recordStatus === 'active' && <span className="badge badge-success badge-sm">Active</span>}
                                                {membership.recordStatus === 'expired' && <span className="badge badge-error badge-sm">Expired</span>}

                                                {/* Approval Workflow Badges */}
                                                {membership.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                                {membership.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {membership.driveLink && (
                                                    <a href={membership.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: membership })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/memberships/edit/${membership._id}`} className={`btn btn-warning btn-sm ${membership.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item: membership })} className={`btn btn-error btn-sm ${membership.status !== 'active' ? 'btn-disabled' : ''}`} disabled={membership.status !== 'active'}><Trash2 size={16} /></button>
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
            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.organizationName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchMemberships(); fetchStats(); }} moduleName="memberships" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Membership Details"
                fields={[
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'membershipStatus', label: 'Membership Status' },
                    { key: 'name', label: 'Organization Name' },
                    { key: 'summary', label: 'Summary' },
                    { key: 'country', label: 'Country' },
                    { key: 'startDate', label: 'Start Date', type: 'date' },
                    { key: 'endDate', label: 'End Date', type: 'date' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default MembershipsList;
