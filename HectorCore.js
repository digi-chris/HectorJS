const bitmapManipulation = require("bitmap-manipulation");
const uuidv1 = require('uuid/v1');
const watchjs = require('watchjs');
var AllDevices = {};
var AllOptions = {};

var IODevice = function() {
    var tobj = this;

    this.LicenseType = 0; // Free = 0, Registered = 1, Commercial = 2, Enterprise = 3
    this.Name = '';
    this.Index = 0;
    this.DisplayRow = 0;
    this.ShortDescription = 'No description.';
    this.LongDescription = 'No description.';
    this.Changes = {};
    this.PluginGUID = '';

    this.VersionMajor = 0;
    this.VersionMinor = 0;
    this.VersionRevision = 0;

    this.Tags = [];
    this.guid = uuidv1();

    // this._parentRig (set by server)

    AllDevices[this.guid] = this;

    this.DeviceType = '';

    this.Connections = [];
    this.Options = {};
    this.Presets = [];

    this.DeviceLog = 'New log started.';

    this.ChangeGuid = function(newGuid) {
        delete AllDevices[tobj.guid];
        tobj.guid = newGuid;
        AllDevices[tobj.guid] = tobj;
    };

    this.Init = function() {
        // override in module
    };

    this.Shutdown = function() {
        // override in module
    };

    this.DeviceUpdated = function() {
        // should be overridden
    };

    this.OptionUpdated = function() {
        // should be overridden
    };

    this.SetOption = function(optionName, optionValue) {
        // TODO: See C# version version for 'animationStarting' parameter
        if(tobj.Options[optionName]) {
            var cancelChange = false;
            if(tobj.Options[optionName].OnValueChanging)
                tobj.Options[optionName].OnValueChanging(tobj.Options[optionName], optionValue);

            if (!cancelChange) {
                tobj.Options[optionName].SetValue(optionValue);
                // TODO: Do we need to convert float values, as per C# version?
            }

            if(tobj.Options[optionName].OnValueChanged)
                tobj.Options[optionName].OnValueChanged(tobj.Options[optionName]);
        }
    };

    this.ConnectionUpdated = function(connection) {
        // should be overridden
    };

    this.DataArrived = function(connection) {
        // should be overridden
    };

    this.GetPluginData = function() {
        var shortName = tobj.DeviceType.substring(tobj.DeviceType.lastIndexOf('.') + 1);
        var connections = {};

        for(var i = 0; i < this.Connections.length; i++) {
            var ioConn = this.Connections[i];
            var duplicateNameCount = 0;
            var nameMod = '';
            while(connections[ioConn.Name + nameMod]) {
                // TODO: copied from C# code... looks like this won't work correctly?
                duplicateNameCount++;
                nameMod = ' (' + duplicateNameCount + ')';
            }
            connections[ioConn.Name + nameMod] = {
                'Type': ioConn.ConnType,
                'DataType': ioConn.FramType,
                'Description': ioConn.Description
            };
        }

        var options = {};
        for(var obj in this.Options) {
            var opt = this.Options[obj];
            options[obj] = {
                'Type': opt.DataType,
                'Description': opt.Description
            };
        }

        var data = {
            guid: tobj.PluginGUID,
            name: shortName,
            fullname: tobj.DeviceType,
            version_major: tobj.VersionMajor,
            version_minor: tobj.VersionMinor,
            version_revision: tobj.VersionRevision,
            short_description: tobj.ShortDescription,
            long_description: tobj.LongDescription,
            options_json: options,
            connections_json: connections,
            tags: tobj.Tags,
            package_url: tobj.DeviceType.substring(0, tobj.DeviceType.lastIndexOf(".")) + ".hector",
            Cost: tobj.Cost,
            License: tobj.License,
            RequiresHectorVersion: tobj.RequiresHectorVersion,
            Changes: tobj.Changes,
            CompatibleWith: tobj.CompatibleWith,
            TestedWith: tobj.TestedWith
        };

        return data;
    };
};

module.exports.IODevice = IODevice;

