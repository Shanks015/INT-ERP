import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, GraduationCap, Calendar, FileText } from 'lucide-react';

const ScholarForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        scholarName: '',
        country: '',
        department: '',
        fromDate: '',
        toDate: '',
        university: '',
        category: '',
        summary: '',
        campus: '',
        driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/scholars-in-residence/${id}`);
            const item = response.data.data;
            setFormData({
                scholarName: item.scholarName || '',
                country: item.country || '',
                department: item.department || '',
                fromDate: item.fromDate ? new Date(item.fromDate).toISOString().split('T')[0] : '',
                toDate: item.toDate ? new Date(item.toDate).toISOString().split('T')[0] : '',
                university: item.university || '',
                category: item.category || '',
                summary: item.summary || '',
                campus: item.campus || '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching scholar');
            navigate('/scholars-in-residence');
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
                await api.put(`/scholars-in-residence/${id}`, formData);
                toast.success(isAdmin ? 'Scholar updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/scholars-in-residence', formData);
                toast.success('Scholar created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/scholars-in-residence');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving scholar');
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
                            {isEdit ? 'Edit Scholar' : 'New Scholar'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update scholar details' : 'Register a new scholar in residence'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/scholars-in-residence')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Scholar Profile */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <GraduationCap size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Scholar Profile</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Scholar Name *</span></label>
                                        <input
                                            type="text"
                                            name="scholarName"
                                            placeholder="Full Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.scholarName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Category</span></label>
                                        <input
                                            type="text"
                                            name="category"
                                            placeholder="e.g. Professor, Researcher"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.category}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">University</span></label>
                                        <input
                                            type="text"
                                            name="university"
                                            placeholder="Home University"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.university}
                                            onChange={handleChange}
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
                                </div>
                            </div>

                            {/* Section 2: Visit & Timeline */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Visit & Timeline</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">From Date *</span></label>
                                        <input
                                            type="date"
                                            name="fromDate"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.fromDate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">To Date *</span></label>
                                        <input
                                            type="date"
                                            name="toDate"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.toDate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Department</span></label>
                                        <input
                                            type="text"
                                            name="department"
                                            placeholder="Host Department"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.department}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Campus</span></label>
                                        <input
                                            type="text"
                                            name="campus"
                                            placeholder="Host Campus"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.campus}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Additional Information */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <FileText size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Additional Information</h3>
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

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Summary</span></label>
                                        <textarea
                                            name="summary"
                                            placeholder="Brief summary of the visit..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            rows="3"
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Scholar' : 'Create Scholar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScholarForm;
