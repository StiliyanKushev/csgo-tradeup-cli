const mongoose = require("mongoose");
const { cmdTimer } = require("./cmd");
const { updateDatabase } = require("./scrape");
const colors = require('colors');
const Skin = require('./models/skin');
const Source = require('./models/source');
let args = process.argv.slice(2);
mongoose.Promise = global.Promise;

let dbConnection = null;
const getConnection = () => dbConnection;

function init(onReady) {
    mongoose.connect('mongodb://localhost/csgotradebot', {useNewUrlParser:true, useUnifiedTopology:true});
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

    // fetch all of the skins and put them into a mongo DB database
    await updateDatabase(args);
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
    if(!args.includes('--bd')) {
        console.log("Done.".bgCyan.black);
    }
}

module.exports = {
    getConnection,
    init,
    buildDatabase,
    checkEmptyDB,
    clearDatabase
}