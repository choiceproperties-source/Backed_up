# API Documentation

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints

### 1. Sign Up
**POST** `/auth/signup`

Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "fullName": "John Doe"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "John Doe"
    }
  }
}
```

**Rate Limit:** 5 requests per hour

---

### 2. Login
**POST** `/auth/login`

Authenticates user and returns session with JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### 3. Get Current User
**GET** `/auth/me`

Returns authenticated user's profile information.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": null,
    "role": "user",
    "profile_image": null,
    "bio": null,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Response (Unauthorized - 401):**
```json
{
  "error": "Access token required"
}
```

---

### 4. Logout
**POST** `/auth/logout`

Ends user session (client-side token removal recommended).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (Success - 200):**
```json
{
  "success": true
}
```

---

## Properties Endpoints

### 1. Get All Properties
**GET** `/properties`

Retrieves list of all active properties.

**Query Parameters:**
- `status` - Filter by status (active, inactive, sold)
- `city` - Filter by city
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `bedrooms` - Number of bedrooms
- `propertyType` - Type of property (apartment, house, etc.)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "uuid",
        "title": "Modern Apartment",
        "address": "123 Main St",
        "city": "New York",
        "price": 2500,
        "bedrooms": 2,
        "bathrooms": 1,
        "propertyType": "apartment",
        "status": "active",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 2. Get Property Details
**GET** `/properties/:id`

Retrieves detailed information about a specific property.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Modern Apartment",
    "description": "Beautiful 2-bedroom apartment...",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "price": 2500,
    "bedrooms": 2,
    "bathrooms": 1,
    "squareFeet": 1000,
    "propertyType": "apartment",
    "amenities": ["gym", "pool", "parking"],
    "images": ["url1", "url2"],
    "latitude": 40.7128,
    "longitude": -74.0060,
    "furnished": true,
    "petsAllowed": true,
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### 3. Create Property
**POST** `/properties`

Creates a new property listing (requires authentication).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "title": "Modern Apartment",
  "description": "Beautiful apartment...",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "price": 2500,
  "bedrooms": 2,
  "bathrooms": 1,
  "squareFeet": 1000,
  "propertyType": "apartment",
  "amenities": ["gym", "pool"],
  "furnished": true,
  "petsAllowed": true
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Modern Apartment",
    ...
  }
}
```

---

## Inquiries Endpoints

### 1. Submit Inquiry
**POST** `/inquiries`

Submit an inquiry about a property (public - no auth required).

**Request Body:**
```json
{
  "agentId": "uuid",
  "propertyId": "uuid",
  "senderName": "Jane Doe",
  "senderEmail": "jane@example.com",
  "senderPhone": "+1-555-0100",
  "message": "I'm interested in this property...",
  "inquiryType": "general"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Rate Limit:** 10 requests per minute

---

## Reviews Endpoints

### 1. Get Property Reviews
**GET** `/properties/:propertyId/reviews`

Get all reviews for a property.

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "uuid",
        "rating": 5,
        "title": "Great property!",
        "comment": "Amazing place to live...",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 2. Create Review
**POST** `/properties/:propertyId/reviews`

Submit a review for a property (requires authentication).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "rating": 5,
  "title": "Great property!",
  "comment": "Amazing place to live..."
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "rating": 5,
    "title": "Great property!",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## Favorites Endpoints

### 1. Get Favorites
**GET** `/favorites`

Get user's saved favorite properties (requires authentication).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "id": "uuid",
        "propertyId": "uuid",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 2. Add to Favorites
**POST** `/favorites`

Add a property to favorites (requires authentication).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "propertyId": "uuid"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "propertyId": "uuid"
  }
}
```

---

### 3. Remove from Favorites
**DELETE** `/favorites/:propertyId`

Remove property from favorites (requires authentication).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Removed from favorites"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": "Email format is invalid"
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Authentication Notes

- All authenticated endpoints require an `Authorization` header with format: `Bearer {access_token}`
- Access tokens are JWT tokens from Supabase
- Tokens expire after 1 hour
- Use refresh token to get a new access token
- Role-based access control is enforced on certain endpoints:
  - `admin` - Can access admin endpoints
  - `agent` - Can manage listings and inquiries
  - `user` - Standard user permissions

---

## Rate Limiting

- **Login:** 5 attempts per 15 minutes per IP
- **Sign Up:** 5 attempts per 1 hour per IP
- **Inquiries:** 10 submissions per 1 minute per IP
- **Newsletter:** 3 subscriptions per 1 minute per IP

*Note: Rate limits are relaxed in development mode (1000 per window)*

---
