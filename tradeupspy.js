const playwright = require('playwright');
const Spy = require('./models/spy');

async function genIdsSpy(skins){
    const browser = await playwright.chromium.launch({
        headless: true, 
        args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-sandbox',
            '--no-zygote',
            '--deterministic-fetch',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials',
        ]
    });
    
    const page = await browser.newPage();
    await page.goto("https://www.tradeupspy.com/skins/");

    await page.exposeFunction('waitForSelector', async (cssSelector) => {
        await await page.waitForSelector(cssSelector);
    });

    for(let skin of skins){
        let id = 0;

        // check the database for already fetched IDs
        let spyDoc = await Spy.findOne({ name: skin.name });

        // if found use that
        if(spyDoc) id = spyDoc.CSGO_SPY_ID;
        // otherwise scrape and generate new one
        else {
            id = await page.evaluate(async (inputName) => {
                // trigger gun search
                let input = document.getElementById("input_search_skin");
                input.value = inputName;
                input.dispatchEvent(new Event('keyup'));

                // wait for gun to be found
                await window.waitForSelector(".searched_skins_container_enabled>a");

                // extract the gun id
                let gun = document.getElementsByClassName("searched_skins_container_enabled")[0];
                let skinUrl = gun.children[0].href.split('/');
                let id = skinUrl[skinUrl.length - 2];
                return id;
            }, skin.name);

            // push the new skin spy id to the database
            await new Spy({ name: skin.name , CSGO_SPY_ID: id }).save();
        }

        // set the skin spyId at the end
        skin.spyId = id;
    }

    browser.close();
    return skins;
}

function getIdsUrl(skins){
    let url = '/';
    skins.map(e => url += e.spyId + ",")
    return url.substr(0, url.length - 1);
}

async function generateTradespyLink(inputs, outputs, stattrak=false){
    let baseUrl = `https://www.tradeupspy.com/calculator/share/undefined/${stattrak}/5`;
    
    // float of the inputs
    let floatsUrl = "/";
    inputs.map(e => floatsUrl += e.float.toFixed(3) + ",")
    floatsUrl = floatsUrl.substring(0, floatsUrl.length - 1);

    // the ids of the input and output skins
    let outputIds = await genIdsSpy([...inputs, ...outputs]);
    let inputIds = outputIds.splice(0, inputs.length);
    let idsUrlInputs = getIdsUrl(inputIds);
    let idsUrlOutputs = getIdsUrl(outputIds);
    
    // prices of the inputs
    let pricesUrl = "/";
    inputs.map(e => pricesUrl += e.price.toFixed(3) + ",")
    pricesUrl = pricesUrl.substring(0, pricesUrl.length - 1);

    // prices of the outcomes
    let pricesOutputsUrl = "/";
    outputs.map(e => pricesOutputsUrl += e.price.toFixed(2) + ",")
    pricesOutputsUrl = pricesOutputsUrl.substring(0, pricesOutputsUrl.length - 1);

    // construct final url
    return baseUrl + floatsUrl + idsUrlInputs + idsUrlOutputs + pricesUrl + pricesOutputsUrl;
}

module.exports = {
    generateTradespyLink
}