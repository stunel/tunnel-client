/* eslint-disable consistent-return, no-underscore-dangle */

const { parse } = require('url');
const { EventEmitter } = require('events');
const axios = require('axios');
const debug = require('debug')('localtunnel:client');
var fs = require('fs');

const TunnelCluster = require('./TunnelCluster');

module.exports = class Tunnel extends EventEmitter {
  constructor(opts = {}) {
    super(opts);
    this.opts = opts;
    this.closed = false;
    this.opts.host = 'https://stunel.io';
  }

  _getInfo(body) {
    /* eslint-disable camelcase */
    const { id, ip, port, url, cached_url, max_conn_count } = body;
    const { host, port: local_port } = this.opts;
    return {
      name: id,
      url,
      cached_url,
      max_conn: max_conn_count || 1,
      remote_host: parse(host).hostname,
      remote_ip: ip,
      remote_port: port,
    };
    /* eslint-enable camelcase */
  }

  // initialize connection
  // callback with connection info
  _init(cb) {
    const opt = this.opts;
    const getInfo = this._getInfo.bind(this);

    const params = {
      responseType: 'json',
    };

    //read the pass file
    let pass = opt.password || this.readPass()

    if(opt.password && opt.save){
      this.writePass(opt.password)
    }

    if(pass == null || pass == ""){
      pass = this.makePass(10)
      this.writePass(pass)
    }

    console.log("your password is: " + pass)

    const baseUri = `${opt.host}/`;
    // no subdomain at first, maybe use requested domain
    const assignedDomain = opt.subdomain;
    // where to quest
    const uri = baseUri + assignedDomain + '/' + pass;

    (function getUrl() {
      axios
        .get(uri, params)
        .then(res => {
          const body = res.data;
          debug('got tunnel information', res.data);
          if (res.status !== 200) {
            const err = new Error(
              (body && body.message) || 'localtunnel server returned an error, please try again'
            );
            return cb(err);
          }
          cb(null, getInfo(body));
        })
        .catch(err => {
          if(err.response.status == 403){
            console.log(`\ntunnel server error: ${err.response.data.message || err.message}`);
          }
          else{
            return setTimeout(getUrl, 5000);
          }
        });
    })();
  }

  _establish(info) {
    // increase max event listeners so that localtunnel consumers don't get
    // warning messages as soon as they setup even one listener. See #71
    this.setMaxListeners(info.max_conn + (EventEmitter.defaultMaxListeners || 10));

    this.tunnelCluster = new TunnelCluster(info);

    // only emit the url the first time
    this.tunnelCluster.once('open', () => {
      this.emit('url', info.url);
    });

    // re-emit socket error
    this.tunnelCluster.on('error', err => {
      debug('got socket error', err.message);
      this.emit('error', err);
    });

    let tunnelCount = 0;

    // track open count
    this.tunnelCluster.on('open', tunnel => {
      tunnelCount++;
      debug('tunnel open [total: %d]', tunnelCount);

      const closeHandler = () => {
        tunnel.destroy();
      };

      if (this.closed) {
        return closeHandler();
      }

      this.once('close', closeHandler);
      tunnel.once('close', () => {
        this.removeListener('close', closeHandler);
      });
    });

    // when a tunnel dies, open a new one
    this.tunnelCluster.on('dead', () => {
      tunnelCount--;
      debug('tunnel dead [total: %d]', tunnelCount);
      if (this.closed) {
        return;
      }
      this.tunnelCluster.open();
    });

    this.tunnelCluster.on('request', req => {
      this.emit('request', req);
    });

    // establish as many tunnels as allowed
    for (let count = 0; count < info.max_conn; ++count) {
      this.tunnelCluster.open();
    }
  }

  open(cb) {
    this._init((err, info) => {
      if (err) {
        return cb(err);
      }

      this.clientId = info.name;
      this.url = info.url;

      // `cached_url` is only returned by proxy servers that support resource caching.
      if (info.cached_url) {
        this.cachedUrl = info.cached_url;
      }

      this._establish(info);
      cb();
    });
  }

  close() {
    this.closed = true;
    this.emit('close');
  }

  readPass() {
    try{
      return fs.readFileSync(__dirname + '/pass.txt', {encoding:'utf8', flag:'r'});
    }
    catch(err){
      
    }
  }

  writePass(content) {
    fs.writeFile(__dirname + '/pass.txt', content, err => {
      if (err) {
        return false;
      }
      return true;
    });
  }
  
  makePass(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;

    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
};
