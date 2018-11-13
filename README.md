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
