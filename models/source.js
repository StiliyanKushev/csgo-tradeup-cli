const mongoose = require('mongoose');

let sourceSchema = new mongoose.Schema({
    name:String,
    'Consumer': Boolean,
    'Industrial': Boolean,
    'Mil-Spec': Boolean,
    'Restricted': Boolean,
    'Classified': Boolean,
    'Covert': Boolean,
});

let Source = mongoose.model('Source', sourceSchema);

module.exports = Source;