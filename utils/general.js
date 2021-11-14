const differentiateBy = (countBy, ...arrays) => {
    let sorted = {};
    // loop each array of skins
    for(let i = 0; i < arrays.length; i++){
        // loop each skins
        for(let skin of arrays[i]){
            if(skin[countBy] in sorted){
                sorted[skin[countBy]].data.push(skin);
            } else sorted[skin[countBy]] = {data: [skin]};
            if(!sorted[skin[countBy]][`num${i}`])
            sorted[skin[countBy]][`num${i}`] = 1;
            else sorted[skin[countBy]][`num${i}`] += 1;
        }
    }
    return sorted;
}


const randomArb = (min, max) => {
    return Math.random() * (max - min) + min;
}

const randomArr = (arr, count=1) => {
    let res = [];
    for(let i = 0; i < count; i++) res.push(arr[Math.round(randomArb(0, arr.length - 1))]);
    return res.length == 1 ? res[0] : res;
}

const normalize = (val, minVal, maxVal, newMin, newMax) => {
    return newMin + (val - minVal) * (newMax - newMin) / (maxVal - minVal);
};

export { differentiateBy, normalize, randomArb, randomArr };