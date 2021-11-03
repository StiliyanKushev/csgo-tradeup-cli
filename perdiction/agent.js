let args = process.argv.slice(2);
const fs = require('fs');
const readline = require('readline');
const Skin = require('../models/skin');
const { getRandomSkins, getNextSkinFloat, getSkinFloatLimits, getRandomSources } = require('../utils/skin');
const { differentiateBy, randomArb, normalize, randomArr } = require('../utils/general');
const { getArgsVal, cmdError } = require('../cmd');
const { numberToRarity, rarityToNumber, RARITIES } = require('../utils/rarity');
const { numToSkinFloat, avrgFloat } = require('../utils/skin');
const { generateTradespyLink } = require('../tradeupspy');
const Source = require('../models/source');
const { advancedGunScrape } = require('../scrape');

class Agent {
    constructor(rarity){
        this.id = Number(Math.random().toString().substr(2));
        this.rarity = rarity;
        this.inputs = []; // the inputs are the dna of the agent
        this.outcome = {
            outputs: [],
            inputsCost: 0,
            outputsCost: 0,
            avrgFloat: 0,
            profit: 0,
        }
        this.fitness = 0;
        
        return this;
    }

    async init(inputs=[]){
        if(inputs.length > 0){
            this.inputs = inputs;
            await this.override();
        }
        else {
            let maxVal = getArgsVal('--maxVal', 'number') || Number.MAX_SAFE_INTEGER;
            let minVal = getArgsVal('--minVal', 'number') || 0;
            let query = {
                rarity: this.rarity,
                isValidInput: true,
                $and: [
                    {
                        $or: [
                            { 'FN.stashVal': { $lte: maxVal, $gte: minVal } },
                            { 'MW.stashVal': { $lte: maxVal, $gte: minVal } },
                            { 'FT.stashVal': { $lte: maxVal, $gte: minVal } },
                            { 'WW.stashVal': { $lte: maxVal, $gte: minVal } },
                            { 'BS.stashVal': { $lte: maxVal, $gte: minVal } }
                        ]
                    },
                ]
            }

            query = await this.handleInputSources(query);
            this.inputs = await getRandomSkins(10, query);

            if(this.inputs.length == 0) cmdError('No skins can be found with the passed parameters! Aborting...');
            if(this.inputs.length < 10) await this.fillRandomly(query);
            this.inputs.map(e => e.float = this.getRandomFloat(e));
            this.inputs = await this.override(this.inputs);
        }

        return this;
    }

    hasLoss(){
        // loop each output and check if it's price is less than the inputs costs
        for(let o of this.outcome.outputs){
            if(o.price < this.outcome.inputsCost) return true;
        }
        return false;
    }

    getRandomFloat(input){
        let maxVal = getArgsVal('--maxVal', 'number') || Number.MAX_SAFE_INTEGER;
        let minVal = getArgsVal('--minVal', 'number') || 0;

        // get all available conditions
        let available = [];
        if(input.FN.stashVal >= minVal && input.FN.stashVal <= maxVal) available.push('FN');
        if(input.MW.stashVal >= minVal && input.MW.stashVal <= maxVal) available.push('MW');
        if(input.FT.stashVal >= minVal && input.FT.stashVal <= maxVal) available.push('FT');
        if(input.WW.stashVal >= minVal && input.WW.stashVal <= maxVal) available.push('WW');
        if(input.BS.stashVal >= minVal && input.BS.stashVal <= maxVal) available.push('BS');

        // pick one at random
        let condition = randomArr(available, 1);

        // get float limits if the selected condition
        let limits = getSkinFloatLimits(condition);

        // return random value between the limits
        return randomArb(limits[0], limits[1]);
    }

    async getCommonRarities(query, rarity, returnString=false){
        // leave all other query params
        delete query[`${rarity}`];
        
        // get all sources
        let sources = await Source.find(query);

        // find all rarities that are included in every source
        let all = {
            'Consumer': [],
            'Industrial': [],
            'Mil-Spec': [],
            'Restricted': [],
            'Classified': [],
            'Covert': [],
        }

        // count each
        for(let source of sources){
            if(source.Consumer) all.Consumer.push(source.name);
            if(source.Industrial) all.Industrial.push(source.name);
            if(source['Mil-Spec']) all['Mil-Spec'].push(source.name);
            if(source.Restricted) all.Restricted.push(source.name);
            if(source.Classified) all.Classified.push(source.name);
            if(source.Covert) all.Covert.push(source.name);
        }
        
        // filter all and leave only the full rarities
        for(let r in all){
            if(all[r].length != sources.length) delete all[r];
        }

        // convert to array of strings/names
        let rarities = [];
        for(let key in all) rarities.push(key);

        // stringify the rarities
        if(returnString) rarities = rarities.reduce((p,c) => p+'\n'+c);

        // [sourceNames, rarityNames]
        return [all[rarity], rarities];
    }

