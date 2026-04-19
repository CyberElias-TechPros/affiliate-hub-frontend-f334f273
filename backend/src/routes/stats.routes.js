const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/stats.controller');

router.get('/dashboard', auth, c.dashboard);
router.get('/performance', auth, c.performance);
router.get('/leaderboard', c.leaderboard);

module.exports = router;
