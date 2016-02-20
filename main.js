/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
// Leave the above lines for propper jshinting
//Type Node.js Here :)
var request = require('request'); //http request library

var url = "server url goes here";
var awaitUser = false;
var awaitItem = false;
var writeMode = process.env.writeMode;
console.log("writeMode: " + writeMode);

var pcsc = require('pcsclite'); //pcsclite handler for communicating with nfc reader
 
var pcsc = pcsc();
pcsc.on('reader', function(reader) {
 
    console.log('New reader detected', reader.name);
 
    reader.on('error', function(err) {
        console.log('Error(', this.name, '):', err.message);
    });
 
    reader.on('status', function(status) {
        console.log('Status(', this.name, '):', status);
        /* check what has changed */
        var changes = this.state ^ status.state;
        if (changes) {
            if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
                console.log("card removed");/* card removed */
                reader.disconnect(reader.SCARD_LEAVE_CARD, function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Disconnected');
                    }
                });
            } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
                console.log("card inserted");/* card inserted */
                reader.connect({ share_mode : this.SCARD_SHARE_SHARED }, function(err, protocol) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (writeMode == "true") {
                            var leData = new Buffer([0xFF, 0xD6, 0x00, 0x04, 0x04, 0x68, 0x61, 0x63, 0x6b]);
                            reader.transmit(leData, 2, protocol, function(err, data) {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    console.log("wrote hack to memory..?");
                                    console.log("Data: " + leData);
                                }
                            });
                        }
                        console.log('Protocol(', reader.name, '):', protocol);
                        reader.transmit(new Buffer([0xFF, 0xB0, 0x00, 0x04, 0x04]), 4, protocol, function(err, data) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('Data received', data);
                                reader.close();
                                pcsc.close();
                            }
                        });
                    }
                });
            }
        }
    });
 
    reader.on('end', function() {
        console.log('Reader',  this.name, 'removed');
    });
});
 
pcsc.on('error', function(err) {
    console.log('PCSC error', err.message);
});

function postToServer(jsonObject) {
    request.post(
        url,
        {
            json: true,
            body: jsonObject,
        },
        function(error, response, body) {
            if (error) {
                console.log("Error posting? Is server functioning?");
                console.log("Error: " + error);
            }
            console.log(response);
            //show response on LED screen?
        }
    );
}

function processRFID(data, callback) {
    var rfidObject;
    
    rfidObject.push({"ID" : data.id});
    rfidObject.push({"data" : data.data});
    
    callback(rfidObject);
}