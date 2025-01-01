# PW-JS-Api

[PixelWalker](https://pixelwalker.net) API implementation for Node.js, Bun and modern browsers.


Some of the typings may be incomplete, please let me know on discord (doomester) if you need help or clarifications.

## Install

NPM:
```bash
npm i pw-js-api
```

PNPM:
```bash
pnpm i pw-js-api
```

Yarn:
```bash
yarn add pw-js-api
```

Bun:
```bash
bun i pw-js-api
```

## Install (Browser)

You could use a CDN like jsdelivr or unpkg. You can put this in your HTML page:

```html
<script src="https://cdn.jsdelivr.net/npm/pw-js-api@0.0.1/browser/pw.prod.js"></script>
```

```html
<script src="https://cdn.jsdelivr.net/npm/pw-js-api@0.0.1/browser/pw.dev.js"></script>
```

When you have these scripts in your HTML file, you will be able to use the global variable PW which contains PWGameClient, PWApiClient and Constants.

<!-- ## Example
[Example Bot Source Code](https://github.com/doomestee/PW-JS-Api/blob/main/examples/) -->

## Why?

The difference between this and preexisting libraries is that this project aims to be as minimal as possible, trying to be more direct. As such, there are no helpers that comes along with the package itself.

## License

[MIT](/LICENSE) License.