    async override(input=undefined, asd){
        if(!args.includes('--override')) return input;
        let path = getArgsVal('--override', 'path');

        const check = async (data) => {
            const fileStream = fs.createReadStream(path);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let toCheck = data.length != undefined ? [...data] : [data];
            for await (const line of rl) {
                let [name, condition, price] = line.split('#');
                for(let i = toCheck.length - 1; i >= 0; i--){
                    if(toCheck[i].name == name){
                        data[i][condition].stashVal = Number(price);
                    }
                }
            }
            return data;
        }

        return await check(input);
    }

    async handleInputSources(query){
        if(!query.$and) query.$and = [];

        const printCommonRaritiesError = (common) => {
            cmdError(`The rarity '${query.rarity}' could not be found in the provided sources.\n` +  
                     `Consider using '--rarity' and picking one or more of these rarities.\n` + 
                     common);
        }

        if(args.includes('--sources')){
            // number of allowed sources per tradeup/agent
            let numSources = getArgsVal('--sources', 'number');

            // build sources query
            let sourcesQuery = { };
            sourcesQuery[`${query.rarity}`] = true;

            // add excluded/included sources
            if(args.includes('--exclude')){
                sourcesQuery.$and = [];
                let sourceNames = await this.getFileSources(true, false, true);
                sourceNames.map(s => sourcesQuery.$and.push({ name: { $ne: s } }));
            }
            else if(args.includes('--include')){
                sourcesQuery.$or = [];
                let sourceNames = await this.getFileSources(false, false, true);
                sourceNames.map(s => sourcesQuery.$or.push({ name: s }));
            }
            
            // get 'n' random source names
            let randomSources = await getRandomSources(numSources, sourcesQuery);

            // no sources available for the selected rarity
            if(randomSources.length == 0)
            printCommonRaritiesError((await this.getCommonRarities(sourcesQuery, query.rarity, true))[1])

            // generate query rules for each
            let rules = [];
            for(let i = 0; i < numSources; i++)
            rules.push({ source: randomSources[i].name });

            // apply new sources to the query
            query.$and.push({
                $or: rules
            });
        }
        else if(args.includes('--exclude')){
            let sourceNames = await this.getFileSources(true, false, true);

            // update the query
            sourceNames.map(s => query.$and.push({ source: { $ne: s } }));
        }
        else if(args.includes('--include')){
            let [sourceNames, commonRarities] = 
            await this.getCommonRarities(await this.getFileSources(false, true), this.rarity, true);

            // throw error if none where found
            if(!sourceNames) printCommonRaritiesError(commonRarities)

            // translate source names into $or rules
            let rules = [];
            sourceNames.map(s => rules.push({ source: s }));
            
            // update the query
            query.$and.push({
                $or: rules
            });
        }

        if(args.includes('--onlyCases')){
            query.$and.push({
                source: { $regex: 'Case' }
            });
        }
        else if(args.includes('--onlyCollections')){
            query.$and.push({
                source: { $regex: 'Collection' }
            });
        }

        if(query.$and.length == 0) delete query.$and;
        return query;
    }

    async getFileSources(exclude=false, returnQuery=false, returnStringArr=false){
        // read the path
        let path = exclude ? getArgsVal('--exclude', 'path') : getArgsVal('--include', 'path');
        const fileStream = fs.createReadStream(path);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        // get all unique source names
        let sourceNames = [];
        for await (const source of rl) {
            if(!sourceNames.includes(source))
            sourceNames.push(source);                    
        }

        if(returnStringArr) return sourceNames;

        // translate them into a query
        sourceNames = sourceNames.map(s => s = exclude ? { name: { $ne: s } } : { name: s })

        // construct a query
        let q = {}
        if(exclude) q.$and = sourceNames;
        else q.$or = sourceNames;

        // return only the query
        if(returnQuery) return q;

        // get the source docs and return them
        let sources = await Source.find(q);

        return sources;
    }

