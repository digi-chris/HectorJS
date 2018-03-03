var leb = require('leb');
var BSON = require('bson');
var net = require('net');
var stringifier = require('stringifier');
var fs = require('fs');
var util = require('util');
var comms = require('./HectorComms.js');
var web = require('./HectorWeb.js');
var commLink = require('./CommandLink.js');
var HectorCore = require('./HectorCore.js');
var _serverList = {};

function jsonReplacer(key, value) {
  if(key.startsWith("_") && !key.startsWith("__")) {
    return undefined;
  } else {
    return value;
  }
}

var inputConnection = net.createServer(function(socket) {
    var buf = new BufferReader();
    var reading = false;

    socket.on('data', function(data) {
        //console.log('DATA');
        //console.log(data);
        buf.AddBuffer(data);

        socket.write('OK');
        //console.log('OK');
        
        if(!reading) {
            findHeader(() => {
                console.log('Header start found');
                var guid = buf.ReadBytes(16);
                var frameType = buf.ReadString();
                var framePosition = buf.ReadUint32();
                var frameLength = buf.ReadUint32();
                var dataLength = buf.ReadUint32();

                console.log(guid);
                console.log(frameType, framePosition, frameLength, dataLength);
                //buf.DecodeBSON();

                buf.ReadBytesAsync(frameLength, (byteArray) => {
                    console.log('Got BSON');
                    //console.log(byteArray);

                    // TODO: This creates a copy - share the memory instead? Quicker?
                    var buffer = Buffer.from(byteArray);
                    var bson = new BSON();
                    var frame = bson.deserialize(buffer);
                    console.log(frame);

                    buf.ReadBytesAsync(dataLength, (byteArray) => {
                        console.log('Got frame data.');
                        fs.writeFile('test.rgb', new Uint8Array(byteArray), (err) => {
                            if(err) {
                                console.log(err);
                            } else {
                                console.log('saved to disc.');
                                var VideoDecode = new omx.VideoDecode();
                                var VideoRender = new omx.VideoRender();
                                omx.Component.initAll([VideoDecode, VideoRender])
                                        .then(function () {
                                          VideoDecode.setVideoPortFormat(omx.VIDEO_CODINGTYPE.VIDEO_CodingVendorStartUnused);
                                          fs.createReadStream("test.rgb")
                                                  .pipe(VideoDecode)
                                                  .pipe(VideoRender)
                                                  .on('finish', function () {
                                                    console.log("Done");
                                                    process.exit();
                                                  });
                                        });
                            }
                        });
                    });
                });
            });
        }
    });

    function findHeader(callback) {
        reading = true;
        var matchString = "HCTR";
        var gotString = "";
        while(buf.Length > 0) {
            var nextChar = buf.ReadChar();
            console.log('Next char: ' + nextChar);
            if(gotString + nextChar == matchString.substring(0, gotString.length + 1)) {
                gotString += nextChar;
            }

            if(gotString === matchString) {
                console.log(gotString);
                callback();
                return;
            }
        }
    }
});

class BufferReader {
    // implements forward-only reading of multiple buffers
    constructor() {
        this.Buffers = [];
        this.ReadPos = 0;
        this.Length = 0;
        this.ReadBytesCallbacks = [];
    }

    AddBuffer(buf) {
        this.Buffers.push(buf);
        this.Length += buf.length;

        // check if any ReadBytes methods are waiting for more data
        // TODO: This should be implemented across all functions, currently it only works with ReadBytesAsync
        //       Also, it doesn't operate asynchronously here, but could do if we could ensure no clashing with future AddBuffer events
        while(this.ReadBytesCallbacks.length > 0) {
            var bytes = this.ReadBytes(this.ReadBytesCallbacks[0].Length);
            if(bytes === null) {
                break;
            } else {
                this.ReadBytesCallbacks.shift().Callback(bytes);
            }
        }
    }

