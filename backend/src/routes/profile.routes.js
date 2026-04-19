const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/profile.controller');

router.get('/', auth, c.get);
router.put('/update', auth, c.update);
router.put('/bank-details', auth, c.updateBank);
router.put('/security', auth, c.updateSecurity);

module.exports = router;
