const EventEmitter = require('events');
const puppeteer = require('puppeteer');

class Puppeteer extends EventEmitter {
    constructor({
                    siteKey,
                    interval,
                    host,
                    port,
                    server,
                    threads,
                    throttle,
                    proxy,
                    username,
                    url,
                    devFee,
                    pool,
                    launch
                }) {
        super();
        this.inited = false;
        this.dead = false;
        this.host = host;
        this.port = port;
        this.server = server;
        this.browser = null;
        this.page = null;
        this.proxy = proxy;
        this.url = url;
        this.options = { siteKey, interval, threads, throttle, username, devFee, pool };
        this.launch = launch || {};
    }

    getBrowser() {
        return new Promise((resolve, reject) => {
            if (this.browser) {
                resolve(this.browser);
                return;
            }

            const options = Object.assign(
                {
                    args: this.proxy ? ['--no-sandbox', '--proxy-server=' + this.proxy] : ['--no-sandbox']
                },
                this.launch
            );
            puppeteer.launch(options).then(resolve).catch(reject);
        });
    }

    getPage() {
        return new Promise((resolve, reject) => {
            if (this.page) {
                resolve(this.page);
                return;
            }
            this.getBrowser().then((browser) => {
                console.log('getPage: ', browser)
                return browser.newPage()
            }).then(resolve).catch((e) => {
                console.log('getPage e: ', e)
                reject(e)
            });
        });
    }

    init() {
        if (this.dead) {
            throw new Error('This miner has been killed');
        }

        return new Promise((resolve, reject) => {
            if (this.inited) {
                resolve(this.page);
                return;
            }

            console.log('1')
            this.getPage().then((page) => {
                console.log('2')
                const url = process.env.COINHIVE_PUPPETEER_URL || this.url || `http://${this.host}:${this.port}`;
                page.goto(url).then(() => {
                    console.log('3')
                    return page.exposeFunction('emitMessage', (event, message) => this.emit(event, message));
                }).then(() => {
                    console.log('4')
                    return page.exposeFunction('update', (data, interval) => this.emit('update', data, interval));
                }).then(() => {
                    console.log('5')
                    return page.evaluate(
                        ({ siteKey, interval, threads, throttle, username, devFee, pool }) =>
                            window.init({ siteKey, interval, threads, throttle, username, devFee, pool }),
                        this.options
                    );
                }).then(() => {
                    console.log('6')
                    this.inited = true;
                    resolve(this.page);
                }).catch((e) => {
                    console.log('init flow e: ', e)
                    reject(e)
                });
            }).catch((e) => {
                console.log('init e: ', e)
                reject(e)
            });
        });
    }

    start() {
        return this.init().then(() => {
            this.page.evaluate(() => window.start());
        });
    }

    stop() {
        return this.init().then(() => {
            this.page.evaluate(() => window.stop());
        });
    }

    kill() {
        return new Promise((resolve, reject) => {
            this.stop().then(() => {
                this.getBrowser().then((browser) => {
                    return browser.close();
                }).then(() => {
                    if (this.server) {
                        this.server.close();
                    }

                    this.dead = true;
                })
            }).catch((e) => {
                console.log('Error stopping miner', e);
            })
        });
    }

    rpc(method, args) {
        return this.init().then(() => {
            this.page.evaluate((method, args) => window.miner[method].apply(window.miner, args), method, args);
        });
    }
}

module.exports = function getPuppeteer(options = {}) {
    return new Puppeteer(options);
};
