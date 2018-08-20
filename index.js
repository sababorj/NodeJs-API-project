/*
 * This is the primary file for API
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');

// Create http server
const httpServer = http.createServer((req,res) => {
    unifiedServer(req,res);
});

// Start http server
httpServer.listen(config.httpPort, () => {
    console.log('Server is now listening to the port '+config.httpPort+ ' in ' +config.name.toLowerCase()+ ' mode.');
});

// Create https server
const security = {
    'key' : fs.readFileSync('./certs/key.pem'),
    'cert' : fs.readFileSync('./certs/cert.pem')
};
const httpsServer = https.createServer(security, (res,req) => {
    unifiedServer(req,res);
});

// Start https server
httpsServer.listen(config.httpsPort, () =>{
    console.log('Server is now listening to the port '+config.httpsPort+ ' in ' +config.name.toLowerCase()+ ' mode.');
});

// Server logic for both http and https types
const unifiedServer = function(req,res){
    // Get and parse URL
    const parsedUrl = url.parse(req.url,true);

    // Get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query string object
    const parsedQueryObj = parsedUrl.query;

    // Get the method
    const method = req.method.toLowerCase();

    // Get headers
    const header = req.headers;

    // Get data, if any
    const decoder = new stringDecoder('utf-8');
    let buffer = '';
    req.on('data', async (data) => {
        buffer += await decoder.write(data);
    });
    req.on('end', async() => {
        buffer += await decoder.end();

        // Chose a handler the request should go to
        const chosenHandler = await typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // construct the data object
        const data = await {
            'trimmedPath' : trimmedPath,
            'queryString' : parsedQueryObj,
            'method' : method,
            'headers' : header,
            'payload' : buffer
        };

        // route the request to the hander
        chosenHandler(data, async(status,payload) => {
            status = await typeof(status) === 'number' ? status : 200;
            payload = await typeof(payload) === 'object' ? payload : {};
            let payloadString = await JSON.stringify(payload);

            // send the respond
            await res.writeHead(status);
            await res.end(payloadString);

            // Log the response
            console.log('Returning this response: ', status, payloadString);
        });
    });
};

// Define the handlers
let handlers = {};
handlers.sample = (data, callback) => {
    callback(406,{'name' : 'Sample handler'});
};
handlers.notFound = (data, callback) => {
    callback(404);
};

// Define a request router
const router = {
    'sample' : handlers.sample
};