import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Users, TrendingUp, Clock, Building2 } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import StatsCard from '../../components/StatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const CampusVisitsList = () => {
    const { user, isAdmin } = useAuth();
    const [campusVisits, setCampusVisits] = useState([]);
    const [stats, setStats] = useState({ total: 0, thisMonth: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState({
        search: '', status: '', startDate: '', endDate: '', country: ''
    });

    useEffect(() => {
        fetchCampusVisits();
        fetchStats();
    }, [currentPage, itemsPerPage, filters]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/campus-visits/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchCampusVisits = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/campus-visits', { params });
            setCampusVisits(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) {
            toast.error('Error fetching campus visits');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/campus-visits/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Campus visit deleted successfully' : 'Delete request submitted for approval');
            fetchCampusVisits();
            fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting campus visit');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/campus-visits/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'campus-visits-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Error exporting CSV');
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({ search: '', status: '', startDate: '', endDate: '', country: '' });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) {
        return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Campus Visits</h1>
                    <p className="text-base-content/70 mt-2">Manage campus visit records</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline"><Download size={18} />Export CSV</button>
                    <Link to="/campus-visits/new" className="btn btn-primary"><Plus size={18} />Add Visit</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Visits" value={stats.total} icon={Building2} color="primary" />
                <StatsCard title="This Month" value={stats.thisMonth} icon={TrendingUp} color="secondary" trend={`+${stats.thisMonth} new`} />
                <StatsCard title="Pending" value={stats.pending} icon={Clock} color="warning" />
            </div>

            <FilterBar filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} showCountryFilter={true} />

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr><th>Institution</th><th>Country</th><th>Date</th><th>Purpose</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {campusVisits.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8">No campus visits found</td></tr>
                                ) : (
                                    campusVisits.map((visit) => (
                                        <tr key={visit._id}>
                                            <td>{visit.institutionName}</td>
                                            <td>{visit.country}</td>
                                            <td>{new Date(visit.visitDate).toLocaleDateString()}</td>
                                            <td>{visit.purpose || '-'}</td>
                                            <td>
                                                {visit.status === 'pending_edit' && <span className="badge badge-warning gap-2"><Clock size={14} />Edit Pending</span>}
                                                {visit.status === 'pending_delete' && <span className="badge badge-error gap-2"><Clock size={14} />Delete Pending</span>}
                                                {visit.status === 'active' && <span className="badge badge-success">Active</span>}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link to={`/campus-visits/edit/${visit._id}`} className={`btn btn-warning btn-sm ${visit.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item: visit })} className={`btn btn-error btn-sm ${visit.status !== 'active' ? 'btn-disabled' : ''}`} disabled={visit.status !== 'active'}><Trash2 size={16} /></button>
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

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.institutionName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchCampusVisits(); fetchStats(); }} moduleName="campus-visits" />
        </div>
    );
};

export default CampusVisitsList;
