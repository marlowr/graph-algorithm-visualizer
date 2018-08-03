/**
 *  @author Jake Landowski
 *  8/1/18
 *  AdjacencyList.js
 * 
 *  Abstraction of an adjacency list for the Graph class
 */

'use strict';
define(function()
{
    const AdjacencyList = function(undirected)
    {
        this.undirected = undirected;
        this.vertexMap  = Object.create(null);
        this.edgeMap    = Object.create(null);
    };

    AdjacencyList.prototype = 
    {
        vertexExists(symbol)
        {
            const vertex = this.vertexMap[symbol];
            return vertex !== undefined && vertex !== null;
        },

        insertVertex(vertex)
        {
            this.vertexMap[vertex.data] = vertex;
        },

        getVertex(symbol)
        {
            return this.vertexMap[symbol];
        },

        deleteVertex(symbol)
        { 
            delete this.vertexMap[symbol];
        },

        insertEdge(edge)
        {
            const from = edge.from;
            const to   = edge.to;
            this.vertexMap[from].neighbors[to] = to;
            this.vertexMap[to].neighbors[from] = from;

            this.edgeMap[ [from, to] ] = edge;
            if(this.undirected) 
                this.edgeMap[ [to, from] ] = edge;
        },

        getEdge(from, to)
        {
            return this.edgeMap[ [from, to] ];
        },

        /**
         *  Deletes all references being used to represent
         *  this edge. Both undirected and directed edges
         *  are referenced by both vertices in the adjacency
         *  list, while only the from->to pair is used as the
         *  key for the edge object in the edgeMap.  
         * 
         *  @param from data value of the from vertex 
         *  @param to   data value of the to vertex
         */
        deleteEdge(from, to)
        { 
            delete this.edgeMap[ [from, to] ];
            if(this.undirected)
                delete this.edgeMap[ [to, from] ];

            delete this.vertexMap[from].neighbors[to];
            delete this.vertexMap[to].neighbors[from];
        },

        edgeExists(from, to)
        {
            const edge = this.edgeMap[ [from, to] ];
            return edge !== undefined && edge !== null;
        },

        forEachVertex(action)
        {
            const map = this.vertexMap;
            for(const vertexData in map)
                action(map[vertexData]);
        },

        // THIS WILL BREAK NEED TO AVOID DUPLICATES IN UNDIRECTED
        // forEachEdge(action)
        // {
        //     const map = this.edgeMap;
        //     for(const edgeData in map)
        //         action(map[edgeData]);
        // },
    };

    return AdjacencyList;
});
