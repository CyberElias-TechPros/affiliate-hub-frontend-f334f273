const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/achievement.controller');

router.get('/', auth, c.list);
router.get('/streak', auth, c.streak);

module.exports = router;
