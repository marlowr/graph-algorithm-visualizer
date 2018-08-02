/**
 *  @author Jake Landowski
 *  7/27/18
 *  Vertex.js
 * 
 *  Represents the data structure for the Vertex class..
 */

'use strict';
define(function()
{
    const Vertex = function(data, x, y, options={})
    {
        // this.id = 'vertex' + Vertex.vertexId++,
        this.id        = data;
        this.data      = data,
        this.options   = options;
        this.neighbors = Object.create(null),
        this.setPoints(x, y);
    };

    // Vertex.vertexId = 0;
    Vertex.prototype = 
    {
        setPoints(x, y)
        {
            const radius = this.options.vertexSize + this.options.vertexOutlineSize;
            this.x = x;
            this.y = y;
            this.upperLeft  = {x: x - radius, y: y - radius};
            this.lowerRight = {x: x + radius, y: y + radius};
        },

        forEachEdge(action)
        {
            for(const neighbor in this.neighbors)
            {
                if(Vertex.adjList.edgeExists(this.data, neighbor))
                    action(Vertex.adjList.getEdge(this.data, neighbor));
            }
        }
    };

   return Vertex;
});
