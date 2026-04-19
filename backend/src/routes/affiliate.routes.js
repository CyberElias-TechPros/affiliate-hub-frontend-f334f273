const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/affiliate.controller');

router.get('/links', auth, c.list);
router.post('/generate-link', auth, c.generate);
router.get('/assets', auth, c.assets);

// Public endpoints
router.get('/r/:code', c.redirect);
router.post('/r/:code/convert', c.recordConversion);

module.exports = router;