module.exports.RigIODevice = function(name) {
    var _deviceList;
    var device = new IODevice();
    device.Name = name;
    var rigLink = new IOOption('link', '/RackView.html?rig=' + device.guid, device, 'link');
    device.Options['View Rig'] = rigLink;

    Object.defineProperty(device, 'Connections', {
        get: function() {
            //console.log("Getting connections for RigDevice...");
            var rigConnections = [];
            for(var i = 0; i < _deviceList.length; i++) {
                var dev = _deviceList[i];
                for(var j = 0; j < dev.Connections.length; j++) {
                    //console.log(dev.Connections[j]);
                    if(dev.Connections[j]) {
                        if(dev.Connections[j].Public) {
                            rigConnections.push(dev.Connections[j]);
                        }
                    }
                }
            }
            return rigConnections;
        } 
    });

    var _options = device.Options;

    Object.defineProperty(device, "Options", {
        get: function() {
            var rigOptions = {};
            for(var optName in _options) {
                rigOptions[optName] = _options[optName];
            }
            rigOptions.separator = new IOOption("separator", "", device, "separator");
            for(var i = 0; i < _deviceList.length; i++) {
                var dev = _deviceList[i];
                for(var optName in dev.Options) {
                    if(dev.Options[optName].Public) {
                        rigOptions[dev.guid + "_" + optName] = dev.Options[optName];
                    }
                }
            }
            return rigOptions;
        }
    });

    device.SetDeviceList = function(dList) {
        _deviceList = dList;
    }

    return device;
};

var IOOption = function(dataType, value, parent, preferredControl) {
    var tobj = this;
    this.guid = uuidv1();
    this.DataType = dataType;
    this.Value = value;
    this.Data = [];
    this.PreferredControl = preferredControl;
    this._parentDevice = parent;
    this.Highlight = false;
    this.Public = false;
    watch(this, 'Public', function(prop, oldVal, val) {
        //console.log("Option public changed from " + oldVal + " to " + val);
        if(oldVal !== val) {
            setTimeout(() => {
                tobj._parentDevice.OptionUpdated(tobj);
            }, 0);
        }
        return val;
    });

    AllOptions[this.guid] = this;

    this.GetValue = function() {
        if(tobj.DataType === "list") {
            return tobj.Data[tobj.Value];
        } else {
            return tobj.Value;
        }
    };

    this.SetValue = function(value, dontUpdateClients) {
        //console.log("Setting option value to '" + value + "'");
        if(tobj.DataType === "list") {
            for(var i = 0; i < tobj.Data.length; i++) {
                if(tobj.Data[i] === value) {
                    tobj.Value = i + '';
                }
            }
        } else {
            tobj.Value = value;
        }

        if(!dontUpdateClients) {
            parent.OptionUpdated(tobj);
        }
    };

    watchjs.watch(tobj, 'Highlight', function() {
        console.log('Highlight changed.');
        parent.OptionUpdated(tobj);
    });
};

module.exports.IOOption = IOOption;

const GENERATOR = 0;
const COLLECTOR = 1;
var AllConnections = {};

module.exports.AllConnections = AllConnections;
module.exports.AllDevices = AllDevices;
module.exports.AllOptions = AllOptions;

//if (!Object.prototype.watch)
function watch (obj, prop, handler) {
    var oldval = obj[prop], newval = oldval,
    getter = function () {
        return newval;
    },
    setter = function (val) {
        oldval = newval;
        return newval = handler.call(obj, prop, oldval, val);
    };
    if (delete obj[prop]) { // can't watch constants
        if (Object.defineProperty) // ECMAScript 5
            Object.defineProperty(obj, prop, {
                get: getter,
                set: setter,
                enumerable: true
            });
        else if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) { // legacy
            Object.prototype.__defineGetter__.call(obj, prop, getter);
            Object.prototype.__defineSetter__.call(obj, prop, setter);
        }
    }
};

// object.unwatch
//if (!Object.prototype.unwatch)
function unwatch(obj, prop) {
    var val = obj[prop];
    delete obj[prop]; // remove accessors
    obj[prop] = val;
};

