const colors = require('colors');
const { init, buildDatabase, clearDatabase, checkEmptyDB } = require('./db');
const { cmdLog, cmdHelp, cmdExit, cmdCheckArgs, cmdWarn, cmdError } = require('./cmd');
const main = require('./perdiction');
const fs = require('fs');
const path = require('path');
let args = process.argv.slice(2);

init(async () => {
    cmdLog('connection to mongodb established.');
    checkFolders();
    cmdCheckArgs();
    checkParams();
    await checkEmptyDB();

    if(args.includes('--help'))
    cmdHelp();

    if(args.includes('--cd'))
    await clearDatabase();

    if(args.includes('--bd'))
    await buildDatabase();

    await main();

    // exit at the end
    cmdExit();
});

function checkFolders(){
    if(!fs.existsSync(path.join(process.cwd(),'./dist')))
    fs.mkdirSync(path.join(process.cwd(),'./dist'));
    if(!fs.existsSync(path.join(process.cwd(),'./evals')))
    fs.mkdirSync(path.join(process.cwd(),'./evals'));
    if(!fs.existsSync(path.join(process.cwd(),'./results')))
    fs.mkdirSync(path.join(process.cwd(),'./results'));
    if(!fs.existsSync(path.join(process.cwd(),'./logs')))
    fs.mkdirSync(path.join(process.cwd(),'./logs'));
}

function checkParams(){
    if(args.includes('--exclude') && args.includes('----include'))
    cmdError(`You can't use both --exclude and --include together.`);

    if(args.includes('--noLoss') && getArgsVal('--profit', 'number') < 100)
    cmdError(`You can't have a '--profit' value of less then 100 when using '--noLoss.'`);

    if(args.includes('--onlyCases') && args.includes('--onlyCollections'))
    cmdError(`You can't use both '--onlyCases' and '--onlyCollections'`);

    if(args.includes('--rarity')){
        RARITIES.ALL_INPUTS.includes()
        getArgsVal('--rarity', 'string').split(',').map(r => {
            if(!RARITIES.ALL_INPUTS.includes(r))
            cmdError(`You can't have '${r}' (--rarity ${r}) as a valid rarity. Use '--help' for more info.`);
        })
    }

    if(args.includes('--stattrakChance') && args.includes('--onlyStattrak'))
    cmdError(`You can't use both '--stattrakChance' and '--onlyStattrak'.`);

    if(args.includes('--stattrakChance') && !args.includes('--allowStattrak'))
    cmdError(`'--stattrakChance' can only be used with '--allowStattrak'.`);

    if(args.includes('--onlyCases'))
    cmdWarn(`Rarities 'Consumer' and 'Industrial' will be skipped because of '--onlyCases'`);

    if(args.includes('--allowStattrak') && args.includes('--onlyStattrak'))
    cmdWarn(`There's no need to use both '--allowStattrak' and '--onlyStattrak'`);

    if(args.includes('--onlyCollections') && args.includes('--onlyStattrak'))
    cmdError(`You can't use both '--onlyCollections' and '--onlyStattrak'.`);

    if(args.includes('--onlyCollections') && args.includes('--allowStattrak'))
    cmdWarn(`'--onlyCollections' will be skipped for any stattrak tradeups.`);

    if(args.includes('--allowStattrak') || args.includes('--onlyStattrak'))
    cmdWarn(`Industrial and Consumer grade skins cannot be used in a stattrak trade up.`);

    if(args.includes('--smart') && !args.includes('--eval'))
    cmdError(`'--smart' can only be used with '--eval'. Use '--help' for more info.`)

    if(args.includes('--smart')) 
    cmdWarn(`'--smart' is used. This affects the speed of the program.`);
}