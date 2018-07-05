var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var async = require('async');
var request = require('request');
var promise = require('promise');
var db = require('./db');
var msgType = require('./MsgTypes');
var sql = require('mssql');
global.user_session = {};
global.config = require('./configuration.json');
var Regex = require("regex");
var rp = require('request-promise');
var simple_timer = require('simple-timer');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var fs = require('fs'),
    parseString = require('xml2js').parseString,
    xml2js = require('xml2js');
var logger = require('./logger').createLogger('development.log'); // logs to a file
var SldURL = ""; //"https://10.55.179.206/sld/sld0100.svc";

async function main([id, req]) {
    // var id= 109;
    var partnerdata = await db.GetData("SELECT Cloud.SldUrl,Cloud.SldUserName,Cloud.SldPassword,Cloud.Reseller_Id,Cloud.EmailServerType,Cloud.EmailUsername,Cloud.EmailPassword,TEM.HostingUnit_Id,TEM.LicenseFile_Id,TEM.LocalSettings,TEM.ChartOfAccount,TEM.SystemLanguage,TEM.CreationMethod,TEM.InstallationNumber,TEM.BackupPackage,TEM.LicensePolicy,TEM.LicenseType,TEM.id,Cus.CompanyName,Cus.CustomerName,Cus.TenantName,Cus.PeriodStarts FROM  [OEM].[dbo].[Customers] Cus INNER JOIN[OEM].[dbo].[Templates] TEM ON Cus.IndPackageId= TEM.IndPackageId and Cus.Country_Code=TEM.Country_Code CROSS JOIN [OEM].[dbo].[CloudConfiguration] Cloud WHERE Cus.id=" + id + "")
    SldURL = partnerdata.SldUrl;
    var cookie = await Login(partnerdata);
    var securityToken = await SecurityToken(cookie);
    var serviceUnitName = await GetSUName(cookie, securityToken, partnerdata.HostingUnit_Id)
    var commonDB = await GetCommonDB(cookie, securityToken, partnerdata.HostingUnit_Id);//'1632'
    var dbInstance = await GetDBInstance(cookie, securityToken, commonDB);
    var dbNameFormatted = await DBNameFormat(partnerdata.CompanyName);
    var tenantName = await CheckTenantName(cookie, securityToken, partnerdata.CompanyName, req.body.customerReferenceNumber, id);
    var customerName = await CheckCustomerName(cookie, securityToken, partnerdata.CompanyName, req.body.customerReferenceNumber, id);
    var dbName = await CheckDBName(cookie, securityToken, dbNameFormatted, dbInstance.ID, req.body.customerReferenceNumber, id);
    var domain = await GetDomainName(cookie, securityToken);
    var usersList = await db.WRData("SELECT CU.UserCode,CU.SystemUser,CU.SuperUser,CU.PowerUser,'['+ STUFF((SELECT ',' + '{'+ '\"type\"' + ':' + '\"' + TEL.LicenseType +'\"' +'}' FROM [OEM].[dbo].[TemplatesLicenses] TEL  WHERE TEL.TemplateId = TEM.Id FOR XML PATH('')), 1, 1, '') + ']' [LicenseType]FROM [OEM].[dbo].[CustomersUsers] CU INNER JOIN [OEM].[dbo].[Customers] Cus ON CU.CustomerID= Cus.id INNER JOIN [OEM].[dbo].[Templates] TEM ON Cus.IndPackageId = TEM.IndPackageId and Cus.Country_Code = TEM.Country_Code INNER JOIN [OEM].[dbo].[TemplatesLicenses] TEL ON TEM.Id = TEL.TemplateId  WHERE CU.CustomerID=" + id + "GROUP BY CU.UserCode,CU.SystemUser,CU.SuperUser,CU.PowerUser,TEM.Id")
    var customerusers = await AddDomainUsers(cookie, securityToken, usersList, domain, id);
    var tenantusers = await UserJsonObject(usersList);
    simple_timer.start('my timer', true);
    var taskId = await CompanyCreation(cookie, securityToken, customerusers, tenantusers, customerName, tenantName, partnerdata, serviceUnitName, dbName, dbInstance.ServerType, req.body);
    var status = await CheckStatus(cookie, securityToken, taskId);
    var userid = await CheckUserID(cookie, securityToken, usersList, id);
    var tenantID = await GetTenantID(cookie, securityToken, tenantName, id);
    var companyID = await GetCompanyID(cookie, securityToken, tenantName, partnerdata, serviceUnitName, id);
    var operatorsList = await db.WRData("SELECT OPL.User_Id, TEO.UserCode, TEO.SystemUser,TEO.SuperUser,TEO.PowerUser,'['+ STUFF((SELECT ',' + '{'+ '\"type\"' + ':' + '\"' + OPL.LicenseType +'\"' +'}' FROM [OEM].[dbo].[OperatorsLicenses] OPL WHERE TEO.TemplateId = TEM.Id and OPL.TemplateId = TEO.TemplateId and OPL.User_Id = TEO.User_Id  FOR XML PATH('')), 1, 1, '') + ']' [LicenseType]FROM [OEM].[dbo].[TemplatesOperators] TEO INNER JOIN [OEM].[dbo].[OperatorsLicenses] OPL ON OPL.TemplateId = TEO.TemplateId and OPL.User_Id = TEO.User_Id INNER JOIN [OEM].[dbo].[Templates] TEM ON TEM.Id = TEO.TemplateId INNER JOIN [OEM].[dbo].[Customers] Cus ON Cus.IndPackageId = TEM.IndPackageId and Cus.Country_Code = TEM.Country_Code WHERE Cus.Id=" + id + " GROUP BY TEO.TemplateId,TEO.User_Id,TEO.UserCode,TEO.SystemUser,TEO.SuperUser,TEO.PowerUser,TEO.Status,TEM.Id,OPL.TemplateId,OPL.User_Id")
    var operator = await AddOperator(cookie, securityToken, tenantID, operatorsList);
    var operatorLicense = await AssignOperatorLicense(cookie, securityToken, tenantID, operatorsList, id);
    var extenstionsData = await db.WRData("SELECT Extension_id,Name,Version,Vendor,Type FROM [OEM].[dbo].[TemplatesExtensions] WHERE Templateid=" + partnerdata.id)
    var extenstions = await AddExtenstions(cookie, securityToken, companyID, id, extenstionsData);
    var customerid = await GetCustomerID(cookie, securityToken, partnerdata.CustomerName, id);
    var reseller = await AddResellers(cookie, securityToken, customerid, partnerdata.Reseller_Id);
    var mailUsers = await db.WRData("SELECT CUS.UserCode,CUS.PowerUser,CUS.Status FROM [OEM].[dbo].[CustomersUsers] CUS WHERE CUS.CustomerID =" + id)
    var mailExtenstions = await db.WRData("SELECT CUSEXT.Extension_Name,CUSEXT.Extension_Status FROM [OEM].[dbo].[CustomersExtensions] CUSEXT WHERE CUSEXT.Customer_Id=" + id)
    var globalMsgContent = await AddMailContent(partnerdata, tenantName, req.body, mailUsers, mailExtenstions);
    var mail = await SendMail(partnerdata.EmailUsername, partnerdata.EmailServerType, partnerdata.EmailUsername, partnerdata.EmailPassword, globalMsgContent, id);

}


