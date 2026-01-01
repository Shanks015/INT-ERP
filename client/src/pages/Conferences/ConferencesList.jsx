import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Clock, Upload } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';

const ConferencesList = () => {
    const { isAdmin } = useAuth();
    const [conferences, setConferences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);

    useEffect(() => { fetchConferences(); }, []);

    const fetchConferences = async () => {
        try {
            const response = await api.get('/conferences');
            setConferences(response.data.data || []);
        } catch (error) {
            toast.error('Error fetching conferences');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/conferences/${deleteModal.item._id}`, { data: { reason } });
            toast.success(isAdmin ? 'Conference deleted successfully' : 'Delete request submitted for approval');
            fetchConferences();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting conference');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.post('/conferences/export-csv', {}, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'conferences-export.csv');
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
                <div><h1 className="text-3xl font-bold">Conferences</h1><p className="text-base-content/70 mt-2">Manage conference attendance</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline"><Upload size={18} />Import</button>
                    <button onClick={handleExportCSV} className="btn btn-outline"><Download size={18} />Export CSV</button>
                    <Link to="/conferences/new" className="btn btn-primary"><Plus size={18} />Add Conference</Link>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead><tr><th>Date</th><th>Conference Name</th><th>Country</th><th>Department</th><th>Campus</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {conferences.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-8">No conferences found.</td></tr>
                                ) : (
                                    conferences.map((conf) => (
                                        <tr key={conf._id}>
                                            <td>{new Date(conf.date).toLocaleDateString()}</td>
                                            <td>{conf.conferenceName}</td>
                                            <td>{conf.country}</td>
                                            <td>{conf.department || '-'}</td>
                                            <td>{conf.campus || '-'}</td>
                                            <td>
                                                {conf.status === 'pending_edit' && <span className="badge badge-warning gap-2"><Clock size={14} />Edit Pending</span>}
                                                {conf.status === 'pending_delete' && <span className="badge badge-error gap-2"><Clock size={14} />Delete Pending</span>}
                                                {conf.status === 'active' && <span className="badge badge-success">Active</span>}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link to={`/conferences/edit/${conf._id}`} className={`btn btn-warning btn-sm ${conf.status !== 'active' ? 'btn-disabled' : ''}`}><Edit size={16} /></Link>
                                                    <button onClick={() => setDeleteModal({ isOpen: true, item: conf })} className={`btn btn-error btn-sm ${conf.status !== 'active' ? 'btn-disabled' : ''}`} disabled={conf.status !== 'active'}><Trash2 size={16} /></button>
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

            <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} onConfirm={handleDelete} itemName={deleteModal.item?.conferenceName} requireReason={!isAdmin} />
            <ImportModal isOpen={importModal} onClose={() => setImportModal(false)} onSuccess={fetchConferences} moduleName="conferences" />
        </div>
    );
};

export default ConferencesList;
