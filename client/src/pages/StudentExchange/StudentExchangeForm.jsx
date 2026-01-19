import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, ArrowRightLeft, User, Calendar } from 'lucide-react';

const StudentExchangeForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        direction: '',
        studentName: '',
        exchangeUniversity: '',
        course: '',
        semesterYear: '',
        exchangeStatus: '',
        usnNo: '',
        fromDate: '',
        toDate: '',
        driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/student-exchange/${id}`);
            const item = response.data.data;
            setFormData({
                direction: item.direction || '',
                studentName: item.studentName || '',
                exchangeUniversity: item.exchangeUniversity || '',
                course: item.course || '',
                semesterYear: item.semesterYear || '',
                exchangeStatus: item.exchangeStatus || '',
                usnNo: item.usnNo || '',
                fromDate: item.fromDate ? new Date(item.fromDate).toISOString().split('T')[0] : '',
                toDate: item.toDate ? new Date(item.toDate).toISOString().split('T')[0] : '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching record');
            navigate('/student-exchange');
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
                await api.put(`/student-exchange/${id}`, formData);
                toast.success(isAdmin ? 'Record updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/student-exchange', formData);
                toast.success('Record created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/student-exchange');
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
                            {isEdit ? 'Edit Exchange' : 'New Student Exchange'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update exchange program details' : 'Register a new student exchange record'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/student-exchange')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Exchange Program */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <ArrowRightLeft size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Exchange Program</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Direction *</span></label>
                                        <select
                                            name="direction"
                                            className="select select-bordered w-full focus:select-primary transition-all"
                                            value={formData.direction}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Direction</option>
                                            <option value="Incoming">Incoming</option>
                                            <option value="Outgoing">Outgoing</option>
                                        </select>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Exchange University *</span></label>
                                        <input
                                            type="text"
                                            name="exchangeUniversity"
                                            placeholder="University Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.exchangeUniversity}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Course</span></label>
                                        <input
                                            type="text"
                                            name="course"
                                            placeholder="Course Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.course}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Semester/Year</span></label>
                                        <input
                                            type="text"
                                            name="semesterYear"
                                            placeholder="e.g. Fall 2024"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.semesterYear}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Student Information */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <User size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Student Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Student Name *</span></label>
                                        <input
                                            type="text"
                                            name="studentName"
                                            placeholder="Full Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.studentName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">USN No</span></label>
                                        <input
                                            type="text"
                                            name="usnNo"
                                            placeholder="USN Number"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.usnNo}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Timeline & Status */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Timeline & Status</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">From Date</span></label>
                                        <input
                                            type="date"
                                            name="fromDate"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.fromDate}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">To Date</span></label>
                                        <input
                                            type="date"
                                            name="toDate"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.toDate}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Exchange Status</span></label>
                                        <input
                                            type="text"
                                            name="exchangeStatus"
                                            placeholder="e.g. Completed, Ongoing"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.exchangeStatus}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full md:col-span-3">
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

export default StudentExchangeForm;