//main();

//1st request for login.
function Login(partnerdata) {
    logger.setLevel('info');
    logger.info("Start Login request...");
    // Set the headers
    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json"
    }

    // Configure the request
    var options = {
        url: partnerdata.SldUrl + "/LogonBySystemUser",
        method: "POST",
        headers: headers,
        json: {
            "Account": partnerdata.SldUserName,
            "Password": partnerdata.SldPassword
        }
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var cookies = response.headers['set-cookie'].toString();
                var cookie = cookies.substring(0, 43);
                // Print out the response body
                console.log(cookie)
                console.log('Login Seccsefully' + ' ' + response.body.d.LogonBySystemUser);
                logger.setLevel('info');
                logger.info('Login Seccsefully' + ' ' + response.body.d.LogonBySystemUser);
                resolve(cookie);
            }
            else {
                error = response.body.error.message.value;
                console.log(error + 'please check credentials!');
                logger.setLevel('error');
                logger.error(error + 'please check credentials!');
                SendMail(partnerdata.FirstName, partnerdata.EmailServerType, partnerdata.EmailUsername, partnerdata.EmailPassword, msgType.LoginFailure)
                // resolve(error);

            }
        });
    })
}
//2nd request for security token.
function SecurityToken(cookie) {
    logger.setLevel('info');
    logger.info("Start SecurityToken request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/GenerateSecurityToken",
        method: "GET",
        headers: headers,
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var ST = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('SecurityToken is:' + ' ' + ST.d.GenerateSecurityToken);
                logger.setLevel('info');
                logger.info('SecurityToken is:' + ' ' + ST.d.GenerateSecurityToken + ' ' + '\r\n' + 'Cookie: ' + cookie);
                resolve(ST.d.GenerateSecurityToken);
            }
            else {
                error = ST.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive security token. Error:' + error);
                console.log('Failed to receive security token' + ' ' + error);
                reject(error);
                //resolve(error);
                //throw new Error (Failed to receive security token' + error);
            }
        });
    })
}

