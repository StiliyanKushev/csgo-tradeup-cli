const colors = require('colors');
const { init, buildDatabase, clearDatabase } = require('./db');
const { cmdHelp, cmdExit, cmdCheckArgs } = require('./cmd');
const main = require('./perdiction');
const fs = require('fs');
const path = require('path');
let args = process.argv.slice(2);

init(async (db) => {
    checkFolders();
    cmdCheckArgs();

    if(args.includes('--help')){
        cmdHelp();
        cmdExit();
    }

    if(args.includes('--cd') || args.includes('--bd')){
        await clearDatabase();
    }

    if(args.includes('--bd')){
        await buildDatabase();
    }

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