var HectorCore = require(process.cwd() + '/HectorCore.js');
var Graphics = require('./Graphics.js');

module.exports.GraphicsGenerator = function() {
    var objs = [];
    var device = new HectorCore.IODevice();
    device.Name = "GraphicsGenerator";
    var sync = new HectorCore.IOConnection(device);
    sync.Name = "Sync";
    sync.ConnType = 1;
    device.Connections.push(sync);

    sync.OnFrameArrived = (frame) => {
        var gOut = new Graphics.GraphicsFrame();
        for(var i = 0; i < objs.length; i++) {
            var gObj = objs[i];
            // TODO: this doesn't work exactly how the C# version works, which is better
            var g = gObj.Draw();
            if(g !== null) {
                gOut.Children.push(g);
            }
        }
        graphicsOut.FrameArrived(gOut);
        return true;
    };

    var graphicsOut = new HectorCore.IOConnection(device);
    graphicsOut.Name = "Out";
    graphicsOut.ConnType = 0;
    device.Connections.push(graphicsOut);

    var gText = new Graphics.GraphicsText("testing");
    objs.push(gText);

    var graphicsBuilder = new HectorCore.IOOption("json", getJson(), device);
    device.Options.data = graphicsBuilder;
    graphicsBuilder.OnValueChanged = function(option) {
        // TODO: add MetaData transforms
        var value = option.Value;
        var newObjs = JSON.parse(value);
        if(newObjs) {
            var replacementList = [];
            for(var i = 0; i < newObjs.length; i++) {
                var newObj = newObjs[i];
                var currentObject = findObject(newObj.guid, objs);
                if(currentObject !== null) {
                    var rObj = Object.assign(new Graphics.GraphicsText, newObj);
                    rObj.Properties = Object.assign(new Graphics.GraphicsObjectProperties, rObj.Properties);
                    replacementList.push(rObj);
                    // TODO: needs to allow animation with 'gotoObject'
                    //replacementList.push(currentObject);
                    //currentObject.Properties = Object.assign(new Graphics.GraphicsObjectProperties, newObj.Properties);
                    //currentObject = Object.assign(new Graphics.GraphicsText, newObj);
                    //...
                } else {
                    var rObj = Object.assign(new Graphics.GraphicsText, newObj);
                    rObj.Properties = Object.assign(new Graphics.GraphicsObjectProperties, rObj.Properties);
                    replacementList.push(rObj);
                }
            }

            objs = replacementList;

            option.Value = getJson();
        }
    }

    function findObject(guid, objectList) {
        for(var i = 0; i < objectList.length; i++) {
            if(objectList[i].guid === guid) {
                return objectList[i];
            }

            if(objectList[i].Type === "group") {
                var retValue = findObject(guid, objectList[i].Children);
                if(retValue !== null) {
                    return retValue;
                }
            }
        }
        return null;
    }

    function getJson() {
        console.log('getJson --------------------------------------------');
        console.log(objs);
        console.log(objs.length);
        return JSON.stringify(objs);
    }

    return device;
};