//Get Service Unit Name
function GetSUName(cookie, securityToken, serviceUnit) {
    logger.setLevel('info');
    logger.info("Start GetSUName request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie,
        "securityToken": securityToken
    }

    // Configure the request
    var option = {
        url: SldURL + "/ServiceUnits('" + serviceUnit + "')",
        method: "GET",
        headers: headers,
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (response.body == "" || response.body == undefined) {
                logger.setLevel('error');
                logger.error('GetSUName. Error:' + response.statusMessage);
                reject(response.statusMessage)
            }
            else {
                var SUN = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    console.log('Service Unit Name:' + ' ' + SUN.d.Name);
                    logger.setLevel('info');
                    logger.info('Service Unit Name #:' + ' ' + SUN.d.Name);
                    resolve(SUN.d.Name);
                }
                else {
                    error = SUN.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive Service Unit Name. Error:' + error);
                    console.log('Failed to receive Service Unit Name' + error);
                    reject(error);
                }
            }
        });
    });
}
//Get common DB
function GetCommonDB(cookie, securityToken, serviceUnit) {
    logger.setLevel('info');
    logger.info("Start GetCommonDB request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie,
        "securityToken": securityToken
    }

    // Configure the request
    var option = {
        url: SldURL + "/ServiceUnits('" + serviceUnit + "')/CommonDatabase",
        method: "GET",
        headers: headers,
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (response.body == "" || response.body == undefined) {
                logger.setLevel('error');
                logger.error('GetCommonDB. Error:' + response.statusMessage);
                reject(response.statusMessage)
            }
            else {
                var CD = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    console.log('CommonDatabase #:' + ' ' + CD.d.ID);
                    logger.setLevel('info');
                    logger.info('CommonDatabase #:' + ' ' + CD.d.ID);
                    resolve(CD.d.ID);
                }
                else {
                    error = CD.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive CommonDatabase. Error:' + error);
                    console.log('Failed to receive CommonDatabase' + error);
                    reject(error);
                    //throw new Error ('Failed to receive CommonDatabase' + error);
                }
            }
        });
    });
}
//Get DB Instance
function GetDBInstance(cookie, securityToken, commonDB) {

    var AuthType = true;
    logger.setLevel('info');
    logger.info("Start GetDBInstance request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie,
        "securityToken": securityToken
    }

    // Configure the request
    var option = {
        url: SldURL + "/CommonDatabases('" + commonDB + "')/DatabaseInstance",
        method: "GET",
        headers: headers,
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (response.body == "" || response.body == undefined) {
                logger.setLevel('error');
                logger.error('GetDBInstance. Error:' + response.statusMessage);
                reject(response.statusMessage)
            }
            else {
                var DI = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    console.log('DatabaseInstance #:' + ' ' + DI.d.ID);
                    logger.setLevel('info');
                    logger.info('DatabaseInstance #:' + ' ' + DI.d.ID);
                    resolve(DI.d);
                }
                else {
                    error = response.body.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive DatabaseInstance. Error:' + error);
                    console.log('Failed to receive DatabaseInstance' + error);
                    reject(error);
                    //throw new Error ('Failed to receive DatabaseInstance' + error);
                }
            }
        });
    });
}
//Fix DB Format
function DBNameFormat(dbname) {
    logger.setLevel('info');
    logger.info("Start DBNameFormat Method...");
    //check and fix db name accoeding to format
    var regex = new RegExp("[0-9a-zA-Z_]*");
    var desired = dbname.replace(/[^\w]/gi, '')
    if (regex.test(desired)) {
        dbname == desired;
        logger.setLevel('info');
        logger.info("name is valid: " + desired);
        return desired;
    } else {
        logger.setLevel('info');
        logger.info("something went wrong with DBNameFormat method. name is Invalid: " + dbname);
        return;
    }
}
//Check tenant name duplication 
function CheckTenantName(cookie, securityToken, tenantname, crn, id) {
    logger.setLevel('info');
    logger.info("Start CheckTenantName request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "//Tenants?$filter=CompanyDatabase/CompanyName eq '" + encodeURIComponent(tenantname) + "'",
        method: "GET",
        headers: headers,
    }
    return rp(option)
        .then(function (result) {
            var obj = JSON.parse(result)
            if (obj.d.results.length > 0) {
                console.log('Tenant name already exsits:' + tenantname + '' + ' changing name...');
                logger.setLevel('info');
                logger.info('Tenant name already exsits:' + tenantname + '' + ' changing name...');
                var newName = GenerateObjectName(tenantname, crn)
                return (CheckTenantName(cookie, securityToken, newName, crn, id))
            }

            else {
                // handle success…
                console.log('Tenant name free to use:' + tenantname);
                logger.setLevel('info');
                logger.info('Tenant name free to use:' + tenantname);
                db.WRData("UPDATE [OEM].[dbo].[Customers] SET TenantName =" + "'" + tenantname + "'" + " WHERE id=" + id)
                logger.setLevel('info');
                logger.info('Tenant new name updated in customer table:' + tenantname);
                return tenantname
            }
        }).catch(function (err) {
            //error = CN.error.message.value;
            logger.setLevel('error');
            logger.error('Failed to check tenant name:' + tenantname + ".ERROR:" + err);
            console.log('Failed to check tenant name:' + tenantname + ".ERROR:" + err);
            return err;
        });

}
//Check customer name duplication 
function CheckCustomerName(cookie, securityToken, customername, crn, id) {
    logger.setLevel('info');
    logger.info("Start CheckCustomerName request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "//Customers?$filter=Name eq '" + encodeURIComponent(customername) + "'",
        method: "GET",
        headers: headers,
    }
    return rp(option)
        .then(function (result) {
            var obj = JSON.parse(result)
            if (obj.d.results.length > 0) {
                console.log('Customer name already exsits:' + customername + '' + ' changing name...');
                logger.setLevel('info');
                logger.info('Customer name already exsits:' + customername + '' + ' changing name...');
                var newName = GenerateObjectName(customername, crn)
                return (CheckCustomerName(cookie, securityToken, newName, crn, id))
            }

            else {
                // handle success…
                console.log('Customer name free to use:' + customername);
                logger.setLevel('info');
                logger.info('Customer name free to use:' + customername);
                db.WRData("UPDATE [OEM].[dbo].[Customers] SET CustomerName=" + "'" + customername + "'" + " WHERE id=" + id)
                logger.setLevel('info');
                logger.info('Customer new name updated in customer table:' + customername);
                return customername
            }
        }).catch(function (err) {
            logger.setLevel('error');
            logger.error('Failed to check customer name:' + customername + "ERROR:" + err);
            console.log('Failed to check customer name:' + customername + "ERROR:" + err);
            return err;
        });

}
//Check DB name duplication 
function CheckDBName(cookie, securityToken, dbname, dbInstance, crn, id) {
    logger.setLevel('info');
    logger.info("Start CheckDBName request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie,
        "securityToken": securityToken
    }

    // Configure the request
    var option = {
        url: SldURL + "//DatabaseInstances('" + dbInstance + "')/CheckDatabaseExist?DBName= '" + dbname + "'",
        method: "GET",
        headers: headers,
    }
    return rp(option)
        .then(function (result) {
            var obj = JSON.parse(result)
            if (obj.d.CheckDatabaseExist) {
                console.log('DB name already exsits:' + dbname + '' + ' changing name...');
                logger.setLevel('info');
                logger.info('DB name already exsits:' + dbname + '' + ' changing name...');
                var newName = GenerateObjectName(dbname, crn);
                return (CheckDBName(cookie, securityToken, newName, dbInstance, crn, id))
            }

            else {
                // handle success…
                console.log('DB name free to use:' + dbname);
                logger.setLevel('info');
                logger.info('DB name free to use:' + dbname);
                db.WRData("UPDATE [OEM].[dbo].[Customers] SET DBName=" + "'" + dbname + "'" + " WHERE id=" + id)
                logger.setLevel('info');
                logger.info('DB new name updated in customer table:' + dbname);
                return dbname
            }
        }).catch(function (err) {
            logger.setLevel('error');
            logger.error('Failed to check DB name:' + dbname + "ERROR:" + err);
            console.log('Failed to check DB name:' + dbname + "ERROR:" + err);
            throw new Error('Failed to check DB name:' + dbname + "ERROR:" + err);
        });

}
//Check DB name duplication 
function GetDomainName(cookie, securityToken) {
    logger.setLevel('info');
    logger.info("Start GetDomainName request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "Cookie": cookie,
        "securityToken": securityToken
    }
    // Configure the request
    var option = {
        url: SldURL + "/GetDomainName",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var DM = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Domain name is:' + ' ' + DM.d.GetDomainName);
                logger.setLevel('info');
                logger.info('Domain name is:' + ' ' + DM.d.GetDomainName);
                resolve(DM.d.GetDomainName);
            }
            else {
                error = DM.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive domain name. Error:' + error);
                console.log('Failed to receive domain name.Error:' + error);
                resolve(error);
            }

        });
    });

}
function GenerateObjectName(name, crn) {
    logger.setLevel('info');
    logger.info("Start GenerateObjectName Method...");
    //Generate new object name
    // Math.floor((Math.random() * 10) + 1);
    var newName = name + crn + Math.floor((Math.random() * 10) + 1);
    console.log('new object name is:' + ' ' + newName);
    logger.setLevel('info');
    logger.info('new object name is:' + ' ' + newName);
    return newName;
}
//3rd request for domain users.
function AddDomainUsers(cookie, securityToken, usersList, domainName, id) {
    logger.setLevel('info');
    logger.info("Start AddDomainUsers request...");
    logger.setLevel('info');
    logger.info("call Users table...");
    var counter = 0;
    var usersdata = [];
    //var combinedusersList = [];

    return new Promise(function (resolve, reject) {
        for (var i = 0; i < usersList.length; i++) {

            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": securityToken,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/AddDomainUser",
                method: "POST",
                headers: headers,
                json: {
                    'NewAccount': usersList[i].SystemUser,
                    'NewPassword': 'Initial0',
                }
            }


            // Start the request
            request(option, function (error, response, body) {
                if (!error && response.statusCode == 200 && response.body.d.AddDomainUser == true) {
                    console.log('User:' + ' ' + usersList[counter].SystemUser + ' ' + 'created Seccsefully');
                    logger.setLevel('info');
                    logger.info('Create user:' + usersList[counter].SystemUser + ' ' + 'created Seccsefully');
                    db.WRData("UPDATE [OEM].[dbo].[CustomersUsers] SET Status='Added' WHERE CustomerID=" + id + "and SystemUser=" + "'" + usersList[counter].SystemUser + "'")
                    logger.setLevel('info');
                    logger.info("Users table update with SystemUser: " + usersList[counter].SystemUser);
                    var users = { "systemUsername": usersList[counter].SystemUser, "status": "Active", "domain": domainName };
                    usersdata.push(users)
                    counter++;
                    if (counter === usersList.length) {
                        resolve(usersdata);
                    }

                }
                else {
                    error = response.body.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to create domain user for: ' + usersList[counter].SystemUser + '  ' + error);
                    console.log('Failed to create domain user for: ' + usersList[counter].SystemUser + '  ' + error);
                    db.WRData("UPDATE [OEM].[dbo].[CustomersUsers] SET Status='Failed',ErrCode=" + "'" + response.body.error.code + "'" + ",ErrMessage=" + "'" + error + "'" + " WHERE CustomerID=" + id + " and SystemUser=" + "'" + usersList[counter].SystemUser + "'")
                    counter++;
                    if (counter === usersList.length) {
                        resolve(error);
                    }
                }
            });
        }
    });
}
//3.A. request for users Json object.
function UserJsonObject(usersList) {
    logger.setLevel('info');
    logger.info("Start UserJsonObject Method...");
    logger.setLevel('info');
    logger.info("call Users table...");
    var counter = 0;
    var usersLicesnses;
    var userstenantdata = [];
    var licenseModules;
    return new Promise(function (resolve, reject) {

        for (var i = 0; i < usersList.length; i++) {
            licenseModules = JSON.parse(usersList[counter].LicenseType);
            var tenantusers = {
                "status": "Active", "systemUsername": usersList[counter].SystemUser, "sboUsername": usersList[counter].SystemUser, "isSuperSBOUser": false, "isPowerSBOUser": usersList[counter].PowerUser,
                "licenseModules": licenseModules//[{ "type": "PROFESSIONAL" },{ "type": "SAP-ADDONS" }]//,"licenseModulesString": "PROFESSIONAL,PROFESSIONAL" 
            };
            userstenantdata.push(tenantusers);
            console.log('Tenant User:' + ' ' + usersList[counter].SystemUser + ' ' + 'added Seccsefully');
            logger.setLevel('info');
            logger.info('Tenant User:' + usersList[counter].SystemUser + ' ' + 'added Seccsefully');
            counter++;
            if (counter === usersList.length) {
                resolve(userstenantdata);
            }

        }

    });
}
//End Date Formatted
function getFormattedDate(date) {
    var year = date.getFullYear();

    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;

    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;

    return year + month + day;
}
//4th request for Customer&Token (company Creation). 
function CompanyCreation(cookie, securityToken, customerusers, tenantusers, customerName, tenantName, partnerdata, SUName, dbName, servertype, req) {

    logger.setLevel('info');
    logger.info("Start CompanyCreation request...");

    var trustedConnection=true;
    if (servertype.includes("HANA")) {
       trustedConnection= false;
    }
    var startDate = new Date(partnerdata.PeriodStarts);
    var year = startDate.getFullYear();
    var month = startDate.getMonth();
    var day = startDate.getDate();
    var endDateCalc = new Date(year + 1, month, day - 1)
    var endDate = getFormattedDate(endDateCalc);
    var currentYear = new Date()
    var periodNumber;
    switch (req.financialPeriods) {
        case "Y":
            periodNumber = 1;
            break;
        case "Q":
            periodNumber = 4;
            break;
        case "M":
            periodNumber = 12;
    }
    var headers = {
        "Content-Type": "application/json",
        "securityToken": securityToken,
        "Cookie": cookie

    }

    // new
    if (partnerdata.CreationMethod == "Normal") {
        var option = {
            url: SldURL + "/Customers/CreateCustomerAsync",
            method: "POST",
            headers: headers,
            json: {
                Customer:
                    {
                        name: customerName, type: "Customer", contactPerson: req.contactFirstName + " " + req.contactLastName, phone: req.contactPhone,
                        email: req.contactEmail, description: "OEM Customer", LicenseFile: { ID: partnerdata.LicenseFile_Id }, country: req.country,
                        users: customerusers,

                        tenants: [
                            {
                                purpose: "Productive", contactPerson: req.contactFirstName + " " + req.contactLastName, phone: req.contactPhone,
                                email: req.contactEmail,
                                serviceUnit: { id: partnerdata.HostingUnit_Id, name: SUName, status: "Online", purpose: "Productive" },
                                /*licenseFile: { "id": partnerdata.LicenseFile_Id },*/
                                companyDatabase: {
                                    companyName: tenantName, creationOption: 0, name: dbName,
                                    localization: partnerdata.LocalSettings, chartOfAccounts: partnerdata.ChartOfAccount, defaultLang: partnerdata.SystemLanguage,
                                    periodCode: currentYear.getFullYear(), periodName: currentYear.getFullYear(),
                                    periodSubType: req.financialPeriods, periodNumber: periodNumber, periodStartDate: req.startFiscalYear, periodEndDate: endDate,
                                    isTrustedConnection: true //windows auth
                                },

                                users: tenantusers

                            }]
                    }
            }
        }
    }
    //solution package (.PAK)
    else if (partnerdata.CreationMethod == "Package") {
        var option = {
            url: SldURL + "/Customers/CreateCustomerAsync",
            method: "POST",
            headers: headers,
            json: {
                Customer:
                    {
                        name: customerName, type: "Customer", contactPerson: req.contactFirstName + " " + req.contactLastName, phone: req.contactPhone,
                        email: req.contactEmail, description: "OEM Customer", LicenseFile: { ID: partnerdata.LicenseFile_Id }, country: req.country,
                        users: customerusers,

                        tenants: [
                            {
                                purpose: "Productive", contactPerson: req.contactFirstName + " " + req.contactLastName, phone: req.contactPhone,
                                email: req.contactEmail,
                                serviceUnit: { id: partnerdata.HostingUnit_Id, "name": SUName, status: "Online", purpose: "Productive" },
                                /* licenseFile: { id: partnerdata.LicenseFile_Id },*/
                                companyDatabase: {
                                    companyName: tenantName, creationOption: 1, name: dbName,
                                    localization: partnerdata.LocalSettings, chartOfAccounts: partnerdata.ChartOfAccount, defaultLang: partnerdata.SystemLanguage,
                                    periodCode: currentYear.getFullYear(), periodName: currentYear.getFullYear(),
                                    periodSubType: req.FinancialPeriods, periodNumber: periodNumber, periodStartDate: req.startFiscalYear, /*periodEndDate: ",",*/
                                    isTrustedConnection: true, packageFilePath: partnerdata.BackupPackage,
                                },

                                users: tenantusers

                            }]
                    }
            }
        }
    }

    //SQL backup file
    else if (partnerdata.CreationMethod == "Backup") {
        var option = {
            url: SldURL + "/Customers/CreateCustomerAsync",
            method: "POST",
            headers: headers,
            json: {
                Customer:
                    {
                        name: customerName, type: "Customer", contactPerson: req.contactFirstName + " " + req.contactLastName, phone: req.contactPhone,
                        email: req.contactEmail, description: "OEM Customer", LicenseFile: { ID: partnerdata.LicenseFile_Id }, country: req.country,
                        users: customerusers,

                        tenants: [
                            {
                                purpose: "Productive", contactPerson: req.contactFirstName + " " + req.contactLastName, phone: req.contactPhone,
                                email: req.contactEmail,
                                serviceUnit: { id: partnerdata.HostingUnit_Id, "name": SUName, status: "Online", purpose: "Productive" },
                                licenseFile: { id: partnerdata.LicenseFile_Id },
                                companyDatabase: {
                                    companyName: tenantName, creationOption: 2, name: dbName,
                                   /* localization: "", chartOfAccounts: null, defaultLang: "",*/ backupFilePath: partnerdata.BackupPackage,
                                    isTrustedConnection: trustedConnection //windows auth  HANA backup work only with SBO Auto. (isTrustedConnection: false)
                                },

                                users: tenantusers
                            }]
                    }
            }
        }
    }

    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log('Task ID:' + ' ' + response.body.d.CreateCustomerAsync);
                logger.setLevel('info');
                logger.info('Task ID:' + ' ' + response.body.d.CreateCustomerAsync);
                resolve(response.body.d.CreateCustomerAsync);
            }
            else {
                error = response.body.error.message.value;
                logger.setLevel('error');
                logger.error('company creation failed.Error:' + error);
                console.log('company creation failed.Error:' + error);
                reject(error);
            }
        });
    });
}
//5th request for status check.
function CheckStatus(cookie, securityToken, taskid) {

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": securityToken,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/Tasks(" + taskid + ")/GetTaskProperties",

        method: "GET",
        headers: headers
    }

    return rp(option)
        .then(function (result) {
            if (result.includes('Successful')) {
                // handle success…
                console.log("Status:" + " " + result);
                logger.setLevel('info');
                logger.info("CheckStatus Function.Status:" + " " + result);
                simple_timer.stop('my timer', true)
                console.log("Tenant Creation took:" + (simple_timer.get('my timer').delta / 1000 / 60).toFixed(2) + "min")
                logger.setLevel('info');
                logger.info("Tenant Creation took:" + (simple_timer.get('my timer').delta / 1000 / 60).toFixed(2) + "min");
                return result
            }
            if (result.includes('Failed')) {
                // handle failure
                console.log("Status:" + " " + result);
                logger.setLevel('info');
                logger.info("CheckStatus Function.Status:" + " " + result);
                return result

            }

            else {
                ///*300000*/setInterval(alertFunc, 3000);
                // logger.setLevel('info');
                //logger.info("setting interval...");
                //console.log("setting interval...");
                //var interval = setInterval(function() {CheckStatus(cookie, securityToken, taskid); }, 10000 );
                /*   return setInterval(function(cookie, securityToken, taskid){
                       CheckStatus(cookie, securityToken, taskid);
                  }.bind(this,cookie, securityToken, taskid), 10000);*/
                // return CheckStatus(cookie, securityToken, taskid);
                //  return setTimeout(function() {CheckStatus(cookie, securityToken, taskid); }, 1000 );
                /* return setTimeout(function(cookie, securityToken, taskid){
                   CheckStatus(cookie, securityToken, taskid);
              }.bind(this,cookie, securityToken, taskid), 10000);*/
                return CheckStatus(cookie, securityToken, taskid);
            }
        }).catch(function (err) {
            return err;
        });
}
function CheckUserID(cookie, securityToken, usersList, id) {
    logger.setLevel('info');
    logger.info("Start CheckUserID request...");
    logger.setLevel('info');
    logger.info("call Users table...");
    var counter = 0;
    var usersdata = [];
    var CUI;

    return new Promise(function (resolve, reject) {

        for (var i = 0; i < usersList.length; i++) {

            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": securityToken,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/SystemUserBindings?$filter=SystemUser eq " + "'" + usersList[i].SystemUser + "'" + "&$expand=User ",
                method: "GET",
                headers: headers,
            }


            // Start the request
            request(option, function (error, response, body) {
                CUI = JSON.parse(response.body);
                if (!error && response.statusCode == 200 && CUI.d.results.length > 0) {
                    console.log('Username:' + usersList[counter].SystemUser + " " + 'UserID #:' + ' ' + CUI.d.results[0].User.ID);
                    logger.setLevel('info');
                    logger.info('Username:' + usersList[counter].SystemUser + " " + 'UserID #:' + ' ' + CUI.d.results[0].User.ID);
                    db.WRData("UPDATE [OEM].[dbo].[CustomersUsers] SET User_Id=" + CUI.d.results[0].User.ID + " WHERE CustomerID=" + id + "and SystemUser=" + "'" + usersList[counter].SystemUser + "'")
                    var licenseMoudles = JSON.parse(usersList[counter].LicenseType)
                    var userid = CUI.d.results[0].User.ID;
                    for (j = 0; j < licenseMoudles.length; j++) {
                        db.WRData("INSERT INTO [OEM].[dbo].[CustomerUsersLicenses] (User_Id,LicenseType) VALUES (" + userid + "," + "'" + licenseMoudles[j].type + "'" + ")")
                    }
                    counter++;
                    if (counter === usersList.length) {
                        resolve(usersdata);
                    }

                }
                else {
                    error = CUI.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to retrieve user ID for: ' + usersList[counter].SystemUser + '  ' + error);
                    console.log('Failed to retrieve user ID for: ' + usersList[counter].SystemUser + '  ' + error);
                    counter++;
                    if (counter === usersList.length) {
                        resolve(error);
                    }
                }
            });
        }
    });
}
//6th request get tenant id
function GetTenantID(cookie, securityToken, tenantname, id) {
    logger.setLevel('info');
    logger.info("Start GetTenantID request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": securityToken,
        "Cookie": cookie
    }
    //select company name 
    // Configure the request
    var option = {
        url: SldURL + "/Tenants?$expand=ID&$format=json&$filter=CompanyDatabase/CompanyName eq  '" + encodeURIComponent(tenantname) + "' &$select=ID",
        method: "GET",
        headers: headers,
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (response.body == "" || response.body == undefined) {
                logger.setLevel('error');
                logger.error('TenantID. Error:' + response.statusMessage);
                reject(response.statusMessage)
            }
            else {
                var TenantID = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    if (TenantID.d.results.length > 0) {
                        console.log('TenantID is:' + ' ' + TenantID.d.results[0].ID);
                        logger.setLevel('info');
                        logger.info('TenantID is:' + ' ' + TenantID.d.results[0].ID);
                        //  db.WRData("UPDATE [OEM].[dbo].[Customers] SET Status='Added' WHERE id=" + id)
                        resolve(TenantID.d.results[0].ID);
                    }
                    else {
                        logger.setLevel('error');
                        logger.error('Tenant cannot be found:' + tenantname);
                        console.log('Tenant cannot be found:' + tenantname);
                        // db.WRData("UPDATE [OEM].[dbo].[Customers] SET Status='Failed',ErrCode=" + "'" + CompanyID.error.code + "'" + ",ErrMessage=" + "'" + error + "'" + " WHERE id=" + id);
                        //TODO:mail to partner
                        // main.sendMail()
                        //throw new Error ('Tenant cannot be found:' + tenantname );

                    }
                }
                else {
                    error = CompanyID.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive company ID.' + error);
                    console.log('Failed to receive company ID.' + error);
                    //   db.WRData("UPDATE [OEM].[dbo].[Customers] SET Status='Failed',ErrCode=" + "'" + CompanyID.error.code + "'" + ",ErrMessage=" + "'" + error + "'" + " WHERE id=" + id)
                    //TODO:mail to partner
                    //main.sendMail()
                    //throw new Error ('Failed to receive company ID:' + tenantname + "ERROR:" + error);
                    reject(error);
                }
            }
        })
    }).catch(function (err) {
        return err;
    });
}
//6.A. request get companyDB id
function GetCompanyID(cookie, securityToken, tenantName, partnerdata, SUName, id) {
    logger.setLevel('info');
    logger.info("Start GetCompanyID request...");
    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": securityToken,
        "Cookie": cookie
    }
    //select company name 
    // Configure the request
    var option = {
        url: SldURL + "/Tenants?$expand=CompanyDatabase&$format=json&$filter=CompanyDatabase/CompanyName eq  '" + encodeURIComponent(tenantName) + "' &$select=ID",
        method: "GET",
        headers: headers,
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (response.body == "" || response.body == undefined) {
                logger.setLevel('error');
                logger.error('GetCompanyID. Error:' + response.statusMessage);
                reject(response.statusMessage)
            }
            else {
                var CompanyID = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    if (CompanyID.d.results.length > 0) {
                        console.log('CompanyID is:' + ' ' + CompanyID.d.results[0].CompanyDatabase.ID);
                        logger.setLevel('info');
                        logger.info('CompanyID is:' + ' ' + CompanyID.d.results[0].CompanyDatabase.ID);
                        db.WRData("UPDATE [OEM].[dbo].[Customers] SET Status='Added',TemplateId =" + partnerdata.id + ",HostingUnit_Id=" + partnerdata.HostingUnit_Id + ",HostingUnit_Name =" + "'" + SUName + "'" + " ,LicenseFile_Id=" + partnerdata.LicenseFile_Id + ",LicensePolicy = " + "'" + partnerdata.LicensePolicy + "'" + " ,CreationMethod=" + "'" + partnerdata.CreationMethod + "'" + "  WHERE id=" + id)
                        resolve(CompanyID.d.results[0].CompanyDatabase.ID);
                    }
                    else {
                        logger.setLevel('error');
                        logger.error('Tenant cannot be found:' + tenantName);
                        console.log('Tenant cannot be found:' + tenantName);
                        db.WRData("UPDATE [OEM].[dbo].[Customers] SET Status = 'Failed, TemplateId =" + partnerdata.id + ",HostingUnit_Id=" + partnerdata.HostingUnit_Id + ",HostingUnit_Name =" + "'" + SUName + "'" + "  ,LicenseFile_Id=" + partnerdata.LicenseFile_Id + ",LicensePolicy='' " + partnerdata.LicensePolicy + " ,CreationMethod=" + "'" + partnerdata.CreationMethod + "'" + " , ErrCode=" + "'" + CompanyID.error.code + "'" + ",ErrMessage=" + "'" + error + "'" + " WHERE id=" + id);
                        //TODO:mail to partner
                        // main.sendMail()
                        //throw new Error ('Tenant cannot be found:' + tenantname );

                    }
                }
                else {
                    error = CompanyID.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive company ID.' + error);
                    console.log('Failed to receive company ID.' + error);
                    db.WRData("UPDATE [OEM].[dbo].[Customers] SET Status='Failed',ErrCode=" + "'" + CompanyID.error.code + "'" + ",ErrMessage=" + "'" + error + "'" + " WHERE id=" + id)
                    //TODO:mail to partner
                    //main.sendMail()
                    //throw new Error ('Failed to receive company ID:' + tenantname + "ERROR:" + error);
                    reject(error);
                }
            }
        })
    }).catch(function (err) {
        return err;
    });
}
//7th request Assign Operator 
function AddOperator(cookie, securityToken, tenantID, operators) {

    logger.setLevel('info');
    logger.info("Start AssignOperator request...");
    var counter = 0;

    return new Promise(function (resolve, reject) {

        for (var i = 0; i < operators.length; i++) {

            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": securityToken,
                "Cookie": cookie
            }
            // Configure the request
            var option = {
                url: SldURL + "/Tenants(" + tenantID + ")/BindUser",
                method: "POST",
                headers: headers,
                json: {
                    "Users": [{ "systemUsername": operators[i].SystemUser, "sboUsername": operators[i].UserCode, "isSuperSBOUser": operators[i].SuperUser, "isPowerSBOUser": operators[i].PowerUser, "roles": [{ "id": 2 }], "status": "Active" }]
                }

            }
            // Start the request
            request(option, function (error, response, body) {
                if (!error && response.statusCode == 200 && response.body.d.results.length > 0) {
                    console.log('Operator:' + ' ' + operators[counter].SystemUser + ' ' + 'added to tenantID:' + tenantID);
                    logger.setLevel('info');
                    logger.info('Operator:' + ' ' + operators[counter].SystemUser + ' ' + 'added to tenantID:' + tenantID);
                    counter++
                    if (counter === operators.length) {
                        resolve(response.body)
                    }

                }
                else {
                    error = response.body.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to add Operator:' + operators[counter].SystemUser + '!' + ' ' + 'Error:' + error);
                    console.log('Failed to add Operator:' + operators[counter].SystemUser + '!' + ' ' + 'Error:' + error);
                    counter++
                    if (counter === operators.length) {
                        resolve(error);
                    }
                }
            });
        }
    });

}
//7.A. request Assign Operator License 
function AssignOperatorLicense(cookie, securityToken, tenantID, operators, id) {
    logger.setLevel('info');
    logger.info("Start AssignOperatorLicense request...");
    var counter = 0;
    var licenseModules;
    var poweruser;
    var superuser;
    return new Promise(function (resolve, reject) {

        for (var j = 0; j < operators.length; j++) {

            licenseModules = JSON.parse(operators[j].LicenseType);

            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": securityToken,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/Tenants(" + tenantID + ")/UpdateUser",
                method: "POST",
                headers: headers,
                json: {
                    "Users": [{ "id": operators[j].User_Id, "sboUsername": operators[j].UserCode, "isSuperSBOUser": operators[j].SuperUser, "isPowerSBOUser": operators[j].PowerUser, "status": "Active", "licenseModules": licenseModules }]
                }

            }

            // Start the request
            request(option, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log('Operator:' + ' ' + operators[counter].UserCode + ' ' + 'License Type:' + operators[counter].LicenseType);
                    logger.setLevel('info');
                    logger.info('Operator:' + ' ' + operators[counter].UserCode + ' ' + 'License Type:' + operators[counter].LicenseType);
                    superuser = (operators[counter].SuperUser) ? 1 : 0;
                    poweruser = (operators[counter].PowerUser) ? 1 : 0;
                    db.WRData("INSERT INTO [OEM].[dbo].[CustomersUsers] (User_Id,CustomerID,UserType,UserCode,SystemUser,SuperUser,PowerUser,Validation,Status,ErrCode,ErrMessage) VALUES (" + operators[counter].User_Id + "," + (id) + ",'Operator'," + "'" + operators[counter].UserCode + "'" + "," + "'" + operators[counter].UserCode + "'" + "," + superuser + "," + poweruser + ",'','Added','','')")
                    var licenseModules1 = JSON.parse(operators[counter].LicenseType);

                    for (var l = 0; l < licenseModules1.length; l++) {
                        db.WRData("INSERT INTO [OEM].[dbo].[CustomerUsersLicenses] (User_Id,LicenseType) VALUES (" + operators[counter].User_Id + "," + "'" + licenseModules[l].type + "'" + ")")
                        logger.setLevel('info');
                        logger.info("CustomerUsersLicenses table has been updated");
                    }
                    counter++
                    if (counter === operators.length) {
                        resolve(body)
                    }


                }
                else {
                    error = response.body.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to assign operator license. Operator:' + operators[counter].UserCode + ' ' + 'Error:' + error);
                    console.log('Failed to assign operator license. Operator:' + operators[counter].UserCode + ' ' + 'Error:' + error);
                    counter++
                    if (counter === operators.length) {
                        resolve(error);
                    }
                }
            });
        }
    });
}
//8th request ADD Extenstions
function AddExtenstions(cookie, securityToken, companydbID, id, ext) {
    logger.setLevel('info');
    logger.info("Start ADDExtenstions request...");
    var counter = 0;
    return new Promise(function (resolve, reject) {
        for (var i = 0; i < ext.length; i++) {

            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": securityToken,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/CreateExtensionAssignment",
                method: "POST",
                headers: headers,
                strictSSL: false,
                json: {
                    "ExtensionAssignmentParameter":
                        { "extensionDeploymentId": ext[i].Extension_id, "companyDBId": companydbID, "properties": [] }
                }
            }

            // Start the request
            request(option, function (error, response, body) {

                if (!error && response.statusCode == 200) {
                    var ExtensionRes = response.body;
                    console.log('ExtenstionsID:' + ext[counter].Extension_id + ' ' + 'was assigned to CompanydbID:' + companydbID);
                    logger.setLevel('info');
                    logger.info('ExtenstionsID:' + ext[counter].Extension_id + ' ' + 'was assigned to CompanydbID:' + companydbID);
                    db.WRData("INSERT INTO [OEM].[dbo].[CustomersExtensions] (Customer_Id,Extension_Id,Extension_Name,Extension_Version,Extension_Vendor,Extension_Type,Extension_Status,ErrCode,ErrMessage) VALUES(" + id + "," + ext[counter].Extension_id + "," + "'" + ext[counter].Name + "'" + "," + "'" + ext[counter].Version + "'" + "," + "'" + ext[counter].Vendor + "'" + "," + "'" + ext[counter].Type + "'" + ",'Assigned','','')")
                    counter++;
                    if (counter == ext.length) {
                        resolve(response.body.d.results[0].Enabled)
                    }
                }
                else {
                    error = response.body.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to add extenstionsID:' + ext[counter].Extension_id + ' ' + 'Error:' + error);
                    console.log('Failed to add extenstionsID:' + ext[counter].Extension_id + ' ' + 'Error:' + error);
                    counter++;
                    resolve(error);
                }
            });
        }
    });
}
//9th request get customer id
function GetCustomerID(cookie, securityToken, customerName, id) {
    logger.setLevel('info');
    logger.info("Start GetCustomerID request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": securityToken,
        "Cookie": cookie
    }
    // Configure the request
    var option = {
        url: SldURL + "//Customers?$filter=Name eq '" + encodeURIComponent(customerName) + "' &$select=ID",
        method: "GET",
        strictSSL: false,
        headers: headers,
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var CustomerID = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                if (CustomerID.d.results.length > 0) {
                    console.log('CustomerID is:' + ' ' + CustomerID.d.results[0].ID);
                    logger.setLevel('info');
                    logger.info('CustomerID is:' + ' ' + CustomerID.d.results[0].ID);
                    db.WRData("UPDATE [OEM].[dbo].[Customers] SET Customer_Id=" + CustomerID.d.results[0].ID + " WHERE id=" + id)
                    resolve(CustomerID.d.results[0].ID);
                }
                else {
                    logger.setLevel('error');
                    logger.error('Customer not created. CustomerName:' + customerName);
                    console.log('Customer not created.CustomerName:' + customerName);
                    resolve(error)
                }
            }
            else {
                error = response.body.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive Customer ID.');
                console.log('Failed to receive Customer ID.');
                resolve(error)
                //process.exit(-1);
            }
        })
    })
}
//10th request assign reseller id
function AddResellers(cookie, securityToken, customerid, resellerid) {
    logger.setLevel('info');
    logger.info("Start AddResellers request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": securityToken,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "//Resellers('" + resellerid + "')/AssignResources",
        method: "POST",
        headers: headers,
        json: {

            "ResourceType": "Customer", "ResourceIDs": [customerid], "ResourceAssignmentParams": []
        }
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (!error && response.statusCode == 200 && response.body.d.AssignResources) {
                console.log('Reseller Assign successfully to customer:' + customerid);
                logger.setLevel('info');
                logger.info('Reseller Assign successfully to customer:' + customerid);
                resolve(response.body.d.AssignResources);
            }
            else {
                error = response.body.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to assign Reseller ID.' + error);
                console.log('Failed to assign Reseller ID.' + error);
                resolve(error)
            }
        })
    })
}
//Add content to mail
function AddMailContent(content, tenantName, customercontent, mailusers, mailextensions) {
    logger.setLevel('info');
    logger.info("Start Addhandlebars request...");
    var Users = '';
    var Extensions = '';
    var startDate = new Date(content.PeriodStarts);
    var year = startDate.getFullYear();
    var month = startDate.getMonth();
    var day = startDate.getDate();
    var enddate = new Date(year + 1, month, day - 1)
    switch (customercontent.financialPeriods) {
        case "Y":
            periodName = "Yearly";
            break;
        case "Q":
            periodName = "Quarterly";
            break;
        case "M":
            periodName = "Monthly";
    }
    for (i = 0; i < mailusers.length; i++) {
        Users += "<li>User code:" + mailusers[i].UserCode + "</li>" +
            "<li>User password:Initial0</li>" +
            "<li>Indication of power user:" + mailusers[i].PowerUser + "</li>" +
            "<li>Status:" + mailusers[i].Status + "</li>" +
            "--------------------------------------------"
    }
    for (j = 0; j < mailextensions.length; j++) {
        Extensions += "<li>Extension name:" + mailextensions[j].Extension_Name + "</li>" +
            "<li>Status:" + mailextensions[j].Extension_Status + "</li>" +
            "--------------------------------------------"
    }

    var hb = msgType.Addbars(content, tenantName, customercontent, enddate.toDateString(), periodName, Users, Extensions)
    return hb;

}
//Mail...
function SendMail(to, mailtype, mailusername, mailpass, content, id) {
    logger.setLevel('info');
    logger.info("Start SendMail function...");
    var from;
    return new Promise(function (resolve, reject) {
        ///sending email
        if (mailtype.toLowerCase() == "gmail") {
            from = mailusername
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 25,
                secure: false, // use SSL
                tls: {
                    rejectUnauthorized: false
                },
                auth: {
                    user: mailusername,
                    pass: mailpass
                }
            });

        }
        else {
            from = mailusername//'yonatan.peretz@sap.com'
            var transporter = nodemailer.createTransport(smtpTransport({
                host: 'mail.sap.corp',
                secureConnection: true,
                port: 587,
                auth: {
                    user: "C5265020",
                    pass: "Barca1407!"
                },
                tls: {
                    rejectUnauthorized: false
                }
            }));



        }

        var mailOptions = {
            from: from,
            to: to,//[to, 'yonatan.peretz@sap.com'],//'ofer.oz@sap.com','yonatan.peretz@sap.com',*/
            cc: '',// 'yonatan.peretz@sap.com',
            subject: content.subject,
            html: /*'Hello' + " " + name +*/ '</br>' + content.body
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                logger.setLevel('error');
                logger.error('Error sending email. Error:' + error);
                db.WRData("UPDATE [OEM].[dbo].[Customers] SET EmailStatus='Failed', WHERE id=" + id)
                reject(error)
            } else {
                console.log('Email sent: ' + info.response);
                logger.setLevel('info');
                logger.info('Email sent successfully to: ' + to);
                db.WRData("UPDATE [OEM].[dbo].[Customers] SET EmailStatus='Sent' WHERE id=" + id)
                resolve('Email sent: ' + info.response);
                logger.setLevel('info');
                logger.info("PROCESS END!!!");
            }
        });
    });
}
exports.main = main;


