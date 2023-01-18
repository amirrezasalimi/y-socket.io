"use strict";
var D = Object.create;
var d = Object.defineProperty;
var U = Object.getOwnPropertyDescriptor;
var S = Object.getOwnPropertyNames;
var b = Object.getPrototypeOf, P = Object.prototype.hasOwnProperty;
var C = (i, r) => {
  for (var t in r)
    d(i, t, { get: r[t], enumerable: !0 });
}, y = (i, r, t, e) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (let s of S(r))
      !P.call(i, s) && s !== t && d(i, s, { get: () => r[s], enumerable: !(e = U(r, s)) || e.enumerable });
  return i;
};
var m = (i, r, t) => (t = i != null ? D(b(i)) : {}, y(
  r || !i || !i.__esModule ? d(t, "default", { value: i, enumerable: !0 }) : t,
  i
)), Y = (i) => y(d({}, "__esModule", { value: !0 }), i);

// src/server/index.ts
var k = {};
C(k, {
  Document: () => l,
  YSocketIO: () => w
});
module.exports = Y(k);

// src/server/document.ts
var g = m(require("yjs")), h = m(require("y-protocols/awareness")), _ = process.env.GC !== "false" && process.env.GC !== "0", l = class extends g.Doc {
  constructor(t, e, s) {
    super({ gc: _ });
    this.onUpdateDoc = (t) => {
      var e;
      if (((e = this.callbacks) == null ? void 0 : e.onUpdate) != null)
        try {
          this.callbacks.onUpdate(this, t);
        } catch (s) {
          console.warn(s);
        }
      this.namespace.emit("sync-update", t);
    };
    this.onUpdateAwareness = ({ added: t, updated: e, removed: s }, n) => {
      var c;
      let o = t.concat(e, s), a = h.encodeAwarenessUpdate(this.awareness, o);
      if (((c = this.callbacks) == null ? void 0 : c.onChangeAwareness) != null)
        try {
          this.callbacks.onChangeAwareness(this, a);
        } catch (A) {
          console.warn(A);
        }
      this.namespace.emit("awareness-update", a);
    };
    this.name = t, this.namespace = e, this.awareness = new h.Awareness(this), this.awareness.setLocalState(null), this.callbacks = s, this.awareness.on("update", this.onUpdateAwareness), this.on("update", this.onUpdateDoc);
  }
  async destroy() {
    var t;
    if (((t = this.callbacks) == null ? void 0 : t.onDestroy) != null)
      try {
        await this.callbacks.onDestroy(this);
      } catch (e) {
        console.warn(e);
      }
    this.awareness.off("update", this.onUpdateAwareness), this.off("update", this.onUpdateDoc), this.namespace.disconnectSockets(), super.destroy();
  }
};

// src/server/y-socket-io.ts
var p = m(require("yjs")), u = m(require("y-protocols/awareness")), f = require("y-leveldb");
var v = require("lib0/observable"), w = class extends v.Observable {
  constructor(t, e) {
    var s;
    super();
    this._documents = /* @__PURE__ */ new Map();
    this._levelPersistenceDir = null;
    this.persistence = null;
    this.initSyncListeners = (t, e) => {
      t.on("sync-step-1", (s, n) => {
        this.hasPermission(e, t.id, "write") && n(p.encodeStateAsUpdate(e, new Uint8Array(s)));
      }), t.on("sync-update", (s) => {
        this.hasPermission(e, t.id, "write") && p.applyUpdate(e, s, null);
      });
    };
    this.initAwarenessListeners = (t, e) => {
      t.on("awareness-update", (s) => {
        u.applyAwarenessUpdate(e.awareness, new Uint8Array(s), t);
      });
    };
    this.initSocketListeners = (t, e) => {
      t.on("disconnect", async () => {
        e.getMap("permissions").get(t.id) && e.getMap("permissions").delete(t.id), (await t.nsp.fetchSockets()).length === 0 && (this.emit("all-document-connections-closed", [e]), this.persistence != null && (await this.persistence.writeState(e.name, e), await e.destroy()));
      });
    };
    this.startSynchronization = (t, e) => {
      t.emit("sync-step-1", p.encodeStateVector(e), (s) => {
        p.applyUpdate(e, new Uint8Array(s), this);
      }), t.emit("awareness-update", u.encodeAwarenessUpdate(e.awareness, Array.from(e.awareness.getStates().keys())));
    };
    this.io = t, this._levelPersistenceDir = (s = e == null ? void 0 : e.levelPersistenceDir) != null ? s : process.env.YPERSISTENCE, this._levelPersistenceDir != null && this.initLevelDB(this._levelPersistenceDir), this.configuration = e;
  }
  initialize() {
    let t = this.io.of(/^\/yjs\|.*$/);
    t.use(async (e, s) => {
      var n;
      return ((n = this.configuration) == null ? void 0 : n.authenticate) != null && !await this.configuration.authenticate(e.handshake) ? s(new Error("Unauthorized")) : s();
    }), t.on("connection", async (e) => {
      var o, a;
      let s = e.nsp.name.replace(/\/yjs\|/, ""), n = await this.initDocument(s, e.nsp, (o = this.configuration) == null ? void 0 : o.gcEnabled);
      if (((a = this.configuration) == null ? void 0 : a.permissionMiddleware) != null) {
        let c = await this.configuration.permissionMiddleware(e, n);
        if (n.getMap("permissions").set(e.id, c), c.length == 0) {
          e.disconnect();
          return;
        }
      }
      this.emit("client-connect", [e, n, s]), this.initSyncListeners(e, n), this.initAwarenessListeners(e, n), this.initSocketListeners(e, n), this.startSynchronization(e, n);
    });
  }
  get documents() {
    return this._documents;
  }
  async initDocument(t, e, s = !0) {
    var o;
    let n = (o = this._documents.get(t)) != null ? o : new l(t, e, {
      onUpdate: (a, c) => this.emit("document-update", [a, c]),
      onChangeAwareness: (a, c) => this.emit("awareness-update", [a, c]),
      onDestroy: async (a) => {
        this._documents.delete(a.name), this.emit("document-destroy", [a]);
      }
    });
    return n.gc = s, this._documents.has(t) || (this.persistence != null && await this.persistence.bindState(t, n), this._documents.set(t, n), this.emit("document-loaded", [n])), n;
  }
  initLevelDB(t) {
    let e = new f.LeveldbPersistence(t);
    this.persistence = {
      provider: e,
      bindState: async (s, n) => {
        let o = await e.getYDoc(s), a = p.encodeStateAsUpdate(n);
        await e.storeUpdate(s, a), p.applyUpdate(n, p.encodeStateAsUpdate(o)), n.on("update", async (c) => await e.storeUpdate(s, c));
      },
      writeState: async (s, n) => {
      }
    };
  }
  hasPermission(t, e, s) {
    var o;
    return !!((o = t.getMap("permissions").get(e)) != null ? o : []).includes(s);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Document,
  YSocketIO
});
//# sourceMappingURL=index.js.map