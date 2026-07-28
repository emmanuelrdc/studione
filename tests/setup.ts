// Env vars must be set before ANY module is imported
process.env.JWT_SECRET = "studione-test-jwt-secret-key-minimum-32-chars-long";
process.env.INITIAL_ADMIN_PASSWORD = "admin-test-pass-123";
process.env.NODE_ENV = "test";
