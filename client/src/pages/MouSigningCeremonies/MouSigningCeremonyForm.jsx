import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const MouSigningCeremonyForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({ date: '', type: '', visitorName: '', universityName: '', department: '', eventSummary: '', campus: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/mou-signing-ceremonies/${id}`);
            const item = response.data.data;
            setFormData({ date: item.date ? new Date(item.date).toISOString().split('T')[0] : '', type: item.type || '', visitorName: item.visitorName || '', universityName: item.universityName || '', department: item.department || '', eventSummary: item.eventSummary || '', campus: item.campus || '' });
        } catch (error) {
            toast.error('Error fetching record');
            navigate('/mou-signing-ceremonies');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/mou-signing-ceremonies/${id}`, formData);
                toast.success(isAdmin ? 'Record updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/mou-signing-ceremonies', formData);
                toast.success('Record created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/mou-signing-ceremonies');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving record');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/mou-signing-ceremonies')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit MoU Signing Ceremony' : 'Add MoU Signing Ceremony'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Date *</span></label><input type="date" name="date" className="input input-bordered w-full" value={formData.date} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Type</span></label><input type="text" name="type" placeholder="Type" className="input input-bordered w-full" value={formData.type} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Visitor Name *</span></label><input type="text" name="visitorName" placeholder="Visitor name" className="input input-bordered w-full" value={formData.visitorName} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">University Name *</span></label><input type="text" name="universityName" placeholder="University" className="input input-bordered w-full" value={formData.universityName} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Department</span></label><input type="text" name="department" placeholder="Department" className="input input-bordered w-full" value={formData.department} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Campus</span></label><input type="text" name="campus" placeholder="Campus" className="input input-bordered w-full" value={formData.campus} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Event Summary</span></label><textarea name="eventSummary" placeholder="Event summary" className="textarea textarea-bordered w-full" rows={3} value={formData.eventSummary} onChange={handleChange} /></div>
                        </div>
                        <div className="form-control mt-6">
                            <button type="submit" className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>{!loading && <Save size={18} className="mr-2" />}{loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MouSigningCeremonyForm;
