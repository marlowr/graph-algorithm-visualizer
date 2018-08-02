/**
 *  @author Jake Landowski
 *  7/16/18
 *  GraphModel.js
 * 
 *  Represents the data structure for the Graph class..
 */

'use strict';
define(['classes/Event', 'classes/graph/AdjacencyList', 
        'classes/graph/Vertex', 'classes/graph/Edge', 
        'classes/SpacialIndex', 'classes/CommandLog'], 
function(Event, AdjacencyList, Vertex, Edge, SpacialIndex, CommandLog)
{
    const GraphModel = function(width, height, config)
    {
        // Shape size/styling information
        this.config = config;

        // SpacialIndex needed information
        this.cellRatio  = 5;
        this.setDimensions(width, height);

        this.adjList   = new AdjacencyList(this.config.undirected)
        Edge.adjList   = this.adjList; // Edge Class Static Reference
        Vertex.adjList = this.adjList; // Vertex Class Static Reference
        
        this.edgeSpacialIndex   = new SpacialIndex(this.cellWidth, this.cellHeight, this.cellRatio);
        this.vertexSpacialIndex = new SpacialIndex(this.cellWidth, this.cellHeight, this.cellRatio);

        this.onVertexAdded         = new Event(this);
        this.onVertexRemoved       = new Event(this);
        this.onVertexMoved         = new Event(this);
        this.onVertexSelected      = new Event(this);
        this.onVertexDeselected    = new Event(this);

        this.onTrackingEdgeAdded   = new Event(this);
        this.onTrackingEdgeRemoved = new Event(this);
        this.onTrackingEdgeMoved   = new Event(this);
        
        this.onEdgeAdded           = new Event(this);
        this.onEdgeRemoved         = new Event(this);
        this.onEdgePointMoved      = new Event(this);
 
        this.userCommands = new CommandLog();
    };

    GraphModel.prototype = 
    {

//====================== Command Handling ===========================//

        dispatch(command)
        {
            if(this[command.type])
            {
                this[command.type](command.data);
                this.userCommands.record(command);
            }
            else throw 'Tried to run non-existant command ' + command.type;
        },

        undo()
        {
            const command = this.userCommands.undo();
            if(command && this[command.undo])
                this[command.undo](command.data);
        },

        redo()
        {
            const command = this.userCommands.redo();
            if(command) this.dispatch(command);
        },

        assertArgs(args, props, error)
        {
            props.forEach(function(prop)
            {
                if(args[prop] === undefined)
                    throw error;
            });
        },

//====================== Commands ===========================//
        
        addVertex(args={})
        {
            this.assertArgs(args, ['symbol', 'x', 'y', 'neighbors'], 'Missing arguments for addVertex command');

            const data      = args.symbol;
            const x         = args.x;
            const y         = args.y;
            const neighbors = args.neighbors;

            if(!this.adjList[data]) // prevent duplicates 
            {
                const vertex = new Vertex(data, x, y, 
                { 
                    vertexSize:        this.config.vertexSize,
                    vertexOutlineSize: this.config.vertexOutlineSize
                });

                this.adjList.insertVertex(vertex);
                this.vertexSpacialIndex.add(vertex);
                this.onVertexAdded.notify({ data: data, x: x, y: y });

                // For Undo
                for(const neighbor in neighbors)
                {
                    this.addEdge({ from: data, to: neighbor });
                }
            }
        },

        removeVertex(args={})
        {
            this.assertArgs(args, ['symbol'], 'Missing arguments for removeVertex command');

            const data    = args.symbol;
            const removed = this.adjList[data];

            // Clean up edges
            removed.forEachEdge(function(edge)
            {
                this.removeEdge
                ({
                    from: edge.from,
                    to:   edge.to
                });

            }.bind(this));

            this.adjList.deleteVertex(data);
            this.vertexSpacialIndex.remove(removed);

            if(args.returnSymbol) args.returnSymbol(data);

            this.onVertexRemoved.notify({ data: data });
        },

        addEdge(args={})
        {
            this.assertArgs(args, ['from', 'to'], 'Missing arguments for addEdge command');
            this.assertArgs(this.adjList, [args.from, args.to], 
                            'Missing vertices in adjList for addEdge command');

            const from = args.from;
            const to   = args.to;
            // thank you discrete math!
            const edgeDoesntExist = !this.edgeExists(from, to) && (this.config.undirected ? !this.edgeExists(to, from) : true);  

            if(edgeDoesntExist)
            {
                const fromVertex = this.adjList[from];
                const toVertex   = this.adjList[to];  
                
                // Adjecency List Reference For Edge
                fromVertex.neighbors[to] = to;
                if(this.config.undirected) 
                    toVertex.neighbors[from] = from;

                const edge = new Edge(args.from, args.to, this.config.edgeBoxSize, this.adjList);
                
                // Store Edge Objects In Map
                this.edgeMap[ [from, to] ] = edge;
                if(this.config.undirected)
                    this.edgeMap[ [to, from] ] = edge;
                
                // Spacial Indexing The Edge
                this.edgeSpacialIndex.add(edge);
                
                this.onEdgeAdded.notify
                ({ 
                    from:      from,
                    to:        to, 
                    fromPoint: { x: fromVertex.x, y: fromVertex.y },
                    toPoint:   { x: toVertex.x,   y: toVertex.y   },
                    center:    { x: edge.x,       y: edge.y       }    
                });
            }
        },

        removeEdge(args={})
        {
            this.assertArgs(args, ['from', 'to'], 'Missing arguments for removeEdge command');
            this.assertArgs(this.adjList, [args.from, args.to], 
                            'Missing vertices in adjList for removeEdge command');
            this.assertArgs(this.edgeMap, [ [args.from, args.to] ], 'edge was not found for removeEdge');

            const from = args.from;
            const to   = args.to;
            
            const edge = this.edgeMap[ [from, to] ];
            
            // Clean Up Spacial Index
            this.edgeSpacialIndex.remove(edge);

            // Delete Edge Object Reference
            delete this.edgeMap[ [edge.from, edge.to] ];
            if(this.config.undirected) 
                delete this.edgeMap[ [edge.to, edge.from] ];

            const fromVertex = this.adjList[from];
            const toVertex   = this.adjList[to];

            // Delete Neighbor References
            delete fromVertex.neighbors[toVertex.data];
            if(this.config.undirected)
                delete toVertex.neighbors[fromVertex.data];

            this.onEdgeRemoved.notify
            ({ 
                from:      from,
                to:        to, 
                fromPoint: { x: fromVertex.x, y: fromVertex.y },
                toPoint:   { x: toVertex.x,   y: toVertex.y   },
                center:    { x: edge.x,       y: edge.y       }    
            });
        },

        moveVertex(vertex, x, y)
        {
            // Update Vertex Position
            vertex.setPoints(x, y);
            this.onVertexMoved.notify({ data: vertex.data, x: x, y: y });
            
            // Update Vertex's Edge Positions
            // vertex.forEachEdge(function(edge)
            // {
            //     edge.setPoints();

            //     const pointMoved = edge.toVertex.data === vertex.data ? 'to' : 'from';

            //     this.onEdgePointMoved.notify
            //     ({ 
            //         pointMoved: pointMoved, 
            //         x: x, 
            //         y: y,
            //         center: { x: edge.x, y: edge.y } 
            //     });

            // }.bind(this));
        },

        updateVertexSpatial(vertex, x, y)
        {
            this.vertexSpacialIndex.update(vertex);

            // vertex.forEachEdge(function(edge)
            // {
            //     this.edgeSpacialIndex.update(edge);

            // }.bind(this));

            this.moveVertex(vertex, x, y);
        },

        selectVertex(vertex)
        {
            this.selectedVertex = vertex;
            this.onVertexSelected.notify({ data: vertex.data, x: vertex.x, y: vertex.y });
        },

        deselectVertex()
        {
            const vertex = this.selectedVertex;
            this.onVertexDeselected.notify({ data: vertex.data, x: vertex.x, y: vertex.y });
            this.selectedVertex = null;
        },

        addTrackingEdge(x, y)
        {
            // MAY NOT NEED THIS OBJECT
            this.trackingEdge = 
            {
                x: x,
                y: y
            };

            this.onTrackingEdgeAdded.notify
            ({ 
                start: { x: this.selectedVertex.x, y: this.selectedVertex.y },
                end:   { x: x, y: y }, 
            });
        },

        updateTrackingEdge(x, y)
        {
            // MAY NOT NEED THIS OBJECT
            this.trackingEdge.x = x;
            this.trackingEdge.y = y;

            this.onTrackingEdgeMoved.notify({ x: x, y: y });
        },

        releaseTrackingEdge()
        {
            // MAY NOT NEED THIS OBJECT
            this.trackingEdge = null;

            this.onTrackingEdgeRemoved.notify({});
        },

        resize(width, height)
        {
            this.setDimensions(width, height);
            this.vertexSpacialIndex = new SpacialIndex(width, height, this.cellRatio);
            for(const vertexKey in this.adjList)
            {
                this.vertexSpacialIndex.add(this.adjList[vertexKey]);
            }
        },

        setDimensions(width, height)
        {
            this.width      = width;
            this.cellWidth  = this.width / this.cellRatio;
            this.height     = height;
            this.cellHeight = this.height / this.cellRatio;
        },

        vertexAt(x, y)
        {
            return this.vertexSpacialIndex.getEntity(x, y);
        },

        edgeAt(x, y)
        {
            return this.edgeSpacialIndex.getEntity(x, y);
        },

        edgeExists(from, to)
        {
            return this.edgeMap[ [from, to] ] ? true : false;
        }
    };

    return GraphModel;
 });
