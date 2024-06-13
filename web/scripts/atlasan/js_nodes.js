//basic nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    //Constant
    function Time() {
        this.addOutput("in ms", "number");
        this.addOutput("in sec", "number");
    }

    Time.title = "Time";
    Time.desc = "Time";

    Time.prototype.onExecute = function() {
        this.setOutputData(0, this.graph.globaltime * 1000);
        this.setOutputData(1, this.graph.globaltime);
    };

    LiteGraph.registerNodeType("basic/time", Time);

    //Subgraph: a node that contains a graph
    function Subgraph() {
        var that = this;
        this.size = [140, 80];
        this.properties = { enabled: true };
        this.enabled = true;

        //create inner graph
        this.subgraph = new LiteGraph.LGraph();
        this.subgraph._subgraph_node = this;
        this.subgraph._is_subgraph = true;

        this.subgraph.onTrigger = this.onSubgraphTrigger.bind(this);

		//nodes input node added inside
        this.subgraph.onInputAdded = this.onSubgraphNewInput.bind(this);
        this.subgraph.onInputRenamed = this.onSubgraphRenamedInput.bind(this);
        this.subgraph.onInputTypeChanged = this.onSubgraphTypeChangeInput.bind(this);
        this.subgraph.onInputRemoved = this.onSubgraphRemovedInput.bind(this);

        this.subgraph.onOutputAdded = this.onSubgraphNewOutput.bind(this);
        this.subgraph.onOutputRenamed = this.onSubgraphRenamedOutput.bind(this);
        this.subgraph.onOutputTypeChanged = this.onSubgraphTypeChangeOutput.bind(this);
        this.subgraph.onOutputRemoved = this.onSubgraphRemovedOutput.bind(this);
    }

    Subgraph.title = "Subgraph";
    Subgraph.desc = "Graph inside a node";
    Subgraph.title_color = "#334";

    Subgraph.prototype.onGetInputs = function() {
        return [["enabled", "boolean"]];
    };

	/*
    Subgraph.prototype.onDrawTitle = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        ctx.fillStyle = "#555";
        var w = LiteGraph.NODE_TITLE_HEIGHT;
        var x = this.size[0] - w;
        ctx.fillRect(x, -w, w, w);
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, -w * 0.6);
        ctx.lineTo(x + w * 0.8, -w * 0.6);
        ctx.lineTo(x + w * 0.5, -w * 0.3);
        ctx.fill();
    };
	*/

    Subgraph.prototype.onDblClick = function(e, pos, graphcanvas) {
        var that = this;
        setTimeout(function() {
            graphcanvas.openSubgraph(that.subgraph);
        }, 10);
    };

	/*
    Subgraph.prototype.onMouseDown = function(e, pos, graphcanvas) {
        if (
            !this.flags.collapsed &&
            pos[0] > this.size[0] - LiteGraph.NODE_TITLE_HEIGHT &&
            pos[1] < 0
        ) {
            var that = this;
            setTimeout(function() {
                graphcanvas.openSubgraph(that.subgraph);
            }, 10);
        }
    };
	*/

    Subgraph.prototype.onAction = function(action, param) {
        this.subgraph.onAction(action, param);
    };

    Subgraph.prototype.onExecute = function() {
        this.enabled = this.getInputOrProperty("enabled");
        if (!this.enabled) {
            return;
        }

        //send inputs to subgraph global inputs
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var value = this.getInputData(i);
                this.subgraph.setInputData(input.name, value);
            }
        }

        //execute
        this.subgraph.runStep();

        //send subgraph global outputs to outputs
        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                var value = this.subgraph.getOutputData(output.name);
                this.setOutputData(i, value);
            }
        }
    };

    Subgraph.prototype.sendEventToAllNodes = function(eventname, param, mode) {
        if (this.enabled) {
            this.subgraph.sendEventToAllNodes(eventname, param, mode);
        }
    };

    Subgraph.prototype.onDrawBackground = function (ctx, graphcanvas, canvas, pos) {
        if (this.flags.collapsed)
            return;
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        // button
        var over = LiteGraph.isInsideRectangle(pos[0], pos[1], this.pos[0], this.pos[1] + y, this.size[0], LiteGraph.NODE_TITLE_HEIGHT);
        let overleft = LiteGraph.isInsideRectangle(pos[0], pos[1], this.pos[0], this.pos[1] + y, this.size[0] / 2, LiteGraph.NODE_TITLE_HEIGHT)
        ctx.fillStyle = over ? "#555" : "#222";
        ctx.beginPath();
        if (this._shape == LiteGraph.BOX_SHAPE) {
            if (overleft) {
                ctx.rect(0, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT);
            } else {
                ctx.rect(this.size[0] / 2, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT);
            }
        }
        else {
            if (overleft) {
                ctx.roundRect(0, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT, [0,0, 8,8]);
            } else {
                ctx.roundRect(this.size[0] / 2, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT, [0,0, 8,8]);
            }
        }
        if (over) {
            ctx.fill();
        } else {
            ctx.fillRect(0, y, this.size[0] + 1, LiteGraph.NODE_TITLE_HEIGHT);
        }
        // button
        ctx.textAlign = "center";
        ctx.font = "24px Arial";
        ctx.fillStyle = over ? "#DDD" : "#999";
        ctx.fillText("+", this.size[0] * 0.25, y + 24);
        ctx.fillText("+", this.size[0] * 0.75, y + 24);
    }

    // Subgraph.prototype.onMouseDown = function(e, localpos, graphcanvas)
    // {
    // 	var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
    // 	if(localpos[1] > y)
    // 	{
    // 		graphcanvas.showSubgraphPropertiesDialog(this);
    // 	}
    // }
    Subgraph.prototype.onMouseDown = function (e, localpos, graphcanvas) {
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        console.log(0)
        if (localpos[1] > y) {
            if (localpos[0] < this.size[0] / 2) {
                console.log(1)
                graphcanvas.showSubgraphPropertiesDialog(this);
            } else {
                console.log(2)
                graphcanvas.showSubgraphPropertiesDialogRight(this);
            }
        }
    }
	Subgraph.prototype.computeSize = function()
	{
		var num_inputs = this.inputs ? this.inputs.length : 0;
		var num_outputs = this.outputs ? this.outputs.length : 0;
		return [ 200, Math.max(num_inputs,num_outputs) * LiteGraph.NODE_SLOT_HEIGHT + LiteGraph.NODE_TITLE_HEIGHT ];
	}

    //**** INPUTS ***********************************
    Subgraph.prototype.onSubgraphTrigger = function(event, param) {
        var slot = this.findOutputSlot(event);
        if (slot != -1) {
            this.triggerSlot(slot);
        }
    };

    Subgraph.prototype.onSubgraphNewInput = function(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            //add input to the node
            this.addInput(name, type);
        }
    };

    Subgraph.prototype.onSubgraphRenamedInput = function(oldname, name) {
        var slot = this.findInputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.name = name;
    };

    Subgraph.prototype.onSubgraphTypeChangeInput = function(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.type = type;
    };

    Subgraph.prototype.onSubgraphRemovedInput = function(name) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeInput(slot);
    };

    //**** OUTPUTS ***********************************
    Subgraph.prototype.onSubgraphNewOutput = function(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            this.addOutput(name, type);
        }
    };

    Subgraph.prototype.onSubgraphRenamedOutput = function(oldname, name) {
        var slot = this.findOutputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.name = name;
    };

    Subgraph.prototype.onSubgraphTypeChangeOutput = function(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.type = type;
    };

    Subgraph.prototype.onSubgraphRemovedOutput = function(name) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeOutput(slot);
    };
    // *****************************************************

    Subgraph.prototype.getExtraMenuOptions = function(graphcanvas) {
        var that = this;
        return [
            {
                content: "Open",
                callback: function() {
                    graphcanvas.openSubgraph(that.subgraph);
                }
            }
        ];
    };

    Subgraph.prototype.onResize = function(size) {
        size[1] += 20;
    };

    Subgraph.prototype.serialize = function() {
        var data = LiteGraph.LGraphNode.prototype.serialize.call(this);
        data.subgraph = this.subgraph.serialize();
        return data;
    };
    //no need to define node.configure, the default method detects node.subgraph and passes the object to node.subgraph.configure()

    Subgraph.prototype.reassignSubgraphUUIDs = function(graph) {
        const idMap = { nodeIDs: {}, linkIDs: {} }

        for (const node of graph.nodes) {
            const oldID = node.id
            const newID = LiteGraph.uuidv4()
            node.id = newID

            if (idMap.nodeIDs[oldID] || idMap.nodeIDs[newID]) {
                throw new Error(`New/old node UUID wasn't unique in changed map! ${oldID} ${newID}`)
            }

            idMap.nodeIDs[oldID] = newID
            idMap.nodeIDs[newID] = oldID
        }

        for (const link of graph.links) {
            const oldID = link[0]
            const newID = LiteGraph.uuidv4();
            link[0] = newID

            if (idMap.linkIDs[oldID] || idMap.linkIDs[newID]) {
                throw new Error(`New/old link UUID wasn't unique in changed map! ${oldID} ${newID}`)
            }

            idMap.linkIDs[oldID] = newID
            idMap.linkIDs[newID] = oldID

            const nodeFrom = link[1]
            const nodeTo = link[3]

            if (!idMap.nodeIDs[nodeFrom]) {
                throw new Error(`Old node UUID not found in mapping! ${nodeFrom}`)
            }

            link[1] = idMap.nodeIDs[nodeFrom]

            if (!idMap.nodeIDs[nodeTo]) {
                throw new Error(`Old node UUID not found in mapping! ${nodeTo}`)
            }

            link[3] = idMap.nodeIDs[nodeTo]
        }

        // Reconnect links
        for (const node of graph.nodes) {
            if (node.inputs) {
                for (const input of node.inputs) {
                    if (input.link) {
                        input.link = idMap.linkIDs[input.link]
                    }
                }
            }
            if (node.outputs) {
                for (const output of node.outputs) {
                    if (output.links) {
                        output.links = output.links.map(l => idMap.linkIDs[l]);
                    }
                }
            }
        }

        // Recurse!
        for (const node of graph.nodes) {
            if (node.type === "graph/subgraph") {
                const merge = reassignGraphUUIDs(node.subgraph);
                idMap.nodeIDs.assign(merge.nodeIDs)
                idMap.linkIDs.assign(merge.linkIDs)
            }
        }
    };

    Subgraph.prototype.clone = function() {
        var node = LiteGraph.createNode(this.type);
        var data = this.serialize();

        if (LiteGraph.use_uuids) {
            // LGraph.serialize() seems to reuse objects in the original graph. But we
            // need to change node IDs here, so clone it first.
            const subgraph = LiteGraph.cloneObject(data.subgraph)

            this.reassignSubgraphUUIDs(subgraph);

            data.subgraph = subgraph;
        }

        delete data["id"];
        delete data["inputs"];
        delete data["outputs"];
        node.configure(data);
        return node;
    };

	Subgraph.prototype.buildFromNodes = function(nodes)
	{
		//clear all?
		//TODO

		//nodes that connect data between parent graph and subgraph
		var subgraph_inputs = [];
		var subgraph_outputs = [];

		//mark inner nodes
		var ids = {};
		var min_x = 0;
		var max_x = 0;
		for(var i = 0; i < nodes.length; ++i)
		{
			var node = nodes[i];
			ids[ node.id ] = node;
			min_x = Math.min( node.pos[0], min_x );
			max_x = Math.max( node.pos[0], min_x );
		}
		
		var last_input_y = 0;
		var last_output_y = 0;

		for(var i = 0; i < nodes.length; ++i)
		{
			var node = nodes[i];
			//check inputs
			if( node.inputs )
				for(var j = 0; j < node.inputs.length; ++j)
				{
					var input = node.inputs[j];
					if( !input || !input.link )
						continue;
					var link = node.graph.links[ input.link ];
					if(!link)
						continue;
					if( ids[ link.origin_id ] )
						continue;
					//this.addInput(input.name,link.type);
					this.subgraph.addInput(input.name,link.type);
					/*
					var input_node = LiteGraph.createNode("graph/input");
					this.subgraph.add( input_node );
					input_node.pos = [min_x - 200, last_input_y ];
					last_input_y += 100;
					*/
				}

			//check outputs
			if( node.outputs )
				for(var j = 0; j < node.outputs.length; ++j)
				{
					var output = node.outputs[j];
					if( !output || !output.links || !output.links.length )
						continue;
					var is_external = false;
					for(var k = 0; k < output.links.length; ++k)
					{
						var link = node.graph.links[ output.links[k] ];
						if(!link)
							continue;
						if( ids[ link.target_id ] )
							continue;
						is_external = true;
						break;
					}
					if(!is_external)
						continue;
					//this.addOutput(output.name,output.type);
					/*
					var output_node = LiteGraph.createNode("graph/output");
					this.subgraph.add( output_node );
					output_node.pos = [max_x + 50, last_output_y ];
					last_output_y += 100;
					*/
				}
		}

		//detect inputs and outputs
			//split every connection in two data_connection nodes
			//keep track of internal connections
			//connect external connections

		//clone nodes inside subgraph and try to reconnect them

		//connect edge subgraph nodes to extarnal connections nodes
	}

    LiteGraph.Subgraph = Subgraph;
    LiteGraph.registerNodeType("graph/subgraph", Subgraph);

    //Input for a subgraph
    function GraphInput() {
        this.addOutput("", "number");

        this.name_in_graph = "";
        this.properties = {
			name: "",
			type: "number",
			value: 0
		}; 

        var that = this;

        this.name_widget = this.addWidget(
            "text",
            "Name",
            this.properties.name,
            function(v) {
                if (!v) {
                    return;
                }
                that.setProperty("name",v);
            }
        );
        this.type_widget = this.addWidget(
            "text",
            "Type",
            this.properties.type,
            function(v) {
				that.setProperty("type",v);
            }
        );

        this.value_widget = this.addWidget(
            "number",
            "Value",
            this.properties.value,
            function(v) {
                that.setProperty("value",v);
            }
        );

        this.widgets_up = true;
        this.size = [180, 90];
    }

    GraphInput.title = "Input";
    GraphInput.desc = "Input of the graph";

	GraphInput.prototype.onConfigure = function()

	{
		this.updateType();
	}

	//ensures the type in the node output and the type in the associated graph input are the same
	GraphInput.prototype.updateType = function()
	{
		var type = this.properties.type;
		this.type_widget.value = type;

		//update output
		if(this.outputs[0].type != type)
		{
	        if (!LiteGraph.isValidConnection(this.outputs[0].type,type))
				this.disconnectOutput(0);
			this.outputs[0].type = type;
		}

		//update widget
		if(type == "number")
		{
			this.value_widget.type = "number";
			this.value_widget.value = 0;
		}
		else if(type == "boolean")
		{
			this.value_widget.type = "toggle";
			this.value_widget.value = true;
		}
		else if(type == "string")
		{
			this.value_widget.type = "text";
			this.value_widget.value = "";
		}
		else
		{
			this.value_widget.type = null;
			this.value_widget.value = null;
		}
		this.properties.value = this.value_widget.value;

		//update graph
		if (this.graph && this.name_in_graph) {
			this.graph.changeInputType(this.name_in_graph, type);
		}
	}

	//this is executed AFTER the property has changed
	GraphInput.prototype.onPropertyChanged = function(name,v)
	{
		if( name == "name" )
		{
			if (v == "" || v == this.name_in_graph || v == "enabled") {
				return false;
			}
			if(this.graph)
			{
				if (this.name_in_graph) {
					//already added
					this.graph.renameInput( this.name_in_graph, v );
				} else {
					this.graph.addInput( v, this.properties.type );
				}
			} //what if not?!
			this.name_widget.value = v;
			this.name_in_graph = v;
		}
		else if( name == "type" )
		{
			this.updateType();
		}
		else if( name == "value" )
		{
		}
	}

    GraphInput.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    };

    GraphInput.prototype.onAction = function(action, param) {
        if (this.properties.type == LiteGraph.EVENT) {
            this.triggerSlot(0, param);
        }
    };

    GraphInput.prototype.onExecute = function() {
        var name = this.properties.name;
        //read from global input
        var data = this.graph.inputs[name];
        if (!data) {
            this.setOutputData(0, this.properties.value );
			return;
        }

        this.setOutputData(0, data.value !== undefined ? data.value : this.properties.value );
    };

    GraphInput.prototype.onRemoved = function() {
        if (this.name_in_graph) {
            this.graph.removeInput(this.name_in_graph);
        }
    };

    LiteGraph.GraphInput = GraphInput;
    LiteGraph.registerNodeType("graph/input", GraphInput);

    //Output for a subgraph
    function GraphOutput() {
        this.addInput("", "");

        this.name_in_graph = "";
        this.properties = { name: "", type: "" };
        var that = this;

        // Object.defineProperty(this.properties, "name", {
        //     get: function() {
        //         return that.name_in_graph;
        //     },
        //     set: function(v) {
        //         if (v == "" || v == that.name_in_graph) {
        //             return;
        //         }
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.renameOutput(that.name_in_graph, v);
        //         } else {
        //             that.graph.addOutput(v, that.properties.type);
        //         }
        //         that.name_widget.value = v;
        //         that.name_in_graph = v;
        //     },
        //     enumerable: true
        // });

        // Object.defineProperty(this.properties, "type", {
        //     get: function() {
        //         return that.inputs[0].type;
        //     },
        //     set: function(v) {
        //         if (v == "action" || v == "event") {
        //             v = LiteGraph.ACTION;
        //         }
		//         if (!LiteGraph.isValidConnection(that.inputs[0].type,v))
		// 			that.disconnectInput(0);
        //         that.inputs[0].type = v;
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.changeOutputType(
        //                 that.name_in_graph,
        //                 that.inputs[0].type
        //             );
        //         }
        //         that.type_widget.value = v || "";
        //     },
        //     enumerable: true
        // });

        this.name_widget = this.addWidget("text","Name",this.properties.name,"name");
        this.type_widget = this.addWidget("text","Type",this.properties.type,"type");
        this.widgets_up = true;
        this.size = [180, 60];
    }

    GraphOutput.title = "Output";
    GraphOutput.desc = "Output of the graph";

    GraphOutput.prototype.onPropertyChanged = function (name, v) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph) {
                if (this.name_in_graph) {
                    //already added
                    this.graph.renameOutput(this.name_in_graph, v);
                } else {
                    this.graph.addOutput(v, this.properties.type);
                }
            } //what if not?!
            this.name_widget.value = v;
            this.name_in_graph = v;
        }
        else if (name == "type") {
            this.updateType();
        }
        else if (name == "value") {
        }
    }
     
    GraphOutput.prototype.updateType = function () {
        var type = this.properties.type;
        if (this.type_widget)
            this.type_widget.value = type;

        //update output
        if (this.inputs[0].type != type) {

			if ( type == "action" || type == "event")
	            type = LiteGraph.EVENT;
			if (!LiteGraph.isValidConnection(this.inputs[0].type, type))
				this.disconnectInput(0);
			this.inputs[0].type = type;
        }

        //update graph
        if (this.graph && this.name_in_graph) {
            this.graph.changeOutputType(this.name_in_graph, type);
        }
    }



    GraphOutput.prototype.onExecute = function() {
        this._value = this.getInputData(0);
        this.graph.setOutputData(this.properties.name, this._value);
    };

    GraphOutput.prototype.onAction = function(action, param) {
        if (this.properties.type == LiteGraph.ACTION) {
            this.graph.trigger( this.properties.name, param );
        }
    };

    GraphOutput.prototype.onRemoved = function() {
        if (this.name_in_graph) {
            this.graph.removeOutput(this.name_in_graph);
        }
    };

    GraphOutput.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    };

    LiteGraph.GraphOutput = GraphOutput;
    LiteGraph.registerNodeType("graph/output", GraphOutput);

    //Constant
    function ConstantNumber() {
        this.addOutput("value", "number");
        this.addProperty("value", 1.0);
        this.widget = this.addWidget("number","value",1,"value");
        this.widgets_up = true;
        this.size = [180, 30];
    }

    ConstantNumber.title = "Const Number";
    ConstantNumber.desc = "Constant number";

    ConstantNumber.prototype.onExecute = function() {
        this.setOutputData(0, parseFloat(this.properties["value"]));
    };

    ConstantNumber.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.value;
        }
        return this.title;
    };

	ConstantNumber.prototype.setValue = function(v)
	{
		this.setProperty("value",v);
	}

    ConstantNumber.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = this.properties["value"].toFixed(3);
    };

    LiteGraph.registerNodeType("basic/const", ConstantNumber);

    function ConstantBoolean() {
        this.addOutput("bool", "boolean");
        this.addProperty("value", true);
        this.widget = this.addWidget("toggle","value",true,"value");
        this.serialize_widgets = true;
        this.widgets_up = true;
        this.size = [140, 30];
    }

    ConstantBoolean.title = "Const Boolean";
    ConstantBoolean.desc = "Constant boolean";
    ConstantBoolean.prototype.getTitle = ConstantNumber.prototype.getTitle;

    ConstantBoolean.prototype.onExecute = function() {
        this.setOutputData(0, this.properties["value"]);
    };

	ConstantBoolean.prototype.setValue = ConstantNumber.prototype.setValue;

	ConstantBoolean.prototype.onGetInputs = function() {
		return [["toggle", LiteGraph.ACTION]];
	};

	ConstantBoolean.prototype.onAction = function(action)
	{
		this.setValue( !this.properties.value );
	}

    LiteGraph.registerNodeType("basic/boolean", ConstantBoolean);

    function ConstantString() {
        this.addOutput("string", "string");
        this.addProperty("value", "");
        this.widget = this.addWidget("text","value","","value");  //link to property value
        this.widgets_up = true;
        this.size = [180, 30];
    }

    ConstantString.title = "Const String";
    ConstantString.desc = "Constant string";

    ConstantString.prototype.getTitle = ConstantNumber.prototype.getTitle;

    ConstantString.prototype.onExecute = function() {
        this.setOutputData(0, this.properties["value"]);
    };

	ConstantString.prototype.setValue = ConstantNumber.prototype.setValue;

	ConstantString.prototype.onDropFile = function(file)
	{
		var that = this;
		var reader = new FileReader();
		reader.onload = function(e)
		{
			that.setProperty("value",e.target.result);
		}
		reader.readAsText(file);
	}

    LiteGraph.registerNodeType("basic/string", ConstantString);

    function ConstantObject() {
        this.addOutput("obj", "object");
        this.size = [120, 30];
		this._object = {};
    }

    ConstantObject.title = "Const Object";
    ConstantObject.desc = "Constant Object";

    ConstantObject.prototype.onExecute = function() {
        this.setOutputData(0, this._object);
    };

    LiteGraph.registerNodeType( "basic/object", ConstantObject );

    function ConstantFile() {
        this.addInput("url", "string");
        this.addOutput("file", "string");
        this.addProperty("url", "");
        this.addProperty("type", "text");
        this.widget = this.addWidget("text","url","","url");
        this._data = null;
    }

    ConstantFile.title = "Const File";
    ConstantFile.desc = "Fetches a file from an url";
    ConstantFile["@type"] = { type: "enum", values: ["text","arraybuffer","blob","json"] };

    ConstantFile.prototype.onPropertyChanged = function(name, value) {
        if (name == "url")
		{
			if( value == null || value == "")
				this._data = null;
			else
			{
				this.fetchFile(value);
			}
		}
	}

    ConstantFile.prototype.onExecute = function() {
		var url = this.getInputData(0) || this.properties.url;
		if(url && (url != this._url || this._type != this.properties.type))
			this.fetchFile(url);
        this.setOutputData(0, this._data );
    };

	ConstantFile.prototype.setValue = ConstantNumber.prototype.setValue;

    ConstantFile.prototype.fetchFile = function(url) {
		var that = this;
		if(!url || url.constructor !== String)
		{
			that._data = null;
            that.boxcolor = null;
			return;
		}

		this._url = url;
		this._type = this.properties.type;
        if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
            url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
        }
		fetch(url)
		.then(function(response) {
			if(!response.ok)
				 throw new Error("File not found");

			if(that.properties.type == "arraybuffer")
				return response.arrayBuffer();
			else if(that.properties.type == "text")
				return response.text();
			else if(that.properties.type == "json")
				return response.json();
			else if(that.properties.type == "blob")
				return response.blob();
		})
		.then(function(data) {
			that._data = data;
            that.boxcolor = "#AEA";
		})
		.catch(function(error) {
			that._data = null;
            that.boxcolor = "red";
			console.error("error fetching file:",url);
		});
    };

	ConstantFile.prototype.onDropFile = function(file)
	{
		var that = this;
		this._url = file.name;
		this._type = this.properties.type;
		this.properties.url = file.name;
		var reader = new FileReader();
		reader.onload = function(e)
		{
            that.boxcolor = "#AEA";
			var v = e.target.result;
			if( that.properties.type == "json" )
				v = JSON.parse(v);
			that._data = v;
		}
		if(that.properties.type == "arraybuffer")
			reader.readAsArrayBuffer(file);
		else if(that.properties.type == "text" || that.properties.type == "json")
			reader.readAsText(file);
		else if(that.properties.type == "blob")
			return reader.readAsBinaryString(file);
	}

    LiteGraph.registerNodeType("basic/file", ConstantFile);


