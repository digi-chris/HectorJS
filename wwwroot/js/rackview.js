var optionCount = 0;
var ctx = canvasElement.getContext("2d");
var transportPosition = document.getElementById("transportPosition");
var _contextMenu = new ContextMenu();

function toggleMonitor(ev) {
    rView.SendCommand("toggleMonitor", [ev.target.parentNode.getAttribute('guid')]);
}

function toggleRecord(ev) {
    rView.SendCommand("toggleRecord", [ev.target.parentNode.getAttribute('guid')]);
}

var optionHighlighted;
var optionList = {};

function addControl(obj, optionObj, thisRackDevice, r, rackSettings, rackOptions, deviceGuid) {
    var controlAdded = false;
    if(optionObj.Visibility !== 'NeverShown') {
        if(optionObj.PreferredControl === "") {
            optionObj.PreferredControl = optionObj.DataType;
        }

        console.log('PreferredControl ', optionObj.PreferredControl);
        optionObj.ParentDevice = r.guid;
        optionList[optionObj.guid] = optionObj;
        if(optionObj.DataType !== 'list') {
            rackSettings.style.display = '';
        }

        if(optionObj.PreferredControl && optionObj.PreferredControl !== "") {
            //var controlDiv = getElementByDataname(Controls, r.Options[obj.PreferredControl]);
            var controlDiv = document.getElementById('control-' + optionObj.PreferredControl);

            if(!controlDiv) {
                // no control found - try the default
                optionObj.PreferredControl = "default";
                controlDiv = document.getElementById('control-' + optionObj.PreferredControl);
            }

            var controlName = optionObj.PreferredControl;
            //console.log(controlDiv, Controls);
            if(controlDiv) {
                var newControl = controlDiv.cloneNode(true);
                controlAdded = true;
                rackOptions.appendChild(newControl);
                optionCount++;
                optionObj.DOMObject = newControl;
                //var codebehind;

                newControl.setAttribute('data-option', 'true');
                newControl.setAttribute('data-device-guid', deviceGuid);
                newControl.setAttribute('data-option-name', obj);

                newControl.addEventListener('contextmenu', function(ev) {
                    ev.preventDefault();
                    console.log(ev);
                    _contextMenu.ShowMenu([
                        {
                            text: "Listen for control surface",
                            onclick: function(e) {
                                if(optionHighlighted) {
                                    optionHighlighted.classList.remove('option-highlight');
                                }
                                var optionDiv = ev.target;

                                while(optionDiv.getAttribute('data-option') !== 'true') {
                                    optionDiv = optionDiv.parentNode;
                                }
                                optionHighlighted = optionDiv;
                                optionDiv.classList.add('option-highlight');
                                listeningToControlSurfaces = true;
                                console.log(optionDiv);
                                rView.SendCommand('listenToControlSurfaces', [true]);
                            }
                        },
                        {
                            text: "Add to desk view",
                            onclick: function (e) {
                                console.log('addOptionToDesk', ev.target);
                                var pNode = ev.target.parentNode;
                                while (pNode.getAttribute('data-option-name') === null) {
                                    pNode = pNode.parentNode;
                                }
                                rView.SendCommand('addOptionToDesk', [deviceGuid, pNode.getAttribute('data-option-name')]);
                            }
                        }
                    ], ev.clientX, ev.clientY);

                    return false;
                });

                if(controlCodebehind[controlName]) {
                    var codebehind = new controlCodebehind[controlName](optionObj.Data, optionObj.Value);
                    optionObj.codebehind = codebehind;
                    optionObj.codebehind.Option = obj;
                    optionObj.codebehind.Device = r;
                    
                    for(var i = 0; i < optionObj.Data.length; i++) {
                        var data = optionObj.Data[i];
                        if(data.substring(0, 4) === 'min:') {
                            if(codebehind.setMinimum) {
                                codebehind.setMinimum(data.substring(4));
                            }
                        } else if(data.substring(0, 4) === 'max:') {
                            //console.log("BEFORE: ", codebehind);
                            //console.log('maximum: ', data);
                            if(codebehind.setMaximum) {
                                codebehind.setMaximum(data.substring(4));
                                //console.log("AFTER: ", codebehind);
                            }
                        }
                    }
                    codebehind.element = newControl;
                    codebehind.optionName = obj;
                    codebehind.option = optionObj;
                    
                    codebehind.setValue(optionObj.Value);
                    var label = getElementByDataname(newControl, 'label');
                    if(label) {
                        label.innerText = obj;
                    }

                    codebehind.valueCallback = function() {
                        //console.log(this.optionName, this.getValue());
                        console.log(thisRackDevice);
                        rView.SendCommand("setOption", [deviceGuid, this.optionName, this.getValue()], null, thisRackDevice.FromServer);
                    };

                    //console.log(codebehind);

                    if(codebehind.onclick) {
                        newControl.addEventListener('click', codebehind.onclick);
                    }
                    if(codebehind.onmousedown) {
                        newControl.addEventListener('mousedown', codebehind.onmousedown);
                    }

                    newControl.codebehind = codebehind;
                }

            }
        }

        if(!controlAdded) {
            switch(optionObj.DataType) {
                case "list":
                    var selList = document.createElement('select');
                    for(var i = 0; i < optionObj.Data.length; i++) {
                        var opt = document.createElement('option');
                        opt.value = i;
                        opt.innerText = optionObj.Data[i];
                        selList.appendChild(opt);

                        if(optionObj.Value === i.toString()) {
                            selList.selectedIndex = i;
                        }
                    }
                    rackOptions.appendChild(selList);

                    selList.setAttribute('data-option', obj);
                    selList.addEventListener('change', function(e) {
                        var optionName = this.getAttribute('data-option');
                        var optionValue = this.options[this.selectedIndex].value;
                        //console.log('setting ' + this.getAttribute('data-option') + ' to ' + this.options[this.selectedIndex].value);
                        rView.SendCommand("setOption", [deviceGuid, optionName, optionValue], null, r.FromServer);
                    });
                    break;
                case "float":
                    var optionDiv = document.createElement('div');
                    var optionTitle = document.createElement('span');
                    optionTitle.innerText = obj;
                    optionDiv.appendChild(optionTitle);

                    var optionValue = document.createElement('input');
                    optionValue.value = optionObj.Value;
                    optionDiv.appendChild(optionValue);
                    rackOptions.appendChild(optionDiv);
                    optionValue.setAttribute('data-option', obj);

                    optionValue.onchange = function() {
                        var optionName = this.getAttribute('data-option');
                        var value = this.value;
                        rView.SendCommand('setOption', [deviceIndex, optionName, value], null, r.FromServer);
                    };
                    break;
            }
        }
    }
}