    CheckBuffers() {
        if(this.ReadPos === this.Buffers[0].length) {
            // we need to advance to the next buffer
            this.Buffers.shift();
            this.ReadPos = 0;
        }

        var byteLength = 0;
        for(var i = 0; i < this.Buffers.length; i++) {
            byteLength += this.Buffers[i].length;
        }
        byteLength -= this.ReadPos;
        this.Length = byteLength;
    }

    ReadChar() {
        if(this.Buffers.length === 0) {
            return null;
        } else {
            var char = this.Buffers[0].toString('utf8', this.ReadPos, this.ReadPos + 1);
            this.ReadPos++;
            this.CheckBuffers();
            //console.log('READCHAR: ' + char);
            return char;
        }
    }

    ReadByte() {
        if(this.Buffers.length === 0) {
            return null;
        } else {
            var byte = this.Buffers[0].readUInt8(this.ReadPos);
            this.ReadPos++;
            this.CheckBuffers();
            return byte;
        }
    }

    ReadUint32() {
        if(this.Length > 3) {
            /*var bytes = [];
            for(var i = 0; i < 4; i++) {
                bytes.push(this.ReadByte());
            }
            var uint = new Uint32Array(bytes)[0];*/
            var uint = this.Buffers[0].readUInt32LE(this.ReadPos);
            this.ReadPos += 4;
            this.CheckBuffers();
            //this.ReadPos--;
            return uint;
        } else {
            return null;
        }
    }

    ReadUint16() {
        if(this.Length > 1) {
            var bytes = [];
            bytes.push(this.ReadByte());
            bytes.push(this.ReadByte());
            var uint = new Uint16Array(bytes)[0];
            return uint;
        } else {
            return null;
        }
    }

    ReadULEB() {
        if(this.Length > 0) {
            var decoded = leb.decodeUInt32(this.Buffers[0], this.ReadPos);
            console.log('Decoded:');
            console.log(decoded.value);
            console.log(decoded.nextIndex);
            this.ReadPos = decoded.nextIndex;
            return decoded.value;
        }
    }

    ReadString() {
        // length-prefixed string
        var length = this.ReadULEB();
        console.log("ReadString length = " + length);
        if(length !== null) {
            //this.ReadPos -= 1;
            var string = "";
            for(var i = 0; i < length; i++) {
                string += this.ReadChar();
            }
            console.log(string.length);
            return string;
        } else {
            return null;
        }
    }

    ReadBytes(length) {
        if(this.Length > length - 1) {
            var bytes = [];
            for(var i = 0; i < length; i++) {
                bytes.push(this.ReadByte());
            }
            return bytes;
        } else {
            return null;
        }
    }

    ReadBytesAsync(length, callback) {
        process.nextTick(() => {
            if(this.Length > length - 1) {
                var bytes = [];
                for(var i = 0; i < length; i++) {
                    bytes.push(this.ReadByte());
                }
                callback(bytes);
            } else {
                // not enough bytes, so we need to store this up until we have enough bytes
                this.ReadBytesCallbacks.push({ Length: length, Callback: callback });
            }
        });
    }

    /*DecodeBSON() {
        var bson = new BSON();
        var docs = [];
        bson.deserializeStream(this.Buffers[0], this.ReadPos, 1, docs, 0);
        console.log(docs[0]);
    }*/
}

inputConnection.listen(3001);

function copyObject(obj, depth, count) {
  if(isNaN(count)) count = 0;
  var newObj = {};
  for(n in obj) {
    if(typeof obj[n] != "object") {
      if(Array.isArray(obj[n])) {
        newObj[n] = [];
        for(item of obj[n]) {
          newObject[n].push(copyObject(item));
        }
      } else {
        newObj[n] = obj[n];
      }
    } else {
      if(count < depth) {
        newObj[n] = copyObject(obj[n], depth, count + 1);
      }
    }
  }
  return newObj;
}

