const colors = require('colors');
const fs = require('fs');
let args = process.argv.slice(2);


const cmdTimer = (text) => {
    return new Promise((resolve, reject) => {
        if(args.includes('--f')) {resolve(); return;}
        let i = 5, timer = setInterval(() => {
            console.log(`${text}: ${i--}`);
            if(i == 0){
                clearInterval(timer);
                resolve();
            }
        }, 1000);
    });
}

const cmdClear = (fullClear=false) => {
    fullClear && process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
    console.clear();
}

const cmdHelp = (print=true) => {
    let helpMsg =
    `All Parameters:`                                                                                                                               + '\n' +
    `--help              -> Shows this help menu.`                                                                                                  + '\n' + 
    `--verbose           -> Shows extra log messages.`                                                                                              + '\n' +
    `--visualize         -> Draws a matrix of squares to visualize the success rate.`                                                               + '\n' +
    `--f                 -> Forces any action that otherwise prompts a timer.`                                                                      + '\n' +
    `--cd                -> Clears the gun database.`                                                                                               + '\n' +
    `--bd                -> Rebuilds the gun database.`                                                                                             + '\n' +
    `--sdb               -> Saves scraped data to a json file.`                                                                                     + '\n' +
    `--json              -> Use json file as scraped data. (Ex: --json "./data.json")`                                                              + '\n' +
    `--results           -> Give maximum number of results before stopping. (Ex: --results 10)`                                                     + '\n' +
    `--sources           -> Give maximum number of sources per each tradeup. (Ex: --sources 2)`                                                     + '\n' +
    `--rarity            -> Pick the rarity to use for inputs. (Ex: --rarity "Mil-Spec")`                                                           + '\n' +
    `--stattrakChance    -> Number between 0 and 100. Percent of chance for a tradeup to be a stattrak one or not.`                                 + '\n' +
    `--allowStattrak     -> Include stattrak tradeups.`                                                                                            + '\n' +
    `--onlyStattrak      -> Include ONLY stattrak tradeups.`                                                                                       + '\n' +
    `--profit            -> When to save a tradeup as profitable. (Ex: --profit 115)`                                                               + '\n' +
    `--minVal            -> Minimum input skin value when generating an input skin. (Ex: --maxVal 1)`                                               + '\n' +
    `--maxVal            -> Maximum input skin value when generating an input skin. (Ex: --maxVal 2)`                                               + '\n' +
    `--priceMargin       -> Used when looking for a replacement skin. More = more risky tradeups. (Ex: --priceMargin 5)`                            + '\n' +
    `--avf               -> Include the average float in the fitness calculation. (May give less frequent results)`                                 + '\n' +
    `--noFee             -> Remove the steam fee when calculating the profits.`                                                                     + '\n' +
    `--populs            -> Number of populations that will try to constructs a tradeup. (Ex: --populs 20)`                                         + '\n' +
    `--popSize           -> Number of agents to work on each tradeup simulation. (Ex: --popSize 20)`                                                + '\n' +
    `--skinMutate        -> Number between 0 and 100. Percent of chance to change a skin during mutation.`                                          + '\n' +
    `--floatMutate       -> Number between 0 and 100. Percent of chance to change a skin's float during mutation.`                                  + '\n' +
    `--eval              -> Evaluate generated result/s and export more information about the tradeup. (Ex: --eval "./result.json")`                + '\n' +
    `--smart             -> Fetch most recent prices of skins when evaluating trade ups using '--eval'`                                             + '\n' +
    `--noLoss            -> Only save tradeups that have no chance of money loss. (May give less frequent results)`                                 + '\n' +
    `--onlyCases         -> Don't include skins found in collections.`                                                                              + '\n' +
    `--onlyCollections   -> Don't include skins found in cases.`                                                                                    + '\n' +
    `--noSave            -> Don't generate json files and only show terminal logs.`                                                                 + '\n' +
    `--exclude           -> Exclude all cases/collections in a given file. (each new line) (Ex: --exclude './file.txt')`                            + '\n' +
    `--include           -> Include only cases/collections in a given file. (each new line) (Ex: --include './file.txt')`                           + '\n' +
    `--override          -> Override prices of skins. (each new line) (Ex: --override './file.txt') (Format: 'name#condition#price#st')`            + '\n' +
    `--spy               -> Generate a tradeupspy link for successful tradeup or when using --eval.`;
    
    if(print) { 
        console.log(helpMsg);
        cmdExit();
    }
    return helpMsg;
}

const cmdExit = () => {
    process.exit(1);
}

const cmdError = (err) => {
    console.log(err.bgWhite.red);
    cmdExit();
}

const cmdWarn = (msg) => {
    console.log(`NOTE: ${msg}`.bgBlack.yellow);
}

let lastDate = null;
const cmdLog = (msg, checkTime=false) => {
    if(args.includes('--verbose')){
        if(lastDate == null) lastDate = Date.now()
        if(msg != undefined)
        console.log(`[log] - ${msg}${checkTime?' - '+((Date.now() - lastDate) / 1000)+'sec':''}`.gray);
        lastDate = Date.now();
    }
}

const cmdCheckArgs = () => {
    let helpMsg = cmdHelp(false);
    for(let arg of args){
        if(arg.startsWith('--')){
            if(!helpMsg.match(arg + ' ')) {
                cmdError(`Unknown argument: '${arg}'. Use --help for more info. `);
            }
        }
    }
}

function getArgsVal(arg, type){
    let args = process.argv.slice(2);
    let val = args[args.indexOf(arg) + 1];

    if(args.indexOf(arg) == -1) return undefined;
    if(val == undefined || val.startsWith('-')) 
    cmdError(`Argument '${arg}' expects a value. Use --help for more info.`);

    const typeOf = (v) => {
        if(v.toLowerCase() == 'true' || v.toLowerCase() == 'false') return 'boolean';
        return typeof v;
    }

    if(type == 'path'){
        if(fs.existsSync(val)) {
            if(!fs.statSync(val).size == 0) return val;
            cmdError(`File can not be empty when using ${arg}. Use '--help' for more info.`)
        }
        cmdError(`Wrong argument type for argument: '${arg}'` +
                  `\nExpected valid '${type}' but got invalid '${typeOf(val)}' - '${val}'`)
    }

    if(type == 'number'){
        if(!isNaN(Number(val))) return Number(val);
        cmdError(`Wrong argument type for argument: '${arg}'` +
                  `\nExpected '${type}' but got '${typeOf(val)}' - '${val}'`)
    }
    
    else if(type == 'boolean'){
        if(val.toLowerCase() == 'true') return true;
        if(val.toLowerCase() == 'false') return false;
        cmdError(`Wrong argument type for argument: '${arg}'` +
                  `\nExpected '${type}' but got '${typeOf(val)}' - '${val}'`)
    }

    return val;
}

module.exports = {
    cmdCheckArgs,
    cmdTimer,
    cmdClear,
    cmdHelp,
    cmdExit,
    cmdError,
    cmdWarn,
    cmdLog,
    getArgsVal
}