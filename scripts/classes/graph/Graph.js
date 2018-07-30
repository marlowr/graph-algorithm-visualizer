/**
 *  @author Jake Landowski
 *  7/16/18
 *  Graph.js
 * 
 *  Class to represent a Graph in various forms, uses Model and View
 *  to handle rendering and data logic.
 */

define(['classes/graph/GraphModel', 
        'classes/graph/GraphView',
        'two'], 
        function(GraphModel, GraphView, Two)
{
    console.log('Graph Class loaded');

    const Graph = function(twoConfig={})
    {
        this.two = new Two
        ({
            fullscreen: twoConfig.fullscreen || false,
            type:       twoConfig.type       || Two.Types.canvas,
            width:      twoConfig.width      || 100,
            height:     twoConfig.height     || 100
        });
        
        this.initConfig();
        this.model = new GraphModel(this.two.width, this.two.height, this.config);
        this.view  = new GraphView(this.model,      this.two,        this.config);
        // this.initHandlers();
        this.initSymbols();

        this.mouseEventsLogged = [];
    };

    Graph.prototype = 
    {

//====================== Initialization ===========================//
        initSymbols()
        {
            this.symbols = ['Z', 'Y', 'X', 'W', 'V', 'U', 
                            'T', 'S', 'R', 'Q', 'P', 'O', 
                            'N', 'M', 'L', 'K', 'J', 'I', 
                            'H', 'G', 'F', 'E', 'D', 'C', 
                            'B', 'A'];
            this.usedSymbols = Object.create(null);
        },

        initConfig()
        {
            this.config = Object.create(null); // non-inheriting object
            this.config.vertexSize = 25;
            this.config.vertexOutlineSize = 0;
            this.config.edgeWidth = 1;
        },

        // initHandlers()
        // {
        //     this.view.onCanvasMouseUp.attach('onCanvasMouseUp', function(_, params)
        //     {

        //     }.bind(this));

        //     this.view.onCanvasMouseMove.attach('onCanvasMouseMove', function(_, params)
        //     {

        //     }.bind(this));

        //     this.view.onCanvasMouseDrag.attach('onCanvasMouseDrag', function(_, params)
        //     {

        //     }.bind(this));
        // },

//====================== UI Hooks ===========================//

        vertexMode()
        {
            this.clearMouseEvents();

            this.view.onCanvasClicked.attach('clickVertex', function(_, params)
            {
                this.mouseEventsLogged.push('clickVertex');
                // see if clicked on vertex here using model
                // if clicked on vertex tell model to delete
                let vertex = this.model.vertexAt(params.x, params.y);

                if(vertex)
                {
                    this.model.dispatch
                    ({
                        type: 'removeVertex',
                        data: 
                        {
                            symbol: vertex.data,
                            x: params.x,
                            y: params.y   
                        },
                        undo: 'addVertex'
                    });

                    this.returnSymbol(vertex.data);
                }
                else if(this.symbols.length > 0)
                {   
                    this.model.dispatch
                    ({
                        type: 'addVertex',
                        data: 
                        {
                            symbol: this.getSymbol(),
                            x: params.x,
                            y: params.y   
                        },
                        undo: 'removeVertex'
                    });
                }

            }.bind(this));

            this.view.onCanvasMouseDown.attach('dragVertex', function(_, params)
            {
                this.mouseEventsLogged.push('dragVertex');

                // locate vertex at location
                let vertex = this.model.vertexAt(params.x, params.y);

                if(vertex)
                {
                    let offsetX = vertex.x - params.x;
                    let offsetY = vertex.y - params.y;

                    function stickVertexToCursor(_, point)
                    {
                        // Mostly visual move
                        this.model.softMoveVertex(vertex, point.x + offsetX, point.y + offsetY);
                    }

                    function releaseVertexFromCursor(_, point)
                    {
                        // Final movement, updates spatial information
                        this.view.onCanvasMouseDrag.detach('stickVertexToCursor');
                        this.view.onCanvasMouseUp.detach('releaseVertexFromCursor');
                        this.model.hardMoveVertex(vertex, point.x + offsetX, point.y + offsetY);
                    }

                    this.view.onCanvasMouseDrag.attach('stickVertexToCursor', stickVertexToCursor.bind(this));
                    this.view.onCanvasMouseUp.attach('releaseVertexFromCursor', releaseVertexFromCursor.bind(this));
                }

            }.bind(this));
        },

        edgeMode()
        {
            this.clearMouseEvents();

            this.view.onCanvasClicked.attach('createEdge', function(_, params)
            {
                this.mouseEventsLogged.push('createEdge');
                
                let vertex = this.model.vertexAt(params.x, params.y);

                if(vertex)
                {
                    if(this.vertexSelected)
                    {
                        graph.dispatch
                        ({
                            type: 'addEdge',
                            data: 
                            {
                                
                            },
                            undo: 'removeEdge'
                        });
                    }
                    else
                    {
                        // highlight vertex
                        // stick line to cursor from vertex
                        this.vertexSelected = true;
                    }
                }
                else if(this.vertexSelected)
                {
                    this.vertexSelected = false;
                }

            }.bind(this));
        },

//====================== Setters ===========================//
        set vertexSize(size)
        {
            this.config.vertexSize = size < 1 ? 1 : size;
        },

        set vertexOutlineSize(size)
        {
            this.config.vertexOutlineSize = size < 1 ? 1 : size;
        },

        set edgeWidth(width)
        {
            this.config.edgeWidth = width < 1 ? 1 : width;
        },

//====================== Methods ===========================//
        start()
        {
            this.two.play();
            this.vertexMode();
        },

        undo()
        {
            this.model.undo();
        },

        render()
        {
            this.two.update();
        },

        appendTo(container)
        {
            this.view.appendTo(container);
        },

        getSymbol()
        {
            let symbol = this.symbols.pop();
            this.usedSymbols[symbol] = symbol;
            return symbol;  
        },

        returnSymbol(symbol)
        {
            this.symbols.push(symbol);
            delete this.usedSymbols[symbol];
        },

        clearMouseEvents()
        {
            let view = this.view;
            this.mouseEventsLogged.forEach(function(eventName)
            {
                view.onCanvasClicked.detach(eventName);
                view.onCanvasMouseMove.detach(eventName);
                view.onCanvasMouseDrag.detach(eventName);
                view.onCanvasMouseDown.detach(eventName);
                view.onCanvasMouseUp.detach(eventName);
            });
        },

//======== DEBUG =============/
showGraphData()
{
    console.log('Adjacency List:');
    console.log('[\n');
    for(let data in this.model.adjList)
    {
        let vertex = this.model.adjList[data];
        console.log('\t' + data + ' => [' + vertex.x + ', ' + vertex.y + ', ' + vertex.id + '],');
    }
    console.log(']');
}
//======== DEBUG =============/


    };

    return Graph;
 });