var Hector = function() {
    var tobj = this;
    this.deviceTypes = [];
    this.deviceLocations = {};
    this.RigDevices = [];
    this.Devices = {};
    this.HectorCore = HectorCore;

    this.SaveAll = function() {
       fs.writeFile('devices.json', JSON.stringify(this.Devices, jsonReplacer), 'utf8');
       fs.writeFile('rigs.json', JSON.stringify(this.RigDevices, jsonReplacer), 'utf8');
    };

    this.LoadAll = function() {
        fs.readFile('devices.json', 'utf8', function(err, contents) {
            if(err) {
                console.log(err);
            } else {
                var dList = JSON.parse(contents);
                fs.readFile('rigs.json', 'utf8', function(err, contents) {
                    if(err) {
                        console.log(err);
                    } else {
                        var rList = JSON.parse(contents);
                        for(rDevice of rList) {
                            // TODO: All GUIDs should persist at reload
                            var rigDevice = tobj.NewRig(rDevice.Name);
                            var devices = dList[rDevice.guid];
                            for(var i = 0; i < devices.length; i++) {
                                var dev = devices[i];
                                console.log(dev.Name + " (" + dev.DeviceType + ")");
                                //console.log(dev);
                                var rackDevice = tobj.AddRackDevice(rigDevice.guid, dev.DeviceType);
                                rackDevice.ChangeGuid(dev.guid);
                                rackDevice.Init();
                                for(optionName in dev.Options) {
                                    if(dev.Options[optionName].DataType === 'list') {
                                        rackDevice.SetOption(optionName, dev.Options[optionName].Data[dev.Options[optionName].Value]);
                                    } else {
                                        rackDevice.SetOption(optionName, dev.Options[optionName].Value);
                                    }
                                    rackDevice.Options[optionName].Public = dev.Options[optionName].Public;
                                    //rackDevice.Options[optionName].SetValue(dev.Options[optionName].Value);
                                }
                                
                                for(var cIndex = 0; cIndex < dev.Connections.length; cIndex++) {
                                    // TODO: We have a pretty bad problem with modules adding
                                    // new connections and therefore ending up out-of-sync
                                    // with a saved device. This needs to be sorted out.
                                    rackDevice.Connections[cIndex].ChangeGuid(dev.Connections[cIndex].guid);
                                    if(dev.Connections[cIndex].Public) {
                                        rackDevice.Connections[cIndex].Public = true;
                                    }
                                }
                            }
                            
                            /*// now add connections
                            for(var i = 0; i < devices.length; i++) {
                                var dev = devices[i];
                                for(var cIndex = 0; cIndex < dev.Connections.length; cIndex++) {
                                    if(dev.Connections[cIndex].ConnectedTo) {
                                        console.log(dev.Connections[cIndex].guid + ' connected to ' + dev.Connections[cIndex].ConnectedTo.guid);
                                        tobj.Connect(dev.Connections[cIndex].guid, dev.Connections[cIndex].ConnectedTo.guid);
                                    }
                                }
                            }*/
                        }

                        // now add connections
                        for(rDevice of rList) {
                            var devices = dList[rDevice.guid];
                            for(var i = 0; i < devices.length; i++) {
                                var dev = devices[i];
                                for(var cIndex = 0; cIndex < dev.Connections.length; cIndex++) {
                                    if(dev.Connections[cIndex].ConnectedTo) {
                                        console.log(dev.Connections[cIndex].guid + ' connected to ' + dev.Connections[cIndex].ConnectedTo.guid);
                                        tobj.Connect(dev.Connections[cIndex].guid, dev.Connections[cIndex].ConnectedTo.guid);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    };

    this.Connect = function(fromConnectionGuid, toConnectionGuid) {
        if(tobj.HectorCore.AllConnections) {
            var fromConn = tobj.HectorCore.AllConnections[fromConnectionGuid];
            if(toConnectionGuid === '') {
                fromConn.ConnectedTo = null;
                return true;
            } else {
                var toConn = tobj.HectorCore.AllConnections[toConnectionGuid];
                // TODO: See more matching statements in the C# version of this code.
                if(toConn) {
                    if(fromConn.FrameType === toConn.FrameType) {
                        fromConn.ConnectedTo = toConn;
                        return true;
                    }
                }
            }
        }
        return false;
    };

    this.NewRig = function(rigName) {
        var rigDevice = HectorCore.RigIODevice(rigName);

        if(!tobj.Devices[rigDevice.guid]) {
            tobj.Devices[rigDevice.guid] = [];
            rigDevice.DeviceUpdated = deviceUpdated;
            rigDevice.OptionUpdated = optionUpdated;
            tobj.RigDevices.push(rigDevice);
            rigDevice.SetDeviceList(tobj.Devices[rigDevice.guid]);

            return rigDevice;
        } else {
            return null;
        }
    };

    this.GetModule = function(deviceType) {
        if(tobj.deviceLocations[deviceType]) {
            var dev = require(tobj.deviceLocations[deviceType])[deviceType]();
            dev.DeviceType = deviceType;
            dev.ConnectionUpdated = connUpdated;
            dev.DataArrived = dataArrived;
            dev.DeviceUpdated = deviceUpdated;
            dev.OptionUpdated = optionUpdated;
            return dev;
        }

        return null;
    };

    this.GetRigDevice = function(rigName) {
        for(var i = 0; i < tobj.RigDevices.length; i++) {
            if(tobj.RigDevices[i].guid === rigName) {
                return tobj.RigDevices[i];
            }
        }
        return null;
    };

    this.AddRackDevice = function(rigName, DeviceType) {
        if(Array.isArray(tobj.Devices[rigName])) {
            var dev = tobj.GetModule(DeviceType);
            if(dev !== null) {
                tobj.Devices[rigName].push(dev);
                dev._parentRig = tobj.GetRigDevice(rigName);
                dev.Init();

                return dev;
            }
        }

        return null;
    };

    this.RemoveRackDevice = function(deviceGuid) {
        for(var rackName in tobj.Devices) {
            if(Array.isArray(tobj.Devices[rackName])) {
                var devices = tobj.Devices[rackName];
                for(var i = 0; i < devices.length; i++) {
                    if(devices[i].guid === deviceGuid) {
                        console.log('found ' + deviceGuid);
                        // we found the device, now disconnect any connections
                        for(var j = 0; j < devices[i].Connections.length; j++) {
                            if(devices[i].Connections[j].ConnectedTo !== null) {
                                console.log('Removing TO connection ' + devices[i].Connections[j].guid);
                                devices[i].Connections[j].ConnectedTo = null;
                            }
                        }

                        //console.log('DEVICE ==============');
                        //console.log(devices[i]);
                        for(var connGuid in HectorCore.AllConnections) {
                            if(HectorCore.AllConnections[connGuid] !== null) {
                                //console.log("Looking at:");
                                //console.log(HectorCore.AllConnections[j].ConnectedTo._parentDevice);
                                if(HectorCore.AllConnections[connGuid].ConnectedTo) {
                                    if(HectorCore.AllConnections[connGuid].ConnectedTo._parentDevice === devices[i]) {
                                        console.log('Removing FROM connection ' + HectorCore.AllConnections[connGuid].guid);
                                        HectorCore.AllConnections[connGuid].ConnectedTo = null;
                                    }
                                }
                            }
                        }

                        var device = devices[i];

                        // remove the device from the device list
                        devices.splice(i, 1);

                        // destroy the device
                        device.Shutdown();

                        hectorGCP.SendMessage("DeviceRemoved", [deviceGuid]);
                        return;
                    }
                }
            }
        }
    };

    this.LoadAll();
};

var h = new Hector();

var connUpdated = function(connection) {
    //console.log('ConnUpdated fired.');
    hectorGCP.SendMessage("ConnectionUpdate", [connection]);
};

var dataArrived = function(connection) {
    //console.log('dataArrived fired.');
    hectorGCP.SendMessage("ConnectionOpen", [connection]);
};

var deviceUpdated = function(device, updateInfo) {
    hectorGCP.SendMessage("DeviceUpdate", [device, updateInfo]);
};

var optionUpdated = function(option) {
    hectorGCP.SendMessage("OptionUpdate", [option]);
};

function ScanDevices(path) {
    fs.readdir(path, function(err, items) {
        if(err) {
            console.log('Error scanning devices!');
            console.log(err);
        } else {
            for (var i = 0; i < items.length; i++) {
                //console.log(items[i]);
                ScanModuleDirectory(path + items[i]);
            }
        }
    });
}

function ScanModuleDirectory(path) {
    fs.stat(path, (err, stats) => {
        if(err) {
            console.log('Error scanning device directory!');
            console.log(err);
        } else {
            if(stats.isDirectory()) {
                fs.readdir(path, function(err, items) {
                    if(err) {
                        console.log('Error scanning device directory!');
                        console.log(err);
                    } else {
                        for (var i = 0; i < items.length; i++) {
                            CheckModuleFile(path + '/' + items[i]);
                        }
                    }
                })
            }
        }
    });
}

function CheckModuleFile(path) {
    fs.stat(path, (err, stats) => {
        if(err) {
            console.log('Error checking module file ' + path + '!');
            console.log(err);
        } else {
            if(!stats.isDirectory()) {
                if(path.toLowerCase().endsWith('.js')) {
                    console.log(path);
                    var module = require(path);
                    for(var obj in module) {
                        console.log(obj);
                        h.deviceTypes.push(obj);
                        h.deviceLocations[obj] = path;
                    }
                }
            }
        }
    });
}

ScanDevices('./modules/');

function checkConnections() {
    //console.log('checkConnections', HectorCore.AllConnections);
    for(var obj in HectorCore.AllConnections) {
        var conn = HectorCore.AllConnections[obj];
        //console.log(Date.now(), conn.LastUpdate, conn.HasData);
        if(!conn.HasData && conn.LastUpdate > Date.now() - 200) {
            conn.HasData = true;
            hectorGCP.SendMessage("ConnectionOpen", [conn]);
        } else if(conn.HasData && conn.LastUpdate < Date.now() - 200) {
            conn.HasData = false;
            hectorGCP.SendMessage("ConnectionClosed", [conn]);
        }
    }
}

setInterval(checkConnections, 200);

/*
function createDummyDevice(deviceName) {
    var device = new HectorCore.IODevice();
    device.Name = deviceName;

    var opt = new HectorCore.IOOption("trigger", 0, device, 'button');
    device.Options.ButtonTest = opt;

    var connInput = new HectorCore.IOConnection(device);
    connInput.ConnType = 1;
    connInput.Name = "In";
    connInput.OnFrameArrived = function(frame) {
        console.log('Frame arrived on input.', frame);
    };

    var connOutput = new HectorCore.IOConnection(device);
    connOutput.ConnType = 0;
    connOutput.Name = "Out";

    device.Connections.push(connInput);
    device.Connections.push(connOutput);

    device.ConnectionUpdated = connUpdated;

    connInput.DataArrived = dataArrived;
    connOutput.DataArrived = dataArrived;
    //connOutput.ConnectionUpdated = connUpdated;


    var sendCount = 0;
    setInterval(function() {
        connOutput.FrameArrived( sendCount, false );
        sendCount++;
    }, 1000);
    return device;
}

h.RigDevices.push(createDummyDevice('Test 1'));
h.RigDevices.push(createDummyDevice('Test 2'));
*/

var cLink = new commLink.CommandLink(h);

var heartbeatServer = new comms.Heartbeat(9999, function(heartbeat) {
    //console.log(heartbeat.ServerName);
    if(!_serverList[heartbeat.ServerName]) {
        console.log('New server found - ' + heartbeat.ServerName);
    }
    _serverList[heartbeat.ServerName] = heartbeat;
});;

//var hectorServer = new comms.Server(1001, cLink);
var hectorGCP = new comms.GCPServer(cLink);
var hectorWebServer = new web.WebServer(8080);
