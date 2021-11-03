const mongoose = require('mongoose');

let spySchema = new mongoose.Schema({
    name:String,
    CSGO_SPY_ID:Number
});

let Spy = mongoose.model('Spy', spySchema);

module.exports = Spy;