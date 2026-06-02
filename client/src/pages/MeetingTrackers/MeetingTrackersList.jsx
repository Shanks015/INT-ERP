import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import { getCaseInsensitiveUnique } from '../../utils/filterUtils';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Calendar, Search, X, Eye, FileText, Globe, User, Clock, CheckSquare } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import Pagination from '../../components/Pagination';

const MeetingTrackersList = () => {
    const { isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [meetings, setMeetings] = useState([]);
    const [stats, setStats] = useState({ total: 0, upcoming: 0, onlineCount: 0, offlineCount: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    const [filters, setFilters] = useState({ 
        search: '', 
        mode: '', 
        sheetMonth: '', 
        startDate: '', 
        endDate: '' 
    });

    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(filters.search, 500);

    const [modes, setModes] = useState([]);
    const [sheetMonths, setSheetMonths] = useState([]);

    useEffect(() => {
        fetchMeetings();
        fetchStats();
    }, [currentPage, itemsPerPage, debouncedSearch, filters.mode, filters.sheetMonth, filters.startDate, filters.endDate]);

    useEffect(() => {
        fetchFilterData();
    }, []);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const params = { ...filters, search: debouncedSearch };
            const response = await api.get('/meeting-trackers/stats', { params });
            setStats(response.data.stats || { total: 0, upcoming: 0, onlineCount: 0, offlineCount: 0 });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/meeting-trackers', { params: { limit: 1000 } });
            const records = response.data.data || [];

            const uniqueModes = getCaseInsensitiveUnique(records, 'mode');
            setModes(uniqueModes);

            const uniqueMonths = getCaseInsensitiveUnique(records, 'sheetMonth');
            setSheetMonths(uniqueMonths);
        } catch (error) {
            console.error('Error fetching filter data:', error);
        }
    };

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, search: debouncedSearch, mode: filters.mode, sheetMonth: filters.sheetMonth, startDate: filters.startDate, endDate: filters.endDate };
            const response = await api.get('/meeting-trackers', { params });
            setMeetings(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) {
            toast.error('Error fetching meeting tracker records');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/meeting-trackers/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Meeting record deleted successfully' : 'Delete request submitted');
            fetchMeetings();
            fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting meeting record');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/meeting-trackers/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'meeting-trackers-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Error exporting CSV');
        }
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setFilters({ search: '', mode: '', sheetMonth: '', startDate: '', endDate: '' });
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchInput(e.target.value);
        setFilters(prev => ({ ...prev, search: e.target.value }));
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) {
        return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Meeting Trackers</h1>
                    <p className="text-base-content/70 mt-2">Manage and track international affairs meetings</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none">
                        <Upload size={18} />Import
                    </button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none">
                        <Download size={18} />Export CSV
                    </button>
                    <Link to="/meeting-trackers/new" className="btn btn-primary flex-1 md:flex-none">
                        <Plus size={18} />Add Entry
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard 
                    title="Total Meetings" 
                    value={totalItems}
                    icon={Calendar} 
                    color="primary" 
                    moduleType="meeting-trackers" 
                    statType="total" 
                    moduleData={{ ...stats }} 
                    loading={statsLoading} 
                />
                <SmartStatsCard 
                    title="Upcoming Meetings" 
                    value={stats.upcoming} 
                    icon={Clock} 
                    color="secondary" 
                    moduleType="meeting-trackers" 
                    statType="upcoming" 
                    moduleData={{ ...stats }} 
                    loading={statsLoading} 
                />
                <SmartStatsCard 
                    title="Online / Offline Mode" 
                    value={`${stats.onlineCount} / ${stats.offlineCount}`} 
                    icon={Globe} 
                    color="info" 
                    moduleType="meeting-trackers" 
                    statType="modes" 
                    moduleData={{ ...stats }} 
                    loading={statsLoading} 
                />
            </div>

            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2"><X size={16} /> Clear All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="form-control col-span-1 md:col-span-2">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Search title, host, agenda..." 
                                    className="input input-bordered w-full pr-10" 
                                    value={searchInput} 
                                    onChange={handleSearchChange} 
                                />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Mode</span></label>
                            <select 
                                className="select select-bordered w-full" 
                                value={filters.mode} 
                                onChange={(e) => { setFilters(prev => ({ ...prev, mode: e.target.value })); setCurrentPage(1); }}
                            >
                                <option value="">All Modes</option>
                                {modes.map(mode => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Sheet Month</span></label>
                            <select 
                                className="select select-bordered w-full" 
                                value={filters.sheetMonth} 
                                onChange={(e) => { setFilters(prev => ({ ...prev, sheetMonth: e.target.value })); setCurrentPage(1); }}
                            >
                                <option value="">All Months</option>
                                {sheetMonths.map(month => (
                                    <option key={month} value={month}>{month}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">From Date</span></label>
                            <input 
                                type="date" 
                                className="input input-bordered w-full" 
                                value={filters.startDate} 
                                onChange={(e) => { setFilters(prev => ({ ...prev, startDate: e.target.value })); setCurrentPage(1); }} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Mode & Location</th>
                                    <th>Host</th>
                                    <th>Action Items</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {meetings.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-base-content/50">No meeting trackers found</td></tr>
                                ) : (
                                    meetings.map((meeting) => (
                                        <tr key={meeting._id}>
                                            <td 
                                                className="max-w-xs truncate font-semibold text-primary hover:underline cursor-pointer" 
                                                title="Click to view details"
                                                onClick={() => setDetailModal({ isOpen: true, item: meeting })}
                                            >
                                                {meeting.meetingTitle}
                                            </td>
                                            <td>
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-medium">{formatDate(meeting.date)}</span>
                                                    {meeting.startTime && (
                                                        <span className="text-base-content/60">
                                                            {meeting.startTime} {meeting.endTime ? ` - ${meeting.endTime}` : ''} ({meeting.timezone || 'IST'})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col text-xs">
                                                    <span className="badge badge-accent badge-sm w-fit">{meeting.mode}</span>
                                                    <span className="text-base-content/70 mt-1 max-w-[150px] truncate" title={meeting.platformLocation}>
                                                        {meeting.platformLocation || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-medium">{meeting.hostName || '-'}</span>
                                                    <span className="text-base-content/60">{meeting.hostOrganization || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="max-w-xs truncate text-xs" title={meeting.actionItems}>
                                                {meeting.actionItems || '-'}
                                            </td>
                                            <td>
                                                <div className="flex gap-2 justify-end">
                                                    {meeting.driveLink && (
                                                        <a href={meeting.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="Drive Link">
                                                            <FileText size={16} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => setDetailModal({ isOpen: true, item: meeting })} className="btn btn-info btn-sm" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    <Link to={`/meeting-trackers/edit/${meeting._id}`} className="btn btn-warning btn-sm" title="Edit">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item: meeting })} className="btn btn-error btn-sm" title="Delete">
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
                    {totalItems > 0 && (
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            totalItems={totalItems} 
                            itemsPerPage={itemsPerPage} 
                            onPageChange={setCurrentPage} 
                            onItemsPerPageChange={(newLimit) => { setItemsPerPage(newLimit); setCurrentPage(1); }} 
                        />
                    )}
                </div>
            </div>

            <DeleteConfirmModal 
                isOpen={deleteModal.isOpen} 
                onClose={() => setDeleteModal({ isOpen: false, item: null })} 
                onConfirm={handleDelete} 
                itemName={deleteModal.item?.meetingTitle} 
                requireReason={!isAdmin} 
            />
            
            <ImportModal 
                isOpen={importModal} 
                onClose={() => setImportModal(false)} 
                onSuccess={() => { fetchMeetings(); fetchStats(); fetchFilterData(); }} 
                moduleName="meeting-trackers" 
            />

            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Meeting Details"
                fields={[
                    { key: 'meetingId', label: 'Meeting ID' },
                    { key: 'meetingTitle', label: 'Meeting Title' },
                    { key: 'sheetMonth', label: 'Sheet/Month' },
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'startTime', label: 'Start Time' },
                    { key: 'endTime', label: 'End Time' },
                    { key: 'timezone', label: 'Time Zone' },
                    { key: 'mode', label: 'Mode (Online/Offline)' },
                    { key: 'platformLocation', label: 'Platform / Location' },
                    { key: 'hostOrganization', label: 'Host Organization' },
                    { key: 'hostName', label: 'Host Name' },
                    { key: 'hostEmail', label: 'Host Email' },
                    { key: 'participants', label: 'Participants' },
                    { key: 'keyAgenda', label: 'Key Agenda' },
                    { key: 'discussionSummary', label: 'Discussion Summary' },
                    { key: 'actionItems', label: 'Action Items' },
                    { key: 'nextMeetingDate', label: 'Next Meeting Date', type: 'date' },
                    { key: 'driveLink', label: 'Drive Link (MoM/Recording)', type: 'link' },
                    { key: 'remarks', label: 'Remarks' }
                ]}
            />
        </div>
    );
};

export default MeetingTrackersList;
