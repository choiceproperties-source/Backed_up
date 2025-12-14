# Development Utilities & Maintenance

This document describes optional development utilities for maintaining and inspecting the system. These are NOT part of the application runtime and are isolated for development/administrative use only.

## Configuration Validation

### Location
`server/config/validation.ts`

### Purpose
Non-blocking validation utilities to check environment configuration without affecting server startup.

### Usage
```bash
# In a development script (not wired to server startup)
import { validateConfiguration, generateValidationReport } from './server/config/validation';

const report = await generateValidationReport();
console.log(report);
```

### What It Validates
1. **Environment Variables:**
   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   - SendGrid API key (optional)
   - ImageKit credentials (optional)

2. **Database Connectivity:**
   - Can reach Supabase API endpoint
   - Response time measurement
   - Connection pooling status

3. **Database Schema:**
   - All required tables exist
   - Missing table detection
   - Schema integrity

4. **Optional Services:**
   - ImageKit configuration
   - SendGrid configuration
   - Image optimization availability

### Benefits
- Pre-flight checks before migrations
- Identify configuration issues early
- Detailed reports without blocking execution
- Integration testing preparation

## Constants Organization

### Location
`shared/constants.ts`

### Purpose
Centralized business logic constants used across frontend and backend. Replaces magic strings with typed constants.

### Examples

**Before (Magic Strings):**
```typescript
if (application.status === "approved") {
  // Hard to find all uses
  // Easy to typo
}
```

**After (Constants):**
```typescript
import { APPLICATION_STATUS } from '@shared/constants';

if (application.status === APPLICATION_STATUS.APPROVED) {
  // Typed, searchable, autocomplete
  // Impossible to typo
}
```

### Available Constants

**User Roles:**
- `USER_ROLES` - Enum of all roles
- `ROLE_HIERARCHY` - Permission levels per role

**Application Workflow:**
- `APPLICATION_STATUS` - All possible statuses
- `APPLICATION_TRANSITIONS` - Valid state transitions

**Lease Workflow:**
- `LEASE_STATUS` - All possible statuses
- `LEASE_TRANSITIONS` - Valid state transitions

**Payments:**
- `PAYMENT_STATUS` - Payment states
- `PAYMENT_VERIFICATION_METHOD` - How payment was verified

**Notifications:**
- `NOTIFICATION_TYPE` - Types of notifications
- `NOTIFICATION_CHANNEL` - Delivery channels
- `NOTIFICATION_STATUS` - Notification delivery state

**File Uploads:**
- `FILE_UPLOAD` - Size limits, format restrictions

**Error Messages:**
- `ERROR_MESSAGES` - User-facing error strings
- `SUCCESS_MESSAGES` - Success confirmation strings

### Benefits
- Type-safe status checking
- Prevents runtime errors from typos
- Single source of truth for business rules
- Easy to refactor (rename constant vs. find-replace)
- IDE autocomplete support

## Shared Documentation Files

### ARCHITECTURE.md
High-level system architecture and component interactions.

**Contents:**
- System components and their responsibilities
- Data flow patterns
- Authentication & authorization
- Caching strategy
- Error handling
- Security mechanisms
- Performance optimizations
- Deployment architecture
- Future scalability considerations

**Use Case:** Onboarding new developers, system design reviews

### DATA_FLOW.md
Detailed data movement through system at each workflow stage.

**Contents:**
- User registration flow
- Property browsing flow
- Application submission process
- Payment verification workflow
- Lease management workflow
- Image upload pipeline
- Notification dispatch system
- Audit logging
- Rate limiting
- Complete request/response lifecycle

**Use Case:** Understanding business processes, debugging flows

### DATABASE_SCHEMA.md
Complete database schema reference with relationships.

**Contents:**
- Entity relationship diagram
- Table-by-table documentation
- Field descriptions
- Relationship details
- RLS policy summary
- Index strategy
- Unique constraints
- Query optimization notes

**Use Case:** Database design review, query optimization, schema changes

## Maintenance Scripts (Not Included - For Future)

These utilities would be useful to add in `scripts/maintenance/`:

### 1. Config Validator Script
```bash
npm run validate-config
```
Runs configuration validation and reports status.

**Would use:** `server/config/validation.ts`

### 2. Database Health Check
```bash
npm run check-db-health
```
Checks database connectivity, schema integrity, and table sizes.

### 3. Audit Log Inspector
```bash
npm run inspect-audit-logs --since "2024-01-01" --actor "user-id"
```
Query and analyze audit logs for specific events.

### 4. Cache Statistics
```bash
npm run cache-stats
```
Display cache hit rates and memory usage.

### 5. Rate Limit Monitor
```bash
npm run monitor-rate-limits
```
Show current rate limit status for key endpoints.

## Operational Procedures

### Pre-Deployment Checklist

Before deploying to production:

1. **Configuration Validation**
   ```bash
   npm run validate-config
   ```
   - All required variables set
   - Credentials valid
   - Optional services configured

2. **Database Health Check**
   ```bash
   npm run check-db-health
   ```
   - Connection pool healthy
   - All tables exist
   - No corrupted data

3. **Type Checking**
   ```bash
   npm run check
   ```
   - No TypeScript errors
   - All imports valid

