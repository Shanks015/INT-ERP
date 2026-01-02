import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

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

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/immersion-programs')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Immersion Program' : 'Add Immersion Program'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Direction *</span></label><select name="direction" className="select select-bordered w-full" value={formData.direction} onChange={handleChange} required><option value="">Select</option><option value="Incoming">Incoming</option><option value="Outgoing">Outgoing</option></select></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">University *</span></label><input type="text" name="university" placeholder="University" className="input input-bordered w-full" value={formData.university} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Country *</span></label><input type="text" name="country" placeholder="Country" className="input input-bordered w-full" value={formData.country} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Department</span></label><input type="text" name="department" placeholder="Department" className="input input-bordered w-full" value={formData.department} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Number of Pax</span></label><input type="number" name="numberOfPax" placeholder="Number" className="input input-bordered w-full" value={formData.numberOfPax} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Fees Per Pax</span></label><input type="number" name="feesPerPax" placeholder="Fees" className="input input-bordered w-full" value={formData.feesPerPax} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Program Status</span></label><input type="text" name="programStatus" placeholder="Status" className="input input-bordered w-full" value={formData.programStatus} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Arrival Date</span></label><input type="date" name="arrivalDate" className="input input-bordered w-full" value={formData.arrivalDate} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Departure Date</span></label><input type="date" name="departureDate" className="input input-bordered w-full" value={formData.departureDate} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Summary</span></label><textarea name="summary" placeholder="Summary" className="textarea textarea-bordered w-full" rows="3" value={formData.summary} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Drive Link</span></label><input type="url" name="driveLink" placeholder="https://drive.google.com/..." className="input input-bordered w-full" value={formData.driveLink} onChange={handleChange} /></div>
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

export default ImmersionProgramForm;
