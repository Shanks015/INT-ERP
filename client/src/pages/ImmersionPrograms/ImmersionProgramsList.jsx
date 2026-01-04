import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Plane, TrendingUp, Clock, Eye, Globe, CheckCircle, X, Search } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import Pagination from '../../components/Pagination';

const ImmersionProgramsList = () => {
    const { isAdmin } = useAuth();
    const [programs, setPrograms] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, active: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', direction: '', programStatus: '', country: '', startDate: '', endDate: '' });
    const [searchInput, setSearchInput] = useState('');
    const [countries, setCountries] = useState([]);

    useEffect(() => { fetchPrograms(); fetchStats(); fetchCountries(); }, [currentPage, itemsPerPage, filters]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchInput }));
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/immersion-programs/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchCountries = async () => {
        try {
            const response = await api.get('/immersion-programs', { params: { limit: 1000 } });
            const progs = response.data.data || [];
            const uniqueCountries = [...new Set(progs.map(p => p.country).filter(Boolean))].sort();
            setCountries(uniqueCountries);
        } catch (error) { console.error('Error fetching countries:', error); }
    };

    const fetchPrograms = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/immersion-programs', { params });
            setPrograms(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching programs'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/immersion-programs/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Program deleted successfully' : 'Delete request submitted');
            fetchPrograms(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting program'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/immersion-programs/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'immersion-programs-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setFilters({ search: '', direction: '', programStatus: '', country: '', startDate: '', endDate: '' });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div><h1 className="text-3xl font-bold">Immersion Programs</h1><p className="text-base-content/70 mt-2">Manage immersion programs</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline"><Download size={18} />Export CSV</button>
                    <Link to="/immersion-programs/new" className="btn btn-primary"><Plus size={18} />Add Program</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Programs" value={stats.total} icon={Plane} color="primary" />
                <StatsCard title="Countries" value={stats.countries} icon={Globe} color="secondary" />
                <StatsCard title="Active" value={stats.active} icon={CheckCircle} color="success" />
            </div>

            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2"><X size={16} /> Clear All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input type="text" placeholder="Search university..." className="input input-bordered w-full pr-10" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Direction</span></label>
                            <select className="select select-bordered w-full" value={filters.direction || ''} onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value }))}>
                                <option value="">All Directions</option>
                                <option value="Outgoing">Outgoing</option>
                                <option value="Incoming">Incoming</option>
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Status</span></label>
                            <select className="select select-bordered w-full" value={filters.programStatus || ''} onChange={(e) => setFilters(prev => ({ ...prev, programStatus: e.target.value }))}>
                                <option value="">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Upcoming">Upcoming</option>
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Country</span></label>
                            <select className="select select-bordered w-full" value={filters.country || ''} onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}>
                                <option value="">All Countries</option>
                                {countries.map(country => <option key={country} value={country}>{country}</option>)}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">From Date</span></label>
                            <input type="date" className="input input-bordered w-full" value={filters.startDate || ''} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">To Date</span></label>
                            <input type="date" className="input input-bordered w-full" value={filters.endDate || ''} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>University</th><th>Country</th><th>Direction</th><th>Participants</th><th>Status</th><th>Duration</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {programs.length === 0 ? <tr><td colSpan={7} className="text-center py-8">No programs found</td></tr> : programs.map((program) => (
                                    <tr key={program._id}>
                                        <td className="max-w-xs" title={program.university}>{program.university}</td>
                                        <td>{program.country}</td>
                                        <td><span className={`badge badge-sm ${program.direction === 'Outgoing' ? 'badge-primary' : 'badge-secondary'}`}>{program.direction}</span></td>
                                        <td>{program.numberOfPax}</td>
                                        <td><span className={`badge badge-sm ${program.programStatus === 'Completed' ? 'badge-success' : 'badge-info'}`}>{program.programStatus}</span></td>
                                        <td>{program.arrivalDate ? `${new Date(program.arrivalDate).toLocaleDateString()} - ${new Date(program.departureDate).toLocaleDateString()}` : '-'}</td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {program.driveLink && (
                                                    <a href={program.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: program })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/immersion-programs/edit/${program._id}`} className="btn btn-warning btn-sm"><Edit size={16} /></Link>
                                                {isAdmin && <button onClick={() => setDeleteModal({ isOpen: true, item: program })} className="btn btn-error btn-sm"><Trash2 size={16} /></button>}
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

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.university} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchPrograms(); fetchStats(); }} moduleName="immersion-programs" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Immersion Program Details"
                fields={[
                    { key: 'programStatus', label: 'Program Status' },
                    { key: 'direction', label: 'Direction' },
                    { key: 'university', label: 'University' },
                    { key: 'country', label: 'Country' },
                    { key: 'numberOfPax', label: 'Number of Participants' },
                    { key: 'summary', label: 'Summary' },
                    { key: 'arrivalDate', label: 'Arrival Date', type: 'date' },
                    { key: 'departureDate', label: 'Departure Date', type: 'date' },
                    { key: 'feesPerPax', label: 'Fees Per Participant' },
                    { key: 'department', label: 'Department' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default ImmersionProgramsList;
