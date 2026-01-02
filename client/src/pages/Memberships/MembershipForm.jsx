import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const MembershipForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({ date: '', name: '', membershipStatus: '', country: '', membershipDuration: '', summary: '', startDate: '', endDate: '', driveLink: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/memberships/${id}`);
            const item = response.data.data;
            setFormData({
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
                name: item.name || '',
                membershipStatus: item.membershipStatus || '',
                country: item.country || '',
                membershipDuration: item.membershipDuration || '',
                summary: item.summary || '',
                startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
                endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching membership');
            navigate('/memberships');
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
                await api.put(`/memberships/${id}`, formData);
                toast.success(isAdmin ? 'Membership updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/memberships', formData);
                toast.success('Membership created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/memberships');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving membership');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/memberships')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Membership' : 'Add Membership'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Date *</span></label><input type="date" name="date" className="input input-bordered w-full" value={formData.date} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Name *</span></label><input type="text" name="name" placeholder="Membership name" className="input input-bordered w-full" value={formData.name} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Country</span></label><input type="text" name="country" placeholder="Country" className="input input-bordered w-full" value={formData.country} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Membership Status</span></label><input type="text" name="membershipStatus" placeholder="Status" className="input input-bordered w-full" value={formData.membershipStatus} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Membership Duration</span></label><input type="text" name="membershipDuration" placeholder="Duration" className="input input-bordered w-full" value={formData.membershipDuration} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Start Date</span></label><input type="date" name="startDate" className="input input-bordered w-full" value={formData.startDate} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">End Date</span></label><input type="date" name="endDate" className="input input-bordered w-full" value={formData.endDate} onChange={handleChange} /></div>
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

export default MembershipForm;
