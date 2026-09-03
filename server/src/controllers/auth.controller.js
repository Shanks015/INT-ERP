import User from '../models/User.js';

// Client-safe projection of a user doc. `password` is select:false on the
// schema, but login queries with `select('+password')`, so strip it explicitly
// rather than trust the projection. Returns the richer profile fields
// (preferences/notificationSettings/profilePhoto) so AuthContext's /auth/me
// re-check never wipes client-held settings with a leaner copy (audit S10).
const publicUser = (user) => {
    const raw = user.toObject ? user.toObject() : { ...user };
    const { password, __v, approvedBy, approvedAt, rejectionReason, ...rest } = raw;
    return {
        id: user._id,
        name: rest.name,
        email: rest.email,
        role: rest.role,
        allowedModules: rest.allowedModules || [],
        profilePhoto: rest.profilePhoto ?? null,
        preferences: rest.preferences || {},
        notificationSettings: rest.notificationSettings || {}
    };
};

// Register new user
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            // If user exists but is rejected, allow re-registration by updating the record
            if (existingUser.approvalStatus === 'rejected') {
                existingUser.name = name;
                existingUser.password = password; // Will be hashed by pre-save hook
                existingUser.role = role;
                existingUser.approvalStatus = 'pending';
                existingUser.approved = false;
                existingUser.rejectionReason = undefined;
                existingUser.approvedBy = undefined;
                existingUser.approvedAt = undefined;

                await existingUser.save();

                return res.status(200).json({
                    message: 'Registration successful! Your account is pending admin approval.',
                    requiresApproval: true,
                    user: {
                        id: existingUser._id,
                        name: existingUser.name,
                        email: existingUser.email,
                        role: existingUser.role,
                        approvalStatus: existingUser.approvalStatus
                    }
                });
            }

            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create new user (pending approval)
        const user = new User({ name, email, password, role });
        await user.save();

        res.status(201).json({
            message: 'Registration successful! Your account is pending admin approval. You will be able to login once approved.',
            requiresApproval: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                approvalStatus: user.approvalStatus
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error registering user',
            error: error.message
        });
    }
};

// Login user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with password field
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if user is approved
        if (!user.approved || user.approvalStatus !== 'approved') {
            if (user.approvalStatus === 'rejected') {
                return res.status(403).json({
                    message: 'Your account has been rejected. Reason: ' + (user.rejectionReason || 'Not specified'),
                    approvalStatus: 'rejected',
                    rejectionReason: user.rejectionReason
                });
            }
            return res.status(403).json({
                message: 'Your account is pending admin approval. Please wait for approval before logging in.',
                approvalStatus: 'pending'
            });
        }

        const token = user.generateAuthToken();

        res.json({
            message: 'Login successful',
            token,
            user: publicUser(user)
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Get current user
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        res.json({
            user: publicUser(user)
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching user data',
            error: error.message
        });
    }
};
