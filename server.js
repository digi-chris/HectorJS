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
                                    //rackDevice.Options[optionName].SetValue(dev.Options[optionName].Value);
                                }
                                for(var cIndex = 0; cIndex < dev.Connections.length; cIndex++) {
                                    rackDevice.Connections[cIndex].ChangeGuid(dev.Connections[cIndex].guid);
                                }
                            }
                            // now add connections
                            for(var i = 0; i < devices.length; i++) {
                                var dev = devices[i];
                                for(var cIndex = 0; cIndex < dev.Connections.length; cIndex++) {
                                    if(dev.Connections[cIndex].ConnectedTo) {
                                        console.log(dev.Connections[cIndex].guid + ' connected to ' + dev.Connections[cIndex].ConnectedTo.guid);
                                        tobj.Connect(dev.Connections[cIndex].guid, dev.Connections[cIndex].ConnectedTo.guid);
                                    }
                                }
                            }
                            //console.log(devices);
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
                if(fromConn.FrameType === toConn.FrameType) {
                    fromConn.ConnectedTo = toConn;
                    return true;
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
