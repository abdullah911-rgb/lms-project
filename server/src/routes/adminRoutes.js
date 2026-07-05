const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

const isAdmin = [requireAuth, requireRole('ADMIN')];

// Platform stats
router.get('/stats', isAdmin, adminController.getStats);

// User management
router.get('/users', isAdmin, adminController.getUsers);
router.patch('/users/:id/toggle-active', isAdmin, adminController.toggleUserActive);
router.patch('/users/:id/role', isAdmin, adminController.changeUserRole);
router.delete('/users/:id', isAdmin, adminController.deleteUser);

// Course management
router.get('/courses', isAdmin, adminController.getAllCourses);

// Enrollment reports
router.get('/enrollments', isAdmin, adminController.getRecentEnrollments);

module.exports = router;
