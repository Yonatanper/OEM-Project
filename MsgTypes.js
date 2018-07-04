var LoginFailure=
{
 "subject":"Login failure notification",
 "body": "This is an automatic mail from SAP Business One Cloud Provisioning process to notify about failure in login to SLD <br> upon receiving new customer/tenant creation request in your cloud environment.<br>Check the SLD comigration in the wizard UI and make sure it can be reached from the server."
}

var DBFailure=
{
 "subject":"DB failure notification",
 "body": "This is an automatic mail from SAP Business One Cloud Provisioning <br> process to notify about failure in DB connection upon receiving new customer/tenant creation request <br> in your cloud environment. Check your DB and its credentials and make sure the server can connect to it."
}
function Addbars(content,tenantName,customercotent,date,financialPeriods,users,extensions)
{
 var Global =  {
 "subject":"Tenant creation notification",
 "body": "This is an automatic mail from SAP Business One Cloud Provisioning process to notify about new customer/tenant creation in your cloud environment.<br>"+
 "<ul>"+
 "<li><b>Tenant Creation:</b><br>" +
 "<ul>"+
 //"<li>company creation method – normal, package or backup</li>" + //take from DB
 "<li>company creation method:"+content.CreationMethod + " </li>" +
 "<li>company creation details: country:"+customercotent.country+" "+ //take from DB
 "<li>Error message and error code (if any)</li>"+
 "</ul>"+
 "</li>"+
 "<li><b>Customer Parameters:</b><br>"+
 "<ul>"+
 "<li>Company name:"+tenantName+" </li>"+
 "<li>CRN:"+customercotent.customerReferenceNumber+"</li>"+
 "<li>Country:"+customercotent.country+" </li>"+
 "<li>Contact Person details: name:"+customercotent.contactFirstName+" "+customercotent.contactLastName+",phone:"+customercotent.contactPhone+" , email:"+customercotent.contactEmail+" </li>"+
 "<li>Financial Period:"+financialPeriods+"</li>"+
 "<li>Start of financial Period:"+date+"</li>"+
 "</ul>"+
 "</li>"+
 "<li><b>Cloud Parameters:</b><br>"+
 "<ul>"+
 "<li>Service Unit-" + content.HostingUnit_Id + "</li>"+
 "<li>License Policy-" + content.LicensePolicy + "</li>"+ 
 "<li>License file-" + content.LicenseFile_Id + "</li>"+
 "<li>License Type-" + content.LicenseType + "</li>" +
 "<li>Authentication type-Windows</li>"+
 "</ul>"+
 "</li>"+
 "<li><b>Users:</b><br>"+
 "<ul>"+
 users+
 "</ul>"+
 "</li>"+

 "<li><b>Extensions:</b><br>"+
 "<ul>"+

 extensions+
 "</ul>"+
 "</li>"+
 "</ul>"

 }
 return Global;
}
exports.LoginFailure = LoginFailure;
exports.DBFailure = DBFailure;
exports.Addbars = Addbars;