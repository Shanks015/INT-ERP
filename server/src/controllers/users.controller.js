import User from '../models/User.js';

// Get all pending users
export const getPendingUsers = async (req, res) => {
    try {
        const pendingUsers = await User.find({ approvalStatus: 'pending' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            count: pendingUsers.length,
            users: pendingUsers
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching pending users',
            error: error.message
        });
    }
};

// Get all users with optional status filter
export const getAllUsers = async (req, res) => {
    try {
        const { status, approvalStatus } = req.query;

        // Support both 'status' and 'approvalStatus' parameters
        const filterStatus = approvalStatus || status;

        let query = {};
        if (filterStatus && filterStatus !== 'all') {
            query.approvalStatus = filterStatus;
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// Approve a user
export const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.userId; // From auth middleware

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.approvalStatus === 'approved') {
            return res.status(400).json({ message: 'User is already approved' });
        }

        user.approved = true;
        user.approvalStatus = 'approved';
        user.approvedBy = adminId;
        user.approvedAt = new Date();
        user.rejectionReason = undefined; // Clear any previous rejection reason

        await user.save();

        res.json({
            message: 'User approved successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                approvalStatus: user.approvalStatus,
                approvedAt: user.approvedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error approving user',
            error: error.message
        });
    }
};

// Reject a user
export const rejectUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.userId;

        if (!reason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.approved = false;
        user.approvalStatus = 'rejected';
        user.approvedBy = adminId;
        user.approvedAt = new Date();
        user.rejectionReason = reason;

        await user.save();

        res.json({
            message: 'User rejected successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                approvalStatus: user.approvalStatus,
                rejectionReason: user.rejectionReason
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error rejecting user',
            error: error.message
        });
    }
};

// Get pending users count
export const getPendingCount = async (req, res) => {
    try {
        const count = await User.countDocuments({ approvalStatus: 'pending' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching pending count',
            error: error.message
        });
    }
};
