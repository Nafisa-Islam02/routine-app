const Notification = require('../models/Notification');

// GET /api/notifications?department=
exports.listNotifications = async (req, res) => {
  try {
    const { department } = req.query;
    const filter = {};
    if (department) filter.department = department;

    const notifications = await Notification.find(filter)
      .populate('actor', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
};