//to store json objects
function JSONParse() {
	this.addInput("parse", LiteGraph.ACTION);
	this.addInput("json", "string");
	this.addOutput("done", LiteGraph.EVENT);
	this.addOutput("object", "object");
	this.widget = this.addWidget("button","parse","",this.parse.bind(this));
	this._str = null;
	this._obj = null;
}

JSONParse.title = "JSON Parse";
JSONParse.desc = "Parses JSON String into object";

JSONParse.prototype.parse = function()
{
	if(!this._str)
		return;

	try {
		this._str = this.getInputData(1);
		this._obj = JSON.parse(this._str);
		this.boxcolor = "#AEA";
		this.triggerSlot(0);
	} catch (err) {
		this.boxcolor = "red";
	}
}

JSONParse.prototype.onExecute = function() {
	this._str = this.getInputData(1);
	this.setOutputData(1, this._obj);
};

JSONParse.prototype.onAction = function(name) {
	if(name == "parse")
		this.parse();
}

LiteGraph.registerNodeType("basic/jsonparse", JSONParse);	

	//to store json objects
    function ConstantData() {
        this.addOutput("data", "object");
        this.addProperty("value", "");
        this.widget = this.addWidget("text","json","","value");
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;
    }

    ConstantData.title = "Const Data";
    ConstantData.desc = "Constant Data";

    ConstantData.prototype.onPropertyChanged = function(name, value) {
        this.widget.value = value;
        if (value == null || value == "") {
            return;
        }

        try {
            this._value = JSON.parse(value);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
        }
    };

    ConstantData.prototype.onExecute = function() {
        this.setOutputData(0, this._value);
    };

	ConstantData.prototype.setValue = ConstantNumber.prototype.setValue;

    LiteGraph.registerNodeType("basic/data", ConstantData);

	//to store json objects
    function ConstantArray() {
		this._value = [];
        this.addInput("json", "");
        this.addOutput("arrayOut", "array");
		this.addOutput("length", "number");
        this.addProperty("value", "[]");
        this.widget = this.addWidget("text","array",this.properties.value,"value");
        this.widgets_up = true;
        this.size = [140, 50];
    }

    ConstantArray.title = "Const Array";
    ConstantArray.desc = "Constant Array";

    ConstantArray.prototype.onPropertyChanged = function(name, value) {
        this.widget.value = value;
        if (value == null || value == "") {
            return;
        }

        try {
			if(value[0] != "[")
	            this._value = JSON.parse("[" + value + "]");
			else
	            this._value = JSON.parse(value);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
        }
    };

    ConstantArray.prototype.onExecute = function() {
        var v = this.getInputData(0);
		if(v && v.length) //clone
		{
			if(!this._value)
				this._value = new Array();
			this._value.length = v.length;
			for(var i = 0; i < v.length; ++i)
				this._value[i] = v[i];
            this.changeOutputType("arrayOut", "array");
		}
		this.setOutputData(0, this._value);
		this.setOutputData(1, this._value ? ( this._value.length || 0) : 0 );
    };

	ConstantArray.prototype.setValue = ConstantNumber.prototype.setValue;

    LiteGraph.registerNodeType("basic/array", ConstantArray);


    function ArrayLength(){
        this.addInput("arr", "array");
        this.addOutput("length", "number");
	}
    ArrayLength.title = "aLength";
    ArrayLength.desc = "Get the length of an array";
    ArrayLength.prototype.onExecute = function() {
        var arr = this.getInputData(0);
		if(!arr)
			return;
        if(["array","object"].includes(typeof(arr)) && typeof(arr.length)!=="undefined"){
		    this.setOutputData(0,arr.length);
        }else{
            console.debug("Not an array or object",typeof(arr),arr);
		    this.setOutputData(0,null);
        }
    };
    LiteGraph.registerNodeType("basic/array_length", ArrayLength );


	function SetArray()
	{
        this.addInput("arr", "array");
        this.addInput("value", "");
        this.addOutput("arr", "array");
		this.properties = { index: 0 };
        this.widget = this.addWidget("number","i",this.properties.index,"index",{precision: 0, step: 10, min: 0});
	}

    SetArray.title = "Set Array";
    SetArray.desc = "Sets index of array";

    SetArray.prototype.onExecute = function() {
        var arr = this.getInputData(0);
		if(!arr)
			return;
        var v = this.getInputData(1);
		if(v === undefined )
			return;
		if(this.properties.index)
			arr[ Math.floor(this.properties.index) ] = v;
		this.setOutputData(0,arr);
    };

    LiteGraph.registerNodeType("basic/set_array", SetArray );

    function ArrayElement() {
        this.addInput("array", "array,table,string");
        this.addInput("index", "number");
        this.addOutput("value", "");
		this.addProperty("index",0);
    }

    ArrayElement.title = "Array[i]";
    ArrayElement.desc = "Returns an element from an array";

    ArrayElement.prototype.onExecute = function() {
        var array = this.getInputData(0);
        var index = this.getInputData(1);
		if(index == null)
			index = this.properties.index;
		if(array == null || index == null )
			return;
        this.setOutputData(0, array[Math.floor(Number(index))] );
    };

    LiteGraph.registerNodeType("basic/array[]", ArrayElement);

    function TableElement() {
        this.addInput("table", "table");
        this.addInput("row", "number");
        this.addInput("col", "number");
        this.addOutput("value", "");
		this.addProperty("row",0);
		this.addProperty("column",0);
    }

    TableElement.title = "Table[row][col]";
    TableElement.desc = "Returns an element from a table";

    TableElement.prototype.onExecute = function() {
        var table = this.getInputData(0);
        var row = this.getInputData(1);
        var col = this.getInputData(2);
		if(row == null)
			row = this.properties.row;
		if(col == null)
			col = this.properties.column;
		if(table == null || row == null || col == null)
			return;
		var row = table[Math.floor(Number(row))];
		if(row)
	        this.setOutputData(0, row[Math.floor(Number(col))] );
		else
	        this.setOutputData(0, null );
    };

    LiteGraph.registerNodeType("basic/table[][]", TableElement);

    function ObjectProperty() {
        this.addInput("obj", "object");
        this.addOutput("property", 0);
        this.addProperty("value", 0);
        this.widget = this.addWidget("text","prop.","",this.setValue.bind(this) );
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;
    }

    ObjectProperty.title = "Object property";
    ObjectProperty.desc = "Outputs the property of an object";

    ObjectProperty.prototype.setValue = function(v) {
        this.properties.value = v;
        this.widget.value = v;
    };

    ObjectProperty.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return "in." + this.properties.value;
        }
        return this.title;
    };

    ObjectProperty.prototype.onPropertyChanged = function(name, value) {
        this.widget.value = value;
    };

    ObjectProperty.prototype.onExecute = function() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, data[this.properties.value]);
        }
    };

    LiteGraph.registerNodeType("basic/object_property", ObjectProperty);

    function ObjectKeys() {
        this.addInput("obj", "");
        this.addOutput("keys", "array");
        this.size = [140, 30];
    }

    ObjectKeys.title = "Object keys";
    ObjectKeys.desc = "Outputs an array with the keys of an object";

    ObjectKeys.prototype.onExecute = function() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, Object.keys(data) );
        }
    };

    LiteGraph.registerNodeType("basic/object_keys", ObjectKeys);


	function SetObject()
	{
        this.addInput("obj", "");
        this.addInput("value", "");
        this.addOutput("obj", "");
		this.properties = { property: "" };
        this.name_widget = this.addWidget("text","prop.",this.properties.property,"property");
	}

    SetObject.title = "Set Object";
    SetObject.desc = "Adds propertiesrty to object";

    SetObject.prototype.onExecute = function() {
        var obj = this.getInputData(0);
		if(!obj)
			return;
        var v = this.getInputData(1);
		if(v === undefined )
			return;
		if(this.properties.property)
			obj[ this.properties.property ] = v;
		this.setOutputData(0,obj);
    };

    LiteGraph.registerNodeType("basic/set_object", SetObject );


    function MergeObjects() {
        this.addInput("A", "object");
        this.addInput("B", "object");
        this.addOutput("out", "object");
		this._result = {};
		var that = this;
		this.addWidget("button","clear","",function(){
			that._result = {};
		});
		this.size = this.computeSize();
    }

    MergeObjects.title = "Merge Objects";
    MergeObjects.desc = "Creates an object copying properties from others";

    MergeObjects.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
		var C = this._result;
		if(A)
			for(var i in A)
				C[i] = A[i];
		if(B)
			for(var i in B)
				C[i] = B[i];
		this.setOutputData(0,C);
    };

    LiteGraph.registerNodeType("basic/merge_objects", MergeObjects );

    //Store as variable
    function Variable() {
        this.size = [60, 30];
        this.addInput("in");
        this.addOutput("out");
		this.properties = { varname: "myname", container: Variable.LITEGRAPH };
        this.value = null;
    }

    Variable.title = "Variable";
    Variable.desc = "store/read variable value";

	Variable.LITEGRAPH = 0; //between all graphs
	Variable.GRAPH = 1;	//only inside this graph
	Variable.GLOBALSCOPE = 2;	//attached to Window

    Variable["@container"] = { type: "enum", values: {"litegraph":Variable.LITEGRAPH, "graph":Variable.GRAPH,"global": Variable.GLOBALSCOPE} };

    Variable.prototype.onExecute = function() {
		var container = this.getContainer();

		if(this.isInputConnected(0))
		{
			this.value = this.getInputData(0);
			container[ this.properties.varname ] = this.value;
			this.setOutputData(0, this.value );
			return;
		}

		this.setOutputData( 0, container[ this.properties.varname ] );
    };

	Variable.prototype.getContainer = function()
	{
		switch(this.properties.container)
		{
			case Variable.GRAPH:
				if(this.graph)
					return this.graph.vars;
				return {};
				break;
			case Variable.GLOBALSCOPE:
				return global;
				break;
			case Variable.LITEGRAPH:
			default:
				return LiteGraph.Globals;
				break;
		}
	}

    Variable.prototype.getTitle = function() {
        return this.properties.varname;
    };

    LiteGraph.registerNodeType("basic/variable", Variable);

    function length(v) {
        if(v && v.length != null)
			return Number(v.length);
		return 0;
    }

    LiteGraph.wrapFunctionAsNode(
        "basic/length",
        length,
        [""],
        "number"
    );

    function length(v) {
        if(v && v.length != null)
			return Number(v.length);
		return 0;
    }

    LiteGraph.wrapFunctionAsNode(
        "basic/not",
        function(a){ return !a; },
        [""],
        "boolean"
    );

	function DownloadData() {
        this.size = [60, 30];
        this.addInput("data", 0 );
        this.addInput("download", LiteGraph.ACTION );
		this.properties = { filename: "data.json" };
        this.value = null;
		var that = this;
		this.addWidget("button","Download","", function(v){
			if(!that.value)
				return;
			that.downloadAsFile();
		});
    }

    DownloadData.title = "Download";
    DownloadData.desc = "Download some data";

	DownloadData.prototype.downloadAsFile = function()
	{
		if(this.value == null)
			return;

		var str = null;
		if(this.value.constructor === String)
			str = this.value;
		else
			str = JSON.stringify(this.value);

		var file = new Blob([str]);
		var url = URL.createObjectURL( file );
		var element = document.createElement("a");
		element.setAttribute('href', url);
		element.setAttribute('download', this.properties.filename );
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
		setTimeout( function(){ URL.revokeObjectURL( url ); }, 1000*60 ); //wait one minute to revoke url
	}

    DownloadData.prototype.onAction = function(action, param) {
		var that = this;
		setTimeout( function(){ that.downloadAsFile(); }, 100); //deferred to avoid blocking the renderer with the popup
	}

    DownloadData.prototype.onExecute = function() {
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    };

    DownloadData.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.filename;
        }
        return this.title;
    };

    LiteGraph.registerNodeType("basic/download", DownloadData);



    //Watch a value in the editor
    function Watch() {
        this.size = [60, 30];
        this.addInput("value", 0, { label: "" });
        this.value = 0;
    }

    Watch.title = "Watch";
    Watch.desc = "Show value of input";

    Watch.prototype.onExecute = function() {
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
        if(this.mode == LiteGraph.ON_TRIGGER){
            console.debug("WATCH",this);
        }
    };

    Watch.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.inputs[0].label;
        }
        return this.title;
    };

    Watch.toString = function(o) {
        if (o == null) {
            return "null";
        } else if (o.constructor === Number) {
            return o.toFixed(3);
        } else if (o.constructor === Array) {
            var str = "[";
            for (var i = 0; i < o.length; ++i) {
                str += Watch.toString(o[i]) + (i + 1 != o.length ? "," : "");
            }
            str += "]";
            return str;
        } else {
            return String(o);
        }
    };

    Watch.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.inputs[0].label = Watch.toString(this.value);
    };

    LiteGraph.registerNodeType("basic/watch", Watch);

    //in case one type doesnt match other type but you want to connect them anyway
    function Cast() {
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.size = [40, 30];
    }

    Cast.title = "Cast";
    Cast.desc = "Allows to connect different types";

    Cast.prototype.onExecute = function() {
        this.setOutputData(0, this.getInputData(0));
    };

    LiteGraph.registerNodeType("basic/cast", Cast);

    //Show value inside the debug console
    function Console() {
        this.mode = LiteGraph.ON_EVENT;
        this.size = [80, 30];
        this.addProperty("msg", "");
        this.addInput("log", LiteGraph.EVENT);
        this.addInput("msg", 0);
    }

    Console.title = "Console";
    Console.desc = "Show value inside the console";

    Console.prototype.onAction = function(action, param) {
        // param is the action
        var msg = this.getInputData(1); //getInputDataByName("msg");
        //if (msg == null || typeof msg == "undefined") return;
        if (!msg) msg = this.properties.msg;
        if (!msg) msg = "Event: "+param; // msg is undefined if the slot is lost?
        if (action == "log") {
            console.log(msg);
        } else if (action == "warn") {
            console.warn(msg);
        } else if (action == "error") {
            console.error(msg);
        }
    };

    Console.prototype.onExecute = function() {
        var msg = this.getInputData(1); //getInputDataByName("msg");
        if (!msg) msg = this.properties.msg;
        if (msg != null && typeof msg != "undefined") {
            this.properties.msg = msg;
            console.log(msg);
        }
    };

    Console.prototype.onGetInputs = function() {
        return [
            ["log", LiteGraph.ACTION],
            ["warn", LiteGraph.ACTION],
            ["error", LiteGraph.ACTION]
        ];
    };

    LiteGraph.registerNodeType("basic/console", Console);

    //Show value inside the debug console
    function Alert() {
        this.mode = LiteGraph.ON_EVENT;
        this.addProperty("msg", "");
        this.addInput("", LiteGraph.EVENT);
        var that = this;
        this.widget = this.addWidget("text", "Text", "", "msg");
        this.widgets_up = true;
        this.size = [200, 30];
    }

    Alert.title = "Alert";
    Alert.desc = "Show an alert window";
    Alert.color = "#510";

    Alert.prototype.onConfigure = function(o) {
        this.widget.value = o.properties.msg;
    };

    Alert.prototype.onAction = function(action, param) {
        var msg = this.properties.msg;
        setTimeout(function() {
            alert(msg);
        }, 10);
    };

    LiteGraph.registerNodeType("basic/alert", Alert);

    //Execute simple code
    function NodeScript() {
        this.size = [60, 30];
        this.addProperty("onExecute", "return A;");
        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("out", 0);

        this._func = null;
        this.data = {};
    }

    NodeScript.prototype.onConfigure = function(o) {
        if (o.properties.onExecute && LiteGraph.allow_scripts)
            this.compileCode(o.properties.onExecute);
		else
			console.warn("Script not compiled, LiteGraph.allow_scripts is false");
    };

    NodeScript.title = "Script";
    NodeScript.desc = "executes a code (max 256 characters)";

    NodeScript.widgets_info = {
        onExecute: { type: "code" }
    };

    NodeScript.prototype.onPropertyChanged = function(name, value) {
        if (name == "onExecute" && LiteGraph.allow_scripts)
            this.compileCode(value);
		else
			console.warn("Script not compiled, LiteGraph.allow_scripts is false");
    };

    NodeScript.prototype.compileCode = function(code) {
        this._func = null;
        if (code.length > 256) {
            console.warn("Script too long, max 256 chars");
        } else {
            var code_low = code.toLowerCase();
            var forbidden_words = [
                "script",
                "body",
                "document",
                "eval",
                "nodescript",
                "function"
            ]; //bad security solution
            for (var i = 0; i < forbidden_words.length; ++i) {
                if (code_low.indexOf(forbidden_words[i]) != -1) {
                    console.warn("invalid script");
                    return;
                }
            }
            try {
                this._func = new Function("A", "B", "C", "DATA", "node", code);
            } catch (err) {
                console.error("Error parsing script");
                console.error(err);
            }
        }
    };

    NodeScript.prototype.onExecute = function() {
        if (!this._func) {
            return;
        }

        try {
            var A = this.getInputData(0);
            var B = this.getInputData(1);
            var C = this.getInputData(2);
            this.setOutputData(0, this._func(A, B, C, this.data, this));
        } catch (err) {
            console.error("Error in script");
            console.error(err);
        }
    };

    NodeScript.prototype.onGetOutputs = function() {
        return [["C", ""]];
    };

    LiteGraph.registerNodeType("basic/script", NodeScript);
    
    
    function GenericCompare() {
        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("true", "boolean");
        this.addOutput("false", "boolean");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", "==", "enum", { values: GenericCompare.values });
		this.addWidget("combo","Op.",this.properties.OP,{ property: "OP", values: GenericCompare.values } );

        this.size = [80, 60];
    }

    GenericCompare.values = ["==", "!="]; //[">", "<", "==", "!=", "<=", ">=", "||", "&&" ];
    GenericCompare["@OP"] = {
        type: "enum",
        title: "operation",
        values: GenericCompare.values
    };

    GenericCompare.title = "Compare *";
    GenericCompare.desc = "evaluates condition between A and B";

    GenericCompare.prototype.getTitle = function() {
        return "*A " + this.properties.OP + " *B";
    };

    GenericCompare.prototype.onExecute = function() {
        var A = this.getInputData(0);
        if (A === undefined) {
            A = this.properties.A;
        } else {
            this.properties.A = A;
        }

        var B = this.getInputData(1);
        if (B === undefined) {
            B = this.properties.B;
        } else {
            this.properties.B = B;
        }

        var result = false;
        if (typeof A == typeof B){
            switch (this.properties.OP) {
                case "==":
                case "!=":
                    // traverse both objects.. consider that this is not a true deep check! consider underscore or other library for thath :: _isEqual()
                    result = true;
                    switch(typeof A){
                        case "object":
                            var aProps = Object.getOwnPropertyNames(A);
                            var bProps = Object.getOwnPropertyNames(B);
                            if (aProps.length != bProps.length){
                                result = false;
                                break;
                            }
                            for (var i = 0; i < aProps.length; i++) {
                                var propName = aProps[i];
                                if (A[propName] !== B[propName]) {
                                    result = false;
                                    break;
                                }
                            }
                        break;
                        default:
                            result = A == B;
                    }
                    if (this.properties.OP == "!=") result = !result;
                    break;
                /*case ">":
                    result = A > B;
                    break;
                case "<":
                    result = A < B;
                    break;
                case "<=":
                    result = A <= B;
                    break;
                case ">=":
                    result = A >= B;
                    break;
                case "||":
                    result = A || B;
                    break;
                case "&&":
                    result = A && B;
                    break;*/
            }
        }
        this.setOutputData(0, result);
        this.setOutputData(1, !result);
    };

    LiteGraph.registerNodeType("basic/CompareValues", GenericCompare);
    
})(this);


