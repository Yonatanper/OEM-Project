var express = require('express');
var router = express.Router();

var customer_Controller = require('../controllers/customerController');

//GET request for checking user name duplication.
router.get('/checkUser/:username',customer_Controller.check_user);
router.post('/saveCustomerData',customer_Controller.save_customer_data);


module.exports =router;