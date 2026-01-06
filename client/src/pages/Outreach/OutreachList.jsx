import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Mail, TrendingUp, Clock, Eye, MessageSquare, XCircle } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const OutreachList = () => {
    const { user, isAdmin } = useAuth();
    const [outreach, setOutreach] = useState([]);
    const [stats, setStats] = useState({ total: 0, responses: 0, nonResponses: 0 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', country: '', partnershipType: '', outreachType: '', startDate: '', endDate: '' });
    const [searchInput, setSearchInput] = useState('');
    const [countries, setCountries] = useState([]);
    const [partnershipTypes, setPartnershipTypes] = useState([]);
    const [outreachTypes, setOutreachTypes] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filter state
    // This state is now redundant as `filters` above covers it. Keeping it for context of the original change.
    // The instruction implies `filters` should be updated, and new states added.
    // The original `filters` state was:
    // const [filters, setFilters] = useState({
    //     search: '',
    //     status: '',
    //     startDate: '',
    //     endDate: '',
    //     country: ''
    // });

    useEffect(() => { fetchOutreach(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, filters]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/outreach/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/outreach', { params: { limit: 1000 } });
            const outreach = response.data.data || [];
            setCountries([...new Set(outreach.map(o => o.country).filter(Boolean))].sort());
            setPartnershipTypes([...new Set(outreach.map(o => o.partnershipType).filter(Boolean))].sort());
            setOutreachTypes([...new Set(outreach.map(o => o.outreachType).filter(Boolean))].sort());
        } catch (error) { console.error('Error fetching filter data:', error); }
    };


    const fetchOutreach = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                ...filters
            };

            const response = await api.get('/outreach', { params });
            setOutreach(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) {
            toast.error('Error fetching outreach data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/outreach/${deleteModal.item._id}`, {
                data: { reason }
            });

            if (isAdmin) {
                toast.success('Outreach deleted successfully');
            } else {
                toast.success('Delete request submitted for approval');
            }

            fetchOutreach();
            fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting outreach');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/outreach/export', {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'outreach-export.csv');
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
        setCurrentPage(1); // Reset to first page when filters change
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
                    <h1 className="text-3xl font-bold">Outreach Data</h1>
                    <p className="text-base-content/70 mt-2">
                        Manage outreach activities and partnerships
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
                    <Link to="/outreach/new" className="btn btn-primary">
                        <Plus size={18} />
                        Add Outreach
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Outreach" value={stats.total} icon={Mail} color="primary" />
                <StatsCard title="Responses" value={stats.responses} icon={MessageSquare} color="success" />
                <StatsCard title="No Response" value={stats.nonResponses} icon={XCircle} color="warning" />
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
                                    <th>University / Organization</th>
                                    <th>Country</th>
                                    <th>Contact Person</th>
                                    <th>Email</th>
                                    <th>Reply</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outreach.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8">
                                            No outreach data found. Add your first entry!
                                        </td>
                                    </tr>
                                ) : (
                                    outreach.map((item) => (
                                        <tr key={item._id}>
                                            <td>{item.university || item.name}</td>
                                            <td>{item.country}</td>
                                            <td>{item.contactName || item.contactPerson || '-'}</td>
                                            <td>
                                                {item.email ? (
                                                    <a
                                                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${item.email}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {item.email}
                                                    </a >
                                                ) : '-'}
                                            </td >
                                            <td className="max-w-xs truncate" title={item.reply}>
                                                {item.reply || '-'}
                                            </td>
                                            <td>
                                                {item.status === 'pending_edit' && (
                                                    <span className="badge badge-warning gap-2">
                                                        <Clock size={14} />
                                                        Edit Pending
                                                    </span>
                                                )}
                                                {item.status === 'pending_delete' && (
                                                    <span className="badge badge-error gap-2">
                                                        <Clock size={14} />
                                                        Delete Pending
                                                    </span>
                                                )}
                                                {item.status === 'active' && (
                                                    <span className="badge badge-success">Active</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setDetailModal({ isOpen: true, item })}
                                                        className="btn btn-info btn-sm"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <Link
                                                        to={`/outreach/edit/${item._id}`}
                                                        className={`btn btn-warning btn-sm ${item.status !== 'active' ? 'btn-disabled' : ''}`}
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, item })}
                                                        className={`btn btn-error btn-sm ${item.status !== 'active' ? 'btn-disabled' : ''}`}
                                                        disabled={item.status !== 'active'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr >
                                    ))
                                )}
                            </tbody >
                        </table >
                    </div >

                    {/* Pagination */}
                    {
                        totalItems > 0 && (
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
                        )
                    }
                </div >
            </div >

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item?.name}
                requireReason={!isAdmin}
            />
            <ImportModal
                isOpen={importModal}
                onClose={() => setImportModal(false)}
                onSuccess={() => {
                    fetchOutreach();
                    fetchStats();
                }}
                moduleName="outreach"
            />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Outreach Details"
                fields={[
                    { key: 'university', label: 'University / Organization' },
                    { key: 'name', label: 'Name' },
                    { key: 'country', label: 'Country' },
                    { key: 'contactName', label: 'Contact Name' },
                    { key: 'contactPerson', label: 'Contact Person' },
                    { key: 'email', label: 'Email', type: 'email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'website', label: 'Website', type: 'link' },
                    { key: 'partnershipType', label: 'Partnership Type' },
                    { key: 'reply', label: 'Reply' },
                    { key: 'notes', label: 'Notes' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div >
    );
};

export default OutreachList;
