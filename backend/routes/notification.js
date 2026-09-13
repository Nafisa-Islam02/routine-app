const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { listNotifications } = require('../controllers/notificationController');

router.get('/', auth, listNotifications);

module.exports = router;
