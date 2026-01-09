import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, User, GraduationCap } from 'lucide-react';

const MastersAbroadForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({ studentName: '', country: '', university: '', courseStudying: '', courseTenure: '', usnNumber: '', cgpa: '', schoolOfStudy: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/masters-abroad/${id}`);
            const item = response.data.data;
            setFormData({ studentName: item.studentName || '', country: item.country || '', university: item.university || '', courseStudying: item.courseStudying || '', courseTenure: item.courseTenure || '', usnNumber: item.usnNumber || '', cgpa: item.cgpa || '', schoolOfStudy: item.schoolOfStudy || '' });
        } catch (error) {
            toast.error('Error fetching record');
            navigate('/masters-abroad');
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
                await api.put(`/masters-abroad/${id}`, formData);
                toast.success(isAdmin ? 'Record updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/masters-abroad', formData);
                toast.success('Record created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/masters-abroad');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving record');
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
                            {isEdit ? 'Edit Record' : 'New Masters Abroad'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update student record details' : 'Register a new student for masters abroad program'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/masters-abroad')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Student Information */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <User size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Student Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Student Name *</span></label>
                                        <input
                                            type="text"
                                            name="studentName"
                                            placeholder="Full Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.studentName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">USN Number</span></label>
                                        <input
                                            type="text"
                                            name="usnNumber"
                                            placeholder="University Seat Number"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.usnNumber}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">School of Study</span></label>
                                        <input
                                            type="text"
                                            name="schoolOfStudy"
                                            placeholder="e.g. Engineering, Sciences"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.schoolOfStudy}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">CGPA</span></label>
                                        <input
                                            type="text"
                                            name="cgpa"
                                            placeholder="e.g. 8.5"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.cgpa}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Program & Destination */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <GraduationCap size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Program & Destination</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Target University *</span></label>
                                        <input
                                            type="text"
                                            name="university"
                                            placeholder="University Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
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
                                        <label className="label font-medium"><span className="label-text">Course Studying</span></label>
                                        <input
                                            type="text"
                                            name="courseStudying"
                                            placeholder="Masters Program Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.courseStudying}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Course Tenure</span></label>
                                        <input
                                            type="text"
                                            name="courseTenure"
                                            placeholder="Duration e.g. 2 Years"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.courseTenure}
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Record' : 'Create Record')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MastersAbroadForm;
