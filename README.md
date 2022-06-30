# localtunnel

localtunnel exposes your localhost to the world for easy testing and sharing! No need to mess with DNS or deploy just to have others test out your changes.

Great for working with browser testing tools like browserling or external api callback services like twilio which require a public url for callbacks.

## Installation

### Globally

```
npm install -g stunel-client
```

## CLI usage

When localtunnel is installed globally, just use the `st` command to start the tunnel.

```
st --port <your port> -s <your subdomain>
```

Thats it! It will connect to the tunnel server, setup the tunnel, and tell you what url to use for your testing. This url will remain active for the duration of your session; so feel free to share it with others for happy fun time!

You can restart your local server all you want, `st` is smart enough to detect this and reconnect once it is back.

### Arguments

Below are some common arguments. See `st --help` for additional arguments

- `--subdomain` request a named subdomain on the localtunnel server (default is random characters)
- `--pass` request a subdomain through a password
- `--save` save the requested password for futher usage
- `--open` open the url in browser after provisioning

## Password protected

You can now request a subdomain with a user defined `password` or the system will generate a password for you and save it in  `/lib/pass.text`, if the `save` option is specified, the user defined password will be saved and used for subsequent subdomain request.
This passworded request will solve the problem of `server refusing to connect your client` which normally occurs when your client disconnects from the server without closing the tunnel. If you request the subdomain with the same password, the server will kill the previous tunnel and provision a new one for you.

You need to run the `st` command as an administrator or with sudo the first time for it to save your password then subsequently you can skip the sudo or administrator mode

```
sudo st --port <your port> --subdomain <your subdomain> --pass <your password>  --save
```

## Original App

See [localtunnel](//github.com/localtunnel) for details of the original opensource project.

## License

MIT
