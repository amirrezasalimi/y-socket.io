#!/usr/bin/env node
"use strict";
var k = Object.create;
var w = Object.defineProperty;
var Y = Object.getOwnPropertyDescriptor;
var _ = Object.getOwnPropertyNames;
var L = Object.getPrototypeOf, M = Object.prototype.hasOwnProperty;
var N = (i, r, t, e) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (let n of _(r))
      !M.call(i, n) && n !== t && w(i, n, { get: () => r[n], enumerable: !(e = Y(r, n)) || e.enumerable });
  return i;
};
var p = (i, r, t) => (t = i != null ? k(L(i)) : {}, N(
  r || !i || !i.__esModule ? w(t, "default", { value: i, enumerable: !0 }) : t,
  i
));

// src/server/server.ts
var D = p(require("http")), U = require("socket.io");

// src/server/y-socket-io.ts
var l = p(require("yjs")), h = p(require("y-protocols/awareness")), v = require("y-leveldb");

// src/server/document.ts
var y = p(require("yjs")), m = p(require("y-protocols/awareness")), E = process.env.GC !== "false" && process.env.GC !== "0", d = class extends y.Doc {
  constructor(t, e, n) {
    super({ gc: E });
    this.onUpdateDoc = (t) => {
      var e;
      if (((e = this.callbacks) == null ? void 0 : e.onUpdate) != null)
        try {
          this.callbacks.onUpdate(this, t);
        } catch (n) {
          console.warn(n);
        }
      this.namespace.emit("sync-update", t);
    };
    this.onUpdateAwareness = ({ added: t, updated: e, removed: n }, s) => {
      var c;
      let o = t.concat(e, n), a = m.encodeAwarenessUpdate(this.awareness, o);
      if (((c = this.callbacks) == null ? void 0 : c.onChangeAwareness) != null)
        try {
          this.callbacks.onChangeAwareness(this, a);
        } catch (C) {
          console.warn(C);
        }
      this.namespace.emit("awareness-update", a);
    };
    this.name = t, this.namespace = e, this.awareness = new m.Awareness(this), this.awareness.setLocalState(null), this.callbacks = n, this.awareness.on("update", this.onUpdateAwareness), this.on("update", this.onUpdateDoc);
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
var g = require("lib0/observable"), u = class extends g.Observable {
  constructor(t, e) {
    var n;
    super();
    this._documents = /* @__PURE__ */ new Map();
    this._levelPersistenceDir = null;
    this.persistence = null;
    this.initSyncListeners = (t, e) => {
      t.on("sync-step-1", (n, s) => {
        this.hasPermission(e, t.id, "write") && s(l.encodeStateAsUpdate(e, new Uint8Array(n)));
      }), t.on("sync-update", (n) => {
        this.hasPermission(e, t.id, "write") && l.applyUpdate(e, n, null);
      });
    };
    this.initAwarenessListeners = (t, e) => {
      t.on("awareness-update", (n) => {
        h.applyAwarenessUpdate(e.awareness, new Uint8Array(n), t);
      });
    };
    this.initSocketListeners = (t, e) => {
      t.on("disconnect", async () => {
        e.getMap("permissions").get(t.id) && e.getMap("permissions").delete(t.id), (await t.nsp.fetchSockets()).length === 0 && (this.emit("all-document-connections-closed", [e]), this.persistence != null && (await this.persistence.writeState(e.name, e), await e.destroy()));
      });
    };
    this.startSynchronization = (t, e) => {
      t.emit("sync-step-1", l.encodeStateVector(e), (n) => {
        l.applyUpdate(e, new Uint8Array(n), this);
      }), t.emit("awareness-update", h.encodeAwarenessUpdate(e.awareness, Array.from(e.awareness.getStates().keys())));
    };
    this.io = t, this._levelPersistenceDir = (n = e == null ? void 0 : e.levelPersistenceDir) != null ? n : process.env.YPERSISTENCE, this._levelPersistenceDir != null && this.initLevelDB(this._levelPersistenceDir), this.configuration = e;
  }
  initialize() {
    let t = this.io.of(/^\/yjs\|.*$/);
    t.use(async (e, n) => {
      var s;
      return ((s = this.configuration) == null ? void 0 : s.authenticate) != null && !await this.configuration.authenticate(e.handshake) ? n(new Error("Unauthorized")) : n();
    }), t.on("connection", async (e) => {
      var o, a;
      let n = e.nsp.name.replace(/\/yjs\|/, ""), s = await this.initDocument(n, e.nsp, (o = this.configuration) == null ? void 0 : o.gcEnabled);
      if (((a = this.configuration) == null ? void 0 : a.permissionMiddleware) != null) {
        let c = await this.configuration.permissionMiddleware(e, s);
        if (s.getMap("permissions").set(e.id, c), c.length == 0) {
          e.disconnect();
          return;
        }
      }
      this.emit("client-connect", [e, s, n]), this.initSyncListeners(e, s), this.initAwarenessListeners(e, s), this.initSocketListeners(e, s), this.startSynchronization(e, s);
    });
  }
  get documents() {
    return this._documents;
  }
  async initDocument(t, e, n = !0) {
    var o;
    let s = (o = this._documents.get(t)) != null ? o : new d(t, e, {
      onUpdate: (a, c) => this.emit("document-update", [a, c]),
      onChangeAwareness: (a, c) => this.emit("awareness-update", [a, c]),
      onDestroy: async (a) => {
        this._documents.delete(a.name), this.emit("document-destroy", [a]);
      }
    });
    return s.gc = n, this._documents.has(t) || (this.persistence != null && await this.persistence.bindState(t, s), this._documents.set(t, s), this.emit("document-loaded", [s])), s;
  }
  initLevelDB(t) {
    let e = new v.LeveldbPersistence(t);
    this.persistence = {
      provider: e,
      bindState: async (n, s) => {
        let o = await e.getYDoc(n), a = l.encodeStateAsUpdate(s);
        await e.storeUpdate(n, a), l.applyUpdate(s, l.encodeStateAsUpdate(o)), s.on("update", async (c) => await e.storeUpdate(n, c));
      },
      writeState: async (n, s) => {
      }
    };
  }
  hasPermission(t, e, n) {
    var o;
    return !!((o = t.getMap("permissions").get(e)) != null ? o : []).includes(n);
  }
};

// src/server/server.ts
var S, O = (S = process.env.HOST) != null ? S : "localhost", A, f = parseInt(`${(A = process.env.PORT) != null ? A : 1234}`), b = D.default.createServer((i, r) => {
  r.writeHead(200, { "Content-Type": "application/json" }), r.end(JSON.stringify({ ok: !0 }));
}), P = new U.Server(b), x = new u(P, {});
x.initialize();
P.on("connection", (i) => {
  console.log(`[connection] Connected with user: ${i.id}`), i.on("disconnect", () => {
    console.log(`[disconnect] Disconnected with user: ${i.id}`);
  });
});
b.listen(f, O, void 0, () => console.log(`Server running on port ${f}`));
//# sourceMappingURL=server.js.map