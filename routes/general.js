var express = require('express');
var router = express.Router();


var general_Controller = require('../controllers/generalController');

router.get('/', general_Controller.general);

module.exports = router;