#!/usr/bin/env node
/* eslint-disable no-console */

const openurl = require('openurl');
const yargs = require('yargs');

const localtunnel = require('../localtunnel');
const { version } = require('../package');

const { argv } = yargs
  .usage('Usage: st --port [num] <options>')
  .env(true)
  .option('p', {
    alias: 'port',
    describe: 'Internal HTTP server port',
  })
  .option('s', {
    alias: 'subdomain',
    describe: 'Request this subdomain',
  })
  .option('pass', {
    alias: 'password',
    describe: 'Request the subdomain with password',
  })
  .option('sv', {
    alias: 'save',
    describe: 'Save the requested password',
  })
  .options('o', {
    alias: 'open',
    describe: 'Opens the tunnel URL in your browser',
  })
  .option('print-requests', {
    describe: 'Print basic request info',
  })
  .require('port')
  .require('subdomain')
  .boolean('print-requests')
  .help('help', 'Show this help and exit')
  .version(version);

if (typeof argv.port !== 'number') {
  console.error('\nInvalid argument: `port` must be a number');
  process.exit(1);
}

if (typeof argv.subdomain !== 'string') {
  console.error('\nInvalid argument: `subdomain` must be a string');
  process.exit(1);
}

(async () => {
  const tunnel = await localtunnel({
    port: argv.port,
    subdomain: argv.subdomain,
    password: argv.password,
    save: argv.save,
  }).catch(err => {
    console.log(err.message);
    process.exit(1);
  });

  tunnel.on('error', err => {
    console.log(err.message);
    process.exit(1);
  });

  if(tunnel.url){
    console.log('your url is: %s', tunnel.url);
  }

  /**
   * `cachedUrl` is set when using a proxy server that support resource caching.
   * This URL generally remains available after the tunnel itself has closed.
   * @see https://github.com/localtunnel/localtunnel/pull/319#discussion_r319846289
   */
  if (tunnel.cachedUrl) {
    console.log('your cachedUrl is: %s', tunnel.cachedUrl);
  }

  if (argv.open) {
    openurl.open(tunnel.url);
  }

  if (argv['print-requests']) {
    tunnel.on('request', info => {
      console.log(new Date().toString(), info.method, info.path);
    });
  }
})();
