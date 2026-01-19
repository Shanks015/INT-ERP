import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import { getCaseInsensitiveUnique } from '../../utils/filterUtils';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Calendar, TrendingUp, Clock, Search, X, Eye, MapPin, FileText, Tag, Building2 } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import SmartStatsCard from '../../components/SmartStatsCard';
import Pagination from '../../components/Pagination';

const EventsList = () => {
    const { isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({ total: 0, eventTypes: 0, departments: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', type: '', department: '', startDate: '', endDate: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    // Dynamic filter data
    const [eventTypes, setEventTypes] = useState([]);
    const [departments, setDepartments] = useState([]);

    useEffect(() => { fetchEvents(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.type, filters.department, filters.startDate, filters.endDate]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/events/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/events', { params: { limit: 1000 } });
            const events = response.data.data || [];

            const uniqueTypes = getCaseInsensitiveUnique(events, 'type');
            setEventTypes(uniqueTypes);

            const uniqueDepts = getCaseInsensitiveUnique(events, 'department');
            setDepartments(uniqueDepts);
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchFilters = async () => {
        try {
            const response = await api.get('/events', { params: { limit: 1000 } });
            const evts = response.data.data || [];
            const uniqueTypes = getCaseInsensitiveUnique(evts, 'type');
            setEventTypes(uniqueTypes);
        } catch (error) { console.error('Error fetching filters:', error); }
    };

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/events', { params });
            setEvents(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching events'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/events/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Event deleted successfully' : 'Delete request submitted');
            fetchEvents(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting event'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/events/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'events-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setFilters({ search: '', type: '', department: '', startDate: '', endDate: '' });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Events</h1><p className="text-base-content/70 mt-2">Manage event records</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/events/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Event</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SmartStatsCard title="Total Events" value={stats.total} icon={Calendar} color="primary" moduleType="events" statType="total" moduleData={{ total: stats.total, types: stats.eventTypes, departments: stats.departments }} />
                <SmartStatsCard title="Event Types" value={stats.eventTypes} icon={Tag} color="secondary" moduleType="events" statType="types" moduleData={{ total: stats.total, types: stats.eventTypes, departments: stats.departments }} />
                <SmartStatsCard title="Departments" value={stats.departments} icon={Building2} color="info" moduleType="events" statType="departments" moduleData={{ total: stats.total, types: stats.eventTypes, departments: stats.departments }} />
            </div>

            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2"><X size={16} /> Clear All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input type="text" placeholder="Search title, department..." className="input input-bordered w-full pr-10" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Event Type</span></label>
                            <select className="select select-bordered w-full" value={filters.type || ''} onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}>
                                <option value="">All Types</option>
                                {eventTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Department</span></label>
                            <select className="select select-bordered w-full" value={filters.department || ''} onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}>
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
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
                            <thead><tr><th>Title</th><th>Type</th><th>University / Country</th><th>Date</th><th>Department</th><th>Campus</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {events.length === 0 ? <tr><td colSpan={8} className="text-center py-8">No events found</td></tr> : events.map((event) => (
                                    <tr key={event._id}>
                                        <td className="max-w-md" title={event.title}>{event.title}</td>
                                        <td><span className="badge badge-info badge-sm whitespace-nowrap">{event.type ? event.type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s*\/\s*/g, ' / ') : '-'}</span></td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{event.universityCountry}</span>
                                            </div>
                                        </td>
                                        <td>{formatDate(event.date)}</td>
                                        <td>{event.department || '-'}</td>
                                        <td>{event.campus || '-'}</td>
                                        <td>
                                            {event.status === 'pending_edit' && <span className="badge badge-warning badge-sm gap-2 whitespace-nowrap"><Clock size={12} />Edit Pending</span>}
                                            {event.status === 'pending_delete' && <span className="badge badge-error badge-sm gap-2 whitespace-nowrap"><Clock size={12} />Delete Pending</span>}
                                            {event.status === 'active' && <span className="badge badge-success badge-sm whitespace-nowrap">Active</span>}
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {event.driveLink && (
                                                    <a href={event.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item: event })} className="btn btn-info btn-sm" title="View Details"><Eye size={16} /></button>
                                                <Link to={`/events/edit/${event._id}`} className="btn btn-warning btn-sm"><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item: event })} className="btn btn-error btn-sm"><Trash2 size={16} /></button>
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

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.title} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchEvents(); fetchStats(); }} moduleName="events" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Event Details"
                fields={[
                    { key: 'title', label: 'Title' },
                    { key: 'type', label: 'Event Type' },
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'department', label: 'Department' },
                    { key: 'campus', label: 'Campus/Venue' },
                    { key: 'universityCountry', label: 'Country/University' },
                    { key: 'dignitaries', label: 'Dignitaries/Speakers' },
                    { key: 'eventSummary', label: 'Event Summary' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' }
                ]}
            />
        </div>
    );
};

export default EventsList;

