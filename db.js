var sql = require('mssql');
var logger = require('./logger').createLogger('development.log'); // logs to a file
var conn;
global.user_session = {};
global.config = require('./configuration.json');



function connect() {
    return new Promise(function (resolve, reject) {
        if (!conn) {
            var conn = new sql.Connection(config);
            conn.connect(function (err) {
                if (!err) {
                    logger.setLevel('info');
                    logger.info('Database is connected!');
                    console.log('Database is connected!');
                    resolve(conn);
                } else {
                    logger.setLevel('info');
                    logger.info('Database not connected!');
                    console.log('Error connecting database!');
                    conn.close();
                    resolve(err);
                }

            })
        }
        resolve(conn);
    });

}
function execute(conn, query) {
    return new Promise(function (resolve, reject) {
        try {

            var req = new sql.Request(conn);
            req.query(query).then(function (recordset) {
                conn.close();
                resolve(recordset[0]);

            }).catch(function (err) {
                console.log(err);
                conn.close();
                resolve(err)
            });
        }
        catch (err) {
            console.log(err);
        }
    });

}
function WriteData(query) {

    var conn = new sql.Connection(global.config);
    var req = new sql.Request(conn);

    conn.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        req.query(query, function (err, recordset) {
            if (err) {
                console.log(err);
            }
            else {

                return recordset;
            }
            conn.close();
        });
    });
}
function AggregateData(query) {

    return new Promise(function (resolve, reject) {
        var conn = new sql.Connection(global.config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            req.query(query, function (err, recordset) {
                if (err) {
                    console.log(err);
                }
                else {

                    resolve(recordset[0][""]);
                }
                conn.close();
            });
        });
    });
}
function WRData(query) {

    return new Promise(function (resolve, reject) {
        var conn = new sql.Connection(global.config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            req.query(query, function (err, recordset) {
                if (err) {
                    console.log(err);
                }
                else {

                    resolve(recordset);
                }
                conn.close();
            });
        });
    });
}
function GetData(query) {

    return new Promise(function (resolve, reject) {
        var conn = new sql.Connection(global.config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            req.query(query, function (err, recordset) {
                if (err) {
                    console.log(err);
                }
                else {

                    resolve(recordset[0]);
                }
                conn.close();
            });
        });
    });
}
function SP_TenantsHistory(status, companyname, serviceunit, datefrom, dateto) {

    return new Promise(function (resolve, reject) {
        var conn = new sql.Connection(global.config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            req.input('Status', sql.NVarChar(50), status)
            req.input('CompanyName', sql.NVarChar(250), companyname)
            req.input('ServiceUnit', sql.Int, serviceunit)
            req.input('DateFrom', sql.Date, datefrom)
            req.input('DateTo', sql.Date, dateto)
            req.execute("[OEM].[dbo].[TenantsHistory]").then(function (recordSet) {
                if (err) {
                    console.log(err);
                }
                else {

                    resolve(recordSet);
                }
                conn.close();
            });
        });
    });
}
function SP_AddCustomer(id, indPackageId, countryCode, CRN, companyName, firstName, lastName, email, phone, financialPeriod, periodStarts, requestDate, updateDate, status,
    errCode, errMessage, emailStatus, templateId, customerId, customerName, tenantName, dbName, serviceUnitId, serviceUnitName, licenseFileId, licensePolicy, creationMethod) {

    return new Promise(function (resolve, reject) {
        var conn = new sql.Connection(global.config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }

            req.input('Id', sql.Int, id)
            req.input('IndPackageId', sql.Int, indPackageId)
            req.input('CountryCode', sql.NVarChar(3), countryCode)
            req.input('CRN', sql.NVarChar(250), CRN)
            req.input('CompanyName', sql.NVarChar(250), companyName)
            req.input('FirstName', sql.NVarChar(250), firstName)
            req.input('LastName', sql.NVarChar(250), lastName)
            req.input('Email', sql.NVarChar(100), email)
            req.input('Phone', sql.NVarChar(50), phone)
            req.input('FinancialPeriod', sql.Char(1), financialPeriod)
            req.input('PeriodStarts', sql.Date, periodStarts)
            req.input('RequestDate', sql.DateTime, requestDate)
            req.input('UpdateDate', sql.DateTime, updateDate)
            req.input('Status', sql.NVarChar(50), status)
            req.input('ErrCode', sql.NVarChar(50), errCode)
            req.input('ErrMessage', sql.NText, errMessage)
            req.input('EmailStatus', sql.NVarChar(50), emailStatus)
            req.input('TemplateId', sql.Int, templateId)
            req.input('CustomerId', sql.Int, customerId)
            req.input('CustomerName', sql.NVarChar(250), customerName)
            req.input('TenantName', sql.NVarChar(100), tenantName)
            req.input('DBName', sql.NVarChar(100), dbName)
            req.input('ServiceUnitId', sql.Int, serviceUnitId)
            req.input('ServiceUnitName', sql.NVarChar(100), serviceUnitName)
            req.input('LicenseFileId', sql.Int, licenseFileId)
            req.input('LicensePolicy', sql.NVarChar(100), licensePolicy)
            req.input('CreationMethod', sql.NVarChar(50), creationMethod)
            req.execute("[OEM].[dbo].[AddCustomer]").then(function (recordSet) {
                if (err) {
                    console.log(err);
                }
                else {

                    resolve(recordSet);
                }
                conn.close();
            });
        });
    });
}
function SP_AddUser(userId,customerId,userType,userCode,systemUser,superUser,powerUser,validation,status,errCode,errMessage) {

    return new Promise(function (resolve, reject) {
        var conn = new sql.Connection(global.config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            req.input('UserId', sql.Int, userId)
            req.input('Customerid', sql.Int, customerId)
            req.input('UserType', sql.NVarChar(50), userType)
            req.input('UserCode', sql.NVarChar(250), userCode)
            req.input('SystemUser', sql.NVarChar(250), systemUser)
            req.input('SuperUser', sql.Bit, superUser)
            req.input('PowerUser', sql.Bit, powerUser)
            req.input('Validation', sql.Char(1), validation)
            req.input('Status', sql.NVarChar(50), status)
            req.input('ErrCode', sql.NVarChar(250), errCode)
            req.input('ErrMessage', sql.NText, errMessage)
            req.execute("[OEM].[dbo].[AddUser]").then(function (recordSet) {
                if (err) {
                    console.log(err);
                }
                else {

                    resolve(recordSet);
                }
                conn.close();
            });
        });
    });
}
function SP_CustomerData(id) {

    return new Promise(function (resolve, reject) {
        var conn = new sql.Connection(global.config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            req.input('Id', sql.Int, id)
            req.execute("[OEM].[dbo].[CustomerData]").then(function (recordSet) {
                if (err) {
                    console.log(err);
                }
                else {

                    resolve(recordSet);
                }
                conn.close();
            });
        });
    });
}
exports.AggregateData = AggregateData;
exports.WRData = WRData;
exports.GetData = GetData;
exports.connect = connect;
exports.execute = execute;
exports.WriteData = WriteData;
exports.SP_TenantsHistory = SP_TenantsHistory;
exports.SP_AddCustomer = SP_AddCustomer;
exports.SP_AddUser = SP_AddUser;
exports.SP_CustomerData = SP_CustomerData;