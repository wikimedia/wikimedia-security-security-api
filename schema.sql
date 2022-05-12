CREATE TABLE IF NOT EXISTS actor_data (
   pkid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
   ip VARBINARY(128) NOT NULL,
   org VARBINARY(128),
   client_count INT UNSIGNED,
   -- 0 = 'UNKNOWN', 1 = 'DESKTOP', 2 = 'HEADLESS', 3 = 'IOT', 4 = 'MOBILE'
   types SET('0','1','2','3','4'),
   conc_geohash VARBINARY(16),
   conc_city VARBINARY(32),
   conc_state VARBINARY(32),
   conc_country VARBINARY(32),
   conc_skew INT,
   conc_density INT,
   countries INT,
   location_country VARBINARY(32),
   -- 0 = 'UNKNOWN' ,1 = 'CALLBACK_PROXY', 2 = 'GEO_MISMATCH', 3 = 'LOGIN_BRUTEFORCE', 4 = 'TUNNEL', 5 = 'WEB_SCRAPING'
   risks SET('0','1','2','3','4','5'),
   PRIMARY KEY (pkid)
);

CREATE TABLE IF NOT EXISTS behaviors (
   pkid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
   behavior VARBINARY(64) UNIQUE,
   PRIMARY KEY (pkid)
);

CREATE TABLE IF NOT EXISTS actor_data_behaviors (
   actor_data_id BIGINT UNSIGNED,
   behavior_id BIGINT UNSIGNED
);

CREATE TABLE IF NOT EXISTS proxies (
   pkid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
   proxy VARBINARY(128) UNIQUE,
   PRIMARY KEY (pkid)
);

CREATE TABLE IF NOT EXISTS actor_data_proxies (
   actor_data_id BIGINT UNSIGNED,
   proxy_id BIGINT UNSIGNED
);

CREATE TABLE IF NOT EXISTS tunnels (
   pkid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
   tunnel VARBINARY(256) UNIQUE,
   PRIMARY KEY (pkid)
);

CREATE TABLE IF NOT EXISTS actor_data_tunnels (
   actor_data_id BIGINT UNSIGNED,
   tunnel_id BIGINT UNSIGNED
);
