const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const c = require('../controllers/admin.controller');

router.use(auth, requireRole('admin'));

router.get('/metrics', c.metrics);

router.get('/users', c.listUsers);
router.put('/users/:id/role', c.updateUserRole);
router.delete('/users/:id', c.deleteUser);

router.post('/products', c.createProduct);
router.put('/products/:id', c.updateProduct);
router.delete('/products/:id', c.deleteProduct);

router.get('/withdrawals', c.listWithdrawals);
router.put('/withdrawals/:id', c.updateWithdrawal);

module.exports = router;
