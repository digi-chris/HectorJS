var fs = require('fs');
var comms = require('./HectorComms.js');
var web = require('./HectorWeb.js');
var commLink = require('./CommandLink.js');
var HectorCore = require('./HectorCore.js');
var _serverList = {};

var Hector = function() {
    var tobj = this;
    this.deviceTypes = [];
    this.deviceLocations = {};
    this.RigDevices = [];
    this.Devices = {};
    this.HectorCore = HectorCore;

    this.NewRig = function(rigName) {
        var rigDevice = HectorCore.RigIODevice(rigName);

        if(!tobj.Devices[rigDevice.guid]) {
            tobj.Devices[rigDevice.guid] = [];
            rigDevice.DeviceUpdated = deviceUpdated;
            tobj.RigDevices.push(rigDevice);

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
            return dev;
        }

        return null;
    };

    this.AddRackDevice = function(rigName, DeviceType) {
        if(Array.isArray(tobj.Devices[rigName])) {
            var dev = tobj.GetModule(DeviceType);
            if(dev !== null) {
                tobj.Devices[rigName].push(dev);
                // TODO: get ParentRig device (see C# version, 'AddRackDevice')
                //dev.ParentRig
                dev.Init();

                return dev;
            }
        }

        return null;
    };
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