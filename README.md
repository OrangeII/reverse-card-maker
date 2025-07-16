If http requests to AnkiConnect are rejected due to CORS policies:

- go to Tools -> Add-ons
- select "AnkiConnect" from the list
- click "Config"
- in the "webCorsOriginList" property add a string matching the url of the card maker Add-on

```json
{
  "apiKey": null,
  "apiLogPath": null,
  "ignoreOriginList": [],
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOriginList": [
    "http://localhost",
    "http://localhost:8766" //added this string
  ]
}
```
