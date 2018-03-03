var fs = require('fs');

var PageBuilder = {
    BuildWebPage: function(data, pagePath, callback) {
        fs.readFile(pagePath, 'utf8', function(err, pluginHTML) {
            if(err) {
                console.log('Error in PageBuilder...');
                console.log(err);
                callback(null);
            } else {
                for(key in data) {
                    //console.log(key, data[key]);
                    pluginHTML = pluginHTML.replace(new RegExp('<%=' + key + '%>', 'g'), data[key]);
                    //if(key === 'fullname') {
                    //    console.log('replacing <%=' + key + '%> with ' + data[key]);
                    //    console.log(pluginHTML);
                    //}
                }

                callback(pluginHTML);
            }
        });
    }
};

module.exports.CommandLink = function(hectorDevice) {
    this.saveAll = function() {
        hectorDevice.SaveAll();
    };

    this.getDeviceNames = function(callback) {
        callback(hectorDevice.deviceTypes);
    };

    this.getRigDevices = function(callback) {
        callback(hectorDevice.RigDevices);
    };

    this.getRackDevices = function(rackName, callback) {
        if(hectorDevice.Devices[rackName]) {
            callback(hectorDevice.Devices[rackName]);
        } else {
            callback(null);
        }
    };

    this.setDeviceName = function(deviceGuid, deviceName) {
        var device = hectorDevice.HectorCore.AllDevices[deviceGuid];
        if(device) {
            console.log('Setting device name to "' + deviceName + '"');
            device.Name = deviceName;
        }
    };

    this.setConnectionPublic = function(connectionGuid, optionPublic, callback) {
        optionPublic = optionPublic + '';
        var setPublic = (optionPublic.toLowerCase() == 'true');
        if(hectorDevice.HectorCore.AllConnections[connectionGuid]) {
            var conn = hectorDevice.HectorCore.AllConnections[connectionGuid];
            conn.Public = setPublic;
            conn._parentDevice._parentRig.DeviceUpdated(conn._parentDevice._parentRig, "ConnectionListChanged");
        }
    };

    this.setOptionPublic = function(optionGuid, optionPublic) {
        optionPublic = optionPublic + '';
        var setPublic = (optionPublic.toLowerCase() == 'true');
        if(hectorDevice.HectorCore.AllOptions[optionGuid]) {
            var opt = hectorDevice.HectorCore.AllOptions[optionGuid];
            opt.Public = setPublic;
            opt._parentDevice._parentRig.DeviceUpdated(opt._parentDevice._parentRig, "OptionListChanged");
        }
    };

    this.removeDeviceFromRack = function(deviceGuid) {
        hectorDevice.RemoveRackDevice(deviceGuid);
    };

    this.connect = function(fromConnectionGuid, toConnectionGuid, callback) {
        callback(hectorDevice.Connect(fromConnectionGuid, toConnectionGuid));
        /* if(hectorDevice.HectorCore.AllConnections) {
            var fromConn = hectorDevice.HectorCore.AllConnections[fromConnectionGuid];
            if(toConnectionGuid === '') {
                fromConn.ConnectedTo = null;
                callback(true);
                return;
            }
            else
            {
                var toConn = hectorDevice.HectorCore.AllConnections[toConnectionGuid];
                // TODO: See more matching statements in the C# version of this code
                if(fromConn.FrameType === toConn.FrameType) {
                    fromConn.ConnectedTo = toConn;
                    callback(true);
                    return;
                }
            }
        }

        callback(false);*/
    };

    this.newRig = function(rigName, callback) {
        callback(hectorDevice.NewRig(rigName));
    };

    this.getDeviceDescriptionHTML = function(DeviceType, callback) {
        var dev = hectorDevice.GetModule(DeviceType);

        if(dev !== null) {
            var data = dev.GetPluginData();
            console.log('PluginData');
            console.log(data);
            //fs.readFile('./ModulePageBuilder/PluginData.html', 'utf8', function(err, contents) {
            //    callback(contents);
            //});
            PageBuilder.BuildWebPage(data, './ModulePageBuilder/PluginData.html', (pluginHTML) => {
                callback(pluginHTML);
            });
        }
    };

    this.addDeviceToRack = function(rigName, DeviceType, callback) {
        callback(hectorDevice.AddRackDevice(rigName, DeviceType));
    };

    this.setOption = function(deviceGuid, optionName, optionValue) {
        if(hectorDevice.HectorCore.AllDevices[deviceGuid]) {
            hectorDevice.HectorCore.AllDevices[deviceGuid].SetOption(optionName, optionValue);
        }
    };

    /*
    this.getDeskView = function() {
        // TODO - returns DeskView
    };

    this.addOptionToDesk = function(deviceGuid, optionName) {
        // TODO - returns void
    };

    this.setDeskOrder = function(optionGuids) {
        // TODO - receives list of string, returns void
    };*/

    this.getTransportPosition = function(callback) {
        callback(0);
    };

    this.getTransportDuration = function(callback) {
        callback(0);
    }
};
