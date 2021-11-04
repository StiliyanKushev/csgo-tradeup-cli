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
    `All Parameters:                                                                                                                               `.bgBlack.cyan + '\n' +
    `--help              -> Shows this help menu.                                                                                                  `.bgCyan.black + '\n' + 
    `--f                 -> Forces any action that otherwise prompts a timer.                                                                      `.bgCyan.black + '\n' +
    `--cd                -> Clears the gun database.                                                                                               `.bgCyan.black + '\n' +
    `--bd                -> Rebuilds the gun database.                                                                                             `.bgCyan.black + '\n' +
    `--sdb               -> Saves scraped data to a json file.                                                                                     `.bgCyan.black + '\n' +
    `--json              -> Use json file as scraped data. (Ex: --json "./data.json")                                                              `.bgCyan.black + '\n' +
    `--results           -> Give maximum number of results before stopping. (Ex: --results 10)                                                     `.bgCyan.black + '\n' +
    `--sources           -> Give maximum number of sources per each tradeup. (Ex: --sources 2)                                                     `.bgCyan.black + '\n' +
    `--rarity            -> Pick the rarity to use for inputs. (Ex: --rarity "Mil-Spec")                                                           `.bgCyan.black + '\n' +
    `--allowStattrak     -> Include stattrak trade ups.                                                                                            `.bgCyan.black + '\n' +
    `--onlyStattrak      -> Include ONLY stattrak trade ups.                                                                                       `.bgCyan.black + '\n' +
    `--profit            -> When to save a tradeup as profitable. (Ex: --profit 115)                                                               `.bgCyan.black + '\n' +
    `--minVal            -> Minimum input skin value when generating an input skin. (Ex: --maxVal 1)                                               `.bgCyan.black + '\n' +
    `--maxVal            -> Maximum input skin value when generating an input skin. (Ex: --maxVal 2)                                               `.bgCyan.black + '\n' +
    `--priceMargin       -> Used when looking for a replacement skin. More = more risky tradeups. (Ex: --priceMargin 5)                            `.bgCyan.black + '\n' +
    `--avf               -> Include the average float in the fitness calculation. (May give less frequent results)                                 `.bgCyan.black + '\n' +
    `--noFee             -> Remove the steam fee when calculating the profits.                                                                     `.bgCyan.black + '\n' +
    `--populs            -> Number of populations that will try to constructs a tradeup. (Ex: --populs 20)                                         `.bgCyan.black + '\n' +
    `--popSize           -> Number of agents to work on each tradeup simulation. (Ex: --popSize 20)                                                `.bgCyan.black + '\n' +
    `--skinMutate        -> Number between 0 and 100. Percent of chance to change a skin during mutation.                                          `.bgCyan.black + '\n' +
    `--floatMutate       -> Number between 0 and 100. Percent of chance to change a skin's float during mutation.                                  `.bgCyan.black + '\n' +
    `--eval              -> Evaluate generated result/s and export more information about the tradeup. (Ex: --eval "./result.json")                `.bgCyan.black + '\n' +
    `--smart             -> Fetch most recent prices of skins when evaluating trade ups using '--eval'                                             `.bgCyan.black + '\n' +
    `--noLoss            -> Only save tradeups that have no chance of money loss. (May give less frequent results)                                 `.bgCyan.black + '\n' +
    `--onlyCases         -> Don't include skins found in collections.                                                                              `.bgCyan.black + '\n' +
    `--onlyCollections   -> Don't include skins found in cases.                                                                                    `.bgCyan.black + '\n' +
    `--noSave            -> Don't generate json files and only show terminal logs.                                                                 `.bgCyan.black + '\n' +
    `--exclude           -> Exclude all cases/collections in a given file. (each new line) (Ex: --exclude './file.txt')                            `.bgCyan.black + '\n' +
    `--include           -> Include only cases/collections in a given file. (each new line) (Ex: --include './file.txt')                           `.bgCyan.black + '\n' +
    `--override          -> Used to override prices of skins. (each new line) (Ex: --override './file.txt') (Format: 'name#condition#price')       `.bgCyan.black + '\n' +
    `--spy               -> Generate a tradeupspy link for successful tradeup or when using --eval.                                                `.bgCyan.black;
    
    if(print) console.log(helpMsg);
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
    if(val == undefined) cmdError(`Argument '${arg}' expects a value. Use --help for more info.`);
    if(val.startsWith('-')) return undefined;

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
    getArgsVal
}