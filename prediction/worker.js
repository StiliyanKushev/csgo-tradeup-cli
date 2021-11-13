const path = require('path');
const Population = require(path.join(process.cwd(), './prediction/population.js'));
const { parentPort, threadId, workerData } = require('worker_threads');
const { init } = require('../db');
const colors = require('colors');
const { setArgs } = require('../utils/args');

const connectDatabase = () => {
    return new Promise(resolve => {
        init(() => resolve());
    })
}

(async() => {
    await connectDatabase();
    console.log(`id:${threadId} worker is connected to mongodb.`.gray);

    // override the process arguments to match main process
    setArgs(workerData);
    
    async function cycle(serialized) {
        let population = Population.deserialize(serialized);
        await population.cycle();
        return population.serialize();
    }
    
    parentPort.on('message', async (serialized) => {
      const result = await cycle(serialized);
      parentPort.postMessage(result);
    });
})();