import path from 'path';
import os from 'os';
import { parentPort, threadId, workerData } from 'worker_threads';

import { init } from '../db.js';
import { setArgs } from '../utils/args.js';

const importPrefix = os.platform() == 'win32' ? 'file://' : '';

const Population = (await import(path.join(importPrefix + process.cwd(), './prediction/population.js'))).default;
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