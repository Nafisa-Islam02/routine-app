const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function to sign JWT
function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// @desc    Register new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    // 1. Log incoming request body to backend console for debugging
    console.log('📌 Registration Attempt Payload:', req.body);

    const { name, email, password, role, department, section } = req.body;

    // 2. Basic field validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // 3. Check for existing user (case-insensitive email search)
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log('⚠️ Registration Failed: Email already registered');
      return res.status(409).json({ message: 'Email already registered' });
    }

    // 4. Hash the password
    const hashed = await bcrypt.hash(password, 10);

    // 5. Normalize role (handles "Teacher", "TEACHER", or "teacher")
    const normalizedRole = role ? role.toLowerCase().trim() : 'student';
    const safeRole = normalizedRole === 'teacher' ? 'admin' : 'student';

    // 6. Create user in database
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: safeRole,
      department: department || 'General',
      section: section || '',
    });

    // 7. Generate JWT token
    const token = signToken(user);

    console.log('✅ User registered successfully:', user._id);

    // 8. Return response
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        section: user.section
      },
    });
  } catch (err) {
    console.error('❌ Registration Error:', err);
    return res.status(500).json({ message: 'Registration failed???!', error: err.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check for required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Compare password hash
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Generate token
    const token = signToken(user);

    console.log('✅ User logged in successfully:', user._id);

    // 5. Return token and user object
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        section: user.section
      },
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    return res.status(500).json({ message: 'Login failed????:<<', error: err.message });
  }
};