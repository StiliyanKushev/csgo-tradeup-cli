import { deserialize, serialize } from 'v8';

import { cmdClear, getArgsVal } from '../cmd.js';
import { getArgs } from '../utils/args.js';
import { randomArb, randomArr } from '../utils/general.js';
import { getValidRarity } from '../utils/rarity.js';
import Agent from './agent.js';

class Population {
    constructor(size, rarity, stattrak, targetProfit){
        if(size == undefined) return; // prevent bugs when deserialize

        // do the actual constructor logic
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

    serialize(){
        return serialize(this);
    }

    static deserialize(serialized){
        let parsed = deserialize(serialized);
        let instance = new Population();
        parsed.data.map((_, i, arr) => arr[i] = Agent.deserialize(arr[i]));
        parsed.bestAgent = Agent.deserialize(parsed.bestAgent);
        Object.assign(instance, parsed);
        return instance;
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
        this.bestAgent = deserialize(serialize(this.data[bestAgentIndex]));

        // normalize every fitness by the max fitness
        let sumFitness = 0;
        this.data.map(agent => {
            agent.fitness /= maxFitness;
            sumFitness += agent.fitness;
        });

        if(sumFitness == 0) {
            // if the sum of fitness is 0, then the population is stuck
            // meaning all agents are stuck in a local minimum
            // so we reset the population
            await this.reset();
            await this.matingPool();
            return;
        }

        // generate mating pool based on the fitness
        let matingPool = [];

        this.data.map(agent => {
            let importance = Math.round(100 / (sumFitness / agent.fitness));
            if(importance == 0) return;
            matingPool.push(...new Array(importance).fill(agent));
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

        // if the agent is really close to the target profit (10%) paint it cyan
        if(agent.outcome.profit >= this.targetProfit * 0.90)
        return { square:'■ '.cyan, color: 'cyan' };

        if(agent.outcome.profit <= this.targetProfit / 4) 
        return { square:'■ '.red, color: 'red' };
        if(agent.outcome.profit > this.targetProfit / 4 && agent.outcome.profit <= this.targetProfit / 2) 
        return { square:'■ '.magenta, color: 'magenta' };
        if(agent.outcome.profit > this.targetProfit / 2 <= this.targetProfit) 
        return { square:'■ '.yellow, color: 'yellow' };
        return { square:'■ '.gray, color: 'gray' };
    }

    calcLine(){
        if(!getArgs().includes('--visualize')) return;

        let rowText = '';
        for(let col = 0; col < this.data.length; col++){
            if(!getArgs().includes('--verbose'))
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

export default Population;