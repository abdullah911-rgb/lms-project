const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

const isAdmin = [requireAuth, requireRole('ADMIN')];

// ── Public: get active payment methods ──────────────────────────────────────
router.get('/methods', paymentController.getMethods);

// ── Student: submit payment proof ───────────────────────────────────────────
router.post('/request', requireAuth, requireRole('STUDENT'), paymentController.submitRequest);
router.get('/my-requests', requireAuth, requireRole('STUDENT'), paymentController.getMyRequests);

// ── Admin: payment methods management ───────────────────────────────────────
router.get('/admin/methods',        ...isAdmin, paymentController.adminGetMethods);
router.post('/admin/methods',       ...isAdmin, paymentController.createMethod);
router.put('/admin/methods/:id',    ...isAdmin, paymentController.updateMethod);
router.delete('/admin/methods/:id', ...isAdmin, paymentController.deleteMethod);

// ── Admin: payment requests management ──────────────────────────────────────
router.get('/admin/requests',               ...isAdmin, paymentController.adminGetRequests);
router.patch('/admin/requests/:id/approve', ...isAdmin, paymentController.approveRequest);
router.patch('/admin/requests/:id/reject',  ...isAdmin, paymentController.rejectRequest);

// ── Admin: revenue analytics ─────────────────────────────────────────────────
router.get('/admin/revenue', ...isAdmin, paymentController.getRevenue);

module.exports = router;
