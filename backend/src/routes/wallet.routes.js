const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/wallet.controller');

router.get('/balance', auth, c.balance);
router.get('/transactions', auth, c.transactions);
router.get('/withdraw-methods', c.methods);
router.post('/withdraw', auth, c.withdraw);

module.exports = router;
