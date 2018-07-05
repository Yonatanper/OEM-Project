let service = require('../servicedata');


exports.get_customer_data = async function (req, res) {
    var customerdata = await service.CustomerData(req.params.customerID);
    res.json(customerdata);
    res.end();
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

