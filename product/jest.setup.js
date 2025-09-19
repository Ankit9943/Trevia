// Mock multer to bypass file handling in tests
jest.mock("multer", () => {
  const fn = () => ({
    array: () => (req, res, next) => {
      // Simulate files parsed by multer as in-memory buffers
      req.files = req.files || [];
      next();
    },
    single: () => (req, res, next) => {
      req.file = req.file || null;
      next();
    },
  });
  fn.memoryStorage = () => ({ _tag: "memoryStorage" });
  return fn;
});

// Mock imagekit SDK used by storage.service
jest.mock("imagekit", () => {
  return jest.fn().mockImplementation(() => ({
    upload: jest.fn(async ({ file }) => ({
      url: "https://ik.mock/image.jpg",
      thumbnailUrl: "https://ik.mock/thumb.jpg",
      fileId: "file_mock_id",
    })),
  }));
});

// Mock auth middleware to inject a test user (role: seller)
jest.mock(require.resolve("./src/middlewares/auth.middleware"), () => {
  return function createAuthMiddleware() {
    return (req, res, next) => {
      req.user = { id: "64d2f0d8c8f1ba0012345678", role: "seller" };
      next();
    };
  };
});
