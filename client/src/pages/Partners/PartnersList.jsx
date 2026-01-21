import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import { getCaseInsensitiveUnique } from '../../utils/filterUtils';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Users, Eye, Globe, CheckCircle, FileText } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const PartnersList = () => {
    const { user, isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [partners, setPartners] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, active: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, partner: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, partner: null });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState({
        search: '',
        mouStatus: '',
        agreementType: '',
        country: '',
        recordStatus: ''
    });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    // Dynamic filter data
    const [countries, setCountries] = useState([]);
    const [agreementTypes, setAgreementTypes] = useState([]);
    const [mouStatuses, setMouStatuses] = useState([]);

    useEffect(() => {
        fetchPartners();
        fetchStats();
        fetchFilterData();
    }, [currentPage, itemsPerPage, debouncedSearch, filters.mouStatus, filters.agreementType, filters.country, filters.recordStatus]);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const response = await api.get('/partners/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/partners', { params: { limit: 1000 } });
            const partners = response.data.data || [];

            // Extract unique values for each filter
            const uniqueCountries = [...new Set(partners.map(p => p.country).filter(Boolean))].sort();
            setCountries(uniqueCountries);

            // Normalize agreement types to prevent case duplicates (e.g., "MoU" vs "mou")
            const uniqueAgreementTypes = getCaseInsensitiveUnique(partners, 'agreementType');
            setAgreementTypes(uniqueAgreementTypes);

            const uniqueMouStatuses = [...new Set(partners.map(p => p.mouStatus).filter(Boolean))].sort();
            setMouStatuses(uniqueMouStatuses);
        } catch (error) {
            console.error('Error fetching filter data:', error);
        }
    };

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                mouStatus: filters.mouStatus,
                agreementType: filters.agreementType,
                country: filters.country,
                recordStatus: filters.recordStatus
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
            await api.delete(`/ partners / ${deleteModal.partner._id} `, {
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
            const response = await api.get('/partners/export-csv', {
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
            agreementType: '',
            country: '',
            recordStatus: ''
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Partners</h1>
                    <p className="text-base-content/70 mt-2">Manage international partnerships and MOUs</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setImportModal(true)}
                        className="btn btn-outline flex-1 md:flex-none"
                    >
                        <Upload size={18} />
                        Import
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-outline flex-1 md:flex-none"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                    <Link to="/partners/new" className="btn btn-primary flex-1 md:flex-none">
                        <Plus size={18} />
                        Add Partner
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard
                    title="Total Partners"
                    value={stats.total}
                    icon={Users}
                    color="primary"
                    moduleType="partners"
                    statType="total"
                    moduleData={{
                        total: stats.total,
                        active: stats.active,
                        countries: stats.countries,
                        countryDistribution: countries.map(c => ({
                            name: c,
                            value: partners.filter(p => p.country === c).length
                        })),
                        trend: { change: 5, percentage: 8.3, direction: 'up' } // Replace with real trend data
                    }}
                    loading={statsLoading}
                />
                <SmartStatsCard
                    title="Countries"
                    value={stats.countries}
                    icon={Globe}
                    color="secondary"
                    moduleType="partners"
                    statType="countries"
                    moduleData={{
                        total: stats.total,
                        active: stats.active,
                        countries: stats.countries,
                        countryDistribution: countries.map(c => ({
                            name: c,
                            value: partners.filter(p => p.country === c).length
                        }))
                    }}
                    loading={statsLoading}
                />
                <SmartStatsCard
                    title="Active"
                    value={stats.active}
                    icon={CheckCircle}
                    color="success"
                    moduleType="partners"
                    statType="active"
                    moduleData={{
                        ...stats, // Spread all stats from backend (including expiryForecast, agreementTypes, etc.)
                        trend: { change: 3, percentage: 5.2, direction: 'up' }
                    }}
                    loading={statsLoading}
                />
            </div>

            {/* Custom Filter UI for Partners */}
            <div className="card bg-base-100 shadow-sm mb-6">
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search university..."
                            className="input input-bordered w-full"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />

                        {/* Country */}
                        <select
                            id="country-filter"
                            className="select select-bordered w-full"
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                        >
                            <option value="">All Countries</option>
                            {countries.map(country => (
                                <option key={country} value={country}>{country}</option>
                            ))}
                        </select>

                        {/* MoU Status */}
                        <select
                            className="select select-bordered w-full"
                            value={filters.mouStatus}
                            onChange={(e) => handleFilterChange('mouStatus', e.target.value)}
                        >
                            <option value="">All MoU Status</option>
                            {mouStatuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>

                        {/* Agreement Type */}
                        <select
                            className="select select-bordered w-full"
                            value={filters.agreementType}
                            onChange={(e) => handleFilterChange('agreementType', e.target.value)}
                        >
                            <option value="">All Agreement Types</option>
                            {agreementTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        {/* Record Status */}
                        <select
                            className="select select-bordered w-full"
                            value={filters.recordStatus}
                            onChange={(e) => handleFilterChange('recordStatus', e.target.value)}
                        >
                            <option value="">All Records</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
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
                        <table className="table table-sm table-zebra" id="partners-table">
                            <thead>
                                <tr>
                                    <th>Country</th>
                                    <th>University</th>
                                    <th>Department</th>
                                    <th>Contact Person</th>
                                    <th>Email</th>
                                    <th>Signing Date</th>
                                    <th>Expiry Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partners.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-8">
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
                                            <td>
                                                {partner.email ? (
                                                    <a
                                                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${partner.email}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="link link-primary"
                                                    >
                                                        {partner.email}
                                                    </a >
                                                ) : '-'}
                                            </td >
                                            <td>{partner.signingDate ? formatDate(partner.signingDate) : '-'}</td>
                                            <td>{partner.expiringDate ? formatDate(partner.expiringDate) : '-'}</td>
                                            <td>
                                                {partner.activeStatus ? (
                                                    <span className={`badge badge-sm ${partner.activeStatus === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                                                        {partner.activeStatus}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link
                                                        to={`/partners/edit/${partner._id}`}
                                                        className="btn btn-warning btn-sm"
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, partner })}
                                                        className="btn btn-error btn-sm"
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
                    { key: 'email', label: 'Email', type: 'email' },
                    { key: 'phoneNumber', label: 'Phone Number' },
                    { key: 'agreementType', label: 'Agreement Type' },
                    { key: 'link', label: 'Link', type: 'link' },
                    { key: 'submitted', label: 'Submitted', type: 'date' },
                    { key: 'signingDate', label: 'Signing Date', type: 'date' },
                    { key: 'expiringDate', label: 'Expiry Date', type: 'date' },
                    { key: 'recordStatus', label: 'Record Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div >
    );
};

export default PartnersList;

