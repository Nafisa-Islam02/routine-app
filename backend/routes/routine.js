const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const {
  getRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  getHistory,
} = require('../controllers/routineController');

router.get('/', auth, getRoutines);
router.get('/:id/history', auth, getHistory);
router.post('/', auth, requireRole('admin', 'teacher'), createRoutine);
router.put('/:id', auth, requireRole('admin', 'teacher'), updateRoutine);
router.delete('/:id', auth, requireRole('admin', 'teacher'), deleteRoutine);

module.exports = router;
