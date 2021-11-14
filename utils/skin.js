import Skin from '../models/skin.js';
import Source from '../models/source.js';

const getRandomSkins = (numberOfSkins,searchQuery = {}) => {
    return new Promise((resolve, reject) => {
        Skin.aggregate([
            {$match: searchQuery},
            {$sample: {size: numberOfSkins}}
        ], function(err, docs) {
            if(err) reject(err);
            else resolve(docs);
        });
    });
}

const getRandomSources = (numberOfSources, searchQuery) => {
    return new Promise((resolve, reject) => {
        Source.aggregate([
            {$match: searchQuery},
            {$sample: {size: numberOfSources}}
        ], function(err, docs) {
            if(err) reject(err);
            else resolve(docs);
        });
    });
}

// direction can be 1 or -1
const getNextSkinFloat = (float, direction=1) => {
    let [min, max] = getSkinFloatLimits(numToSkinFloat(float));

    if(direction == 1){ // right
        return numToSkinFloat(max + 0.1)
    }
    else if (direction == -1){ // left
        return numToSkinFloat(min - 0.1)
    }
}

const numToSkinFloat = (float) => {
    if(float < 0) float = 0;
    if(float > 1) float = 1;
    
    if(float >= 0.00 && float <= 0.07)   return "FN";
    if(float >  0.07 && float <= 0.15)   return "MW";
    if(float >  0.15 && float <= 0.38)   return "FT";
    if(float >  0.38 && float <= 0.45)   return "WW";
    if(float >  0.45 && float <= 1.00)   return "BS";
}

const getSkinFloatLimits = (float) => {
    if(float == "FN") return [0.00,0.07];
    if(float == "MW") return [0.07,0.15];
    if(float == "FT") return [0.15,0.38];
    if(float == "WW") return [0.38,0.45];
    if(float == "BS") return [0.45,1.00];
}

const avrgFloat = (skins) => {
    let sum = 0;
    for(let skin of skins) sum += skin.float;
    return (sum / skins.length).toFixed(9);
}

export {
    avrgFloat,
    getNextSkinFloat,
    getRandomSkins,
    getRandomSources,
    getSkinFloatLimits,
    numToSkinFloat,
};