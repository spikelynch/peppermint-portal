# Peppermint Portal

Discovery portal for [Peppermint](https://github.com/redbox-mint/peppermint).

## Architecture
```
                                                      +-------------------+
                                                      |                   |
                                                      | Peppermint Portal |
                                                      |                   |
                                                      +--------+----------+
                                                               |
                                                               |
+---------------------+         +--------------+      +--------v----------+
|                     |         |              |      |                   |
|  Source of Truth    +--------->  Peppermint  +------>    Search Index   |
|                     |         |              |      |      (SOLR)       |
+---------------------+         +--------------+      +-------------------+
```

## Running

### Quick set up

- Install docker-compose
- Clone [Peppermint](https://github.com/redbox-mint/peppermint/) and under a directory.
- Run using [Peppermint's docker-compose.yml](https://github.com/redbox-mint/peppermint/blob/master/docker-compose.yml): `docker-compose up`
- Navigate to `http://localhost:9001/peppermint/`

### Running as standalone, without Peppermint, etc.

- Clone a pre-built version of this project:`git clone -b dev_build https://github.com/redbox-mint/peppermint-portal.git`
- Configure your web server to serve `peppermint-portal/build/peppermint/` directory as `/peppermint/` path. Also, because the portal is a SPA, update your web server configuration to serve the `peppermint-portal/build/index.html` for all non-existent routes. See this sample config line for [NGINX](https://github.com/vyakymenko/angular-nginx-config-example/blob/master/ng2-application.conf#L97).
- Update your `build/peppermint/assets/config.json` so it can query your search index of choice.

## Customising

### Text

- Modify [translation file](https://github.com/redbox-mint/peppermint-portal/blob/master/src/assets/locales/en/translation.json)

### Discovery / search config

- Modify [config file](https://github.com/redbox-mint/peppermint-portal/blob/master/src/assets/config.json)

| Config key | Description |
| --- | --- |
| recordTypes | The available record types for discovery / query. The key value corresponds to the `search-<recordType>` in the [translation file](https://github.com/redbox-mint/peppermint-portal/blob/master/src/assets/locales/en/translation.json). Also, it corresponds to the record type config described below. |
| `recordType` | The record type block configuration.  |
| defaultSearchResult | Array of lines that is executed as part of displaying a search result. |

### Search interface

- For HTML header, script, CSS, etc.: modify [index.html](https://github.com/redbox-mint/peppermint-portal/blob/master/src/index.html)
- For main search header/footer/main interface component modify the [main component](https://github.com/redbox-mint/peppermint-portal/blob/master/src/app/app.component.html)
- For search bar interface/refiner UI, edit the appropriate component under [src/app/components](https://github.com/redbox-mint/peppermint-portal/blob/master/src/app/components)
