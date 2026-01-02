import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const DigitalMediaForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        date: '',
        channel: '',
        articleTopic: '',
        articleLink: '',
        amountPaid: '',
        summary: '',
        driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/digital-media/${id}`);
            const item = response.data.data;
            setFormData({
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
                channel: item.channel || '',
                articleTopic: item.articleTopic || '',
                articleLink: item.articleLink || '',
                amountPaid: item.amountPaid || '',
                summary: item.summary || '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching media');
            navigate('/digital-media');
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
                await api.put(`/digital-media/${id}`, formData);
                toast.success(isAdmin ? 'Media updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/digital-media', formData);
                toast.success('Media created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/digital-media');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving media');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/digital-media')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Digital Media' : 'Add Digital Media'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Date *</span></label><input type="date" name="date" className="input input-bordered w-full" value={formData.date} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Article Topic *</span></label><input type="text" name="articleTopic" placeholder="Article Topic" className="input input-bordered w-full" value={formData.articleTopic} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Channel</span></label><input type="text" name="channel" placeholder="Channel Name" className="input input-bordered w-full" value={formData.channel} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Article Link</span></label><input type="url" name="articleLink" placeholder="https://..." className="input input-bordered w-full" value={formData.articleLink} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Amount Paid</span></label><input type="text" name="amountPaid" placeholder="e.g. 5000" className="input input-bordered w-full" value={formData.amountPaid} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Summary</span></label><textarea name="summary" placeholder="Summary" className="textarea textarea-bordered w-full" rows="3" value={formData.summary} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Drive Link</span></label><input type="url" name="driveLink" placeholder="https://drive.google.com/..." className="input input-bordered w-full" value={formData.driveLink} onChange={handleChange} /></div>
                        </div>
                        <div className="form-control mt-6">
                            <button type="submit" className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>{!loading && <Save size={18} className="mr-2" />}{loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
                        </div>
                    </form>
                </div>
            </div >
        </div >
    );
};

export default DigitalMediaForm;