//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;


    // EG METHOD

    // function mMETHOD(){
    //     this.properties = { };
    //     // this.addInput("onTrigger", LiteGraph.ACTION);
    //     // this.addInput("condition", "boolean");
    //     // this.addOutput("true", LiteGraph.EVENT);
    //     // this.addOutput("false", LiteGraph.EVENT);
    //     this.mode = LiteGraph.ON_TRIGGER;
    // }
    // mMETHOD.title = "Branch";
    // mMETHOD.desc = "Branch execution on condition";
    // mMETHOD.prototype.onExecute = function(param, options) {
    //     // this.triggerSlot(0);
    // };
    // mMETHOD.prototype.onAction = function(action, param, options){
    // };
    // mMETHOD.prototype.onGetInputs = function() {
    //     //return [["optional slot in", 0]];
    // };
    // mMETHOD.prototype.onGetOutputs = function() {
    //     //return [["optional slot out", 0]];
    // };
    // LiteGraph.registerNodeType("basic/egnode", mMETHOD);

    // --------------------------

    function objProperties(){

        this.addInput("obj", "object");
        // this.addInput("condition", "boolean");

        this.addOutput("properties", "array");
        // this.addOutput("false", LiteGraph.EVENT);

        // this.mode = LiteGraph.ON_TRIGGER;
        //this.widget = this.addWidget("text","prop.","",this.setValue.bind(this) );
        //this.widgets_up = true;
        //this.size = [140, 30];
        this._value = null;
        this._properties = [];
    }
    objProperties.title = "OBJ props";
    objProperties.desc = "Properties for objects";
    objProperties.prototype.onExecute = function(param, options) {
        var data = this.getInputData(0);
        if (data != null) {
            this._value = data;
            try{
                this._properties = Object.keys(this._value);
            }catch(e){
            }
            this.setOutputData(0, this._properties);
        }
    };
    objProperties.prototype.onAction = function(action, param, options){
        // should probably execute on action
    };
    objProperties.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    objProperties.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    objProperties.prototype.getTitle = function() {
        if (this.flags.collapsed) {
        }
        return this.title;
    };
    objProperties.prototype.onPropertyChanged = function(name, value) {
        //this.widget.value = value;
    };
    LiteGraph.registerNodeType("objects/properties", objProperties);

    // --------------------------

    // node events
    /*
    onWidgetChanged
    */


    // widgets
    /*

    this.widg_prop = this.addWidget("property","prop.","",this.setValue.bind(this) );
    this.widg_prop = this.addWidget("combo","prop.",this.properties.prop,{ property: "prop", values: [] }); //,this.setValue.bind(this) );
    
    // to put it before inputs
    this.widgets_up = true;
    
    // remove or update does not exists :: should save index to do it :: this.removeWidget();
    // to clear
    this.widgets = [];
    // readd if needed
    this.widg_prop = this.addWidget();

    // can specify draw function
    obWidget.draw = function(ctx, node, widget_width, y, H){

    }
    // can override Y placement
    obWidget.computeSize = function(width){
        return Y;
    }

    obWidget.mouse = function(){
        return b_isDirtyCanvas; // can specify if canvas should get dirty
    }

    obWidget.callback = function(value, canvas, node, pos, event){

    }

    */

    // --------------------------


    function objPropertyWidget(){

        this.addInput("obj", "object");
        // this.addInput("condition", "boolean");

        this.addOutput("value", "*");
        // this.addOutput("false", LiteGraph.EVENT);

        this.addProperty("prop", 0);

        // this.mode = LiteGraph.ON_REQUEST; // to be optimized, could run always
        //this.widg_prop = this.addWidget("property","prop.","",this.setValue.bind(this) );
        this.widg_prop = this.addWidget("combo","prop.",this.properties.prop,{ property: "prop", values: [] }); //,this.setValue.bind(this) );
        //this.widgets_up = true;
        //this.size = [140, 30];

        this._obin = null;
        this._value = null;
        this._properties = [];
    }
    objPropertyWidget.title = "Obj Prop widget";
    objPropertyWidget.desc = "Choose a property for an object";
    objPropertyWidget.prototype.setValue = function(v) {
        this.properties.prop = v;
        this.widg_prop.value = v;
    };
    objPropertyWidget.prototype.updateFromInput = function(v) {
        var data = this.getInputData(0);
        if (data != null) {
            this._obin = data;
            if(this._obin){ //} && typeof this._obin == "Object"){
                // TODO should detect change or rebuild use a widget/action to refresh properties list
                try{
                    this._properties = Object.keys(this._obin);
                    if(this._properties && this._properties.sort) this._properties = this._properties.sort();
                }catch(e){
                }
                if(this._properties){
                    //this.removeWidget();
                    this.widgets = [];
                    this.widg_prop = this.addWidget("combo","prop",this.properties.prop,{ property: "prop", values: this._properties });
                }
                if(typeof this._obin[this.properties.prop] !== "undefined"){
                    this._value = this._obin[this.properties.prop];
                }else{
                    this._value = null;    
                }
            }else{
                this._value = null;
                this._properties = [];
            }
        }
        if(!this.widg_prop.options) this.widg_prop.options = {};
        this.widg_prop.options.values = this._properties;
        this.setOutputData(0, this._value);
    };
    objPropertyWidget.prototype.onExecute = function(param, options) {
        this.updateFromInput();
    };
    objPropertyWidget.prototype.onAction = function(action, param, options){
        // should probably execute on action
        this.updateFromInput();
    };
    objPropertyWidget.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    objPropertyWidget.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    objPropertyWidget.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.prop;
        }
        return this.title;
    };
    objPropertyWidget.prototype.onPropertyChanged = function(name, value) {
        if(name == "value"){
            this.widg_prop.value = value;
        }
    };
    objPropertyWidget.prototype.getExtraMenuOptions = function(canvas, options){
        return [{
            content: "Console DBG", //has_submenu: false,
            callback: function(menuitO,obX,ev,htmO,nodeX){
                console.debug(nodeX.widg_prop);
                console.debug(nodeX);
            }
        }];
    }
    LiteGraph.registerNodeType("objects/property_widget", objPropertyWidget);


    function objMethodWidget(){
        this.addInput("obj", "object");
        // this.addInput("onTrigger", LiteGraph.ACTION);
        this.addInput("refresh", LiteGraph.ACTION);
        this.addInput("execute", LiteGraph.ACTION);
        this.addOutput("executed", LiteGraph.EVENT);
        this.addOutput("method", "function");
        this.addOutput("return", "*");
        this.addProperty("method", null);
        // this.mode = LiteGraph.ON_REQUEST; // to be optimized, could run always
        this.widg_prop = this.addWidget("combo","method",this.properties.method,{ property: "method", values: [] }); //,this.setValue.bind(this) );
        this._obin = null;
        this._function = null;
        this._methods = [];
    }
    objMethodWidget.title = "Obj Method widget";
    objMethodWidget.desc = "Choose and execute a method from an object";
    objMethodWidget.prototype.setValue = function(v) {
        this.properties.method = v;
        this.widg_prop.value = v;
    };
    objMethodWidget.prototype.updateFromInput = function(v) {
        var that = this;
        var data = this.getInputData(0);
        if (data != null) {
            this._obin = data;
            if(this._obin){ //} && typeof this._obin == "Object"){
                // TODO should detect change or rebuild use a widget/action to refresh properties list
                try{
                    this._methods = [];
                    // method 1, simple
                    /* var allProps = Object.keys(this._obin);
                    console.debug("Props",allProps);
                    for(var iM in allProps){
                        // console.debug("dbg prop",allProps[iM],typeof(this._obin[allProps[iM]]));
                        if(typeof(this._obin[allProps[iM]]) == "function"){
                            this._methods.push(allProps[iM]);
                        }
                    } */
                    // method 2, better
                    /* for(var iM in this._obin){
                        // console.debug("dbg prop",allProps[iM],typeof(this._obin[allProps[iM]]));
                        if(typeof(this._obin[iM]) == "function"){
                            this._methods.push(iM);
                        }
                    } */
                    // method 3
                    this._properties = [];
                    currentObj = this._obin;
                    do {
                        Object.getOwnPropertyNames(currentObj).map(function(item){ if(!that._properties.includes(item)) that._properties.push(item) });
                    } while ((currentObj = Object.getPrototypeOf(currentObj)));
                    for(var iM in this._properties){
                        if(typeof(this._obin[this._properties[iM]]) == "function"){
                            this._methods.push(this._properties[iM]);
                        }
                    }
                    if(this._methods && this._methods.sort) this._methods = this._methods.sort();
                }catch(e){
                    console.warn("Err on methods get",e);
                }
                if(this._methods){
                    //this.removeWidget();
                    this.widgets = [];
                    this.widg_prop = this.addWidget("combo","method",this.properties.method,{ property: "method", values: this._methods });
                }

            }else{
                console.debug("Invalid obj",data);
                this._function = null;
                this._methods = [];
            }
        }
        if(!this.widg_prop.options) this.widg_prop.options = {}; // reset widget options
        this.widg_prop.options.values = this._methods; // set widget options
        
        this.updateInputsForMethod();
    };
    objMethodWidget.prototype.updateInputsForMethod = function() {
        // TODO fixthis :: property is not yet updated?
        var actVal = this.widg_prop.value; // this.properties.method
        if(actVal && this._obin && typeof this._obin[actVal] !== "undefined"){

            // if changed, reset inputs
            // if(this._function !== this._obin[actVal]){
            //     for (var i = 3; i < this.inputs; ++i) {
            //         this.removeSlot(i);
            //     }    
            // }

            this._function = this._obin[actVal];

            var params = Array(this._function.length);
            var names = LiteGraph.getParameterNames(this._function);
            for (var i = 0; i < names.length; ++i) {
                var exs = this.findInputSlot(names[i]);
                if(exs == -1){
                    this.addInput(names[i],"",{auto: true, removable: false, nameLocked: true});
                }
            }
            this._params = names;
            
        }else{
            console.debug("Invalid method",actVal);
            this._function = null;    
        }
        this.setOutputData(1, this._function); // update function output
    }
    objMethodWidget.prototype.onExecute = function(param, options) {
        // this.updateFromInput();
        // ?
    };
    // objMethodWidget.prototype.onPropertyChanged = function(name, value, prev_value){
    //     console.debug("Property changed", name, value, prev_value)
    //     this.updateInputsForMethod();
    // }
    objMethodWidget.prototype.onWidgetChanged = function(name, value, prev_value, widget){
        console.debug("Widget changed", name, value, prev_value);
        // if changed, reset inputs
        if(this.properties.method !== value){
            for (var i = 3; i < this.inputs.length; ++i) {
                this.removeInput(i);
            }    
        }
        this.updateInputsForMethod();
    }
    objMethodWidget.prototype.onAction = function(action, param, options){
        // should probably execute on action
        // this.updateFromInput();
        if(action == "refresh"){
            this.updateFromInput();
        }else if(action == "execute"){
            if(this._function && typeof(this._function) == "function"){
                
                var parValues = [];
                for (var i = 3; i < this.inputs.length; i++) {
                    parValues.push(this.getInputData(i));
                }

                // call execute
                console.debug("NodeObjMethod Execute",parValues);
                var r = this._function(parValues); //this._function.apply(this, parValues);
                
                this.triggerSlot(0);
                this.setOutputData(2, r); // update method result
            }else{
                this.setOutputData(1, null);
                this.setOutputData(2, null);
            }
        }
    };
    objMethodWidget.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    objMethodWidget.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    objMethodWidget.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.method;
        }
        return this.title;
    };
    objMethodWidget.prototype.onPropertyChanged = function(name, value) {
        if(name == "value"){
            this.widg_prop.value = value;
        }
    };
    objMethodWidget.prototype.getExtraMenuOptions = function(canvas, options){
        return [{
            content: "NodeObjMethod DBG", //has_submenu: false,
            callback: function(menuitO,obX,ev,htmO,nodeX){
                console.debug(NodeObjMethod, nodeX.widg_prop, nodeX);
            }
        }];
    }
    LiteGraph.registerNodeType("objects/method_widget", objMethodWidget);

    // eval a Global object
    function objEvalGlo() {
        this.size = [60, 30];
        this.addProperty("obj_eval", "window");
        this.addOutput("obj", "object");
        this._func = null;
        this.data = {};
    }

    // SINGLE object EVAL
    objEvalGlo.prototype.onConfigure = function(o) {
        if (o.properties.obj_eval)
            this.compileCode(o.properties.obj_eval);
    };

    objEvalGlo.title = "Eval Obj";
    objEvalGlo.desc = "Evaluate an object";

    objEvalGlo.widgets_info = {
        obj_eval: { type: "code" }
    };

    objEvalGlo.prototype.onPropertyChanged = function(name, value) {
        if (name == "obj_eval")
            this.compileCode(value);
    };

    objEvalGlo.prototype.compileCode = function(code) {
        this._func = null;
        if (LiteGraph.allow_scripts){
            // ok
        }else{
            console.warn("Obj string not evaluated, LiteGraph.allow_scripts is false");
        }
        if (code.length > 256) {
            console.warn("Script too long, max 256 chars");
        } else {
            var code_eval = "return "+code;
            // var forbidden_words = [
            //     "script",
            //     "body",
            //     "document",
            //     "eval",
            //     "objEvalGlo",
            //     "function"
            // ]; //bad security solution
            // for (var i = 0; i < forbidden_words.length; ++i) {
            //     if (code_low.indexOf(forbidden_words[i]) != -1) {
            //         console.warn("invalid script");
            //         return;
            //     }
            // }
            try {
                this._func = new Function("DATA", "node", code_eval);
                console.debug("Evaluated",code,this._func);
            } catch (err) {
                console.error("Error parsing obj evaluation");
                console.error(err);
            }
        }
    };

    objEvalGlo.prototype.onExecute = function() {
        if (this.properties.obj_eval)
            this.compileCode(this.properties.obj_eval);
        if (!this._func) {
            this.setOutputData(0, null);
            return;
        }
        try {
            this.setOutputData(0, this._func(this.data, this));
        } catch (err) {
            this.setOutputData(0, null);
            console.error("Error in code eval");
            console.error(err);
        }
    };

    // objEvalGlo.prototype.onGetOutputs = function() {
    //     return [["C", ""]];
    // };

    LiteGraph.registerNodeType("objects/evaluate", objEvalGlo);

})(this);



