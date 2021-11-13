const fs = require('fs');
const cloneDeep = require('lodash.clonedeep');
const { cmdExit, cmdLog, cmdWarn, cmdClear } = require('../cmd');
const Skin = require('../models/skin');
const { randomArb } = require('../utils/general');
const { getArgsVal } = require('../cmd');
const { RARITIES, getValidRarity } = require('../utils/rarity');
const Agent = require('./agent');
const Population = require('./population');
const { StaticPool } = require('node-worker-threads-pool');
const path = require('path');
const { getArgs } = require('../utils/args');

async function main(){
    await handleEval();
    await handleGeneticAlgoritm();
}

async function handleGeneticAlgoritm(){
    let targetProfit = (getArgsVal('--profit', 'number') || (getArgs().includes('--noLoss') ? 100:110));

    // function to reset a population
    const reset = async (index=undefined) => {
        // use bestPopulIndex otherwise
        index = index == undefined ? bestPopulIndex : index;
        let stattrak = isStattrak();

        // not initialized yet
        if(populs[index] == null){
            return new Population(
                getArgsVal('--popSize', 'number') || 20,
                getValidRarity(rarities, stattrak),
                stattrak,
                targetProfit
            ).init()
        }
        else await populs[index].reset(rarities, stattrak, targetProfit);
    }

    // get the rarities we're working with
    let parsedRars = getArgsVal('--rarity', 'string');
    let rarities = parsedRars ? parsedRars.split(',') : RARITIES.ALL_INPUTS;

    // prepare agents
    cmdLog('populs generation begins.');
    let populs = new Array((getArgsVal('--populs', 'number') || 20)).fill(null);
    const promises = populs.map((_, index) => reset(index));
    populs = await Promise.all(promises);
    cmdLog('populs generation ends.', true);

    let initial = results = getArgsVal('--results', 'number') || 1;
    let bestPopulIndex = 0; 
    let resultIds = {};

    const staticPool = new StaticPool({
        size: require('os').cpus().length,
        shareEnv: true,
        task: path.join(process.cwd(), './prediction/worker.js'),
        workerData: getArgs()
    });

    // main loop
    while(true){
        let bestAgent = { outcome: { profit: Number.MIN_VALUE } };

        if(!getArgs().includes('--visualize'))
        cmdLog('genetic selection begins.');

        await Promise.all(populs.map(async (_, i, __) => {
            let cycled = await staticPool.exec(populs[i].serialize());
            populs[i] = Population.deserialize(cycled);
            populs[i].bestAgent.outcome.profit > populs[bestPopulIndex].bestAgent.outcome.profit ?
            bestPopulIndex = i : null
        }));

        // await Promise.all(populs.map(async (_, i, __) => {
        //     await populs[i].cycle();
        //     populs[i].bestAgent.outcome.profit > populs[bestPopulIndex].bestAgent.outcome.profit ?
        //     bestPopulIndex = i : null
        // }));

        bestAgent = cloneDeep(populs[bestPopulIndex].bestAgent);

        // print the matrix
        if(getArgs().includes('--visualize'))
        Population.visualize(populs);

        // print current best result
        console.log(`max profit = ${bestAgent.outcome.profit}`);
        cmdLog('genetic selection ends.', true);

        // end condition
        if (bestAgent.outcome.profit > targetProfit){
            if(getArgs().includes('--noLoss') && bestAgent.hasLoss()) { await reset(); continue; }

            // decrease results only if it's from a new population
            let bestPopId = populs[bestPopulIndex].id;
            let isNewPopulation = !resultIds[bestPopId];
            if(isNewPopulation){
                results--;
            }

            // replace population's best score agent
            if(isNewPopulation){
                resultIds[bestPopId] = cloneDeep(populs[bestPopulIndex].bestAgent);
            }
            else {
                // if new agent is better then save it
                if(resultIds[bestPopId].outcome.profit < populs[bestPopulIndex].bestAgent){
                    resultIds[bestPopId] = cloneDeep(populs[bestPopulIndex].bestAgent);
                }
                // otherwise reset the population and search for new tradeup
                else await reset();
            }

            // log the agent (or update the json file of the agent)
            let msg = !(getArgs().includes('--spy') && getArgs().includes('--visualize'));
            let success = msg;
            await bestAgent.log(`./results/inputs_${bestPopId}.json`, { msg, success }, true);

            // when results run out exit
            if(!results){
                if(getArgs().includes('--spy') && getArgs().includes('--visualize')){
                    // print all spy links
                    cmdClear();
                    console.log('[#] Tradeupspy.com Links generating...'.green);
                    await Promise.all(Object.keys(resultIds).map(async popId => {
                        await resultIds[popId].log(`./results/inputs_${popId}.json`, { msg:false, success:true }, true);
                    }));
                    cmdExit();
                }
                finish();
            }
        }
        
        // print remaining
        console.log(`[#] ${initial - results}/${initial} generated.`.gray);
    }
}

async function handleEval(){
    // run only one agent with the given inputs
    let evalPath = getArgsVal('--eval', 'path');
    if(evalPath){
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

async function evalFile(path, filename){
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

function isStattrak(){
    if(getArgs().includes('--onlyStattrak')) return true;
    if(getArgs().includes('--allowStattrak')){
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