import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Monitor, Link as LinkIcon } from 'lucide-react';

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

    if (fetchLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-200 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-base-content mb-2">
                            {isEdit ? 'Edit Digital Media' : 'New Digital Media'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update media record details' : 'Record a new digital media presence or article'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/digital-media')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Media Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Monitor size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Media Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Date *</span></label>
                                        <input
                                            type="date"
                                            name="date"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Article Topic *</span></label>
                                        <input
                                            type="text"
                                            name="articleTopic"
                                            placeholder="Topic or Title of the Article"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.articleTopic}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Channel Name</span></label>
                                        <input
                                            type="text"
                                            name="channel"
                                            placeholder="e.g. LinkedIn, News Portal"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.channel}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Amount Paid</span></label>
                                        <input
                                            type="text"
                                            name="amountPaid"
                                            placeholder="e.g. 5000"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.amountPaid}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Content & Links */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <LinkIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Content & References</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Article Link</span></label>
                                        <input
                                            type="url"
                                            name="articleLink"
                                            placeholder="https://original-source.com/..."
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.articleLink}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Drive Link</span></label>
                                        <input
                                            type="url"
                                            name="driveLink"
                                            placeholder="https://drive.google.com/..."
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.driveLink}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Summary</span></label>
                                        <textarea
                                            name="summary"
                                            placeholder="Brief content summary..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.summary}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-base-200">
                                <button
                                    type="submit"
                                    className={`btn btn-primary btn-lg px-8 ${loading ? 'loading' : ''}`}
                                    disabled={loading}
                                >
                                    {!loading && <Save size={20} className="mr-2" />}
                                    {loading ? 'Saving...' : (isEdit ? 'Update Media' : 'Create Media')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DigitalMediaForm;

