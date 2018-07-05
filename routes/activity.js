var express = require('express');
var router = express.Router();

var activity_Controller = require('../controllers/activityController');

//GET request for checking user name duplication.
router.get('/getCustomerData/:customerID',activity_Controller.get_customer_data);
router.get('/getHistory',activity_Controller.get_history);
router.post('/getTenantsHistory',activity_Controller.get_tenants_history);


module.exports =router;