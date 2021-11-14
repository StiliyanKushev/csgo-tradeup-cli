function chunk(chunkSize, array) {
    var R = [];
    for (var i = 0; i < array.length; i += chunkSize)
        R.push(array.slice(i, i + chunkSize));
    return R;
}

function ArrayFromChunks(chunks) {
    var R = [];
    for(let chunk of chunks) R.push(...chunk)
    return R;
}

export { ArrayFromChunks, chunk };