    async fillRandomly(query){
        let missingNum = 10 - this.inputs.length;
        while(missingNum != 0){
            let newInput = (await getRandomSkins(1, query))[0];
            this.inputs.push(newInput);
            missingNum--;
        }
    }

    async log(filename=undefined){
        let trimmedInputs = [];
        let trimmedOutputs = [];

        this.inputs.map(e => {
            trimmedInputs.push({
                name: e.name,
                source: e.source,
                float: e.float,
                condition: numToSkinFloat(e.float),
                price: e[numToSkinFloat(e.float)].stashVal,
                link: e[numToSkinFloat(e.float)].steamLink
            });
        })

        this.outcome.outputs.map(e => {
            trimmedOutputs.push({
                name: e.name,
                source: e.source,
                float: e.float,
                condition: numToSkinFloat(e.float),
                price: e[numToSkinFloat(e.float)].stashVal,
                link: e[numToSkinFloat(e.float)].steamLink
            });
        })

        let result = {
            inputs: trimmedInputs,
            outputs: trimmedOutputs,
            avrgFloat:this.outcome.avrgFloat,
            inputsCost: this.outcome.inputsCost + '$',
            outputsCost: this.outcome.outputsCost + '$',
            profit: this.outcome.profit,
            rarity: this.rarity,
        };

        if(args.includes('--spy')) console.log("[#] Tradeupspy.com Link generating...".green);
        let tradespyLink = args.includes('--spy')
                         ? await generateTradespyLink(this.inputs, this.outcome.outputs)
                         : undefined;
        if(tradespyLink) {
            result.tradespyLink = tradespyLink;
            console.log(tradespyLink.bgWhite.black);
            console.log("[#] Success!".bgCyan.black);
        }

        if(args.includes('--noSave')) return;

        let evalJson = getArgsVal('--eval', 'string');
        if((evalJson || filename)) {
            let nameFile = evalJson.split('/').pop();
            fs.writeFileSync(filename ? `./evals/${filename}` : `./evals/${nameFile}`, 
                                                  JSON.stringify(result, null, '\t'));
            console.log(`${nameFile} has been saved in /evals/`.bgCyan.black);
        }
        else {
            let nameFile = `inputs_${this.id}.json`;
            fs.writeFileSync(`./results/${nameFile}`, JSON.stringify(result, null, '\t'));
            console.log(`${nameFile} has been saved in /results/`.bgCyan.black);
        }
    }

    async calcFitness(){
        await this.calcTradeup();
        this.fitness = this.outcome.profit;

        if(args.includes('--avf'))
        this.fitness *= this.outcome.avrgFloat * 0.1;

        if(isNaN(this.fitness)) this.fitness = 0;
        return this.fitness;
    }

    async mutate(){
        // when looking for new skins find one with price margin of 1 euro
        let priceMargin = getArgsVal('--priceMargin', 'number') || 5;
        let skinFlipChance = getArgsVal('--skinMutate', 'number') || 5;
        let floatChangeChance = getArgsVal('--floatMutate', 'number') || 1;

        for(let input of this.inputs){
            let oldInput = { ...input };

            if(randomArb(0,100) < skinFlipChance){
                let query = { rarity: this.rarity, isValidInput: true };
                query[`${numToSkinFloat(oldInput.float)}.stashVal`] = {
                    $lte: oldInput[numToSkinFloat(oldInput.float)].stashVal + priceMargin,
                    $gte: oldInput[numToSkinFloat(oldInput.float)].stashVal - priceMargin,
                };
                input = await getRandomSkins(1, await this.handleInputSources(query));
                input.float = normalize(oldInput.float, oldInput.MIN_WEAR,
                                                        oldInput.MAX_WEAR,
                                                        input.MIN_WEAR,
                                                        input.MAX_WEAR);
            }
            if(randomArb(0,100) < floatChangeChance){
                input.float += randomArb(-0.01,0.01);
                if(input.float < input.MIN_WEAR) input.float = input.MIN_WEAR + randomArb(0.01,0.05);
                if(input.float > input.MAX_WEAR) input.float = input.MAX_WEAR - randomArb(0.01,0.05);
            }

            input = await this.override(input);
        }

        return this;
    }

