const router = require('express').Router();
const c = require('../controllers/product.controller');

router.get('/', c.list);
router.get('/search', c.search);
router.get('/categories', c.categories);
router.get('/:id', c.detail);

module.exports = router;
