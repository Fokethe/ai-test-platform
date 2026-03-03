// Mock Next.js Request/Response for API tests
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body || null;
  }
  
  async json() {
    return this.body ? JSON.parse(this.body) : {};
  }
  
  async text() {
    return this.body || '';
  }
};

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(Object.entries(init.headers || {}));
    this._json = typeof body === 'string' ? JSON.parse(body) : body;
  }
  
  async json() {
    return this._json;
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
};

// Mock NextRequest/NextResponse
global.NextRequest = class NextRequest extends Request {
  constructor(input, init = {}) {
    super(input, init);
    this.nextUrl = new URL(this.url);
  }
};

// 保存原始的 Response 类
const OriginalResponse = global.Response;

// 确保 Response.json 方法存在
if (!global.Response.json) {
  global.Response.json = function(body, init = {}) {
    return new OriginalResponse(JSON.stringify(body), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
    });
  };
}

// Mock next-auth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(() => Promise.resolve({ user: { email: 'test@example.com', id: 'test-user' } })),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
  auth: jest.fn(() => Promise.resolve({ user: { email: 'test@example.com', id: 'test-user' } })),
}));

global.NextResponse = class NextResponse extends Response {
  static json(body, init = {}) {
    // 使用父类的静态 json 方法（如果存在）
    if (Response.json && Response.json !== NextResponse.json) {
      return Response.json(body, init);
    }
    
    // 否则创建自定义响应
    const response = new NextResponse(JSON.stringify(body), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init.headers,
      },
    });
    // 添加 json() 方法以便测试中可以 await response.json()
    response.json = async () => body;
    return response;
  }
  
  static redirect(url, init = {}) {
    return new NextResponse(null, {
      ...init,
      status: init.status || 307,
      headers: {
        location: url,
        ...init.headers,
      },
    });
  }
};
