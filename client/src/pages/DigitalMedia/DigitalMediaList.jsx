import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import { getCaseInsensitiveUnique } from '../../utils/filterUtils';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, Radio, TrendingUp, Clock, Eye, Hash, X, Search, ExternalLink, FileText } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import Pagination from '../../components/Pagination';

const DigitalMediaList = () => {
    const { isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [media, setMedia] = useState([]);
    const [stats, setStats] = useState({ total: 0, channels: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '', channel: '' });

    // Debounce search to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search, 500);

    const [mediaTypes, setMediaTypes] = useState([]);
    const [platformTypes, setPlatformTypes] = useState([]);
    const [channels, setChannels] = useState([]);

    useEffect(() => { fetchMedia(); fetchStats(); fetchFilterData(); }, [currentPage, itemsPerPage, debouncedSearch, filters.startDate, filters.endDate, filters.channel]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/digital-media/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchFilterData = async () => {
        try {
            const response = await api.get('/digital-media', { params: { limit: 1000 } });
            const media = response.data.data || [];
            setChannels(getCaseInsensitiveUnique(media, 'channel'));
        } catch (error) { console.error('Error fetching filter data:', error); }
    };

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/digital-media', { params });
            setMedia(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching media'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/digital-media/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Media deleted successfully' : 'Delete request submitted');
            fetchMedia(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting media'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/digital-media/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'digital-media-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleClearFilters = () => {
        setFilters({ search: '', startDate: '', endDate: '', channel: '' });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Digital Media</h1><p className="text-base-content/70 mt-2">Manage digital media coverage</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/digital-media/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Media</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <StatsCard title="Total Media" value={stats.total} icon={Radio} color="primary" />
                <StatsCard title="Channels" value={stats.channels} icon={Hash} color="secondary" />
            </div>

            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-sm gap-2"><X size={16} /> Clear All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Search</span></label>
                            <div className="relative">
                                <input type="text" placeholder="Search topic, channel..." className="input input-bordered w-full pr-10" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                                <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Channel</span></label>
                            <select className="select select-bordered w-full" value={filters.channel || ''} onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}>
                                <option value="">All Channels</option>
                                {channels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
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
                            <thead><tr><th>Article Topic</th><th>Channel</th><th>Date</th><th>Amount Paid</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {media.length === 0 ? <tr><td colSpan={5} className="text-center py-8">No media found</td></tr> : media.map((item) => (
                                    <tr key={item._id}>
                                        <td className="max-w-md" title={item.articleTopic}>{item.articleTopic}</td>
                                        <td>{item.channel}</td>
                                        <td>{formatDate(item.date)}</td>
                                        <td>{item.amountPaid || 'Zero'}</td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {item.driveLink && (
                                                    <a href={item.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm text-white" title="View Documents">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                {item.articleLink && (
                                                    <a href={item.articleLink} target="_blank" rel="noopener noreferrer" className="btn btn-info btn-sm text-white" title="Read Article">
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                                <button onClick={() => setDetailModal({ isOpen: true, item })} className="btn btn-info btn-sm" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <Link to={`/digital-media/edit/${item._id}`} className="btn btn-warning btn-sm"><Edit size={16} /></Link>
                                                <button onClick={() => setDeleteModal({ isOpen: true, item })} className="btn btn-error btn-sm"><Trash2 size={16} /></button>
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

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.articleTopic} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={() => { fetchMedia(); fetchStats(); }} moduleName="digital-media" />
            <DetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, item: null })}
                data={detailModal.item}
                title="Digital Media Details"
                fields={[
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'articleTopic', label: 'Article Topic' },
                    { key: 'channel', label: 'Channel' },
                    { key: 'articleLink', label: 'Article Link', type: 'link' },
                    { key: 'amountPaid', label: 'Amount Paid' },
                    { key: 'driveLink', label: 'Drive Link', type: 'link' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Created At', type: 'date' },
                    { key: 'updatedAt', label: 'Updated At', type: 'date' }
                ]}
            />
        </div>
    );
};

export default DigitalMediaList;
