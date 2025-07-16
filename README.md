# Make Reverse Cards Add-on

This add-on helps you create reverse cards from your existing Anki notes.

## Installation

1.  Go to your Anki add-ons folder. You can find it by going to **Tools -> Add-ons -> View Files**.
2.  Clone or download this repository into a new folder named `make-reverse-cards` inside the add-ons folder.
3.  Restart Anki.

## Requirements

This add-on requires [AnkiConnect](https://ankiweb.net/shared/info/2055492159) to be installed and running.

## Troubleshooting

### AnkiConnect CORS Policy

If http requests to AnkiConnect are rejected due to CORS policies:

1.  In Anki, go to **Tools -> Add-ons**.
2.  Select **AnkiConnect** from the list.
3.  Click the **Config** button.
4.  In the `webCorsOriginList` property, add the URL of the card maker tool.

For example:

```json
{
  "apiKey": null,
  "apiLogPath": null,
  "ignoreOriginList": [],
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOriginList": ["http://localhost", "http://localhost:8766"]
}
```
