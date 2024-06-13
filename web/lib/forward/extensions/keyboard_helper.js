import { LiteGraph } from "../litegraph.js";

if(LiteGraph && graphcanvas){

    // enable only if debugging CallbackHandler itself
    // graphcanvas.cb_handler.debug = true;

    // oCbInfo is first passed parameter and contains infos about the event execution chain 

    let ext = "key_helper";

    // onKeyDown
    graphcanvas.registerCallbackHandler("onKeyDown",function(oCbInfo, keyEvent){
        console.info(ext, "*** onKeyDown handler ***",...arguments);

        let nSel = Object.keys(graphcanvas.selected_nodes).length;
        var aNodesFrom = [];
        var nodeX = false;
        var return_value = null;
        if(nSel){
            for(let iO in graphcanvas.selected_nodes){
                aNodesFrom.push(graphcanvas.selected_nodes[iO]);
            }
            nodeX = aNodesFrom[0];
        }

        switch(keyEvent.keyCode){
            case 39: //ArrowLeft
                if(nSel){

                    // ---- ADD NEW NODE CONNECTED TO SELECTED ONE  ----
                    if(keyEvent.shiftKey || keyEvent.ctrlKey){

                        // simulate position via event (little hack, should implement that on prompt itself)
                        /* const mouseCoord = graphcanvas.getMouseCoordinates();
                        const gloCoord = graphcanvas.convertOffsetToEditorArea(mouseCoord);
                        // need prompt to be absolute positioned relative to editor-area that needs relative positioning
                        keyEvent.clientX = gloCoord[0];
                        keyEvent.clientY = gloCoord[1]; */
                        const gloCoord = graphcanvas.convertOffsetToEditorArea(nodeX.pos);
                        keyEvent.clientX = gloCoord[0] + nodeX.size[0] + 33;
                        keyEvent.clientY = gloCoord[1];
                        keyEvent.canvasX = nodeX.pos[0] + nodeX.size[0] + 33;
                        keyEvent.canvasY = nodeX.pos[1];

                        if(nodeX.outputs && nodeX.outputs[0]){
                            if(keyEvent.shiftKey){
                                console.debug(ext, "dbg: show search (using first slot)", nodeX, keyEvent);
                                graphcanvas.showSearchBox(keyEvent, {node_from: nodeX, slot_from: nodeX.outputs[0], type_filter_in: nodeX.outputs[0].type});
                            }else if(keyEvent.ctrlKey){
                                console.debug(ext, "dbg: show connection menu (using first slot)", nodeX, keyEvent);
                                graphcanvas.showConnectionMenu({nodeFrom: nodeX, slotFrom: nodeX.outputs[0], e: keyEvent, isCustomEvent: true});
                            }
                        }else{
                            console.debug(ext, "dbg: no output for node");
                        }
                        
                    }else{

                        // move nodes right
                        for(let iN=0;iN<aNodesFrom.length;iN++){
                            aNodesFrom[iN].alignToGrid();
                            aNodesFrom[iN].pos[0] += LiteGraph.CANVAS_GRID_SIZE;
                            aNodesFrom[iN].processCallbackHandlers("onMoved",{
                                def_cb: aNodesFrom[iN].onMoved
                            });
                        }

                    }

                }
            break;
            case 37: // ArrowLeft
                // move nodes left
                if(nSel){
                    for(let iN=0;iN<aNodesFrom.length;iN++){
                        aNodesFrom[iN].alignToGrid();
                        aNodesFrom[iN].pos[0] -= LiteGraph.CANVAS_GRID_SIZE;
                        aNodesFrom[iN].processCallbackHandlers("onMoved",{
                            def_cb: aNodesFrom[iN].onMoved
                        });
                    }
                }
            break;
            case 38: // ArrowUp
                // move nodes up
                if(nSel){
                    for(let iN=0;iN<aNodesFrom.length;iN++){
                        aNodesFrom[iN].alignToGrid();
                        aNodesFrom[iN].pos[1] -= LiteGraph.CANVAS_GRID_SIZE;
                        aNodesFrom[iN].processCallbackHandlers("onMoved",{
                            def_cb: aNodesFrom[iN].onMoved
                        });
                    }
                }
            break;
            case 40: // ArrowDown
                // move nodes down
                if(nSel){
                    for(let iN=0;iN<aNodesFrom.length;iN++){
                        aNodesFrom[iN].alignToGrid();
                        aNodesFrom[iN].pos[1] += LiteGraph.CANVAS_GRID_SIZE;
                        aNodesFrom[iN].processCallbackHandlers("onMoved",{
                            def_cb: aNodesFrom[iN].onMoved
                        });
                    }
                }
            break;
            case 9: // TAB
                // next node (connected to selected, or previous w shift)
                if(nSel){
                    let nextNode = false;
                    if(keyEvent.shiftKey){
                        if(nodeX.inputs && nodeX.inputs.length && nodeX.inputs[0].link && nodeX.inputs[0].link!==null){
                            nextNode = nodeX.getInputNode(0);
                            graphcanvas.selectNodes([nextNode]);
                        }
                    }else{
                        if(nodeX.outputs && nodeX.outputs.length && nodeX.outputs[0].links && nodeX.outputs[0].links.length){
                            nextNode = nodeX.getOutputNodes(0)[0];
                            graphcanvas.selectNodes([nextNode]);
                        }
                    }
                    return_value = true;
                }
            break;
            case 70: // F
                // focus on node
                if(nSel){
                    graphcanvas.centerOnNode(nodeX);
                    // TODO graphcanvas.centerOnSelection();
                }
            break;
            default:
                console.debug(ext, "dbg: ignore",keyEvent.keyCode);
            break;
        }

        return {
            return_value: return_value,
            //prevent_default: true,
            //stop_replication: true
        };
    });

}