import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useDateFormat } from '../../utils/dateFormat';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Upload, TrendingUp, Eye, Search, ExternalLink, Facebook, Instagram, Linkedin } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';
import DetailModal from '../../components/Modal/DetailModal';
import StatsCard from '../../components/StatsCard';
import Pagination from '../../components/Pagination';

const SocialMediaList = () => {
    const { isAdmin } = useAuth();
    const formatDate = useDateFormat();
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState({ total: 0 });
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ isOpen: false, item: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState({ search: '' });

    const debouncedSearch = useDebounce(filters.search, 500);

    useEffect(() => { fetchPosts(); fetchStats(); }, [currentPage, itemsPerPage, debouncedSearch]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/social-media/stats');
            setStats(response.data.stats);
        } catch (error) { console.error('Error fetching stats:', error); }
    };

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: itemsPerPage, ...filters };
            const response = await api.get('/social-media', { params });
            setPosts(response.data.data || []);
            setTotalItems(response.data.pagination?.total || 0);
            setTotalPages(response.data.pagination?.pages || 0);
        } catch (error) { toast.error('Error fetching posts'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/social-media/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Post deleted successfully' : 'Delete request submitted');
            fetchPosts(); fetchStats();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) { toast.error(error.response?.data?.message || 'Error deleting post'); }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/social-media/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'social-media-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) { toast.error('Error exporting CSV'); }
    };

    const handleClearFilters = () => {
        setFilters({ search: '' });
        setCurrentPage(1);
    };

    if (loading && currentPage === 1) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div><h1 className="text-3xl font-bold">Social Media</h1><p className="text-base-content/70 mt-2">Manage social media posts</p></div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline flex-1 md:flex-none"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline flex-1 md:flex-none"><Download size={18} />Export CSV</button>
                    <Link to="/social-media/new" className="btn btn-primary flex-1 md:flex-none"><Plus size={18} />Add Post</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Posts" value={stats.total || 0} icon={TrendingUp} />
            </div>

            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="form-control flex-1">
                            <div className="input-group"><span><Search size={18} /></span><input type="text" placeholder="Search posts..." className="input input-bordered w-full" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
                        </div>
                        {filters.search && <button onClick={handleClearFilters} className="btn btn-ghost">Clear Filters</button>}
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Post Name</th><th>Caption</th><th>Date</th><th>Platform Links</th><th>Actions</th></tr></thead>
                            <tbody>
                                {posts.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8">No posts found</td></tr>
                                ) : (
                                    posts.map((post) => (
                                        <tr key={post._id}>
                                            <td className="font-medium">{post.postName}</td>
                                            <td><div className="max-w-xs truncate">{post.caption || '-'}</div></td>
                                            <td>{formatDate(post.createdAt)}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    {post.fbLink && <a href={post.fbLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs"><Facebook size={16} /></a>}
                                                    {post.instaLink && <a href={post.instaLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs"><Instagram size={16} /></a>}
                                                    {post.linkedinLink && <a href={post.linkedinLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs"><Linkedin size={16} /></a>}
                                                    {post.vkLink && <a href={post.vkLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs"><ExternalLink size={16} /></a>}
                                                    {!post.fbLink && !post.instaLink && !post.linkedinLink && !post.vkLink && '-'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setDetailModal({ isOpen: true, item: post })} className="btn btn-ghost btn-xs"><Eye size={16} /></button>
                                                    <Link to={`/social-media/${post._id}`} className="btn btn-ghost btn-xs"><Edit size={16} /></Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item: post })} className="btn btn-ghost btn-xs text-error"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
                </div>
            </div>

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.postName || ''} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} endpoint="/social-media/import" onSuccess={() => { fetchPosts(); fetchStats(); }} title="Import Social Media Posts" />
            <DetailModal isOpen={detailModal.isOpen} onClose={() => setDetailModal({ isOpen: false, item: null })} item={detailModal.item} title="Post Details" fields={[
                { label: 'Post Name', value: 'postName' },
                { label: 'Caption', value: 'caption' },
                { label: 'Facebook', value: 'fbLink', type: 'link' },
                { label: 'Instagram', value: 'instaLink', type: 'link' },
                { label: 'LinkedIn', value: 'linkedinLink', type: 'link' },
                { label: 'VK', value: 'vkLink', type: 'link' }
            ]} />
        </div>
    );
};

export default SocialMediaList;