//widgets
(function(global) {
    var LiteGraph = global.LiteGraph;

    /* Button ****************/

    function WidgetButton() {
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", "boolean");
        this.addProperty("text", "DO");
        this.addProperty("font_size", 30);
        this.addProperty("message", "");
        this.size = [84, 84];
        this.clicked = false;
    }

    WidgetButton.title = "Button";
    WidgetButton.desc = "Triggers an event";

    WidgetButton.font = "Arial";
    WidgetButton.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        var margin = 10;
        ctx.fillStyle = "black";
        ctx.fillRect(
            margin + 1,
            margin + 1,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );
        ctx.fillStyle = "#AAF";
        ctx.fillRect(
            margin - 1,
            margin - 1,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );
        ctx.fillStyle = this.clicked
            ? "white"
            : this.mouseOver
            ? "#668"
            : "#334";
        ctx.fillRect(
            margin,
            margin,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );

        if (this.properties.text || this.properties.text === 0) {
            var font_size = this.properties.font_size || 30;
            ctx.textAlign = "center";
            ctx.fillStyle = this.clicked ? "black" : "white";
            ctx.font = font_size + "px " + WidgetButton.font;
            ctx.fillText(
                this.properties.text,
                this.size[0] * 0.5,
                this.size[1] * 0.5 + font_size * 0.3
            );
            ctx.textAlign = "left";
        }
    };

    WidgetButton.prototype.onMouseDown = function(e, local_pos) {
        if (
            local_pos[0] > 1 &&
            local_pos[1] > 1 &&
            local_pos[0] < this.size[0] - 2 &&
            local_pos[1] < this.size[1] - 2
        ) {
            this.clicked = true;
            this.setOutputData(1, this.clicked);
            this.triggerSlot(0, this.properties.message);
            return true;
        }
    };

    WidgetButton.prototype.onExecute = function() {
        this.setOutputData(1, this.clicked);
    };

    WidgetButton.prototype.onMouseUp = function(e) {
        this.clicked = false;
    };

    LiteGraph.registerNodeType("widget/button", WidgetButton);

    function WidgetToggle() {
        this.addInput("", "boolean");
        this.addInput("e", LiteGraph.ACTION);
        this.addOutput("v", "boolean");
        this.addOutput("e", LiteGraph.EVENT);
        this.properties = { font: "", value: false };
        this.size = [160, 44];
    }

    WidgetToggle.title = "Toggle";
    WidgetToggle.desc = "Toggles between true or false";

    WidgetToggle.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        var size = this.size[1] * 0.5;
        var margin = 0.25;
        var h = this.size[1] * 0.8;
        ctx.font = this.properties.font || (size * 0.8).toFixed(0) + "px Arial";
        var w = ctx.measureText(this.title).width;
        var x = (this.size[0] - (w + size)) * 0.5;

        ctx.fillStyle = "#AAA";
        ctx.fillRect(x, h - size, size, size);

        ctx.fillStyle = this.properties.value ? "#AEF" : "#000";
        ctx.fillRect(
            x + size * margin,
            h - size + size * margin,
            size * (1 - margin * 2),
            size * (1 - margin * 2)
        );

        ctx.textAlign = "left";
        ctx.fillStyle = "#AAA";
        ctx.fillText(this.title, size * 1.2 + x, h * 0.85);
        ctx.textAlign = "left";
    };

    WidgetToggle.prototype.onAction = function(action) {
        this.properties.value = !this.properties.value;
        this.trigger("e", this.properties.value);
    };

    WidgetToggle.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != null) {
            this.properties.value = v;
        }
        this.setOutputData(0, this.properties.value);
    };

    WidgetToggle.prototype.onMouseDown = function(e, local_pos) {
        if (
            local_pos[0] > 1 &&
            local_pos[1] > 1 &&
            local_pos[0] < this.size[0] - 2 &&
            local_pos[1] < this.size[1] - 2
        ) {
            this.properties.value = !this.properties.value;
            this.graph._version++;
            this.trigger("e", this.properties.value);
            return true;
        }
    };

    LiteGraph.registerNodeType("widget/toggle", WidgetToggle);

    /* Number ****************/

    function WidgetNumber() {
        this.addOutput("", "number");
        this.size = [80, 60];
        this.properties = { min: -1000, max: 1000, value: 1, step: 1 };
        this.old_y = -1;
        this._remainder = 0;
        this._precision = 0;
        this.mouse_captured = false;
    }

    WidgetNumber.title = "Number";
    WidgetNumber.desc = "Widget to select number value";

    WidgetNumber.pixels_threshold = 10;
    WidgetNumber.markers_color = "#666";

    WidgetNumber.prototype.onDrawForeground = function(ctx) {
        var x = this.size[0] * 0.5;
        var h = this.size[1];
        if (h > 30) {
            ctx.fillStyle = WidgetNumber.markers_color;
            ctx.beginPath();
            ctx.moveTo(x, h * 0.1);
            ctx.lineTo(x + h * 0.1, h * 0.2);
            ctx.lineTo(x + h * -0.1, h * 0.2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, h * 0.9);
            ctx.lineTo(x + h * 0.1, h * 0.8);
            ctx.lineTo(x + h * -0.1, h * 0.8);
            ctx.fill();
            ctx.font = (h * 0.7).toFixed(1) + "px Arial";
        } else {
            ctx.font = (h * 0.8).toFixed(1) + "px Arial";
        }

        ctx.textAlign = "center";
        ctx.font = (h * 0.7).toFixed(1) + "px Arial";
        ctx.fillStyle = "#EEE";
        ctx.fillText(
            this.properties.value.toFixed(this._precision),
            x,
            h * 0.75
        );
    };

    WidgetNumber.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
    };

    WidgetNumber.prototype.onPropertyChanged = function(name, value) {
        var t = (this.properties.step + "").split(".");
        this._precision = t.length > 1 ? t[1].length : 0;
    };

    WidgetNumber.prototype.onMouseDown = function(e, pos) {
        if (pos[1] < 0) {
            return;
        }

        this.old_y = e.canvasY;
        this.captureInput(true);
        this.mouse_captured = true;

        return true;
    };

    WidgetNumber.prototype.onMouseMove = function(e) {
        if (!this.mouse_captured) {
            return;
        }

        var delta = this.old_y - e.canvasY;
        if (e.shiftKey) {
            delta *= 10;
        }
        if (e.metaKey || e.altKey) {
            delta *= 0.1;
        }
        this.old_y = e.canvasY;

        var steps = this._remainder + delta / WidgetNumber.pixels_threshold;
        this._remainder = steps % 1;
        steps = steps | 0;

        var v = clamp(
            this.properties.value + steps * this.properties.step,
            this.properties.min,
            this.properties.max
        );
        this.properties.value = v;
        this.graph._version++;
        this.setDirtyCanvas(true);
    };

    WidgetNumber.prototype.onMouseUp = function(e, pos) {
        if (e.click_time < 200) {
            var steps = pos[1] > this.size[1] * 0.5 ? -1 : 1;
            this.properties.value = clamp(
                this.properties.value + steps * this.properties.step,
                this.properties.min,
                this.properties.max
            );
            this.graph._version++;
            this.setDirtyCanvas(true);
        }

        if (this.mouse_captured) {
            this.mouse_captured = false;
            this.captureInput(false);
        }
    };

    LiteGraph.registerNodeType("widget/number", WidgetNumber);


    /* Combo ****************/

    function WidgetCombo() {
        this.addOutput("", "string");
        this.addOutput("change", LiteGraph.EVENT);
        this.size = [80, 60];
        this.properties = { value: "A", values:"A;B;C" };
        this.old_y = -1;
        this.mouse_captured = false;
		this._values = this.properties.values.split(";");
		var that = this;
        this.widgets_up = true;
		this.widget = this.addWidget("combo","", this.properties.value, function(v){
			that.properties.value = v;
            that.triggerSlot(1, v);
		}, { property: "value", values: this._values } );
    }

    WidgetCombo.title = "Combo";
    WidgetCombo.desc = "Widget to select from a list";

    WidgetCombo.prototype.onExecute = function() {
        this.setOutputData( 0, this.properties.value );
    };

    WidgetCombo.prototype.onPropertyChanged = function(name, value) {
		if(name == "values")
		{
			this._values = value.split(";");
			this.widget.options.values = this._values;
		}
		else if(name == "value")
		{
			this.widget.value = value;
		}
	};

    LiteGraph.registerNodeType("widget/combo", WidgetCombo);


    /* Knob ****************/

    function WidgetKnob() {
        this.addOutput("", "number");
        this.size = [64, 84];
        this.properties = {
            min: 0,
            max: 1,
            value: 0.5,
            color: "#7AF",
            precision: 2
        };
        this.value = -1;
    }

    WidgetKnob.title = "Knob";
    WidgetKnob.desc = "Circular controller";
    WidgetKnob.size = [80, 100];

    WidgetKnob.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        if (this.value == -1) {
            this.value =
                (this.properties.value - this.properties.min) /
                (this.properties.max - this.properties.min);
        }

        var center_x = this.size[0] * 0.5;
        var center_y = this.size[1] * 0.5;
        var radius = Math.min(this.size[0], this.size[1]) * 0.5 - 5;
        var w = Math.floor(radius * 0.05);

        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(center_x, center_y);
        ctx.rotate(Math.PI * 0.75);

        //bg
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
        ctx.fill();

        //value
        ctx.strokeStyle = "black";
        ctx.fillStyle = this.properties.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
            0,
            0,
            radius - 4,
            0,
            Math.PI * 1.5 * Math.max(0.01, this.value)
        );
        ctx.closePath();
        ctx.fill();
        //ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        ctx.restore();

        //inner
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(center_x, center_y, radius * 0.75, 0, Math.PI * 2, true);
        ctx.fill();

        //miniball
        ctx.fillStyle = this.mouseOver ? "white" : this.properties.color;
        ctx.beginPath();
        var angle = this.value * Math.PI * 1.5 + Math.PI * 0.75;
        ctx.arc(
            center_x + Math.cos(angle) * radius * 0.65,
            center_y + Math.sin(angle) * radius * 0.65,
            radius * 0.05,
            0,
            Math.PI * 2,
            true
        );
        ctx.fill();

        //text
        ctx.fillStyle = this.mouseOver ? "white" : "#AAA";
        ctx.font = Math.floor(radius * 0.5) + "px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            this.properties.value.toFixed(this.properties.precision),
            center_x,
            center_y + radius * 0.15
        );
    };

    WidgetKnob.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
        this.boxcolor = LiteGraph.colorToString([
            this.value,
            this.value,
            this.value
        ]);
    };

    WidgetKnob.prototype.onMouseDown = function(e) {
        this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
        this.radius = this.size[0] * 0.5;
        if (
            e.canvasY - this.pos[1] < 20 ||
            LiteGraph.distance(
                [e.canvasX, e.canvasY],
                [this.pos[0] + this.center[0], this.pos[1] + this.center[1]]
            ) > this.radius
        ) {
            return false;
        }
        this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
        this.captureInput(true);
        return true;
    };

    WidgetKnob.prototype.onMouseMove = function(e) {
        if (!this.oldmouse) {
            return;
        }

        var m = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];

        var v = this.value;
        v -= (m[1] - this.oldmouse[1]) * 0.01;
        if (v > 1.0) {
            v = 1.0;
        } else if (v < 0.0) {
            v = 0.0;
        }
        this.value = v;
        this.properties.value =
            this.properties.min +
            (this.properties.max - this.properties.min) * this.value;
        this.oldmouse = m;
        this.setDirtyCanvas(true);
    };

    WidgetKnob.prototype.onMouseUp = function(e) {
        if (this.oldmouse) {
            this.oldmouse = null;
            this.captureInput(false);
        }
    };

    WidgetKnob.prototype.onPropertyChanged = function(name, value) {
        if (name == "min" || name == "max" || name == "value") {
            this.properties[name] = parseFloat(value);
            return true; //block
        }
    };

    LiteGraph.registerNodeType("widget/knob", WidgetKnob);

    //Show value inside the debug console
    function WidgetSliderGUI() {
        this.addOutput("", "number");
        this.properties = {
            value: 0.5,
            min: 0,
            max: 1,
            text: "V"
        };
        var that = this;
        this.size = [140, 40];
        this.slider = this.addWidget(
            "slider",
            "V",
            this.properties.value,
            function(v) {
                that.properties.value = v;
            },
            this.properties
        );
        this.widgets_up = true;
    }

    WidgetSliderGUI.title = "Inner Slider";

    WidgetSliderGUI.prototype.onPropertyChanged = function(name, value) {
        if (name == "value") {
            this.slider.value = value;
        }
    };

    WidgetSliderGUI.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("widget/internal_slider", WidgetSliderGUI);

    //Widget H SLIDER
    function WidgetHSlider() {
        this.size = [160, 26];
        this.addOutput("", "number");
        this.properties = { color: "#7AF", min: 0, max: 1, value: 0.5 };
        this.value = -1;
    }

    WidgetHSlider.title = "H.Slider";
    WidgetHSlider.desc = "Linear slider controller";

    WidgetHSlider.prototype.onDrawForeground = function(ctx) {
        if (this.value == -1) {
            this.value =
                (this.properties.value - this.properties.min) /
                (this.properties.max - this.properties.min);
        }

        //border
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.fillStyle = "#000";
        ctx.fillRect(2, 2, this.size[0] - 4, this.size[1] - 4);

        ctx.fillStyle = this.properties.color;
        ctx.beginPath();
        ctx.rect(4, 4, (this.size[0] - 8) * this.value, this.size[1] - 8);
        ctx.fill();
    };

    WidgetHSlider.prototype.onExecute = function() {
        this.properties.value =
            this.properties.min +
            (this.properties.max - this.properties.min) * this.value;
        this.setOutputData(0, this.properties.value);
        this.boxcolor = LiteGraph.colorToString([
            this.value,
            this.value,
            this.value
        ]);
    };

    WidgetHSlider.prototype.onMouseDown = function(e) {
        if (e.canvasY - this.pos[1] < 0) {
            return false;
        }

        this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
        this.captureInput(true);
        return true;
    };

    WidgetHSlider.prototype.onMouseMove = function(e) {
        if (!this.oldmouse) {
            return;
        }

        var m = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];

        var v = this.value;
        var delta = m[0] - this.oldmouse[0];
        v += delta / this.size[0];
        if (v > 1.0) {
            v = 1.0;
        } else if (v < 0.0) {
            v = 0.0;
        }

        this.value = v;

        this.oldmouse = m;
        this.setDirtyCanvas(true);
    };

    WidgetHSlider.prototype.onMouseUp = function(e) {
        this.oldmouse = null;
        this.captureInput(false);
    };

    WidgetHSlider.prototype.onMouseLeave = function(e) {
        //this.oldmouse = null;
    };

    LiteGraph.registerNodeType("widget/hslider", WidgetHSlider);

    function WidgetProgress() {
        this.size = [160, 26];
        this.addInput("", "number");
        this.properties = { min: 0, max: 1, value: 0, color: "#AAF" };
    }

    WidgetProgress.title = "Progress";
    WidgetProgress.desc = "Shows data in linear progress";

    WidgetProgress.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != undefined) {
            this.properties["value"] = v;
        }
    };

    WidgetProgress.prototype.onDrawForeground = function(ctx) {
        //border
        ctx.lineWidth = 1;
        ctx.fillStyle = this.properties.color;
        var v =
            (this.properties.value - this.properties.min) /
            (this.properties.max - this.properties.min);
        v = Math.min(1, v);
        v = Math.max(0, v);
        ctx.fillRect(2, 2, (this.size[0] - 4) * v, this.size[1] - 4);
    };

    LiteGraph.registerNodeType("widget/progress", WidgetProgress);

    function WidgetText() {
        this.addInputs("", 0);
        this.properties = {
            value: "...",
            font: "Arial",
            fontsize: 18,
            color: "#AAA",
            align: "left",
            glowSize: 0,
            decimals: 1
        };
    }

    WidgetText.title = "Text";
    WidgetText.desc = "Shows the input value";
    WidgetText.widgets = [
        { name: "resize", text: "Resize box", type: "button" },
        { name: "led_text", text: "LED", type: "minibutton" },
        { name: "normal_text", text: "Normal", type: "minibutton" }
    ];

    WidgetText.prototype.onDrawForeground = function(ctx) {
        //ctx.fillStyle="#000";
        //ctx.fillRect(0,0,100,60);
        ctx.fillStyle = this.properties["color"];
        var v = this.properties["value"];

        if (this.properties["glowSize"]) {
            ctx.shadowColor = this.properties.color;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = this.properties["glowSize"];
        } else {
            ctx.shadowColor = "transparent";
        }

        var fontsize = this.properties["fontsize"];

        ctx.textAlign = this.properties["align"];
        ctx.font = fontsize.toString() + "px " + this.properties["font"];
        this.str =
            typeof v == "number" ? v.toFixed(this.properties["decimals"]) : v;

        if (typeof this.str == "string") {
            var lines = this.str.replace(/[\r\n]/g, "\\n").split("\\n");
            for (var i=0; i < lines.length; i++) {
                ctx.fillText(
                    lines[i],
                    this.properties["align"] == "left" ? 15 : this.size[0] - 15,
                    fontsize * -0.15 + fontsize * (parseInt(i) + 1)
                );
            }
        }

        ctx.shadowColor = "transparent";
        this.last_ctx = ctx;
        ctx.textAlign = "left";
    };

    WidgetText.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != null) {
            this.properties["value"] = v;
        }
        //this.setDirtyCanvas(true);
    };

    WidgetText.prototype.resize = function() {
        if (!this.last_ctx) {
            return;
        }

        var lines = this.str.split("\\n");
        this.last_ctx.font =
            this.properties["fontsize"] + "px " + this.properties["font"];
        var max = 0;
        for (var i=0; i < lines.length; i++) {
            var w = this.last_ctx.measureText(lines[i]).width;
            if (max < w) {
                max = w;
            }
        }
        this.size[0] = max + 20;
        this.size[1] = 4 + lines.length * this.properties["fontsize"];

        this.setDirtyCanvas(true);
    };

    WidgetText.prototype.onPropertyChanged = function(name, value) {
        this.properties[name] = value;
        this.str = typeof value == "number" ? value.toFixed(3) : value;
        //this.resize();
        return true;
    };

    LiteGraph.registerNodeType("widget/text", WidgetText);

    function WidgetPanel() {
        this.size = [200, 100];
        this.properties = {
            borderColor: "#ffffff",
            bgcolorTop: "#f0f0f0",
            bgcolorBottom: "#e0e0e0",
            shadowSize: 2,
            borderRadius: 3
        };
    }

    WidgetPanel.title = "Panel";
    WidgetPanel.desc = "Non interactive panel";
    WidgetPanel.widgets = [{ name: "update", text: "Update", type: "button" }];

    WidgetPanel.prototype.createGradient = function(ctx) {
        if (
            this.properties["bgcolorTop"] == "" ||
            this.properties["bgcolorBottom"] == ""
        ) {
            this.lineargradient = 0;
            return;
        }

        this.lineargradient = ctx.createLinearGradient(0, 0, 0, this.size[1]);
        this.lineargradient.addColorStop(0, this.properties["bgcolorTop"]);
        this.lineargradient.addColorStop(1, this.properties["bgcolorBottom"]);
    };

    WidgetPanel.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        if (this.lineargradient == null) {
            this.createGradient(ctx);
        }

        if (!this.lineargradient) {
            return;
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = this.properties["borderColor"];
        //ctx.fillStyle = "#ebebeb";
        ctx.fillStyle = this.lineargradient;

        if (this.properties["shadowSize"]) {
            ctx.shadowColor = "#000";
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = this.properties["shadowSize"];
        } else {
            ctx.shadowColor = "transparent";
        }

        ctx.roundRect(
            0,
            0,
            this.size[0] - 1,
            this.size[1] - 1,
            this.properties["shadowSize"]
        );
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.stroke();
    };

    LiteGraph.registerNodeType("widget/panel", WidgetPanel);
})(this);


