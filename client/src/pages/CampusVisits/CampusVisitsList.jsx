import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Users, TrendingUp, Clock, Search, X, Eye, Building2, FileText, Globe } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const CampusVisitsList = () => {
    const { user, isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [campusVisits, setCampusVisits] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, universities: 0, trend: null });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState({ search: '', type: '', startDate: '', endDate: '', country: '', university: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    // Dynamic countries list from database
    const [countries, setCountries] = useState([]);
    const [universities, setUniversities] = useState([]);

    // Read URL search params on mount
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam) {
            setFilters(prev => ({ ...prev, type: typeParam }));
        } else {
            setFilters(prev => ({ ...prev, type: '' }));
        }
    }, [searchParams]); // Re-run when URL params change

    useEffect(() => {
        fetchVisits();
        fetchStats();
        fetchFilterData();
    }, [currentPage, itemsPerPage, debouncedSearch, filters.type, filters.startDate, filters.endDate, filters.country, filters.university]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/campus-visits/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/campus-visits', { params: { limit: 1000 } });
            const visits = response.data.data || [];

            // Extract unique countries
            const uniqueCountries = [...new Set(visits.map(v => v.country).filter(Boolean))].sort();
            setCountries(uniqueCountries);

            // Extract unique universities
            const uniqueUniversities = [...new Set(visits.map(v => v.universityName).filter(Boolean))].sort();
            setUniversities(uniqueUniversities);
        } catch (error) {
            console.error('Error fetching filter data:', error);
        }
    };

    const fetchVisits = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                type: filters.type,
                startDate: filters.startDate,
                endDate: filters.endDate,
                country: filters.country,
                university: filters.university
            };
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
            toast.success(isAdmin ? 'Campus visit deleted successfully' : 'Delete request submitted');
            fetchVisits();
            fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting campus visit');
        }
    };

    const handleImportSuccess = () => {
        fetchVisits();
        fetchStats();
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/campus-visits/export-csv', { responseType: 'blob' });
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
        setSearchInput('');
        setFilters({ search: '', startDate: '', endDate: '', country: '', university: '' });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) {
        return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Campus Visits</h1>
                    <p className="text-base-content/70 mt-2">Manage campus visit records</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/campus-visits/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Visit</Link>
                </div>
            </div>

            {/* Stats Cards with Trends */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard
                    title="Total Visits"
                    value={stats.total}
                    icon={Users}
                    color="primary"
                    trend={stats.trend}
                    moduleType="campus-visits"
                    statType="total"
                    moduleData={{ total: stats.total, countries: stats.countries, universities: stats.universities }}
                />
                <SmartStatsCard
                    title="Countries"
                    value={stats.countries}
                    icon={Globe}
                    color="secondary"
                    moduleType="campus-visits"
                    statType="countries"
                    moduleData={{ total: stats.total, countries: stats.countries, universities: stats.universities }}
                />
                <SmartStatsCard
                    title="Universities"
                    value={stats.universities}
                    icon={Building2}
                    color="info"
                    moduleType="campus-visits"
                    statType="universities"
                    moduleData={{ total: stats.total, countries: stats.countries, universities: stats.universities }}
                />
            </div>


            {/* Custom Filters for Campus Visits */}
            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2">
                            <X size={16} /> Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search university, visitor..."
                                    className="input input-bordered w-full pr-10"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        {/* Type Filter */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Visit Type</span></label>
                            <select
                                className="select select-bordered w-full"
                                value={filters.type || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="">All Types</option>
                                <option value="University Visit">University Visit</option>
                                <option value="Seminar">Seminar</option>
                                <option value="Consultant Visit">Consultant Visit</option>
                            </select>
                        </div>

                        {/* Country Filter - Dynamic Dropdown */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">Country</span></label>
                            <select
                                className="select select-bordered w-full"
                                value={filters.country || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                            >
                                <option value="">All Countries</option>
                                {countries.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="form-control">
                            <label className="label"><span className="label-text">From Date</span></label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={filters.startDate || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">To Date</span></label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={filters.endDate || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
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
                                <tr><th>University</th><th>Country</th><th>Visitor</th><th>Date</th><th>Type</th><th>Department</th><th>Campus</th><th>Status</th><th className="text-right">Actions</th></tr>
                            </thead>
                            <tbody>
                                {campusVisits.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-8">No campus visits found</td></tr>
                                ) : (
                                    campusVisits.map((visit) => (
                                        <tr key={visit._id}>
                                            <td className="font-medium">{visit.universityName}</td>
                                            <td>{visit.country}</td>
                                            <td className="max-w-xs truncate" title={visit.visitorName}>{visit.visitorName || '-'}</td>
                                            <td>{formatDate(visit.date)}</td>
                                            <td>
                                                <span className="badge badge-info badge-sm whitespace-nowrap">
                                                    {visit.type || '-'}
                                                </span>
                                            </td>
                                            <td>{visit.department || '-'}</td>
                                            <td>{visit.campus || '-'}</td>
                                            <td>
                                                {visit.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-2 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                                {visit.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-2 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                                {visit.status === 'active' && <span className="badge badge-success badge-sm">Active</span>}
                                            </td>
                                            <td>
                                                <div className="flex gap-2 justify-end">
                                                    {visit.driveLink && (
                                                        <a href={visit.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                            <FileText size={16} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => setDetailModal({ isOpen: true, item: visit })} className="btn btn-info btn-sm" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    <Link to={`/campus-visits/edit/${visit._id}`} className="btn btn-warning btn-sm"><Edit size={16} /></Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item: visit })} className="btn btn-error btn-sm"><Trash2 size={16} /></button>
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
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={handleImportSuccess} moduleName="campus-visits" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Campus Visit Details"
                fields={[
                    { key: 'universityName', label: 'University Name' },
                    { key: 'country', label: 'Country' },
                    { key: 'visitorName', label: 'Visitor Name' },
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'type', label: 'Visit Type' },
                    { key: 'department', label: 'Department' },
                    { key: 'campus', label: 'Campus' },
                    { key: 'purpose', label: 'Purpose' },
                    { key: 'summary', label: 'Summary' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' }
                ]}
            />
        </div>
    );
};

export default CampusVisitsList;
