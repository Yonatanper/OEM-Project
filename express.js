var express = require('express');
var app = express();
var bodyParser = require("body-parser");
var request = require('request');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let service = require('./servicedata');
var mainscript = require('./main');
//var mainExm = require('./mainExm');
var db = require('./db');
var logger = require('./logger').createLogger('development.log'); // logs to a file
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Body parser use JSON data
var port = 30000;


app.listen(port, function () {

    console.log('Running Server on port:' + port);

});

app.get('/', function (req, res) {
    console.log(res);
    res.json("Welcome to OEM web service");

});

app.post('/login', function (req, res) {
    var url = req.body.Url;
    var account = req.body.Account;
    var pass = req.body.Password;
    //TODO:password encrept
    //dcrypt password
    //send to login method
    service.Login(url, account, pass).then(function ([cookie, result]) {
        res.json(result);
        /*  if (cookie != null) {
              if (result.d.LogonBySystemUser) {
                  db.AggregateData("SELECT count(*) from [OEM].[dbo].[CloudConfiguration]").then(function (count) {
                      if (count > 0) {
                          db.WRData("UPDATE [OEM].[dbo].[CloudConfiguration] set SldUrl=" + "'" + url + "'" + ",SldUserName =" + "'" + account + "'" + ", SldPassword=" + "'" + pass + "'")
                          logger.setLevel('info');
                          logger.info("Login parameters were update successfully.");
                      }
                      else {
                          db.WRData("INSERT INTO [OEM].[dbo].[CloudConfiguration] (SldUrl,SldUserName,SldPassword) VALUES (" + "'" + url + "'" + "," + "'" + account + "'" + "," + "'" + pass + "'" + ")");
                          logger.setLevel('info');
                          logger.info("Login parameters were insert successfully.");
                      }
                  })
              }
          }*/
        res.end();

    });
});