module.exports.IOConnection = function(parentDevice) {
    var tobj = this;
    this.guid = uuidv1();
    this.ConnectedTo = null;
    this.ConnType = -1;
    this.FrameType = null;
    this.HasData = false;
    this.LastUpdate = 0;
    this._parentDevice = parentDevice;
    this.Public = false;
    watch(this, 'Public', function(prop, oldVal, val) {
        //console.log("Connection public changed from " + oldVal + " to " + val);
        if(oldVal !== val) {
            setTimeout(() => {
                tobj._parentDevice.ConnectionUpdated(tobj);
            }, 0);
        }
        return val;
    });

    AllConnections[this.guid] = this;

    this.ChangeGuid = function(newGuid) {
        delete AllConnections[tobj.guid];
        tobj.guid = newGuid;
        AllConnections[tobj.guid] = tobj;
    };

    var connectedToGuid = '';

    watch(this, 'ConnectedTo', function(prop, oldval, val) {
        //console.log('ConnectedTo changed');
        //console.log(oldval);
        //console.log(val);
        if(val !== null) {
            if(val.guid !== connectedToGuid) {
                connectedToGuid = val.guid;
                setTimeout(() => {
                    console.log('ConnectedTo changed.');
                    parentDevice.ConnectionUpdated(tobj);
                    tobj.OnConnectionChanged();
                }, 0);
            }
        } else if(connectedToGuid !== '') {
            connectedToGuid = '';
            setTimeout(() => {
                console.log('ConnectedTo disconnected.');
                //console.log(tobj.ConnectedTo);
                parentDevice.ConnectionUpdated(tobj);
                tobj.OnConnectionChanged();
            }, 0);
        }

        return val;
    });

    /*watchjs.watch(tobj.ConnectedTo, function() {
        if(tobj.ConnectedTo !== null) {
            if(tobj.ConnectedTo.guid !== connectedToGuid) {
                connectedToGuid = tobj.ConnectedTo.guid;
                console.log('ConnectedTo changed.');
                parentDevice.ConnectionUpdated(tobj);
                tobj.OnConnectionChanged();
            }
        } else if(connectedToGuid !== '') {
            connectedToGuid = '';
            console.log('ConnectedTo disconnected.');
            parentDevice.ConnectionUpdated(tobj);
            tobj.OnConnectionChanged();
        }
    }, 1);*/

    this.OnFrameArrived = function(frame) {
        // should be overridden
    };

    this.FrameArrived = function(frame, transportOverride) {
        //console.log('FrameArrived', frame);
        if(tobj.ConnectedTo !== null) {
            if(tobj.ConnectedTo.ConnType === COLLECTOR && tobj.ConnectedTo !== tobj) {
                tobj.ConnectedTo.FrameArrived(frame);
            }
        }

        tobj.OnFrameArrived(frame);
        tobj.LastUpdate = Date.now();

        if(!tobj.HasData) {
            tobj.HasData = true;
            parentDevice.DataArrived(tobj);
        }
    };

    this.OnConnectionChanged = function() {
        // should be overridden
    };
};

class BitmapFrame {
  constructor(width, height) {
    this.Bitmap = new bitmapManipulation.Bitmap(width, height);
    this.Width = width;
    this.Height = height;
  }

  SetPixel(x, y, color) {
    this.Bitmap.setPixel(x, y, color);
  }

  GetPixel(x, y) {
    return this.Bitmap.getPixel(x, y);
  }

  DrawBitmap(bFrameIn, x, y) {
    this.Bitmap.drawBitmap(bFrameIn.Bitmap, x, y);
  }
}

module.exports.BitmapFrame = BitmapFrame;

class VideoFrame {
    constructor(width, height, alpha) {
        this.Width = width;
        this.Height = height;
        if(alpha) {
            this.ContainsAlpha = true;
            this._dataBuffer = Buffer.alloc(width * height * 4);
            this._stride = 4;
        } else {
            this.ContainsAlpha = false;
            this._dataBuffer = Buffer.alloc(width * height * 3);
            this._stride = 3;
        }
    }

    SetPixel(x, y, color) {
        // TODO: Needs finishing
        if(x < this.Width && y < this.Height && x > -1 && y > -1) {
            var offset = ((this.Width * y) + x) * this._stride;
            //this._dataBuffer.
        }
    }
}