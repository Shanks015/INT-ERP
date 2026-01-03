import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Users, TrendingUp, Clock, Eye } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const PartnersList = () => {
    const { user, isAdmin } = useAuth();
    const [partners, setPartners] = useState([]);
    const [stats, setStats] = useState({ total: 0, thisMonth: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, partner: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, partner: null });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        startDate: '',
        endDate: '',
        country: ''
    });

    useEffect(() => {
        fetchPartners();
        fetchStats();
    }, [currentPage, itemsPerPage, filters]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/partners/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                ...filters
            };

            const response = await api.get('/partners', { params });
            setPartners(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) {
            toast.error('Error fetching partners');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/partners/${deleteModal.partner._id}`, {
                data: { reason }
            });

            if (isAdmin) {
                toast.success('Partner deleted successfully');
            } else {
                toast.success('Delete request submitted for approval');
            }

            fetchPartners();
            fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting partner');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/partners/export', {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'partners-export.csv');
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
        setFilters({
            search: '',
            status: '',
            startDate: '',
            endDate: '',
            country: ''
        });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Partners</h1>
                    <p className="text-base-content/70 mt-2">
                        Manage international partner organizations
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline">
                        <Upload size={18} />
                        Import
                    </button>
                    <button onClick={handleExportCSV} className="btn btn-outline">
                        <Download size={18} />
                        Export CSV
                    </button>
                    <Link to="/partners/new" className="btn btn-primary">
                        <Plus size={18} />
                        Add Partner
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard
                    title="Total Partners"
                    value={stats.total}
                    icon={Users}
                    color="primary"
                />
                <StatsCard
                    title="This Month"
                    value={stats.thisMonth}
                    icon={TrendingUp}
                    color="secondary"
                    trend={`+${stats.thisMonth} new entries`}
                />
                <StatsCard
                    title="Pending Approval"
                    value={stats.pending}
                    icon={Clock}
                    color="warning"
                />
            </div>

            {/* Filters */}
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showCountryFilter={true}
            />

            {/* Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Country</th>
                                    <th>University</th>
                                    <th>Contact Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partners.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8">
                                            No partners found. Add your first partner!
                                        </td>
                                    </tr>
                                ) : (
                                    partners.map((partner) => (
                                        <tr key={partner._id}>
                                            <td>{partner.country}</td>
                                            <td>{partner.university}</td>
                                            <td>{partner.contactName || '-'}</td>
                                            <td>{partner.email || '-'}</td>
                                            <td>{partner.phoneNumber || '-'}</td>
                                            <td>
                                                {partner.status === 'pending_edit' && (
                                                    <span className="badge badge-warning gap-2">
                                                        <Clock size={14} />
                                                        Edit Pending
                                                    </span>
                                                )}
                                                {partner.status === 'pending_delete' && (
                                                    <span className="badge badge-error gap-2">
                                                        <Clock size={14} />
                                                        Delete Pending
                                                    </span>
                                                )}
                                                {partner.status === 'active' && (
                                                    <span className="badge badge-success">Active</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setDetailModal({ isOpen: true, partner })}
                                                        className="btn btn-info btn-sm"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <Link
                                                        to={`/partners/edit/${partner._id}`}
                                                        className={`btn btn-warning btn-sm ${partner.status !== 'active' ? 'btn-disabled' : ''}`}
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, partner })}
                                                        className={`btn btn-error btn-sm ${partner.status !== 'active' ? 'btn-disabled' : ''}`}
                                                        disabled={partner.status !== 'active'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(newLimit) => {
                                setItemsPerPage(newLimit);
                                setCurrentPage(1);
                            }}
                        />
                    )}
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, partner: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.partner?.university}
                requireReason={!isAdmin}
            />
            <ImportModal
                isOpen={importModal}
                onClose={() => setImportModal(false)}
                onSuccess={() => {
                    fetchPartners();
                    fetchStats();
                }}
                moduleName="partners"
            />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, partner: null })}
                data={detailModal.partner}
                title="Partner Details"
                fields={[
                    { key: 'country', label: 'Country' },
                    { key: 'university', label: 'University' },
                    { key: 'contactName', label: 'Contact Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'reply', label: 'Reply' },
                    { key: 'phoneNumber', label: 'Phone Number' },
                    { key: 'contactPerson', label: 'Contact Person' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default PartnersList;