    async updatePrices(skins){
        if(!args.includes('--smart')) return skins;

        for(let i = 0; i < skins.length; i++) {
            let url = `https://csgostash.com/skin/${skins[i].CSGO_STASH_ID}/${skins[i].CSGO_STASH_NAME}`;
            let scrape = await advancedGunScrape(url);

            // stattrack
            skins[i].STAT_TRAK.FN = { ...scrape.STAT_TRAK.FN };
            skins[i].STAT_TRAK.MW = { ...scrape.STAT_TRAK.MW };
            skins[i].STAT_TRAK.FT = { ...scrape.STAT_TRAK.FT };
            skins[i].STAT_TRAK.WW = { ...scrape.STAT_TRAK.WW };
            skins[i].STAT_TRAK.BS = { ...scrape.STAT_TRAK.BS };

            // normal
            skins[i].FN = { ...scrape.FN };
            skins[i].MW = { ...scrape.MW };
            skins[i].FT = { ...scrape.FT };
            skins[i].WW = { ...scrape.WW };
            skins[i].BS = { ...scrape.BS };

            await Skin.findOneAndUpdate({ id: skins[i]._id }, { 
                STAT_TRAK:{
                    FN: { ...skins[i].STAT_TRAK.FN },
                    MW: { ...skins[i].STAT_TRAK.MW },
                    FT: { ...skins[i].STAT_TRAK.FT },
                    WW: { ...skins[i].STAT_TRAK.WW },
                    BS: { ...skins[i].STAT_TRAK.BS },
                },
                FN: { ...skins[i].FN },
                MW: { ...skins[i].MW },
                FT: { ...skins[i].FT },
                WW: { ...skins[i].WW },
                BS: { ...skins[i].BS },
            }, { new: true });
        }

        return skins;
    }

    async calcTradeup(){
        // update prices if using '--smart'
        this.inputs = await this.updatePrices(this.inputs);

        // calculate outputs
        let outputs = [];
        for(let input of this.inputs){
            let rarity = input.rarity;
            let source = input.source;
            let outs = await Skin.find({ source, rarity: numberToRarity(rarityToNumber(rarity) + 1) }).lean();
            outputs.push(...outs);
        }
        // remove dublicates
        outputs = outputs.filter((v,i,a)=>a.findIndex(t=>(JSON.stringify(t._id) === JSON.stringify(v._id)))===i)

        // update prices if using '--smart'
        outputs = await this.updatePrices(outputs);

        // override values from a file
        outputs = await this.override(outputs, true);

        // sort all skins by case/collection and count them
        let sourceSorted = differentiateBy('source', this.inputs, outputs);
        
        // calculate the skins denominator
        let denominator = 0;
        for(let source in sourceSorted){
            // (number of inputs in source * number of outputs in source)
            denominator += sourceSorted[source].num0 * sourceSorted[source].num1;
        }
    
        // calculate the probabilities
        for(let output of outputs){
            // multiply each output by the number of inputs from the same source
            let numerator = sourceSorted[output.source].num0;
            output.chance = +((numerator / denominator) * 100).toFixed(2);
        }
    
        // calculate the floats
        let avrg = avrgFloat(this.inputs);
        for(let output of outputs){
            output.float = (output.MAX_WEAR - output.MIN_WEAR) * avrg + output.MIN_WEAR;
        }
    
        // calculate profit
        let inputsCost = 0;
        for(let input of this.inputs){
            let currentInputCost = input[numToSkinFloat(input.float)];
            if(currentInputCost.stashVal == -1){ // No Recent Price for current float
                let left = input[getNextSkinFloat(input.float,-1)] || {};
                let right = input[getNextSkinFloat(input.float,1)] || {};
                currentInputCost = left.stashVal > right.stashVal ? left : right;
            }
            input.price = currentInputCost.stashVal;
            inputsCost += currentInputCost.stashVal;
        }
    
        let expectedValue = 0;
        for(let output of outputs){
            output.price = Math.max(output[numToSkinFloat(output.float)].stashVal,0);
            expectedValue += output.price * output.chance / 100;
        }

        if(!args.includes('--noFee')){
            // add steam fee 15%
            expectedValue /= 1.15;
        }
    
        let profit = Number(((expectedValue / inputsCost) * 100).toFixed(2));

        this.outcome = {
            outputs,
            inputsCost: inputsCost.toFixed(2),
            outputsCost: expectedValue.toFixed(2),
            avrgFloat: avrg,
            profit,
        }
    }
}

module.exports = Agent;