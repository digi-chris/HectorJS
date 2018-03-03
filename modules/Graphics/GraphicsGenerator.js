var HectorCore = require(process.cwd() + '/HectorCore.js');
var Graphics = require('./Graphics.js');

module.exports.GraphicsGenerator = function() {
    var objs = [];
    var device = new HectorCore.IODevice();
    device.Name = "GraphicsGenerator";
    var sync = new HectorCore.IOConnection(device);
    sync.Name = "Sync";
    sync.ConnType = 1;
    var dataIn = new HectorCore.IOConnection(device);
    dataIn.Name = "Data In";
    dataIn.ConnType = 1;

    device.Connections.push(sync);

    var _data = {
        hours : "17",
        minutes : "28",
        seconds : "35"
    };

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

    dataIn.OnFrameArrived = (frame) => {
        _data = frame;
        buildObjectList();
        sync.FrameArrived({});
    };

    var graphicsOut = new HectorCore.IOConnection(device);
    graphicsOut.Name = "Out";
    graphicsOut.ConnType = 0;
    device.Connections.push(graphicsOut);

    device.Connections.push(dataIn);

    var gText = new Graphics.GraphicsText("testing");
    objs.push(gText);

    var graphicsBuilder = new HectorCore.IOOption("json", getJson(), device);
    device.Options.data = graphicsBuilder;
    graphicsBuilder.OnValueChanged = function(option) {
        buildObjectList();

        //option.Value = getJson();
    }

    function objReplacer(object, prefix, value) {
        for(var objName in object) {
            if(typeof object[objName] === 'object') {
                value = objReplacer(object[objName], prefix + objName + '.', value);
            } else {
                value = value.replace('%' + prefix + objName + '%', object[objName]);
            }
        }
        return value;
    }

    function buildObjectList() {
        var value = graphicsBuilder.Value + '';
        //for(var obj in _data) {
        //    value = value.replace('%' + obj + '%', _data[obj]);
        //}
        value = objReplacer(_data, '', value);

        var newObjs = JSON.parse(value);
        if(newObjs) {
            var replacementList = [];
            for(var i = 0; i < newObjs.length; i++) {
                var newObj = newObjs[i];
                var currentObject = findObject(newObj.guid, objs);
                //console.log("X: " + newObj.Properties.X);
                if(currentObject !== null) {
                    var rObj;
                    switch(newObj.Type) {
                        case "text":
                            rObj = Object.assign(new Graphics.GraphicsText, newObj);
                            break;
                        case "character":
                            rObj = Object.assign(new Graphics.GraphicsCharacter, newObj);
                            break;
                    }
                    rObj.Properties = Object.assign(new Graphics.GraphicsObjectProperties, newObj.Properties);
                    //console.log("X now: " + rObj.Properties.X);
                    replacementList.push(rObj);
                    // TODO: needs to allow animation with 'gotoObject'
                    //replacementList.push(currentObject);
                    //currentObject.Properties = Object.assign(new Graphics.GraphicsObjectProperties, newObj.Properties);
                    //currentObject = Object.assign(new Graphics.GraphicsText, newObj);
                    //...
                } else {
                    var rObj = Object.assign(new Graphics.GraphicsText, newObj);
                    rObj.Properties = Object.assign(new Graphics.GraphicsObjectProperties, newObj.Properties);
                    replacementList.push(rObj);
                }
            }

            objs = replacementList;
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
