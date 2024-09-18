const Net = require('net');

const client_cmd = new Net.Socket();

client_cmd.connect(77, "localhost", function() {
            client_cmd.write('{"MSG":"ORDER_SEND","PRICE":1.1129,"TP":1.1150,"SL":1.1100,"SYMBOL":"EURUSD","VOLUME":0.02,"TYPE":"ORDER_TYPE_BUY_LIMIT"}' + '\r\n');
});

client_cmd.on('data', function(chunk) {
            console.log(`${chunk.toString()}`);
            client_cmd.end();
});