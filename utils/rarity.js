const { randomArr } = require("./general");
const { getArgs } = require('./args');

const RARITIES = {
    Consumer: "Consumer",
    Industrial: "Industrial",
    MilSpec: "Mil-Spec",
    Restricted: "Restricted",
    Classified: "Classified",
    Covert: "Covert",
    ALL_INPUTS_STAT_TRAK: [ "Mil-Spec", "Restricted", "Classified" ],
    ALL_INPUTS: [ "Consumer", "Industrial", "Mil-Spec", "Restricted", "Classified" ],
    ALL: [ "Consumer", "Industrial", "Mil-Spec", "Restricted", "Classified", "Covert" ]
}

function rarityToNumber(rarity){
    rarity = rarity.toLowerCase().trim();
    if(rarity.includes("consumer")) return 1;
    if(rarity.includes("industrial")) return 2;
    if(rarity.includes("mil-spec")) return 3;
    if(rarity.includes("restricted")) return 4;
    if(rarity.includes("classified")) return 5;
    if(rarity.includes("covert")) return 6;
    return -1;
}

function numberToRarity(number){
    if(number == 1) return RARITIES.Consumer;
    if(number == 2) return RARITIES.Industrial;
    if(number == 3) return RARITIES.MilSpec;
    if(number == 4) return RARITIES.Restricted;
    if(number == 5) return RARITIES.Classified;
    if(number == 6) return RARITIES.Covert;
    return "";
}

function getHighestRarity(array) {
    let highest = -1;
    let rarity;

    for(let el of array) {
        let elText = el.textContent || el;
        let elRarity = rarityToNumber(elText)
        if(elRarity > highest){
            highest = elRarity;
            rarity = elText;
        }
    }

    return rarity;
}

// function to get a random valid rarity based on arguments
function getValidRarity(rarities, stattrak=false){
    // discard stattrak unusable rarities, discard case unusable rarities
    if(stattrak || getArgs().includes('--onlyCases'))
        for(let i = rarities.length; i >= 0; i--)
            if(!RARITIES.ALL_INPUTS_STAT_TRAK.includes(rarities[i])) rarities.splice(i, 1);
            
    // at the end return what's left
    return numberToRarity(rarityToNumber(randomArr(rarities, 1)));
}

module.exports = {
    RARITIES,
    rarityToNumber,
    numberToRarity,
    getHighestRarity,
    getValidRarity,
}