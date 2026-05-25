/**
 * In-memory Firestore mock for API end-to-end tests (no service account required).
 */

const collections = {
  groups: {},
  users: {},
};

let idCounter = 0;
const nextId = (prefix) => `${prefix}_${++idCounter}`;

function cloneData(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && v.__serverTimestamp) {
      out[k] = new Date().toISOString();
    } else if (Array.isArray(v)) {
      out[k] = [...v];
    } else {
      out[k] = v;
    }
  }
  return out;
}

function getGroupDoc(id) {
  if (!collections.groups[id]) {
    collections.groups[id] = { data: null, expenses: {}, settlements: {} };
  }
  return collections.groups[id];
}

function docSnapshot(path, exists, data, id) {
  return {
    exists,
    id: id || path.split('/').pop(),
    data: () => (exists ? cloneData(data) : undefined),
  };
}

function querySnapshot(docs) {
  return {
    docs: docs.map(({ id, data }) => ({
      id,
      data: () => cloneData(data),
    })),
    empty: docs.length === 0,
  };
}

class DocumentReference {
  constructor(pathParts) {
    this.pathParts = pathParts;
  }

  get id() {
    return this.pathParts[this.pathParts.length - 1];
  }

  collection(name) {
    return new CollectionReference([...this.pathParts, name]);
  }

  async get() {
    const [root, docId, sub, subId] = this.pathParts;
    if (root === 'groups' && this.pathParts.length === 2) {
      const g = getGroupDoc(docId);
      return docSnapshot('groups/' + docId, !!g.data, g.data, docId);
    }
    if (root === 'groups' && sub === 'expenses' && this.pathParts.length === 4) {
      const exp = getGroupDoc(docId).expenses[subId];
      return docSnapshot(this.pathParts.join('/'), !!exp, exp, subId);
    }
    if (root === 'users' && this.pathParts.length === 2) {
      const u = collections.users[docId];
      return docSnapshot('users/' + docId, !!u, u, docId);
    }
    return docSnapshot(this.pathParts.join('/'), false, null);
  }

  async set(data, options = {}) {
    const [root, docId] = this.pathParts;
    if (root === 'users') {
      const existing = collections.users[docId] || {};
      collections.users[docId] = options.merge
        ? { ...existing, ...cloneData(data) }
        : cloneData(data);
      return;
    }
    throw new Error(`set not implemented for ${this.pathParts.join('/')}`);
  }

  async update(data) {
    const [root, docId] = this.pathParts;
    if (root !== 'groups') throw new Error('update only on groups');
    const g = getGroupDoc(docId);
    const patch = cloneData(data);
    if (patch.members && patch.members.__arrayUnion) {
      const union = patch.members.__arrayUnion;
      g.data.members = [...new Set([...(g.data.members || []), ...union])];
      delete patch.members;
    }
    g.data = { ...g.data, ...patch };
  }

  async delete() {
    const [root, groupId, sub, expenseId] = this.pathParts;
    if (root === 'groups' && sub === 'expenses') {
      delete getGroupDoc(groupId).expenses[expenseId];
    }
  }
}

class CollectionReference {
  constructor(pathParts) {
    this.pathParts = pathParts;
    this._where = null;
    this._orderBy = null;
  }

  doc(id) {
    const docId = id || nextId(this.pathParts.join('_'));
    return new DocumentReference([...this.pathParts, docId]);
  }

  where(field, op, value) {
    const next = new CollectionReference(this.pathParts);
    next._where = { field, op, value };
    next._orderBy = this._orderBy;
    return next;
  }

  orderBy(field, direction = 'desc') {
    const next = new CollectionReference(this.pathParts);
    next._where = this._where;
    next._orderBy = { field, direction };
    return next;
  }

  async add(data) {
    const ref = this.doc();
    const stored = cloneData(data);
    const [root, groupId, sub] = this.pathParts;

    if (root === 'groups' && this.pathParts.length === 1) {
      getGroupDoc(ref.id).data = stored;
      return ref;
    }
    if (root === 'groups' && sub === 'expenses') {
      getGroupDoc(groupId).expenses[ref.id] = stored;
      return ref;
    }
    if (root === 'groups' && sub === 'settlements') {
      getGroupDoc(groupId).settlements[ref.id] = stored;
      return ref;
    }
    throw new Error(`add not implemented for ${this.pathParts.join('/')}`);
  }

  async get() {
    const [root, groupId, sub] = this.pathParts;

    if (root === 'groups' && this.pathParts.length === 1 && this._where) {
      const { field, op, value } = this._where;
      const docs = Object.entries(collections.groups)
        .filter(([, g]) => {
          if (!g.data) return false;
          if (op === 'array-contains' && field === 'members') {
            return (g.data.members || []).includes(value);
          }
          return false;
        })
        .map(([id, g]) => ({ id, data: g.data }));
      return querySnapshot(docs);
    }

    if (root === 'groups' && sub === 'expenses') {
      const items = Object.entries(getGroupDoc(groupId).expenses).map(([id, data]) => ({
        id,
        data,
      }));
      return querySnapshot(sortByCreatedAt(items, this._orderBy));
    }

    if (root === 'groups' && sub === 'settlements') {
      const items = Object.entries(getGroupDoc(groupId).settlements).map(([id, data]) => ({
        id,
        data,
      }));
      return querySnapshot(sortByCreatedAt(items, this._orderBy));
    }

    if (root === 'users' && this._where) {
      const { field, value } = this._where;
      const docs = Object.entries(collections.users)
        .filter(([, u]) => u && u[field] === value)
        .map(([id, data]) => ({ id, data }));
      return querySnapshot(docs);
    }

    return querySnapshot([]);
  }
}

function sortByCreatedAt(items, orderBy) {
  if (!orderBy) return items;
  const dir = orderBy.direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const ta = a.data?.createdAt || '';
    const tb = b.data?.createdAt || '';
    return ta < tb ? -dir : ta > tb ? dir : 0;
  });
}

function createFirestore() {
  return {
    collection: (name) => new CollectionReference([name]),
  };
}

const FieldValue = {
  serverTimestamp: () => ({ __serverTimestamp: true }),
  arrayUnion: (...items) => ({ __arrayUnion: items }),
};

function resetFirestoreMock() {
  idCounter = 0;
  collections.groups = {};
  collections.users = {};
}

module.exports = { createFirestore, FieldValue, resetFirestoreMock, collections };
