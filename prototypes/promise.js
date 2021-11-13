async function TimedPromiseAll(promises) {
    const starttime = Date.now();
    const timings = [];
    promises.forEach((prom, ix) => {
      prom.then(() => {
        timings[ix] = (Date.now() - starttime) / 1000;
      });
    });
    const result = await Promise.all(promises);
    return {result, timings};
}

module.exports = {
    TimedPromiseAll
}