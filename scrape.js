const jsdom = require('jsdom');
const fs = require('fs');
const Skin = require('./models/skin');
const Source = require('./models/source');
const { rarityToNumber, getHighestRarity } = require('./utils/rarity');
const { getArgsVal, cmdExit } = require('./cmd');

const scrapeUrl = (url) => {
    return new Promise((resolve, reject) => {
        const http      = require('http'),
              https     = require('https');

        let client = http;

        if (url.toString().indexOf("https") === 0) {
            client = https;
        }

        client.get(url, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                resolve(data);
            });

        }).on("error", (err) => {
            reject(err);
        });
    });
};

async function getGunsSources() {
    let res = [];
    let scraped = await scrapeUrl("https://csgostash.com/");
    let dom = new jsdom.JSDOM(scraped);
    all = [...dom.window.document.getElementsByClassName("navbar-nav")[0].children]
    Array.prototype.slice.call(all).map((p, i) => {
        if(i != 6 && i != 7) return; // only leave the relevant drop downs menues and skip knives
        [...p.children[1].children].map(e => {
            if(e.children.length > 0){
                let temp = { url:'', source:'' }
                temp.url = (e.children[0].href);
                temp.source = e.children[0].textContent.trim();
                
                if(temp.source == "All Skin Cases" ||
                   temp.source == "Souvenir Packages" ||
                   temp.source == "Gift Packages") return;

                res.push(temp);
            }
        });
    });
    return res;
}

async function getGunsData(){
    let gunSources = await getGunsSources();
    let gunsData = {};
    for(let i = 0; i < gunSources.length; i++){
        console.log(`now scraping: ${gunSources[i].source}`.green);
        gunsData[`${gunSources[i].source}`] = await gunScrape(gunSources[i].url);
    }
    return gunsData;
}

async function gunScrape(url){
    let res = [];
    let scraped = await scrapeUrl(url);
    let dom = new jsdom.JSDOM(scraped);
    let boxes = [...dom.window.document.getElementsByClassName('result-box')];
    let allRarities = [...dom.window.document.getElementsByClassName('quality')];
    const highestRarity = rarityToNumber(getHighestRarity(allRarities));

    await Array.prototype.slice.call(boxes).map(async (p, i) => {
        if(p.textContent.includes("Rare")) return; // skip knifes and gloves
        if(p.children.length <= 3) return; // remove adds
        if(p.children[0].textContent.toLowerCase().indexOf("default") != -1) return; // remove default skins
        
        console.log(`   -${p.children[0].textContent}`.gray);

        // get basic data first
        let gunData = {
            name: p.children[0].textContent,
            rarity: p.children[1].textContent.trim().split(' ')[0],
            imgSrc: p.children[3].children[0].src,
            isValidInput: true,
        };
        
        // can't be used in trade ups
        if(gunData.rarity == "Contraband") return;

        // scrape the more complex data
        let otherData = await advancedGunScrape(p.children[4].children[0].children[0].href);
        gunData = {...gunData, ...otherData}

        // skip the gun if it's souvenier only
        if(
            gunData.STAT_TRAK.FN.stashVal +
            gunData.STAT_TRAK.MW.stashVal +
            gunData.STAT_TRAK.FT.stashVal +
            gunData.STAT_TRAK.WW.stashVal +
            gunData.STAT_TRAK.BS.stashVal +
            gunData.FN.stashVal +
            gunData.MW.stashVal +
            gunData.FT.stashVal +
            gunData.WW.stashVal +
            gunData.BS.stashVal == -10
        ) return;

        // is not a valid input (only output)
        if(rarityToNumber(gunData.rarity) == highestRarity){
            gunData.isValidInput = false;
        }

        // add the gun data to the resulting array of objects
        res.push(gunData);
    });
    return res;
}

