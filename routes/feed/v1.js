'use strict';

const sUtil = require('../../lib/util');
const feedUtil = require('../../lib/feed-util');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * GET /
 * Gets some basic info about this service
 */
 router.get('/', (req, res) => {
    // simple sync return
    res.json({
        name: 'ip info feed',
        version: '1.0',
        description: 'get information on ips',
        home: '/feed/v1/'
    });

});

/**
 * GET /feed/v1/all
 * Fetches all information feed has on ip addresses
 */
 router.get('/all', async (req, res) => {
    const connection = await feedUtil.createConnection();
    const offset = req.query.offset || 0;
    const limit = req.query.limit || process.env.QUERY_LIMIT;
    return await connection.query(`
        SELECT * FROM actor_data LIMIT ${limit} OFFSET ${offset};
    `)
        .then(async (allResults) => {
            if (allResults) {
                return res.json(await feedUtil.processActorResults(connection, allResults));
            }
            return res.status(404).end('No data found');
        });
});

/**
 * GET /feed/v1/:ip
 * Fetches information feed has on an ip
 */
router.get('/ip/:ip', async (req, res) => {
    const connection = await feedUtil.createConnection();
    return await connection.query('SELECT * FROM actor_data WHERE ip = ? LIMIT 1;', req.params.ip)
        .then(async (allResults) => {
            if (allResults) {
                return res.json(await feedUtil.processActorResults(connection, allResults));
            }
            return res.status(404).end(`No data found for ${req.params.ip}`);
        });

});

module.exports = () => {
    return {
        path: '/feed/v1',
        skip_domain: true,
        router
    };

};
