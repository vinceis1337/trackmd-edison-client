/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
// Leave the above lines for propper jshinting
//Type Node.js Here :)
var request = require('request'); //http request library

var url = "http://62850736.ngrok.io";
var endpoint = "/rfid";
var awaitUser = false;
var awaitItem = false;
var writeMode = process.env.writeMode;
console.log("writeMode: " + writeMode);

var mraa = require ('mraa');
var LCD  = require ('jsupm_i2clcd');
var myLCD = new LCD.Jhd1313m1(6, 0x3E, 0x62);

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
                            reader.transmit(leData, 40, protocol, function(err, data) {
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
                        reader.transmit(new Buffer([0xFF, 0xCA, 0x00, 0x00, 0x00]), 40, protocol, function(err, data) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('Serial Number Data received', data);
                                //add hex error handling here
                                var trimmedSerialNumberResponse = data.slice(0, data.length - 2).toString('hex');
                                console.log('Trimming extraneous data', trimmedSerialNumberResponse);
                                postToServer({"rfid": trimmedSerialNumberResponse});
                                reader.close();
                                pcsc.close();
                                
                                var lcdMessage = "Herp Derp";
                                myLCD.setCursor(0,1);
                                console.log(lcdMessage); 
                                myLCD.write(lcdMessage);
                            }
                        });
                        //data must be explicitly written in all bytes requested (fifth buffer hex byte) or the read request will fail
//                        reader.transmit(new Buffer([0xFF, 0xB0, 0x00, 0x04, 0x04]), 40, protocol, function(err, data) {
//                            if (err) {
//                                console.log(err);
//                            } else {
//                                console.log('Read/Write Data received', data);
//                                console.log('Trimming extraneous data', data.slice(0, data.length - 2));
//                                reader.close();
//                                pcsc.close();
//                            }
//                        });
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
    var combinedUrl = url + endpoint;
    request.post(
        combinedUrl,
        {
            json: true,
            body: jsonObject,
        },
        function(error, response, body) {
            if (error) {
                console.log("Error posting? Is server functioning?");
                console.log("Error: " + error);
            }
//            console.log(response);
            //show response on LED screen?
            console.log("Sent Json Object: " + JSON.stringify(jsonObject))  ;
        }
    );
}

function processRFID(data, callback) {
    var rfidObject;
    
    rfidObject.push({"ID" : data.id});
    rfidObject.push({"data" : data.data});
    
    callback(rfidObject);
}