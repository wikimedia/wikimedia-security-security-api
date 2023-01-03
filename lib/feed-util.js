'use strict';

const mariadb = require('mariadb');

async function createConnection() {
    return await mariadb.createConnection({
        host: process.env.HOST,
        user: process.env.MYSQL_ROOT_USER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT,
        multipleStatements: true
       });
}

async function endConnection(connection) {
    connection.end();
}

async function processActorResults(connection, actorResults) {
    const actors = {};
    const pkids = [];
    const behaviors = {};
    const proxies = {};
    const tunnels = {};
    actorResults.forEach(function (result) {
        // Cache pkids returned
        pkids.push(result.pkid);
        actors[result.pkid] = result;
    });

    // Get associated behavior, proxy, and tunnel ids
    const actorSubdataIds = await connection.query(`
        SELECT * FROM actor_data_behaviors WHERE actor_data_id IN ( ${'?,'.repeat(pkids.length).slice(0, -1)} );
        SELECT * FROM actor_data_proxies WHERE actor_data_id IN ( ${'?,'.repeat(pkids.length).slice(0, -1)} );
        SELECT * FROM actor_data_tunnels WHERE actor_data_id IN ( ${'?,'.repeat(pkids.length).slice(0, -1)} );
    `, [...pkids, ...pkids, ...pkids]);

    // Write behavior ids to actors and cache used behavior ids
    actorSubdataIds[0].forEach(function (actorBehavior) {
        const actorPkid = actorBehavior.actor_data_id;
        if (!actors[actorPkid].behaviors) {
            actors[actorPkid].behaviors = [];
        }
        if (!actors[actorPkid].behaviors.includes(actorBehavior.behavior_id)) {
            actors[actorPkid].behaviors.push(actorBehavior.behavior_id);
        }
        if (!Object.keys(behaviors).includes(actorBehavior.behavior_id)) {
            behaviors[actorBehavior.behavior_id] = null;
        }
    });

    // Write proxy ids to actors and cache used proxy ids
    actorSubdataIds[1].forEach(function (actorProxy) {
        const actorPkid = actorProxy.actor_data_id;
        if (!actors[actorPkid].proxies) {
            actors[actorPkid].proxies = [];
        }
        if (!actors[actorPkid].proxies.includes(actorProxy.proxy_id)) {
            actors[actorPkid].proxies.push(actorProxy.proxy_id);
        }
        if (!Object.keys(proxies).includes(actorProxy.proxy_id)) {
            proxies[actorProxy.proxy_id] = null;
        }
    });

    // Write tunnel ids to actors and cache used tunnel ids
    actorSubdataIds[2].forEach(function (actorTunnel) {
        const actorPkid = actorTunnel.actor_data_id;
        if (!actors[actorPkid].tunnels) {
            actors[actorPkid].tunnels = [];
        }
        if (!actors[actorPkid].tunnels.includes(actorTunnel.tunnel_id)) {
            actors[actorPkid].tunnels.push(actorTunnel.tunnel_id);
        }
        if (!Object.keys(tunnels).includes(actorTunnel.tunnel_id)) {
            tunnels[actorTunnel.tunnel_id] = null;
        }
    });

    // Get behavior, proxy, and tunnel data
    const actorSubdata = await connection.query(`
        SELECT * FROM behaviors WHERE pkid IN ( ${'?,'.repeat(Object.keys(behaviors).length).slice(0, -1)} );
        SELECT * FROM proxies WHERE pkid IN ( ${'?,'.repeat(Object.keys(proxies).length).slice(0, -1)} );
        SELECT * FROM tunnels WHERE pkid IN ( ${'?,'.repeat(Object.keys(tunnels).length).slice(0, -1)} );
        `, [...Object.keys(behaviors), ...Object.keys(proxies), ...Object.keys(tunnels)]);

    // Write behavior data to the cache object, converting buffers to strings
    actorSubdata[0].forEach(function (behaviorDatum) {
        behaviors[behaviorDatum.pkid] = behaviorDatum.behavior.toString();
    });

    // Write proxy data to the cache object, converting buffers to strings
    actorSubdata[1].forEach(function (proxyDatum) {
        proxies[proxyDatum.pkid] = proxyDatum.proxy.toString();
    });

    // Write tunnel data to the cache object, converting buffers to strings
    actorSubdata[2].forEach(function (tunnelDatum) {
        tunnels[tunnelDatum.pkid] = tunnelDatum.tunnel.toString();
    });

    // Write behavior, proxy, and tunnel data to actors
    Object.keys(actors).forEach(function (actorId) {
        const actor = actors[actorId];

        const behaviorIds = actor.behaviors;
        const actorBehaviors = [];
        if (behaviorIds) {
            behaviorIds.forEach(function (behaviorId) {
                actorBehaviors.push(behaviors[behaviorId]);
            });
        }
        actor.behaviors = actorBehaviors;

        const proxyIds = actor.proxies;
        const actorProxies = [];
        if (proxyIds) {
            proxyIds.forEach(function (proxyId) {
                actorProxies.push(proxies[proxyId]);
            });
        }
        actor.proxies = actorProxies;

        const tunnelIds = actor.tunnels;
        const actorTunnels = [];
        if (tunnelIds) {
            tunnelIds.forEach(function (tunnelId) {
                actorTunnels.push(tunnels[tunnelId]);
            });
        }
        actor.tunnels = actorTunnels;
    });

    // Stringify remaining buffers and map actors without pkids
    Object.keys(actors).forEach(function (actorPkid) {
        Object.keys(actors[actorPkid]).forEach(function (actorDatum) {
            if (Buffer.isBuffer(actors[actorPkid][actorDatum])) {
                actors[actorPkid][actorDatum] =
                    actors[actorPkid][actorDatum].toString();
            }
        });
        delete Object.assign(actors,
            { [actors[actorPkid].ip]: actors[actorPkid] })[actorPkid];
    });

    // Close db connection and return processed data
    endConnection(connection);
    return actors;
}

module.exports = {
    createConnection,
    endConnection,
    processActorResults
};
