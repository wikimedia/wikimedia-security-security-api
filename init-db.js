'use strict';

const fs = require('fs');
const mariadb = require('mariadb');
const zlib = require('zlib');
const byline = require('byline');

async function getConnection() {
    return await mariadb.createConnection({
        host: process.env.HOST,
        user: process.env.MYSQL_ROOT_USER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT,
        multipleStatements: true
       });
}

async function addTables() {
    const connection = await getConnection();
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    await connection.query('DROP TABLE actor_data;');
    await connection.query(schema);
    connection.end();
}

const entityTypes = {
    UNKNOWN: 0,
    DESKTOP: 1,
    HEADLESS: 2,
    IOT: 3,
    MOBILE: 4
};

function getEntityTypes(types) {
    // Assume only one in array
    return entityTypes[types[0]];
}

const riskTypes = {
    UNKNOWN: 0,
    CALLBACK_PROXY: 1,
    GEO_MISMATCH: 2,
    LOGIN_BRUTEFORCE: 3,
    TUNNEL: 4,
    WEB_SCRAPING: 5
};

function getEntityRisks(risks) {
    // Assume only one in array
    return riskTypes[risks[0]];
}

const behaviorPkids = {};
const proxyPkids = {};
const tunnelPkids = {};

let entryCount = 0;
let processedEntries = 0;

async function closeConnectionWhenDone(connection) {
    if (processedEntries === entryCount) {
        await connection.end();
    } else {
        setTimeout(function () {
            closeConnectionWhenDone(connection);
        }, 1000);
    }
}

async function importData() {
    const connection = await getConnection();
    const lineReader = byline(fs.createReadStream(process.env.FEED_PATH).pipe(zlib.createGunzip()));

    // Clear tables before processing
    await connection.query(`DELETE FROM actor_data; 
        DELETE FROM behaviors; DELETE FROM actor_data_behaviors;
        DELETE FROM proxies; DELETE FROM actor_data_proxies;
        DELETE FROM tunnels; DELETE FROM actor_data_tunnels;`);
    lineReader.on('data', async (line) => {
        entryCount += 1;
        const entity = JSON.parse(line);
        const queryObj = {
            actor_data: {
                ip: entity.ip,
                org: entity.organization,
                client_count: entity.client.count || 0,
                types: entity.client.types ?
                    getEntityTypes(entity.client.types) : entityTypes.UNKNOWN,
                conc_geohash:
                    entity.client.concentration && entity.client.concentration.geohash ? entity.client.concentration.geohash : '',
                conc_city:
                    entity.client.concentration && entity.client.concentration.city ? entity.client.concentration.city : '',
                conc_state:
                    entity.client.concentration && entity.client.concentration.state ? entity.client.concentration.state : '',
                conc_country:
                    entity.client.concentration && entity.client.concentration.country ? entity.client.concentration.country : '',
                conc_skew:
                    entity.client.concentration && entity.client.concentration.skew ?
                    entity.client.concentration.skew : 0,
                conc_density:
                    entity.client.concentration && entity.client.concentration.density ?
                    entity.client.concentration.density : 0,
                countries: entity.client.countries || 0,
                location_country: entity.location.country || '',
                risks: getEntityRisks(entity.risks) || riskTypes.UNKNOWN
            },
            behaviors: entity.client.behaviors || [],
            proxies: entity.client.proxies || [],
            tunnels: entity.tunnels || []
        };

        // Add to actor_data
        const pkid = await connection.query(
            `INSERT INTO
                actor_data (${Object.keys(queryObj.actor_data).toString()})
            VALUES
                ( ${JSON.stringify(Object.values(queryObj.actor_data)).slice(1, -1)} )`
        );

        // Add to behaviors
        queryObj.behaviors.forEach(async (behavior) => {
            const behaviorPkid = await connection.query(
                'INSERT IGNORE INTO behaviors (behavior) VALUES (?);', [behavior]
            );
            if (behaviorPkid.insertId) {
                behaviorPkids[behavior] = behaviorPkid.insertId;
            }
            await connection.query(
                `INSERT INTO
                    actor_data_behaviors (actor_data_id,behavior_id)
                VALUES
                    (${pkid.insertId}, ${behaviorPkids[behavior]})`
            );
        });

        // Add to proxies
        queryObj.proxies.forEach(async (proxy) => {
            const proxyPkid = await connection.query(
                'INSERT IGNORE INTO proxies (proxy) VALUES (?);', [proxy]
            );
            if (proxyPkid.insertId) {
                proxyPkids[proxy] = proxyPkid.insertId;
            }
            await connection.query(
                `INSERT INTO
                    actor_data_proxies (actor_data_id,proxy_id)
                VALUES
                    (${pkid.insertId}, ${proxyPkids[proxy]})`
            );
        });

        // Add to tunnels
        queryObj.tunnels.forEach(async (tunnel) => {
            const tunnelPkid = await connection.query(
                'INSERT IGNORE INTO tunnels (tunnel) VALUES (?);', [tunnel]
            );
            if (tunnelPkid.insertId) {
                tunnelPkids[tunnel] = tunnelPkid.insertId;
            }
            await connection.query(
                `INSERT INTO
                    actor_data_tunnels (actor_data_id,tunnel_id)
                VALUES
                    (${pkid.insertId}, ${tunnelPkids[tunnel]})`
            );
        });

        processedEntries += 1;
    });

    lineReader.on('end', () => {
        closeConnectionWhenDone(connection);
      });
}

async function init() {
    await addTables();
    await importData();
}

init();
