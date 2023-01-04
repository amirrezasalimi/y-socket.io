// src/server/document.ts
import * as d from "yjs";
import * as l from "y-protocols/awareness";
var y = process.env.GC !== "false" && process.env.GC !== "0", c = class extends d.Doc {
  constructor(t, e, s) {
    super({ gc: y });
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
      var r;
      let a = t.concat(e, s), i = l.encodeAwarenessUpdate(this.awareness, a);
      if (((r = this.callbacks) == null ? void 0 : r.onChangeAwareness) != null)
        try {
          this.callbacks.onChangeAwareness(this, i);
        } catch (w) {
          console.warn(w);
        }
      this.namespace.emit("awareness-update", i);
    };
    this.name = t, this.namespace = e, this.awareness = new l.Awareness(this), this.awareness.setLocalState(null), this.callbacks = s, this.awareness.on("update", this.onUpdateAwareness), this.on("update", this.onUpdateDoc);
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
import * as o from "yjs";
import * as p from "y-protocols/awareness";
import { LeveldbPersistence as g } from "y-leveldb";
import { Observable as v } from "lib0/observable";
var h = class extends v {
  constructor(t, e) {
    var s;
    super();
    this._documents = /* @__PURE__ */ new Map();
    this._levelPersistenceDir = null;
    this.persistence = null;
    this.initSyncListeners = (t, e) => {
      t.on("sync-step-1", (s, n) => {
        this.hasPermission(e, t.id, "write") && n(o.encodeStateAsUpdate(e, new Uint8Array(s)));
      }), t.on("sync-update", (s) => {
        this.hasPermission(e, t.id, "write") && o.applyUpdate(e, s, null);
      });
    };
    this.initAwarenessListeners = (t, e) => {
      t.on("awareness-update", (s) => {
        p.applyAwarenessUpdate(e.awareness, new Uint8Array(s), t);
      });
    };
    this.initSocketListeners = (t, e) => {
      t.on("disconnect", async () => {
        e.getMap("permissions").get(t.id) && e.getMap("permissions").delete(t.id), (await t.nsp.fetchSockets()).length === 0 && (this.emit("all-document-connections-closed", [e]), this.persistence != null && (await this.persistence.writeState(e.name, e), await e.destroy()));
      });
    };
    this.startSynchronization = (t, e) => {
      t.emit("sync-step-1", o.encodeStateVector(e), (s) => {
        o.applyUpdate(e, new Uint8Array(s), this);
      }), t.emit("awareness-update", p.encodeAwarenessUpdate(e.awareness, Array.from(e.awareness.getStates().keys())));
    };
    this.io = t, this._levelPersistenceDir = (s = e == null ? void 0 : e.levelPersistenceDir) != null ? s : process.env.YPERSISTENCE, this._levelPersistenceDir != null && this.initLevelDB(this._levelPersistenceDir), this.configuration = e;
  }
  initialize() {
    let t = this.io.of(/^\/yjs\|.*$/);
    t.use(async (e, s) => {
      var n;
      return ((n = this.configuration) == null ? void 0 : n.authenticate) != null && !await this.configuration.authenticate(e.handshake) ? s(new Error("Unauthorized")) : s();
    }), t.on("connection", async (e) => {
      var a, i;
      let s = e.nsp.name.replace(/\/yjs\|/, ""), n = await this.initDocument(s, e.nsp, (a = this.configuration) == null ? void 0 : a.gcEnabled);
      if (((i = this.configuration) == null ? void 0 : i.permissionMiddleware) != null) {
        let r = await this.configuration.permissionMiddleware(e.handshake);
        if (n.getMap("permissions").set(e.id, r), r.length == 0) {
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
    var a;
    let n = (a = this._documents.get(t)) != null ? a : new c(t, e, {
      onUpdate: (i, r) => this.emit("document-update", [i, r]),
      onChangeAwareness: (i, r) => this.emit("awareness-update", [i, r]),
      onDestroy: async (i) => {
        this._documents.delete(i.name), this.emit("document-destroy", [i]);
      }
    });
    return n.gc = s, this._documents.has(t) || (this.persistence != null && await this.persistence.bindState(t, n), this._documents.set(t, n), this.emit("document-loaded", [n])), n;
  }
  initLevelDB(t) {
    let e = new g(t);
    this.persistence = {
      provider: e,
      bindState: async (s, n) => {
        let a = await e.getYDoc(s), i = o.encodeStateAsUpdate(n);
        await e.storeUpdate(s, i), o.applyUpdate(n, o.encodeStateAsUpdate(a)), n.on("update", async (r) => await e.storeUpdate(s, r));
      },
      writeState: async (s, n) => {
      }
    };
  }
  hasPermission(t, e, s) {
    var a;
    return !!((a = t.getMap("permissions").get(e)) != null ? a : []).includes(s);
  }
};

export {
  c as a,
  h as b
};
//# sourceMappingURL=chunk-4CELOTHQ.mjs.map