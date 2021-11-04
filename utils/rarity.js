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

module.exports = {
    RARITIES,
    rarityToNumber,
    numberToRarity,
    getHighestRarity,
}