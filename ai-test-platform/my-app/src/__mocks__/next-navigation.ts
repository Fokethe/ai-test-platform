export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
}));

export const useSearchParams = jest.fn(() => ({
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  forEach: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  toString: jest.fn(),
}));

export const usePathname = jest.fn(() => '/');

export const useParams = jest.fn(() => ({}));

export const redirect = jest.fn();

export const permanentRedirect = jest.fn();

export const notFound = jest.fn();