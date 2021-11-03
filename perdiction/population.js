const Agent = require('./agent');
const { randomArr, randomArb } = require('../utils/general');
const cloneDeep = require('lodash.clonedeep');

class Population {
    constructor(size, rarity){
        this.rarity = rarity;
        this.size = size;
        this.data = Array.from({ length:size }, () => new Agent(rarity));
        this.bestAgent = { outcome: { profit: Number.MIN_VALUE } };
    }

    async init(){
        await Promise.all(this.data.map(e => e.init()));
        return this;
    }

    async cycle(){
        await this.selection(await this.matingPool());
    }

    async matingPool(){
        // calculate maximum fitness
        this.bestAgent = { outcome: { profit: Number.MIN_VALUE } };
        let maxFitness = Number.MIN_VALUE;
        
        await Promise.all(this.data.map(async agent => {
            let fitness = await agent.calcFitness();
            maxFitness = fitness > maxFitness ? fitness : maxFitness;
            if(agent.outcome.profit > this.bestAgent.outcome.profit) {
                this.bestAgent = cloneDeep(agent);
            }
        }));
        
        // normalize every fitness by the max fitness
        let sumFitness = 0;
        this.data.map(agent => {
            agent.fitness /= maxFitness;
            sumFitness += agent.fitness;
        });

        // generate mating pool based on the fitness
        let matingPool = [];

        this.data.map(agent => {
            let imporatnce = Math.round(100 / (sumFitness / agent.fitness));
            if(imporatnce == 0) return;
            matingPool.push(...new Array(imporatnce).fill(agent));
        });

        return matingPool;
    }

    async selection(pool){
        const crossover = async function(_, index, data){
            let [ parentA, parentB ] = randomArr(pool, 2);
            data[index] = await this.crossover(parentA, parentB).mutate();
        }
        await Promise.all(this.data.map(await crossover.bind(this)))
    }

    crossover(parentA, parentB){
        let child = new Agent(this.rarity);
        let midPoint = Math.floor(randomArb(0, 10));
        let parentA_DNA = randomArr(parentA.inputs, midPoint);
        let parentB_DNA = randomArr(parentB.inputs, 10 - midPoint);
        parentA_DNA = Array.isArray(parentA_DNA) ? parentA_DNA : [parentA_DNA];
        parentB_DNA = Array.isArray(parentB_DNA) ? parentB_DNA : [parentB_DNA];
        child.inputs = [...parentA_DNA,...parentB_DNA];
        return child;
    }
}

module.exports = Population;