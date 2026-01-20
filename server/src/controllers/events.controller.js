import Event from '../models/Event.js';

// Get all events
export const getAll = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc',
            ...filters
        } = req.query;

        // Build query
        const query = {};

        // Search
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { department: searchRegex },
                { campus: searchRegex },
                { universityCountry: searchRegex },
                { dignitaries: searchRegex }
            ];
        }

        // Date range
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        // Other filters
        Object.keys(filters).forEach(key => {
            if (filters[key] && filters[key] !== 'all') {
                query[key] = filters[key];
            }
        });

        // Calculate pagination
        const skip = (page - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query
        const [events, total] = await Promise.all([
            Event.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Event.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: events,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching events',
            error: error.message
        });
    }
};

// Get event by ID
export const getById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching event',
            error: error.message
        });
    }
};

// Create event
export const create = async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating event',
            error: error.message
        });
    }
};

// Update event
export const update = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating event',
            error: error.message
        });
    }
};

// Delete event
export const remove = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting event',
            error: error.message
        });
    }
};

// Export CSV
export const exportCSV = async (req, res) => {
    try {
        const events = await Event.find().lean();
        // CSV logic can be handled here or reused if generic, but for now specific implementation
        // Simplified for this task
        res.json({
            success: true,
            message: 'Export functionality available via generic controller if needed, but switching to direct download'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting'
        });
    }
};
// Get count of pending actions (admin only)
export const getPendingCount = async (req, res) => {
    try {
        const count = await Event.countDocuments({
            status: { $in: ['pending_create', 'pending_edit', 'pending_delete'] }
        });
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending count',
            error: error.message
        });
    }
};

// Get all pending records (admin only)
export const getAllPending = async (req, res) => {
    try {
        const pendingEvents = await Event.find({
            status: { $in: ['pending_create', 'pending_edit', 'pending_delete'] }
        })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ updatedAt: -1 });

        res.json({
            success: true,
            data: pendingEvents
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending events',
            error: error.message
        });
    }
};
