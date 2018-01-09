var ctx = canvasElement.getContext("2d");
var transportPosition = document.getElementById("transportPosition");
var _contextMenu = new ContextMenu();

var optionHighlighted;

var optionCount = 0;
var optionList = {};

function addControl(obj, optionObj, OptionsContainerDiv) {
    var controlAdded = false;
    if(optionObj.Visibility !== 'NeverShown') {
        if(optionObj.PreferredControl === "") {
            optionObj.PreferredControl = optionObj.DataType;
        }

        console.log('PreferredControl ', optionObj.PreferredControl);
        //optionObj.ParentDevice = r.guid;
        optionList[optionObj.guid] = optionObj;
        
        //if(optionObj.DataType !== 'list') {
        //    rackSettings.style.display = '';
        //}

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
                var controlContainer = document.createElement('div');
                controlContainer.appendChild(newControl);
                controlContainer.className = "control-container";
                controlContainer.setAttribute('draggable', 'true');
                controlContainer.setAttribute('data-option-guid', optionObj.guid);
                
                // TODO: This is pretty bad - kinda hard-coded!
                if(optionObj.PreferredControl === 'separator') {
                    controlContainer.style.display = "block";
                }
                
                controlContainer.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('guid', optionObj.guid);
                });
                
                controlContainer.addEventListener('dragover', function(e) {
                    //console.log('dragover', e);
                    e.preventDefault();
                });
                
                controlContainer.addEventListener('dragend', function(e) {
                    console.log('dragend', e);
                });
                
                controlContainer.addEventListener('drop', function(e) {
                    console.log('drop', e);
                    var optGuid = e.dataTransfer.getData('guid');
                    var dropTarget = e.target;
                    while(dropTarget.className !== 'control-container') {
                        dropTarget = dropTarget.parentNode;
                    }
                    if(dropTarget !== optionList[optGuid].DOMObject.parentNode) {
                        console.log(optionList[optGuid]);
                        OptionsContainerDiv.removeChild(optionList[optGuid].DOMObject.parentNode);
                        OptionsContainerDiv.insertBefore(optionList[optGuid].DOMObject.parentNode, dropTarget);
                        
                        var child = OptionsContainerDiv.firstChild;
                        var deskOrder = [];
                        while(child) {
                            console.log(child.nodeName);
                            if(child.nodeName === 'DIV') {
                                deskOrder.push(child.getAttribute('data-option-guid'));
                            }
                            child = child.nextSibling;
                        }
                        if(deskOrder.length > 0) {
                            dView.SendCommand('setDeskOrder', [deskOrder]);
                        }
                        console.log(deskOrder);
                    }
                });
                
                controlAdded = true;
                OptionsContainerDiv.appendChild(controlContainer);
                optionCount++;
                optionObj.DOMObject = newControl;
                //var codebehind;

                newControl.setAttribute('data-option', 'true');
                //newControl.setAttribute('data-device-guid', deviceGuid);
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
                                dView.SendCommand('listenToControlSurfaces', [true]);
                            }
                        },
                        {
                            text: "Add to desk view",
                            onclick: function(e) {
                                dView.SendCommand('addOptionToDesk', [deviceGuid, ev.target.parentNode.getAttribute('data-option-name')]);
                            }
                        }
                    ], ev.clientX, ev.clientY);

                    return false;
                });

                if(controlCodebehind[controlName]) {
                    var codebehind = new controlCodebehind[controlName](optionObj.Data, optionObj.Value);
                    optionObj.codebehind = codebehind;
                    optionObj.codebehind.Option = obj;
                    //optionObj.codebehind.Device = r;
                    
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
                        dView.SendCommand("setOptionByGuid", [this.option.guid, this.getValue()], null);
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
                    OptionsContainerDiv.appendChild(selList);

                    selList.setAttribute('data-option', obj);
                    selList.addEventListener('change', function(e) {
                        var optionName = this.getAttribute('data-option');
                        var optionValue = this.options[this.selectedIndex].value;
                        //console.log('setting ' + this.getAttribute('data-option') + ' to ' + this.options[this.selectedIndex].value);
                        dView.SendCommand("setOptionByGuid", [optionObj.guid, optionValue], null);
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
                    OptionsContainerDiv.appendChild(optionDiv);
                    optionValue.setAttribute('data-option', obj);

                    optionValue.onchange = function() {
                        var optionName = this.getAttribute('data-option');
                        var value = this.value;
                        dView.SendCommand('setOptionByGuid', [optionObj.guid, value], null);
                    };
                    break;
            }
        }
    }
}

function DeskView(serverAddress, rackType, rackDOMContainer, serverListCallback) {

    var rackContainers = [];

    function RemoveAllChildren(node) {
        while (node.hasChildNodes()) {
            node.removeChild(node.lastChild);
        }
    }

    var rackDeviceList = {};
    
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

        //var optionCount = 0;
        rackSettings.style.display = "none";

        for(var obj in r.Options) {
            var controlAdded = false;
            if(r.Options[obj].Visibility !== 'NeverShown') {
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
            }
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

    ws.onopen = function(event) {
        console.log("ws open");

        SendCommand("getDeskView", [], function(resp) {
            console.log('Got reply:');
            console.log(resp);
            
            if(Array.isArray(resp.Controls)) {
                for(var i = 0; i < resp.Controls.length; i++) {
                    addControl(resp.Controls[i].Name, resp.Controls[i].LinkedOption, rackDOMContainer);
                }
            }
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

    var CommandLink = {
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
                if(btnRecord) {
                    if(connection.RecordEnabled) {
                        btnRecord.classList.add('btn-highlight-red');
                    } else {
                        btnRecord.classList.remove('btn-highlight-red');
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
        "DeviceUpdate": function (device) {
            if (!rackDeviceList[device.guid]) {
                console.log("Can't find device in list...", device);
            }
            else
            {
                rackDeviceList[device.guid].CurrentPresetName = device.CurrentPresetName;
                rackDeviceList[device.guid].RackLogDOMElement.innerText = device.DeviceLog;
                rackDeviceList[device.guid].RackLogDOMElement.scrollTop = rackDeviceList[device.guid].RackLogDOMElement.scrollHeight;
                loadPresets(rackDeviceList[device.guid], device.Presets, rackDeviceList[device.guid].PresetDOMElement);
                //console.log("Device Updated:");
                //console.log(device);
                //console.log(rackDeviceList[device.guid].RackLogDOMElement);
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
            transportButtons[mode].classList.add('button-lit');
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
        "ControlAddedToDesk" : function(newControl) {
            addControl(newControl.Name, newControl.LinkedOption, rackDOMContainer);
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