4. **Audit Review**
   - Check recent audit logs
   - Verify sensitive operations logged
   - Ensure immutability maintained

5. **Performance Baseline**
   - Record response times
   - Note cache hit rates
   - Establish baseline metrics

### Environment Variable Checklist

**Required:**
- [ ] SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NODE_ENV = "production"

**Recommended:**
- [ ] SENDGRID_API_KEY (for emails)
- [ ] IMAGEKIT_PUBLIC_KEY
- [ ] IMAGEKIT_PRIVATE_KEY
- [ ] IMAGEKIT_URL_ENDPOINT

**Optional:**
- [ ] RATE_LIMITING_ENABLED
- [ ] LOG_LEVEL

### Debugging Techniques

**1. Enable Verbose Logging**
```typescript
// Temporarily add console.log to understand flow
console.log('[FLOW] User:', req.user?.id);
console.log('[QUERY] Finding properties:', filters);
```

**2. Check Audit Logs**
```typescript
// Query audit_logs table for action history
GET /api/admin/audit-logs?resource=application&action=status_change
```

**3. Cache Inspector**
```typescript
// Log cache statistics
console.log('Cache size:', cache.size());
console.log('Cache hits:', cache.stats().hits);
```

**4. Rate Limit Analysis**
```typescript
// Check if endpoints being throttled
GET /api/admin/rate-limit-status
```

**5. Database Query Profiling**
```typescript
// Measure query performance
const start = Date.now();
const result = await supabase.from('properties').select();
console.log('Query time:', Date.now() - start, 'ms');
```

## Performance Monitoring

### Key Metrics to Track

1. **API Response Times**
   - Target: <200ms for list queries
   - Target: <100ms for cache hits
   - Alert: >1s for any endpoint

2. **Database Performance**
   - Active connections
   - Query execution time
   - Slow query log

3. **Cache Effectiveness**
   - Hit rate (target: >80%)
   - Memory usage
   - Eviction rate

4. **Error Rates**
   - 4xx errors (client issues)
   - 5xx errors (server issues)
   - 429 rate limit errors

5. **Application Metrics**
   - Active users
   - Applications submitted per day
   - Lease workflows completed

### Alert Thresholds

- **Error Rate:** Alert if >1% of requests fail
- **Response Time:** Alert if p95 >500ms
- **Database:** Alert if connection pool >80% utilized
- **Cache:** Alert if hit rate <60%
- **Disk Space:** Alert if >80% utilized

## Security Maintenance

### Regular Reviews

1. **Audit Log Review** (Weekly)
   - Check for suspicious patterns
   - Verify user permissions
   - Monitor failed login attempts

2. **Access Control Review** (Monthly)
   - Verify RLS policies still correct
   - Check role assignments
   - Audit admin account activity

3. **Data Access Review** (Quarterly)
   - Verify no unauthorized data access
   - Check for privilege escalation attempts
   - Review API key usage

### Rotation Schedule

- **API Keys:** Every 90 days
- **Passwords:** Every 60 days (for service accounts)
- **JWT Secrets:** Verify configuration every 90 days

## Backup & Recovery

### Database Backups
- Supabase provides automatic daily backups
- Retention: 7 days for dev, 30 days for production
- Restore point: Can restore to any point in last 7-30 days

### Image Storage Backups
- ImageKit handles redundancy
- Replication across multiple data centers
- Recovery: Can restore deleted images within 30 days

### Configuration Backups
- Environment variables backed up in Replit Secrets
- Never stored in version control
- Accessible only by authorized team members

## Testing & Staging

### Pre-Production Testing

1. **Schema Migrations**
   ```bash
   npm run db:push
   ```
   - Test migrations in staging first
   - Verify data integrity
   - Check performance impact

2. **API Testing**
   - Test all endpoints with typical data
   - Verify error handling
   - Check authorization

3. **Load Testing**
   - Simulate expected user load
   - Measure response times
   - Check for bottlenecks

4. **Security Testing**
   - Verify RLS policies work
   - Test authentication
   - Check rate limiting

## Documentation Maintenance

### When to Update

1. **ARCHITECTURE.md**
   - When system components change
   - When data flow is modified
   - When security mechanisms are updated

2. **DATA_FLOW.md**
   - When workflows are added/modified
   - When API endpoints change
   - When notification system is updated

3. **DATABASE_SCHEMA.md**
   - After every schema migration
   - When RLS policies change
   - When indexes are added

4. **This File (DEVELOPMENT_UTILITIES.md)**
   - When new maintenance utilities added
   - When procedures change
   - When monitoring thresholds updated

## Getting Help

### When Debugging

1. Check **ARCHITECTURE.md** for system overview
2. Check **DATA_FLOW.md** for specific workflow
3. Check **DATABASE_SCHEMA.md** for data relationships
4. Check **server/config/validation.ts** for configuration issues
5. Check **shared/constants.ts** for business logic values

### When Adding Features

1. Review **ARCHITECTURE.md** - Does it fit the pattern?
2. Check **DATA_FLOW.md** - How does data move?
3. Update **DATABASE_SCHEMA.md** - Any new tables/fields?
4. Use constants from **shared/constants.ts** for values
5. Use validation from **server/config/validation.ts** for config
