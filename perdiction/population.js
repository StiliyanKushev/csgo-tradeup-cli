const Agent = require('./agent');
const { randomArr, randomArb } = require('../utils/general');
const cloneDeep = require('lodash.clonedeep');
const { cmdExit, cmdClear } = require('../cmd');
let args = process.argv.slice(2);

class Population {
    constructor(size, rarity, stattrak, targetProfit){
        this.rarity = rarity;
        this.size = size;
        this.stattrak = stattrak;
        this.targetProfit = targetProfit;
        this.data = Array.from({ length:size }, () => new Agent(rarity, stattrak));
        this.bestAgent = { outcome: { profit: Number.MIN_VALUE } };
        this.rowText = '';
    }

    init(){
        return Promise.all(this.data.map(e => e.init())).then(() => this);
    }

    async cycle(){
        await this.selection(await this.matingPool());
    }

    async matingPool(){
        // calculate maximum fitness
        this.bestAgent = { outcome: { profit: Number.MIN_VALUE } };
        let bestAgentIndex = 0;
        let maxFitness = Number.MIN_VALUE;
        
        await Promise.all(this.data.map(async (agent, index, _) => {
            let fitness = await agent.calcFitness();
            maxFitness = fitness > maxFitness ? fitness : maxFitness;
            if(agent.outcome.profit > this.data[bestAgentIndex].outcome.profit) {
                bestAgentIndex = index;
            }
        }));
        this.bestAgent = cloneDeep(this.data[bestAgentIndex]);

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
        this.calcLine();
        
        const crossover = async function(_, index, data){
            let [ parentA, parentB ] = randomArr(pool, 2);
            data[index] = await (await this.crossover(parentA, parentB)).mutate();
        }
        await Promise.all(this.data.map(await crossover.bind(this)))
    }

    async crossover(parentA, parentB){
        let child = new Agent(this.rarity, this.stattrak);
        let midPoint = Math.floor(randomArb(0, 10));
        let parentA_DNA = randomArr(parentA.inputs, midPoint);
        let parentB_DNA = randomArr(parentB.inputs, 10 - midPoint);
        parentA_DNA = Array.isArray(parentA_DNA) ? parentA_DNA : [parentA_DNA];
        parentB_DNA = Array.isArray(parentB_DNA) ? parentB_DNA : [parentB_DNA];
        await child.init([...parentA_DNA,...parentB_DNA]);
        return child;
    }

    calcLine(){
        if(!args.includes('--visualize')) return;
        const getColoredSquare = agent => {
            if(agent.outcome.profit >= this.targetProfit) return '■ '.green;
            if(agent.outcome.profit <= this.targetProfit / 4) return '■ '.red;
            if(agent.outcome.profit <= this.targetProfit / 3) return '■ '.magenta;
            if(agent.outcome.profit <= this.targetProfit / 2) return '■ '.yellow;
            return '■ '.red;
        }

        let rowText = '';
        for(let col = 0; col < this.data.length; col++){
            rowText += getColoredSquare(this.data[col]) + ' ';
        }
        this.rowText = rowText;
    }

    static visualize(populs){
        cmdClear(true);
        let string = '';
        for(let p of populs) string += p.rowText + '\n'
        console.log(string);
    }
}

module.exports = Population;