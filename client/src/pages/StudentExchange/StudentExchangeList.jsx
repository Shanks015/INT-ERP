import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Clock, Upload } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';

const StudentExchangeList = () => {
    const { isAdmin } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            const response = await api.get('/student-exchange');
            setItems(response.data.data || []);
        } catch (error) {
            toast.error('Error fetching student exchanges');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/student-exchange/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Record deleted successfully' : 'Delete request submitted for approval');
            fetchItems();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting record');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.post('/student-exchange/export-csv', {}, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'student-exchange-export.csv');
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
                <div><h1 className="text-3xl font-bold">Student Exchange</h1><p className="text-base-content/70 mt-2">Manage student exchange programs</p></div>
                <div className="flex gap-2">
                    <button onClick={handleExportCSV} className="btn btn-outline"><Download size={18} />Export CSV</button>
                    <Link to="/student-exchange/new" className="btn btn-primary"><Plus size={18} />Add Exchange</Link>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Direction</th><th>Student Name</th><th>University</th><th>Course</th><th>Semester/Year</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8">No student exchanges found.</td></tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item._id}>
                                            <td><span className="badge badge-info">{item.direction}</span></td>
                                            <td>{item.studentName}</td>
                                            <td>{item.exchangeUniversity}</td>
                                            <td>{item.course || '-'}</td>
                                            <td>{item.semesterYear || '-'}</td>
                                            <td>
                                                {item.status === 'pending_edit' && <span className="badge badge-warning gap-2"><Clock size={14} />Edit Pending</span>}
                                                {item.status === 'pending_delete' && <span className="badge badge-error gap-2"><Clock size={14} />Delete Pending</span>}
                                                {item.status === 'active' && <span className="badge badge-success">Active</span>}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link to={`/student-exchange/edit/${item._id}`} className={`btn btn-warning btn-sm ${item.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
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

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.studentName} requireReason={!isAdmin} />
        </div>
    );
};

export default StudentExchangeList;