async function advancedGunScrape(url){
    let gunData = {
        STAT_TRAK:{
            FN: {stashVal:-1, steamLink:''},
            MW: {stashVal:-1, steamLink:''},
            FT: {stashVal:-1, steamLink:''},
            WW: {stashVal:-1, steamLink:''},
            BS: {stashVal:-1, steamLink:''},
        },
        FN: {stashVal:-1, steamLink:''},
        MW: {stashVal:-1, steamLink:''},
        FT: {stashVal:-1, steamLink:''},
        WW: {stashVal:-1, steamLink:''},
        BS: {stashVal:-1, steamLink:''},
        MIN_WEAR:-1,
        MAX_WEAR:-1,
        CSGO_STASH_ID: Number(url.split('/')[4]),
        CSGO_STASH_NAME: url.split('/')[5]
    };

    let scraped = await scrapeUrl(url);
    let dom = new jsdom.JSDOM(scraped);

    // get min and max wear values
    try {
        let [minW,maxW] = [...dom.window.document.getElementsByClassName("wear-bar-markers")[0].children];
        gunData.MIN_WEAR = Number(minW.textContent.trim());
        gunData.MAX_WEAR = Number(maxW.textContent.trim());
    } catch { /* floats not available */ }

    // get stashed values
    let tabView = dom.window.document.getElementById("prices");
    let items = [...tabView.getElementsByClassName("btn-group-justified")];
    items.splice(0,1); // remove the first irrelevant one

    for(let item of items){
        let arr = item.textContent.trim().split('\n');
        if(arr.length == 3){
            let current = arr[0] == "StatTrak" ? JSON.parse(JSON.stringify(gunData.STAT_TRAK)) : null;
            if(current == null) continue; // skip souvenier
            if(arr[2].indexOf('No') != -1) continue; // skip the "no recent/not possible" ones
            let stashVal = Number(arr[2].slice(0,-1).replace(',','.').replace('--','0').replace(' ',''));
            stashVal *= 1.16; // convert to usd
            if(arr[1].trim().toLowerCase() == 'factory new') { 
                current.FN.stashVal = stashVal;
                current.FN.steamLink = item.firstElementChild.href;
            }
            else if(arr[1].trim().toLowerCase() == 'minimal wear') { 
                current.MW.stashVal = stashVal;
                current.MW.steamLink = item.firstElementChild.href;
            }
            else if(arr[1].trim().toLowerCase() == 'field-tested') { 
                current.FT.stashVal = stashVal;
                current.FT.steamLink = item.firstElementChild.href;
            }
            else if(arr[1].trim().toLowerCase() == 'well-worn') { 
                current.WW.stashVal = stashVal;
                current.WW.steamLink = item.firstElementChild.href;
            }
            else if(arr[1].trim().toLowerCase() == 'battle-scarred') { 
                current.BS.stashVal = stashVal;
                current.BS.steamLink = item.firstElementChild.href;
            }
            else if(arr[1].trim().toLowerCase() == 'vanilla') { 
                // current.VANILLA.stashVal = stashVal;
                // current.VANILLA.steamLink = item.firstElementChild.href;
            }
            else throw new Error(arr[1]);

            if(arr[0] == 'StatTrak') {
                gunData.STAT_TRAK.FN = {...current.FN};
                gunData.STAT_TRAK.MW = {...current.MW};
                gunData.STAT_TRAK.FT = {...current.FT};
                gunData.STAT_TRAK.WW = {...current.WW};
                gunData.STAT_TRAK.BS = {...current.BS};
            }
        }
        else {
            if(arr[1].indexOf('No') != -1) continue; // skip the "no recent/not possible" ones
            let stashVal = Number(arr[1].slice(0,-1).replace(',','.').replace('--','0').replace(' ',''));
            stashVal *= 1.16; // convert to usd
            if(stashVal == null) throw new Error(arr[1]);
            if(arr[0].trim().toLowerCase() == 'factory new') { 
                gunData.FN.stashVal = stashVal;
                gunData.FN.steamLink = item.firstElementChild.href;
            }
            else if(arr[0].trim().toLowerCase() == 'minimal wear') { 
                gunData.MW.stashVal = stashVal;
                gunData.MW.steamLink = item.firstElementChild.href;
            }
            else if(arr[0].trim().toLowerCase() == 'field-tested') { 
                gunData.FT.stashVal = stashVal;
                gunData.FT.steamLink = item.firstElementChild.href;
            }
            else if(arr[0].trim().toLowerCase() == 'well-worn') { 
                gunData.WW.stashVal = stashVal;
                gunData.WW.steamLink = item.firstElementChild.href;
            }
            else if(arr[0].trim().toLowerCase() == 'battle-scarred') { 
                gunData.BS.stashVal = stashVal;
                gunData.BS.steamLink = item.firstElementChild.href;
            }
            else if(arr[0].trim().toLowerCase() == 'vanilla') { 
                // gunData.VANILLA.stashVal = stashVal;
                // gunData.VANILLA.steamLink = item.firstElementChild.href;
            }
            else throw new Error(arr[0]);
        }
    }

    return gunData;
}

async function updateMongose(scrapedData){
    for(let source in scrapedData){
        let sourceIsValids = {
            'Consumer': false,
            'Industrial': false,
            'Mil-Spec': false,
            'Restricted': false,
            'Classified': false,
            'Covert': false,
        }

        // add guns to database
        for(let gun of scrapedData[source]){
            gun.source = source;
            try { await new Skin({...gun}).save(); } catch { continue }
            if(!sourceIsValids[gun.rarity] && gun.isValidInput){
                sourceIsValids[gun.rarity] = true;
            }
        }

        // add source to database
        try { await new Source({ name: source, ...sourceIsValids }).save(); } catch {}
    }
}

async function updateDatabase(args){
    let scrapedData;

    // parse the json and get the scraped data
    if(args.includes('--json')){
        let path = getArgsVal('--json', 'string');
        if(!fs.existsSync(path)) throw new Error("Path for json file is not correct.");
        scrapedData = JSON.parse(fs.readFileSync(path));
    }
    // scrape data from web
    else {
        scrapedData = await getGunsData();
    }

    console.log("[#] scraping data finished!".green);

    if(args.includes('--sdb')){
        fs.writeFileSync(`data_${Date.now()}.json`, JSON.stringify(scrapedData));
        console.log("[#] scraped data saved to a file!".green);
    }
    
    await updateMongose(scrapedData);
}

module.exports = {
    advancedGunScrape,
    updateDatabase,
    scrapeUrl
}