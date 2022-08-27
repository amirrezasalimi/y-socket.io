<h1 align="center">Welcome to y-socketio 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="https://github.com/ivan-topp/y-socketio#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/ivan-topp/y-socketio/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/ivan-topp/y-socketio/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/github/license/ivan-topp/y-socketio" />
  </a>
</p>

> Socket IO Connector for Yjs (Inspired by [y-websocket])

y-socketio is a YJS document synchronization implementation over the websockets protocol inspired by [y-websocket], but implemented with Socket.io. So for YJS and Socket.io enthusiasts it could be a simple and scalable alternative.

Like [y-websocket], this is a solid option if you want to manage authentication and authorization for editing YJS documents at a single point.

y-socketio features:

- Configuration and customization of the server side.
- Easy implementation of your authentication.
- Ability to enable document persistence with LevelDB.
- Ability to add custom callbacks at different points in a document's life cycle as shown below.
- Cross-tab communication, i.e. when opening the same document in more than one tab, changes are also transmitted via cross-tab communication (broadcast channel and localstorage as an alternative).
- Awareness information exchange.

IMPORTANT: y-socketio does not have HTTP callbacks implemented, because as mentioned above, you can implement custom callbacks (in the document update callback you could implement your HTTP callback logic).


# Installation

To install you can run this command

```sh
npm i @ivan-topp/y-socketio
```

# Usage

## Server side

