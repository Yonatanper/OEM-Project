var express = require('express');
var app = express();
var bodyParser = require("body-parser");
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit:"10MB",type:'application/json'})); // Body parser use JSON data
var port = 30000;


//var indexRouter = require('./routes/index');
var customerRouter = require('./routes/customer');
var partnerRouter = require('./routes/partner');  
var activityRouter = require('./routes/activity');  
var generalRouter = require('./routes/general');  

app.listen(port, function () {

    console.log('Running Server on port:' + port);

});



//app.use('/index', indexRouter);
app.use('/customer', customerRouter);
app.use('/partner', partnerRouter); 
app.use('/activity', activityRouter);  
app.use('/', generalRouter);  