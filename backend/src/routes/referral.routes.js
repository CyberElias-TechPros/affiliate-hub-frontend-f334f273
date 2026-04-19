const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/referral.controller');

router.get('/me', auth, c.me);
router.post('/apply', auth, c.applyOnSignup);

module.exports = router;