//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    // --------------------------

    function LGLibrary(){
        this.addOutput("ref", "object");
        this._value = null;
        this._properties = [];
        this.setOutputData(0, LiteGraph);
    }
    LGLibrary.title = "LGLib";
    LGLibrary.desc = "LiteGraph object reference";
    LGLibrary.prototype.onExecute = function(param, options) {
        this.setOutputData(0, LiteGraph);
    };
    LGLibrary.prototype.onAction = function(action, param, options){
        // should probably execute on action
    };
    LGLibrary.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    LGLibrary.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    LGLibrary.prototype.getTitle = function() {
        return "LiteGraph";
    };
    LiteGraph.registerNodeType("litegraph/litegraph", LGLibrary);

    
    // --------------------------

    function LGGraph(){
        this.addOutput("ref", "object");
        this._value = null;
        this._properties = [];
        this.setOutputData(0, this.graph);
    }
    LGGraph.title = "Graph";
    LGGraph.desc = "Graph object reference";
    LGGraph.prototype.onExecute = function(param, options) {
        this.setOutputData(0, this.graph);
    };
    LGGraph.prototype.onAction = function(action, param, options){
        // should probably execute on action
    };
    LGGraph.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    LGGraph.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    LGGraph.prototype.getTitle = function() {
        return "Graph";
    };
    LiteGraph.registerNodeType("litegraph/graph", LGGraph);

})(this);


