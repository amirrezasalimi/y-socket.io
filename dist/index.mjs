// src/client/provider.ts
import * as s from "yjs";
import * as a from "lib0/broadcastchannel";
import * as n from "y-protocols/awareness";
import { Observable as y } from "lib0/observable";
import { io as b } from "socket.io-client";
var d = class extends y {
  constructor(e, t, o = new s.Doc(), {
    autoConnect: c = !0,
    awareness: i = new n.Awareness(o),
    resyncInterval: h = -1,
    disableBc: l = !1,
    auth: p = {}
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
        n.applyAwarenessUpdate(this.awareness, new Uint8Array(e), this);
      });
    };
    this.initSystemListeners = () => {
      typeof window != "undefined" ? window.addEventListener("beforeunload", this.beforeUnloadHandler) : typeof process != "undefined" && process.on("exit", this.beforeUnloadHandler);
    };
    this.onSocketConnection = (e = -1) => {
      this.emit("status", [{ status: "connected" }]), this.socket.emit("sync-step-1", s.encodeStateVector(this.doc), (t) => {
        s.applyUpdate(this.doc, new Uint8Array(t), this);
      }), this.awareness.getLocalState() !== null && this.socket.emit("awareness-update", n.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])), e > 0 && (this.resyncInterval = setInterval(() => {
        this.socket.disconnected || this.socket.emit("sync-step-1", s.encodeStateVector(this.doc), (t) => {
          s.applyUpdate(this.doc, new Uint8Array(t), this);
        });
      }, e));
    };
    this.onSocketDisconnection = (e) => {
      this.emit("connection-close", [e, this]), this.synced = !1, n.removeAwarenessStates(this.awareness, Array.from(this.awareness.getStates().keys()).filter((t) => t !== this.doc.clientID), this), this.emit("status", [{ status: "disconnected" }]);
    };
    this.onSocketConnectionError = (e) => {
      this.emit("connection-error", [e, this]);
    };
    this.onUpdateDoc = (e, t) => {
      t !== this && (this.socket.emit("sync-update", e), this.bcconnected && a.publish(this._broadcastChannel, {
        type: "sync-update",
        data: e
      }, this));
    };
    this.onSocketSyncUpdate = (e) => {
      s.applyUpdate(this.doc, new Uint8Array(e), this);
    };
    this.awarenessUpdate = ({ added: e, updated: t, removed: o }, c) => {
      let i = e.concat(t).concat(o);
      this.socket.emit("awareness-update", n.encodeAwarenessUpdate(this.awareness, i)), this.bcconnected && a.publish(this._broadcastChannel, {
        type: "awareness-update",
        data: n.encodeAwarenessUpdate(this.awareness, i)
      }, this);
    };
    this.beforeUnloadHandler = () => {
      n.removeAwarenessStates(this.awareness, [this.doc.clientID], "window unload");
    };
    this.connectBc = () => {
      this.bcconnected || (a.subscribe(this._broadcastChannel, this.onBroadcastChannelMessage), this.bcconnected = !0), a.publish(this._broadcastChannel, { type: "sync-step-1", data: s.encodeStateVector(this.doc) }, this), a.publish(this._broadcastChannel, { type: "sync-step-2", data: s.encodeStateAsUpdate(this.doc) }, this), a.publish(this._broadcastChannel, { type: "query-awareness", data: null }, this), a.publish(this._broadcastChannel, { type: "awareness-update", data: n.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]) }, this);
    };
    this.disconnectBc = () => {
      a.publish(this._broadcastChannel, {
        type: "awareness-update",
        data: n.encodeAwarenessUpdate(this.awareness, [this.doc.clientID], /* @__PURE__ */ new Map())
      }, this), this.bcconnected && (a.unsubscribe(this._broadcastChannel, this.onBroadcastChannelMessage), this.bcconnected = !1);
    };
    this.onBroadcastChannelMessage = (e, t) => {
      if (t !== this && e.type.length > 0)
        switch (e.type) {
          case "sync-step-1":
            a.publish(this._broadcastChannel, {
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
            a.publish(this._broadcastChannel, {
              type: "awareness-update",
              data: n.encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()))
            }, this);
            break;
          case "awareness-update":
            n.applyAwarenessUpdate(this.awareness, new Uint8Array(e.data), this);
            break;
          default:
            break;
        }
    };
    for (; e[e.length - 1] === "/"; )
      e = e.slice(0, e.length - 1);
    this._url = e, this.roomName = t, this.doc = o, this.awareness = i, this._broadcastChannel = `${e}/${t}`, this.disableBc = l, this.socket = b(`${this.url}/yjs|${t}`, {
      autoConnect: !1,
      transports: ["websocket"],
      forceNew: !0,
      auth: p
    }), this.doc.on("update", this.onUpdateDoc), this.socket.on("connect", () => this.onSocketConnection(h)), this.socket.on("disconnect", (r) => this.onSocketDisconnection(r)), this.socket.on("connect_error", (r) => this.onSocketConnectionError(r)), this.initSyncListeners(), this.initAwarenessListeners(), this.initSystemListeners(), i.on("update", this.awarenessUpdate), c && this.connect();
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
export {
  d as SocketIOProvider
};
//# sourceMappingURL=index.mjs.map