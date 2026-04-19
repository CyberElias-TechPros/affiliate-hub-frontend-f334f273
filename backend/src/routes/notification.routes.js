const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/notification.controller');

router.get('/', auth, c.list);
router.put('/:id/read', auth, c.markRead);
router.put('/read-all', auth, c.markAllRead);
router.delete('/:id', auth, c.remove);

module.exports = router;
