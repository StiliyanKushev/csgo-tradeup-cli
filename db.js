import 'colors';

import mongoose from 'mongoose';

import { cmdTimer } from './cmd.js';
import Skin from './models/skin.js';
import Source from './models/source.js';
import { updateDatabase } from './scrape.js';
import { getArgs } from './utils/args.js';

mongoose.Promise = global.Promise;

let dbConnection = null;
const getConnection = () => dbConnection;

function init(onReady) {
    mongoose.connect('mongodb://localhost/csgotradebot', {poolSize: 100, useNewUrlParser:true, useUnifiedTopology:true});
    mongoose.set('useFindAndModify', false);
    dbConnection = mongoose.connection;
    dbConnection.once("open", (err) => {
        if (err) {
        throw err;
        }
        onReady();
    });
    dbConnection.on("error", (err) => console.log(`Database error: ${err}`));
}

async function buildDatabase(){
    console.log("Building the database. This may take a few minutes.".bgCyan.black);
        
    // give time to cancel
    await cmdTimer("Ctrl-C to cancel".bgRed.white);
    await clearDatabase();

    // fetch all of the skins and put them into a mongo DB database
    await updateDatabase();
    console.log("Database has been updated.".bgCyan.black);   
}

async function checkEmptyDB(){
    const numSkins = await Skin.estimatedDocumentCount();
    const numSources = await Source.estimatedDocumentCount();

    if(numSkins == 0 || numSources == 0){
        console.log(`Database is empty. Building database...`.bgCyan.black);
        await buildDatabase();
    } 
}

async function clearDatabase(){
    console.log("Clearing the database.".bgCyan.black);
    try { await Skin.collection.drop()   } catch { /* is empty */ }
    try { await Source.collection.drop() } catch { /* is empty */ }
    if(!getArgs().includes('--bd')) {
        console.log("Done.".bgCyan.black);
    }
}

export { buildDatabase, checkEmptyDB, clearDatabase, getConnection, init };