//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    //Show value inside the debug console
    function LogEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
    }

    LogEvent.title = "Log Event";
    LogEvent.desc = "Log event in console";

    LogEvent.prototype.onAction = function(action, param, options) {
        console.log(action, param);
    };

    LiteGraph.registerNodeType("events/log", LogEvent);

    //convert to Event if the value is true
    function TriggerEvent() {
        this.size = [60, 30];
        this.addInput("if", "");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
		this.properties = { only_on_change: true, tooltip:"Triggers event if input evaluates to true" };
		this.prev = 0;
    }

    TriggerEvent.title = "TriggerEvent";
    TriggerEvent.desc = "Triggers event if input evaluates to true";

    TriggerEvent.prototype.onExecute = function( param, options) {
		var v = this.getInputData(0);
		var changed = (v != this.prev);
		if(this.prev === 0)
			changed = false;
		var must_resend = (changed && this.properties.only_on_change) || (!changed && !this.properties.only_on_change);
		if(v && must_resend )
	        this.triggerSlot(0, param, null, options);
		if(!v && must_resend)
	        this.triggerSlot(2, param, null, options);
		if(changed)
	        this.triggerSlot(1, param, null, options);
		this.prev = v;
    };

    LiteGraph.registerNodeType("events/trigger", TriggerEvent);

    //Sequence of events
    function Sequence() {
		var that = this;
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addWidget("button","+",null,function(){
	        that.addInput("", LiteGraph.ACTION);
	        that.addOutput("", LiteGraph.EVENT);
        });
        this.size = [90, 70];
        this.flags = { horizontal: true, render_box: false };
    }

    Sequence.title = "Sequence";
    Sequence.desc = "Triggers a sequence of events when an event arrives";

    Sequence.prototype.getTitle = function() {
        return "";
    };

    Sequence.prototype.onAction = function(action, param, options) {
        if (this.outputs) {
            options = options || {};
            for (var i = 0; i < this.outputs.length; ++i) {
				var output = this.outputs[i];
				//needs more info about this...
				if( options.action_call ) // CREATE A NEW ID FOR THE ACTION
	                options.action_call = options.action_call + "_seq_" + i;
				else
					options.action_call = this.id + "_" + (action ? action : "action")+"_seq_"+i+"_"+Math.floor(Math.random()*9999);
                this.triggerSlot(i, param, null, options);
            }
        }
    };

    LiteGraph.registerNodeType("events/sequence", Sequence);


    //Sequence of events
    function WaitAll() {
        var that = this;
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addOutput("", LiteGraph.EVENT);
        this.addWidget("button","+",null,function(){
            that.addInput("", LiteGraph.ACTION);
            that.size[0] = 90;
        });
        this.size = [90, 70];
        this.ready = [];
    }

    WaitAll.title = "WaitAll";
    WaitAll.desc = "Wait until all input events arrive then triggers output";

    WaitAll.prototype.getTitle = function() {
        return "";
    };

    WaitAll.prototype.onDrawBackground = function(ctx)
    {
        if (this.flags.collapsed) {
            return;
        }
        for(var i = 0; i < this.inputs.length; ++i)
        {
            var y = i * LiteGraph.NODE_SLOT_HEIGHT + 10;
            ctx.fillStyle = this.ready[i] ? "#AFB" : "#000";
            ctx.fillRect(20, y, 10, 10);
        }
    }

    WaitAll.prototype.onAction = function(action, param, options, slot_index) {
        if(slot_index == null)
            return;

        //check all
        this.ready.length = this.outputs.length;
        this.ready[slot_index] = true;
        for(var i = 0; i < this.ready.length;++i)
            if(!this.ready[i])
                return;
        //pass
        this.reset();
        this.triggerSlot(0);
    };

    WaitAll.prototype.reset = function()
    {
        this.ready.length = 0;
    }

    LiteGraph.registerNodeType("events/waitAll", WaitAll);    


    //Sequencer for events
    function Stepper() {
		var that = this;
		this.properties = { index: 0 };
        this.addInput("index", "number");
        this.addInput("step", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("index", "number");
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT,{removable:true});
        this.addWidget("button","+",null,function(){
	        that.addOutput("", LiteGraph.EVENT, {removable:true});
        });
        this.size = [120, 120];
        this.flags = { render_box: false };
    }

    Stepper.title = "Stepper";
    Stepper.desc = "Trigger events sequentially when an tick arrives";

	Stepper.prototype.onDrawBackground = function(ctx)
	{
        if (this.flags.collapsed) {
            return;
        }
		var index = this.properties.index || 0;
        ctx.fillStyle = "#AFB";
		var w = this.size[0];
        var y = (index + 1)* LiteGraph.NODE_SLOT_HEIGHT + 4;
        ctx.beginPath();
        ctx.moveTo(w - 30, y);
        ctx.lineTo(w - 30, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(w - 15, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
	}

	Stepper.prototype.onExecute = function()
	{
		var index = this.getInputData(0);
		if(index != null)
		{
			index = Math.floor(index);
			index = clamp( index, 0, this.outputs ? (this.outputs.length - 2) : 0 );
			if( index != this.properties.index )
			{
				this.properties.index = index;
			    this.triggerSlot( index+1 );
			}
		}

		this.setOutputData(0, this.properties.index );
	}

    Stepper.prototype.onAction = function(action, param) {
		if(action == "reset")
			this.properties.index = 0;
		else if(action == "step")
		{
            this.triggerSlot(this.properties.index+1, param);
			var n = this.outputs ? this.outputs.length - 1 : 0;
			this.properties.index = (this.properties.index + 1) % n;
        }
    };

    LiteGraph.registerNodeType("events/stepper", Stepper);

    //Filter events
    function FilterEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("event", LiteGraph.EVENT);
        this.properties = {
            equal_to: "",
            has_property: "",
            property_equal_to: ""
        };
    }

    FilterEvent.title = "Filter Event";
    FilterEvent.desc = "Blocks events that do not match the filter";

    FilterEvent.prototype.onAction = function(action, param, options) {
        if (param == null) {
            return;
        }

        if (this.properties.equal_to && this.properties.equal_to != param) {
            return;
        }

        if (this.properties.has_property) {
            var prop = param[this.properties.has_property];
            if (prop == null) {
                return;
            }

            if (
                this.properties.property_equal_to &&
                this.properties.property_equal_to != prop
            ) {
                return;
            }
        }

        this.triggerSlot(0, param, null, options);
    };

    LiteGraph.registerNodeType("events/filter", FilterEvent);


    function EventBranch() {
        this.addInput("in", LiteGraph.ACTION);
        this.addInput("cond", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.size = [120, 60];
		this._value = false;
    }

    EventBranch.title = "Branch";
    EventBranch.desc = "If condition is true, outputs triggers true, otherwise false";

    EventBranch.prototype.onExecute = function() {
		this._value = this.getInputData(1);
	}

    EventBranch.prototype.onAction = function(action, param, options) {
        this._value = this.getInputData(1);
		this.triggerSlot(this._value ? 0 : 1, param, null, options);
	}

    LiteGraph.registerNodeType("events/branch", EventBranch);

    //Show value inside the debug console
    function EventCounter() {
        this.addInput("inc", LiteGraph.ACTION);
        this.addInput("dec", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("num", "number");
        this.addProperty("doCountExecution", false, "boolean", {name: "Count Executions"});
        this.addWidget("toggle","Count Exec.",this.properties.doCountExecution,"doCountExecution");
        this.num = 0;
    }

    EventCounter.title = "Counter";
    EventCounter.desc = "Counts events";

    EventCounter.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return String(this.num);
        }
        return this.title;
    };

    EventCounter.prototype.onAction = function(action, param, options) {
        var v = this.num;
        if (action == "inc") {
            this.num += 1;
        } else if (action == "dec") {
            this.num -= 1;
        } else if (action == "reset") {
            this.num = 0;
        }
        if (this.num != v) {
            this.trigger("change", this.num);
        }
    };

    EventCounter.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AAA";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.num, this.size[0] * 0.5, this.size[1] * 0.5);
    };

    EventCounter.prototype.onExecute = function() {
        if(this.properties.doCountExecution){
            this.num += 1;
        }
        this.setOutputData(1, this.num);
    };

    LiteGraph.registerNodeType("events/counter", EventCounter);

    //Show value inside the debug console
    function DelayEvent() {
        this.size = [60, 30];
        this.addProperty("time_in_ms", 1000);
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("on_time", LiteGraph.EVENT);

        this._pending = [];
    }

    DelayEvent.title = "Delay";
    DelayEvent.desc = "Delays one event";

    DelayEvent.prototype.onAction = function(action, param, options) {
        var time = this.properties.time_in_ms;
        if (time <= 0) {
            this.trigger(null, param, options);
        } else {
            this._pending.push([time, param]);
        }
    };

    DelayEvent.prototype.onExecute = function(param, options) {
        var dt = this.graph.elapsed_time * 1000; //in ms

        if (this.isInputConnected(1)) {
            this.properties.time_in_ms = this.getInputData(1);
        }

        for (var i = 0; i < this._pending.length; ++i) {
            var actionPass = this._pending[i];
            actionPass[0] -= dt;
            if (actionPass[0] > 0) {
                continue;
            }

            //remove
            this._pending.splice(i, 1);
            --i;

            //trigger
            this.trigger(null, actionPass[1], options);
        }
    };

    DelayEvent.prototype.onGetInputs = function() {
        return [["event", LiteGraph.ACTION], ["time_in_ms", "number"]];
    };

    LiteGraph.registerNodeType("events/delay", DelayEvent);

    //Show value inside the debug console
    function TimerEvent() {
        this.addProperty("interval", 1000);
        this.addProperty("event", "tick");
        this.addOutput("on_tick", LiteGraph.EVENT);
        this.time = 0;
        this.last_interval = 1000;
        this.triggered = false;
    }

    TimerEvent.title = "Timer";
    TimerEvent.desc = "Sends an event every N milliseconds";

    TimerEvent.prototype.onStart = function() {
        this.time = 0;
    };

    TimerEvent.prototype.getTitle = function() {
        return "Timer: " + this.last_interval.toString() + "ms";
    };

    TimerEvent.on_color = "#AAA";
    TimerEvent.off_color = "#222";

    TimerEvent.prototype.onDrawBackground = function() {
        this.boxcolor = this.triggered
            ? TimerEvent.on_color
            : TimerEvent.off_color;
        this.triggered = false;
    };

    TimerEvent.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time * 1000; //in ms

        var trigger = this.time == 0;

        this.time += dt;
        this.last_interval = Math.max(
            1,
            this.getInputOrProperty("interval") | 0
        );

        if (
            !trigger &&
            (this.time < this.last_interval || isNaN(this.last_interval))
        ) {
            if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
                this.setOutputData(1, false);
            }
            return;
        }

        this.triggered = true;
        this.time = this.time % this.last_interval;
        this.trigger("on_tick", this.properties.event);
        if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
            this.setOutputData(1, true);
        }
    };

    TimerEvent.prototype.onGetInputs = function() {
        return [["interval", "number"]];
    };

    TimerEvent.prototype.onGetOutputs = function() {
        return [["tick", "boolean"]];
    };

    LiteGraph.registerNodeType("events/timer", TimerEvent);



    function SemaphoreEvent() {
        this.addInput("go", LiteGraph.ACTION );
        this.addInput("green", LiteGraph.ACTION );
        this.addInput("red", LiteGraph.ACTION );
        this.addOutput("continue", LiteGraph.EVENT );
        this.addOutput("blocked", LiteGraph.EVENT );
        this.addOutput("is_green", "boolean" );
		this._ready = false;
		this.properties = {};
		var that = this;
		this.addWidget("button","reset","",function(){
			that._ready = false;
		});
    }

    SemaphoreEvent.title = "Semaphore Event";
    SemaphoreEvent.desc = "Until both events are not triggered, it doesnt continue.";

	SemaphoreEvent.prototype.onExecute = function()
	{
		this.setOutputData(1,this._ready);
		this.boxcolor = this._ready ? "#9F9" : "#FA5";
	}

    SemaphoreEvent.prototype.onAction = function(action, param) {
		if( action == "go" )
			this.triggerSlot( this._ready ? 0 : 1 );
		else if( action == "green" )
			this._ready = true;
		else if( action == "red" )
			this._ready = false;
    };

    LiteGraph.registerNodeType("events/semaphore", SemaphoreEvent);

    function OnceEvent() {
        this.addInput("in", LiteGraph.ACTION );
        this.addInput("reset", LiteGraph.ACTION );
        this.addOutput("out", LiteGraph.EVENT );
		this._once = false;
		this.properties = {};
		var that = this;
		this.addWidget("button","reset","",function(){
			that._once = false;
		});
    }

    OnceEvent.title = "Once";
    OnceEvent.desc = "Only passes an event once, then gets locked";

    OnceEvent.prototype.onAction = function(action, param) {
		if( action == "in" && !this._once )
		{
			this._once = true;
			this.triggerSlot( 0, param );
		}
		else if( action == "reset" )
			this._once = false;
    };

    LiteGraph.registerNodeType("events/once", OnceEvent);

    function DataStore() {
        this.addInput("data", 0);
        this.addInput("assign", LiteGraph.ACTION);
        this.addOutput("data", 0);
		this._last_value = null;
		this.properties = { data: null, serialize: true };
		var that = this;
		this.addWidget("button","store","",function(){
			that.properties.data = that._last_value;
		});
    }

    DataStore.title = "Data Store";
    DataStore.desc = "Stores data and only changes when event is received";

	DataStore.prototype.onExecute = function()
	{
		this._last_value = this.getInputData(0);
		this.setOutputData(0, this.properties.data );
	}

    DataStore.prototype.onAction = function(action, param, options) {
		this.properties.data = this._last_value;
    };

	DataStore.prototype.onSerialize = function(o)
	{
		if(o.data == null)
			return;
		if(this.properties.serialize == false || (o.data.constructor !== String && o.data.constructor !== Number && o.data.constructor !== Boolean && o.data.constructor !== Array && o.data.constructor !== Object ))
			o.data = null;
	}

    LiteGraph.registerNodeType("basic/data_store", DataStore);



})(this);

