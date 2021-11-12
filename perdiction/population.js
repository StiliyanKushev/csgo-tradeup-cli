const Agent = require('./agent');
const { randomArr, randomArb } = require('../utils/general');
const cloneDeep = require('lodash.clonedeep');
const { cmdClear } = require('../cmd');
const { getValidRarity } = require('../utils/rarity');
let args = process.argv.slice(2);

class Population {
    constructor(size, rarity, stattrak, targetProfit){
        this._constructor(size, rarity, stattrak, targetProfit);
    }

    // used that way so I can reset the population from itself
    _constructor(size, rarity, stattrak, targetProfit){
        this.id = Number(Math.random().toString().substr(2));
        this.rarity = rarity;
        this.size = size;
        this.stattrak = stattrak;
        this.targetProfit = targetProfit;
        this.data = Array.from({ length:size }, () => new Agent(rarity, stattrak, this.id));
        this.pool = [];
        this.bestAgent = { outcome: { profit: Number.MIN_VALUE } };
        
        // used to store the visualization line (if using --visualize)
        this.rowText = '';

        // used to check if the population is stuck
        this.lastSameProfit = 0;

        return this;
    }

    async reset(rarities, stattrak, targetProfit){
        if(rarities && stattrak && targetProfit)
        await this._constructor(
            getArgsVal('--popSize', 'number') || 20,
            getValidRarity(rarities, stattrak),
            stattrak,
            targetProfit
        ).init();
        else
        await this._constructor(
            this.size,
            this.rarity,
            this.stattrak,
            this.targetProfit,
        ).init();
    }

    init(){
        return Promise.all(this.data.map(e => e.init())).then(() => this);
    }

    async cycle(){
        await this.matingPool();
        await this.middleware();
        await this.selection();
        return this;
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

        this.pool = matingPool;
    }

    // perform actions unrelated to selection
    // before erasing the population
    async middleware(){
        await this.checkStuck();
        this.calcLine();
    }

    async selection(){
        const crossover = async function(_, index, data){
            let [ parentA, parentB ] = randomArr(this.pool, 2);
            data[index] = await (await this.crossover(parentA, parentB)).mutate();
        }
        await Promise.all(this.data.map(await crossover.bind(this)))
    }

    async crossover(parentA, parentB){
        let child = new Agent(this.rarity, this.stattrak, this.id);
        let midPoint = Math.floor(randomArb(0, 10));
        let parentA_DNA = randomArr(parentA.inputs, midPoint);
        let parentB_DNA = randomArr(parentB.inputs, 10 - midPoint);
        parentA_DNA = Array.isArray(parentA_DNA) ? parentA_DNA : [parentA_DNA];
        parentB_DNA = Array.isArray(parentB_DNA) ? parentB_DNA : [parentB_DNA];
        await child.init([...parentA_DNA,...parentB_DNA]);
        return child;
    }

    getColoredSquare(agent) {
        if(agent.outcome.profit >= this.targetProfit) 
        return { square:'■ '.green, color: 'green' };
        if(agent.outcome.profit <= this.targetProfit / 4) 
        return { square:'■ '.red, color: 'red' };
        if(agent.outcome.profit > this.targetProfit / 4 && agent.outcome.profit <= this.targetProfit / 2) 
        return { square:'■ '.magenta, color: 'magenta' };
        if(agent.outcome.profit > this.targetProfit / 2 <= this.targetProfit) 
        return { square:'■ '.yellow, color: 'yellow' };
        return { square:'■ '.gray, color: 'gray' };
    }

    calcLine(){
        if(!args.includes('--visualize')) return;

        let rowText = '';
        for(let col = 0; col < this.data.length; col++){
            if(!args.includes('--verbose'))
            rowText += this.getColoredSquare(this.data[col]).square + ' ';
            
            else {
                let color = this.getColoredSquare(this.data[col]).color;
                let number = ("0" + Math.round(this.data[col].outcome.profit)).slice(-2)[color];
                if(color == 'green') number = '##'.green;
                rowText += number + ' ';
            }
        }
        this.rowText = rowText;
    }

    async checkStuck(){
        let allSameProfit = true;
        let initialProfit = this.data[0].outcome.profit;
        for(let agent of this.data){
            if(agent.outcome.profit != initialProfit) {
                allSameProfit = false;
                return;
            }
        }

        if(allSameProfit){
            // await this.reset();
            // await this.matingPool();
            
            // instead of reseting try mutation
            await Promise.all(this.data.map(agent => agent.mutate(33)));
        }
    }

    static visualize(populs){
        cmdClear(true);
        let string = '';
        for(let p of populs) string += p.rowText + '\n'
        console.log(string);
    }
}

module.exports = Population;