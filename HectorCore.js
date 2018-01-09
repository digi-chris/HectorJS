const uuidv1 = require('uuid/v1');
const watchjs = require('watchjs');

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

    this.DeviceType = '';

    this.Connections = [];
    this.Options = {};
    this.Presets = [];

    this.DeviceLog = 'New log started.';

    this.Init = function() {
        // override in module
    };

    this.DeviceUpdated = function() {
        // should be overridden
    };

    this.OptionUpdated = function() {
        // should be overridden
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
    var device = new IODevice();
    device.Name = name;
    var rigLink = new IOOption('link', '/RackView.html?rig=' + device.guid, device, 'link');
    device.Options['View Rig'] = rigLink;
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

module.exports.IOConnection = function(parentDevice) {
    var tobj = this;
    this.guid = uuidv1();
    this.ConnectedTo = null;
    this.ConnType = -1;
    this.FrameType = null;
    this.HasData = false;
    this.LastUpdate = 0;

    AllConnections[this.guid] = this;

    var connectedToGuid = '';

    watchjs.watch(tobj, 'ConnectedTo', function() {
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
    });

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