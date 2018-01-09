var ContextMenu = function() {
    var contextZone = document.createElement("div");
    contextZone.style.position = "absolute";
    contextZone.style.display = "none";
    contextZone.style.top = "0px";
    contextZone.style.left = "0px";
    contextZone.style.right = "0px";
    contextZone.style.bottom = "0px";
    contextZone.style.zIndex = "100000";
    document.body.appendChild(contextZone);
    
    var currentMenu;
    
    contextZone.addEventListener("click", function(e) {
        contextZone.style.display = "none";
        if(currentMenu) {
            contextZone.removeChild(currentMenu);
            currentMenu = null;
        }
    });
    
    contextZone.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        contextZone.style.display = "none";
        if(currentMenu) {
            contextZone.removeChild(currentMenu);
            currentMenu = null;
        }
    });
    
    this.ShowMenu = function(menuItems, x, y) {
        if(currentMenu) {
            contextZone.removeChild(currentMenu);
            currentMenu = null;
        }
        
        contextZone.style.display = "";
        var cMenu = document.createElement("div");
        currentMenu = cMenu;
        cMenu.className = "context-menu";
        
        if(Array.isArray(menuItems)) {
            menuItems.forEach(function(item) {
                var cMenuItem = document.createElement("div");
                cMenu.appendChild(cMenuItem);
                cMenuItem.className = "context-menu-item";
                cMenuItem.innerText = item.text;
                cMenuItem.addEventListener("click", function(e) {
                    contextZone.style.display = "none";
                    if(currentMenu) {
                        contextZone.removeChild(currentMenu);
                        currentMenu = null;
                    }
                    item.onclick(e);
                });
            });
        }
        
        contextZone.appendChild(cMenu);
        cMenu.style.left = x + "px";
        cMenu.style.top = y + "px";
    };
};