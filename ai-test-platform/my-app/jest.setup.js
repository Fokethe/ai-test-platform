require('@testing-library/jest-dom');

// Next.js Request/Response polyfills for API route testing
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body || null;
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }
};

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new Map(Object.entries(init.headers || {}));
    this._json = typeof body === 'string' ? JSON.parse(body) : body;
  }

  static json(data, init = {}) {
    const body = JSON.stringify(data);
    return new Response(body, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
  }

  async json() {
    return this._json;
  }

  async text() {
    return this.body;
  }
};
