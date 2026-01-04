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
        mouStatus: '',
        activeStatus: '',
        school: '',
        agreementType: '',
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

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            mouStatus: '',
            activeStatus: '',
            school: '',
            agreementType: '',
            country: ''
        });
        setCurrentPage(1);
    };

    const hasActiveFilters = Object.values(filters).some(value => value !== '');

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
                    <p className="text-base-content/70 mt-2">Manage international partnerships and MOUs</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setImportModal(true)}
                        className="btn btn-outline"
                    >
                        <Upload size={18} />
                        Import
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-outline"
                    >
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
                    trend={`+${stats.thisMonth} new`}
                />
                <StatsCard
                    title="Pending"
                    value={stats.pending}
                    icon={Clock}
                    color="warning"
                />
            </div>

            {/* Custom Filter UI for Partners */}
            <div className="card bg-base-100 shadow-sm mb-6">
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search university..."
                            className="input input-bordered w-full"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />

                        {/* Country */}
                        <input
                            type="text"
                            placeholder="Country..."
                            className="input input-bordered w-full"
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                        />

                        {/* MoU Status */}
                        <select
                            className="select select-bordered w-full"
                            value={filters.mouStatus}
                            onChange={(e) => handleFilterChange('mouStatus', e.target.value)}
                        >
                            <option value="">All MoU Status</option>
                            <option value="Completed">Completed</option>
                            <option value="In progress">In progress</option>
                            <option value="Waiting for Signature">Waiting for Signature</option>
                        </select>

                        {/* Active Status */}
                        <select
                            className="select select-bordered w-full"
                            value={filters.activeStatus}
                            onChange={(e) => handleFilterChange('activeStatus', e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        {/* School/Department */}
                        <input
                            type="text"
                            placeholder="School/Department..."
                            className="input input-bordered w-full"
                            value={filters.school}
                            onChange={(e) => handleFilterChange('school', e.target.value)}
                        />

                        {/* Agreement Type */}
                        <select
                            className="select select-bordered w-full"
                            value={filters.agreementType}
                            onChange={(e) => handleFilterChange('agreementType', e.target.value)}
                        >
                            <option value="">All Agreements</option>
                            <option value="MoU">MoU</option>
                            <option value="MoA">MoA</option>
                            <option value="Exchange Agreement">Exchange Agreement</option>
                        </select>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleClearFilters}
                                className="btn btn-ghost btn-sm"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Partners Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Country</th>
                                    <th>University</th>
                                    <th>School</th>
                                    <th>Contact Person</th>
                                    <th>Email</th>
                                    <th>MoU Status</th>
                                    <th>Active Status</th>
                                    <th>Signing Date</th>
                                    <th>Expiry Date</th>
                                    <th>Record Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partners.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-8">
                                            No partners found. Add your first partner!
                                        </td>
                                    </tr>
                                ) : (
                                    partners.map((partner) => (
                                        <tr key={partner._id}>
                                            <td>{partner.country}</td>
                                            <td>{partner.university}</td>
                                            <td>{partner.school || '-'}</td>
                                            <td>{partner.contactPerson || '-'}</td>
                                            <td>{partner.email || '-'}</td>
                                            <td>
                                                {partner.mouStatus ? (
                                                    <span className={`badge badge-sm ${partner.mouStatus === 'Completed' ? 'badge-success' :
                                                        partner.mouStatus === 'In progress' ? 'badge-warning' :
                                                            'badge-info'
                                                        }`}>
                                                        {partner.mouStatus}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                {partner.activeStatus ? (
                                                    <span className={`badge badge-sm ${partner.activeStatus === 'Active' ? 'badge-success' : 'badge-neutral'
                                                        }`}>
                                                        {partner.activeStatus}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td>{partner.signingDate ? new Date(partner.signingDate).toLocaleDateString() : '-'}</td>
                                            <td>{partner.expiringDate ? new Date(partner.expiringDate).toLocaleDateString() : '-'}</td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    {/* Record Status Badge */}
                                                    {partner.recordStatus === 'active' && <span className="badge badge-success badge-sm">Active</span>}
                                                    {partner.recordStatus === 'expired' && <span className="badge badge-error badge-sm">Expired</span>}

                                                    {/* Approval Workflow Badges */}
                                                    {partner.status === 'pending_edit' && (
                                                        <span className="badge badge-warning badge-sm gap-1">
                                                            <Clock size={12} />
                                                            Edit Pending
                                                        </span>
                                                    )}
                                                    {partner.status === 'pending_delete' && (
                                                        <span className="badge badge-error badge-sm gap-1">
                                                            <Clock size={12} />
                                                            Delete Pending
                                                        </span>
                                                    )}
                                                </div>
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
                    { key: 'completedOn', label: 'Completed On', type: 'date' },
                    { key: 'country', label: 'Country' },
                    { key: 'university', label: 'University' },
                    { key: 'school', label: 'School/Department' },
                    { key: 'mouStatus', label: 'MoU Status' },
                    { key: 'activeStatus', label: 'Active Status' },
                    { key: 'contactPerson', label: 'Contact Person' },
                    { key: 'email', label: 'Email' },
                    { key: 'phoneNumber', label: 'Phone Number' },
                    { key: 'agreementType', label: 'Agreement Type' },
                    { key: 'link', label: 'Link', type: 'link' },
                    { key: 'submitted', label: 'Submitted', type: 'date' },
                    { key: 'signingDate', label: 'Signing Date', type: 'date' },
                    { key: 'expiringDate', label: 'Expiry Date', type: 'date' },
                    { key: 'recordStatus', label: 'Record Status' },
                    { key: 'status', label: 'Approval Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default PartnersList;
