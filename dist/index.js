"use strict";
var k = Object.create;
var d = Object.defineProperty;
var U = Object.getOwnPropertyDescriptor;
var S = Object.getOwnPropertyNames;
var C = Object.getPrototypeOf, m = Object.prototype.hasOwnProperty;
var g = (n, o) => {
  for (var e in o)
    d(n, e, { get: o[e], enumerable: !0 });
}, b = (n, o, e, t) => {
  if (o && typeof o == "object" || typeof o == "function")
    for (let r of S(o))
      !m.call(n, r) && r !== e && d(n, r, { get: () => o[r], enumerable: !(t = U(o, r)) || t.enumerable });
  return n;
};
var l = (n, o, e) => (e = n != null ? k(C(n)) : {}, b(
  o || !n || !n.__esModule ? d(e, "default", { value: n, enumerable: !0 }) : e,
  n
)), _ = (n) => b(d({}, "__esModule", { value: !0 }), n);

// src/index.ts
var P = {};
g(P, {
  SocketIOProvider: () => p
});
module.exports = _(P);

// src/client/provider.ts
var s = l(require("yjs")), i = l(require("lib0/broadcastchannel")), a = l(require("y-protocols/awareness")), w = require("lib0/observable"), u = require("socket.io-client"), p = class extends w.Observable {
  constructor(e, t, r = new s.Doc(), {
    autoConnect: y = !0,
    awareness: c = new a.Awareness(r),
    resyncInterval: f = -1,
    disableBc: v = !1,
    auth: A = {}
  }) {
    super();
    this.bcconnected = !1;
    this._synced = !1;
    this.resyncInterval = null;
    this.initSyncListeners = () => {
      this.socket.on("sync-step-1", (e, t) => {
        t(s.encodeStateAsUpdate(this.doc, new Uint8Array(e))), this.synced = !0;
      }), this.socket.on("sync-update", this.onSocketSyncUpdate);
    };
    this.initAwarenessListeners = () => {
      this.socket.on("awareness-update", (e) => {
        a.applyAwarenessUpdate(this.awareness, new Uint8Array(e), this);
      });
    };
    this.initSystemListeners = () => {
      typeof window != "undefined" ? window.addEventListener("beforeunload", this.beforeUnloadHandler) : typeof process != "undefined" && process.on("exit", this.beforeUnloadHandler);
    };
    this.onSocketConnection = (e = -1) => {
      this.emit("status", [{ status: "connected" }]), this.socket.emit("sync-step-1", s.encodeStateVector(this.doc), (t) => {
        s.applyUpdate(this.doc, new Uint8Array(t), this);
      }), this.awareness.getLocalState() !== null && this.socket.emit("awareness-update", a.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])), e > 0 && (this.resyncInterval = setInterval(() => {
        this.socket.disconnected || this.socket.emit("sync-step-1", s.encodeStateVector(this.doc), (t) => {
          s.applyUpdate(this.doc, new Uint8Array(t), this);
        });
      }, e));
    };
    this.onSocketDisconnection = (e) => {
      this.emit("connection-close", [e, this]), this.synced = !1, a.removeAwarenessStates(this.awareness, Array.from(this.awareness.getStates().keys()).filter((t) => t !== this.doc.clientID), this), this.emit("status", [{ status: "disconnected" }]);
    };
    this.onSocketConnectionError = (e) => {
      this.emit("connection-error", [e, this]);
    };
    this.onUpdateDoc = (e, t) => {
      t !== this && (this.socket.emit("sync-update", e), this.bcconnected && i.publish(this._broadcastChannel, {
        type: "sync-update",
        data: e
      }, this));
    };
    this.onSocketSyncUpdate = (e) => {
      s.applyUpdate(this.doc, new Uint8Array(e), this);
    };
    this.awarenessUpdate = ({ added: e, updated: t, removed: r }, y) => {
      let c = e.concat(t).concat(r);
      this.socket.emit("awareness-update", a.encodeAwarenessUpdate(this.awareness, c)), this.bcconnected && i.publish(this._broadcastChannel, {
        type: "awareness-update",
        data: a.encodeAwarenessUpdate(this.awareness, c)
      }, this);
    };
    this.beforeUnloadHandler = () => {
      a.removeAwarenessStates(this.awareness, [this.doc.clientID], "window unload");
    };
    this.connectBc = () => {
      this.bcconnected || (i.subscribe(this._broadcastChannel, this.onBroadcastChannelMessage), this.bcconnected = !0), i.publish(this._broadcastChannel, { type: "sync-step-1", data: s.encodeStateVector(this.doc) }, this), i.publish(this._broadcastChannel, { type: "sync-step-2", data: s.encodeStateAsUpdate(this.doc) }, this), i.publish(this._broadcastChannel, { type: "query-awareness", data: null }, this), i.publish(this._broadcastChannel, { type: "awareness-update", data: a.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]) }, this);
    };
    this.disconnectBc = () => {
      i.publish(this._broadcastChannel, {
        type: "awareness-update",
        data: a.encodeAwarenessUpdate(this.awareness, [this.doc.clientID], /* @__PURE__ */ new Map())
      }, this), this.bcconnected && (i.unsubscribe(this._broadcastChannel, this.onBroadcastChannelMessage), this.bcconnected = !1);
    };
    this.onBroadcastChannelMessage = (e, t) => {
      if (t !== this && e.type.length > 0)
        switch (e.type) {
          case "sync-step-1":
            i.publish(this._broadcastChannel, {
              type: "sync-step-2",
              data: s.encodeStateAsUpdate(this.doc, e.data)
            }, this);
            break;
          case "sync-step-2":
            s.applyUpdate(this.doc, new Uint8Array(e.data), this);
            break;
          case "sync-update":
            s.applyUpdate(this.doc, new Uint8Array(e.data), this);
            break;
          case "query-awareness":
            i.publish(this._broadcastChannel, {
              type: "awareness-update",
              data: a.encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()))
            }, this);
            break;
          case "awareness-update":
            a.applyAwarenessUpdate(this.awareness, new Uint8Array(e.data), this);
            break;
          default:
            break;
        }
    };
    for (; e[e.length - 1] === "/"; )
      e = e.slice(0, e.length - 1);
    this._url = e, this.roomName = t, this.doc = r, this.awareness = c, this._broadcastChannel = `${e}/${t}`, this.disableBc = v, this.socket = (0, u.io)(`${this.url}/yjs|${t}`, {
      autoConnect: !1,
      transports: ["websocket"],
      forceNew: !0,
      auth: A
    }), this.doc.on("update", this.onUpdateDoc), this.socket.on("connect", () => this.onSocketConnection(f)), this.socket.on("disconnect", (h) => this.onSocketDisconnection(h)), this.socket.on("connect_error", (h) => this.onSocketConnectionError(h)), this.initSyncListeners(), this.initAwarenessListeners(), this.initSystemListeners(), c.on("update", this.awarenessUpdate), y && this.connect();
  }
  get broadcastChannel() {
    return this._broadcastChannel;
  }
  get url() {
    return this._url;
  }
  get synced() {
    return this._synced;
  }
  set synced(e) {
    this._synced !== e && (this._synced = e, this.emit("synced", [e]), this.emit("sync", [e]));
  }
  connect() {
    this.socket.connected || (this.emit("status", [{ status: "connecting" }]), this.socket.connect(), this.disableBc || this.connectBc(), this.synced = !1);
  }
  disconnect() {
    this.socket.connected && (this.disconnectBc(), this.socket.disconnect());
  }
  destroy() {
    this.resyncInterval != null && clearInterval(this.resyncInterval), this.disconnect(), typeof window != "undefined" ? window.removeEventListener("beforeunload", this.beforeUnloadHandler) : typeof process != "undefined" && process.off("exit", this.beforeUnloadHandler), this.awareness.off("update", this.awarenessUpdate), this.doc.off("update", this.onUpdateDoc), super.destroy();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SocketIOProvider
});
//# sourceMappingURL=index.js.map