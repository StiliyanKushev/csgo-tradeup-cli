const fs = require('fs');
const cloneDeep = require('lodash.clonedeep');
const { cmdExit, cmdLog, cmdWarn } = require('../cmd');
const Skin = require('../models/skin');
const { randomArr, randomArb } = require('../utils/general');
const { getArgsVal } = require('../cmd');
const { numberToRarity, rarityToNumber, RARITIES } = require('../utils/rarity');
const Agent = require('./agent');
const Population = require('./population');
let args = process.argv.slice(2);

async function main(){
    await handleEval();
    await handleGeneticAlgoritm();
}

async function handleGeneticAlgoritm(){
    let targetProfit = (getArgsVal('--profit', 'number') || (args.includes('--noLoss') ? 100:110));

    // function to get a random valid rarity based on arguments
    const getValidRarity = (rarities, stattrak=false) => {
        // discard stattrak unusable rarities, discard case unusable rarities
        if(stattrak || args.includes('--onlyCases'))
            for(let i = rarities.length; i >= 0; i--)
                if(!RARITIES.ALL_INPUTS_STAT_TRAK.includes(rarities[i])) rarities.splice(i, 1);
                
        // at the end return what's left
        return numberToRarity(rarityToNumber(randomArr(rarities, 1)));
    }

    // get the rarities we're working with
    let parsedRars = getArgsVal('--rarity', 'string');
    let rarities = parsedRars ? parsedRars.split(',') : RARITIES.ALL_INPUTS;

    // prepare agents
    cmdLog('populs generation begins.');
    let populs = new Array((getArgsVal('--populs', 'number') || 20)).fill({});
    const promises = populs.map(_ => {
        let stattrak = isStattrak()
        return new Population(
            getArgsVal('--popSize', 'number') || 20,
            getValidRarity(rarities, stattrak),
            stattrak,
            targetProfit
        ).init()
    })
    populs = await Promise.all(promises);
    cmdLog('populs generation ends.', true);

    // run agents
    let initial = results = getArgsVal('--results', 'number') || 1;
    let bestPopulIndex = 0; 

    // function to reset the finished population
    const reset = async () => {
        let stattrak = isStattrak();
        populs[bestPopulIndex] =
        await new Population(
            getArgsVal('--popSize', 'number') || 20,
            getValidRarity(rarities, stattrak),
            stattrak,
            targetProfit
        ).init();
    }

    // main loop
    while(true){
        let bestAgent = { outcome: { profit: Number.MIN_VALUE } };

        if(!args.includes('--visualize'))
        cmdLog('genetic selection begins.');

        await Promise.all(populs.map(async (pop, i, _) => {
            await pop.cycle();
            pop.bestAgent.outcome.profit > populs[bestPopulIndex].bestAgent.outcome.profit ?
            bestPopulIndex = i : null
        }));

        bestAgent = cloneDeep(populs[bestPopulIndex].bestAgent);

        // print the matrix
        if(args.includes('--visualize'))
        Population.visualize(populs);

        // print current best result
        console.log(`max profit = ${bestAgent.outcome.profit}`);
        cmdLog('genetic selection ends.', true);

        // end condition
        if (bestAgent.outcome.profit > targetProfit){
            if(args.includes('--noLoss') && bestAgent.hasLoss()) { await reset(); continue; }

            // log the best agent before removal
            await bestAgent.log();

            // when results run out exit
            if(!--results){
                finish();
            }
            else {
                console.log(`[#] ${initial - results}/${initial} generated.`.gray);
                await reset();
            }
        }
    }
}

async function handleEval(){
    // run only one agent with the given inputs
    let evalPath = getArgsVal('--eval', 'path');
    if(evalPath){
        const evalFile = async (path, filename) => {
            if(filename && !filename.includes('inputs')){
                cmdWarn(`Skipping ${filename}`);
                return;
            }
            // get all inputs from the eval path and convert them to the database docs
            let parsed = JSON.parse(fs.readFileSync(filename ? path + filename : path));
            let inputs = [];
            await Promise.all(parsed.inputs.map(async e => {
                inputs.push(await Skin.findOne({ name:e.name }).lean());
            }));

            // set the specific floats and prices from the eval path
            parsed.inputs.map((_, i, __) => {
                inputs[i].float = parsed.inputs[i].float;
                inputs[i].price = parsed.inputs[i].price;
            })
            
            // run the agent
            let agent = await new Agent(parsed.rarity, parsed.stattrak).init(inputs);
            await agent.calcTradeup();
            await agent.log(filename);
        }

        if(fs.lstatSync(evalPath).isDirectory()){
            for(let file of fs.readdirSync(evalPath)){
                await evalFile(evalPath, file);
            }
        }
        else if(fs.lstatSync(evalPath).isFile()) {
            await evalFile(evalPath);
        }

        finish();
    }
}

function isStattrak(){
    if(args.includes('--onlyStattrak')) return true;
    if(args.includes('--allowStattrak')){
        let randNum = randomArb(0, 1);
        if(randNum > ((getArgsVal('--stattrakChance', 'number') / 100) || 0.05)) return true;
    }
    return false;
}

function finish(){
    console.log(` Everything finished successfully! `.bgCyan.black);
    cmdExit();
}

module.exports = main;