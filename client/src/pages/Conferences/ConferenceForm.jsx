import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const ConferenceForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({ date: '', conferenceName: '', country: '', department: '', campus: '', eventSummary: '', driveLink: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchConference(); }, [id]);

    const fetchConference = async () => {
        try {
            const response = await api.get(`/conferences/${id}`);
            const conf = response.data.data;
            setFormData({ date: conf.date ? new Date(conf.date).toISOString().split('T')[0] : '', conferenceName: conf.conferenceName || '', country: conf.country || '', department: conf.department || '', campus: conf.campus || '', eventSummary: conf.eventSummary || '', driveLink: conf.driveLink || '' });
        } catch (error) {
            toast.error('Error fetching conference');
            navigate('/conferences');
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
                await api.put(`/conferences/${id}`, formData);
                toast.success(isAdmin ? 'Conference updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/conferences', formData);
                toast.success('Conference created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/conferences');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving conference');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/conferences')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back to Conferences</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Conference' : 'Add New Conference'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Date *</span></label><input type="date" name="date" className="input input-bordered w-full" value={formData.date} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Conference Name *</span></label><input type="text" name="conferenceName" placeholder="Conference name" className="input input-bordered w-full" value={formData.conferenceName} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Country *</span></label><input type="text" name="country" placeholder="Country" className="input input-bordered w-full" value={formData.country} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Department</span></label><input type="text" name="department" placeholder="Department" className="input input-bordered w-full" value={formData.department} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Campus</span></label><input type="text" name="campus" placeholder="Campus" className="input input-bordered w-full" value={formData.campus} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Event Summary</span></label><textarea name="eventSummary" placeholder="Event summary" className="textarea textarea-bordered w-full" rows="3" value={formData.eventSummary} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Drive Link</span></label><input type="url" name="driveLink" placeholder="https://drive.google.com/..." className="input input-bordered w-full" value={formData.driveLink} onChange={handleChange} /></div>
                        </div>
                        <div className="form-control mt-6">
                            <button type="submit" className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>{!loading && <Save size={18} className="mr-2" />}{loading ? 'Saving...' : (isEdit ? 'Update Conference' : 'Create Conference')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ConferenceForm;
