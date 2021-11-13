let args = process.argv.slice(2);

const getArgs = () => {
    return args;
}

const setArgs = (newArgs) => {
    args = newArgs;
}

module.exports = {
    getArgs,
    setArgs,
}