//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    // --------------------------

    function LGLibrary(){
        this.addOutput("ref", "object");
        this._value = null;
        this._properties = [];
        this.setOutputData(0, LiteGraph);
    }
    LGLibrary.title = "LGLib";
    LGLibrary.desc = "LiteGraph object reference";
    LGLibrary.prototype.onExecute = function(param, options) {
        this.setOutputData(0, LiteGraph);
    };
    LGLibrary.prototype.onAction = function(action, param, options){
        // should probably execute on action
    };
    LGLibrary.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    LGLibrary.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    LGLibrary.prototype.getTitle = function() {
        return "LiteGraph";
    };
    LiteGraph.registerNodeType("litegraph/litegraph", LGLibrary);

    
    // --------------------------

    function LGGraph(){
        this.addInput("start", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);
        this.addInput("step", LiteGraph.ACTION);
        this.addOutput("ref", "object");
        this.addOutput("stepped", LiteGraph.EVENT);
        this._value = null;
        this._properties = [];
        this.setOutputData(0, this.graph);
    }
    LGGraph.title = "Graph";
    LGGraph.desc = "Graph object reference";
    LGGraph.prototype.onExecute = function(param, options) {
        this.setOutputData(0, this.graph);
        this.triggerSlot(1, param, null, options);
    };
    LGGraph.prototype.onAction = function(action, param, options){
        console.debug("GraphAction",action);
        switch(action){
            case "start":
                this.graph.start();
                console.debug("this.graph.start();",this,this.graph);
            break;
            case "stop":
                this.graph.stop();
                console.debug("this.graph.stop();",this,this.graph);
            break;
            case "step":
                if(this.graph.onBeforeStep)
					this.graph.onBeforeStep();
                this.graph.runStep(1, !this.graph.catch_errors);
                console.debug("this.graph.runStep(1, !this.graph.catch_errors);",this,this.graph);
				if(this.graph.onAfterStep)
					this.graph.onAfterStep();
            break;
        }
    };
    LGGraph.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    LGGraph.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    LGGraph.prototype.getTitle = function() {
        return "Graph";
    };
    LiteGraph.registerNodeType("litegraph/graph", LGGraph);

})(this);