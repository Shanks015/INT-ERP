import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

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

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/masters-abroad')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Masters Abroad Record' : 'Add Masters Abroad Record'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Student Name *</span></label><input type="text" name="studentName" placeholder="Student name" className="input input-bordered w-full" value={formData.studentName} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Country *</span></label><input type="text" name="country" placeholder="Country" className="input input-bordered w-full" value={formData.country} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">University *</span></label><input type="text" name="university" placeholder="University" className="input input-bordered w-full" value={formData.university} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Course Studying</span></label><input type="text" name="courseStudying" placeholder="Course" className="input input-bordered w-full" value={formData.courseStudying} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Course Tenure</span></label><input type="text" name="courseTenure" placeholder="Tenure" className="input input-bordered w-full" value={formData.courseTenure} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">USN Number</span></label><input type="text" name="usnNumber" placeholder="USN" className="input input-bordered w-full" value={formData.usnNumber} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">CGPA</span></label><input type="text" name="cgpa" placeholder="CGPA" className="input input-bordered w-full" value={formData.cgpa} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">School of Study</span></label><input type="text" name="schoolOfStudy" placeholder="School" className="input input-bordered w-full" value={formData.schoolOfStudy} onChange={handleChange} /></div>
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

export default MastersAbroadForm;
