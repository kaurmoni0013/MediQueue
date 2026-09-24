const router = require('express').Router();
const controller = require('../controllers/authController');
const validators = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.post('/register', validate(validators.registerRules), controller.register);
router.post('/login', validate(validators.loginRules), controller.login);
router.get('/me', requireAuth, controller.me);
router.post('/logout', requireAuth, controller.logout);

module.exports = router;