You can run a basic server (you can review the [source code here](https://github.com/ivan-topp/y-socketio/blob/main/examples/server/src/index.ts)) using:

```sh
HOST=localhost PORT=1234 npx y-socketio
```

(by default the server listens on localhost:1234)

Although this server is functional, I recommend reviewing the example to extend it, add your own logic (such as authentication, document callbacks, etc.), and adapt it to your use case.

### Adding y-socketio to your project

y-socketio is very easy to add an new or existent project with socket.io. You just need to pass the socket.io server instance as shown below:

```ts
import { YSocketIO } from '@ivan-topp/y-socketio/dist/server'

// Create the YSocketIO instance
// NOTE: This uses the socket namespaces that match the regular expression /^\/yjs\|.*$/ 
//       (for example: 'ws://localhost:1234/yjs|my-document-room'), make sure that when using namespaces
//       for other logic, these do not match the regular expression, this could cause unwanted problems.
// TIP: You can export a new instance from another file to manage as singleton and access documents from all app.
const ysocketio = new YSocketIO(io)
// Execute initialize method
ysocketio.initialize()
```

You can also pass an object with the settings you need for your implementation. You can see the available options in the [Server API](#server-api)

## Client side

You can use SocketIOProvider on your client side like this:

```ts
import * as Y from 'yjs'
import { SocketIOProvider } from '@ivan-topp/y-socketio'

const doc = new Y.Doc()
const provider = new SocketIOProvider('ws://localhost:1234', 'room-name', doc);

provider.on('status', ({ status }: { status: string }) => {
  console.log(status) // Logs "connected" or "disconnected"
})
```

As with the server-side instance, in the SocketIOProvider you can also pass a number of parameters to configure your implementation. You can see the available options in the [Client API](#client-api)

([Here](https://github.com/ivan-topp/y-socketio/blob/main/examples/react-example/src/App.tsx) you can review an example in ReactJS)

## Run examples

This repository has an example that you can run in your machine and play with it. To run the examples, you must clone or download this repository.

### Running the server side example

```sh
npm run example:server
```

### Running the client side example

```sh
npm run example:client
```

This example is implemented on ReactJS and it was built with [Vite](https://vitejs.dev/).

# API

## Server API

```ts
import { YSocketIO } from '@ivan-topp/y-socketio/dist/server'
```

<dl>
  <b><code>ysocketio = new YSocketIO(io: SocketIO.Server [, configuration: YSocketIOConfiguration])</code></b>
  <dd>Create an instance to configure the server side of your deployment. The following configuration defaults can be overridden.</dd>
</dl>

```js
configuration = {
  // Optionally, set here the authentication validation callback (by default server accepts all connections)
  // (for example: if client sent a token, you can get token from auth object 
  authenticate: undefined, // Example: (auth) => auth.token === 'valid-token')
  // Optionally, enable LevelDB persistence by setting the directory where you want to store the database (by default the LevelDB persistence is disabled)
  levelPersistenceDir: undefined,
  // Enable/Disable garbage collection (by default the garbage collection is enabled)
  gcEnabled: true,
}
```

<dl>
  <b><code>ysocketio.documents: Map< string, Document ></code></b>
  <dd>The list of documents</dd>
</dl>

<dl>
  <b><code>ysocketio.on('document-loaded', function(doc: Document))</code></b>
  <dd>Add an event listener for the "document-loaded" event that is fired when a document is created (if persistence is enabled, it is executed after loading the document from the database)loaded.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('document-update', function(doc: Document, update: Uint8Array))</code></b>
  <dd>Add an event listener for the "document-update" event that is fired when a document is updated.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('awareness-update', function(doc: Document, update: Uint8Array))</code></b>
  <dd>Add an event listener for the "awareness update" event that fires when a document's awareness is updated.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('document-destroy', function(doc: Document))</code></b>
  <dd>Add an event listener for the "document-destroy" event that fires before a document is destroyed.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('all-document-connections-closed', function(doc: Document))</code></b>
  <dd>Add an event listener for the "all-document-connections-closed" event that fires when all clients of a document are disconnected.</dd>
</dl>

## Client API

```ts
import { SocketIOProvider } from '@ivan-topp/y-socketio'
```

<dl>
  <b><code>provider = new SocketIOProvider(
        serverUrl: string,
        room: string,
        doc: Y.Doc,
        [, configuration: ProviderConfiguration]</code></b>
  <dd>Create a new instance of SocketIOProvider, which syncs the document through the websockets server from the URL, with all clients connected to the document. You can configure your implementation by modifying the following default configuration.</dd>
</dl>

```js
configuration = {
  // Enable/Disable garbage collection (by default the garbage collection is enabled)
  gcEnabled: true,
  // Enable/Disable auto connect when the instance is created (by default the auto connection is enabled). Set this to "false" if you want to connect manually using provider.connect()
  autoConnect = true,
  // Specify an existing Awareness instance - see https://github.com/yjs/y-protocols
  awareness = new AwarenessProtocol.Awareness(doc),
  // Specify a number of milliseconds greater than 0 to resynchronize the document (by default is -1)
  resyncInterval = -1,
  // Disable broadcast channel synchronization (by default the broadcast channel synchronization is enabled)
  disableBc = false,
  // Specify the authentication data to send to the server on handshake
  auth = {} // Example: { token: 'valid-token' }
}
```

<dl>
  <b><code>ysocketio.roomName: string</code></b>
  <dd>The name of the document's room.</dd>
</dl>

<dl>
  <b><code>ysocketio.doc: Y.Doc</code></b>
  <dd>The YJS document.</dd>
</dl>

<dl>
  <b><code>ysocketio.awareness: AwarenessProtocol.Awareness</code></b>
  <dd>The YJS document.</dd>
</dl>

<dl>
  <b><code>ysocketio.bcconnected: boolean</code></b>
  <dd>BroadcastChannel connection state.</dd>
</dl>

<dl>
  <b><code>ysocketio.synced: boolean</code></b>
  <dd>Synchronization state.</dd>
</dl>

<dl>
  <b><code>ysocketio.connect()</code></b>
  <dd>Connect to the websockets server.</dd>
</dl>

<dl>
  <b><code>ysocketio.disconnect()</code></b>
  <dd>Disconnect from the websockets server.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('sync', function(isSynced: boolean))</code></b>
  <dd>Add an event listener for the "sync" event that is fired when the client received content from the server.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('status', function({ status: 'disconnected' | 'connecting' | 'connected' }))</code></b>
  <dd>Add an event listener for the "status" event that fires when the client receives connection status updates.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('connection-close', function(event: Socket.DisconnectReason, provider: SocketIOProvider))</code></b>
  <dd>Add an event listener for the "connection-close" event that fires when the websockets connection is closed.</dd>
</dl>

<dl>
  <b><code>ysocketio.on('connection-error', function(event: Socket.DisconnectReason, provider: SocketIOProvider))</code></b>
  <dd>Add an event listener for the "connection-error" event that is fired when an error has occurred while trying to connect to the websockets server (for example, the client is not authenticated).</dd>
</dl>

## 👦 Author

**Iván Topp**

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2022 [Iván Topp](https://github.com/ivan-topp).<br />
This project is [MIT](https://github.com/ivan-topp/y-socketio/blob/main/LICENSE) licensed.

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_



[y-websocket]: https://github.com/yjs/y-websocket