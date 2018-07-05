let service = require('../servicedata');
let helper = require('../helpers/validation');


exports.get_customer_data = async function (req, res) {
   var isvalid =  await helper.InputValidation(req.params.customerID);
    if(isvalid)
    {
    var customerdata = await service.CustomerData(req.params.customerID);
    res.json(customerdata);
    res.end();
    }else{

        res.json('invalid input:'+req.params.customerID);
    }


};


exports.get_history = async function (req, res) {
    var historydata = await service.HistoryData();
    res.json(historydata);
    res.end();
};

exports.get_tenants_history = async function (req, res) {
    var tenanthistory = await service.TenantsHistory(req.body);
    res.json(tenanthistory);
    res.end();
};

