import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

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
        completedDate: '',
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
                completedDate: item.completedDate ? new Date(item.completedDate).toISOString().split('T')[0] : '',
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

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/mou-updates')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit MoU Update' : 'Add MoU Update'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Date *</span></label><input type="date" name="date" className="input input-bordered w-full" value={formData.date} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">University *</span></label><input type="text" name="university" placeholder="University" className="input input-bordered w-full" value={formData.university} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Country *</span></label><input type="text" name="country" placeholder="Country" className="input input-bordered w-full" value={formData.country} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Department</span></label><input type="text" name="department" placeholder="Department" className="input input-bordered w-full" value={formData.department} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Contact Person</span></label><input type="text" name="contactPerson" placeholder="Contact person" className="input input-bordered w-full" value={formData.contactPerson} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Contact Email</span></label><input type="email" name="contactEmail" placeholder="Contact email" className="input input-bordered w-full" value={formData.contactEmail} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">MoU Status</span></label><input type="text" name="mouStatus" placeholder="MoU status" className="input input-bordered w-full" value={formData.mouStatus} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Validity Status</span></label><input type="text" name="validityStatus" placeholder="Validity status" className="input input-bordered w-full" value={formData.validityStatus} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Agreement Type</span></label><input type="text" name="agreementType" placeholder="e.g. MoU, MoA" className="input input-bordered w-full" value={formData.agreementType} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Term</span></label><input type="text" name="term" placeholder="e.g. 5 Years" className="input input-bordered w-full" value={formData.term} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Completed Date</span></label><input type="date" name="completedDate" className="input input-bordered w-full" value={formData.completedDate} onChange={handleChange} /></div>
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

export default MouUpdateForm;
