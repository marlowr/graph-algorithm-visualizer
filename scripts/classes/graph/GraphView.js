/**
 *  @author Jake Landowski
 *  7/16/18
 *  GraphView.js
 * 
 *  Represents the rendering logic for the Graph class.
 */

'use strict';
define(['classes/Event', 'utils/Util'], function(Event, Util)
{
    const GraphView = function(model, two, config)
    {
        // Shape size/styling information
        this.config = config;
        this.two = two;
        this.model = model; // attach events to the model
        // create events here that Graph class (controller) will reference
        // Graph class will then trigger data changes in model from user events 

//======== DEBUG =============/
if(window.DEBUG_MODE) 
{
    this.spacialIndexGridGroup = this.two.makeGroup();
    this.drawSpacialIndex();
}
//======== DEBUG =============/


        this.edgeGroup = this.two.makeGroup();
        this.edgeRenderingGroup = this.two.makeGroup();

        this.vertexGroup = this.two.makeGroup();
        this.vertexRenderingGroup = this.two.makeGroup();

        this.graphGroup = this.two.makeGroup();
        this.graphGroup.add(this.edgeGroup,   this.edgeRenderingGroup,
                            this.vertexGroup, this.vertexRenderingGroup,);
        

        // For mapping data in model to their view shape equivalent
        this.vertexMap = Object.create(null);
        this.edgeMap   = Object.create(null);

        this.onCanvasMouseClick = new Event(this);
        this.onCanvasMouseDown  = new Event(this);
        this.onCanvasMouseUp    = new Event(this);
        this.onCanvasMouseMove  = new Event(this);
        this.onCanvasMouseDrag  = new Event(this);

        this.mouseMoved = false;
        this.mouseDown  = false;
        this.mouseMoveTimer = 0;
        this.mouseMoveDelay = 10;
        this.mouseMoveResetDelay = 200;

        this.initHandlers();

    }; // end constructor
    
    GraphView.prototype = 
    {
        initHandlers()
        {

//========= Vertex Listeners ===========//

            // Vertex Added
            this.model.onVertexAdded.attach('createVertex', function(_, params)
            {
                // Create new vertex shape and store it
                const vertex    = this.two.makeCircle(params.x, params.y, this.config.vertexSize);
                vertex.fill   = '#262626';
                vertex.stroke = '#ff9a00';
                vertex.color = '#ff9a00';

                vertex.linewidth = this.config.vertexOutlineSize;

                const text = this.two.makeText(params.data, params.x, params.y);
                text.stroke = '#ff9a00';
                text.family = 'Exo 2';
                text.size = 25;
                this.vertexGroup.add(vertex, text);

                this.vertexMap[params.data] = 
                {
                    circle: vertex,
                    text:   text
                }

            }.bind(this));

            // Vertex Removed
            this.model.onVertexRemoved.attach('deleteVertex', function(_, params)
            {
                if(this.vertexMap[params.data])
                {
                    const circle = this.vertexMap[params.data].circle;
                    const text   = this.vertexMap[params.data].text;
                    this.vertexGroup.remove(circle, text);
                    circle.remove();
                    text.remove();
                    delete this.vertexMap[params.data];
                }

            }.bind(this));

            // Vertex Moved
            this.model.onVertexMoved.attach('moveVertex', function(_, params)
            {
                if(this.vertexMap[params.data])
                {
                    this.vertexMap[params.data].circle.translation.set(params.x, params.y);
                    this.vertexMap[params.data].text.translation.set(params.x, params.y);
                }

            }.bind(this));

            // Vertex Selected
            this.model.onVertexSelected.attach('selectVertex', function(_, params)
            {
                if(this.vertexMap[params.data])
                {
                    this.vertexMap[params.data].circle.stroke = '#fffc55';
                }
            
            }.bind(this));

            // Vertex Deselected
            this.model.onVertexDeselected.attach('deselectVertex', function(_, params)
            {
                if(this.vertexMap[params.data])
                {
                    this.vertexMap[params.data].circle.stroke = '#dd6900';
                }                 

            }.bind(this));

//========= Edge Listeners ===========//

            // Tracking Edge Added
            this.model.onTrackingEdgeAdded.attach('trackingEdgeAdded', function(_, params)
            {
                const start = params.start;
                const end   = params.end;

                this.trackingEdge = this.two.makeLine(start.x, start.y, end.x, end.y);
                this.trackingEdge.stroke = 'rgba(255, 255, 100, 0.5)';
                this.trackingEdge.linewidth = this.config.edgeWidth;
                this.edgeGroup.add(this.trackingEdge);

            }.bind(this));

            // Tracking Edge Moved
            this.model.onTrackingEdgeMoved.attach('trackingEdgeMoved', function(_, params)
            {
                const edge = this.trackingEdge;
                Util.setLineEndPoint(edge, params.x, params.y);

            }.bind(this));

            // Tracking Edge Removed
            this.model.onTrackingEdgeRemoved.attach('trackingEdgeRemoved', function(_, params)
            {
                this.edgeGroup.remove(this.trackingEdge);
                this.trackingEdge.remove()
                delete this.trackingEdge;                                

            }.bind(this));

            // Edge Added
            this.model.onEdgeAdded.attach('createEdge', function(_, params)
            {
                const edge = 
                {
                    line: this.two.makeLine(params.fromPoint.x, params.fromPoint.y, 
                                            params.toPoint.x,   params.toPoint.y),

                    box: this.two.makeRectangle(params.center.x, params.center.y, 
                                                this.config.edgeBoxSize, this.config.edgeBoxSize)
                };

                edge.line.stroke = "rgb(255, 255, 100)";
                edge.line.linewidth = this.config.edgeWidth;
                edge.box.fill = 'rgb(255, 255, 100)';
                
                this.edgeGroup.add(edge.line, edge.box);
                this.edgeMap[ [params.from, params.to] ] = edge;
            
            }.bind(this));

            // Edge Removed
            this.model.onEdgeRemoved.attach('removeEdge', function(_, params)
            {                
                const edge = this.edgeMap[ [params.from, params.to] ];
                this.edgeGroup.remove(edge.line, edge.box);
                edge.line.remove();
                edge.box.remove();
                delete this.edgeMap[ [params.from, params.to] ];

            }.bind(this));

            // Edge Moved
            this.model.onEdgeMoved.attach('moveEdge', function(_, params)
            {
                const edge = this.edgeMap[ [params.from, params.to] ];

                Util.setLineStartPoint(edge.line, params.fromPoint.x, params.fromPoint.y);
                Util.setLineEndPoint(edge.line, params.toPoint.x, params.toPoint.y);
                edge.box.translation.set(params.center.x, params.center.y);

            }.bind(this));
        },

//========= Event Handlers ===========//

        appendTo(container)
        {
            this.container = container;
            this.two.appendTo(container);
            this.canvas = container.getElementsByTagName('canvas')[0];

            // FOR ORANGE GLOW
            let ctx = this.canvas.getContext('2d');
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#ff9a00';

            this.initCanvasHandlers();
            this.initResize();
        },

        initCanvasHandlers()
        {
            this.canvas.addEventListener('mousedown', function(event)
            {
                event.preventDefault(); 
                this.mouseMoved = false;
                this.mouseDown  = true;
                this.onCanvasMouseDown.notify({x: event.offsetX, y: event.offsetY});
            
            }.bind(this));

            this.canvas.addEventListener('mouseup', function(event)
            {
                event.preventDefault();
                this.onCanvasMouseUp.notify({x: event.offsetX, y: event.offsetY});
                this.mouseDown = false;
                
                if(!this.mouseMoved)
                    this.onCanvasMouseClick.notify({x: event.offsetX, y: event.offsetY});
            
            }.bind(this));

            this.canvas.addEventListener('mousemove', function(event)
            {
                event.preventDefault();
                if(this.mouseMoveTimer > this.mouseMoveDelay)
                {
                    this.mouseMoved = true;
                    this.onCanvasMouseMove.notify({x: event.offsetX, y: event.offsetY});
                }
                else this.mouseMoveTimer++;

                if(this.mouseDown)
                        this.onCanvasMouseDrag.notify({x: event.offsetX, y: event.offsetY});
            
            }.bind(this));

            // Adds a small delay before triggering a mouse move event
            this.canvas.addEventListener('mousemove', Util.stagger(function(event)
            {
                event.preventDefault();
                this.mouseMoveTimer = 0;
            
            }.bind(this), this.mouseMoveResetDelay));
        },

        initResize()
        {
            window.addEventListener('resize', Util.stagger(function(event)
            {
                event.preventDefault();
                this.model.resize(this.two.width, this.two.height);

//======== DEBUG =============/
if(window.DEBUG_MODE)
{
    this.drawSpacialIndex();
}
//======== DEBUG =============/

            }.bind(this), 400));
        },

//======== DEBUG =============/
drawSpacialIndex()
{
    if(window.DEBUG_MODE)
    {
        const group = this.spacialIndexGridGroup;
        const two = this.two;
        
        // weird way to actually delete shapes
        group.children.forEach(function(shape)
        {
            shape.remove();
        });
        group.children = [];

        let width, height, centerX, centerY, rect, text;
        for(let x = 0; x < this.model.cellRatio; x++)
        {
            for(let y = 0; y < this.model.cellRatio; y++)
            {
                width = this.model.cellWidth;
                height = this.model.cellHeight;
                centerX = x * width + width / 2;
                centerY = y * height + height / 2; 
                rect = this.two.makeRectangle(centerX, centerY, width, height);
                rect.noFill();
                rect.stroke = '#fff';
                group.add(rect);
                text = this.two.makeText('' + x + y, centerX - width / 3 - 10, centerY - height / 3 - 10);
                text.stroke = '#fff'; 
                group.add(text);
            }   
        }
    }
}
//======== DEBUG =============/
 

    };

    return GraphView;
});