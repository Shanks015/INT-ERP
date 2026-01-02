import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const EventForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        date: '', type: '', title: '', dignitaries: '', department: '', campus: '', eventSummary: '', universityCountry: '', driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) fetchEvent();
    }, [id]);

    const fetchEvent = async () => {
        try {
            const response = await api.get(`/events/${id}`);
            const event = response.data.data;
            setFormData({
                date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
                type: event.type || '',
                title: event.title || '',
                dignitaries: event.dignitaries || '',
                department: event.department || '',
                campus: event.campus || '',
                eventSummary: event.eventSummary || '',
                universityCountry: event.universityCountry || '',
                driveLink: event.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching event');
            navigate('/events');
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
                await api.put(`/events/${id}`, formData);
                toast.success(isAdmin ? 'Event updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/events', formData);
                toast.success('Event created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/events');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving event');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/events')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back to Events</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Event' : 'Add New Event'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Date *</span></label><input type="date" name="date" className="input input-bordered w-full" value={formData.date} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Type</span></label><input type="text" name="type" placeholder="Event type" className="input input-bordered w-full" value={formData.type} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Title *</span></label><input type="text" name="title" placeholder="Event title" className="input input-bordered w-full" value={formData.title} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Dignitaries</span></label><input type="text" name="dignitaries" placeholder="Dignitaries present" className="input input-bordered w-full" value={formData.dignitaries} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Department</span></label><input type="text" name="department" placeholder="Department" className="input input-bordered w-full" value={formData.department} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Campus</span></label><input type="text" name="campus" placeholder="Campus" className="input input-bordered w-full" value={formData.campus} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">University/Country</span></label><input type="text" name="universityCountry" placeholder="University, Country" className="input input-bordered w-full" value={formData.universityCountry} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Event Summary</span></label><textarea name="eventSummary" placeholder="Event summary" className="textarea textarea-bordered w-full" rows={3} value={formData.eventSummary} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Drive Link</span></label><input type="url" name="driveLink" placeholder="https://drive.google.com/..." className="input input-bordered w-full" value={formData.driveLink} onChange={handleChange} /></div>
                        </div>
                        <div className="form-control mt-6">
                            <button type="submit" className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>{!loading && <Save size={18} className="mr-2" />}{loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EventForm;