//combo1
app.get('/independentParameters', function (req, res) {
    service.getSavedLogin().then(function (cookie) {
        service.getST(cookie).then(function (token) {
            service.getDomain(cookie, token).then(function (domain) {
                service.getServiceUnits(cookie, token).then(function (serviceunits) {
                    service.getResellers(cookie, token).then(function (resellers) {
                        service.getEmail(cookie, token).then(function (email) {
                            service.getOperators(cookie, token).then(function (operators) {
                                service.getLicenses(cookie, token).then(function (licenseids) {
                                    service.getLicenseModules(licenseids.d.results, cookie, token).then(function (licensemoudle) {
                                        res.json({ domain, serviceunits, resellers, email, operators, licensemoudle });
                                        res.end();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

//combo2
app.get('/:serviceunit/dependentParameters', function (req, res) {
    service.getSavedLogin().then(function (cookie) {
        service.getST(cookie).then(function (token) {
            service.getCompanyTemplateRepo(cookie, token, req.params.serviceunit).then(function (templateRpoID) {
                service.getBackupPath(cookie, token, templateRpoID).then(function (backupPath) {
                    service.getImplementationRepo(cookie, token, req.params.serviceunit).then(function (implementRpoID) {
                        service.getPackagePath(cookie, token, implementRpoID).then(function (packagePath) {
                            service.getCommonDB(cookie, token, req.params.serviceunit).then(function (commondb) {
                                service.getLocalizationsLists(cookie, token, commondb).then(function (localizations) {
                                    service.getSoftwareRepository(cookie, token, req.params.serviceunit).then(function ([softwarerepository, srbody]) {
                                        service.getLanguages(cookie, token, softwarerepository).then(function (languages) {
                                            service.getExtensionDeployID(cookie, token, commondb).then(function (extensionsDeployID) {
                                                service.getExtensions(cookie, token, commondb, extensionsDeployID.d.results).then(function (extensions) {
                                                    //package
                                                    res.json({ backupPath, packagePath, localizations, srbody, languages, extensions });
                                                    res.end();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

//combo3
app.get('/:serviceunit=:serviceunit/COA=:localsetting', function (req, res) {
    service.getSavedLogin().then(function (cookie) {
        service.getST(cookie).then(function (token) {
            service.getCommonDB(cookie, token, req.params.serviceunit).then(function (commondb) {
                service.getCOA(cookie, token, commondb, req.params.localsetting).then(function (result) {
                    res.json(result);
                    res.end();
                });
            });
        });
    });
});

//check user
app.get('/checkUser/:username', function (req, res) {
    service.getSavedLogin().then(function (cookie) {
        service.getST(cookie).then(function (token) {
            service.CheckUser(cookie, token, req.params.username).then(function (result) {
                res.send(result);
                res.end();
            });
        });
    });
});
//submit
app.post('/saveCustomerData', function (req, res) {
    res.send("OK fellow...")
    res.end();
    //TODO PHASE 2:Chek dupliaction of companyName,CustomerName,DBName if duplicate concatenate crn+name,if crn is empty of new name is duplicated put as pending.
    service.AddCustomer(req.body).then(function (id) {
        service.AddUsers([req.body, id]).then(function (userid) {
            service.CheckKeys(req.body).then(function (exist) {
                if (exist > 0) {
                    mainscript.main([id, req])
                }
                else {
                    db.WRData("UPDATE [OEM].[dbo].[Customers] set Status = 'Pending' WHERE id =" + id)
                    logger.setLevel('info');
                    logger.info("Record set as pending for id:." + id);
                }
            });
        });
    });
    /*    process.nextTick(() => {
        let company = await customerSvc.createCompany(req);
        await userSvc.createUsers(req);
        // ...
        main();
    });
    res.json({...});
});
*//*
                                                                                                                                                            process.nextTick(function () {
                                                                                                                                                                res.send("OK fellow...")
                                                                                                                                                                res.end();
                                                                                                                                                        
                                                                                                                                                            });
                                                                                                                                                            var id = null;
                                                                                                                                                            db.GetData2("SELECT Max(ID) FROM [OEM].[dbo].[Customers]").then(function (id) {
                                                                                                                                                                if (id == null || id == undefined) {
                                                                                                                                                                    id = 100;
                                                                                                                                                                    db.GetData3("INSERT INTO [OEM].[dbo].[Customers] (id,Country_Code,CRN,CompanyName,FirstName,LastName,Email,Phone,FinancialPeriod,PeriodStarts,RequestDate,UpdateDate,Status,ErrCode,ErrMessage,EmailStatus,Customer_Id,CustomerName,TenantName,DBName,HostingUnit_Id,HostingUnit_Name,LicenseFile_Id,LicensePolicy,CreationMethod) VALUES (" + (id) + "," + "'" + req.body.country + "'" + "," + req.body.customerReferenceNumber + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.contactFirstName + "'" + "," + "'" + req.body.contactLastName + "'" + "," + "'" + req.body.contactEmail + "'" + "," + "'" + req.body.contactPhone + "'" + "," + "'" + req.body.financialPeriods + "'" + "," + "'" + req.body.startFiscalYear + "'" + ",GETDATE(),GETDATE(),'','','','',''," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + ",'','','','',2)").then(function () {
                                                                                                                                                                        logger.setLevel('info');
                                                                                                                                                                        logger.info("First Record!!! DB Updated with customer parameters.");
                                                                                                                                                                        //for loop on json users
                                                                                                                                                                        db.GetData3("INSERT INTO [OEM].[dbo].[CustomersUsers] (User_Id,CustomerID,UserType,UserCode,SystemUser,SuperUser,PowerUser,Validation,Status,ErrCode,ErrMessage) VALUES (''," + (id) + ",'User','loli','loli',0,1,'','','','')").then(function () {
                                                                                                                                                                            logger.setLevel('info');
                                                                                                                                                                            logger.info("DB Updated with customer's users parameters.");
                                                                                                                                                                            // mainscript.main(id)
                                                                                                                                                        
                                                                                                                                                                        });
                                                                                                                                                                    });
                                                                                                                                                                }
                                                                                                                                                                else {
                                                                                                                                                                    db.GetData3("INSERT INTO [OEM].[dbo].[Customers] (id,Country_Code,CRN,CompanyName,FirstName,LastName,Email,Phone,FinancialPeriod,PeriodStarts,RequestDate,UpdateDate,Status,ErrCode,ErrMessage,EmailStatus,Customer_Id,CustomerName,TenantName,DBName,HostingUnit_Id,HostingUnit_Name,LicenseFile_Id,LicensePolicy,CreationMethod) VALUES (" + (id + 1) + "," + "'" + req.body.country + "'" + "," + req.body.customerReferenceNumber + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.contactFirstName + "'" + "," + "'" + req.body.contactLastName + "'" + "," + "'" + req.body.contactEmail + "'" + "," + "'" + req.body.contactPhone + "'" + "," + "'" + req.body.financialPeriods + "'" + "," + "'" + req.body.startFiscalYear + "'" + ",GETDATE(),GETDATE(),'','','','',''," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + ",'','','','',2)").then(function () {
                                                                                                                                                                        logger.setLevel('info');
                                                                                                                                                                        logger.info("DB Updated with customer parameters.");
                                                                                                                                                                        for (i = 0; i < req.body.Users.length; i++) {
                                                                                                                                                                            var poweruser = (req.body.Users[i].administrator) ? 1 : 0;
                                                                                                                                                                           // db.GetData2("SELECT Max(User_Id) FROM [OEM].[dbo].[CustomersUsers]").then(function (usersid) {
                                                                                                                                                                                db.GetData3("INSERT INTO [OEM].[dbo].[CustomersUsers] (User_Id,CustomerID,UserType,UserCode,SystemUser,SuperUser,PowerUser,Validation,Status,ErrCode,ErrMessage) VALUES (''," + (id + 1) + ",'User'," + "'" + req.body.Users[i].username + "'" + "," + "'" + req.body.Users[i].username + "'" + ",0," + poweruser + ",'','','','')")//.then(function () {
                                                                                                                                                                                    logger.setLevel('info');
                                                                                                                                                                                    logger.info("DB Updated with customer's users parameters.User:" + req.body.Users[i].username);
                                                                                                                                                                                    if (i===req.body.Users.length -1)
                                                                                                                                                                                    {
                                                                                                                                                                                        mainscript.main(id)
                                                                                                                                                                                    }
                                                                                                                                                                         //   });
                                                                                                                                                                         //   });
                                                                                                                                                                        }
                                                                                                                                                                       // mainscript.main(id)
                                                                                                                                                                       //  });
                                                                                                                                                                       //   });
                                                                                                                                                                    });
                                                                                                                                                                }
                                                                                                                                                            });*/
});
//save partner data to OEM DB
app.post('/savePartnerData', function (req, res) {
    res.send("Got It! start working on partner data...")
    res.end();
    service.RemovePartnerData(req.body).then(function () {
        service.FillPartnerTables(req.body)//.then(function (id) {
    });
});
//Select partner data from OEM DB
app.get('/getPartnerData', function (req, res) {
    service.PartnerData().then(function (results) {
        res.json(results);
        res.end();
    });
});

/*submit1
app.post('/saveUserData1', function (req, res) {
    process.nextTick(function () {
        res.send("OK fellow...")
        res.end();

    });
    var id = null;
    db.AggregateData("SELECT Max(ID) FROM [OEM].[dbo].[Customers]").then(function (id) {
        if (id == null || id == undefined) {
            id = 100;
            db.WRData("INSERT INTO [OEM].[dbo].[Customers] (id,Country_Code,CRN,CompanyName,FirstName,LastName,Email,Phone,FinancialPeriod,PeriodStarts,RequestDate,UpdateDate,Status,ErrCode,ErrMessage,EmailStatus,Customer_Id,CustomerName,TenantName,DBName,HostingUnit_Id,HostingUnit_Name,LicenseFile_Id,LicensePolicy,CreationMethod) VALUES (" + (id) + "," + "'" + req.body.country + "'" + "," + req.body.customerReferenceNumber + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.contactFirstName + "'" + "," + "'" + req.body.contactLastName + "'" + "," + "'" + req.body.contactEmail + "'" + "," + "'" + req.body.contactPhone + "'" + "," + "'" + req.body.financialPeriods + "'" + "," + "'" + req.body.startFiscalYear + "'" + ",GETDATE(),GETDATE(),'','','','',''," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + ",'','','','',2)").then(function () {
                logger.setLevel('info');
                logger.info("First Record!!! DB Updated with customer parameters.");
                //for loop on json users
                db.WRData("INSERT INTO [OEM].[dbo].[CustomersUsers] (User_Id,CustomerID,UserType,UserCode,SystemUser,SuperUser,PowerUser,Validation,Status,ErrCode,ErrMessage) VALUES (''," + (id) + ",'User','loli','loli',0,1,'','','','')").then(function () {
                    logger.setLevel('info');
                    logger.info("DB Updated with customer's users parameters.");
                    // mainscript.main(id)

                });
            });
        }
        else {
            db.WRData("INSERT INTO [OEM].[dbo].[Customers] (id,Country_Code,CRN,CompanyName,FirstName,LastName,Email,Phone,FinancialPeriod,PeriodStarts,RequestDate,UpdateDate,Status,ErrCode,ErrMessage,EmailStatus,Customer_Id,CustomerName,TenantName,DBName,HostingUnit_Id,HostingUnit_Name,LicenseFile_Id,LicensePolicy,CreationMethod) VALUES (" + (id + 1) + "," + "'" + req.body.country + "'" + "," + req.body.customerReferenceNumber + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.contactFirstName + "'" + "," + "'" + req.body.contactLastName + "'" + "," + "'" + req.body.contactEmail + "'" + "," + "'" + req.body.contactPhone + "'" + "," + "'" + req.body.financialPeriods + "'" + "," + "'" + req.body.startFiscalYear + "'" + ",GETDATE(),GETDATE(),'','','','',''," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + "," + "'" + req.body.companyName + "'" + ",'','','','',2)").then(function () {
                logger.setLevel('info');
                logger.info("DB Updated with customer parameters.");
                //for loop on json users
                for (i = 0; i < req.body.Users.length; i++) {
                    var poweruser = (req.body.Users[i].administrator) ? 1 : 0;
                    // db.GetData2("SELECT Max(User_Id) FROM [OEM].[dbo].[CustomersUsers]").then(function (usersid) {
                    db.WRData("INSERT INTO [OEM].[dbo].[CustomersUsers] (User_Id,CustomerID,UserType,UserCode,SystemUser,SuperUser,PowerUser,Validation,Status,ErrCode,ErrMessage) VALUES (''," + (id + 1) + ",'User'," + "'" + req.body.Users[i].username + "'" + "," + "'" + req.body.Users[i].username + "'" + ",0," + poweruser + ",'','','','')")//.then(function () {
                    logger.setLevel('info');
                    logger.info("DB Updated with customer's users parameters.User:" + req.body.Users[i].username);
                    if (i === req.body.Users.length - 1) {
                        mainscript.main(id)
                    }
                    //   });
                    //   });
                }
                // mainscript.main(id)
                //  });
                //   });
            });
        }
    });
});*/
/*//submit
app.post('/saveUserDataExm', function (req, res) {
    console.log(req);
    res.json("OK,Got it!");
    res.end();
    mainExm.main(req);
});*/


/*****View History section*****/

app.get('/getCustomerData/:customerID', function (req, res) {
    service.CustomerData(req.params.customerID).then(function (customerdata) {
        res.json(customerdata);
        res.end();
    });
});

app.get('/getHistory', function (req, res) {
    service.HistoryData().then(function (history) {
        res.json(history);
        res.end();
    });
});

app.post('/getTenantsHistory', function (req, res) {
    service.TenantsHistory(req.body).then(function (tenanthistory) {
        res.json(tenanthistory);
        res.end();
    });
});







