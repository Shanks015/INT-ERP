import User from '../models/User.js';

// Register new user
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        console.log('Registration attempt:', { name, email, role, hasPassword: !!password });

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create new user (pending approval)
        const user = new User({ name, email, password, role });
        await user.save();

        console.log('User registered successfully:', user._id);

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
        console.error('Registration error:', error);
        console.error('Error details:', error.message);
        if (error.errors) {
            console.error('Validation errors:', Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            })));
        }
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
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
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
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching user data',
            error: error.message
        });
    }
};
