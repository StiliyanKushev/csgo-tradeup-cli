const colors = require('colors');
const { init, buildDatabase, clearDatabase } = require('./db');
const { cmdHelp, cmdExit, cmdCheckArgs } = require('./cmd');
const main = require('./perdiction');
let args = process.argv.slice(2);

init(async (db) => {
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