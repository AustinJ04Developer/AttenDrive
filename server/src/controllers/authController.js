import { User } from '../models/User.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authValidator.js';
import { signToken } from '../utils/token.js';

// Auto-seed or update default admin
export const ensureDefaultAdmin = async () => {
  try {
    const adminEmail = 'placement@marephraem.edu.in';
    const adminPassword = 'Placement2026';

    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      // Check if previous placeholder admin exists, migrate it
      const legacyAdmin = await User.findOne({ email: 'admin@attendrive.com' });
      if (legacyAdmin) {
        legacyAdmin.email = adminEmail;
        legacyAdmin.password = adminPassword;
        legacyAdmin.name = 'Placement Administrator';
        legacyAdmin.role = 'admin';
        legacyAdmin.department = 'Placement Cell';
        legacyAdmin.active = true;
        await legacyAdmin.save();
        console.log(`[Auth] Updated existing admin account to: ${adminEmail}`);
        return;
      }

      admin = new User({
        name: 'Placement Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        department: 'Placement Cell',
        active: true,
      });
      await admin.save();
      console.log(`[Auth] Initialized default admin account: ${adminEmail}`);
    } else {
      // Update password to ensure it matches Placement2026
      admin.password = adminPassword;
      admin.role = 'admin';
      admin.active = true;
      await admin.save();
      console.log(`[Auth] Confirmed credentials for admin account: ${adminEmail}`);
    }
  } catch (error) {
    console.error('[Auth] Failed to verify/seed default admin account:', error.message);
  }
};

// Register a new user
export const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // If this is the very first user, automatically grant admin role
    const totalUsers = await User.countDocuments();
    const assignedRole = totalUsers === 0 ? 'admin' : (validatedData.role || 'coordinator');

    const newUser = new User({
      name: validatedData.name,
      email: validatedData.email,
      password: validatedData.password,
      role: assignedRole,
      department: validatedData.department || 'Placement Cell',
    });

    await newUser.save();

    const token = signToken({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: newUser,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

// User login
export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

// Get currently logged-in user profile
export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

// Update profile or change password
export const updateProfile = async (req, res, next) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (validatedData.name) {
      user.name = validatedData.name;
    }
    if (validatedData.department) {
      user.department = validatedData.department;
    }

    // Handle password change if requested
    if (validatedData.newPassword) {
      if (!validatedData.currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password',
        });
      }

      const isCurrentMatch = await user.comparePassword(validatedData.currentPassword);
      if (!isCurrentMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      user.password = validatedData.newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};
