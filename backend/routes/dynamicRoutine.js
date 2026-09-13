const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const {
  getDynamicRoutines,
  generateDynamicRoutine,
  deleteDynamicRoutine,
  clearDynamicRoutines,
} = require('../controllers/dynamicRoutineController');

router.get('/', auth, getDynamicRoutines);
router.post('/generate', auth, requireRole('admin', 'teacher'), generateDynamicRoutine);
router.delete('/:id', auth, requireRole('admin', 'teacher'), deleteDynamicRoutine);
router.delete('/', auth, requireRole('admin', 'teacher'), clearDynamicRoutines);

module.exports = router;
