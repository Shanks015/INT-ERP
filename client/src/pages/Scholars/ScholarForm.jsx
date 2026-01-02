import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

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

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/scholars-in-residence')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Scholar' : 'Add Scholar in Residence'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Scholar Name *</span></label><input type="text" name="scholarName" placeholder="Scholar name" className="input input-bordered w-full" value={formData.scholarName} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">University</span></label><input type="text" name="university" placeholder="University" className="input input-bordered w-full" value={formData.university} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Country *</span></label><input type="text" name="country" placeholder="Country" className="input input-bordered w-full" value={formData.country} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Category</span></label><input type="text" name="category" placeholder="Category" className="input input-bordered w-full" value={formData.category} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Department</span></label><input type="text" name="department" placeholder="Department" className="input input-bordered w-full" value={formData.department} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Campus</span></label><input type="text" name="campus" placeholder="Campus" className="input input-bordered w-full" value={formData.campus} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">From Date *</span></label><input type="date" name="fromDate" className="input input-bordered w-full" value={formData.fromDate} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">To Date *</span></label><input type="date" name="toDate" className="input input-bordered w-full" value={formData.toDate} onChange={handleChange} required /></div>
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

export default ScholarForm;
