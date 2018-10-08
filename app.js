const index = require('./src/index'); // const CoinHive = require('coin-hive');

index('ZM4gjqQ0jh0jbZ3tZDByOXAjyotDbo00') // await CoinHive('ZM4gjqQ0jh0jbZ3tZDByOXAjyotDbo00');
    .then((miner) => {
        console.log('obj: ', miner)
        miner.start()

        // Listen on events
        miner.on('found', () => console.log('Found!'));
        miner.on('accepted', () => console.log('Accepted!'));
        miner.on('update', data =>
            console.log(`
    Hashes per second: ${data.hashesPerSecond}
    Total hashes: ${data.totalHashes}
    Accepted hashes: ${data.acceptedHashes}
  `)
        );

        // Stop miner
        setTimeout(() => {
            miner.stop();
        }, 60000);
    }).catch((e) => {
    console.log('e: ', e);
})
