CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS gis_features (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    geom geometry(Point, 4326) NOT NULL
);
INSERT INTO gis_features (name, category, geom) VALUES
('Shaniwar Wada', 'Heritage', ST_SetSRID(ST_MakePoint(73.8567, 18.5196), 4326)),
('Aga Khan Palace', 'Heritage', ST_SetSRID(ST_MakePoint(73.9015, 18.5523), 4326)),
('Pune Railway Station', 'Transport', ST_SetSRID(ST_MakePoint(73.8740, 18.5289), 4326)),
('Saras Baug', 'Park', ST_SetSRID(ST_MakePoint(73.8553, 18.5018), 4326)),
('University of Pune', 'Education', ST_SetSRID(ST_MakePoint(73.8245, 18.5522), 4326));
CREATE INDEX IF NOT EXISTS gis_features_geom_gix ON gis_features USING GIST (geom);
