function addExitHandler(callback, {
    requiresAsyncLogic = false,
    onlyExitSignal = '',
} = {}) {
    process.stdin.resume(); // Prevent program from closing instantly

    if (requiresAsyncLogic) {
        // Allows adding more work to the event loop
        // See: https://nodejs.org/api/process.html#event-beforeexit
        process.on('beforeExit', callback);
    } else {
        // All normal exits, including `process.exit()`
        // Synchronous code only
        process.on('exit', callback);
    }

    if (onlyExitSignal) {
        process.on(onlyExitSignal, callback);

        return;
    }

    // Catches Ctrl+C and other similar signals from the terminal
    process.on('SIGEXIT', callback);
    process.on('SIGQUIT', callback);
    process.on('SIGINT', callback); // Ctrl+C specifically
    process.on('SIGTERM', callback);

    // Catches "kill pid" (also done with e.g. `nodemon restart`)
    process.on('SIGUSR1', callback);
    process.on('SIGUSR2', callback);

    // Catches uncaught exceptions
    process.on('uncaughtException', callback);
}

module.exports = {
    addExitHandler,
};
