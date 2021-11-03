const mongoose = require('mongoose');

let skinSchema = new mongoose.Schema({
    name:String,
    rarity:String,
    imgSrc:String,
    isValidInput:Boolean,
    source:String, // either case or collection
    STAT_TRAK:{
        FN: { stashVal:Number, steamLink:String },
        MW: { stashVal:Number, steamLink:String },
        FT: { stashVal:Number, steamLink:String },
        WW: { stashVal:Number, steamLink:String },
        BS: { stashVal:Number, steamLink:String },
    },
    FN: { stashVal:Number, steamLink:String },
    MW: { stashVal:Number, steamLink:String },
    FT: { stashVal:Number, steamLink:String },
    WW: { stashVal:Number, steamLink:String },
    BS: { stashVal:Number, steamLink:String },
    MIN_WEAR:Number,
    MAX_WEAR:Number,
    CSGO_STASH_ID:Number,
    CSGO_STASH_NAME:String,
});

let Skin = mongoose.model('Skin', skinSchema);

module.exports = Skin;