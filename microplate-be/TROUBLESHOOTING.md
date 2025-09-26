# Troubleshooting Guide - Auth Service

## Problem: ERR_EMPTY_RESPONSE on Login

### Symptoms
- Frontend shows `ERR_EMPTY_RESPONSE` when calling auth service
- Auth service logs show `INVALID_CREDENTIALS` error
- Server crashes instead of returning proper error response

### Root Causes
1. **No users in database** - Auth service can't find user to authenticate
2. **Error handling issues** - Server crashes instead of returning error response
3. **CORS issues** - Browser blocks the request

### Solutions

#### 1. Fix Error Handling ✅
- Updated auth service to use custom error classes
- Fixed error handling in routes to return proper HTTP responses
- Added proper error logging

#### 2. Create Test Users
Run the seed script to create test users:

```bash
cd microplate-be/services/auth-service
npm run prisma:seed
# or
yarn prisma:seed
```

This will create:
- **Test User**: `test@example.com` / `testuser` / `password123`
- **Admin User**: `admin@example.com` / `admin` / `password123`

#### 3. Test Auth Service
Run the test script to verify auth service is working:

```bash
cd microplate-be
node test-auth.js
```

#### 4. Check Database Connection
Ensure PostgreSQL is running and accessible:

```bash
# Check if database is accessible
psql -h localhost -U microplate -d microplate_db -c "SELECT 1;"
```

#### 5. Verify Service is Running
Check if auth service is running on port 6401:

```bash
curl http://localhost:6401/healthz
```

Should return: `{"status":"ok"}`

### Step-by-Step Fix

1. **Start Database** (if not running):
   ```bash
   cd microplate-be
   docker-compose -f docker-compose.infra.yml up -d postgres
   ```

2. **Run Database Migrations**:
   ```bash
   cd microplate-be/services/auth-service
   npm run prisma:deploy
   ```

3. **Seed Database**:
   ```bash
   npm run prisma:seed
   ```

4. **Start Auth Service**:
   ```bash
   npm run dev
   ```

5. **Test Login**:
   ```bash
   curl -X POST http://localhost:6401/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"usernameOrEmail":"test@example.com","password":"password123"}'
   ```

### Expected Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "username": "testuser"
    }
  }
}
```

### Frontend Testing
1. Open browser developer tools
2. Go to Network tab
3. Try to login with:
   - Email: `test@example.com`
   - Password: `password123`
4. Check if request returns proper response

### Common Issues

#### Issue: "User not found"
**Solution**: Run the seed script to create test users

#### Issue: "Database connection failed"
**Solution**: 
1. Check if PostgreSQL is running
2. Verify DATABASE_URL in .env file
3. Run migrations

#### Issue: "CORS error"
**Solution**: 
1. Check CORS_ORIGIN in auth service config
2. Ensure frontend URL is allowed

#### Issue: "JWT secret not set"
**Solution**: 
1. Set JWT_ACCESS_SECRET in .env file
2. Restart auth service

### Debug Commands

```bash
# Check auth service logs
docker logs microplate-auth-service

# Check database connection
psql -h localhost -U microplate -d microplate_db

# Test auth service directly
curl -v http://localhost:6401/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"test@example.com","password":"password123"}'

# Check if port is open
netstat -tulpn | grep 6401
```

### Environment Variables
Make sure these are set in `microplate-be/services/auth-service/.env`:

```env
DATABASE_URL=postgresql://microplate:microplate123@postgres:5432/microplate_db?schema=auth
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
PORT=6401
CORS_ORIGIN=true
NODE_ENV=development
```

---

**After following these steps, the auth service should work properly!** 🚀
