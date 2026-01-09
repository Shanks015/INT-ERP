import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Globe, Users, Link as LinkIcon } from 'lucide-react';

const ImmersionProgramForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        direction: '',
        programStatus: '',
        university: '',
        country: '',
        numberOfPax: '',
        department: '',
        arrivalDate: '',
        departureDate: '',
        summary: '',
        feesPerPax: '',
        driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/immersion-programs/${id}`);
            const item = response.data.data;
            setFormData({
                direction: item.direction || '',
                programStatus: item.programStatus || '',
                university: item.university || '',
                country: item.country || '',
                numberOfPax: item.numberOfPax || '',
                department: item.department || '',
                arrivalDate: item.arrivalDate ? new Date(item.arrivalDate).toISOString().split('T')[0] : '',
                departureDate: item.departureDate ? new Date(item.departureDate).toISOString().split('T')[0] : '',
                summary: item.summary || '',
                feesPerPax: item.feesPerPax || '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching program');
            navigate('/immersion-programs');
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
                await api.put(`/immersion-programs/${id}`, formData);
                toast.success(isAdmin ? 'Program updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/immersion-programs', formData);
                toast.success('Program created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/immersion-programs');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving program');
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
                            {isEdit ? 'Edit Immersion Program' : 'New Immersion Program'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update program details' : 'Register a new student immersion program'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/immersion-programs')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Program Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Globe size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Program Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                        <label className="label font-medium"><span className="label-text">University *</span></label>
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
                                        <label className="label font-medium"><span className="label-text">Status</span></label>
                                        <input
                                            type="text"
                                            name="programStatus"
                                            placeholder="e.g. Planning, Completed"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.programStatus}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Logistics & Financials */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <Users size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Logistics & Financials</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Arrival Date</span></label>
                                        <input
                                            type="date"
                                            name="arrivalDate"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.arrivalDate}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Departure Date</span></label>
                                        <input
                                            type="date"
                                            name="departureDate"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.departureDate}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">No. of Pax</span></label>
                                        <input
                                            type="number"
                                            name="numberOfPax"
                                            placeholder="Total Participants"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.numberOfPax}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Fees Per Pax</span></label>
                                        <input
                                            type="number"
                                            name="feesPerPax"
                                            placeholder="Fees Amount"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.feesPerPax}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Context & Resources */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <LinkIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Context & Resources</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Department</span></label>
                                        <input
                                            type="text"
                                            name="department"
                                            placeholder="Organizing Department"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.department}
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
                                            placeholder="Brief summary of the program..."
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Program' : 'Create Program')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImmersionProgramForm;
