var express = require('express');
var app = express();
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Body parser use JSON data
var port = 30000;


//var indexRouter = require('./routes/index');
var customerRouter = require('./routes/customer');
var partnerRouter = require('./routes/partner');  

app.listen(port, function () {

    console.log('Running Server on port:' + port);

});
app.get('/', function (req, res) {
    console.log(res);
    res.send('Welcome to OEM web service');

});


//app.use('/index', indexRouter);
app.use('/customer', customerRouter);
app.use('/partner', partnerRouter);  