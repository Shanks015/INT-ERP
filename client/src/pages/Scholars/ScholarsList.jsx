import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Clock, Upload } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';

const ScholarsList = () => {
    const { isAdmin } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            const response = await api.get('/scholars-in-residence');
            setItems(response.data.data || []);
        } catch (error) {
            toast.error('Error fetching scholars');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/scholars-in-residence/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Scholar deleted successfully' : 'Delete request submitted for approval');
            fetchItems();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting scholar');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.post('/scholars-in-residence/export-csv', {}, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scholars-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Error exporting CSV');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div><h1 className="text-3xl font-bold">Scholars in Residence</h1><p className="text-base-content/70 mt-2">Manage visiting scholars</p></div>
                <div className="flex gap-2">
                    <button onClick={handleExportCSV} className="btn btn-outline"><Download size={18} />Export CSV</button>
                    <Link to="/scholars-in-residence/new" className="btn btn-primary"><Plus size={18} />Add Scholar</Link>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Scholar Name</th><th>Country</th><th>Department</th><th>From Date</th><th>To Date</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8">No scholars found.</td></tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item._id}>
                                            <td>{item.scholarName}</td>
                                            <td>{item.country}</td>
                                            <td>{item.department || '-'}</td>
                                            <td>{new Date(item.fromDate).toLocaleDateString()}</td>
                                            <td>{new Date(item.toDate).toLocaleDateString()}</td>
                                            <td>
                                                {item.status === 'pending_edit' && <span className="badge badge-warning gap-2"><Clock size={14} />Edit Pending</span>}
                                                {item.status === 'pending_delete' && <span className="badge badge-error gap-2"><Clock size={14} />Delete Pending</span>}
                                                {item.status === 'active' && <span className="badge badge-success">Active</span>}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link to={`/scholars-in-residence/edit/${item._id}`} className={`btn btn-warning btn-sm ${item.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item })} className={`btn btn-error btn-sm ${item.status !== 'active' ? 'btn-disabled' : ''}`} disabled={item.status !== 'active'}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.scholarName} requireReason={!isAdmin} />
        </div>
    );
};

export default ScholarsList;
