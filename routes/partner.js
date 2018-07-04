var express = require('express');
var router = express.Router();

var partner_Controller = require('../controllers/partnerController');

//GET request for checking user name duplication.
router.post('/Login',partner_Controller.login);
router.get('/independentParameters',partner_Controller.independent_parameters);
router.get('/:serviceunit/dependentParameters',partner_Controller.dependent_parameters);
router.get('/:serviceunit=:serviceunit/COA=:localsetting',partner_Controller.login_post);
router.post('/savePartnerData',partner_Controller.login_post);
router.get('/getPartnerData',partner_Controller.login_post);

module.exports = router;