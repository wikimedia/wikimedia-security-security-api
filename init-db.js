'use strict';

const fs = require('fs');
const mariadb = require('mariadb');

async function addTables() {
    const connection = await mariadb.createConnection({
        host: process.env.HOST,
        user: process.env.MYSQL_ROOT_USER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        multipleStatements: true
       });

    const schema = fs.readFileSync('./schema.sql', 'utf8');
    const test = await connection.query(schema);
    console.log(test); // [{ "1": 1 }]

    connection.end();
}

addTables();
