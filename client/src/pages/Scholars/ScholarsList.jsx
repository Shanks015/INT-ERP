import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { toDDMMM } from '../../utils/dateFormat';
import { statusBadgeClass } from '../../utils/statusBadge';
import { COUNTRIES, SCHOLAR_DESIGNATIONS, SCHOLAR_CAMPUSES } from '../../constants/options';
import { getCaseInsensitiveUnique } from '../../utils/filterUtils';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, GraduationCap, TrendingUp, Clock, Eye, FileText, Globe, Building2 } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';

const ScholarsList = () => {
    const { isAdmin } = useAuth();
    const [scholars, setScholars] = useState([]);
    const [stats, setStats] = useState({ total: 0, countries: 0, departments: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', country: '', department: '', designation: '', campus: '', scholarStatus: '', recordStatus: '', startDate: '', endDate: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    const [departments, setDepartments] = useState([]);
    const [scholarStatuses, setScholarStatuses] = useState([]);
    useEffect(() => { fetchScholars(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.country, filters.department, filters.designation, filters.campus, filters.scholarStatus, filters.recordStatus, filters.startDate, filters.endDate]);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const response = await api.get('/scholars-in-residence/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
        finally { setStatsLoading(false); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/scholars-in-residence', { params: { limit: 1000 } });
            const scholars = response.data.data || [];
            // Lists that have no fixed canonical set are derived from live data so
            // the dropdown options always match exactly what is stored.
            setDepartments(getCaseInsensitiveUnique(scholars, 'department'));
            setScholarStatuses(getCaseInsensitiveUnique(scholars, 'scholarStatus'));
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchScholars = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                country: filters.country,
                department: filters.department,
                designation: filters.designation,
                campus: filters.campus,
                scholarStatus: filters.scholarStatus,
                recordStatus: filters.recordStatus,
                startDate: filters.startDate,
                endDate: filters.endDate
            };
            const response = await api.get('/scholars-in-residence', { params });
            setScholars(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching scholars'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/scholars-in-residence/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Scholar deleted successfully' : 'Delete request submitted');
            fetchScholars(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting scholar'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/scholars-in-residence/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scholars-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleFilterChange = (newFilters) => { setFilters(prev => ({ ...prev, ...newFilters })); setCurrentPage(1); };
    const handleClearFilters = () => { setFilters({ search: '', country: '', department: '', designation: '', campus: '', scholarStatus: '', recordStatus: '', startDate: '', endDate: '' }); setCurrentPage(1); };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Scholars in Residence</h1><p className="text-base-content/70 mt-2">Manage visiting scholars</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/scholars-in-residence/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Scholar</Link>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard title="Total Scholars" value={totalItems} icon={GraduationCap} color="primary" moduleType="scholars" statType="total" moduleData={{ ...stats }} loading={loading} />
                <SmartStatsCard title="Countries" value={stats.countries} icon={Globe} color="secondary" moduleType="scholars" statType="countries" moduleData={{ ...stats }} loading={statsLoading} />
                <SmartStatsCard title="Departments" value={stats.departments} icon={Building2} color="info" moduleType="scholars" statType="departments" moduleData={{ ...stats }} loading={statsLoading} />
            </div>
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                selectFilters={[
                    { key: 'country', label: 'Country', options: COUNTRIES },
                    { key: 'designation', label: 'Designation', options: SCHOLAR_DESIGNATIONS },
                    { key: 'campus', label: 'Campus', options: SCHOLAR_CAMPUSES },
                    { key: 'department', label: 'Department', options: departments },
                    { key: 'scholarStatus', label: 'Scholar Status', options: scholarStatuses }
                ]}
            />
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Scholar Name</th><th>University</th><th>Country</th><th>Duration</th><th>Campus</th><th>Status</th><th>Notes</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {loading && scholars.length === 0 ? <tr><td colSpan={8} className="text-center py-8"><span className="loading loading-spinner loading-md"></span></td></tr> : scholars.length === 0 ? <tr><td colSpan={8} className="text-center py-8">No scholars found</td></tr> : scholars.map((scholar) => (
                                    <tr key={scholar._id}>
                                        <td className="font-medium">{scholar.scholarName}</td>
                                        <td>{scholar.university || '-'}</td>
                                        <td>{scholar.country}</td>
                                        <td>
                                            {scholar.startDate ? (
                                                <span className="text-xs whitespace-nowrap">
                                                    {toDDMMM(scholar.startDate)}{scholar.endDate ? ` - ${toDDMMM(scholar.endDate)}` : ' - Present'}
                                                    {scholar.durationDays ? ` (${scholar.durationDays}d)` : ''}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>{scholar.campus || '-'}</td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span className={`badge badge-sm ${statusBadgeClass(scholar.scholarStatus)} whitespace-nowrap`}>{scholar.scholarStatus || '-'}</span>
                                                {/* System flags — shown only when they add info */}
                                                {scholar.recordStatus === 'expired' && <span className="badge badge-error badge-sm whitespace-nowrap">Expired</span>}
                                                {scholar.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                                {scholar.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-1 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                            </div>
                                        </td>
                                        <td>
                                            {scholar.notes ? (
                                                <div className="max-w-[220px]" title={scholar.notes}>
                                                    <span className="text-xs text-base-content/80 line-clamp-2 break-words">{scholar.notes}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {scholar.driveLink && (
                                                    <a href={scholar.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: scholar })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/scholars-in-residence/edit/${scholar._id}`} className={`btn btn-warning btn-sm ${scholar.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item: scholar })} className={`btn btn-error btn-sm ${scholar.status !== 'active' ? 'btn-disabled' : ''}`} disabled={scholar.status !== 'active'}><Trash2 size={16} /></button>
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
            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.scholarName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchScholars(); fetchStats(); }} moduleName="scholars-in-residence" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Scholar Details"
                fields={[
                    { key: 'scholarName', label: 'Scholar Name' },
                    { key: 'designation', label: 'Designation' },
                    { key: 'university', label: 'University' },
                    { key: 'country', label: 'Country' },
                    { key: 'qsRanking', label: 'QS Ranking' },
                    { key: 'durationDays', label: 'Duration / Days' },
                    { key: 'startDate', label: 'Start Date', type: 'date', format: 'DD/MMM/YYYY' },
                    { key: 'endDate', label: 'End Date', type: 'date', format: 'DD/MMM/YYYY' },
                    { key: 'department', label: 'Schools / Department' },
                    { key: 'campus', label: 'Accommodation / Campus' },
                    { key: 'scholarStatus', label: 'Status' },
                    { key: 'email', label: 'Email', type: 'email' },
                    { key: 'mobile', label: 'Mobile' },
                    { key: 'summary', label: 'Remarks / Summary' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'notes', label: 'Notes' }
                ]}
            />
        </div>
    );
};

export default ScholarsList;

