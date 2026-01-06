import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, GraduationCap, TrendingUp, Clock, Eye, Globe, CheckCircle } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import StatsCard from '../../components/StatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const MastersAbroadList = () => {
    const { isAdmin } = useAuth();
    const [programs, setPrograms] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, active: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', country: '', university: '', courseType: '', startDate: '', endDate: '' });
    const [searchInput, setSearchInput] = useState('');
    const [countries, setCountries] = useState([]);
    const [universities, setUniversities] = useState([]);
    const [courseTypes, setCourseTypes] = useState([]);

    useEffect(() => { fetchPrograms(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, filters]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/masters-abroad/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/masters-abroad', { params: { limit: 1000 } });
            const masters = response.data.data || [];
            setCountries([...new Set(masters.map(m => m.country).filter(Boolean))].sort());
            setUniversities([...new Set(masters.map(m => m.university).filter(Boolean))].sort());
            setCourseTypes([...new Set(masters.map(m => m.courseType).filter(Boolean))].sort());
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchPrograms = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/masters-abroad', { params });
            setPrograms(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching programs'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/masters-abroad/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Program deleted successfully' : 'Delete request submitted');
            fetchPrograms(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting program'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/masters-abroad/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'masters-abroad-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleFilterChange = (newFilters) => { setFilters(prev => ({ ...prev, ...newFilters })); setCurrentPage(1); };
    const handleClearFilters = () => { setFilters({ search: '', country: '', university: '', courseType: '', startDate: '', endDate: '' }); setCurrentPage(1); };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Masters Abroad</h1><p className="text-base-content/70 mt-2">Manage masters programs abroad</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/masters-abroad/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Program</Link>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Programs" value={stats.total} icon={GraduationCap} color="primary" />
                <StatsCard title="Countries" value={stats.countries} icon={Globe} color="secondary" />
                <StatsCard title="Active" value={stats.active} icon={CheckCircle} color="success" />
            </div>
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showCountryFilter={true}
                countries={countries}
                universities={universities}
                courseTypes={courseTypes}
            />
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>University</th><th>Country</th><th>Duration</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {programs.length === 0 ? <tr><td colSpan={5} className="text-center py-8">No programs found</td></tr> : programs.map((program) => (
                                    <tr key={program._id}>
                                        <td>{program.university}</td>
                                        <td>{program.country}</td>
                                        <td>{program.duration || '-'}</td>
                                        <td>
                                            {program.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-2"><Clock size={14} />Edit Pending</span>}
                                            {program.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-2"><Clock size={14} />Delete Pending</span>}
                                            {program.status === 'active' && <span className="badge badge-success">Active</span>}
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {program.driveLink && (
                                                    <a href={program.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <Link to={`/masters-abroad/edit/${program._id}`} className={`btn btn-warning btn-sm ${program.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item: program })} className={`btn btn-error btn-sm ${program.status !== 'active' ? 'btn-disabled' : ''}`} disabled={program.status !== 'active'}><Trash2 size={16} /></button>
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
            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.programName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchPrograms(); fetchStats(); }} moduleName="masters-abroad" />
        </div>
    );
};

export default MastersAbroadList;