function RackView(serverAddress, rackType, rackDOMContainer, serverListCallback, rigName) {
    var rackDeviceList = {};
    //console.log("RACKVIEW");

    function drawConnection(from, to, fromConnection) {
        for(var i = 0; i < from.children.length; i++) {
            var t = from.children[i].getAttribute('data-type');
            if(t === 'output' || t === 'input') {
                from = from.children[i];
            }
        }

        for(var i = 0; i < to.children.length; i++) {
            var t = to.children[i].getAttribute('data-type');
            if(t === 'output' || t === 'input') {
                to = to.children[i];
            }
        }

        var fromX = from.offsetLeft + 8;
        var fromY = from.offsetTop + 8;
        var toX = to.offsetLeft + 8;
        var toY = to.offsetTop + 8;

        //var curveX = fromX;
        //var curveY = toY + 150;

        var curveX = fromX + ((toX - fromX) / 2);
        var curveY;// = fromY;
        if(fromY > toY) {
            curveY = fromY;
        } else {
            curveY = toY;
        }

        if(fromX === toX) {
            curveX = fromX - 20;
            curveY = fromY + ((toY - fromY) / 2);
        }

        if(fromY === toY) {
            curveY = fromY + 30;
            curveX = fromX + ((toX - fromX) / 2);
        }

        var baseType = getFrameBaseType(fromConnection.LastFrameType);
        //console.log('baseType', fromConnection);
        var colors;
        if(cableColours[baseType]) {
            colors = cableColours[baseType];
        }
        else
        {
            colors = cableColours.default;
        }

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.strokeStyle = colors.cable;
        ctx.quadraticCurveTo(curveX, curveY, toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(fromX + 3, fromY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.shadow;
        ctx.quadraticCurveTo(curveX + 3, curveY, toX + 3, toY - 1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(fromX - 3, fromY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.highlight;
        ctx.quadraticCurveTo(curveX - 3, curveY, toX - 3, toY + 1);
        ctx.stroke();
    }

    function connect(from, to) {
        //var wSocket = ws;
        var guid = from.getAttribute('guid');
        var serverName = null;
        if(rackType === "Server") {
            console.log("looking for connection");
            // if we are working on the server connections (between machines), we need to decide which machine should
            // be sent the 'connect' command
            for(var obj in rackDeviceList) {
                console.log(rackDeviceList[obj]);
                if(rackDeviceList[obj].Connections) {
                    for(var i = 0; i < rackDeviceList[obj].Connections.length; i++) {
                        console.log(rackDeviceList[obj].Connections[i].guid);
                        if(rackDeviceList[obj].Connections[i].guid === guid) {
                            console.log("found connection on " + rackDeviceList[obj].ServerInfo.ServerName);
                            //wSocket = tobj.wsConnections[rackDeviceList[obj].ServerInfo.ServerName];
                            serverName = rackDeviceList[obj].ServerInfo.ServerName;
                            break;
                        }
                    }
                }
            }
        }
        var connectFrom = from.getAttribute('guid');
        var connectTo = "";
        if(to !== null) {
            connectTo = to.getAttribute('guid');
        }
        //console.log(tobj.wsConnections);
        //console.log(wSocket);
        SendCommand("connect", [connectFrom, connectTo], function(resp) {
            //console.log("Connected?", resp);
            if(resp) {
                drawConnection(from, to, connectionList[guid]);
            }
        }, serverName);
    }

    this.connect = connect;

    function checkConnections(forceReconnect) {
        checkCanvasSize();
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        for(var guid in connectionList) {
            //console.log('connection: ', connectionList[guid]);
            if(connectionList[guid].ConnectedTo !== null) {
                if(forceReconnect) {
                    // tell the server about this connection and redraw
                    connect(connectionList[guid].DOMObject, connectionList[connectionList[guid].ConnectedTo.guid].DOMObject);
                } else {
                    // just draw the connection
                    drawConnection(connectionList[guid].DOMObject, connectionList[connectionList[guid].ConnectedTo.guid].DOMObject, connectionList[guid]);
                }
            }

            setConnectionLight(connectionList[guid]);
            /*var light = getElementByDataname(connectionList[guid].DOMObject, 'incomingData');
            if(connectionList[guid].HasData) {
                light.classList.remove('data-off');
                light.classList.add('data-on');
            } else {
                light.classList.remove('data-on');
                light.classList.add('data-off');                        
            }*/
        }
    }
    this.checkConnections = checkConnections;

    var rackContainers = [];

    function RemoveAllChildren(node) {
        while (node.hasChildNodes()) {
            node.removeChild(node.lastChild);
        }
    }

    function loadPresets(device, presetList, presetElement) {
        //console.log('loadPresets');
        //console.log(device);
        RemoveAllChildren(presetElement);
        if(presetList.length > 0) {
            for(var pI = 0; pI < presetList.length; pI++) {
                var presetOption = document.createElement('option');
                presetOption.innerText = presetList[pI].PresetName;
                presetOption.value = presetList[pI].guid;
                presetElement.appendChild(presetOption);
                if(device.CurrentPresetName === presetList[pI].PresetName) {
                    //console.log('found preset ', pI);
                    presetElement.selectedIndex = pI;
                }
            }
        }
    }
    
    function addRackDevice(r) {
        console.log('ADDRACKDEVICE:');
        console.log(r);
        var thisRackDevice = r;
        var deviceIndex = r.Index;
        var deviceGuid = r.guid;
        var deviceRow = r.DisplayRow;
        if(isNaN(deviceRow)) {
            deviceRow = 0;
        }

        rackDeviceList[r.guid] = r;
        console.log(rackDeviceList);

        var rackDiv = document.createElement('div');
        rackDiv.className = "RackDevice";
        rackContainers[deviceRow].appendChild(rackDiv);

        var headerDiv = document.createElement('div');
        headerDiv.className = "RackHeader";
        headerDiv.innerText = r.Name;
        rackDiv.appendChild(headerDiv);

        var deviceDragging = false;
        var startX = 0;
        var startY = 0;

        headerDiv.addEventListener("mousedown", function(e) {
            deviceDragging = true;
            rackDiv.style.position = "absolute";
            //rackContainers[0].removeChild(rackDiv);
            //rackContainers[1].appendChild(rackDiv);
            console.log(rackDiv.offsetLeft, rackDiv.offsetTop);
            console.log(e.clientX, e.clientY);
            startX = e.clientX - rackDiv.offsetLeft;
            startY = e.clientY - rackDiv.offsetTop;
        });
        
        var closeBtn = document.createElement('i');
        closeBtn.className = 'fa fa-times RackCloseButton';
        closeBtn.setAttribute('aria-hidden', 'true');
        
        headerDiv.appendChild(closeBtn);

        headerDiv.addEventListener("mousemove", function(e) {
            if(deviceDragging) {
                if(e.buttons === 0) {
                    deviceDragging = false;
                }
                else
                {
                    rackDiv.style.left = (rackDiv.offsetLeft + e.movementX) + "px";
                    rackDiv.style.top = ((rackDiv.offsetTop - 4) + e.movementY) + "px";
                    //rackDiv.style.left = (e.clientX- e.movementX) - startX + "px";
                    //rackDiv.style.top = (e.clientY - e.movementY) - startY - 4 + "px";
                }
            }
        });

        headerDiv.addEventListener("mouseup", function(e) {
            rackDiv.style.position = "";
            rackDiv.style.left = "";
            rackDiv.style.top = "";
            rackDiv.parentNode.removeChild(rackDiv);

            if(e.clientX < 505) {
                rackContainers[0].appendChild(rackDiv);
                r.DisplayRow = 0;
            } else if (e.clientX < 1010) {
                rackContainers[1].appendChild(rackDiv);
                r.DisplayRow = 1;
            } else {
                rackContainers[2].appendChild(rackDiv);
                r.DisplayRow = 2;
            }

            SendCommand('setDisplayRow', [r.guid, r.DisplayRow], null, r.FromServer);

            checkConnections(false);
            deviceDragging = false;
        });

        closeBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
        
        closeBtn.addEventListener('mouseup', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
        
        closeBtn.addEventListener('click', function(e) {
            SendCommand('removeDeviceFromRack', [r.guid], function(response) {
                /* // removed below because we should get told by the server if a device has been removed in a separate message
                if(response) {
                    rackDeviceList[r.guid] = null;
                    rackDiv.parentNode.removeChild(rackDiv);
                    checkConnections();
                }*/
            }, r.FromServer);
        });
        
        var rackContent = document.createElement('div');
        rackContent.className = "RackContent";
        rackDiv.appendChild(rackContent);

        var rackSettings = document.createElement('div');
        rackSettings.innerHTML = "Preset:&nbsp;";
        var rackPresetList = document.createElement('select');
        rackSettings.appendChild(rackPresetList);
        var rackPresetAdd = document.createElement('button');
        rackPresetAdd.innerText = '+';
        var rackPresetLoad = document.createElement('button');
        rackPresetLoad.innerText = 'Load';
        var rackPresetSave = document.createElement('button');
        rackPresetSave.innerText = 'Save';

        //rackSettings.innerHTML += '&nbsp;';
        rackSettings.appendChild(rackPresetAdd);
        //rackSettings.innerHTML += '&nbsp;';
        rackSettings.appendChild(rackPresetLoad);
        //rackSettings.innerHTML += '&nbsp;';
        rackSettings.appendChild(rackPresetSave);
        //rackSettings.innerHTML += '&nbsp;';

        var rackAnimationType = document.createElement('select');
        var animTypes = ['None', 'Linear', 'EaseIn', 'EaseOut', 'EaseInOut'];

        for(var i = 0; i < animTypes.length; i++) {
            var animOpt = document.createElement('option');
            animOpt.value = animTypes[i];
            animOpt.innerText = animTypes[i];
            rackAnimationType.appendChild(animOpt);
        }
        console.log('AnimationStyle: ' + r.AnimationStyle);
        rackAnimationType.selectedIndex = r.AnimationStyle;
        rackAnimationType.onchange = function(e) {
            SendCommand('setAnimationStyle', [r.guid, rackAnimationType.options[rackAnimationType.selectedIndex].value], null, r.FromServer);
        };
        rackSettings.appendChild(rackAnimationType);

        rackPresetAdd.addEventListener('click', function(e) {
            SendCommand("createPreset", [r.guid], null, r.FromServer);
        });

        rackPresetLoad.addEventListener('click', function(e) {
            SendCommand("loadPreset", [r.guid, rackPresetList.options[rackPresetList.selectedIndex].value], null, r.FromServer);
        });

        rackDeviceList[r.guid].DOMElement = rackDiv;
        rackDeviceList[r.guid].PresetDOMElement = rackPresetList;

        loadPresets(r, r.Presets, rackPresetList);

        rackPresetList.onchange = function(e) {
            console.log("Preset changed:", e);
            console.log(rackPresetList.selectedIndex);
        };

        rackContent.appendChild(rackSettings);

        var rackOptions = document.createElement('div');
        rackOptions.className = "RackOptions";
        var rackConnections = document.createElement('div');
        rackConnections.className = "RackConnections";

        rackContent.appendChild(rackOptions);
        rackContent.appendChild(rackConnections);

        rackSettings.style.display = "none";

        for(var obj in r.Options) {
            var controlAdded = false;
            addControl(obj, r.Options[obj], thisRackDevice, r, rackSettings, rackOptions, deviceGuid);
            /*if(r.Options[obj].Visibility !== 'NeverShown') {
                if(r.Options[obj].PreferredControl === "") {
                    //r.Options[obj].PreferredControl = "default";
                    r.Options[obj].PreferredControl = r.Options[obj].DataType;
                }

                console.log('PreferredControl ', r.Options[obj].PreferredControl);
                r.Options[obj].ParentDevice = r.guid;
                optionList[r.Options[obj].guid] = r.Options[obj];
                if(r.Options[obj].DataType !== 'list') {
                    rackSettings.style.display = '';
                }

                if(r.Options[obj].PreferredControl && r.Options[obj].PreferredControl !== "") {
                    //var controlDiv = getElementByDataname(Controls, r.Options[obj.PreferredControl]);
                    var controlDiv = document.getElementById('control-' + r.Options[obj].PreferredControl);

                    if(!controlDiv) {
                        // no control found - try the default
                        r.Options[obj].PreferredControl = "default";
                        controlDiv = document.getElementById('control-' + r.Options[obj].PreferredControl);
                    }

                    var controlName = r.Options[obj].PreferredControl;
                    //console.log(controlDiv, Controls);
                    if(controlDiv) {
                        var newControl = controlDiv.cloneNode(true);
                        controlAdded = true;
                        rackOptions.appendChild(newControl);
                        optionCount++;
                        r.Options[obj].DOMObject = newControl;
                        //var codebehind;
                        
                        newControl.setAttribute('data-option', 'true');
                        newControl.setAttribute('data-device-guid', deviceGuid);
                        newControl.setAttribute('data-option-name', obj);
                        
                        newControl.addEventListener('contextmenu', function(ev) {
                            ev.preventDefault();
                            console.log(ev);
                            _contextMenu.ShowMenu([
                                {
                                    text: "Listen for control surface",
                                    onclick: function(e) {
                                        if(optionHighlighted) {
                                            optionHighlighted.classList.remove('option-highlight');
                                        }
                                        var optionDiv = ev.target;

                                        while(optionDiv.getAttribute('data-option') !== 'true') {
                                            optionDiv = optionDiv.parentNode;
                                        }
                                        optionHighlighted = optionDiv;
                                        optionDiv.classList.add('option-highlight');
                                        listeningToControlSurfaces = true;
                                        console.log(optionDiv);
                                        rView.SendCommand('listenToControlSurfaces', [true]);
                                    }
                                },
                                {
                                    text: "Add to desk view",
                                    onclick: function(e) {
                                        rView.SendCommand('addOptionToDesk', [deviceGuid, ev.target.parentNode.getAttribute('data-option-name')]);
                                    }
                                }
                            ], ev.clientX, ev.clientY);
                            
                            return false;
                        });

                        if(controlCodebehind[controlName]) {
                            var codebehind = new controlCodebehind[controlName](r.Options[obj].Data, r.Options[obj].Value);
                            r.Options[obj].codebehind = codebehind;
                            r.Options[obj].codebehind.Option = obj;
                            r.Options[obj].codebehind.Device = r;
                            //console.log(r.Options[obj]);
                            for(var i = 0; i < r.Options[obj].Data.length; i++) {
                                var data = r.Options[obj].Data[i];
                                if(data.substring(0, 4) === 'min:') {
                                    if(codebehind.setMinimum) {
                                        codebehind.setMinimum(data.substring(4));
                                    }
                                } else if(data.substring(0, 4) === 'max:') {
                                    //console.log("BEFORE: ", codebehind);
                                    //console.log('maximum: ', data);
                                    if(codebehind.setMaximum) {
                                        codebehind.setMaximum(data.substring(4));
                                        //console.log("AFTER: ", codebehind);
                                    }
                                }
                            }
                            codebehind.element = newControl;
                            codebehind.optionName = obj;
                            codebehind.option = r.Options[obj];
                            //console.log(obj, r.Options[obj].Value);
                            codebehind.setValue(r.Options[obj].Value);
                            var label = getElementByDataname(newControl, 'label');
                            if(label) {
                                label.innerText = obj;
                            }

                            codebehind.valueCallback = function() {
                                //console.log(this.optionName, this.getValue());
                                console.log(thisRackDevice);
                                SendCommand("setOption", [deviceGuid, this.optionName, this.getValue()], null, thisRackDevice.FromServer);
                            };

                            //console.log(codebehind);

                            if(codebehind.onclick) {
                                newControl.addEventListener('click', codebehind.onclick);
                            }
                            if(codebehind.onmousedown) {
                                newControl.addEventListener('mousedown', codebehind.onmousedown);
                            }

                            newControl.codebehind = codebehind;
                        }

                    }
                }

                if(!controlAdded) {
                    switch(r.Options[obj].DataType) {
                        case "list":
                            var selList = document.createElement('select');
                            for(var i = 0; i < r.Options[obj].Data.length; i++) {
                                var opt = document.createElement('option');
                                opt.value = i;
                                opt.innerText = r.Options[obj].Data[i];
                                selList.appendChild(opt);

                                if(r.Options[obj].Value === i.toString()) {
                                    selList.selectedIndex = i;
                                }
                            }
                            rackOptions.appendChild(selList);

                            selList.setAttribute('data-option', obj);
                            selList.addEventListener('change', function(e) {
                                var optionName = this.getAttribute('data-option');
                                var optionValue = this.options[this.selectedIndex].value;
                                //console.log('setting ' + this.getAttribute('data-option') + ' to ' + this.options[this.selectedIndex].value);
                                SendCommand("setOption", [deviceGuid, optionName, optionValue], null, r.FromServer);
                            });
                            break;
                        case "float":
                            var optionDiv = document.createElement('div');
                            var optionTitle = document.createElement('span');
                            optionTitle.innerText = obj;
                            optionDiv.appendChild(optionTitle);

                            var optionValue = document.createElement('input');
                            optionValue.value = r.Options[obj].Value;
                            optionDiv.appendChild(optionValue);
                            rackOptions.appendChild(optionDiv);
                            optionValue.setAttribute('data-option', obj);

                            optionValue.onchange = function() {
                                var optionName = this.getAttribute('data-option');
                                var value = this.value;
                                SendCommand('setOption', [deviceIndex, optionName, value], null, r.FromServer);
                            };
                            break;
                    }
                }
            }*/
        }

        var monitorsAdded = {};

        if(Array.isArray(r.Connections)) {
            r.Connections.forEach(function(item) {
                //console.log('Connection:', item);
                var connectionType;
                if(item.ConnType === 0) {
                    connectionType = "Generator";
                } else if(item.ConnType === 1) {
                    connectionType = "Collector";
                }

                var newConnection = document.getElementById(connectionType + "Connection").cloneNode(true);
                newConnection.setAttribute('guid', item.guid);
                rackConnections.appendChild(newConnection);
                item.DOMObject = newConnection;
                item.ParentDevice = r.guid;
                connectionList[item.guid] = item;

                var connNameDiv = getElementByDataname(newConnection, 'connectionName');
                if(connNameDiv) {
                    connNameDiv.innerText = item.Name;
                }

                newConnection.addEventListener('contextmenu', function (ev) {
                    ev.preventDefault();
                    console.log(ev);
                    _contextMenu.ShowMenu([
                        {
                            text: "Connect to Rig header",
                            onclick: function (e) {
                                rView.SendCommand('addConnectionToRig', [item.guid]);
                            }
                        }
                    ], ev.clientX, ev.clientY);

                    return false;
                });

                // check to see if we need to add a monitor for this frame type, and add if necessary
                /*if(!monitorsAdded[item.FrameType]) {
                    monitorsAdded[item.FrameType] = true;

                    var Monitors = document.getElementById("Monitors");
                    for(var i = 0; i < Monitors.children.length; i++) {
                        var mon = Monitors.children[i];
                        if(mon.getAttribute("data-frametype") === item.FrameType) {
                            var newMonitor = mon.cloneNode(true);
                            var img = new Image();
                            //img.src = 'http://localhost:' + (1001 + deviceIndex) + '/';
                            img.src = 'http://localhost:1001/' + deviceIndex;
                            newMonitor.appendChild(img);
                            rackOptions.appendChild(newMonitor);
                        }
                    }
                }*/
                
                CommandLink.ConnectionUpdate(item);
                applyCmdLink(this, "ConnectionUpdate", item);
            });
        };
        
        var arrowDown = document.createElement('i');
        arrowDown.className = "fa fa-caret-down RackArrow";
        arrowDown.setAttribute('aria-hidden', 'true');
        rackDiv.appendChild(arrowDown);
        var rackLog = document.createElement('div');
        rackLog.className = 'RackLog RackLog-hidden';
        rackDiv.appendChild(rackLog);
        
        var hideLog = true;
        
        arrowDown.addEventListener('click', function(e) {
            hideLog = !hideLog;
            if(hideLog) {
                rackLog.classList.add('RackLog-hidden');
                rackLog.classList.remove('RackLog-visible');
                arrowDown.classList.remove('RackArrow-rotated');
            }
            else
            {
                rackLog.classList.remove('RackLog-hidden');
                rackLog.classList.add('RackLog-visible');
                arrowDown.classList.add('RackArrow-rotated');
            }
            setTimeout(function() {
                tobj.checkConnections();
            }, 250);
        });
        
        rackLog.innerText = r.DeviceLog;
        
        rackDeviceList[r.guid].RackLogDOMElement = rackLog;
    }

    var connectionList = {};

    var RackDevice = document.getElementById("RackDevice");
    var ws = new WebSocket("ws://" + serverAddress + "/GCP");
    var callbacks = {};
    this.ServerList = {};
    var wsConnections = {};
    this.wsConnections = wsConnections;

    var tobj = this;

    this.addNewDevice = function (deviceType) {
        SendCommand("addDeviceToRack", [rigName, deviceType], function (r) {
            console.log("device added.");
            console.log(r);
            addRackDevice(r);
        });
    };

    function updateModuleBrowserList() {
        var iM = document.getElementById("installedModules");
        RemoveAllChildren(iM);
        SendCommand("getDeviceNames", [], function (resp) {
            // TODO: Partially copied from below - could be better structured.
            if (rackType !== "Server") {
                for (var i = 0; i < resp.length; i++) {
                    var moduleItem = document.createElement("div");
                    moduleItem.className = "moduleItem";
                    moduleItem.innerText = resp[i];
                    moduleItem.addEventListener("click", function (e) {
                        SendCommand("getDeviceDescriptionHTML", [e.target.innerText], function (resp) {
                            document.getElementById("moduleDescription").innerHTML = resp;
                        });
                    });
                    iM.appendChild(moduleItem);
                }
            }
        });
    }

    ws.onopen = function(event) {
        console.log("ws open");

        var transportDuration = 0;

        if(transportPosition) {
            setInterval(function() {
                SendCommand("getTransportPosition", [], function(resp) {
                    transportPosition.innerText = resp + '/' + transportDuration;
                });
            }, 250);

            setInterval(function () {
                SendCommand("getTransportDuration", [], function (resp) {
                    transportDuration = resp;
                });
            }, 1000);
        }
        //var tcpCommand = { "name" : "getDeviceNames" };
        //ws.send(JSON.stringify(tcpCommand));
        SendCommand("getDeviceNames", [], function (resp) {
            if (rackType !== "Server" && rackType !== "Rig") {
                var iM = document.getElementById("installedModules");
                console.log('Got reply:');
                console.log(resp);
                //var newSelect = document.createElement("select");
                for (var i = 0; i < resp.length; i++) {
                    //var opt = document.createElement("option");
                    //opt.setAttribute("value", resp[i]);
                    //opt.innerText = resp[i];
                    //newSelect.appendChild(opt);
                    
                    var moduleItem = document.createElement("div");
                    moduleItem.className = "moduleItem";
                    moduleItem.innerText = resp[i];
                    moduleItem.addEventListener("click", function (e) {
                        SendCommand("getDeviceDescriptionHTML", [e.target.innerText], function (resp) {
                            document.getElementById("moduleDescription").innerHTML = resp;
                        });
                    });
                    iM.appendChild(moduleItem);
                }
                //rackDOMContainer.appendChild(newSelect);

                //var addBtn = document.createElement("button");
                //addBtn.innerText = "Add";
                //addBtn.className = "DeviceAddButton";
                //rackDOMContainer.appendChild(addBtn);
            }

            var racks = document.createElement('div');
            racks.id = "racks";
            rackDOMContainer.appendChild(racks);

            rackContainers.push(document.createElement('div'));
            rackContainers.push(document.createElement('div'));
            rackContainers.push(document.createElement('div'));

            racks.appendChild(rackContainers[0]);
            racks.appendChild(rackContainers[1]);
            racks.appendChild(rackContainers[2]);

            rackContainers[0].className = "RackContainer";
            rackContainers[1].className = "RackContainer";
            rackContainers[2].className = "RackContainer";

            //SendCommand("getServerDevices", [], function(r) {
            var args = [];
            if (rigName && rackType === "Rack") {
                args.push(rigName);
            }
            SendCommand("get" + rackType + "Devices", args, function(r) {
                console.log('devices:');
                console.log(r);
                for(var i = 0; i < r.length; i++) {
                    addRackDevice(r[i]);
                }
                checkConnections(true);
            });

            if (rackType === "Rig") {
                var btnAddRig = document.getElementById("btnAddRig");
                btnAddRig.addEventListener("click", function (e) {
                    SendCommand("newRig", ["New Rig"], function (rig) {
                        addRackDevice(rig);
                    });
                });
            }

            SendCommand("getServerList", [], function(r) {
                console.log('serverList:');
                console.log(r);
                tobj.ServerList = r;
                if(serverListCallback) {
                    serverListCallback(r);
                }
                if(rackType === "Server") {
                    for(var obj in r) {
                        console.log("connecting to ws://" + r[obj].ipAddress + "/GCP");
                        var websocket = new WebSocket("ws://" + r[obj].ipAddress + "/GCP");
                        websocket.onmessage = function(event) {
                            // TODO: this is bad, it's the same function as below (it's late!)
                            //       we are also connecting to the local websocket twice.
                            var respObj = JSON.parse(event.data);
                            if(respObj.name === "__response") {
                                // this command is a reply
                                if(callbacks[respObj.guid]) {
                                    callbacks[respObj.guid](respObj.arguments[0]);
                                    delete callbacks[respObj];
                                }
                            } else if(CommandLink[respObj.name]) {
                                // we have a function in the CommandLink
                                CommandLink[respObj.name].apply(this, respObj.arguments);
                            }

                            if (respObj.name !== "__response") {
                                applyCmdLink(this, respObj.name, respObj.arguments);
                            }
                        };
                        wsConnections[obj] = websocket;
                    }
                }
            });

            /*addBtn.addEventListener("click", function() {
                SendCommand("addDeviceToRack", [newSelect.options[newSelect.selectedIndex].value], function(r) {
                    console.log("device added.");
                    console.log(r);

                    addRackDevice(r);*/
                    /*
                    var newDevice = RackDevice.cloneNode(true);
                    newDevice.deviceIndex = deviceIndex;
                    newDevice.style.display = "block";
                    document.body.appendChild(newDevice);
                    var deviceControl = InitControl(newDevice);
                    console.log("DeviceControl:");
                    console.log(deviceControl);

                    for(var i = 0; i < r.InputDevices.length; i++) {
                        var opt = document.createElement("option");
                        opt.innerText = r.InputDevices[i].Name;
                        opt.setAttribute("value", i);
                        deviceControl.lstInputs.appendChild(opt);
                    }

                    for(var i = 0; i < r.OutputDevices.length; i++) {
                        var opt = document.createElement("option");
                        opt.innerText = r.OutputDevices[i].Name;
                        opt.setAttribute("value", i);
                        deviceControl.lstOutputs.appendChild(opt);
                    }

                    deviceControl.lstInputs.addEventListener("change", function(e) {
                        SendCommand("selectInputOnDevice", [deviceIndex, deviceControl.lstInputs.selectedIndex]);
                    });

                    deviceControl.lstOutputs.addEventListener("change", function(e) {
                        SendCommand("selectOutputOnDevice", [deviceIndex, deviceControl.lstOutputs.selectedIndex]);
                    });

                    deviceControl.inputMonitor.addEventListener('click', function(e) {
                        SendCommand("toggleMonitor", [deviceIndex, 'i']);
                    });

                    deviceControl.inputEnable.addEventListener('click', function(e) {
                        SendCommand("toggleEnable", [deviceIndex, 'i']);
                    });

                    deviceControl.outputMonitor.addEventListener('click', function(e) {
                        SendCommand("toggleMonitor", [deviceIndex, 'o']);
                    });

                    deviceControl.outputEnable.addEventListener('click', function(e) {
                        SendCommand("toggleEnable", [deviceIndex, 'o']);
                    });
                    */
            /*    });
            });*/
        });
    };

    ws.onmessage = function(event) {
        //console.log('onmessage');
        //console.log(event.data);
        var respObj = JSON.parse(event.data);
        if(respObj.name === "__response") {
            // this command is a reply
            if(callbacks[respObj.guid]) {
                callbacks[respObj.guid](respObj.arguments[0]);
                delete callbacks[respObj];
            }
        } else if(CommandLink[respObj.name]) {
            // we have a function in the CommandLink
            CommandLink[respObj.name].apply(this, respObj.arguments);
        }

        if (respObj.name !== "__response") {
            applyCmdLink(this, respObj.name, respObj.arguments);
        }
    };

    function SendCommand(commandName, args, callback, hectorServerName)
    {
        var cmdObj = { "name" : commandName, "arguments" : args };
        cmdObj.TimeSent = new Date();
        cmdObj.guid = guid();
        //console.log("sending " + commandName + " with guid " + cmdObj.guid);
        callbacks[cmdObj.guid] = callback;
        if(hectorServerName)
        {
            var websocket = tobj.wsConnections[hectorServerName];
            if(websocket) {
                websocket.send(JSON.stringify(cmdObj));
            }
            else
            {
                console.log("WARNING: Can't find server '" + hectorServerName + "'. Command not sent.");
            }
        }
        else
        {
            ws.send(JSON.stringify(cmdObj));
        }
    }
    
    this.SendCommand = SendCommand;

    function setConnectionLight(connection) {
        var light = getElementByDataname(connection.DOMObject, 'incomingData');
        var cName = getElementByDataname(connection.DOMObject, 'connectionName');
        if(connection.HasData) {
            light.classList.remove('data-off');
            light.classList.add('data-on');
            light.classList.add(getFrameBaseType(connection.LastFrameType) + "-light");
        } else {
            light.classList.remove('data-on');
            light.classList.add('data-off');  
            light.classList.remove(getFrameBaseType(connection.LastFrameType) + "-light");
        }

        if(connection.HasError) {
            cName.classList.add('connection-error');
        }
        else
        {
            cName.classList.remove('connection-error');
        }
    }

    var commandLinks = [];

    this.addCommandLink = function (cLink) {
        //console.log("adding command link", cLink);
        commandLinks.push(cLink);
    };

    function applyCmdLink(tobj, name, args) {
        //console.log('applyCmdLink', name, args);
        for (var i = 0; i < commandLinks.length; i++) {
            if (commandLinks[i]) {
                if (commandLinks[i][name]) {
                    commandLinks[i][name].apply(this, args);
                }
            }
        }
    }

    var CommandLink = {
        'Alert' : function(message) {
            alert(message);
        },
        'ServerAdded' : function(server) {
                if(rackType === "Server") {
                console.log('ServerAdded', server);
                if(rackDeviceList[server.guid]) {
                    console.log('already exists');
                } else {
                    addRackDevice(server);
                }
            }
        },
        'ConnectionOpen' : function(connection) {
            //console.log('Connection Open');
            //console.log(connection);
            //var light = getElementByDataname(connectionList[connection.guid].DOMObject, 'incomingData');
            //light.classList.remove('data-off');
            //light.classList.add('data-on');
            if(connectionList[connection.guid]) {
                connectionList[connection.guid].HasData = true;
                setConnectionLight(connectionList[connection.guid]);
            }
        },
        'ConnectionClosed' : function(connection) {
            //console.log('Connection Closed');
            //console.log(connectionList);
            //console.log(connection);
            //var light = getElementByDataname(connectionList[connection.guid].DOMObject, 'incomingData');
            //light.classList.remove('data-on');
            //light.classList.add('data-off');
            if(connectionList[connection.guid]) {
                // we have more than one list with rack devices in it, so we should check
                // that the server is telling us about a connection we care about
                connectionList[connection.guid].HasData = false;
                setConnectionLight(connectionList[connection.guid]);
            }
        },
        'ConnectionUpdate' : function(connection) {
            if(connectionList[connection.guid]) {
                connection.DOMObject = connectionList[connection.guid].DOMObject;
                connection.ParentDevice = connectionList[connection.guid].ParentDevice;
                var connName = getElementByDataname(connectionList[connection.guid].DOMObject, 'connectionName');

                if(connectionList[connection.guid].LastFrameType !== connection.LastFrameType) {
                    // frame type has changed
                    var light = getElementByDataname(connectionList[connection.guid].DOMObject, 'incomingData');
                    var prevFrameType = getFrameBaseType(connectionList[connection.guid].LastFrameType);
                    var newFrameType = getFrameBaseType(connection.LastFrameType);

                    light.classList.remove(prevFrameType + "-light");
                    light.classList.add(newFrameType + "-light");
                }

                if(connection.HasError) {
                    console.log("HasError");
                    console.log(connName);
                    console.log(connection.LastError);
                    connName.classList.add("connection-error");
                }
                else
                {
                    connName.classList.remove("connection-error");
                }

                var mustCheckConnections = false;

                if(connectionList[connection.guid].ConnectedTo !== connection.ConnectedTo) {
                    // connection has changed
                    mustCheckConnections = true;
                } else if(connectionList[connection.guid].ConnectedTo && connection.ConnectedTo) {
                    if(connectionList[connection.guid].ConnectedTo.guid !== connection.ConnectedTo.guid) {
                        mustCheckConnections = true;
                    }
                }
                console.log('ConnectionUpdate', connectionList[connection.guid], connection);

                connectionList[connection.guid] = connection;
                var btnMonitor = getElementByDataname(connection.DOMObject, 'btnMonitor');
                if(connection.isMonitoring) {
                    btnMonitor.classList.add('btn-highlight');
                    addMonitor(connection);
                } else {
                    btnMonitor.classList.remove('btn-highlight');
                    removeMonitor(connection);
                }
                
                var btnRecord = getElementByDataname(connection.DOMObject, 'btnRecord');
                if (btnRecord) {
                    console.log("Connection in playback? " + connection.InPlayback);
                    console.log(connection);
                    if (connection.InPlayback) {
                        btnRecord.classList.add('btn-highlight-orange');
                        btnRecord.classList.remove('btn-highlight-red');
                    } else if(connection.RecordEnabled) {
                        btnRecord.classList.add('btn-highlight-red');
                        btnRecord.classList.remove('btn-highlight-orange');
                    } else {
                        btnRecord.classList.remove('btn-highlight-red');
                        btnRecord.classList.remove('btn-highlight-orange');
                    }
                }

                if(mustCheckConnections) {
                    checkConnections(false);
                }
            }
        },
        "OptionUpdate" : function(option) {
            //console.log("Option updated!");
            //console.log(option);
            var cOption = optionList[option.guid];

            if(cOption) {
                option.DOMObject = cOption.DOMObject;
                option.ParentDevice = cOption.ParentDevice;
                option.codebehind = cOption.codebehind;

                if(option.Highlight) {
                    option.DOMObject.classList.add('control-highlight');
                }
                else {
                    option.DOMObject.classList.remove('control-highlight');
                }
                //console.log(option.DOMObject);

                if(option.codebehind) {
                    if(option.codebehind.setValue) {
                        option.codebehind.setValue(option.Value, true);
                    }
                }
            }
        },
        "DeviceUpdate": function (device, updateInfo) {
            // NOTE: if the device isn't in the list, we're probably in a window that hasn't been notified about the device (eg, the ServerView)
            if (rackDeviceList[device.guid]) {
                rackDeviceList[device.guid].CurrentPresetName = device.CurrentPresetName;
                rackDeviceList[device.guid].RackLogDOMElement.innerText = device.DeviceLog;
                rackDeviceList[device.guid].RackLogDOMElement.scrollTop = rackDeviceList[device.guid].RackLogDOMElement.scrollHeight;
                loadPresets(rackDeviceList[device.guid], device.Presets, rackDeviceList[device.guid].PresetDOMElement);

                console.log("Device Updated: " + updateInfo);
                console.log(device);
                console.log(rackDeviceList[device.guid]);
            }
        },
        "DeviceRemoved" : function(deviceGuid) {
            var device = rackDeviceList[deviceGuid];
            if(device !== null) {
                rackDeviceList[deviceGuid] = null;
                console.log(device);
                device.DOMElement.parentNode.removeChild(device.DOMElement);
                checkConnections();
            }
        },
        "TransportModeChanged" : function(mode) {
            console.log('TransportModeChanged ', mode);
            for(var i = 0; i < transportButtons.length; i++) {
                transportButtons[i].classList.remove('button-lit');
            }
            if (transportButtons.length > mode) {
                transportButtons[mode].classList.add('button-lit');
            }
        },
        "ControlCommand" : function(controlFrame) {
            console.log(controlFrame);
            //if(recPreset) {
                // the 'recPreset' button is present..
                if(listeningToControlSurfaces) {
                    // stop listening for control surfgce info
                    listeningToControlSurfaces = false;
                    rView.SendCommand('listenToControlSurfaces', [listeningToControlSurfaces]);
                    //recPreset.classList.remove('btn-highlight-red');
                    
                    //var presetName = "s_" + controlFrame.DeviceID + "_" + controlFrame.ChannelID + "_" + controlFrame.ControlID;
                    //rView.SendCommand("saveRackPreset", [presetName]);
                    
                    if(optionHighlighted) {
                        var dGuid = optionHighlighted.getAttribute('data-device-guid');
                        var optionName  = optionHighlighted.getAttribute('data-option-name');
                        rView.SendCommand('setOptionController', [dGuid, optionName, controlFrame.DeviceID, controlFrame.Command, controlFrame.ChannelID, controlFrame.ControlID, controlFrame.ControlValue, controlFrame.Normal]);
                        optionHighlighted.classList.remove('option-highlight');
                    }
                }
            //}
        },
        "ModuleInstalled": function (module) {
            updateModuleBrowserList();
        }
    };

    var monitors = {};

    function addMonitor(connection) {
        if(!monitors[connection.guid]) {
            var MonitorBar = document.getElementById('MonitorBar');
            var Monitors = document.getElementById("Monitors");
            for(var i = 0; i < Monitors.children.length; i++) {
                var mon = Monitors.children[i];
                if(mon.getAttribute("data-frametype") === connection.FrameType) {
                    var newMonitor = mon.cloneNode(true);
                    var img = new Image();
                    //img.src = 'http://localhost:' + (1001 + deviceIndex) + '/';
                    img.src = 'http://' + serverAddress + ':1001/' + connection.ParentDevice;
                    newMonitor.appendChild(img);
                    MonitorBar.appendChild(newMonitor);
                    monitors[connection.guid] = newMonitor;
                }
            }
        }
    }

    function removeMonitor(connection) {
        if(monitors[connection.guid]) {
            var MonitorBar = document.getElementById('MonitorBar');
            MonitorBar.removeChild(monitors[connection.guid]);
            monitors[connection.guid] = null;
        }
    }    
}
