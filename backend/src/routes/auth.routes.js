const router = require('express').Router();
const c = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

router.post('/signup', c.signupValidators, validate, c.signup);
router.post('/login', c.loginValidators, validate, c.login);
router.post('/social-auth', c.socialAuth);
router.get('/me', auth, c.me);
router.post('/onboarding', auth, c.completeOnboarding);

module.exports = router;
