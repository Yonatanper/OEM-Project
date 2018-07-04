var express = require('express');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let service = require('../servicedata');

exports.check_user = async function (req, res) {
    var cookie = await service.getSavedLogin();
    var token = await service.getST(cookie);
    var result = await service.CheckUser(cookie, token, req.params.username);
    res.json(result);
    res.end();
};
exports.save_customer_data = async function (req, res) {
    res.send("OK fellow...")
    res.end();
    //TODO PHASE 2:Chek dupliaction of companyName,CustomerName,DBName if duplicate concatenate crn+name,if crn is empty of new name is duplicated put as pending.
    var id = await service.AddCustomer(req.body);
    var userid = await service.AddUsers([req.body, id])
    var exist = await service.CheckKeys(req.body)
    if (exist > 0) {
        mainscript.main([id, req])
    }
    else {
        db.WRData("UPDATE [OEM].[dbo].[Customers] set Status = 'Pending' WHERE id =" + id)
        logger.setLevel('info');
        logger.info("Record set as pending for id:." + id);
    }
};





