var logger = require('../logger').createLogger('development.log'); // logs to a file


function InputValidation(input) {
    var regex = new RegExp("^[0-9a-zA-Z \-'_]+$");
    if (regex.test(input)) {
        logger.setLevel('info');
        logger.info("name is valid: " + input);
        return true;
    } else {
        logger.setLevel('info');
        logger.info("Input is invalid" + input);
        return false;
    }
}


exports.InputValidation = InputValidation;