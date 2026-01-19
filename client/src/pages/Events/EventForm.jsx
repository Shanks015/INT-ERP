import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Calendar, Globe, Link as LinkIcon } from 'lucide-react';

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
    const [eventTypes, setEventTypes] = useState([]);

    useEffect(() => {
        if (isEdit) fetchEvent();
        fetchEventTypes();
    }, [id]);

    const fetchEventTypes = async () => {
        try {
            const response = await api.get('/events', { params: { limit: 1000 } });
            const events = response.data.data || [];
            // Extract unique event types
            const uniqueTypes = [...new Set(events.map(e => e.type).filter(Boolean))].sort();
            setEventTypes(uniqueTypes);
        } catch (error) {
            console.error('Error fetching event types:', error);
        }
    };

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
                            {isEdit ? 'Edit Event' : 'New Event'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update event details' : 'Register a new departmental or campus event'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/events')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Event Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Event Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Date *</span></label>
                                        <input
                                            type="date"
                                            name="date"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Event Type</span></label>
                                        <input
                                            type="text"
                                            name="type"
                                            list="event-types-list"
                                            placeholder="Select or enter event type"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.type}
                                            onChange={handleChange}
                                        />
                                        <datalist id="event-types-list">
                                            {eventTypes.map(type => (
                                                <option key={type} value={type} />
                                            ))}
                                        </datalist>
                                        <label className="label">
                                            <span className="label-text-alt text-base-content/60">Select existing or type new</span>
                                        </label>
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Title *</span></label>
                                        <input
                                            type="text"
                                            name="title"
                                            placeholder="Event title"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.title}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Event Summary</span></label>
                                        <textarea
                                            name="eventSummary"
                                            placeholder="Brief description of the event..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.eventSummary}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Location & Participants */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <Globe size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Location & Participants</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Campus</span></label>
                                        <input
                                            type="text"
                                            name="campus"
                                            placeholder="Campus location"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.campus}
                                            onChange={handleChange}
                                        />
                                    </div>

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
                                        <label className="label font-medium"><span className="label-text">University/Country</span></label>
                                        <input
                                            type="text"
                                            name="universityCountry"
                                            placeholder="External University or Country"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.universityCountry}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Dignitaries</span></label>
                                        <input
                                            type="text"
                                            name="dignitaries"
                                            placeholder="Key guests involved"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.dignitaries}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Links */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <LinkIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Resources</h3>
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
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-base-200">
                                <button type="submit" className={`btn btn-primary btn-lg px-8 ${loading ? 'loading' : ''}`} disabled={loading}>
                                    {!loading && <Save size={20} className="mr-2" />}
                                    {loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventForm;

