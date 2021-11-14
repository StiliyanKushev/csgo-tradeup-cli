import 'colors';

import fs from 'fs';
import path from 'path';

import { cmdCheckArgs, cmdError, cmdExit, cmdHelp, cmdLog, cmdWarn } from './cmd.js';
import { buildDatabase, checkEmptyDB, clearDatabase, init } from './db.js';
import main from './prediction/index.js';
import { getArgs } from './utils/args.js';

init(async () => {
    cmdLog('connection to mongodb established.');
    checkFolders();
    cmdCheckArgs();
    checkParams();
    await checkEmptyDB();

    if(getArgs().includes('--help'))
    cmdHelp();

    if(getArgs().includes('--cd'))
    await clearDatabase();

    if(getArgs().includes('--bd'))
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
    if(getArgs().includes('--exclude') && getArgs().includes('----include'))
    cmdError(`You can't use both --exclude and --include together.`);

    if(getArgs().includes('--noLoss') && getArgsVal('--profit', 'number') < 100)
    cmdError(`You can't have a '--profit' value of less then 100 when using '--noLoss.'`);

    if(getArgs().includes('--onlyCases') && getArgs().includes('--onlyCollections'))
    cmdError(`You can't use both '--onlyCases' and '--onlyCollections'`);

    if(getArgs().includes('--rarity')){
        RARITIES.ALL_INPUTS.includes()
        getArgsVal('--rarity', 'string').split(',').map(r => {
            if(!RARITIES.ALL_INPUTS.includes(r))
            cmdError(`You can't have '${r}' (--rarity ${r}) as a valid rarity. Use '--help' for more info.`);
        })
    }

    if(getArgs().includes('--avfm') && !getArgs().includes('--avf'))
    cmdError(`'--avfm' can only be used with '--avf'.`);

    if(getArgs().includes('--stattrakChance') && getArgs().includes('--onlyStattrak'))
    cmdError(`You can't use both '--stattrakChance' and '--onlyStattrak'.`);

    if(getArgs().includes('--stattrakChance') && !getArgs().includes('--allowStattrak'))
    cmdError(`'--stattrakChance' can only be used with '--allowStattrak'.`);

    if(getArgs().includes('--onlyCases'))
    cmdWarn(`Rarities 'Consumer' and 'Industrial' will be skipped because of '--onlyCases'`);

    if(getArgs().includes('--allowStattrak') && getArgs().includes('--onlyStattrak'))
    cmdWarn(`There's no need to use both '--allowStattrak' and '--onlyStattrak'`);

    if(getArgs().includes('--onlyCollections') && getArgs().includes('--onlyStattrak'))
    cmdError(`You can't use both '--onlyCollections' and '--onlyStattrak'.`);

    if(getArgs().includes('--onlyCollections') && getArgs().includes('--allowStattrak'))
    cmdWarn(`'--onlyCollections' will be skipped for any stattrak tradeups.`);

    if(getArgs().includes('--allowStattrak') || getArgs().includes('--onlyStattrak'))
    cmdWarn(`Industrial and Consumer grade skins cannot be used in a stattrak trade up.`);

    if(getArgs().includes('--smart') && !getArgs().includes('--eval'))
    cmdError(`'--smart' can only be used with '--eval'. Use '--help' for more info.`)

    if(getArgs().includes('--smart')) 
    cmdWarn(`'--smart' is used. This affects the speed of the program.`);
}