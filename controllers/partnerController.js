let service = require('../servicedata');

//Check Login credancials.if vakidated,save it in DB. 

//TODO:password encrept
//dcrypt password
//send to login method
exports.login = async function (req, res) {
    var url = req.body.Url;
    var account = req.body.Account;
    var pass = req.body.Password;
    var result = await service.Login(url, account, pass);
    res.json(result);
}
exports.independent_parameters = async function (req, res) {
    var cookie = await service.getSavedLogin();
    var token = await service.getST(cookie);
    var domain = await service.getDomain(cookie, token);
    var serviceunits = await service.getServiceUnits(cookie, token);
    var resellers = await service.getResellers(cookie, token);
    var email = await service.getEmail(cookie, token);
    var operators = await service.getOperators(cookie, token);
    var licenseids = await service.getLicenses(cookie, token);
    var licensemoudle = await service.getLicenseModules(licenseids.d.results, cookie, token);
    res.json({ domain, serviceunits, resellers, email, operators, licensemoudle });
    res.end();
};
exports.dependent_parameters = async function (req, res) {
    var cookie = await service.getSavedLogin();
    var token = await service.getST(cookie);
    var templateRpoID = await service.getCompanyTemplateRepo(cookie, token, req.params.serviceunit);
    var backupPath = await service.getBackupPath(cookie, token, templateRpoID);
    var implementRpoID = await service.getImplementationRepo(cookie, token, req.params.serviceunit);
    var packagePath = await service.getPackagePath(cookie, token, implementRpoID);
    var commondb = await service.getCommonDB(cookie, token, req.params.serviceunit);
    var localizations = await service.getLocalizationsLists(cookie, token, commondb);
    var [softwarerepository, srbody] = await service.getSoftwareRepository(cookie, token, req.params.serviceunit)//.then(function ([softwarerepository, srbody]) {
    var languages = await service.getLanguages(cookie, token, softwarerepository);
    var extensionsDeployID = await service.getExtensionDeployID(cookie, token, commondb);
    var extensions = await service.getExtensions(cookie, token, commondb, extensionsDeployID.d.results);
    //package
    res.json({ backupPath, packagePath, localizations, srbody, languages, extensions });
    res.end();
};