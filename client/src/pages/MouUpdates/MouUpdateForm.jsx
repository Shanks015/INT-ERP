import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, FileText, User, Link as LinkIcon } from 'lucide-react';

const MouUpdateForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        date: '',
        university: '',
        country: '',
        contactPerson: '',
        contactEmail: '',
        mouStatus: '',
        validityStatus: '',
        department: '',
        agreementType: '',
        term: '',
        driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/mou-updates/${id}`);
            const item = response.data.data;
            setFormData({
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
                university: item.university || '',
                country: item.country || '',
                contactPerson: item.contactPerson || '',
                contactEmail: item.contactEmail || '',
                mouStatus: item.mouStatus || '',
                validityStatus: item.validityStatus || '',
                department: item.department || '',
                agreementType: item.agreementType || '',
                term: item.term || '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching MoU update');
            navigate('/mou-updates');
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
                await api.put(`/mou-updates/${id}`, formData);
                toast.success(isAdmin ? 'MoU update saved successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/mou-updates', formData);
                toast.success('MoU update created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/mou-updates');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving MoU update');
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
                            {isEdit ? 'Edit MoU Update' : 'New MoU Update'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update MoU status and details' : 'Register a new MoU update or renewal'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/mou-updates')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Agreement Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <FileText size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Agreement Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">University *</span></label>
                                        <input
                                            type="text"
                                            name="university"
                                            placeholder="University Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.university}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Country *</span></label>
                                        <input
                                            type="text"
                                            name="country"
                                            placeholder="Country"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.country}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Agreement Type</span></label>
                                        <input
                                            type="text"
                                            name="agreementType"
                                            placeholder="e.g. MoU, MoA"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.agreementType}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Term</span></label>
                                        <input
                                            type="text"
                                            name="term"
                                            placeholder="e.g. 5 Years"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.term}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Status</span></label>
                                        <input
                                            type="text"
                                            name="mouStatus"
                                            placeholder="e.g. Active"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.mouStatus}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Validity Status</span></label>
                                        <input
                                            type="text"
                                            name="validityStatus"
                                            placeholder="e.g. Valid, Expired"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.validityStatus}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Contact & Timeline */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <User size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Contact & Timeline</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Initiation Date *</span></label>
                                        <input
                                            type="date"
                                            name="date"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Department</span></label>
                                        <input
                                            type="text"
                                            name="department"
                                            placeholder="Department"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.department}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Contact Person</span></label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            placeholder="Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.contactPerson}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Contact Email</span></label>
                                        <input
                                            type="email"
                                            name="contactEmail"
                                            placeholder="email@example.com"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.contactEmail}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Resources */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <LinkIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Resources</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
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
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-base-200">
                                <button
                                    type="submit"
                                    className={`btn btn-primary btn-lg px-8 ${loading ? 'loading' : ''}`}
                                    disabled={loading}
                                >
                                    {!loading && <Save size={20} className="mr-2" />}
                                    {loading ? 'Saving...' : (isEdit ? 'Update MoU' : 'Create MoU')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MouUpdateForm;
