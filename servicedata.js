var request = require('request');
var Regex = require("regex");
var db = require('./db');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var logger = require('./logger').createLogger('development.log'); // logs to a file
var SldURL = "";//"https://10.55.179.206/sld/sld0100.svc";


var Login =  function (URL, account, password) {
    logger.setLevel('info');
    logger.info("Start Login Request...");
    // Set the headers
    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json"
    }

    // Configure the request
    var options = {
        url: URL + "/LogonBySystemUser",
        method: "POST",
        headers: headers,
        json: {
            "Account": account,
            "Password": password
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
                db.AggregateData("SELECT count(*) from [OEM].[dbo].[CloudConfiguration]").then(function (count) {
                    if (count > 0) {
                        db.WRData("UPDATE [OEM].[dbo].[CloudConfiguration] set SldUrl=" + "'" + URL + "'" + ",SldUserName =" + "'" + account + "'" + ", SldPassword=" + "'" + password + "'")
                        logger.setLevel('info');
                        logger.info("Login parameters were update successfully.");
                    }
                    else {
                        db.WRData("INSERT INTO [OEM].[dbo].[CloudConfiguration] (SldUrl,SldUserName,SldPassword) VALUES (" + "'" + URL + "'" + "," + "'" + account + "'" + "," + "'" + password + "'" + ")");
                        logger.setLevel('info');
                        logger.info("Login parameters were insert successfully.");
                    }
                })
                resolve(body);

            }
            else if (response == undefined || response == null) {

                resolve([null, error.message]);
            }
            else {
                error = response.body.error.message.value;
                console.log(error + ' ' + 'please check credentials!');
                logger.setLevel('error');
                logger.error(error + ' ' + 'please check credentials!');
                resolve([null, error]);
            }
        });
    });
}
var getSavedLogin =  function () {
    return new Promise(function (resolve, reject) {

        db.GetData("SELECT SldUrl,SldUserName,SldPassword from [OEM].[dbo].[CloudConfiguration]").then(function (credentials) {

            logger.setLevel('info');
            logger.info("Start SavedLogin Request...");
            // Set the headers
            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json"
            }

            // Configure the request
            var options = {
                url: credentials.SldUrl + "/LogonBySystemUser",
                method: "POST",
                headers: headers,
                json: {
                    "Account": credentials.SldUserName,
                    "Password": credentials.SldPassword
                }
            }

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
                    //update global url
                    SldURL = credentials.SldUrl
                    resolve(cookie);

                }
                else {
                    error = response.body.error.message.value;
                    console.log(error + ' ' + 'please check credentials!');
                    logger.setLevel('error');
                    logger.error(error + ' ' + 'please check credentials!');
                    resolve(error);
                }
            });
        });
    });
}
var getST =  function (cookie) {
    logger.setLevel('info');
    logger.info("Start SecurityToken Request...");

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

            if (!error && response.statusCode == 200) {
                var St = JSON.parse(response.body);
                console.log('SecurityToken is:' + ' ' + St.d.GenerateSecurityToken);
                logger.setLevel('info');
                logger.info('SecurityToken is:' + ' ' + St.d.GenerateSecurityToken + ' ' + '\r\n' + 'Cookie: ' + cookie);
                resolve(St.d.GenerateSecurityToken);
            }
            else {
                error = response.body.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive security token. Error:' + error);
                console.log('Failed to receive security token' + error);
                resolve(error);
                process.exit(-1);
            }
        });
    });
}
var getOperators = function (cookie, token) {
    logger.setLevel('info');
    logger.info("Start Operators Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/Users/GetAllOperatorDetails",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var OP = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Operators are:' + ' ' + body);
                logger.setLevel('info');
                logger.info('Operators are:' + ' ' + body);
                resolve(JSON.parse(body));
            }
            else {
                error = OP.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive Operators. Error:' + error);
                console.log('Failed to receive Operators.Error:' + error);
                resolve(error);
            }
        });
    });
}
var getDomain = function (cookie, token) {
    logger.setLevel('info');
    logger.info("Start Domain Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
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
                console.log('Domain name is:' + ' ' + body);
                logger.setLevel('info');
                logger.info('Domain name is:' + ' ' + body);
                resolve(JSON.parse(body));
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
var getServiceUnits = function (cookie, token) {
    logger.setLevel('info');
    logger.info("Start ServiceUnits Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/ServiceUnits",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var SU = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Service Units are:' + ' ' + body);
                logger.setLevel('info');
                logger.info('Service Units are:' + ' ' + body);
                resolve(JSON.parse(body));
            }
            else {
                error = SU.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive service units. Error:' + error);
                console.log('Failed to receive service units.Error:' + error);
                resolve(error);
                process.exit(-1);

            }
        });
    });
}
var getResellers = function (cookie, token) {
    logger.setLevel('info');
    logger.info("Start Resellers Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/Resellers",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var RE = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Resellers are:' + ' ' + body);
                logger.setLevel('info');
                logger.info('Resellers are:' + ' ' + body);
                resolve(JSON.parse(body));
            }
            else {
                error = RE.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive resellers. Error:' + error);
                console.log('Failed to receive resellers.Error:' + error);
                resolve(error);
            }
        });
    });
}
var getLicenses = function (cookie, token) {
    logger.setLevel('info');
    logger.info("Start getLicenses Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/LicenseFiles",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var LI = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('License Files are:' + ' ' + body);
                logger.setLevel('info');
                logger.info('License Files are:' + ' ' + body);
                resolve(JSON.parse(body));
            }
            else {
                error = LI.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive License Files. Error:' + error);
                console.log('Failed to receive License Files.Error:' + error);
                resolve(error);
            }
        });
    });
}
var getLicenseModules = function (licenseMoudle, cookie, token) {
    logger.setLevel('info');
    logger.info("Start getLicenseModules Request...");
    var counter = 0;
    var licenseMoudles = [];

    return new Promise(function (resolve, reject) {

        for (i = 0; i < licenseMoudle.length; i++) {
            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": token,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/LicenseFiles(" + licenseMoudle[i].ID + ")/GetLicenseModules",
                method: "GET",
                headers: headers
            }

            // Start the request
            request(option, function (error, response, body) {
                var LM = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    console.log('License Modules are:' + ' ' + body);
                    logger.setLevel('info');
                    logger.info('License Modules are:' + ' ' + body);
                    licenseMoudles.push([licenseMoudle[counter], JSON.parse(body)])
                    counter++;
                    if (counter === licenseMoudle.length) {
                        resolve(licenseMoudles);
                    }

                }
                else {
                    error = LM.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive License Modules. Error:' + error);
                    console.log('Failed to receive License Modules.Error:' + error);
                    resolve(error);
                }
            });
        }
    });
}
var getExtensionDeployID = function (cookie, token, commondb) {
    logger.setLevel('info');
    logger.info("Start ExtensionsDeployID request...");
    var ExtdeploymentsIDs = []
    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/CommonDatabases(" + commondb + ")/ExtensionDeployments",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var EDI = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                // for (i = 0; i < EDI.d.results.length; i++) {
                console.log('ExtensionDeployments is:' + ' ' + EDI.d.results[i].ID);
                logger.setLevel('info');
                logger.info('ExtensionDeployments is:' + ' ' + EDI.d.results[i].ID);
                //   ExtdeploymentsIDs.push(EDI.d.results[i].ID)
                resolve(JSON.parse(body));
            }
            // resolve(ExtdeploymentsIDs);
            // }
            else {
                error = EDI.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive ExtensionDeployments. Error:' + error);
                console.log('Failed to receive ExtensionDeployments.Error:' + error);
                resolve(error);
            }
        });
    });
}
var getExtensions = function (cookie, token, commondb, extensionsdeploy) {
    logger.setLevel('info');
    logger.info("Start ExtensionsDeployID request...");
    var counter = 0;
    var extensionsMoudle = [];

    return new Promise(function (resolve, reject) {

        for (i = 0; i < extensionsdeploy.length; i++) {

            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": token,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/CommonDatabases(" + commondb + ")/ExtensionDeployments(" + extensionsdeploy[i].ID + ")/Extension",
                method: "GET",
                headers: headers
            }

            // Start the request
            request(option, function (error, response, body) {
                var ET = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    console.log('Extensions:' + ' ' + body);
                    logger.setLevel('info');
                    logger.info('Extensions:' + ' ' + body);
                    extensionsMoudle.push([extensionsdeploy[counter].ID, JSON.parse(body)])
                    counter++;
                    if (counter === extensionsdeploy.length) {
                        resolve(extensionsMoudle);
                    }
                }
                else {
                    error = ET.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive Extensions. Error:' + error);
                    console.log('Failed to receive Extensions.Error:' + error);
                    /* counter++;
                     if (counter === extensionsdeployID.length) {
                         resolve(error);
                     }*/
                    resolve(error);
                }
            });
        }
    });
}
var getEmail = function (cookie, token) {
    logger.setLevel('info');
    logger.info("Start Email Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/MailServers?$expand=SmtpHost",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var EM = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Email:' + ' ' + body);
                logger.setLevel('info');
                logger.info('Email:' + ' ' + body);
                resolve(JSON.parse(body));
            }
            else {
                error = EM.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive email. Error:' + error);
                console.log('Failed to receive email.Error:' + error);
                resolve(error);
            }
        });
    });
}
var CheckUser =  function (cookie, token, username) {
    logger.setLevel('info');
    logger.info("Start Operators request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/CheckSystemUserExists?Account='" + username + "'",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var CU = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                if (CU.d.CheckSystemUserExists) {
                    console.log('username already exist:' + ' ' + username);
                    logger.setLevel('info');
                    logger.info('username already exist:' + ' ' + username);
                }
                else {
                    console.log('username free to use:' + ' ' + username);
                    logger.setLevel('info');
                    logger.info('username free to use:' + ' ' + username);

                }
                resolve(JSON.parse(body));
            }
            else {
                error = CU.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to check username:' + error);
                console.log('Failed to check username:' + error);
                resolve(JSON.parse(body));
            }
        });
    });
}
var getCompanyTemplateRepo = function (cookie, token, serviceunit) {
    logger.setLevel('info');
    logger.info("Start CompanyTemplateRepo request...");
    var CTP;
    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/ServiceUnits(" + serviceunit + ")/CompanyTemplateRepository",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (!error && response.statusCode == 204) {
                error = response.statusMessage;
                logger.setLevel('error');
                logger.error('Request Problem.', error);
                resolve(error);
            }

            else {
                CTP = JSON.parse(response.body);
            }

            if (!error && response.statusCode == 200) {
                console.log('Company Template Repo ID:' + ' ' + CTP.d.ID);
                logger.setLevel('info');
                logger.info('Company Template Repo ID:' + ' ' + CTP.d.ID);
                resolve(CTP.d.ID);
            }
            else if (response.statusCode != 204) {
                error = CTP.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive company template repo:' + error);
                console.log('Failed to receive company template repo:' + error);
                resolve(error);
                //process.exit(-1);

            }
        });
    });
}
var getImplementationRepo = function (cookie, token, serviceunit) {
    logger.setLevel('info');
    logger.info("Start ImplementationRepo request...");
    var CTP;
    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/ServiceUnits(" + serviceunit + ")/ImplementationRepository",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            if (!error && response.statusCode == 204) {
                error = response.statusMessage;
                logger.setLevel('error');
                logger.error('Request Problem.', error);
                resolve(error);
            }

            else {
                IR = JSON.parse(response.body);
            }

            if (!error && response.statusCode == 200) {
                console.log('Implementation Repo ID:' + ' ' + IR.d.ID);
                logger.setLevel('info');
                logger.info('Implementation Repo ID:' + ' ' + IR.d.ID);
                resolve(IR.d.ID);
            }
            else if (response.statusCode != 204) {
                error = IR.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive company template repo:' + error);
                console.log('Failed to receive company template repo:' + error);
                resolve(error);
                //process.exit(-1);

            }
        });
    });
}
var getPackagePath = function (cookie, token, ImplementationRepoID) {
    return new Promise(function (resolve, reject) {
        if (ImplementationRepoID != "No Content") {

            logger.setLevel('info');
            logger.info("Start PackagePath request...");
            var packarray = [];
            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": token,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/GetSolutionPackageList?ImplementationRepositoryID=" + ImplementationRepoID,
                method: "GET",
                headers: headers
            }
            // return new Promise(function (resolve, reject) {
            // Start the request
            request(option, function (error, response, body) {
                var PL = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    for (i = 0; i < PL.d.results.length; i++) {
                        console.log('Package path' + i + 1 + ':' + ' ' + PL.d.results[i]/*.path*/);
                        logger.setLevel('info');
                        logger.info('Package path' + i + 1 + ':' + ' ' + PL.d.results[i]);
                        packarray.push(PL.d.results[i])
                    }
                    resolve(packarray);
                }

                else {
                    error = PL.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive Package path:' + error);
                    console.log('Failed to receive Package path:' + error);
                    resolve(error);
                }
            });

        }
        else {
            resolve("Package:No Content");
        }
    });
}
var getCommonDB = function (cookie, token, serviceunit) {
    logger.setLevel('info');
    logger.info("Start CommonDB Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/ServiceUnits('" + serviceunit + "')/CommonDatabase",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            try {
                var CD = JSON.parse(response.body);
            } catch (e) {
                logger.setLevel('error');
                logger.error('Request Problem.', e.message);
                resolve(e.message);
                process.exit(-1);
            }
            if (!error && response.statusCode == 200) {
                console.log('Common Database #:' + ' ' + CD.d.ID);
                logger.setLevel('info');
                logger.info('Common Database #:' + ' ' + CD.d.ID);
                resolve(CD.d.ID);
            }

            else {
                error = CD.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive Common Database:' + error);
                console.log('Failed to receive Common Database:' + error);
                resolve(error);
                process.exit(-1);

            }
        });
    });
}
var getLocalizationsLists = function (cookie, token, commondb) {
    logger.setLevel('info');
    logger.info("Start LocalizationLists Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/CommonDatabases('" + commondb + "')/GetLocalizationList",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var LL = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Localization Lists are:' + ' ' + LL.d.results);
                logger.setLevel('info');
                logger.info('Localization Lists are:' + ' ' + LL.d.results);
                resolve(JSON.parse(body));
            }

            else {
                error = LL.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive Localization Lists:' + error);
                console.log('Failed to receive Localization Lists:' + error);
                resolve(error);
            }
        });
    });
}
var getSoftwareRepository = function (cookie, token, serviceunit) {
    logger.setLevel('info');
    logger.info("Start SoftwareRepositories Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/ServiceUnits('" + serviceunit + "')/SoftwareRepository",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var SR = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Software Repository is:' + ' ' + SR.d.ID);
                logger.setLevel('info');
                logger.info('Software Repository is:' + ' ' + SR.d.ID);
                resolve([SR.d.ID, SR]);
            }

            else {
                error = SR.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive software repository. Error:' + error);
                console.log('Failed to receive software repository. Error:' + error);
                resolve(error);
                //process.exit(-1);

            }
        });
    });
}
var getLanguages = function (cookie, token, softwarerepository) {
    logger.setLevel('info');
    logger.info("Start Languages Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/SoftwareRepositories('" + softwarerepository + "')/GetLanguageList",
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var LA = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('Languages:' + ' ' + LA.d.results);
                logger.setLevel('info');
                logger.info('Languages:' + ' ' + LA.d.results);
                resolve(JSON.parse(body));
            }

            else {
                error = LA.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive language list. Error:' + error);
                console.log('Failed to receive language list. Error:' + error);
                resolve(error);
            }
        });
    });
}
var getCOA = function (cookie, token, commondb, localsetting) {
    logger.setLevel('info');
    logger.info("Start COA Request...");

    var headers = {
        "Content-Type": "application/json",
        "Accept-Charset": "UTF-8",
        "Accept": "application/json",
        "securityToken": token,
        "Cookie": cookie
    }

    // Configure the request
    var option = {
        url: SldURL + "/CommonDatabases('" + commondb + "')/GetChartOfAccountList?Localization=" + '' + localsetting + '',
        method: "GET",
        headers: headers
    }
    return new Promise(function (resolve, reject) {
        // Start the request
        request(option, function (error, response, body) {
            var COA = JSON.parse(response.body);
            if (!error && response.statusCode == 200) {
                console.log('COA:' + ' ' + COA.d.results);
                logger.setLevel('info');
                logger.info('COA:' + ' ' + COA.d.results);
                resolve(JSON.parse(body));
            }

            else {
                error = COA.error.message.value;
                logger.setLevel('error');
                logger.error('Failed to receive COA. Error:' + error);
                console.log('Failed to receive COA. Error:' + error);
                resolve(error);
            }
        });
    });
}
var getBackupPath = function (cookie, token, CompanyTemplateID) {
    return new Promise(function (resolve, reject) {
        if (CompanyTemplateID != "No Content") {

            logger.setLevel('info');
            logger.info("Start BackupPath request...");
            var patharray = [];
            var headers = {
                "Content-Type": "application/json",
                "Accept-Charset": "UTF-8",
                "Accept": "application/json",
                "securityToken": token,
                "Cookie": cookie
            }

            // Configure the request
            var option = {
                url: SldURL + "/CompanyTemplateRepositories(" + CompanyTemplateID + ")/GetCompanyTemplates",
                method: "GET",
                headers: headers
            }
            // Start the request
            request(option, function (error, response, body) {
                var BP = JSON.parse(response.body);
                if (!error && response.statusCode == 200) {
                    for (i = 0; i < BP.d.results.length; i++) {
                        console.log('Backup path' + i + 1 + ':' + ' ' + BP.d.results[i]);
                        logger.setLevel('info');
                        logger.info('Backup path' + i + 1 + ':' + ' ' + BP.d.results[i]);
                        patharray.push(BP.d.results[i])
                    }
                    resolve(patharray);
                }

                else {
                    error = BP.error.message.value;
                    logger.setLevel('error');
                    logger.error('Failed to receive backup path:' + error);
                    console.log('Failed to receive backup path:' + error);
                    resolve(error);
                }
            });

        }
        else {
            resolve("Backup:No Content");
        }
    });
}
var AddCustomer = function (request) {
    return new Promise(function (resolve, reject) {
        logger.setLevel('info');
        logger.info("Start AddCustomer Request...");
        var id = null;
        var requestdate = new Date();
        var updatedate = new Date();
        db.AggregateData("SELECT Max(ID) FROM [OEM].[dbo].[Customers]").then(function (id) {
            if (id == null || id == undefined) {
                id = 100;
                db.SP_AddCustomer((id), request.IndPackageId, request.country, request.customerReferenceNumber, request.companyName, request.contactFirstName,
                    request.contactLastName, request.contactEmail, request.contactPhone, request.financialPeriods, request.startFiscalYear, requestdate, updatedate,
                    '', '', '', '', null, null, request.companyName, request.companyName, request.companyName, null, '', null, '', '').then(function () {
                        //   db.WRData("INSERT INTO [OEM].[dbo].[Customers] (id,IndPackageId,Country_Code,CRN,CompanyName,FirstName,LastName,Email,Phone,FinancialPeriod,PeriodStarts,RequestDate,UpdateDate,Status,ErrCode,ErrMessage,EmailStatus,TemplateId,Customer_Id,CustomerName,TenantName,DBName,HostingUnit_Id,HostingUnit_Name,LicenseFile_Id,LicensePolicy,CreationMethod) VALUES (" + (id) + "," + request.IndPackageId + "," + "'" + request.country + "'" + "," + "'" + request.customerReferenceNumber + "'" + "," + "'" + request.companyName + "'" + "," + "'" + request.contactFirstName + "'" + "," + "'" + request.contactLastName + "'" + "," + "'" + request.contactEmail + "'" + "," + "'" + request.contactPhone + "'" + "," + "'" + request.financialPeriods + "'" + "," + "'" + request.startFiscalYear + "'" + ",GETDATE(),GETDATE(),'','','','','',''," + "'" + request.companyName + "'" + "," + "'" + request.companyName + "'" + "," + "'" + request.companyName + "'" + ",'','','','','')").then(function () {
                        logger.setLevel('info');
                        logger.info("First Record!!! DB Updated with customer parameters.");
                        resolve(id);
                    });
            }

            else {
                id++
                db.SP_AddCustomer(id, request.IndPackageId, request.country, request.customerReferenceNumber, request.companyName, request.contactFirstName,
                    request.contactLastName, request.contactEmail, request.contactPhone, request.financialPeriods, request.startFiscalYear, requestdate, updatedate,
                    '', '', '', '', null, null, request.companyName, request.companyName, request.companyName, null, '', null, '', '').then(function () {
                        // db.WRData("INSERT INTO [OEM].[dbo].[Customers] (id,IndPackageId,Country_Code,CRN,CompanyName,FirstName,LastName,Email,Phone,FinancialPeriod,PeriodStarts,RequestDate,UpdateDate,Status,ErrCode,ErrMessage,EmailStatus,TemplateId,Customer_Id,CustomerName,TenantName,DBName,HostingUnit_Id,HostingUnit_Name,LicenseFile_Id,LicensePolicy,CreationMethod) VALUES (" + (id) + "," + "'" + request.IndPackageId + "'" + "," + "'" + request.country + "'" + "," + "'" + request.customerReferenceNumber + "'" + "," + "'" + request.companyName + "'" + "," + "'" + request.contactFirstName + "'" + "," + "'" + request.contactLastName + "'" + "," + "'" + request.contactEmail + "'" + "," + "'" + request.contactPhone + "'" + "," + "'" + request.financialPeriods + "'" + "," + "'" + request.startFiscalYear + "'" + ",GETDATE(),GETDATE(),'','','','','',''," + "'" + request.companyName + "'" + "," + "'" + request.companyName + "'" + "," + "'" + request.companyName + "'" + ",'','','','','')").then(function () {
                        logger.setLevel('info');
                        logger.info("DB Updated with customer parameters.");
                        resolve(id);
                    })
            };
        });
    });

}
var AddUsers = function ([request, id]) {

    logger.setLevel('info');
    logger.info("Start AddUsers Request...");
    var poweruser;
    return new Promise(function (resolve, reject) {
        for (i = 0; i < request.Users.length; i++) {
            poweruser = (request.Users[i].administrator) ? 1 : 0;
            db.SP_AddUser(0, (id) ,'User',request.Users[i].username ,request.Users[i].username ,0,poweruser ,'','','','')
           // db.WRData("INSERT INTO [OEM].[dbo].[CustomersUsers] (User_Id,CustomerID,UserType,UserCode,SystemUser,SuperUser,PowerUser,Validation,Status,ErrCode,ErrMessage) VALUES (''," + (id) + ",'User'," + "'" + request.Users[i].username + "'" + "," + "'" + request.Users[i].username + "'" + ",0," + poweruser + ",'','','','')")
            logger.setLevel('info');
            logger.info("DB Updated with customer's users parameters.User:" + request.Users[i].username);
        }
        resolve(id);
    });

}
var CheckKeys = function (request) {
    logger.setLevel('info');
    logger.info("Searching keys...");
    return new Promise(function (resolve, reject) {
        db.AggregateData("SELECT Count(*) FROM [OEM].[dbo].[Templates] WHERE Country_Code=" + "'" + request.country + "'" + "and IndPackageid=" + request.IndPackageId).then(function (keydata) {
            resolve(keydata);
        });
    });

}
var RemovePartnerData = function (request) {

    logger.setLevel('info');
    logger.info("Remove Partner Data...");
    var deletequery = '';
    var Tables = ['IndPackages', 'CloudConfiguration', 'OperatorsLicenses', 'Templates', 'TemplatesExtensions', 'TemplatesLicenses', 'TemplatesOperators'];
    return new Promise(function (resolve, reject) {

        for (i = 0; i < Tables.length; i++) {

            db.WRData("DELETE FROM [OEM].[dbo].[" + Tables[i] + "]").then(function () {

                if (i == Tables.length) {
                    logger.setLevel('info');
                    logger.info("All partner tables were deleted.");
                    resolve(request);
                }

            });

        };
    });

}
var FillPartnerTables = function (request) {

    logger.setLevel('info');
    logger.info("Fill Partner Tables...");
    var insertquery = '';

    insertquery += ("INSERT INTO [OEM].[dbo].[CloudConfiguration](SldUrl,SldUserName,SldPassword,Reseller_Id,EmailServerType,EmailUsername,EmailPassword) VALUES (" + "'" + request.CC[0].Url + "'" + "," + "'" + request.CC[0].Account + "'" + "," + "'" + request.CC[0].Password + "'" + "," + "'" + request.CC[0].Reseller_Id + "'" + "," + "'" + request.CC[0].EmailServerType + "'" + "," + "'" + request.CC[0].EmailUsername + "'" + "," + "'" + request.CC[0].EmailPassword + "'" + ")")

    for (i = 0; i < request.IndPackages.length; i++) {
        insertquery += ("INSERT INTO [OEM].[dbo].[IndPackages](Id,Name,Description) VALUES (" + request.IndPackages[i].Id + "," + "'" + request.IndPackages[i].Name + "'" + "," + "'" + request.IndPackages[i].Description + "'" + ")");
        if (i == request.IndPackages.length - 1) {
            for (j = 0; j < request.OL.length; j++) {
                insertquery += ("INSERT INTO [OEM].[dbo].[OperatorsLicenses] (TemplateId,User_Id,LicenseType) VALUES (" + request.OL[j].TemplateId + "," + request.OL[j].User_Id + "," + "'" + request.OL[j].LicenseType + "'" + ")");
                if (j == request.OL.length - 1) {
                    for (k = 0; k < request.TE.length; k++) {
                        insertquery += ("INSERT INTO [OEM].[dbo].[TemplatesExtensions] (TemplateId,Extension_Id,Name,Version,Vendor,Type) VALUES (" + request.TE[k].TemplateId + "," + request.TE[k].Extension_Id + "," + "'" + request.TE[k].Name + "'" + "," + "'" + request.TE[k].Version + "'" + "," + "'" + request.TE[k].Vendor + "'" + "," + "'" + request.TE[k].Type + "'" + ")");
                        if (k == request.TE.length - 1) {
                            for (l = 0; l < request.TL.length; l++) {
                                insertquery += ("INSERT INTO [OEM].[dbo].[TemplatesLicenses] (TemplateId,LicenseType) VALUES (" + request.TL[l].TemplateId + "," + "'" + request.TL[l].LicenseType + "'" + ")");
                                if (l == request.TL.length - 1) {
                                    for (m = 0; m < request.TO.length; m++) {
                                        insertquery += ("INSERT INTO [OEM].[dbo].[TemplatesOperators] (TemplateId,User_Id,UserCode,SystemUser,SuperUser,PowerUser,Status) VALUES (" + request.TO[m].TemplateId + "," + request.TO[m].User_Id + "," + "'" + request.TO[m].UserCode + "'" + "," + "'" + request.TO[m].SystemUser + "'" + "," + "'" + request.TO[m].SuperUser + "'" + "," + "'" + request.TO[m].PowerUser + "'" + "," + "'" + request.TO[m].Status + "'" + ")");
                                        if (m == request.TO.length - 1) {
                                            for (n = 0; n < request.TEM.length; n++) {
                                                insertquery += ("INSERT INTO [OEM].[dbo].[Templates] (Id,Name,Country_Code,IndPackageId,HostingUnit_Id,CreationMethod,BackupPackage,LocalSettings,ChartOfAccount,SystemLanguage,LicenseFile_Id,License_FileName,InstallationNumber,LicensePolicy,LicenseType) VALUES (" + request.TEM[n].Id + "," + "'" + request.TEM[n].Name + "'" + "," + "'" + request.TEM[n].Country_Code + "'" + "," + request.TEM[n].IndPackageId + "," + request.TEM[n].HostingUnit_Id + "," + "'" + request.TEM[n].CreationMethod + "'" + "," + "'" + request.TEM[n].BackupPackage + "'" + "," + "'" + request.TEM[n].LocalSettings + "'" + "," + "'" + request.TEM[n].ChartOfAccount + "'" + "," + "'" + request.TEM[n].SystemLanguage + "'" + "," + request.TEM[n].LicenseFile_Id + "," + "'" + request.TEM[n].License_FileName + "'" + "," + "'" + request.TEM[n].InstallationNumber + "'" + "," + "'" + request.TEM[n].LicensePolicy + "'" + "," + "'" + request.TEM[n].LicenseType + "'" + ")");
                                                if (n == request.TEM.length - 1) {
                                                    db.WriteData(insertquery);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
var PartnerData = function () {
    logger.setLevel('info');
    logger.info("Getting partner data...");
    return new Promise(function (resolve, reject) {
        db.WRData("SELECT CCF.SldUrl,CCF.SldUserName,CCF.SldPassword,CCF.Reseller_Id,CCF.EmailServerType,CCF.EmailUsername,CCF.EmailPassword FROM [OEM].[dbo].[CloudConfiguration] CCF").then(function (Cloud_Setting) {
            db.WRData("SELECT IPK.Id,IPK.Name,IPK.Description FROM [OEM].[dbo].[IndPackages] IPK").then(function (Packages) {
                db.WRData("SELECT TEM.id,TEM.Name,TEM.HostingUnit_Id,TEM.CreationMethod,TEM.Country_Code,TEM.BackupPackage,TEM.IndPackageId,TEM.LocalSettings,TEM.ChartOfAccount,TEM.SystemLanguage,TEM.LicenseFile_Id,TEM.InstallationNumber,TEM.LicensePolicy,TEM.LicenseType FROM [OEM].[dbo].[Templates]TEM").then(function (Templates) {
                    db.WRData("SELECT TEL.TemplateId,TEL.LicenseType FROM [OEM].[dbo].[TemplatesLicenses] TEL").then(function (Templates_Licenses) {
                        db.WRData("SELECT TEE.TemplateId,TEE.Extension_Id,TEE.Name,TEE.Version,TEE.Vendor,TEE.Type FROM [OEM].[dbo].[TemplatesExtensions] TEE").then(function (Templates_Extenstions) {
                            db.WRData("SELECT TEO.TemplateId,TEO.User_Id,TEO.UserCode,TEO.SystemUser,TEO.SuperUser,TEO.PowerUser,TEO.Status FROM [OEM].[dbo].[TemplatesOperators] TEO").then(function (Templates_Operators) {
                                db.WRData("SELECT OPL.TemplateId,OPL.User_Id,OPL.LicenseType FROM [OEM].[dbo].[OperatorsLicenses] OPL").then(function (Operators_licenses) {
                                    resolve({ Cloud_Setting, Packages, Templates, Templates_Licenses, Templates_Extenstions, Templates_Operators, Operators_licenses });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

}
var CustomerData = function (id) {
    logger.setLevel('info');
    logger.info("Getting customer data...");
    return new Promise(function (resolve, reject) {
        db.SP_CustomerData(id).then(function (customerres) {
        //db.WRData("SELECT CUS.id,CUS.Country_Code,CUS.CRN,CUS.CompanyName,CUS.EmailStatus,CUS.TenantName,CUS.HostingUnit_Name,CUSUSERS.User_Id,CUSUSERS.UserCode,CUSUSERS.SystemUser,CUSUSERS.SuperUser,CUSUSERS.PowerUser,CUSUSERS.Status,CUSUSERS.ErrCode,CUSUSERS.ErrMessage,CUSEXT.Extension_Id,CUSEXT.Extension_Name,CUSEXT.Extension_Version,CUSEXT.Extension_Vendor,CUSEXT.Extension_Type,CUSEXT.Extension_Status,CUSEXT.ErrCode,CUSEXT.ErrMessage FROM [OEM].[dbo].[Customers] CUS INNER JOIN [OEM].[dbo].[CustomersUsers] CUSUSERS ON CUS.id = CUSUSERS.CustomerID LEFT JOIN [OEM].[dbo].[CustomersExtensions] CUSEXT ON CUS.id = CUSEXT.Customer_ID WHERE CUS.id =" + id).then(function (customerres) {
            resolve({ customerres });

        });
    });

}
//client getFilterCombos
var HistoryData = function () {
    logger.setLevel('info');
    logger.info("Getting history data...");
    return new Promise(function (resolve, reject) {
        db.WRData("SELECT DISTINCT CUS.CompanyName FROM [OEM].[dbo].[Customers] CUS").then(function (companiesNames) {
            db.WRData("SELECT DISTINCT CUS.HostingUnit_Id,CUS.HostingUnit_Name FROM [OEM].[dbo].[Customers] CUS").then(function (serviceUnits) {
                resolve({ companiesNames, serviceUnits });

            });
        });
    });

}
var TenantsHistory = function (request) {
    logger.setLevel('info');
    logger.info("Getting  tenants history data...");
    return new Promise(function (resolve, reject) {
        db.SP_TenantsHistory(request.TenantStatus, request.CompanyName, request.ServiceUnit, request.DateFrom, request.DateTo).then(function (tenantsres) {
            resolve(tenantsres);

        });
    });

}





exports.Login = Login;
exports.getSavedLogin = getSavedLogin;
exports.getST = getST;
exports.getOperators = getOperators;
exports.getDomain = getDomain;
exports.getServiceUnits = getServiceUnits;
exports.getResellers = getResellers;
exports.getLicenses = getLicenses;
exports.getLicenseModules = getLicenseModules;
exports.getExtensionDeployID = getExtensionDeployID
exports.getExtensions = getExtensions;
exports.getEmail = getEmail;
exports.CheckUser = CheckUser;
exports.getCompanyTemplateRepo = getCompanyTemplateRepo;
exports.getCommonDB = getCommonDB;
exports.getLocalizationsLists = getLocalizationsLists;
exports.getSoftwareRepository = getSoftwareRepository;
exports.getLanguages = getLanguages;
exports.getCOA = getCOA;
exports.getBackupPath = getBackupPath;
exports.AddCustomer = AddCustomer;
exports.AddUsers = AddUsers;
exports.getImplementationRepo = getImplementationRepo;
exports.getPackagePath = getPackagePath;
exports.CheckKeys = CheckKeys;
exports.FillPartnerTables = FillPartnerTables;
exports.RemovePartnerData = RemovePartnerData;
exports.PartnerData = PartnerData;
exports.CustomerData = CustomerData;
exports.HistoryData = HistoryData;
exports.TenantsHistory = TenantsHistory;