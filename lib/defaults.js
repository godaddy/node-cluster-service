var os = require("os");

module.exports = exports = {
  firstTime: true,
  events: {},
  workers: {},
  workerProcesses: {},
  state: 0, // 0-not running, 1-starting, 2-running
  isBusy: false,
  isAttached: false, // attached to CLI over REST
  workerReady: undefined,
  restartOnFailure: true,
  net: { servers: {} },
  proxy: {
    configPath: undefined,
    versionPath: undefined,
    options: {
      versionPath: undefined,
      versionHeader: "x-version",
      workerFilename: "worker.js",
      versionPorts: "11000-12000",
      nonDefaultWorkerCount: 1,
      nonDefaultWorkerIdleTime: 3600,
      bindings: [
        /*
         {
           port: 80,
           workerCount: 2,
           redirect: 443
         },
         {
           port: 443,
           workerCount: 2,
           tlsOptions: {
             key: '/my/cert.key',
             cert: '/my/cert.crt'
           }
         }
         */
      ]
    },
    versions: {
    /*
      'versionStr': {
        port: 7112,
        isDefault: false,
        online: false
      }
    */
    }
  },
  options: {
    host: "localhost",
    port: 11987,
    accessKey: undefined,
    workers: undefined,
    workerCount: os.cpus().length,
    restartDelayMs: 100,
    restartConcurrencyRatio: 0.33,
    allowHttpGet: false, // useful for testing -- not safe for production use
    restartsPerMinute: 10, // not yet supported
    cli: false,
    silent: false,
    log: console.log,
    error: console.error,
    debug: console.debug,
    json: false, // output as JSON
    restartOnMemUsage: undefined,
    restartOnUpTime: undefined,
    commands: undefined,
    proxy: undefined,
    workerGid: undefined,
    workerUid: undefined,
    colors: {
      cservice: "grey",
      success: "green",
      error: "red",
      data: "cyan",
      warn: "yellow",
      info: "magenta",
      debug: "grey"
    }
  }
};
